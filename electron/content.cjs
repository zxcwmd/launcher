const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { Readable, Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Version } = require('@xmcl/core');
const {
  getLoaderArtifactListFor,
  getQuiltLoaderVersionsByMinecraft,
  installDependencies,
  installFabric,
  installForge,
  installNeoForged,
  installQuiltVersion,
} = require('@xmcl/installer');
const { open, openEntryReadStream, readAllEntries, readEntry } = require('@xmcl/unzip');

const MODRINTH_API = 'https://api.modrinth.com/v2';
const GITHUB_API = 'https://api.github.com';
const USER_AGENT = 'LumenLauncher/1.0.1 (https://github.com/zxcwmd/launcher)';
const SUPPORTED_LOADERS = new Set(['fabric', 'forge', 'neoforge', 'quilt']);
const MAX_SEARCH_LENGTH = 100;
const MAX_PACK_ARCHIVE = 300 * 1024 * 1024;
const MAX_MOD_FILE = 250 * 1024 * 1024;
const MAX_PACK_DOWNLOAD = 8 * 1024 * 1024 * 1024;
const MAX_OVERRIDE_BYTES = 700 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 20_000;
const MAX_PACK_FILES = 2_000;
const MAX_MOD_DEPENDENCIES = 32;
const INSTANCE_ID_PATTERN = /^[a-f0-9-]{36}$/i;
const VERSION_PATTERN = /^[a-zA-Z0-9_.+-]{1,64}$/;

function createContentService({ getRoot, getUserData, ensureMinecraft, resolveJava, emit = () => {} }) {
  let instances = [];
  let loaded = false;
  let installing = false;
  const githubSearchCache = new Map();

  const instancesFile = () => path.join(getUserData(), 'instances.json');
  const instancesRoot = () => path.join(getUserData(), 'instances');
  const instancePath = (id) => path.join(instancesRoot(), id);

  function progress(percent, detail, extra = {}) {
    emit('content-progress', { percent: Math.max(0, Math.min(100, Math.round(percent))), detail, ...extra });
  }

  function assertLoaded() {
    if (!loaded) throw new Error('Каталог сборок ещё загружается. Попробуйте ещё раз через секунду.');
  }

  function validVersion(value, label = 'версия') {
    const version = String(value || '').trim();
    if (!VERSION_PATTERN.test(version)) throw new Error(`Некорректная ${label}.`);
    return version;
  }

  function cleanText(value, maxLength = 120) {
    return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
  }

  function sanitizeDisplayName(value, fallback) {
    const cleaned = cleanText(value, 64).replace(/[\\/:*?"<>|]/g, '').trim();
    return cleaned || fallback;
  }

  function sanitizeStoredFileName(value) {
    const name = cleanText(String(value || '').split(/[\/\\]/).at(-1), 180).replace(/[<>:"|?*]/g, '_');
    return name.toLowerCase().endsWith('.jar') ? name : '';
  }

  function publicInstance(instance) {
    return {
      id: instance.id,
      name: instance.name,
      minecraftVersion: instance.minecraftVersion,
      loader: instance.loader,
      loaderVersion: instance.loaderVersion || '',
      versionId: instance.versionId,
      source: instance.source || 'manual',
      iconUrl: instance.iconUrl || '',
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
      modCount: Array.isArray(instance.mods) ? instance.mods.length : 0,
      mods: (Array.isArray(instance.mods) ? instance.mods : []).map((mod) => ({
        projectId: cleanText(mod.projectId, 100),
        name: cleanText(mod.name, 80),
        version: cleanText(mod.version, 40),
        fileName: sanitizeStoredFileName(mod.fileName),
      })),
    };
  }

  async function load() {
    if (loaded) return listInstances();
    try {
      const parsed = JSON.parse(await fs.readFile(instancesFile(), 'utf8'));
      if (Array.isArray(parsed)) {
        instances = parsed.flatMap((entry) => {
          if (!entry || typeof entry !== 'object' || !INSTANCE_ID_PATTERN.test(String(entry.id || ''))) return [];
          try {
            const minecraftVersion = validVersion(entry.minecraftVersion, 'версия Minecraft');
            const loader = String(entry.loader || 'vanilla').toLowerCase();
            if (loader !== 'vanilla' && !SUPPORTED_LOADERS.has(loader)) return [];
            const versionId = validVersion(entry.versionId || minecraftVersion, 'версия загрузчика');
            return [{
              id: String(entry.id).toLowerCase(),
              name: sanitizeDisplayName(entry.name, `Minecraft ${minecraftVersion}`),
              minecraftVersion,
              loader,
              loaderVersion: cleanText(entry.loaderVersion, 64),
              versionId,
              source: ['modrinth', 'github', 'manual'].includes(entry.source) ? entry.source : 'manual',
              iconUrl: safeImageUrl(entry.iconUrl),
              createdAt: Number(entry.createdAt) || Date.now(),
              updatedAt: Number(entry.updatedAt) || Number(entry.createdAt) || Date.now(),
              mods: Array.isArray(entry.mods) ? entry.mods.slice(0, MAX_PACK_FILES).map((mod) => ({
                projectId: cleanText(mod?.projectId, 100),
                name: cleanText(mod?.name, 80),
                version: cleanText(mod?.version, 40),
                fileName: sanitizeStoredFileName(mod?.fileName),
              })) : [],
            }];
          } catch {
            return [];
          }
        });
      }
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn('Could not read Lumen instances:', error.message);
      instances = [];
    }
    loaded = true;
    return listInstances();
  }

  function listInstances() {
    assertLoaded();
    return [...instances]
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .map(publicInstance);
  }

  function getInstance(id) {
    assertLoaded();
    if (!INSTANCE_ID_PATTERN.test(String(id || ''))) return null;
    return instances.find((instance) => instance.id === String(id).toLowerCase()) || null;
  }

  async function persistInstances() {
    await fs.mkdir(getUserData(), { recursive: true });
    const temporary = `${instancesFile()}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, JSON.stringify(instances, null, 2), { mode: 0o600 });
    await fs.rename(temporary, instancesFile());
  }

  async function commitInstance(instance) {
    instance.updatedAt = Date.now();
    const index = instances.findIndex((entry) => entry.id === instance.id);
    if (index === -1) instances.push(instance);
    else instances[index] = instance;
    await persistInstances();
    emit('instances-changed', { instances: listInstances() });
    return publicInstance(instance);
  }

  function ensureExternalHttpsUrl(value) {
    let url;
    try {
      url = new URL(String(value));
    } catch {
      throw new Error('Источник вернул некорректную ссылку на файл.');
    }
    if (url.protocol !== 'https:' || url.username || url.password || isPrivateHost(url.hostname)) {
      throw new Error('Разрешены только безопасные публичные HTTPS-ссылки.');
    }
    return url;
  }

  function isPrivateHost(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true;
    const ipVersion = net.isIP(host);
    if (ipVersion === 4) {
      const [a, b] = host.split('.').map(Number);
      return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    }
    if (ipVersion === 6) {
      return host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:') || host.startsWith('::ffff:127.');
    }
    return !host.includes('.') || host.endsWith('.test') || host.endsWith('.invalid') || host.endsWith('.example');
  }

  async function fetchFollowingSafeRedirects(value, options = {}) {
    let current = ensureExternalHttpsUrl(value);
    for (let redirect = 0; redirect <= 5; redirect += 1) {
      const response = await fetch(current, {
        ...options,
        redirect: 'manual',
        signal: options.signal || AbortSignal.timeout(45_000),
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) {
        // Check the final URL as well in case the runtime followed a redirect itself.
        ensureExternalHttpsUrl(response.url || current.toString());
        return response;
      }
      const location = response.headers.get('location');
      await response.body?.cancel().catch(() => {});
      if (!location) throw new Error('Сервер вернул пустое перенаправление.');
      current = ensureExternalHttpsUrl(new URL(location, current).toString());
    }
    throw new Error('Слишком много перенаправлений при загрузке файла.');
  }

  async function fetchJson(value, { github = false, timeout = 25_000 } = {}) {
    const response = await fetchFollowingSafeRedirects(value, {
      headers: {
        Accept: github ? 'application/vnd.github+json' : 'application/json',
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      const body = (await response.text().catch(() => '')).slice(0, 350);
      if (response.status === 429 || response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        throw new Error(github ? 'Лимит GitHub API временно исчерпан. Попробуйте поиск позже.' : 'Лимит каталога Modrinth временно исчерпан. Попробуйте позже.');
      }
      if (response.status === 404) throw new Error('Проект или версия не найдены.');
      throw new Error(`Каталог вернул ошибку ${response.status}${body ? `: ${cleanText(body, 180)}` : ''}`);
    }
    try {
      return await response.json();
    } catch {
      throw new Error('Каталог вернул ответ в неизвестном формате.');
    }
  }

  function modrinthApi(pathname, params) {
    const url = new URL(`${MODRINTH_API}${pathname}`);
    if (params) for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    return url.toString();
  }

  function githubApi(pathname) {
    return `${GITHUB_API}${pathname}`;
  }

  function safeImageUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' && !isPrivateHost(url.hostname) ? url.toString() : '';
    } catch {
      return '';
    }
  }

  function validateSearch(options = {}) {
    const provider = options.provider === 'github' ? 'github' : 'modrinth';
    const projectType = options.projectType === 'modpack' ? 'modpack' : 'mod';
    const query = cleanText(options.query, MAX_SEARCH_LENGTH);
    const gameVersion = options.gameVersion ? validVersion(options.gameVersion, 'версия Minecraft') : '';
    const loader = String(options.loader || 'fabric').toLowerCase();
    if (projectType === 'mod' && !SUPPORTED_LOADERS.has(loader)) throw new Error('Выберите поддерживаемый загрузчик модов.');
    return { provider, projectType, query, gameVersion, loader };
  }

  async function searchContent(options = {}) {
    const { provider, projectType, query, gameVersion, loader } = validateSearch(options);
    if (provider === 'github') return searchGithubPacks(query);

    const facets = [[`project_type:${projectType}`]];
    if (gameVersion) facets.push([`versions:${gameVersion}`]);
    if (projectType === 'mod') facets.push([`categories:${loader}`]);
    const result = await fetchJson(modrinthApi('/search', {
      query,
      facets: JSON.stringify(facets),
      index: 'downloads',
      limit: 16,
    }));
    const hits = Array.isArray(result?.hits) ? result.hits : [];
    return {
      provider: 'modrinth',
      projectType,
      results: hits.map((hit) => ({
        id: cleanText(hit.project_id, 100),
        projectId: cleanText(hit.project_id, 100),
        source: 'modrinth',
        projectType,
        title: cleanText(hit.title, 100) || 'Проект Modrinth',
        description: cleanText(hit.description, 260),
        author: cleanText(hit.author, 60),
        iconUrl: safeImageUrl(hit.icon_url),
        downloads: Number(hit.downloads) || 0,
        followers: Number(hit.follows) || 0,
        categories: Array.isArray(hit.display_categories) ? hit.display_categories.slice(0, 5).map((item) => cleanText(item, 30)) : [],
        url: `https://modrinth.com/${projectType === 'modpack' ? 'modpack' : 'mod'}/${encodeURIComponent(cleanText(hit.slug, 100))}`,
      })),
    };
  }

  async function searchGithubPacks(query) {
    const cacheKey = cleanText(query, MAX_SEARCH_LENGTH).toLowerCase();
    const cached = githubSearchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.value, results: cached.value.results.map((item) => ({ ...item })) };
    let repositories;
    const directRepo = query.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (directRepo) {
      const repoPath = `/repos/${directRepo[1]}/${directRepo[2]}`;
      const repo = await fetchJson(githubApi(repoPath), { github: true });
      repositories = [repo];
    } else {
      const terms = query ? `${query} minecraft modpack` : 'minecraft modpack';
      const search = await fetchJson(githubApi(`/search/repositories?q=${encodeURIComponent(terms)}&sort=stars&order=desc&per_page=10`), { github: true });
      repositories = Array.isArray(search?.items) ? search.items.slice(0, 6) : [];
    }

    const releases = await mapLimit(repositories, 4, async (repo) => {
      const fullName = cleanText(repo.full_name, 120);
      if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(fullName)) return [];
      let releaseList;
      try {
        releaseList = await fetchJson(githubApi(`/repos/${fullName.split('/').map(encodeURIComponent).join('/')}/releases?per_page=6`), { github: true });
      } catch (error) {
        if (error.message.includes('Лимит GitHub API')) throw error;
        return [];
      }
      const entries = Array.isArray(releaseList) ? releaseList : [];
      for (const release of entries) {
        const assets = Array.isArray(release.assets) ? release.assets : [];
        const candidates = assets.filter((asset) => {
          const name = String(asset.name || '').toLowerCase();
          const extensionOk = name.endsWith('.mrpack') || name.endsWith('.zip') && /(?:mrpack|modpack|pack)/i.test(name);
          return extensionOk && Number(asset.size) > 0 && Number(asset.size) <= MAX_PACK_ARCHIVE && Number(asset.id) > 0;
        }).sort((a, b) => Number(String(b.name).toLowerCase().endsWith('.mrpack')) - Number(String(a.name).toLowerCase().endsWith('.mrpack')));
        if (candidates.length) {
          const asset = candidates[0];
          return [{
            id: `github:${fullName}:${asset.id}`,
            projectId: fullName,
            assetId: Number(asset.id),
            source: 'github',
            projectType: 'modpack',
            title: cleanText(repo.name || asset.name, 100),
            description: cleanText(release.name || repo.description || `Сборка ${asset.name}`, 260),
            author: cleanText(repo.owner?.login, 60),
            iconUrl: safeImageUrl(repo.owner?.avatar_url),
            downloads: Number(asset.download_count) || 0,
            stars: Number(repo.stargazers_count) || 0,
            fileName: cleanText(asset.name, 180),
            releaseTag: cleanText(release.tag_name, 60),
            url: cleanText(repo.html_url, 300),
          }];
        }
      }
      return [];
    });
    const result = { provider: 'github', projectType: 'modpack', results: releases.flat() };
    if (githubSearchCache.size >= 20) githubSearchCache.delete(githubSearchCache.keys().next().value);
    githubSearchCache.set(cacheKey, { expiresAt: Date.now() + 90_000, value: result });
    return result;
  }

  async function downloadToFile(url, destination, { maxBytes, hashes = {}, onProgress } = {}) {
    const expected = [];
    const hashLengths = { sha1: 40, sha256: 64, sha512: 128 };
    for (const [algorithm, rawHash] of Object.entries(hashes || {})) {
      if (rawHash == null || rawHash === '' || !hashLengths[algorithm]) continue;
      const hash = String(rawHash).toLowerCase();
      if (hash.length !== hashLengths[algorithm] || !/^[a-f0-9]+$/.test(hash)) {
        throw new Error(`Некорректная контрольная сумма ${algorithm.toUpperCase()}.`);
      }
      expected.push([algorithm, hash]);
    }
    const checks = expected.map(([algorithm, hash]) => ({ algorithm, expected: hash, hash: crypto.createHash(algorithm) }));

    if (checks.length) {
      try {
        const existing = await fs.readFile(destination);
        if (maxBytes && existing.length > maxBytes) throw new Error('Локальный файл превышает допустимый размер.');
        const matching = checks.every(({ algorithm, expected: expectedHash }) => crypto.createHash(algorithm).update(existing).digest('hex') === expectedHash);
        if (matching) return { size: existing.length, cached: true };
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    ensureExternalHttpsUrl(url);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.part`;
    try {
      const response = await fetchFollowingSafeRedirects(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/octet-stream,*/*' },
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) throw new Error(`Не удалось скачать файл (${response.status}).`);
      const contentLength = Number(response.headers.get('content-length'));
      if (Number.isFinite(contentLength) && contentLength > 0 && maxBytes && contentLength > maxBytes) {
        throw new Error('Источник предлагает файл больше допустимого размера.');
      }
      if (!response.body) throw new Error('Источник вернул пустой файл.');

      let bytes = 0;
      let lastProgressAt = 0;
      const verifier = new Transform({
        transform(chunk, _encoding, callback) {
          bytes += chunk.length;
          if (maxBytes && bytes > maxBytes) return callback(new Error('Файл превысил допустимый размер загрузки.'));
          for (const check of checks) check.hash.update(chunk);
          if (onProgress && (Date.now() - lastProgressAt >= 250 || contentLength && bytes >= contentLength)) {
            lastProgressAt = Date.now();
            onProgress(bytes, contentLength || 0);
          }
          callback(null, chunk);
        },
      });
      await pipeline(Readable.fromWeb(response.body), verifier, require('node:fs').createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
      if (bytes === 0) throw new Error('Скачанный файл пуст.');
      for (const check of checks) {
        const actual = check.hash.digest('hex');
        if (actual !== check.expected) throw new Error(`Проверка ${check.algorithm.toUpperCase()} не пройдена. Файл удалён.`);
      }
      await fs.rm(destination, { force: true });
      await fs.rename(temporary, destination);
      return { size: bytes, cached: false };
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  }

  function safeRelativePath(base, value) {
    const original = String(value || '');
    if (!original || original.includes('\0') || original.includes('\\')) throw new Error('Сборка содержит небезопасный путь к файлу.');
    const normalized = original.replaceAll('\\', '/');
    if (normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized) || normalized.startsWith('//')) throw new Error('Сборка содержит абсолютный путь, он не будет установлен.');
    const segments = normalized.split('/').filter((segment) => segment.length > 0);
    const windowsDeviceName = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
    const invalidSegment = /[<>"|?*\u0000-\u001f]/;
    if (!segments.length || segments.some((segment) => segment === '.' || segment === '..' || segment.includes(':') || invalidSegment.test(segment) || /[. ]$/.test(segment) || windowsDeviceName.test(segment))) {
      throw new Error('Сборка содержит путь, небезопасный для установки в игровую папку.');
    }
    const root = path.resolve(base);
    const resolved = path.resolve(root, ...segments);
    if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error('Сборка содержит путь за пределами игровой папки.');
    return { path: resolved, relative: segments.join('/') };
  }

  function zipEntryIsSymlink(entry) {
    const mode = (Number(entry.externalFileAttributes || 0) >>> 16) & 0xffff;
    return (mode & 0o170000) === 0o120000;
  }

  async function createProfile({ name, minecraftVersion, loader, loaderVersion = '', versionId = '', source = 'manual', iconUrl = '' }) {
    const safeMinecraftVersion = validVersion(minecraftVersion, 'версия Minecraft');
    const normalizedLoader = String(loader || 'vanilla').toLowerCase();
    if (normalizedLoader !== 'vanilla' && !SUPPORTED_LOADERS.has(normalizedLoader)) throw new Error('Сборка использует неподдерживаемый модлоадер.');
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    const profile = {
      id,
      name: sanitizeDisplayName(name, `Minecraft ${safeMinecraftVersion}`),
      minecraftVersion: safeMinecraftVersion,
      loader: normalizedLoader,
      loaderVersion: cleanText(loaderVersion, 64),
      versionId: validVersion(versionId || safeMinecraftVersion, 'версия загрузчика'),
      source: ['modrinth', 'github'].includes(source) ? source : 'manual',
      iconUrl: safeImageUrl(iconUrl),
      createdAt: timestamp,
      updatedAt: timestamp,
      mods: [],
    };
    await fs.mkdir(instancePath(id), { recursive: true });
    return profile;
  }

  async function findOrCreateModProfile({ minecraftVersion, loader, instanceId, title, iconUrl }) {
    const preferred = getInstance(instanceId);
    const existing = preferred && preferred.minecraftVersion === minecraftVersion && preferred.loader === loader
      ? preferred
      : instances.find((instance) => instance.minecraftVersion === minecraftVersion && instance.loader === loader);
    if (existing) return { profile: existing, isNew: false };
    const loaderLabel = loader === 'neoforge' ? 'NeoForge' : loader.charAt(0).toUpperCase() + loader.slice(1);
    const profile = await createProfile({
      name: `Minecraft ${minecraftVersion} · ${loaderLabel}`,
      minecraftVersion,
      loader,
      source: 'manual',
      iconUrl,
    });
    return { profile, isNew: true };
  }

  async function createInstance(options = {}) {
    assertLoaded();
    if (installing) throw new Error('Другая установка уже выполняется. Дождитесь её завершения.');
    installing = true;
    let profile = null;
    try {
      const minecraftVersion = validVersion(options.minecraftVersion, 'версия Minecraft');
      const loader = String(options.loader || 'vanilla').toLowerCase();
      if (loader !== 'vanilla' && !SUPPORTED_LOADERS.has(loader)) throw new Error('Сборка использует неподдерживаемый модлоадер.');
      const loaderLabel = loader === 'neoforge' ? 'NeoForge' : loader.charAt(0).toUpperCase() + loader.slice(1);
      const name = sanitizeDisplayName(options.name, `Minecraft ${minecraftVersion} · ${loaderLabel}`);

      progress(3, `Проверяем Minecraft ${minecraftVersion}…`);
      const baseVersion = await ensureMinecraft(minecraftVersion);
      let loaderInfo = { versionId: minecraftVersion, loaderVersion: '' };
      if (loader !== 'vanilla') {
        progress(30, `Устанавливаем ${loaderLabel}…`);
        loaderInfo = await installLoader(minecraftVersion, loader, '', Number(baseVersion?.javaVersion?.majorVersion || 21));
      }
      progress(92, 'Создаём отдельный игровой профиль…');
      profile = await createProfile({
        name,
        minecraftVersion,
        loader,
        loaderVersion: loaderInfo.loaderVersion,
        versionId: loaderInfo.versionId,
        source: 'manual',
      });
      const instance = await commitInstance(profile);
      progress(100, `Сборка «${instance.name}» готова.`);
      return { ok: true, instance, instances: listInstances() };
    } catch (error) {
      if (profile) await fs.rm(instancePath(profile.id), { recursive: true, force: true }).catch(() => {});
      throw error;
    } finally {
      installing = false;
    }
  }

  async function chooseLoaderVersion(loader, minecraftVersion) {
    if (loader === 'fabric') {
      const versions = await getLoaderArtifactListFor(minecraftVersion);
      const selected = versions.find((item) => item.loader?.stable) || versions[0];
      if (!selected?.loader?.version) throw new Error(`Для Fabric не найден загрузчик Minecraft ${minecraftVersion}.`);
      return selected.loader.version;
    }
    if (loader === 'quilt') {
      const versions = await getQuiltLoaderVersionsByMinecraft({ minecraftVersion });
      if (!versions?.[0]?.loader?.version) throw new Error(`Для Quilt не найден загрузчик Minecraft ${minecraftVersion}.`);
      return versions[0].loader.version;
    }
    if (loader === 'forge' || loader === 'neoforge') {
      const metadataUrl = loader === 'forge'
        ? 'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml'
        : 'https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml';
      const response = await fetchFollowingSafeRedirects(metadataUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/xml,text/xml,*/*' },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Не удалось получить список версий ${loader}.`);
      const xml = await response.text();
      const allVersions = [...xml.matchAll(/<version>\s*([^<]+)\s*<\/version>/gi)].map((match) => match[1].trim());
      const matching = loader === 'forge'
        ? allVersions.filter((version) => version.startsWith(`${minecraftVersion}-`)).map((version) => version.slice(minecraftVersion.length + 1))
        : allVersions.filter((version) => neoForgeMatchesMinecraft(version, minecraftVersion));
      const stable = matching.filter((version) => !/(?:alpha|beta|snapshot|rc|pre)/i.test(version));
      const selected = (stable.length ? stable : matching).at(-1);
      if (!selected) throw new Error(`Для ${loader === 'forge' ? 'Forge' : 'NeoForge'} не найден загрузчик Minecraft ${minecraftVersion}.`);
      return selected;
    }
    throw new Error('Не удалось определить версию загрузчика.');
  }

  function neoForgeMatchesMinecraft(version, minecraftVersion) {
    const value = String(version);
    if (value.startsWith(`${minecraftVersion}-`)) return true;
    const match = String(minecraftVersion).match(/^1\.(\d+)(?:\.(\d+))?/);
    if (!match) return false;
    const minor = Number(match[1]);
    const patch = Number(match[2] || 0);
    if (minor === 20 && patch === 1) return /^47\.1\./.test(value);
    if (minor >= 20) return value.startsWith(`${minor}.${patch}.`);
    return false;
  }

  function neoForgeArtifactVersion(minecraftVersion, loaderVersion) {
    if (loaderVersion.startsWith(`${minecraftVersion}-`)) return loaderVersion;
    const match = String(minecraftVersion).match(/^1\.(\d+)(?:\.(\d+))?/);
    if (match && Number(match[1]) === 20 && Number(match[2] || 0) === 1 && /^47\./.test(loaderVersion)) {
      return `${minecraftVersion}-${loaderVersion}`;
    }
    return loaderVersion;
  }

  async function installLoader(minecraftVersion, loader, requestedVersion = '', requiredJavaMajor = 21) {
    if (loader === 'vanilla') return { versionId: minecraftVersion, loaderVersion: '' };
    const loaderVersion = requestedVersion ? validVersion(requestedVersion, `${loader} loader`) : await chooseLoaderVersion(loader, minecraftVersion);
    let versionId;
    const root = getRoot();
    const progressOptions = { side: 'client' };
    if (loader === 'fabric') {
      versionId = await installFabric({ minecraftVersion, version: loaderVersion, minecraft: root, ...progressOptions });
    } else if (loader === 'quilt') {
      versionId = await installQuiltVersion({ minecraftVersion, version: loaderVersion, minecraft: root, ...progressOptions });
    } else if (loader === 'forge') {
      const java = await resolveJava(requiredJavaMajor);
      versionId = await installForge({ mcversion: minecraftVersion, version: loaderVersion }, root, { ...progressOptions, java });
    } else if (loader === 'neoforge') {
      const java = await resolveJava(requiredJavaMajor);
      versionId = await installNeoForged('neoforge', neoForgeArtifactVersion(minecraftVersion, loaderVersion), root, { ...progressOptions, java });
    }
    const resolved = await Version.parse(root, versionId);
    await installDependencies(resolved);
    return { versionId, loaderVersion };
  }

  async function ensureProfileLoader(profile, requiredJavaMajor) {
    if (profile.versionId && profile.loaderVersion) {
      try {
        const resolved = await Version.parse(getRoot(), profile.versionId);
        await installDependencies(resolved);
        return { versionId: profile.versionId, loaderVersion: profile.loaderVersion };
      } catch (error) {
        if (error?.error !== 'MissingVersionJson' && error?.error !== 'CorruptedVersionJson') throw error;
      }
    }
    return installLoader(profile.minecraftVersion, profile.loader, profile.loaderVersion, requiredJavaMajor);
  }

  function compatibleModVersion(version, gameVersion, loader) {
    return Array.isArray(version?.game_versions) && version.game_versions.includes(gameVersion)
      && Array.isArray(version?.loaders) && version.loaders.includes(loader);
  }

  function primaryJar(version) {
    const files = Array.isArray(version?.files) ? version.files : [];
    return files.find((file) => file.primary && String(file.filename || '').toLowerCase().endsWith('.jar'))
      || files.find((file) => String(file.filename || '').toLowerCase().endsWith('.jar'));
  }

  function safeModFileName(value, hash) {
    const original = String(value || '').replaceAll('\\', '/').split('/').at(-1) || '';
    const clean = original.replace(/[^\p{L}\p{N}._()+ -]/gu, '_').slice(0, 160);
    if (!clean.toLowerCase().endsWith('.jar')) throw new Error('Каталог вернул файл мода не в формате JAR.');
    const base = clean.slice(0, -4).trim() || 'mod';
    const suffix = /^[a-f0-9]{8,}$/i.test(hash || '') ? `-${String(hash).slice(0, 8)}` : '';
    return `${base}${suffix}.jar`;
  }

  function modVersionHashes(file) {
    const hashes = file?.hashes || {};
    if (hashes.sha512 && /^[a-f0-9]{128}$/i.test(String(hashes.sha512))) return { sha512: hashes.sha512 };
    if (hashes.sha1 && /^[a-f0-9]{40}$/i.test(String(hashes.sha1))) return { sha1: hashes.sha1 };
    throw new Error('У файла мода нет корректной SHA-1/SHA-512 контрольной суммы, установка отменена.');
  }

  async function getCompatibleModVersion(projectId, gameVersion, loader) {
    const params = {
      game_versions: JSON.stringify([gameVersion]),
      loaders: JSON.stringify([loader]),
    };
    const versions = await fetchJson(modrinthApi(`/project/${encodeURIComponent(projectId)}/version`, params));
    return Array.isArray(versions) ? versions.find((version) => compatibleModVersion(version, gameVersion, loader)) : null;
  }

  async function resolveModDependencies(rootVersion, gameVersion, loader) {
    const versions = [rootVersion];
    const seenProjects = new Set([String(rootVersion.project_id)]);
    for (let index = 0; index < versions.length && versions.length < MAX_MOD_DEPENDENCIES; index += 1) {
      const current = versions[index];
      const dependencies = Array.isArray(current.dependencies) ? current.dependencies : [];
      for (const dependency of dependencies) {
        if (dependency.dependency_type !== 'required' || versions.length >= MAX_MOD_DEPENDENCIES) continue;
        let candidate = null;
        if (dependency.version_id) {
          candidate = await fetchJson(modrinthApi(`/version/${encodeURIComponent(dependency.version_id)}`));
          if (!compatibleModVersion(candidate, gameVersion, loader)) {
            throw new Error(`Обязательная зависимость ${dependency.project_id || dependency.version_id} несовместима с выбранными Minecraft ${gameVersion} и ${loader}.`);
          }
        } else if (dependency.project_id) {
          const projectId = String(dependency.project_id);
          if (seenProjects.has(projectId)) continue;
          candidate = await getCompatibleModVersion(projectId, gameVersion, loader);
          if (!candidate) throw new Error(`Не найдена совместимая обязательная зависимость ${projectId}.`);
        }
        if (!candidate) continue;
        const projectId = String(candidate.project_id || dependency.project_id || candidate.id);
        if (seenProjects.has(projectId)) continue;
        seenProjects.add(projectId);
        versions.push(candidate);
      }
    }
    return versions;
  }

  async function installMod(options = {}) {
    assertLoaded();
    if (installing) throw new Error('Другая установка уже выполняется. Дождитесь её завершения.');
    installing = true;
    let newProfile = null;
    try {
      if (options.source !== 'modrinth') throw new Error('Автоматическая установка отдельных модов доступна из каталога Modrinth.');
      const projectId = cleanText(options.projectId, 100);
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) throw new Error('Некорректный идентификатор проекта Modrinth.');
      const gameVersion = validVersion(options.gameVersion, 'версия Minecraft');
      const loader = String(options.loader || 'fabric').toLowerCase();
      if (!SUPPORTED_LOADERS.has(loader)) throw new Error('Для установки модов выберите Fabric, Forge, NeoForge или Quilt.');

      progress(2, 'Проверяем версию мода на Modrinth…');
      const rootVersion = await getCompatibleModVersion(projectId, gameVersion, loader);
      if (!rootVersion) throw new Error(`Для Minecraft ${gameVersion} и ${loader} не найдена совместимая версия мода.`);
      const rootFile = primaryJar(rootVersion);
      if (!rootFile?.url) throw new Error('В выбранной версии мода нет доступного JAR-файла.');
      const versions = await resolveModDependencies(rootVersion, gameVersion, loader);
      const { profile, isNew } = await findOrCreateModProfile({
        minecraftVersion: gameVersion,
        loader,
        instanceId: options.instanceId,
        title: options.title,
        iconUrl: options.iconUrl,
      });
      if (isNew) newProfile = profile;

      progress(8, `Подготавливаем Minecraft ${gameVersion}…`);
      const baseVersion = await ensureMinecraft(gameVersion);
      progress(17, `Проверяем загрузчик ${loader}…`);
      const loaderInfo = await ensureProfileLoader(profile, Number(baseVersion?.javaVersion?.majorVersion || 21));
      profile.versionId = loaderInfo.versionId;
      profile.loaderVersion = loaderInfo.loaderVersion;

      const modsDir = path.join(instancePath(profile.id), 'mods');
      const stagingDir = path.join(instancePath(profile.id), `.lumen-staging-${crypto.randomUUID()}`);
      const installedMods = [];
      await fs.mkdir(stagingDir, { recursive: true });
      try {
        for (let index = 0; index < versions.length; index += 1) {
          const modVersion = versions[index];
          const file = primaryJar(modVersion);
          if (!file?.url) throw new Error(`У обязательной зависимости ${modVersion.project_id || modVersion.id} нет JAR-файла.`);
          const hashes = modVersionHashes(file);
          const hashKey = hashes.sha512 || hashes.sha1;
          const fileName = safeModFileName(file.filename, hashKey);
          const destination = path.join(stagingDir, fileName);
          const percent = Math.round(23 + (index / Math.max(versions.length, 1)) * 70);
          progress(percent, `Скачиваем ${index === 0 ? cleanText(options.title, 80) || 'мод' : 'обязательную зависимость'} (${index + 1}/${versions.length})…`);
          await downloadToFile(file.url, destination, { maxBytes: MAX_MOD_FILE, hashes });
          installedMods.push({
            projectId: cleanText(modVersion.project_id, 100),
            name: index === 0 ? cleanText(options.title, 80) || 'Мод' : cleanText(modVersion.name || modVersion.project_id, 80),
            version: cleanText(modVersion.version_number, 40),
            fileName,
          });
        }
        await fs.mkdir(modsDir, { recursive: true });
        const replacementProjects = new Set(installedMods.map((mod) => mod.projectId));
        const replacementFiles = new Set(installedMods.map((mod) => mod.fileName));
        for (const existingMod of profile.mods || []) {
          const oldFile = sanitizeStoredFileName(existingMod.fileName);
          if (replacementProjects.has(existingMod.projectId) && oldFile && !replacementFiles.has(oldFile)) {
            await fs.rm(path.join(modsDir, oldFile), { force: true });
          }
        }
        const movedFiles = new Set();
        for (const mod of installedMods) {
          if (movedFiles.has(mod.fileName)) continue;
          movedFiles.add(mod.fileName);
          const destination = path.join(modsDir, mod.fileName);
          await fs.rm(destination, { force: true });
          await fs.rename(path.join(stagingDir, mod.fileName), destination);
        }
      } finally {
        await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
      }

      const mergedMods = new Map((profile.mods || []).map((mod) => [mod.projectId, mod]));
      for (const mod of installedMods) mergedMods.set(mod.projectId, mod);
      profile.mods = [...mergedMods.values()];
      profile.source = profile.source === 'github' ? 'github' : 'modrinth';
      if (isNew) profile.name = `Minecraft ${gameVersion} · ${loader.charAt(0).toUpperCase() + loader.slice(1)}`;
      const saved = await commitInstance(profile);
      progress(100, 'Мод установлен в отдельную сборку.');
      return { ok: true, instance: saved, instances: listInstances() };
    } catch (error) {
      if (newProfile) await fs.rm(instancePath(newProfile.id), { recursive: true, force: true }).catch(() => {});
      throw error;
    } finally {
      installing = false;
    }
  }

  function pickModpackFile(version) {
    const files = Array.isArray(version?.files) ? version.files : [];
    return files.find((file) => file.primary && /\.(?:mrpack|zip)$/i.test(String(file.filename || '')))
      || files.find((file) => /\.mrpack$/i.test(String(file.filename || '')))
      || files.find((file) => /\.(?:mrpack|zip)$/i.test(String(file.filename || '')));
  }

  async function findModrinthPackVersion(projectId, gameVersion) {
    const project = await fetchJson(modrinthApi(`/project/${encodeURIComponent(projectId)}`));
    if (project.project_type !== 'modpack') throw new Error('Выбранный проект Modrinth не является сборкой.');
    const params = gameVersion ? { game_versions: JSON.stringify([gameVersion]) } : undefined;
    const versions = await fetchJson(modrinthApi(`/project/${encodeURIComponent(projectId)}/version`, params));
    if (!Array.isArray(versions)) throw new Error('Modrinth не вернул версии сборки.');
    for (const version of versions) {
      const file = pickModpackFile(version);
      if (file?.url) return { project, version, file };
    }
    throw new Error(gameVersion
      ? `У этой сборки нет Modrinth-пакета для Minecraft ${gameVersion}. Попробуйте выбрать другую версию игры.`
      : 'У этой сборки нет доступного файла .mrpack.');
  }

  async function findGithubPackAsset(projectId, assetId) {
    const parts = String(projectId || '').split('/');
    if (parts.length !== 2 || !parts.every((part) => /^[a-zA-Z0-9_.-]{1,100}$/.test(part))) throw new Error('Некорректный GitHub-репозиторий сборки.');
    const id = Number(assetId);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Некорректный идентификатор файла GitHub Release.');
    const releases = await fetchJson(githubApi(`/repos/${parts.map(encodeURIComponent).join('/')}/releases?per_page=10`), { github: true });
    for (const release of Array.isArray(releases) ? releases : []) {
      const asset = (release.assets || []).find((entry) => Number(entry.id) === id);
      if (!asset) continue;
      if (!/\.(?:mrpack|zip)$/i.test(String(asset.name || '')) || Number(asset.size) <= 0 || Number(asset.size) > MAX_PACK_ARCHIVE) {
        throw new Error('Файл GitHub Release не является поддерживаемым Modrinth-пакетом.');
      }
      return { release, asset, repo: `${parts[0]}/${parts[1]}` };
    }
    throw new Error('Файл сборки больше не доступен в GitHub Release.');
  }

  function inferPackLoader(dependencies) {
    const pairs = [
      ['fabric-loader', 'fabric'],
      ['quilt-loader', 'quilt'],
      ['neoforge', 'neoforge'],
      ['forge', 'forge'],
    ].filter(([key]) => dependencies?.[key]);
    if (pairs.length > 1) throw new Error('Сборка содержит несколько модлоадеров и не может быть установлена автоматически.');
    if (!pairs.length) return { loader: 'vanilla', version: '' };
    const [key, loader] = pairs[0];
    return { loader, version: validVersion(dependencies[key], `версия ${key}`) };
  }

  async function installPackArchive({ archivePath, source, sourceName, iconUrl, selectedGameVersion = '' }) {
    const zip = await open(archivePath, {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    });
    let profile = null;
    let newProfile = true;
    try {
      progress(5, 'Проверяем манифест сборки…');
      const entries = await readAllEntries(zip);
      if (entries.length > MAX_ZIP_ENTRIES) throw new Error('В архиве слишком много файлов.');
      let totalArchiveBytes = 0;
      const byName = new Map();
      for (const entry of entries) {
        const name = String(entry.fileName || '');
        if (!name || name.includes('\\') || name.includes('\0') || name.startsWith('/') || /^[a-zA-Z]:/.test(name)) {
          throw new Error('Архив содержит небезопасный путь.');
        }
        const isDirectory = entry.fileName.endsWith('/');
        safeRelativePath(instancesRoot(), isDirectory ? name.replace(/\/$/, '/_dir') : name);
        if (zipEntryIsSymlink(entry)) throw new Error('Сборка содержит символическую ссылку, установка отменена.');
        const size = Number(entry.uncompressedSize || 0);
        if (!Number.isFinite(size) || size < 0) throw new Error('В архиве обнаружен файл с некорректным размером.');
        totalArchiveBytes += size;
        if (totalArchiveBytes > 2 * 1024 * 1024 * 1024) throw new Error('Распакованный архив превышает безопасный лимит 2 ГБ.');
        if (!isDirectory && byName.has(name)) throw new Error('Архив содержит повторяющиеся имена файлов.');
        if (!isDirectory) byName.set(name, entry);
      }
      const manifestEntry = byName.get('modrinth.index.json');
      if (!manifestEntry || manifestEntry.uncompressedSize > 2 * 1024 * 1024) {
        throw new Error('Это не поддерживаемая сборка: в корне архива не найден modrinth.index.json. Нужен файл .mrpack или Modrinth-совместимый ZIP.');
      }
      const manifest = JSON.parse((await readEntry(zip, manifestEntry)).toString('utf8'));
      if (!manifest || manifest.game !== 'minecraft' || ![1, 2].includes(Number(manifest.formatVersion)) || !Array.isArray(manifest.files) || !manifest.dependencies) {
        throw new Error('Манифест сборки повреждён или использует неподдерживаемый формат Modrinth.');
      }
      if (manifest.files.length > MAX_PACK_FILES) throw new Error('Сборка содержит слишком много файлов для безопасной установки.');
      const minecraftVersion = validVersion(manifest.dependencies.minecraft, 'версия Minecraft в сборке');
      if (selectedGameVersion && minecraftVersion !== selectedGameVersion) {
        // A Modrinth pack may choose a more suitable release than the catalog's current selection.
        progress(7, `Сборка использует Minecraft ${minecraftVersion} вместо ${selectedGameVersion}…`);
      }
      const { loader, version: requestedLoaderVersion } = inferPackLoader(manifest.dependencies);
      const displayName = sanitizeDisplayName(manifest.name || sourceName, `Minecraft ${minecraftVersion}`);
      profile = await createProfile({
        name: displayName,
        minecraftVersion,
        loader,
        loaderVersion: requestedLoaderVersion,
        versionId: minecraftVersion,
        source,
        iconUrl,
      });

      progress(10, `Подготавливаем Minecraft ${minecraftVersion}…`);
      const baseVersion = await ensureMinecraft(minecraftVersion);
      let versionId = minecraftVersion;
      let actualLoaderVersion = '';
      if (loader !== 'vanilla') {
        progress(19, `Устанавливаем ${loader === 'neoforge' ? 'NeoForge' : loader.charAt(0).toUpperCase() + loader.slice(1)}…`);
        const installed = await installLoader(minecraftVersion, loader, requestedLoaderVersion, Number(baseVersion?.javaVersion?.majorVersion || 21));
        versionId = installed.versionId;
        actualLoaderVersion = installed.loaderVersion;
      }
      profile.versionId = versionId;
      profile.loaderVersion = actualLoaderVersion;

      const files = manifest.files.filter((file) => file?.env?.client !== 'unsupported' && file?.env?.client !== 'optional');
      if (files.length > MAX_PACK_FILES) throw new Error('Сборка содержит слишком много файлов.');
      const paths = new Set();
      let totalDownload = 0;
      for (const file of files) {
        const safe = safeRelativePath(instancePath(profile.id), file.path);
        if (paths.has(safe.relative)) throw new Error(`В манифесте повторяется путь ${safe.relative}.`);
        paths.add(safe.relative);
        const size = Number(file.fileSize || 0);
        if (!Number.isFinite(size) || size < 0 || size > MAX_MOD_FILE) throw new Error('Сборка содержит файл больше допустимого размера 250 МБ.');
        totalDownload += size;
        if (totalDownload > MAX_PACK_DOWNLOAD) throw new Error('Общий размер загрузки сборки превышает безопасный лимит 8 ГБ.');
        const hashes = file.hashes || {};
        const validSha1 = /^[a-f0-9]{40}$/i.test(String(hashes.sha1 || ''));
        const validSha512 = /^[a-f0-9]{128}$/i.test(String(hashes.sha512 || ''));
        if (hashes.sha1 && !validSha1 || hashes.sha512 && !validSha512 || !validSha1 && !validSha512) {
          throw new Error(`У файла ${safe.relative} нет корректной SHA-1/SHA-512 контрольной суммы, поэтому его нельзя проверить.`);
        }
        if (!Array.isArray(file.downloads) || !file.downloads.some((url) => /^https:\/\//i.test(String(url)))) {
          throw new Error(`Для файла ${safe.relative} нет безопасной HTTPS-ссылки.`);
        }
      }
      let completedFiles = 0;
      await mapLimit(files, 5, async (file) => {
        const safe = safeRelativePath(instancePath(profile.id), file.path);
        const destination = safe.path;
        const expectedSize = Number(file.fileSize || 0);
        const hashes = { sha1: file.hashes.sha1, sha512: file.hashes.sha512 };
        const links = file.downloads.filter((url) => /^https:\/\//i.test(String(url)));
        let lastError;
        for (const url of links) {
          try {
            await downloadToFile(url, destination, {
              maxBytes: Math.min(MAX_MOD_FILE, expectedSize > 0 ? expectedSize + 1024 : MAX_MOD_FILE),
              hashes,
            });
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (lastError) throw lastError;
        completedFiles += 1;
        const fraction = files.length ? completedFiles / files.length : 1;
        progress(Math.round(24 + fraction * 63), `Скачиваем файлы сборки (${completedFiles}/${files.length})…`, { completed: completedFiles, total: files.length });
      });

      let overrideCount = 0;
      let overrideBytes = 0;
      const overrideEntries = entries.filter((entry) => !entry.fileName.endsWith('/') && (entry.fileName.startsWith('overrides/') || entry.fileName.startsWith('client-overrides/')));
      for (const entry of overrideEntries) {
        if (entry.fileName.startsWith('server-overrides/')) continue;
        const prefix = entry.fileName.startsWith('client-overrides/') ? 'client-overrides/' : 'overrides/';
        const relative = entry.fileName.slice(prefix.length);
        if (!relative) continue;
        const safe = safeRelativePath(instancePath(profile.id), relative);
        const size = Number(entry.uncompressedSize || 0);
        overrideBytes += size;
        overrideCount += 1;
        if (size > MAX_MOD_FILE || overrideBytes > MAX_OVERRIDE_BYTES || overrideCount > MAX_PACK_FILES) {
          throw new Error('Дополнительные файлы сборки превышают безопасный лимит распаковки.');
        }
        await fs.mkdir(path.dirname(safe.path), { recursive: true });
        const stream = await openEntryReadStream(zip, entry);
        await pipeline(stream, require('node:fs').createWriteStream(safe.path, { flags: 'w', mode: 0o600 }));
      }

      profile.mods = files.filter((file) => /^mods\//i.test(String(file.path))).map((file) => ({
        projectId: '',
        name: path.posix.basename(String(file.path), path.posix.extname(String(file.path))),
        version: '',
        fileName: sanitizeStoredFileName(path.posix.basename(String(file.path))),
      }));
      const saved = await commitInstance(profile);
      profile = null;
      progress(100, 'Сборка установлена и добавлена в библиотеку.');
      return saved;
    } finally {
      zip.close();
      if (profile && newProfile) await fs.rm(instancePath(profile.id), { recursive: true, force: true }).catch(() => {});
    }
  }

  async function installModpack(options = {}) {
    assertLoaded();
    if (installing) throw new Error('Другая установка уже выполняется. Дождитесь её завершения.');
    installing = true;
    const tempDirectory = path.join(getUserData(), 'content-downloads');
    const archivePath = path.join(tempDirectory, `${crypto.randomUUID()}.mrpack`);
    try {
      const source = options.source === 'github' ? 'github' : 'modrinth';
      const selectedGameVersion = options.gameVersion ? validVersion(options.gameVersion, 'версия Minecraft') : '';
      let downloadUrl;
      let expectedHashes = {};
      let sourceName = '';
      let iconUrl = '';
      let maxBytes = MAX_PACK_ARCHIVE;

      if (source === 'modrinth') {
        const projectId = cleanText(options.projectId, 100);
        if (!/^[a-zA-Z0-9_-]{1,100}$/.test(projectId)) throw new Error('Некорректный идентификатор сборки Modrinth.');
        progress(2, 'Ищем подходящую версию сборки на Modrinth…');
        const found = await findModrinthPackVersion(projectId, selectedGameVersion);
        downloadUrl = found.file.url;
        expectedHashes = { sha1: found.file.hashes?.sha1, sha512: found.file.hashes?.sha512 };
        sourceName = found.project.title || options.title || 'Сборка Modrinth';
        iconUrl = found.project.icon_url || options.iconUrl || '';
        maxBytes = Math.min(MAX_PACK_ARCHIVE, Number(found.file.size) > 0 ? Number(found.file.size) + 1024 : MAX_PACK_ARCHIVE);
      } else {
        progress(2, 'Проверяем GitHub Release…');
        const found = await findGithubPackAsset(options.projectId, options.assetId);
        downloadUrl = found.asset.browser_download_url;
        sourceName = found.release.name || found.repo;
        iconUrl = options.iconUrl || '';
        maxBytes = Math.min(MAX_PACK_ARCHIVE, Number(found.asset.size) > 0 ? Number(found.asset.size) + 1024 : MAX_PACK_ARCHIVE);
      }

      await fs.mkdir(tempDirectory, { recursive: true });
      progress(5, 'Скачиваем архив сборки…');
      await downloadToFile(downloadUrl, archivePath, {
        maxBytes,
        hashes: expectedHashes,
        onProgress: (bytes, total) => {
          if (total > 0) progress(5 + (bytes / total) * 12, 'Скачиваем архив сборки…');
        },
      });
      const instance = await installPackArchive({ archivePath, source, sourceName, iconUrl, selectedGameVersion });
      return { ok: true, instance, instances: listInstances() };
    } catch (error) {
      throw error;
    } finally {
      await fs.rm(archivePath, { force: true }).catch(() => {});
      installing = false;
    }
  }

  async function prepareInstanceVersion(id, requiredJavaMajor = 21) {
    const instance = getInstance(id);
    if (!instance) throw new Error('Сборка больше не найдена.');
    const root = getRoot();
    if (instance.loader === 'vanilla') return Version.parse(root, instance.versionId);
    let resolved;
    let reinstalled = false;
    try {
      resolved = await Version.parse(root, instance.versionId);
    } catch {
      progress(14, `Подготавливаем загрузчик ${instance.loader} для текущей папки игры…`);
      const installed = await installLoader(instance.minecraftVersion, instance.loader, instance.loaderVersion, requiredJavaMajor);
      instance.versionId = installed.versionId;
      instance.loaderVersion = installed.loaderVersion;
      await commitInstance(instance);
      resolved = await Version.parse(root, instance.versionId);
      reinstalled = true;
    }
    if (resolved.minecraftVersion && resolved.minecraftVersion !== instance.minecraftVersion) {
      throw new Error('Версия модлоадера не совпадает с Minecraft в выбранной сборке.');
    }
    if (!reinstalled) {
      progress(92, `Проверяем библиотеки ${instance.loader}…`);
      await installDependencies(resolved);
    }
    return resolved;
  }

  async function openFolder(id) {
    const instance = getInstance(id);
    if (!instance) throw new Error('Сборка больше не найдена.');
    await fs.mkdir(instancePath(instance.id), { recursive: true });
    return instancePath(instance.id);
  }

  async function removeInstance(id) {
    assertLoaded();
    if (installing) throw new Error('Дождитесь завершения текущей установки перед удалением сборки.');
    const instance = getInstance(id);
    if (!instance) throw new Error('Сборка больше не найдена.');
    await fs.rm(instancePath(instance.id), { recursive: true, force: true });
    instances = instances.filter((entry) => entry.id !== instance.id);
    await persistInstances();
    const next = listInstances();
    emit('instances-changed', { instances: next });
    return { ok: true, instances: next };
  }

  return {
    load,
    listInstances,
    getInstance,
    isInstalling: () => installing,
    getInstancePath: (id) => {
      const instance = getInstance(id);
      return instance ? instancePath(instance.id) : null;
    },
    searchContent,
    createInstance,
    installMod,
    installModpack,
    prepareInstanceVersion,
    openFolder,
    removeInstance,
  };
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  let failed = null;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (!failed) {
      const index = next++;
      if (index >= items.length) return;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        failed = error;
        return;
      }
    }
  });
  await Promise.all(workers);
  if (failed) throw failed;
  return results;
}

module.exports = { createContentService };

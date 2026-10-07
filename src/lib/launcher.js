const PREVIEW_VERSIONS = [
  { id: '1.21.4', type: 'release' },
  { id: '1.21.1', type: 'release' },
  { id: '1.20.1', type: 'release' },
];

let previewSettings = {
  memoryMin: 2,
  memoryMax: 6,
  gameDir: 'Выберите папку в настольной версии',
  javaPath: '',
  width: 1280,
  height: 720,
};
let previewVersions = PREVIEW_VERSIONS;
const listeners = new Set();

const desktop = typeof window !== 'undefined' && Boolean(window.launcher?.isDesktop);

function publish(type, payload = {}) {
  listeners.forEach((listener) => listener({ type, payload }));
}

async function browserVersions() {
  try {
    const response = await fetch('/minecraft-meta/mc/game/version_manifest_v2.json');
    if (!response.ok) throw new Error('Could not fetch version manifest');
    const manifest = await response.json();
    previewVersions = (manifest.versions || [])
      .filter((version) => version.type === 'release')
      .slice(0, 30)
      .map(({ id, type, releaseTime }) => ({ id, type, releaseTime }));
  } catch {
    previewVersions = PREVIEW_VERSIONS;
  }
  return previewVersions;
}

async function fetchPublicJson(pathname, provider) {
  const proxyPath = provider === 'modrinth' ? `/modrinth-api${pathname}` : `/github-api${pathname}`;
  const directBase = provider === 'modrinth' ? 'https://api.modrinth.com/v2' : 'https://api.github.com';
  let response;
  try {
    response = await fetch(proxyPath);
    if (response.ok) return await response.json();
  } catch {
    // The user's browser can reach public catalog APIs directly if the preview proxy cannot.
  }
  response = await fetch(`${directBase}${pathname}`);
  if (!response.ok) throw new Error(`Каталог временно недоступен (${response.status}).`);
  return response.json();
}

async function browserSearchContent({ provider = 'modrinth', projectType = 'mod', query = '', gameVersion = '', loader = 'fabric' } = {}) {
  if (provider === 'github') {
    const directRepo = query.trim().match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    let repositories;
    if (directRepo) {
      const repo = await fetchPublicJson(`/repos/${directRepo[1]}/${directRepo[2]}`, 'github');
      repositories = [repo];
    } else {
      const terms = query.trim() ? `${query.trim()} minecraft modpack` : 'minecraft modpack';
      const search = await fetchPublicJson(`/search/repositories?q=${encodeURIComponent(terms)}&sort=stars&order=desc&per_page=10`, 'github');
      repositories = search.items || [];
    }
    const results = (await Promise.all(repositories.slice(0, 8).map(async (repo) => {
      try {
        const releases = await fetchPublicJson(`/repos/${repo.full_name}/releases?per_page=6`, 'github');
        for (const release of releases || []) {
          const asset = (release.assets || []).filter((item) => {
            const name = String(item.name || '').toLowerCase();
            return (name.endsWith('.mrpack') || name.endsWith('.zip') && /(?:mrpack|modpack|pack)/i.test(name))
              && Number(item.size) > 0 && Number(item.size) <= 300 * 1024 * 1024;
          }).sort((a, b) => Number(String(b.name).toLowerCase().endsWith('.mrpack')) - Number(String(a.name).toLowerCase().endsWith('.mrpack')))[0];
          if (!asset) continue;
          return {
            id: `github:${repo.full_name}:${asset.id}`,
            projectId: repo.full_name,
            assetId: Number(asset.id),
            source: 'github',
            projectType: 'modpack',
            title: repo.name || asset.name,
            description: release.name || repo.description || `Сборка ${asset.name}`,
            author: repo.owner?.login || '',
            iconUrl: repo.owner?.avatar_url || '',
            downloads: Number(asset.download_count) || 0,
            stars: Number(repo.stargazers_count) || 0,
            fileName: asset.name,
            releaseTag: release.tag_name || '',
            url: repo.html_url || `https://github.com/${repo.full_name}`,
          };
        }
      } catch {
        return null;
      }
      return null;
    }))).filter(Boolean);
    return { provider: 'github', projectType: 'modpack', results };
  }

  const facets = [[`project_type:${projectType}`]];
  if (gameVersion) facets.push([`versions:${gameVersion}`]);
  if (projectType === 'mod') facets.push([`categories:${loader}`]);
  const params = new URLSearchParams({ query, facets: JSON.stringify(facets), index: 'downloads', limit: '16' });
  const data = await fetchPublicJson(`/search?${params}`, 'modrinth');
  return {
    provider: 'modrinth',
    projectType,
    results: (data.hits || []).map((hit) => ({
      id: hit.project_id,
      projectId: hit.project_id,
      source: 'modrinth',
      projectType,
      title: hit.title || 'Проект Modrinth',
      description: hit.description || '',
      author: hit.author || '',
      iconUrl: hit.icon_url || '',
      downloads: Number(hit.downloads) || 0,
      followers: Number(hit.follows) || 0,
      categories: hit.display_categories || [],
      url: `https://modrinth.com/${projectType === 'modpack' ? 'modpack' : 'mod'}/${encodeURIComponent(hit.slug || '')}`,
    })),
  };
}

export const launcherApi = {
  isDesktop: desktop,

  async getState() {
    if (desktop) return window.launcher.getState();
    const versions = await browserVersions();
    return {
      account: null,
      settings: { ...previewSettings },
      versions,
      gameRunning: false,
      instances: [],
      isDesktop: false,
      secureStorageAvailable: false,
    };
  },

  async login(credentials) {
    if (desktop) return window.launcher.login(credentials);
    return {
      ok: false,
      message: 'Для защиты аккаунта вход через Ely.by доступен только в настольном приложении. Не вводите пароль в браузерном предпросмотре.',
    };
  },

  async logout() {
    if (desktop) return window.launcher.logout();
    publish('account-changed', { account: null });
    return { ok: true };
  },

  async saveSettings(settings) {
    if (desktop) return window.launcher.saveSettings(settings);
    previewSettings = { ...previewSettings, ...settings };
    publish('settings-changed', { settings: previewSettings });
    return { ok: true, settings: { ...previewSettings } };
  },

  async chooseGameDir() {
    if (desktop) return window.launcher.chooseGameDir();
    return { canceled: true, path: previewSettings.gameDir };
  },

  async launch(options) {
    if (desktop) return window.launcher.launch(options);
    throw new Error('Запуск Minecraft доступен в установленной настольной версии Lumen.');
  },

  async searchContent(options) {
    if (desktop) return window.launcher.searchContent(options);
    return browserSearchContent(options);
  },

  async createInstance(options) {
    if (desktop) return window.launcher.createInstance(options);
    throw new Error('Создание сборок доступно в установленной настольной версии Lumen.');
  },

  async installMod(options) {
    if (desktop) return window.launcher.installMod(options);
    throw new Error('Установка модов доступна в установленной настольной версии Lumen.');
  },

  async installModpack(options) {
    if (desktop) return window.launcher.installModpack(options);
    throw new Error('Установка сборок доступна в установленной настольной версии Lumen.');
  },

  async openInstanceFolder(instanceId) {
    if (desktop) return window.launcher.openInstanceFolder(instanceId);
    return { ok: false, message: 'Открытие папки доступно в настольном приложении.' };
  },

  async removeInstance(instanceId) {
    if (desktop) return window.launcher.removeInstance(instanceId);
    throw new Error('Управление сборками доступно в настольной версии Lumen.');
  },

  async openExternal(url) {
    if (desktop) return window.launcher.openExternal(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    return { ok: true };
  },

  async windowControl(action) {
    if (desktop) return window.launcher.windowControl(action);
    return false;
  },

  onEvent(listener) {
    if (desktop) return window.launcher.onEvent(listener);
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

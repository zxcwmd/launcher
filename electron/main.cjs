const { app, BrowserWindow, dialog, ipcMain, safeStorage, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const patchUndiciRequest = require('./undici-compat.cjs');
patchUndiciRequest('@xmcl/installer');
patchUndiciRequest('@xmcl/file-transfer');
const { launch: launchClient } = require('@xmcl/core');
const { createContentService } = require('./content.cjs');
const {
  fetchJavaRuntimeManifest,
  getVersionList: getMinecraftVersionList,
  installJavaRuntimeTask,
  installTask: installMinecraftTask,
} = require('@xmcl/installer');

const ELY_AUTH = 'https://authserver.ely.by';
const ELY_API = 'https://authserver.ely.by/api/';
const AUTHLIB_META = 'https://authlib-injector.yushi.moe/artifact/latest.json';
const DEFAULT_SETTINGS = {
  memoryMin: 2,
  memoryMax: 6,
  gameDir: '',
  javaPath: '',
  width: 1280,
  height: 720,
  clientToken: '',
};

let mainWindow = null;
let settings = { ...DEFAULT_SETTINGS };
let account = null;
let activeGame = null;
let launching = false;
let cachedVersions = null;
let cachedVersionsAt = 0;
let cachedInstallVersions = null;
let contentService = null;
let activeGameInstanceId = null;

const settingsFile = () => path.join(app.getPath('userData'), 'launcher-settings.json');
const accountFile = () => path.join(app.getPath('userData'), 'account.vault');
const minecraftRoot = () => settings.gameDir || path.join(app.getPath('userData'), 'minecraft');

function emit(type, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launcher:event', { type, payload });
  }
}

function publicAccount(value = account) {
  if (!value) return null;
  return {
    username: value.profile?.name || value.user?.username || 'Игрок',
    uuid: value.profile?.id || '',
    preferredLanguage: value.user?.properties?.find((item) => item.name === 'preferredLanguage')?.value || 'ru',
  };
}

function publicSettings() {
  return {
    memoryMin: settings.memoryMin,
    memoryMax: settings.memoryMax,
    gameDir: minecraftRoot(),
    javaPath: settings.javaPath,
    width: settings.width,
    height: settings.height,
  };
}

function readSettings() {
  try {
    const stored = JSON.parse(require('node:fs').readFileSync(settingsFile(), 'utf8'));
    settings = { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  if (!settings.clientToken) settings.clientToken = crypto.randomUUID();
  if (!settings.gameDir) settings.gameDir = path.join(app.getPath('userData'), 'minecraft');
  settings.memoryMin = clampInteger(settings.memoryMin, 2, 16, 2);
  settings.memoryMax = clampInteger(settings.memoryMax, 2, 16, 6);
  if (settings.memoryMax < settings.memoryMin) settings.memoryMax = settings.memoryMin;
  writeSettings();
}

function writeSettings() {
  try {
    require('node:fs').mkdirSync(app.getPath('userData'), { recursive: true });
    require('node:fs').writeFileSync(settingsFile(), JSON.stringify(settings, null, 2), { mode: 0o600 });
  } catch (error) {
    console.error('Could not save launcher settings:', error.message);
  }
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function loadAccount() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const encrypted = require('node:fs').readFileSync(accountFile(), 'utf8');
    if (!encrypted) return null;
    return JSON.parse(safeStorage.decryptString(Buffer.from(encrypted, 'base64')));
  } catch {
    return null;
  }
}

function saveAccount() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    require('node:fs').mkdirSync(app.getPath('userData'), { recursive: true });
    const encrypted = safeStorage.encryptString(JSON.stringify(account));
    require('node:fs').writeFileSync(accountFile(), encrypted.toString('base64'), { mode: 0o600 });
    return true;
  } catch (error) {
    console.error('Could not securely save account:', error.message);
    return false;
  }
}

function clearSavedAccount() {
  try {
    require('node:fs').rmSync(accountFile(), { force: true });
  } catch {
    // Nothing to clean up.
  }
}

async function elyRequest(endpoint, body) {
  const response = await fetch(`${ELY_AUTH}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Ely.by may return an empty response for successful invalidation.
  }
  return { ok: response.ok, status: response.status, data };
}

function accountFromResponse(data, clientToken, previous = null) {
  const profile = data.selectedProfile || data.availableProfiles?.[0] || previous?.profile;
  if (!profile?.id || !profile?.name || !data.accessToken) return null;
  return {
    profile: { id: String(profile.id).replaceAll('-', ''), name: profile.name },
    user: data.user || previous?.user || { username: profile.name, properties: [] },
    accessToken: data.accessToken,
    clientToken: data.clientToken || clientToken,
  };
}

function twoFactorRequired(data) {
  const message = `${data?.error || ''} ${data?.errorMessage || ''}`.toLowerCase();
  return message.includes('two factor') || message.includes('two-factor') || message.includes('2fa');
}

function authErrorMessage(data, status) {
  if (status === 429) return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  if (status >= 500) return 'Сервис Ely.by временно недоступен. Попробуйте позже.';
  if (status === 401 || status === 403) return 'Не удалось войти. Проверьте логин, пароль и код подтверждения.';
  return data?.errorMessage || data?.error || 'Не удалось выполнить вход через Ely.by.';
}

async function loginToEly({ username, password, totp = '' }) {
  const login = String(username || '').trim();
  const secret = String(password || '');
  const code = String(totp || '').trim();
  if (!login || !secret) return { ok: false, message: 'Введите логин и пароль Ely.by.' };
  if (code && !/^\d{6,8}$/.test(code)) return { ok: false, message: 'Код подтверждения должен содержать 6–8 цифр.' };

  const clientToken = settings.clientToken || (settings.clientToken = crypto.randomUUID());
  const result = await elyRequest('/auth/authenticate', {
    username: login,
    password: code ? `${secret}:${code}` : secret,
    clientToken,
    requestUser: true,
  });

  if (!result.ok) {
    if (twoFactorRequired(result.data) && !code) {
      return { ok: false, needsTwoFactor: true, message: 'Для аккаунта включена двухфакторная защита.' };
    }
    return { ok: false, message: authErrorMessage(result.data, result.status) };
  }

  const authenticated = accountFromResponse(result.data, clientToken);
  if (!authenticated) return { ok: false, message: 'Ely.by не вернул игровой профиль для этого аккаунта.' };
  account = authenticated;
  const persisted = saveAccount();
  return {
    ok: true,
    account: publicAccount(),
    persisted,
    message: persisted
      ? 'Аккаунт подключён. Токен сохранён в защищённом хранилище системы.'
      : 'Аккаунт подключён до закрытия приложения. Системное шифрование недоступно, токен не сохранён на диск.',
  };
}

async function refreshAccount() {
  if (!account?.accessToken || !account?.clientToken) return false;
  const result = await elyRequest('/auth/refresh', {
    accessToken: account.accessToken,
    clientToken: account.clientToken,
    requestUser: true,
  });
  if (!result.ok) {
    if (result.status === 400 || result.status === 401 || result.status === 403) {
      account = null;
      clearSavedAccount();
    }
    return false;
  }
  const refreshed = accountFromResponse(result.data, account.clientToken, account);
  if (!refreshed) return false;
  account = refreshed;
  saveAccount();
  return true;
}

async function getVersions() {
  const now = Date.now();
  if (cachedVersions && now - cachedVersionsAt < 5 * 60_000) return cachedVersions;
  try {
    const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', {
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error('Version manifest request failed');
    const manifest = await response.json();
    cachedVersions = (manifest.versions || [])
      .filter((version) => version.type === 'release')
      .slice(0, 30)
      .map(({ id, type, releaseTime }) => ({ id, type, releaseTime }));
    cachedVersionsAt = now;
    return cachedVersions;
  } catch (error) {
    console.warn('Could not fetch Minecraft version manifest:', error.message);
    return [
      { id: '1.21.4', type: 'release' },
      { id: '1.21.1', type: 'release' },
      { id: '1.20.1', type: 'release' },
    ];
  }
}

function appState() {
  return {
    account: publicAccount(),
    settings: publicSettings(),
    versions: cachedVersions || [
      { id: '1.21.4', type: 'release' },
      { id: '1.21.1', type: 'release' },
      { id: '1.20.1', type: 'release' },
    ],
    gameRunning: Boolean(activeGame),
    instances: contentService ? contentService.listInstances() : [],
    isDesktop: true,
    secureStorageAvailable: safeStorage.isEncryptionAvailable(),
  };
}

function safeLog(value) {
  return String(value ?? '')
    .replace(/\b(access[_-]?token|client[_-]?token|password|authorization)\b\s*(?::|=|\s)\s*[^\s,;]+/gi, '$1=[скрыто]')
    .slice(0, 700);
}

async function downloadAuthlibInjector() {
  const directory = path.join(app.getPath('userData'), 'runtime');
  await fs.mkdir(directory, { recursive: true });
  emit('progress', { stage: 'prepare', percent: 2, detail: 'Проверяем authlib-injector для Ely.by…' });

  const metadataResponse = await fetch(AUTHLIB_META, { signal: AbortSignal.timeout(15_000) });
  if (!metadataResponse.ok) throw new Error('Не удалось получить информацию об authlib-injector.');
  const metadata = await metadataResponse.json();
  const artifactUrl = new URL(metadata.download_url);
  const allowedHosts = ['authlib-injector.yushi.moe', 'github.com', 'githubusercontent.com'];
  if (artifactUrl.protocol !== 'https:' || !allowedHosts.some((host) => artifactUrl.hostname === host || artifactUrl.hostname.endsWith(`.${host}`))) {
    throw new Error('Сервис вернул небезопасный адрес загрузки authlib-injector.');
  }
  const expectedHash = String(metadata.checksums?.sha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHash)) throw new Error('Не удалось проверить целостность authlib-injector.');

  const jarPath = path.join(directory, `authlib-injector-${String(metadata.version || 'latest').replace(/[^\w.-]/g, '_')}.jar`);
  try {
    const existing = await fs.readFile(jarPath);
    const existingHash = crypto.createHash('sha256').update(existing).digest('hex');
    if (existingHash === expectedHash) return jarPath;
  } catch {
    // The verified agent has not been installed yet.
  }

  emit('progress', { stage: 'prepare', percent: 5, detail: 'Загружаем authlib-injector…' });
  const downloadResponse = await fetch(artifactUrl, { signal: AbortSignal.timeout(45_000) });
  if (!downloadResponse.ok) throw new Error('Не удалось скачать authlib-injector. Проверьте подключение к интернету.');
  const bytes = Buffer.from(await downloadResponse.arrayBuffer());
  const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (actualHash !== expectedHash) throw new Error('Проверка SHA-256 не пройдена. Файл не будет установлен.');
  const temporary = `${jarPath}.part`;
  await fs.writeFile(temporary, bytes, { mode: 0o600 });
  await fs.rename(temporary, jarPath);
  return jarPath;
}

function validateGameVersion(versionId) {
  const version = String(versionId || '');
  if (!/^[\w.-]{1,32}$/.test(version)) throw new Error('Некорректная версия Minecraft.');
  return version;
}

function validateServerAddress(address) {
  if (!address) return '';
  const server = String(address).trim();
  if (server.length > 255 || !/^[a-zA-Z0-9._-]+(?::\d{1,5})?$/.test(server)) {
    throw new Error('Укажите корректный адрес сервера в формате host или host:port.');
  }
  const port = server.match(/:(\d{1,5})$/)?.[1];
  if (port && (Number(port) < 1 || Number(port) > 65535)) throw new Error('Порт сервера должен быть от 1 до 65535.');
  return server;
}

async function getMinecraftInstallVersions() {
  if (cachedInstallVersions) return cachedInstallVersions;
  const manifest = await getMinecraftVersionList();
  cachedInstallVersions = manifest.versions || [];
  return cachedInstallVersions;
}

function installTaskLabel(taskPath = '') {
  const value = String(taskPath).toLowerCase();
  if (value.includes('asset')) return 'Скачиваем игровые ресурсы…';
  if (value.includes('librar')) return 'Устанавливаем библиотеки…';
  if (value.includes('version.jar') || value.includes('client')) return 'Загружаем файлы Minecraft…';
  if (value.includes('version.json') || value.includes('version')) return 'Подготавливаем версию игры…';
  return 'Скачиваем игровые файлы…';
}

function runtimeTargetFor(majorVersion) {
  if (majorVersion <= 8) return 'jre-legacy';
  if (majorVersion <= 16) return 'java-runtime-alpha';
  if (majorVersion <= 17) return 'java-runtime-gamma';
  if (majorVersion <= 21) return 'java-runtime-delta';
  if (majorVersion <= 25) return 'java-runtime-epsilon';
  return null;
}

function installedJavaMajor(executable) {
  const result = spawnSync(executable, ['-version'], { encoding: 'utf8', timeout: 6_000, windowsHide: true });
  if (result.error || result.status !== 0) return null;
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  const match = output.match(/version\s+"?(?:1\.)?(\d+)/i) || output.match(/openjdk\s+(\d+)/i);
  if (!match) return null;
  return Number.parseInt(match[1], 10) || null;
}

function javaRuntimeExecutableCandidates(directory, manifest) {
  const executableNames = process.platform === 'win32' ? ['java.exe'] : ['java'];
  const candidates = [];
  for (const relativePath of Object.keys(manifest?.files || {})) {
    const normalized = relativePath.replaceAll('\\', '/');
    if (executableNames.some((name) => normalized.endsWith(`/bin/${name}`) || normalized === `bin/${name}`)) {
      const candidate = path.resolve(directory, relativePath);
      if (candidate.startsWith(`${path.resolve(directory)}${path.sep}`)) candidates.push(candidate);
    }
  }
  for (const name of executableNames) {
    candidates.push(
      path.join(directory, 'bin', name),
      path.join(directory, 'Contents', 'Home', 'bin', name),
      path.join(directory, 'jre.bundle', 'Contents', 'Home', 'bin', name),
    );
  }
  return [...new Set(candidates)];
}

async function findInstalledJava(directory, manifest) {
  for (const candidate of javaRuntimeExecutableCandidates(directory, manifest)) {
    try {
      await fs.access(candidate);
      const major = installedJavaMajor(candidate);
      if (major) return { executable: candidate, major };
    } catch {
      // Try the next platform-specific runtime path.
    }
  }
  return null;
}

async function resolveJavaExecutable(requiredMajor = 21) {
  if (settings.javaPath) {
    const configuredJavaMajor = installedJavaMajor(settings.javaPath);
    if (!configuredJavaMajor) throw new Error('Не удалось запустить Java по указанному пути. Проверьте путь в настройках.');
    if (configuredJavaMajor < requiredMajor) throw new Error(`Указана Java ${configuredJavaMajor}, но Minecraft требует Java ${requiredMajor}.`);
    return settings.javaPath;
  }
  const systemJava = installedJavaMajor('java');
  if (systemJava && systemJava >= requiredMajor) return 'java';

  const target = runtimeTargetFor(requiredMajor);
  if (!target) {
    throw new Error(`Minecraft требует Java ${requiredMajor}. Установите её и укажите путь в настройках.`);
  }

  const directory = path.join(app.getPath('userData'), 'runtimes', `java-${requiredMajor}`);
  const existingRuntime = await findInstalledJava(directory);
  if (existingRuntime?.major >= requiredMajor) return existingRuntime.executable;

  emit('progress', { stage: 'java', percent: 72, detail: `Устанавливаем Java ${requiredMajor}…` });
  const manifest = await fetchJavaRuntimeManifest({ target });
  if (!manifest?.files || Object.keys(manifest.files).length === 0) {
    throw new Error(`Не удалось найти официальный runtime Java ${requiredMajor}. Установите Java вручную и укажите путь в настройках.`);
  }
  const task = installJavaRuntimeTask({ destination: directory, manifest });
  await task.startAndWait({
    onStart: (childTask) => emit('progress', { stage: 'java', percent: 73, detail: `Устанавливаем Java ${requiredMajor}: ${childTask.name || 'подготовка файлов'}…` }),
    onUpdate: () => {
      const fraction = task.total > 0 ? Math.max(0, Math.min(1, task.progress / task.total)) : null;
      emit('progress', {
        stage: 'java',
        percent: fraction == null ? null : Math.round(73 + fraction * 17),
        detail: `Устанавливаем Java ${requiredMajor}…`,
      });
    },
    onFailed: (_childTask, error) => emit('launcher-log', { line: safeLog(error?.message || 'Java runtime installation failed') }),
  });
  const installedRuntime = await findInstalledJava(directory, manifest);
  if (!installedRuntime) {
    throw new Error(`Не удалось найти java в установленном runtime. Установите Java ${requiredMajor} вручную и укажите путь в настройках.`);
  }
  if (installedRuntime.major < requiredMajor) {
    throw new Error(`Установленная Java старее требуемой версии ${requiredMajor}.`);
  }
  return installedRuntime.executable;
}

async function installMinecraftVersion(version) {
  const versions = await getMinecraftInstallVersions();
  const metadata = versions.find((item) => item.id === version);
  if (!metadata) throw new Error(`Версия Minecraft ${version} не найдена в официальном манифесте.`);

  const task = installMinecraftTask(metadata, minecraftRoot(), { side: 'client' });
  emit('progress', { stage: 'download', percent: 7, detail: `Готовим Minecraft ${version}…` });
  const resolvedVersion = await task.startAndWait({
    onStart: (childTask) => emit('progress', { stage: 'download', percent: 8, detail: installTaskLabel(childTask.path) }),
    onUpdate: (childTask) => {
      const fraction = task.total > 0 ? Math.max(0, Math.min(1, task.progress / task.total)) : null;
      emit('progress', {
        stage: 'download',
        percent: fraction == null ? null : Math.round(8 + fraction * 62),
        detail: installTaskLabel(childTask.path),
      });
    },
    onFailed: (_childTask, error) => emit('launcher-log', { line: safeLog(error?.message || 'Minecraft installation failed') }),
  });
  return resolvedVersion;
}

async function launchMinecraft({ versionId, instanceId = '', serverAddress = '' }) {
  if (launching || activeGame) throw new Error('Minecraft уже запущен или готовится к запуску.');
  if (!account) throw new Error('Сначала войдите через Ely.by.');
  if (contentService?.isInstalling()) throw new Error('Дождитесь завершения установки модов или сборки.');
  const instance = instanceId ? contentService?.getInstance(instanceId) : null;
  if (instanceId && !instance) throw new Error('Выбранная сборка больше не найдена.');
  const version = validateGameVersion(instance?.minecraftVersion || versionId);
  const server = validateServerAddress(serverAddress);
  launching = true;
  emit('progress', { stage: 'prepare', percent: 1, detail: `Подготавливаем Minecraft ${version}…` });

  try {
    const refreshed = await refreshAccount();
    if (!refreshed || !account) throw new Error('Сессия Ely.by истекла. Войдите в аккаунт ещё раз.');
    const injectorPath = await downloadAuthlibInjector();
    await fs.mkdir(minecraftRoot(), { recursive: true });
    const baseVersion = await installMinecraftVersion(version);
    const baseJavaMajor = Number(baseVersion.javaVersion?.majorVersion || 21);
    const resolvedVersion = instance
      ? await contentService.prepareInstanceVersion(instance.id, baseJavaMajor)
      : baseVersion;
    if (resolvedVersion.minecraftVersion && resolvedVersion.minecraftVersion !== version) {
      throw new Error('Версия загрузчика сборки не совпадает с установленной версией Minecraft.');
    }
    const gamePath = instance ? contentService.getInstancePath(instance.id) : minecraftRoot();
    if (!gamePath) throw new Error('Не удалось найти папку игровой сборки.');
    await fs.mkdir(gamePath, { recursive: true });
    const javaMajor = Number(resolvedVersion.javaVersion?.majorVersion || baseJavaMajor);
    const javaPath = await resolveJavaExecutable(javaMajor);

    const serverParts = server ? server.match(/^(.+?)(?::(\d{1,5}))?$/) : null;
    const child = await launchClient({
      gamePath,
      resourcePath: minecraftRoot(),
      version: resolvedVersion,
      javaPath,
      gameProfile: { id: account.profile.id, name: account.profile.name },
      accessToken: account.accessToken,
      userType: 'mojang',
      properties: account.user?.properties || [],
      launcherName: 'Lumen',
      launcherBrand: app.getVersion(),
      minMemory: settings.memoryMin * 1024,
      maxMemory: settings.memoryMax * 1024,
      resolution: { width: settings.width, height: settings.height, fullscreen: false },
      yggdrasilAgent: { jar: injectorPath, server: ELY_API },
      ...(serverParts ? {
        quickPlayMultiplayer: server,
        server: { ip: serverParts[1], ...(serverParts[2] ? { port: Number(serverParts[2]) } : {}) },
      } : {}),
    });
    if (!child) throw new Error('Не удалось запустить игровой процесс Java.');
    activeGame = child;
    activeGameInstanceId = instance?.id || null;
    emit('progress', { stage: 'ready', percent: 100, detail: 'Игра запущена' });
    emit('game-started', { version, instanceId: instance?.id || '', instanceName: instance?.name || '', serverAddress: server });

    child.stdout?.on('data', (chunk) => emit('game-log', { line: safeLog(chunk.toString().trim()) }));
    child.stderr?.on('data', (chunk) => emit('game-log', { line: safeLog(chunk.toString().trim()) }));
    child.once('close', (code) => {
      if (activeGame === child) {
        activeGame = null;
        activeGameInstanceId = null;
      }
      emit('game-closed', { code: Number.isInteger(code) ? code : 0 });
    });
    child.once('error', (error) => {
      if (activeGame === child) {
        activeGame = null;
        activeGameInstanceId = null;
      }
      emit('game-error', { message: error.message || 'Ошибка игрового процесса.' });
    });
    return { ok: true };
  } catch (error) {
    throw error;
  } finally {
    launching = false;
  }
}

function registerIpc() {
  ipcMain.handle('launcher:get-state', async () => {
    const [versions] = await Promise.all([getVersions()]);
    cachedVersions = versions;
    return appState();
  });
  ipcMain.handle('launcher:login', async (_event, credentials) => loginToEly(credentials || {}));
  ipcMain.handle('launcher:logout', async () => {
    if (account?.accessToken && account?.clientToken) {
      try {
        await elyRequest('/auth/invalidate', {
          accessToken: account.accessToken,
          clientToken: account.clientToken,
        });
      } catch {
        // Local logout still succeeds if Ely.by is offline.
      }
    }
    account = null;
    clearSavedAccount();
    return { ok: true };
  });
  ipcMain.handle('launcher:save-settings', async (_event, nextSettings) => {
    const incoming = nextSettings || {};
    const memoryMin = clampInteger(incoming.memoryMin, 2, 16, settings.memoryMin);
    const memoryMax = clampInteger(incoming.memoryMax, 2, 16, settings.memoryMax);
    settings.memoryMin = Math.min(memoryMin, memoryMax);
    settings.memoryMax = Math.max(memoryMin, memoryMax);
    settings.width = clampInteger(incoming.width, 854, 3840, settings.width);
    settings.height = clampInteger(incoming.height, 480, 2160, settings.height);
    if (typeof incoming.javaPath === 'string') settings.javaPath = incoming.javaPath.trim().slice(0, 512);
    if (typeof incoming.gameDir === 'string' && incoming.gameDir.trim()) {
      settings.gameDir = path.resolve(incoming.gameDir.trim());
    }
    writeSettings();
    return { ok: true, settings: publicSettings() };
  });
  ipcMain.handle('launcher:choose-game-dir', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Папка Minecraft',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: minecraftRoot(),
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true, path: minecraftRoot() };
    settings.gameDir = result.filePaths[0];
    writeSettings();
    return { canceled: false, path: settings.gameDir };
  });
  ipcMain.handle('launcher:launch', (_event, options) => launchMinecraft(options || {}));
  ipcMain.handle('launcher:search-content', (_event, options) => contentService.searchContent(options || {}));
  ipcMain.handle('launcher:create-instance', (_event, options) => {
    if (activeGame || launching) throw new Error('Закройте Minecraft перед созданием сборки.');
    return contentService.createInstance(options || {});
  });
  ipcMain.handle('launcher:install-mod', (_event, options) => {
    if (activeGame || launching) throw new Error('Закройте Minecraft перед установкой модов.');
    return contentService.installMod(options || {});
  });
  ipcMain.handle('launcher:install-modpack', (_event, options) => {
    if (activeGame || launching) throw new Error('Закройте Minecraft перед установкой сборки.');
    return contentService.installModpack(options || {});
  });
  ipcMain.handle('launcher:open-instance-folder', async (_event, instanceId) => {
    const folder = await contentService.openFolder(instanceId);
    const error = await shell.openPath(folder);
    return error ? { ok: false, message: error } : { ok: true, path: folder };
  });
  ipcMain.handle('launcher:remove-instance', (_event, instanceId) => {
    if (activeGameInstanceId && activeGameInstanceId === String(instanceId || '').toLowerCase()) {
      throw new Error('Нельзя удалить сборку, пока в ней запущена игра.');
    }
    return contentService.removeInstance(instanceId);
  });
  ipcMain.handle('launcher:open-external', async (_event, url) => {
    try {
      const parsed = new URL(String(url));
      if (!['https:', 'http:'].includes(parsed.protocol)) return { ok: false };
      await shell.openExternal(parsed.toString());
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
  ipcMain.handle('launcher:window-control', (_event, action) => {
    if (!mainWindow) return false;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') {
      if (mainWindow.isMaximized()) mainWindow.unmaximize();
      else mainWindow.maximize();
    }
    if (action === 'close') mainWindow.close();
    return true;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#100f16',
    title: 'Lumen — Minecraft Launcher',
    frame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).protocol === 'https:') shell.openExternal(url);
    } catch {
      // Ignore invalid links.
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const localOrigin = mainWindow?.webContents.getURL();
    if (localOrigin && new URL(url).origin !== new URL(localOrigin).origin) event.preventDefault();
  });

  if (!app.isPackaged) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  readSettings();
  account = loadAccount();
  contentService = createContentService({
    getRoot: minecraftRoot,
    getUserData: () => app.getPath('userData'),
    ensureMinecraft: installMinecraftVersion,
    resolveJava: resolveJavaExecutable,
    emit,
  });
  await contentService.load();
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (activeGame && !activeGame.killed) {
    // Minecraft can continue running independently after the launcher closes.
    activeGame.unref?.();
  }
});

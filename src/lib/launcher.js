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

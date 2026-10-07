import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Archive,
  Boxes,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CloudDownload,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  Gamepad2,
  Github,
  Gauge,
  Globe2,
  HardDrive,
  Home,
  Info,
  Library,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Maximize2,
  Minus,
  Monitor,
  Newspaper,
  Package,
  PackageCheck,
  Play,
  RefreshCw,
  Plus,
  Rocket,
  Search,
  SlidersHorizontal,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Terminal,
  Trash2,
  UserRound,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { launcherApi } from './lib/launcher.js';

const navItems = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'library', label: 'Версии', icon: Library },
  { id: 'instances', label: 'Сборки', icon: Boxes },
  { id: 'mods', label: 'Моды', icon: Package },
  { id: 'servers', label: 'Серверы', icon: Globe2 },
  { id: 'news', label: 'Новости', icon: Newspaper },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

const initialSettings = {
  memoryMin: 2,
  memoryMax: 6,
  gameDir: 'minecraft',
  javaPath: '',
  width: 1280,
  height: 720,
};

function getSavedServers() {
  try {
    const parsed = JSON.parse(localStorage.getItem('lumen-saved-servers') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getActiveInstanceId() {
  try {
    return localStorage.getItem('lumen-active-instance') || '';
  } catch {
    return '';
  }
}

function formatReleaseDate(value) {
  if (!value) return 'Официальный релиз';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Официальный релиз';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function formatCompactNumber(value) {
  const number = Number(value) || 0;
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(number);
}

function PixelMark({ small = false }) {
  return (
    <span className={`pixel-mark${small ? ' pixel-mark-small' : ''}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  );
}

function PixelAvatar({ account, size = 'normal' }) {
  const initials = account?.username?.slice(0, 1)?.toUpperCase() || 'L';
  return (
    <span className={`pixel-avatar pixel-avatar-${size}`} aria-label={account ? `Профиль ${account.username}` : 'Профиль'}>
      <span className="avatar-sheen" />
      <span className="avatar-face">{initials}</span>
      <span className="avatar-pixel avatar-pixel-one" />
      <span className="avatar-pixel avatar-pixel-two" />
    </span>
  );
}

function SceneArtwork() {
  return (
    <svg className="scene-art" viewBox="0 0 1000 440" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ночной блочный мир Minecraft">
      <defs>
        <linearGradient id="scene-sky" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#6054b7" />
          <stop offset="0.48" stopColor="#302b64" />
          <stop offset="1" stopColor="#151a32" />
        </linearGradient>
        <linearGradient id="scene-glow" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#201d38" stopOpacity="0" />
          <stop offset="0.55" stopColor="#171c36" stopOpacity="0.16" />
          <stop offset="1" stopColor="#11131e" stopOpacity="0.42" />
        </linearGradient>
        <linearGradient id="scene-water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5f6fb1" stopOpacity="0.66" />
          <stop offset="1" stopColor="#242e54" stopOpacity="0" />
        </linearGradient>
        <pattern id="scene-stars" width="136" height="106" patternUnits="userSpaceOnUse">
          <circle cx="9" cy="14" r="1.2" fill="#fff" opacity=".8" />
          <circle cx="78" cy="31" r="1" fill="#fff" opacity=".72" />
          <circle cx="118" cy="81" r="1.4" fill="#c8d8ff" opacity=".8" />
          <circle cx="36" cy="91" r=".8" fill="#fff" opacity=".68" />
        </pattern>
      </defs>
      <rect width="1000" height="440" fill="url(#scene-sky)" />
      <rect width="1000" height="310" fill="url(#scene-stars)" opacity=".66" />
      <circle cx="770" cy="82" r="42" fill="#f2e4ff" opacity=".9" />
      <circle cx="786" cy="69" r="43" fill="#625bac" opacity=".87" />
      <g opacity=".4" fill="#b4afe8">
        <rect x="772" y="52" width="13" height="7" /><rect x="790" y="73" width="8" height="8" />
        <rect x="760" y="88" width="9" height="6" /><rect x="783" y="101" width="12" height="7" />
      </g>
      <path d="M0 255 122 163l62 54 115-101 85 71 100-78 124 111 70-56 112 87 78-60 132 81v168H0Z" fill="#413f77" opacity=".72" />
      <path d="m0 298 112-73 68 42 128-109 76 72 118-55 105 81 96-64 101 91 99-44 97 48v153H0Z" fill="#293257" />
      <path d="m0 324 93-55 77 38 108-44 73 47 80-28 92 53 101-43 84 44 114-48 86 39 92-27v140H0Z" fill="#242b4a" />
      <g opacity=".8">
        <path d="m116 260 64 7v51h-64Z" fill="#647451" /><path d="m113 249 68 5v14h-68Z" fill="#819369" />
        <path d="m287 177 76 4v58h-76Z" fill="#697952" /><path d="m280 165 89 5v15h-89Z" fill="#91a06b" />
        <path d="m478 201 83 8v58h-83Z" fill="#616f4c" /><path d="m472 190 92 5v15h-92Z" fill="#8d9a67" />
        <path d="m718 231 81 5v60h-81Z" fill="#596b49" /><path d="m711 220 94 5v14h-94Z" fill="#8a9a64" />
      </g>
      <g className="scene-tower">
        <rect x="617" y="160" width="108" height="139" fill="#332d51" />
        <rect x="632" y="133" width="78" height="30" fill="#655886" />
        <rect x="642" y="112" width="10" height="24" fill="#82749c" />
        <rect x="691" y="112" width="10" height="24" fill="#82749c" />
        <rect x="653" y="183" width="14" height="20" fill="#f1bf83" />
        <rect x="683" y="183" width="14" height="20" fill="#f1bf83" />
        <rect x="658" y="232" width="25" height="67" fill="#211f36" />
        <rect x="632" y="218" width="12" height="48" fill="#b98d70" opacity=".35" />
      </g>
      <g className="scene-pine" fill="#1d263d">
        <path d="M80 321h22v-43h17v-26h17v26h17v43h18v81H80Z" />
        <path d="M807 306h20v-48h17v-23h16v23h17v48h20v89H807Z" />
        <path d="M923 332h17v-39h13v-21h16v21h13v39h18v66H923Z" />
      </g>
      <path d="M0 342h1000v98H0Z" fill="url(#scene-water)" />
      <g opacity=".25" fill="#bbc7f8">
        <rect x="90" y="361" width="90" height="2" /><rect x="215" y="387" width="52" height="2" />
        <rect x="375" y="369" width="110" height="2" /><rect x="530" y="400" width="68" height="2" />
        <rect x="748" y="374" width="116" height="2" /><rect x="884" y="408" width="42" height="2" />
      </g>
      <rect width="1000" height="440" fill="url(#scene-glow)" />
    </svg>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const Icon = toast.tone === 'error' ? Info : CheckCircle2;
  return (
    <div className={`toast toast-${toast.tone || 'success'}`} role="status">
      <span className="toast-icon"><Icon size={17} /></span>
      <span className="toast-copy">{toast.message}</span>
      <button className="icon-button toast-close" onClick={onClose} aria-label="Закрыть уведомление"><X size={15} /></button>
    </div>
  );
}

function App() {
  const [view, setView] = useState('home');
  const [appState, setAppState] = useState({
    account: null,
    settings: initialSettings,
    versions: [],
    instances: [],
    gameRunning: false,
    isDesktop: launcherApi.isDesktop,
  });
  const [selectedVersion, setSelectedVersion] = useState('1.21.4');
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState(initialSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [gameStatus, setGameStatus] = useState('idle');
  const [launchProgress, setLaunchProgress] = useState({ percent: 0, detail: 'Подготовка…' });
  const [gameLogs, setGameLogs] = useState([]);
  const [savedServers, setSavedServers] = useState(getSavedServers);
  const [serverFormOpen, setServerFormOpen] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverAddress, setServerAddress] = useState('');
  const [serverError, setServerError] = useState('');
  const [serverSearch, setServerSearch] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [releaseFilter, setReleaseFilter] = useState('all');
  const [newsSearch, setNewsSearch] = useState('');
  const [selectedLoader, setSelectedLoader] = useState('fabric');
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);
  const [createInstanceBusy, setCreateInstanceBusy] = useState(false);
  const [newInstance, setNewInstance] = useState({ name: '', minecraftVersion: '1.21.4', loader: 'fabric' });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [catalogProvider, setCatalogProvider] = useState('modrinth');
  const [catalogType, setCatalogType] = useState('mod');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [debouncedCatalogQuery, setDebouncedCatalogQuery] = useState('');
  const [catalogLoader, setCatalogLoader] = useState('fabric');
  const [catalogResults, setCatalogResults] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [installingContentId, setInstallingContentId] = useState('');
  const [contentProgress, setContentProgress] = useState(null);
  const [activeInstanceId, setActiveInstanceId] = useState(getActiveInstanceId);
  const [instanceActionId, setInstanceActionId] = useState('');
  const [appLoaded, setAppLoaded] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState('');
  const catalogRequestId = useRef(0);
  const toastTimer = useRef(null);
  const memorySaveTimer = useRef(null);

  const account = appState.account;
  const versions = appState.versions?.length ? appState.versions : [
    { id: '1.21.4', type: 'release' },
    { id: '1.21.1', type: 'release' },
    { id: '1.20.1', type: 'release' },
  ];
  const currentVersion = versions.find((version) => version.id === selectedVersion) || { id: selectedVersion, type: 'release' };
  const instances = appState.instances || [];
  const activeInstance = instances.find((instance) => instance.id === activeInstanceId) || null;
  const launcherLoaderLabel = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }[activeInstance?.loader || selectedLoader] || 'Fabric';

  useEffect(() => {
    let mounted = true;
    launcherApi.getState().then((nextState) => {
      if (!mounted) return;
      setAppState((current) => ({ ...current, ...nextState }));
      setAppLoaded(true);
      if (nextState.settings) setSettingsDraft(nextState.settings);
      if (nextState.versions?.length) {
        setSelectedVersion((current) => nextState.versions.some((version) => version.id === current) ? current : nextState.versions[0].id);
      }
      if (nextState.gameRunning) setGameStatus('running');
    }).catch(() => {
      if (mounted) showToast('Не удалось загрузить состояние лаунчера.', 'error');
    });
    return () => { mounted = false; };
    // Load the local desktop state once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => launcherApi.onEvent((event) => {
    const { type, payload = {} } = event || {};
    if (type === 'progress') {
      setLaunchProgress({ percent: payload.percent ?? null, detail: payload.detail || 'Подготовка…' });
    }
    if (type === 'game-started') {
      setGameStatus('running');
      setAppState((state) => ({ ...state, gameRunning: true }));
      showToast(`${payload.instanceName || `Minecraft ${payload.version || selectedVersion}`} запущен. Удачной игры!`);
    }
    if (type === 'game-closed') {
      setGameStatus('idle');
      setAppState((state) => ({ ...state, gameRunning: false }));
      setLaunchProgress({ percent: 0, detail: 'Подготовка…' });
      showToast(payload.code === 0 ? 'Игровая сессия завершена.' : `Minecraft завершил работу с кодом ${payload.code}.`, payload.code === 0 ? 'success' : 'error');
    }
    if (type === 'game-error') {
      setGameStatus('idle');
      setAppState((state) => ({ ...state, gameRunning: false }));
      setLaunchProgress({ percent: 0, detail: 'Подготовка…' });
      showToast(payload.message || 'Не удалось запустить Minecraft.', 'error');
    }
    if (type === 'account-changed') {
      setAppState((state) => ({ ...state, account: payload.account || null }));
    }
    if (type === 'content-progress') {
      const progressState = { percent: payload.percent ?? null, detail: payload.detail || 'Подготовка установки…' };
      setContentProgress(progressState);
      setLaunchProgress(progressState);
    }
    if (type === 'instances-changed') {
      setAppState((state) => ({ ...state, instances: payload.instances || [] }));
    }
    if (type === 'game-log' || type === 'launcher-log') {
      if (payload.line) setGameLogs((lines) => [...lines.slice(-99), payload.line]);
    }
  }), [selectedVersion]);

  useEffect(() => {
    localStorage.setItem('lumen-saved-servers', JSON.stringify(savedServers));
  }, [savedServers]);

  useEffect(() => {
    if (!appLoaded || !activeInstanceId) return;
    const hasActive = instances.some((instance) => instance.id === activeInstanceId);
    if (hasActive) return;
    const nextId = instances[0]?.id || '';
    setActiveInstanceId(nextId);
    try {
      if (nextId) localStorage.setItem('lumen-active-instance', nextId);
      else localStorage.removeItem('lumen-active-instance');
    } catch {
      // The selected build is also kept in memory for this session.
    }
  }, [appLoaded, instances, activeInstanceId]);

  useEffect(() => {
    if (appLoaded && activeInstance) setSelectedLoader(activeInstance.loader || 'vanilla');
  }, [appLoaded, activeInstanceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedCatalogQuery(catalogQuery.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [catalogQuery]);

  useEffect(() => {
    if (view !== 'mods') return undefined;
    const requestId = ++catalogRequestId.current;
    setCatalogLoading(true);
    setCatalogError('');
    setCatalogResults([]);
    launcherApi.searchContent({
      provider: catalogProvider,
      projectType: catalogProvider === 'github' ? 'modpack' : catalogType,
      query: debouncedCatalogQuery,
      gameVersion: selectedVersion,
      loader: catalogLoader,
    }).then((result) => {
      if (requestId !== catalogRequestId.current) return;
      setCatalogResults(result?.results || []);
    }).catch((error) => {
      if (requestId !== catalogRequestId.current) return;
      setCatalogResults([]);
      setCatalogError(error?.message || 'Не удалось загрузить каталог.');
    }).finally(() => {
      if (requestId === catalogRequestId.current) setCatalogLoading(false);
    });
    return () => { catalogRequestId.current += 1; };
  }, [view, catalogProvider, catalogType, debouncedCatalogQuery, selectedVersion, catalogLoader, catalogRefresh]);

  useEffect(() => () => {
    window.clearTimeout(toastTimer.current);
    window.clearTimeout(memorySaveTimer.current);
  }, []);

  useEffect(() => {
    function handleKeyboardShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        setAccountMenuOpen(false);
      }
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setSearchValue('');
        setCreateInstanceOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyboardShortcut);
    return () => window.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  function showToast(message, tone = 'success') {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  function chooseActiveInstance(instanceId, instanceOverride = null) {
    const nextId = instanceId || '';
    const selectedInstance = instanceOverride || instances.find((instance) => instance.id === nextId);
    setActiveInstanceId(nextId);
    if (selectedInstance) {
      setSelectedVersion(selectedInstance.minecraftVersion);
      setSelectedLoader(selectedInstance.loader || 'vanilla');
      if (['fabric', 'forge', 'neoforge', 'quilt'].includes(selectedInstance.loader)) setCatalogLoader(selectedInstance.loader);
    }
    try {
      if (nextId) localStorage.setItem('lumen-active-instance', nextId);
      else localStorage.removeItem('lumen-active-instance');
    } catch {
      // The build selection remains active for this session.
    }
  }

  function openAuth() {
    setAccountMenuOpen(false);
    setAuthOpen(true);
  }

  function openSettings() {
    setSettingsDraft(appState.settings || initialSettings);
    setSettingsOpen(true);
  }

  function selectHomeLoader(loader) {
    setSelectedLoader(loader);
    if (['fabric', 'forge', 'neoforge', 'quilt'].includes(loader)) setCatalogLoader(loader);
    const matchingInstance = instances.find((instance) => instance.minecraftVersion === selectedVersion && (instance.loader || 'vanilla') === loader);
    if (matchingInstance) chooseActiveInstance(matchingInstance.id, matchingInstance);
    else if (activeInstanceId) chooseActiveInstance('');
  }

  function openCreateInstance() {
    const loader = selectedLoader === 'vanilla' ? 'fabric' : selectedLoader;
    const loaderLabel = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }[loader] || 'Fabric';
    setNewInstance({ name: `${loaderLabel} ${selectedVersion}`, minecraftVersion: selectedVersion, loader });
    setCreateInstanceOpen(true);
  }

  async function createInstanceFromForm(event) {
    event.preventDefault();
    if (createInstanceBusy) return;
    setCreateInstanceBusy(true);
    setContentProgress({ percent: 1, detail: `Подготавливаем Minecraft ${newInstance.minecraftVersion}…` });
    try {
      const result = await launcherApi.createInstance({
        name: newInstance.name.trim(),
        minecraftVersion: newInstance.minecraftVersion,
        loader: newInstance.loader,
      });
      if (!result?.ok || !result.instance) throw new Error(result?.message || 'Не удалось создать сборку.');
      setAppState((state) => ({ ...state, instances: result.instances || [...state.instances, result.instance] }));
      chooseActiveInstance(result.instance.id, result.instance);
      setCreateInstanceOpen(false);
      showToast(`Сборка «${result.instance.name}» создана.`);
    } catch (error) {
      showToast(error?.message || 'Не удалось создать сборку.', 'error');
    } finally {
      setCreateInstanceBusy(false);
      setContentProgress(null);
    }
  }

  function updateQuickMemory(value) {
    const memoryMax = Number(value);
    setSettingsDraft((settings) => ({ ...settings, memoryMax }));
    window.clearTimeout(memorySaveTimer.current);
    memorySaveTimer.current = window.setTimeout(async () => {
      try {
        const result = await launcherApi.saveSettings({ ...appState.settings, ...settingsDraft, memoryMax });
        if (result?.ok) setAppState((state) => ({ ...state, settings: result.settings || { ...state.settings, memoryMax } }));
      } catch {
        showToast('Не удалось сохранить выделение памяти.', 'error');
      }
    }, 450);
  }

  async function handleLogout() {
    setAccountMenuOpen(false);
    await launcherApi.logout();
    setAppState((state) => ({ ...state, account: null }));
    showToast('Вы вышли из аккаунта Ely.by.');
  }

  async function handleLaunch(server = '', instanceId = activeInstance?.id || activeInstanceId) {
    if (!account) {
      openAuth();
      return;
    }
    if (!launcherApi.isDesktop) {
      showToast('Запуск игры доступен в установленной настольной версии Lumen.', 'error');
      return;
    }
    if (gameStatus === 'running') {
      showToast('Minecraft уже запущен. Переключитесь в окно игры.', 'error');
      return;
    }
    let requestedInstance = instances.find((entry) => entry.id === instanceId);
    if (requestedInstance) chooseActiveInstance(requestedInstance.id, requestedInstance);
    setBusy(true);
    setGameStatus('preparing');
    setGameLogs([]);
    setLaunchProgress({ percent: 1, detail: 'Проверяем аккаунт Ely.by…' });
    try {
      let instance = requestedInstance;
      if (!instance && selectedLoader !== 'vanilla') {
        instance = instances.find((entry) => entry.minecraftVersion === selectedVersion && (entry.loader || 'vanilla') === selectedLoader) || null;
        if (!instance) {
          const loaderLabel = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' }[selectedLoader] || selectedLoader;
          setLaunchProgress({ percent: 2, detail: `Устанавливаем ${loaderLabel} для Minecraft ${selectedVersion}…` });
          const created = await launcherApi.createInstance({
            name: `${loaderLabel} ${selectedVersion}`,
            minecraftVersion: selectedVersion,
            loader: selectedLoader,
          });
          if (!created?.ok || !created.instance) throw new Error(created?.message || `Не удалось подготовить ${loaderLabel}.`);
          instance = created.instance;
          setAppState((state) => ({ ...state, instances: created.instances || [...state.instances, instance] }));
          chooseActiveInstance(instance.id, instance);
        } else {
          chooseActiveInstance(instance.id, instance);
        }
      }
      await launcherApi.launch({
        versionId: instance?.minecraftVersion || selectedVersion,
        instanceId: instance?.id || '',
        serverAddress: server || '',
      });
    } catch (error) {
      setGameStatus('idle');
      setLaunchProgress({ percent: 0, detail: 'Подготовка…' });
      showToast(error?.message || 'Не удалось запустить Minecraft.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function installCatalogItem(item) {
    if (!item || installingContentId) return;
    setInstallingContentId(item.id);
    setContentProgress({ percent: 1, detail: `Подготавливаем ${item.title || 'проект'}…` });
    try {
      const result = item.projectType === 'mod'
        ? await launcherApi.installMod({
          source: item.source,
          projectId: item.projectId,
          title: item.title,
          iconUrl: item.iconUrl,
          gameVersion: selectedVersion,
          loader: catalogLoader,
          instanceId: activeInstance?.id || activeInstanceId,
        })
        : await launcherApi.installModpack({
          source: item.source,
          projectId: item.projectId,
          assetId: item.assetId,
          title: item.title,
          iconUrl: item.iconUrl,
          gameVersion: selectedVersion,
        });
      setAppState((state) => ({ ...state, instances: result.instances || state.instances }));
      if (result.instance?.id) chooseActiveInstance(result.instance.id, result.instance);
      setContentProgress({ percent: 100, detail: 'Готово — сборка добавлена в библиотеку.' });
      showToast(item.projectType === 'mod'
        ? `${item.title} установлен в отдельную сборку.`
        : `${result.instance?.name || item.title} установлена и готова к запуску.`);
    } catch (error) {
      setContentProgress(null);
      showToast(error?.message || 'Не удалось установить этот проект.', 'error');
    } finally {
      setInstallingContentId('');
      window.setTimeout(() => setContentProgress(null), 1800);
    }
  }

  async function openInstanceFolder(instanceId) {
    try {
      const result = await launcherApi.openInstanceFolder(instanceId);
      if (!result.ok) throw new Error(result.message || 'Не удалось открыть папку сборки.');
    } catch (error) {
      showToast(error?.message || 'Не удалось открыть папку сборки.', 'error');
    }
  }

  async function removeInstance(instance) {
    if (!instance || !window.confirm(`Удалить «${instance.name}» вместе с её файлами? Общие файлы Minecraft останутся на месте.`)) return;
    setInstanceActionId(instance.id);
    try {
      const result = await launcherApi.removeInstance(instance.id);
      setAppState((state) => ({ ...state, instances: result.instances || [] }));
      if (activeInstanceId === instance.id) chooseActiveInstance(result.instances?.[0]?.id || '');
      showToast(`Сборка «${instance.name}» удалена.`);
    } catch (error) {
      showToast(error?.message || 'Не удалось удалить сборку.', 'error');
    } finally {
      setInstanceActionId('');
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true);
    try {
      const result = await launcherApi.saveSettings(settingsDraft);
      if (!result.ok) throw new Error('Не удалось сохранить настройки.');
      setAppState((state) => ({ ...state, settings: result.settings || settingsDraft }));
      setSettingsDraft(result.settings || settingsDraft);
      setSettingsOpen(false);
      showToast('Настройки сохранены.');
    } catch (error) {
      showToast(error?.message || 'Не удалось сохранить настройки.', 'error');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleChooseFolder() {
    const result = await launcherApi.chooseGameDir();
    if (result.canceled) {
      if (!launcherApi.isDesktop) showToast('Выбор папки доступен в установленной настольной версии.', 'error');
      return;
    }
    setSettingsDraft((settings) => ({ ...settings, gameDir: result.path }));
  }

  function addServer(event) {
    event.preventDefault();
    setServerError('');
    const address = serverAddress.trim();
    const name = serverName.trim() || address;
    if (!address || !/^[a-zA-Z0-9._-]+(?::\d{1,5})?$/.test(address)) {
      setServerError('Введите адрес в формате play.example.net или play.example.net:25565.');
      return;
    }
    const port = address.match(/:(\d{1,5})$/)?.[1];
    if (port && (Number(port) < 1 || Number(port) > 65535)) {
      setServerError('Порт должен быть от 1 до 65535.');
      return;
    }
    if (savedServers.some((server) => server.address.toLowerCase() === address.toLowerCase())) {
      setServerError('Этот сервер уже добавлен.');
      return;
    }
    const next = [{ id: crypto.randomUUID(), name, address }, ...savedServers];
    setSavedServers(next);
    setServerAddress('');
    setServerName('');
    setServerFormOpen(false);
    showToast('Сервер добавлен в избранное.');
  }

  function removeServer(id) {
    setSavedServers((servers) => servers.filter((server) => server.id !== id));
    showToast('Сервер удалён из избранного.');
  }

  async function copyAddress(address) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      showToast('Адрес сервера скопирован.');
      window.setTimeout(() => setCopiedAddress(''), 1600);
    } catch {
      showToast('Не удалось скопировать адрес.', 'error');
    }
  }

  function selectPage(id) {
    setView(id);
    setAccountMenuOpen(false);
    setNotificationOpen(false);
    setSearchOpen(false);
    setSearchValue('');
  }

  function getPageTitle() {
    return navItems.find((item) => item.id === view)?.label || 'Настройки';
  }

  function renderHome() {
    const quickVersions = [currentVersion, ...versions.filter((version) => version.id !== selectedVersion)].slice(0, 4);
    const loaders = [
      { id: 'vanilla', label: 'Vanilla' },
      { id: 'fabric', label: 'Fabric' },
      { id: 'forge', label: 'Forge' },
      { id: 'neoforge', label: 'NeoForge' },
      { id: 'quilt', label: 'Quilt' },
    ];
    const stats = [
      { label: 'ИГРОВОЙ ПРОФИЛЬ', value: account?.username || 'Не подключён', detail: account ? 'Аккаунт Ely.by' : 'Войди через Ely.by', icon: UserRound, tint: 'violet' },
      { label: 'ВЫБРАННАЯ ВЕРСИЯ', value: currentVersion.id, detail: activeInstance?.name || `${loaders.find((loader) => loader.id === selectedLoader)?.label || 'Vanilla'} · Minecraft`, icon: Gamepad2, tint: 'blue' },
      { label: 'МОИ СБОРКИ', value: String(instances.length), detail: instances.length === 1 ? 'игровой профиль' : 'игровых профилей', icon: Boxes, tint: 'pink' },
      { label: 'СЕРВЕРЫ', value: String(savedServers.length), detail: 'в избранном', icon: Server, tint: 'gold' },
    ];
    const memoryMax = Number(settingsDraft.memoryMax) || 6;

    return (
      <div className="page reference-page reference-home">
        <div className="ref-welcome-line">
          <div><span className="ref-kicker"><span className="ref-kicker-star">✦</span> LUMEN LAUNCHER</span><h1>{account ? `С возвращением, ${account.username}` : 'Твой мир начинается здесь'}</h1></div>
          <div className="ref-online-pill"><span /> {launcherApi.isDesktop ? 'ЛАУНЧЕР ГОТОВ' : 'ПРЕДПРОСМОТР'}</div>
        </div>

        <div className="home-hero-grid">
          <section className="home-config-card">
            <div className="home-config-copy">
              <span className="home-config-eyebrow"><span className="mini-orbit">✦</span> ТВОЯ СЛЕДУЮЩАЯ ИСТОРИЯ</span>
              <h2>Выбери мир.<br /><em>Начни играть.</em></h2>
              <p>Настрой версию и загрузчик — всё остальное Lumen подготовит за тебя.</p>
            </div>
            <div className="home-config-controls">
              <div className="home-control-heading"><span>ВЕРСИЯ MINECRAFT</span><button className="inline-control-link" onClick={() => selectPage('library')}>Все версии <ArrowRight size={13} /></button></div>
              <div className="home-chip-row home-version-row">
                {quickVersions.map((version) => <button key={version.id} className={`home-choice-chip${version.id === selectedVersion ? ' is-selected' : ''}`} onClick={() => { setSelectedVersion(version.id); chooseActiveInstance(''); }} aria-pressed={version.id === selectedVersion}><span className="choice-dot" />{version.id}{version.id === selectedVersion && <Check size={13} />}</button>)}
              </div>
              <div className="home-control-heading loader-heading"><span>ЗАГРУЗЧИК</span><span className="home-control-hint">Можно сменить позже</span></div>
              <div className="home-chip-row home-loader-row">
                {loaders.map((loader) => <button key={loader.id} className={`home-loader-chip${loader.id === selectedLoader ? ' is-selected' : ''}`} onClick={() => selectHomeLoader(loader.id)} aria-pressed={loader.id === selectedLoader}>{loader.label}</button>)}
              </div>
              <div className="home-memory-control">
                <div className="memory-heading"><span><Cpu size={14} /> ВЫДЕЛЕНО ПАМЯТИ</span><strong>{memoryMax} <small>ГБ</small></strong></div>
                <input type="range" min="2" max="16" step="1" value={Math.min(16, Math.max(2, memoryMax))} onChange={(event) => updateQuickMemory(event.target.value)} aria-label="Объём выделенной памяти" />
                <div className="memory-scale"><span>2 ГБ</span><span>16 ГБ</span></div>
              </div>
            </div>
          </section>

          <section className="player-card">
            <div className="player-scene" aria-hidden="true">
              <span className="player-scene-stars stars-one">✦　·　✧</span><span className="player-scene-stars stars-two">·　✦　·</span>
              <span className="player-moon" /><span className="player-scene-hill hill-back" /><span className="player-scene-hill hill-front" />
              <div className="pixel-player"><i className="pixel-head" /><i className="pixel-hair" /><i className="pixel-body" /><i className="pixel-arm pixel-arm-left" /><i className="pixel-arm pixel-arm-right" /><i className="pixel-leg pixel-leg-left" /><i className="pixel-leg pixel-leg-right" /></div>
              <span className="player-scene-ground" />
            </div>
            <div className="player-card-content">
              <span className="player-card-tag"><span /> PLAYER PROFILE</span>
              <div className="player-card-name">{account?.username || 'Steve'}</div>
              <p>{account ? 'Твой профиль Ely.by подключён.' : 'Подключи Ely.by, чтобы играть со своим профилем.'}</p>
              <button className="player-profile-button" onClick={account ? () => setAccountMenuOpen((open) => !open) : openAuth}>{account ? <><PixelAvatar account={account} size="small" /> Аккаунт Ely.by <CheckCircle2 size={14} /></> : <><span className="player-ely-mark">e</span> Войти через Ely.by <ArrowRight size={14} /></>}</button>
            </div>
            <span className="player-card-coordinate">THE OVERWORLD <i /> 0, 64, 0</span>
          </section>
        </div>

        <div className="home-stats-grid">
          {stats.map((item) => { const Icon = item.icon; return <article className="home-stat-card" key={item.label}><span className={`home-stat-icon stat-${item.tint}`}><Icon size={16} /></span><div className="home-stat-copy"><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div><span className="stat-card-spark">✧</span></article>; })}
        </div>

        <section className="home-news-section">
          <div className="ref-section-heading"><div><span className="ref-kicker">МИР MINECRAFT</span><h2>Новости и события</h2></div><button className="ref-text-link" onClick={() => selectPage('news')}>Все новости <ArrowRight size={14} /></button></div>
          <article className="home-news-card">
            <div className="home-news-art"><span className="news-art-moon" /><span className="news-art-mountain news-mountain-back" /><span className="news-art-mountain news-mountain-front" /><span className="news-art-star">✦</span><span className="news-art-cube" /></div>
            <div className="home-news-copy"><span className="news-label"><Sparkles size={12} /> ОФИЦИАЛЬНЫЙ РЕЛИЗ</span><h3>Minecraft {versions[0]?.id || currentVersion.id}</h3><p>Выбери версию в библиотеке, чтобы открыть новый мир. Lumen скачает необходимые игровые файлы при запуске.</p><button onClick={() => selectPage('library')}>Открыть версии <ArrowRight size={14} /></button></div>
            <div className="home-news-date"><span>ПОСЛЕДНЯЯ ВЕРСИЯ</span><strong>{formatReleaseDate(versions[0]?.releaseTime)}</strong></div>
          </article>
        </section>
      </div>
    );
  }

  function renderLibrary() {
    const filtered = versions.filter((version) => {
      const matchesQuery = version.id.toLowerCase().includes(librarySearch.trim().toLowerCase());
      const matchesType = releaseFilter === 'all' || version.type === releaseFilter;
      return matchesQuery && matchesType;
    });
    const filters = [
      { id: 'all', label: 'Все версии' },
      { id: 'release', label: 'Релизы' },
      { id: 'snapshot', label: 'Снимки' },
    ];
    return (
      <div className="page reference-page reference-subpage">
        <div className="ref-page-heading"><div><span className="ref-kicker"><Library size={13} /> БИБЛИОТЕКА MINECRAFT</span><h1>Версии игры</h1><p>Выбери официальный релиз или протестируй свежий снимок.</p></div><div className="ref-page-heading-side"><span className="ref-count-pill"><span /> {filtered.length} версий</span></div></div>
        <div className="ref-library-toolbar">
          <div className="ref-filter-tabs" role="tablist" aria-label="Тип версии">{filters.map((filter) => <button key={filter.id} role="tab" aria-selected={releaseFilter === filter.id} className={releaseFilter === filter.id ? 'active' : ''} onClick={() => setReleaseFilter(filter.id)}>{filter.label}</button>)}</div>
          <label className="ref-search-field"><Search size={16} /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Найти версию…" aria-label="Найти версию" />{librarySearch && <button onClick={() => setLibrarySearch('')} aria-label="Очистить поиск"><X size={14} /></button>}</label>
        </div>
        <div className="ref-version-grid">
          {filtered.map((version, index) => <button key={version.id} type="button" className={`ref-version-card${version.id === selectedVersion ? ' selected' : ''}`} onClick={() => { setSelectedVersion(version.id); chooseActiveInstance(''); }} aria-pressed={version.id === selectedVersion}>
            <span className={`ref-version-art version-scene-${index % 5}`}><i className="ref-art-moon" /><i className="ref-art-mountain mountain-one" /><i className="ref-art-mountain mountain-two" /><i className="ref-art-surface" /><i className="ref-art-star star-a">✦</i><i className="ref-art-star star-b">✧</i></span>
            <span className="ref-version-card-body"><span className="ref-version-meta"><span className={`ref-version-type${version.type === 'snapshot' ? ' snapshot' : ''}`}>{version.type === 'snapshot' ? 'SNAPSHOT' : 'VANILLA'}</span>{version.id === selectedVersion && <span className="ref-version-selected"><Check size={11} /> ВЫБРАНА</span>}</span><strong>{version.id}</strong><small>{formatReleaseDate(version.releaseTime)}</small><span className="ref-version-action">{version.id === selectedVersion ? 'Текущая версия' : 'Выбрать версию'} <ArrowRight size={14} /></span></span>
          </button>)}
          {!filtered.length && <div className="ref-empty-state"><Search size={22} /><strong>Версии не найдены</strong><span>Измени фильтр или поисковый запрос.</span></div>}
        </div>
        <div className="ref-info-note"><ShieldCheck size={16} /><span>Игровые файлы загружаются с официальных серверов Minecraft при первом запуске.</span></div>
      </div>
    );
  }

  function renderMods() {
    const loaderNames = { fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' };
    const isPackSearch = catalogProvider === 'github' || catalogType === 'modpack';
    return (
      <div className="page reference-page reference-subpage reference-mods-page">
        <div className="ref-page-heading"><div><span className="ref-kicker"><Package size={13} /> КАТАЛОГ СООБЩЕСТВА</span><h1>Моды и сборки</h1><p>Добавь новые возможности или установи готовый модпак в отдельный профиль.</p></div><button className="ref-outline-button" onClick={() => selectPage('instances')}><Boxes size={15} /> Мои сборки <span>{instances.length}</span></button></div>
        <div className="ref-mod-controls">
          <div className="ref-mod-control-top">
            <div className="ref-filter-tabs ref-content-tabs" role="tablist" aria-label="Тип контента">
              <button className={catalogType === 'mod' && catalogProvider === 'modrinth' ? 'active' : ''} onClick={() => { setCatalogProvider('modrinth'); setCatalogType('mod'); }}><Package size={14} /> Моды</button>
              <button className={catalogType === 'modpack' ? 'active' : ''} onClick={() => { setCatalogProvider('modrinth'); setCatalogType('modpack'); }}><Boxes size={14} /> Сборки</button>
            </div>
            <div className="ref-provider-switch" role="tablist" aria-label="Источник каталога">
              <button className={catalogProvider === 'modrinth' ? 'active' : ''} onClick={() => { setCatalogProvider('modrinth'); if (catalogType !== 'mod') setCatalogType('modpack'); }}><span className="ref-provider-mark">M</span> Modrinth</button>
              <button className={catalogProvider === 'github' ? 'active' : ''} onClick={() => { setCatalogProvider('github'); setCatalogType('modpack'); }}><Github size={14} /> GitHub</button>
            </div>
          </div>
          <div className="ref-mod-filter-row">
            <div className="ref-loader-filters" aria-label="Загрузчик">
              {Object.entries(loaderNames).map(([loader, label]) => <button key={loader} className={catalogLoader === loader ? 'active' : ''} onClick={() => setCatalogLoader(loader)}>{label}</button>)}
            </div>
            <label className="ref-version-select"><span>ИГРА</span><select value={selectedVersion} onChange={(event) => { setSelectedVersion(event.target.value); chooseActiveInstance(''); }} aria-label="Версия Minecraft">{versions.filter((version) => version.type === 'release').map((version) => <option key={version.id} value={version.id}>{version.id}</option>)}</select><ChevronDown size={14} /></label>
            <form className="ref-catalog-search" onSubmit={(event) => { event.preventDefault(); setDebouncedCatalogQuery(catalogQuery.trim()); }}><Search size={16} /><input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder={isPackSearch ? 'Найти сборку…' : 'Найти мод…'} aria-label="Поиск каталога" />{catalogQuery && <button type="button" onClick={() => setCatalogQuery('')} aria-label="Очистить поиск"><X size={14} /></button>}<button className="ref-catalog-search-submit" type="submit">Найти</button></form>
          </div>
        </div>
        <div className="ref-results-heading"><div><span className="ref-kicker">{catalogProvider === 'github' ? 'РЕЛИЗЫ СБОРOК' : catalogType === 'mod' ? `${loaderNames[catalogLoader].toUpperCase()} · MINECRAFT ${selectedVersion}` : `MINECRAFT ${selectedVersion}`}</span><h2>{catalogProvider === 'github' ? 'Сборки сообщества' : catalogType === 'mod' ? 'Популярные моды' : 'Готовые модпаки'}</h2></div><div className="ref-result-count">{catalogLoading ? <LoaderCircle className="spin" size={15} /> : <>{catalogResults.length} {catalogResults.length === 1 ? 'проект' : 'проектов'}</>}<button onClick={() => setCatalogRefresh((value) => value + 1)} disabled={catalogLoading} aria-label="Обновить каталог" title="Обновить каталог"><RefreshCw size={14} /></button></div></div>
        {contentProgress && <div className="content-install-progress"><div className="content-progress-head"><span><CloudDownload size={15} /> УСТАНОВКА КОНТЕНТА</span><strong>{contentProgress.percent == null ? 'ЗАГРУЗКА' : `${contentProgress.percent}%`}</strong></div><div className="content-progress-track"><span style={{ width: `${Math.max(3, contentProgress.percent || 4)}%` }} /></div><p>{contentProgress.detail}</p></div>}
        {catalogError && <div className="catalog-error"><CircleAlert size={17} /><span>{catalogError}</span><button onClick={() => { setCatalogError(''); setCatalogRefresh((value) => value + 1); }}>Повторить</button></div>}
        <div className="ref-mod-grid">
          {catalogResults.map((item) => {
            const isInstalling = installingContentId === item.id;
            const isPack = item.projectType === 'modpack';
            return <article className="ref-mod-card" key={item.id}>
              <div className="ref-mod-card-top"><span className={`ref-mod-icon${item.iconUrl ? ' has-image' : ''}`}>{item.iconUrl ? <img src={item.iconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : item.source === 'github' ? <Github size={23} /> : isPack ? <Boxes size={22} /> : <Package size={21} />}</span><span className="ref-mod-source">{item.source === 'github' ? 'GITHUB' : 'MODRINTH'}</span><button className="ref-mod-external" onClick={() => launcherApi.openExternal(item.url)} aria-label={`Открыть ${item.title}`}><ArrowUpRight size={15} /></button></div>
              <div className="ref-mod-title-row"><h3>{item.title}</h3><span className="ref-mod-type">{isPack ? 'MODPACK' : loaderNames[catalogLoader].toUpperCase()}</span></div>
              <p className="ref-mod-description">{item.description || 'Описание проекта пока не добавлено автором.'}</p>
              <div className="ref-mod-author"><span>{item.author ? `от ${item.author}` : item.source === 'github' ? 'GitHub Releases' : 'Сообщество Modrinth'}</span><span><Download size={12} /> {formatCompactNumber(item.downloads || item.stars)}</span></div>
              <button className="ref-mod-install" onClick={() => installCatalogItem(item)} disabled={Boolean(installingContentId)}>{isInstalling ? <><LoaderCircle className="spin" size={15} /> Устанавливаем…</> : <><Plus size={15} /> {isPack ? 'Установить сборку' : 'Добавить мод'}</>}</button>
            </article>;
          })}
          {!catalogLoading && !catalogError && !catalogResults.length && <div className="ref-catalog-empty"><div className="ref-empty-glow"><Search size={22} /></div><strong>{debouncedCatalogQuery ? 'Ничего не найдено' : 'Ищи новые приключения'}</strong><span>{debouncedCatalogQuery ? 'Попробуй другое название или измени версию игры.' : 'Введите название мода или выберите источник каталога.'}</span></div>}
        </div>
        <div className="ref-info-note"><ShieldCheck size={16} /><span>Моды и сборки устанавливаются в отдельные игровые профили и не изменяют обычную игру.</span></div>
      </div>
    );
  }

  function renderInstances() {
    const loaderNames = { vanilla: 'Vanilla', fabric: 'Fabric', forge: 'Forge', neoforge: 'NeoForge', quilt: 'Quilt' };
    return (
      <div className="page reference-page reference-subpage reference-builds-page">
        <div className="ref-page-heading"><div><span className="ref-kicker"><Boxes size={13} /> ТВОИ ИГРОВЫЕ ПРОФИЛИ</span><h1>Сборки</h1><p>Каждая сборка — отдельная папка, настройки и набор модов.</p></div><button className="ref-primary-button" onClick={openCreateInstance}><Plus size={15} /> Создать сборку</button></div>
        <div className="ref-build-summary"><span><span className="ref-summary-dot" /> {instances.length} {instances.length === 1 ? 'сборка' : 'сборок'} в библиотеке</span><span>Текущий профиль: <strong>{activeInstance?.name || 'Minecraft ' + selectedVersion}</strong></span></div>
        <div className="ref-build-grid">
          {instances.map((instance, index) => <article key={instance.id} className={`ref-build-card${instance.id === activeInstanceId ? ' active' : ''}`}>
            <div className={`ref-build-art build-scene-${index % 5}`}><span className="ref-build-moon" /><span className="ref-build-mountain build-mountain-a" /><span className="ref-build-mountain build-mountain-b" /><span className="ref-build-spark">✦</span><span className="ref-build-loader-icon"><Boxes size={21} /></span>{instance.id === activeInstanceId && <span className="ref-build-current"><span /> АКТИВНА</span>}</div>
            <div className="ref-build-card-body"><div className="ref-build-meta"><span>{loaderNames[instance.loader] || instance.loader || 'Vanilla'}</span><span>MINECRAFT {instance.minecraftVersion}</span></div><h3>{instance.name}</h3><p>{instance.modCount ? `${instance.modCount} установленных модов` : 'Профиль готов к настройке'}</p><div className="ref-build-card-actions"><button className="ref-build-play" onClick={() => handleLaunch('', instance.id)} disabled={busy || gameStatus === 'preparing'}>{busy && instance.id === activeInstanceId ? <LoaderCircle className="spin" size={15} /> : <Play size={14} fill="currentColor" />} Играть</button><button className="ref-build-icon-button" onClick={() => openInstanceFolder(instance.id)} title="Открыть папку" aria-label={`Открыть папку ${instance.name}`}><FolderOpen size={15} /></button><button className="ref-build-icon-button danger" onClick={() => removeInstance(instance)} disabled={instanceActionId === instance.id} title="Удалить сборку" aria-label={`Удалить ${instance.name}`}>{instanceActionId === instance.id ? <LoaderCircle className="spin" size={15} /> : <Trash2 size={15} />}</button></div></div>
          </article>)}
          <button className="ref-create-build-card" onClick={openCreateInstance}><span className="ref-create-build-plus"><Plus size={22} /></span><strong>Новая сборка</strong><span>Создай чистый профиль с любым загрузчиком</span><span className="ref-create-build-link">Настроить <ArrowRight size={14} /></span></button>
        </div>
        {!instances.length && <div className="ref-empty-hint"><Info size={15} /> Здесь появятся сборки, установленные из каталога модов или созданные вручную.</div>}
      </div>
    );
  }

  function renderServers() {
    const filtered = savedServers.filter((server) => `${server.name} ${server.address}`.toLowerCase().includes(serverSearch.toLowerCase()));
    return (
      <div className="page reference-page reference-subpage reference-servers-page">
        <div className="ref-page-heading"><div><span className="ref-kicker"><Globe2 size={13} /> ТВОЁ МУЛЬТИПЛЕЕР-ПРОСТРАНСТВО</span><h1>Серверы</h1><p>Храни адреса избранных серверов и подключайся одним нажатием.</p></div><button className="ref-primary-button" onClick={() => { setServerFormOpen((open) => !open); setServerError(''); }}><Plus size={15} /> Добавить сервер</button></div>
        <div className="ref-server-toolbar"><div className="ref-server-count"><span className="ref-server-pulse" /> {savedServers.length} сохранено</div><label className="ref-search-field"><Search size={16} /><input value={serverSearch} onChange={(event) => setServerSearch(event.target.value)} placeholder="Найти сервер…" aria-label="Найти сервер" />{serverSearch && <button onClick={() => setServerSearch('')} aria-label="Очистить поиск"><X size={14} /></button>}</label></div>
        {serverFormOpen && <form className="ref-server-form" onSubmit={addServer}><div className="ref-server-form-heading"><span className="ref-server-form-icon"><Server size={17} /></span><div><strong>Добавить сервер</strong><span>Адрес появится в списке избранного.</span></div><button type="button" className="ref-build-icon-button" onClick={() => setServerFormOpen(false)} aria-label="Закрыть"><X size={15} /></button></div><label><span>НАЗВАНИЕ</span><input value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="Например, Друзья" /></label><label><span>АДРЕС СЕРВЕРА</span><input required value={serverAddress} onChange={(event) => setServerAddress(event.target.value)} placeholder="play.example.net:25565" /></label>{serverError && <p className="ref-server-error"><CircleAlert size={14} /> {serverError}</p>}<button className="ref-primary-button" type="submit"><Plus size={15} /> Сохранить сервер</button></form>}
        <div className="ref-server-list">
          {filtered.map((server, index) => <article className="ref-server-card" key={server.id}><span className={`ref-server-icon server-icon-${index % 4}`}><Server size={20} /></span><div className="ref-server-main"><strong>{server.name}</strong><span>{server.address}</span></div><div className="ref-server-saved"><span /> В ИЗБРАННОМ</div><div className="ref-server-actions"><button className="ref-build-icon-button" onClick={() => copyAddress(server.address)} title="Скопировать адрес" aria-label={`Скопировать адрес ${server.address}`}>{copiedAddress === server.address ? <Check size={15} /> : <Copy size={15} />}</button><button className="ref-server-play" onClick={() => handleLaunch(server.address)} disabled={busy || gameStatus === 'preparing'}><Play size={14} fill="currentColor" /> Играть</button><button className="ref-build-icon-button danger" onClick={() => removeServer(server.id)} title="Удалить сервер" aria-label={`Удалить ${server.name}`}><Trash2 size={15} /></button></div></article>)}
          {!filtered.length && <div className="ref-catalog-empty"><div className="ref-empty-glow"><Server size={22} /></div><strong>{serverSearch ? 'Серверы не найдены' : 'Пока нет серверов'}</strong><span>{serverSearch ? 'Попробуй изменить запрос.' : 'Добавь адрес своего сервера, чтобы подключаться быстрее.'}</span>{!serverSearch && <button className="ref-outline-button" onClick={() => setServerFormOpen(true)}><Plus size={14} /> Добавить первый сервер</button>}</div>}
        </div>
        <div className="ref-info-note"><Info size={16} /><span>Адрес передаётся игре при запуске. Доступность и статус серверов здесь не проверяются.</span></div>
      </div>
    );
  }

  function renderNews() {
    const notes = [
      { tag: 'БЫСТРЫЙ СТАРТ', title: 'Начни с любимой версии', text: 'Выбери релиз Minecraft. Игровые файлы загрузятся автоматически при первом запуске.', icon: Gamepad2, action: () => selectPage('library'), actionLabel: 'Все версии' },
      { tag: 'СООБЩЕСТВО', title: 'Собери свой модпак', text: 'Устанавливай моды и готовые сборки из Modrinth или проверенных GitHub Releases.', icon: Package, action: () => selectPage('mods'), actionLabel: 'Открыть каталог' },
      { tag: 'МУЛЬТИПЛЕЕР', title: 'Играй на любимых серверах', text: 'Добавь адрес в избранное и запускай Minecraft сразу с подключением к серверу.', icon: Globe2, action: () => selectPage('servers'), actionLabel: 'Мои серверы' },
      { tag: 'ПРОФИЛИ', title: 'Держи сборки отдельно', text: 'Каждая сборка получает собственную папку и не меняет обычные игровые файлы.', icon: Boxes, action: () => selectPage('instances'), actionLabel: 'Мои сборки' },
    ];
    const result = notes.filter((note) => `${note.title} ${note.text} ${note.tag}`.toLowerCase().includes(newsSearch.toLowerCase()));
    return (
      <div className="page reference-page reference-subpage reference-news-page">
        <div className="ref-page-heading"><div><span className="ref-kicker"><Newspaper size={13} /> LUMEN GUIDE</span><h1>Новости и советы</h1><p>Полезные заметки, чтобы быстрее оказаться в игре.</p></div><label className="ref-search-field"><Search size={16} /><input value={newsSearch} onChange={(event) => setNewsSearch(event.target.value)} placeholder="Поиск по заметкам…" />{newsSearch && <button onClick={() => setNewsSearch('')} aria-label="Очистить поиск"><X size={14} /></button>}</label></div>
        <div className="ref-news-feature"><div className="ref-news-feature-art"><span className="feature-moon" /><span className="feature-mountain mountain-a" /><span className="feature-mountain mountain-b" /><span className="feature-spark">✦</span><span className="feature-pixel-cube" /></div><div className="ref-news-feature-copy"><span className="ref-kicker">ТВОЙ СЛЕДУЮЩИЙ МИР</span><h2>Большая история<br /><em>начинается с малого.</em></h2><p>Подключи аккаунт, выбери сборку и отправляйся в приключение.</p><button className="ref-primary-button" onClick={() => account ? selectPage('library') : openAuth()}>{account ? 'Выбрать версию' : 'Подключить Ely.by'} <ArrowRight size={14} /></button></div></div>
        <div className="ref-news-grid">{result.map((note) => { const Icon = note.icon; return <article className="ref-note-card" key={note.title}><span className="ref-note-icon"><Icon size={18} /></span><span className="ref-kicker">{note.tag}</span><h3>{note.title}</h3><p>{note.text}</p><button onClick={note.action}>{note.actionLabel} <ArrowRight size={14} /></button></article>; })}{!result.length && <div className="ref-empty-state"><Search size={22} /><strong>Заметки не найдены</strong><span>Попробуй другой поисковый запрос.</span></div>}</div>
      </div>
    );
  }

  function renderSettingsPage() {
    return <div className="page reference-page reference-subpage reference-settings-page"><div className="ref-page-heading"><div><span className="ref-kicker"><Settings size={13} /> ПЕРСОНАЛЬНЫЕ НАСТРОЙКИ</span><h1>Настройки</h1><p>Настрой игру и Lumen под свой компьютер.</p></div><button className="ref-primary-button" onClick={handleSaveSettings} disabled={settingsSaving}>{settingsSaving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Сохранить</button></div><SettingsPanel draft={settingsDraft} setDraft={setSettingsDraft} onChooseFolder={handleChooseFolder} isDesktop={launcherApi.isDesktop} /></div>;
  }

  function renderCurrentPage() {
    if (view === 'home') return renderHome();
    if (view === 'library') return renderLibrary();
    if (view === 'mods') return renderMods();
    if (view === 'instances') return renderInstances();
    if (view === 'servers') return renderServers();
    if (view === 'news') return renderNews();
    return renderSettingsPage();
  }

  const globalSearchResults = useMemo(() => {
    if (!searchValue.trim()) return [];
    const query = searchValue.toLowerCase();
    return [
      ...versions.filter((version) => version.id.toLowerCase().includes(query)).slice(0, 4).map((version) => ({ title: `Minecraft ${version.id}`, label: 'Версия игры', action: () => { setSelectedVersion(version.id); chooseActiveInstance(''); selectPage('library'); } })),
      ...savedServers.filter((server) => `${server.name} ${server.address}`.toLowerCase().includes(query)).slice(0, 3).map((server) => ({ title: server.name, label: server.address, action: () => selectPage('servers') })),
      ...navItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 3).map((item) => ({ title: item.label, label: 'Раздел', action: () => selectPage(item.id) })),
    ].slice(0, 6);
  }, [searchValue, versions, savedServers]);

  return (
    <div className={`app-shell reference-shell${launcherApi.isDesktop ? ' is-desktop' : ''}`}>
      <div className="ref-cosmic-stars" aria-hidden="true" />
      <div className="ref-cosmic-mountains" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="ref-topbar">
        <div className="ref-search-area">
          <div className={`ref-global-search${searchOpen ? ' is-open' : ''}`}>
            {searchOpen ? <><Search size={16} /><input autoFocus value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Поиск по лаунчеру…" onKeyDown={(event) => { if (event.key === 'Escape') { setSearchOpen(false); setSearchValue(''); } }} /><button className="ref-search-close" onClick={() => { setSearchOpen(false); setSearchValue(''); }} aria-label="Закрыть поиск"><X size={14} /></button>{searchValue && <div className="ref-global-search-results">{globalSearchResults.length ? globalSearchResults.map((result, index) => <button key={`${result.title}-${index}`} onClick={() => { result.action(); setSearchOpen(false); setSearchValue(''); }}><span><strong>{result.title}</strong><small>{result.label}</small></span><ArrowUpRight size={14} /></button>) : <div className="ref-search-empty">Совпадений не найдено</div>}</div>}</> : <button className="ref-search-trigger" onClick={() => setSearchOpen(true)} aria-label="Поиск"><Search size={16} /><span>Поиск</span><kbd>CTRL K</kbd></button>}
          </div>
        </div>
        <nav className="ref-main-nav" aria-label="Основная навигация">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`ref-nav-item${view === item.id ? ' active' : ''}`} onClick={() => selectPage(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon size={15} strokeWidth={1.8} /><span>{item.label}</span></button>; })}</nav>
        <div className="ref-topbar-right">
          <div className="ref-account-wrap"><button className={`ref-account-button${account ? ' connected' : ''}`} onClick={() => account ? setAccountMenuOpen((open) => !open) : openAuth()} aria-label={account ? `Профиль Ely.by: ${account.username}` : 'Войти через Ely.by'}>{account ? <PixelAvatar account={account} size="small" /> : <span className="ref-ely-avatar">e</span>}<span className="ref-account-copy"><strong>{account ? account.username : 'Ely.by'}</strong><small>{account ? 'Подключён' : 'Войти в аккаунт'}</small></span><ChevronDown size={14} /></button>{accountMenuOpen && account && <div className="account-popover ref-account-popover"><div className="popover-account-header"><PixelAvatar account={account} /><span><strong>{account.username}</strong><small>Профиль Ely.by подключён</small></span></div><button onClick={() => { setAccountMenuOpen(false); openSettings(); }}><Settings size={15} /> Настройки игры</button><button className="logout-action" onClick={handleLogout}><LogOut size={15} /> Выйти из аккаунта</button></div>}</div>
          {launcherApi.isDesktop && <div className="window-controls ref-window-controls"><button onClick={() => launcherApi.windowControl('minimize')} aria-label="Свернуть"><Minus size={13} /></button><button onClick={() => launcherApi.windowControl('maximize')} aria-label="Развернуть"><Maximize2 size={12} /></button><button className="window-close" onClick={() => launcherApi.windowControl('close')} aria-label="Закрыть"><X size={13} /></button></div>}
        </div>
      </header>

      <main className="ref-main-scroll" onClick={() => { if (versionMenuOpen) setVersionMenuOpen(false); }}>
        <div className="ref-content-container">{renderCurrentPage()}</div>
      </main>

      <div className="ref-play-dock">
        <div className="ref-dock-version-wrap">
          <button className={`ref-dock-version${versionMenuOpen ? ' is-open' : ''}`} onClick={() => setVersionMenuOpen((open) => !open)} aria-expanded={versionMenuOpen}>
            <span className="ref-dock-mark"><PixelMark small /></span><span className="ref-dock-version-copy"><small>ВЕРСИЯ ИГРЫ</small><strong>{activeInstance?.minecraftVersion || selectedVersion}<i />{launcherLoaderLabel}</strong></span><ChevronDown size={15} />
          </button>
          {versionMenuOpen && <div className="ref-dock-dropdown"><span className="ref-kicker">БЫСТРЫЙ ВЫБОР</span>{versions.slice(0, 8).map((version) => <button key={version.id} className={version.id === selectedVersion ? 'selected' : ''} onClick={(event) => { event.stopPropagation(); setSelectedVersion(version.id); chooseActiveInstance(''); setVersionMenuOpen(false); }}><span>{version.id}</span><small>{version.type === 'snapshot' ? 'Снимок' : 'Релиз'}</small>{version.id === selectedVersion && <Check size={13} />}</button>)}<button className="ref-dock-all-versions" onClick={(event) => { event.stopPropagation(); setVersionMenuOpen(false); selectPage('library'); }}>Все версии <ArrowRight size={13} /></button></div>}
        </div>
        <button className="ref-dock-play" onClick={() => handleLaunch()} disabled={busy || gameStatus === 'preparing' || gameStatus === 'running'}><span className="ref-play-icon">{busy || gameStatus === 'preparing' ? <LoaderCircle className="spin" size={18} /> : gameStatus === 'running' ? <Check size={18} /> : <Play size={17} fill="currentColor" />}</span><span>{busy || gameStatus === 'preparing' ? 'ГОТОВИМ ИГРУ' : gameStatus === 'running' ? 'ИГРА ЗАПУЩЕНА' : 'ИГРАТЬ'}</span><ArrowRight size={16} /></button>
      </div>

      {createInstanceOpen && <div className="modal-backdrop ref-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !createInstanceBusy) setCreateInstanceOpen(false); }}><form className="ref-create-dialog" onSubmit={createInstanceFromForm} role="dialog" aria-modal="true" aria-labelledby="create-instance-title"><div className="ref-create-dialog-top"><span className="ref-create-dialog-icon"><Boxes size={17} /></span><button type="button" className="ref-build-icon-button" onClick={() => setCreateInstanceOpen(false)} disabled={createInstanceBusy} aria-label="Закрыть"><X size={15} /></button></div><span className="ref-kicker">ОТДЕЛЬНЫЙ ИГРОВОЙ ПРОФИЛЬ</span><h2 id="create-instance-title">Создать сборку</h2><p>Каждая сборка устанавливается отдельно и не меняет другие профили.</p><label className="ref-dialog-field"><span>НАЗВАНИЕ СБОРКИ</span><input autoFocus required maxLength={48} value={newInstance.name} onChange={(event) => setNewInstance((draft) => ({ ...draft, name: event.target.value }))} placeholder="Например, Мой мир с модами" /></label><div className="ref-dialog-field-row"><label className="ref-dialog-field"><span>ВЕРСИЯ ИГРЫ</span><select value={newInstance.minecraftVersion} onChange={(event) => setNewInstance((draft) => ({ ...draft, minecraftVersion: event.target.value }))}>{versions.filter((version) => version.type === 'release').map((version) => <option key={version.id} value={version.id}>{version.id}</option>)}</select></label><label className="ref-dialog-field"><span>ЗАГРУЗЧИК</span><select value={newInstance.loader} onChange={(event) => setNewInstance((draft) => ({ ...draft, loader: event.target.value }))}><option value="vanilla">Vanilla</option><option value="fabric">Fabric</option><option value="forge">Forge</option><option value="neoforge">NeoForge</option><option value="quilt">Quilt</option></select></label></div><div className="ref-create-dialog-note"><ShieldCheck size={14} /> Установщик подготовит игровые файлы при создании профиля.</div>{createInstanceBusy && <div className="ref-create-progress"><div><span>{contentProgress?.detail || 'Создаём отдельный профиль…'}</span><strong>{contentProgress?.percent == null ? '…' : `${contentProgress.percent}%`}</strong></div><i><span style={{ width: `${Math.max(4, contentProgress?.percent || 4)}%` }} /></i></div>}<div className="ref-create-dialog-actions"><button type="button" className="ref-dialog-cancel" onClick={() => setCreateInstanceOpen(false)} disabled={createInstanceBusy}>Отмена</button><button type="submit" className="ref-primary-button" disabled={createInstanceBusy}>{createInstanceBusy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} {createInstanceBusy ? 'Создаём…' : 'Создать сборку'}</button></div></form></div>}

      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSuccess={(result) => { setAppState((state) => ({ ...state, account: result.account })); setAuthOpen(false); showToast(result.message || 'Аккаунт Ely.by подключён.'); }} />}
      {settingsOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><div className="dialog-card settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title"><div className="dialog-top"><span className="dialog-icon"><Settings size={17} /></span><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Закрыть"><X size={17} /></button></div><div className="section-kicker">ПОД ТВОЙ КОМПЬЮТЕР</div><h2 id="settings-dialog-title">Настройки игры</h2><p className="dialog-intro">Измени параметры запуска. Их можно обновить в любой момент.</p><SettingsPanel draft={settingsDraft} setDraft={setSettingsDraft} onChooseFolder={handleChooseFolder} isDesktop={launcherApi.isDesktop} compact /><div className="dialog-actions"><button className="cancel-button" onClick={() => setSettingsOpen(false)}>Отмена</button><button className="submit-button" onClick={handleSaveSettings} disabled={settingsSaving}>{settingsSaving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Сохранить настройки</button></div></div></div>}
      {gameStatus === 'preparing' && <div className="modal-backdrop launch-backdrop"><div className="launch-dialog" role="dialog" aria-modal="true" aria-labelledby="launch-title"><div className="launch-orbit"><span className="launch-orbit-ring" /><span className="launch-orbit-core"><PixelMark small /></span><span className="orbit-particle particle-one" /><span className="orbit-particle particle-two" /></div><div className="section-kicker">MINECRAFT JAVA EDITION</div><h2 id="launch-title">Готовим твой мир</h2><p>{launchProgress.detail}</p><div className="launch-progress"><span style={{ width: `${Math.max(3, launchProgress.percent || 4)}%` }} /></div><div className="launch-progress-meta"><span>{launchProgress.percent == null ? 'ЗАГРУЗКА' : `${launchProgress.percent}%`}</span><span>{selectedVersion}</span></div>{gameLogs.length > 0 && <div className="launch-logs"><span><Terminal size={12} /> ЖУРНАЛ ЗАПУСКА</span><small>{gameLogs[gameLogs.length - 1]}</small></div>}<button className="launch-cancel" onClick={() => showToast('Подготовка игры может занять несколько минут. Закрой лаунчер, чтобы отменить запуск.', 'error')}><Info size={13} /> Первый запуск может занять немного больше времени</button></div></div>}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

function AuthDialog({ onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const firstField = useRef(null);

  useEffect(() => { firstField.current?.focus(); }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await launcherApi.login({ username, password, totp });
      if (result.needsTwoFactor) {
        setTotpRequired(true);
        setError(result.message);
        return;
      }
      if (!result.ok) {
        setError(result.message || 'Не удалось войти через Ely.by.');
        return;
      }
      onSuccess(result);
    } catch (requestError) {
      setError(requestError?.message || 'Не удалось выполнить вход. Проверь подключение и попробуй снова.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop auth-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="auth-visual">
          <button className="auth-close-mobile icon-button" onClick={onClose} aria-label="Закрыть"><X size={17} /></button>
          <div className="auth-visual-stars" />
          <div className="auth-brand"><span className="ely-coin auth-ely-coin"><span>e</span></span><span>ELY.BY <small>ACCOUNT</small></span></div>
          <div className="auth-illustration"><div className="auth-cube cube-back" /><div className="auth-cube cube-mid" /><div className="auth-cube cube-front"><span /></div><div className="auth-cube-shadow" /><span className="auth-illustration-spark spark-left">✦</span><span className="auth-illustration-spark spark-right">✧</span></div>
          <div className="auth-visual-copy"><span className="section-kicker">ТВОЙ ПРОФИЛЬ. ТВОЙ МИР.</span><h2>Всё начинается<br />с твоего аккаунта.</h2><p>Подключи Ely.by, чтобы использовать игровой профиль и запускать Minecraft.</p></div>
          <div className="auth-visual-footer"><ShieldCheck size={14} /> ВХОД ЧЕРЕЗ ОФИЦИАЛЬНЫЙ СЕРВИС ELY.BY</div>
        </div>
        <div className="auth-form-side">
          <button className="auth-close icon-button" onClick={onClose} aria-label="Закрыть"><X size={17} /></button>
          <div className="auth-form-content">
            <div className="auth-mobile-brand"><span className="ely-coin auth-ely-coin"><span>e</span></span><span>ELY.BY <small>ACCOUNT</small></span></div>
            <div className="section-kicker">БЫСТРО И БЕЗОПАСНО</div>
            <h1 id="auth-title">Вход в Ely.by</h1>
            <p className="auth-subtitle">Используй данные своего аккаунта Ely.by.</p>
            {launcherApi.isDesktop ? <>
              <form className="auth-form" onSubmit={submit}>
                <label className="field-label" htmlFor="ely-login">ЛОГИН ИЛИ E-MAIL</label>
                <div className="input-wrap"><UserRound size={16} /><input id="ely-login" ref={firstField} autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Имя пользователя или e-mail" required /></div>
                <div className="field-label-row"><label className="field-label" htmlFor="ely-password">ПАРОЛЬ</label><button type="button" className="forgot-link" onClick={() => launcherApi.openExternal('https://account.ely.by/recovery')}>Забыли пароль?</button></div>
                <div className="input-wrap"><LockKeyhole size={16} /><input id="ely-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Твой пароль Ely.by" required /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
                {totpRequired && <><label className="field-label" htmlFor="ely-totp">КОД ИЗ ПРИЛОЖЕНИЯ-АУТЕНТИФИКАТОРА</label><div className="input-wrap totp-wrap"><ShieldCheck size={16} /><input id="ely-totp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={totp} onChange={(event) => setTotp(event.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="000 000" autoFocus required /><span className="totp-label">2FA</span></div></>}
                {error && <div className={`auth-error${totpRequired ? ' auth-error-soft' : ''}`} role="alert"><Info size={15} /><span>{error}</span></div>}
                <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? <><LoaderCircle className="spin" size={17} /> Проверяем данные…</> : <><span>{totpRequired ? 'Подтвердить вход' : 'Войти через Ely.by'}</span><ArrowRight size={16} /></>}</button>
              </form>
              <div className="auth-security-note"><span className="security-note-icon"><ShieldCheck size={16} /></span><div><strong>Твои данные под защитой</strong><p>Пароль передаётся на authserver.ely.by по HTTPS и не сохраняется. В настольном приложении токен шифруется системой.</p></div></div>
            </> : <div className="preview-auth-guard"><span className="preview-guard-icon"><ShieldCheck size={21} /></span><span className="section-kicker">ЗАЩИТА АККАУНТА</span><h2>Вход доступен в приложении</h2><p>Чтобы не передавать пароль Ely.by через браузерный предпросмотр, ввод данных здесь отключён. Открой настольную версию Lumen для безопасного входа.</p><button onClick={() => launcherApi.openExternal('https://account.ely.by')}><ExternalLink size={14} /> Официальный сайт Ely.by</button><div className="preview-note"><Info size={13} /> Предпросмотр показывает интерфейс; игра и авторизация работают в настольном приложении.</div></div>}
            <div className="auth-terms">Нет аккаунта? <button onClick={() => launcherApi.openExternal('https://ely.by/register')}>Зарегистрируйся на Ely.by <ArrowUpRight size={12} /></button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ draft, setDraft, onChooseFolder, isDesktop, compact = false }) {
  const memoryTotal = Math.max(4, Math.min(64, Math.round((navigator.deviceMemory || 8) * 2)));
  return (
    <div className={`settings-panel${compact ? ' settings-panel-compact' : ''}`}>
      <section className="settings-section">
        <div className="settings-section-icon settings-icon-purple"><Cpu size={17} /></div><div className="settings-section-content"><div className="settings-section-heading"><h3>Оперативная память</h3><span className="settings-value">{draft.memoryMin}–{draft.memoryMax} ГБ</span></div><p>Выделим Minecraft достаточно памяти, оставив ресурсы системе.</p><div className="memory-control"><label><span>МИНИМУМ</span><input type="range" min="2" max={Math.max(2, draft.memoryMax - 1)} step="1" value={draft.memoryMin} onChange={(event) => setDraft((settings) => ({ ...settings, memoryMin: Number(event.target.value) }))} /><strong>{draft.memoryMin} ГБ</strong></label><label><span>МАКСИМУМ</span><input type="range" min={Math.max(2, draft.memoryMin + 1)} max={Math.max(4, memoryTotal)} step="1" value={Math.min(draft.memoryMax, Math.max(4, memoryTotal))} onChange={(event) => setDraft((settings) => ({ ...settings, memoryMax: Number(event.target.value) }))} /><strong>{draft.memoryMax} ГБ</strong></label></div><div className="memory-scale"><span>2 ГБ</span><span>Доступно около {memoryTotal} ГБ</span></div></div>
      </section>
      <section className="settings-section settings-section-inline">
        <div className="settings-section-icon settings-icon-blue"><Monitor size={17} /></div><div className="settings-section-content"><div className="settings-section-heading"><h3>Окно игры</h3></div><p>Начальный размер окна Minecraft.</p><div className="resolution-fields"><label><span>ШИРИНА</span><select value={draft.width} onChange={(event) => setDraft((settings) => ({ ...settings, width: Number(event.target.value) }))}><option value="854">854 px</option><option value="1280">1280 px</option><option value="1600">1600 px</option><option value="1920">1920 px</option></select></label><span className="resolution-cross">×</span><label><span>ВЫСОТА</span><select value={draft.height} onChange={(event) => setDraft((settings) => ({ ...settings, height: Number(event.target.value) }))}><option value="480">480 px</option><option value="720">720 px</option><option value="900">900 px</option><option value="1080">1080 px</option></select></label></div></div>
      </section>
      <section className="settings-section settings-section-inline">
        <div className="settings-section-icon settings-icon-green"><HardDrive size={17} /></div><div className="settings-section-content"><div className="settings-section-heading"><h3>Папка игры</h3></div><p>Место, где будут храниться файлы Minecraft и миры.</p><div className="folder-picker"><span title={draft.gameDir}>{draft.gameDir || 'Папка не выбрана'}</span><button onClick={onChooseFolder}><FolderOpen size={14} /> {isDesktop ? 'Выбрать' : 'Доступно в приложении'}</button></div></div>
      </section>
      <section className="settings-section settings-section-inline settings-java-section">
        <div className="settings-section-icon settings-icon-amber"><Zap size={17} /></div><div className="settings-section-content"><div className="settings-section-heading"><h3>Java Runtime</h3><span className="auto-detect"><CheckCircle2 size={12} /> АВТОПОИСК</span></div><p>Оставь пустым, чтобы использовать Java, найденную в системе.</p><div className="java-input"><Terminal size={14} /><input value={draft.javaPath || ''} onChange={(event) => setDraft((settings) => ({ ...settings, javaPath: event.target.value }))} placeholder="Автоматически (Java в PATH)" /></div></div>
      </section>
      {compact && <div className="settings-security-foot"><ShieldCheck size={14} /> Настройки хранятся локально на этом устройстве.</div>}
    </div>
  );
}

function UsersIcon({ size = 18 }) {
  return <span className="inline-users-icon"><UserRound size={size} /><UserRound size={Math.max(10, size - 5)} /></span>;
}

export default App;

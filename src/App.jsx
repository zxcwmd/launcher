import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
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
  Gauge,
  Globe2,
  HardDrive,
  Home,
  Info,
  Library,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Maximize2,
  Minus,
  Monitor,
  Newspaper,
  Package,
  Play,
  Plus,
  Rocket,
  Search,
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
  { id: 'library', label: 'Версии игры', icon: Library },
  { id: 'mods', label: 'Моды и сборки', icon: Package, badge: 'NEW' },
  { id: 'servers', label: 'Мои серверы', icon: Globe2 },
  { id: 'news', label: 'Новости', icon: Newspaper },
];

const initialSettings = {
  memoryMin: 2,
  memoryMax: 6,
  gameDir: 'minecraft',
  javaPath: '',
  width: 1280,
  height: 720,
};

const modSuggestions = [
  { name: 'Sodium', tag: 'ПРОИЗВОДИТЕЛЬНОСТЬ', color: 'mint', description: 'Оптимизирует рендеринг и помогает получить больше FPS.', url: 'https://modrinth.com/mod/sodium' },
  { name: 'Iris Shaders', tag: 'ГРАФИКА', color: 'violet', description: 'Поддержка шейдеров с удобной настройкой прямо в игре.', url: 'https://modrinth.com/mod/iris' },
  { name: 'Lithium', tag: 'ОПТИМИЗАЦИЯ', color: 'amber', description: 'Уменьшает нагрузку на процессор без изменения игрового процесса.', url: 'https://modrinth.com/mod/lithium' },
  { name: 'Mod Menu', tag: 'ИНТЕРФЕЙС', color: 'blue', description: 'Список установленных модов и быстрый доступ к их настройкам.', url: 'https://modrinth.com/mod/modmenu' },
];

function getSavedServers() {
  try {
    const parsed = JSON.parse(localStorage.getItem('lumen-saved-servers') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatReleaseDate(value) {
  if (!value) return 'Официальный релиз';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Официальный релиз';
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
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
  const [newsSearch, setNewsSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [modTab, setModTab] = useState('popular');
  const [copiedAddress, setCopiedAddress] = useState('');
  const toastTimer = useRef(null);

  const account = appState.account;
  const versions = appState.versions?.length ? appState.versions : [
    { id: '1.21.4', type: 'release' },
    { id: '1.21.1', type: 'release' },
    { id: '1.20.1', type: 'release' },
  ];
  const currentVersion = versions.find((version) => version.id === selectedVersion) || versions[0];

  useEffect(() => {
    let mounted = true;
    launcherApi.getState().then((nextState) => {
      if (!mounted) return;
      setAppState((current) => ({ ...current, ...nextState }));
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
      showToast(`Minecraft ${payload.version || selectedVersion} запущен. Удачной игры!`);
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
    if (type === 'game-log' || type === 'launcher-log') {
      if (payload.line) setGameLogs((lines) => [...lines.slice(-99), payload.line]);
    }
  }), [selectedVersion]);

  useEffect(() => {
    localStorage.setItem('lumen-saved-servers', JSON.stringify(savedServers));
  }, [savedServers]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  function showToast(message, tone = 'success') {
    setToast({ message, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  function openAuth() {
    setAccountMenuOpen(false);
    setAuthOpen(true);
  }

  function openSettings() {
    setSettingsDraft(appState.settings || initialSettings);
    setSettingsOpen(true);
  }

  async function handleLogout() {
    setAccountMenuOpen(false);
    await launcherApi.logout();
    setAppState((state) => ({ ...state, account: null }));
    showToast('Вы вышли из аккаунта Ely.by.');
  }

  async function handleLaunch(server = '') {
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
    setBusy(true);
    setGameStatus('preparing');
    setGameLogs([]);
    setLaunchProgress({ percent: 1, detail: 'Проверяем аккаунт Ely.by…' });
    try {
      await launcherApi.launch({ versionId: selectedVersion, serverAddress: server || '' });
    } catch (error) {
      setGameStatus('idle');
      setLaunchProgress({ percent: 0, detail: 'Подготовка…' });
      showToast(error?.message || 'Не удалось запустить Minecraft.', 'error');
    } finally {
      setBusy(false);
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
    const quickVersions = versions.slice(0, 3);
    return (
      <div className="page page-home">
        <div className="page-heading home-heading">
          <div>
            <div className="eyebrow"><span className="eyebrow-spark"><Sparkles size={13} /></span> ПРОСТОЙ ПУТЬ В ТВОЙ МИР</div>
            <h1>{account ? `С возвращением, ${account.username}` : 'Твой следующий мир ждёт'}</h1>
            <p>Всё для игры в одном месте — от входа до последнего сохранения.</p>
          </div>
          <button className="round-action" onClick={openSettings} aria-label="Настройки" title="Настройки"><Settings size={17} /></button>
        </div>

        <div className="home-grid">
          <div className="home-primary">
            <section className="hero-card">
              <SceneArtwork />
              <div className="hero-vignette" />
              <div className="hero-topline">
                <span className="hero-label"><span className="live-dot" /> ТВОЯ ИГРА. ТВОИ ПРАВИЛА.</span>
                <span className="hero-release"><span className="release-dot" /> JAVA EDITION</span>
              </div>
              <div className="hero-copy">
                <div className="hero-pretitle"><span className="hero-line" /> LUMEN LAUNCHER</div>
                <h2>Мир начинается<br /><em>с одного клика.</em></h2>
                <p>Выбирай версию, зови друзей и создавай историю, которую захочется продолжить.</p>
                <div className="hero-actions">
                  <button className="play-button" onClick={() => handleLaunch()} disabled={busy || gameStatus === 'preparing'}>
                    {busy || gameStatus === 'preparing' ? <LoaderCircle className="spin" size={18} /> : account ? <Play size={18} fill="currentColor" /> : <Zap size={18} fill="currentColor" />}
                    <span>{busy || gameStatus === 'preparing' ? 'ГОТОВИМ ИГРУ' : account ? 'ИГРАТЬ' : 'ВОЙТИ И ИГРАТЬ'}</span>
                    {!busy && gameStatus !== 'preparing' && <ArrowRight size={16} />}
                  </button>
                  <div className="hero-version-wrap">
                    <span className="version-overline">ВЕРСИЯ</span>
                    <button className={`hero-version${versionMenuOpen ? ' is-open' : ''}`} onClick={() => setVersionMenuOpen((open) => !open)} aria-expanded={versionMenuOpen}>
                      <span className="version-status-dot" />
                      <strong>{currentVersion?.id || selectedVersion}</strong>
                      <ChevronDown size={14} />
                    </button>
                    {versionMenuOpen && <div className="version-dropdown">
                      <div className="dropdown-caption">БЫСТРЫЙ ВЫБОР</div>
                      {versions.slice(0, 7).map((version) => (
                        <button key={version.id} className={`version-option${version.id === selectedVersion ? ' selected' : ''}`} onClick={() => { setSelectedVersion(version.id); setVersionMenuOpen(false); }}>
                          <span>{version.id}</span>
                          <small>{version.type === 'snapshot' ? 'Снимок' : 'Релиз'}</small>
                          {version.id === selectedVersion && <Check size={14} />}
                        </button>
                      ))}
                      <button className="dropdown-link" onClick={() => { setVersionMenuOpen(false); selectPage('library'); }}>Все версии <ArrowRight size={13} /></button>
                    </div>}
                  </div>
                </div>
              </div>
              <div className="hero-footnote"><span><ShieldCheck size={13} /> Ely.by</span><i /> <span>Безопасный вход</span><i /> <span>Java Edition</span></div>
              <div className="hero-coordinate"><span className="coordinate-cross">✣</span> 48° 51′ N · 2° 21′ E</div>
            </section>

            <section className="section-block quick-library">
              <div className="section-heading">
                <div><div className="section-kicker">НАЧНИ С ЭТОГО</div><h2>Версии игры</h2></div>
                <button className="text-link" onClick={() => selectPage('library')}>Вся библиотека <ArrowRight size={15} /></button>
              </div>
              <div className="version-cards">
                {quickVersions.map((version, index) => (
                  <button key={version.id} className={`quick-version-card${version.id === selectedVersion ? ' is-selected' : ''}`} onClick={() => { setSelectedVersion(version.id); showToast(`Выбрана Minecraft ${version.id}.`); }}>
                    <span className={`version-card-art version-card-art-${index + 1}`}><span className="art-sun" /><span className="art-hill art-hill-back" /><span className="art-hill art-hill-front" /><span className="art-tree" /></span>
                    <span className="version-card-body">
                      <span className="version-card-top"><span>{version.type === 'snapshot' ? 'SNAPSHOT' : 'VANILLA'}</span>{version.id === selectedVersion ? <span className="selected-chip"><Check size={10} /> ВЫБРАНА</span> : <ArrowUpRight size={14} />}</span>
                      <strong>{version.id}</strong>
                      <small>{formatReleaseDate(version.releaseTime)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <aside className="home-aside">
            <section className={`account-panel${account ? ' account-panel-connected' : ''}`}>
              <div className="aside-card-top"><span className="section-kicker">ТВОЙ ПРОФИЛЬ</span><span className={`connection-indicator${account ? ' connected' : ''}`}><i /> {account ? 'ПОДКЛЮЧЁН' : 'НЕ ПОДКЛЮЧЁН'}</span></div>
              {account ? <>
                <div className="connected-user"><PixelAvatar account={account} /><div><strong>{account.username}</strong><span>Аккаунт Ely.by</span></div><button className="icon-button account-more" onClick={() => setAccountMenuOpen((open) => !open)} aria-label="Меню аккаунта"><ChevronDown size={15} /></button></div>
                <div className="profile-perks"><span><ShieldCheck size={14} /> Авторизация Ely.by</span><span><CheckCircle2 size={14} /> Профиль готов</span></div>
                <button className="account-secondary" onClick={() => handleLaunch()}>Продолжить игру <ArrowRight size={14} /></button>
              </> : <>
                <div className="account-invite">
                  <span className="ely-coin"><span>e</span></span>
                  <div><strong>Войди через Ely.by</strong><p>Используй свой профиль, скин и авторизацию на серверах.</p></div>
                </div>
                <button className="ely-login-button" onClick={openAuth}><LockKeyhole size={15} /> Подключить аккаунт <ArrowRight size={14} /></button>
              </>}
            </section>

            <section className="setup-card">
              <div className="setup-card-heading"><div className="setup-icon"><Gauge size={16} /></div><span>СИСТЕМА ГОТОВА</span><span className="setup-status"><i /></span></div>
              <div className="setup-row"><span><Cpu size={15} /> Выделено памяти</span><strong>{appState.settings?.memoryMax || 6} ГБ</strong></div>
              <div className="setup-row"><span><Monitor size={15} /> Разрешение</span><strong>{appState.settings?.width || 1280} × {appState.settings?.height || 720}</strong></div>
              <button className="setup-settings-link" onClick={openSettings}>Настроить игру <ArrowRight size={14} /></button>
            </section>

            <section className="news-highlight">
              <div className="news-art">
                <span className="news-orb" /><span className="news-mountain mountain-one" /><span className="news-mountain mountain-two" /><span className="news-pixel-star">✦</span>
                <span className="news-art-label"><Sparkles size={11} /> ИДЕЯ ДНЯ</span>
              </div>
              <div className="news-highlight-copy"><span className="section-kicker">ТВОЯ СЛЕДУЮЩАЯ ИСТОРИЯ</span><strong>Пора построить что-то большое.</strong><button className="text-link" onClick={() => selectPage('news')}>Вдохновение <ArrowRight size={14} /></button></div>
            </section>
          </aside>
        </div>

        <div className="home-bottom-strip">
          <div className="bottom-tip-icon"><Info size={16} /></div>
          <div><strong>Первый запуск?</strong><span>Выбери версию и войди через Ely.by — мы подготовим игровые файлы автоматически.</span></div>
          <button className="text-link" onClick={() => selectPage('news')}>Как это работает <ArrowRight size={14} /></button>
        </div>
      </div>
    );
  }

  function renderLibrary() {
    const filtered = versions.filter((version) => version.id.toLowerCase().includes(librarySearch.toLowerCase()));
    return (
      <div className="page page-subpage">
        <div className="page-heading subpage-heading">
          <div><div className="eyebrow"><span className="eyebrow-spark"><Library size={13} /></span> ВЫБЕРИ СВОЙ РЕЛИЗ</div><h1>Версии Minecraft</h1><p>Официальные релизы, готовые к установке и запуску.</p></div>
          <div className="subpage-actions"><button className="outline-button" onClick={() => showToast('Список версий синхронизирован с официальным манифестом Minecraft.') }><Activity size={15} /> Синхронизировано</button></div>
        </div>
        <div className="library-toolbar"><div className="search-field"><Search size={16} /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="Найти версию…" aria-label="Найти версию" />{librarySearch && <button onClick={() => setLibrarySearch('')} aria-label="Очистить поиск"><X size={14} /></button>}</div><span className="muted-count">{filtered.length} релизов</span></div>
        <div className="release-grid">
          {filtered.map((version, index) => <article key={version.id} className={`release-card${version.id === selectedVersion ? ' release-card-selected' : ''}`}>
            <div className={`release-art release-art-${index % 4}`}><span className="release-art-moon" /><span className="release-art-block block-a" /><span className="release-art-block block-b" /><span className="release-art-block block-c" /><span className="release-art-horizon" /></div>
            <div className="release-info"><div className="release-meta"><span className="mini-tag">{version.type === 'snapshot' ? 'SNAPSHOT' : 'VANILLA'}</span>{version.id === selectedVersion && <span className="active-tag"><Check size={10} /> ВЫБРАНА</span>}</div><h3>{version.id}</h3><p>{formatReleaseDate(version.releaseTime)}</p><button className={version.id === selectedVersion ? 'release-select selected' : 'release-select'} onClick={() => { setSelectedVersion(version.id); showToast(`Minecraft ${version.id} выбрана для запуска.`); }}>{version.id === selectedVersion ? 'Выбрана' : 'Выбрать версию'}{version.id === selectedVersion ? <Check size={14} /> : <ArrowRight size={14} />}</button></div>
          </article>)}
          {!filtered.length && <div className="empty-state"><Search size={22} /><strong>Ничего не найдено</strong><span>Попробуй другой номер версии.</span></div>}
        </div>
        <div className="library-note"><ShieldCheck size={16} /><span>Файлы игры загружаются с официальных серверов Minecraft. Установка начнётся при первом запуске.</span></div>
      </div>
    );
  }

  function renderMods() {
    return (
      <div className="page page-subpage">
        <div className="page-heading subpage-heading">
          <div><div className="eyebrow"><span className="eyebrow-spark"><Package size={13} /></span> СДЕЛАЙ ИГРУ СВОЕЙ</div><h1>Моды и сборки</h1><p>Полезные проекты сообщества Minecraft, которые стоит взять на заметку.</p></div>
          <button className="outline-button" onClick={() => launcherApi.openExternal('https://modrinth.com/mods')}><ExternalLink size={15} /> Каталог Modrinth</button>
        </div>
        <div className="mods-feature">
          <div className="mods-feature-icon"><Sparkles size={24} /></div><div><span className="section-kicker">КУРАТОРСКАЯ ПОДБОРКА</span><h2>Больше кадров. Больше атмосферы.</h2><p>Лаунчер пока не меняет игровые файлы модов автоматически. Открой карточку проекта, проверь совместимость с версией игры и установи его по инструкции автора.</p></div><span className="mods-feature-version">{currentVersion?.id || selectedVersion}</span>
        </div>
        <div className="section-heading mods-list-heading"><div><div className="section-kicker">ПОПУЛЯРНОЕ У СООБЩЕСТВА</div><h2>Подборка проектов</h2></div><div className="mod-tabs"><button className={modTab === 'popular' ? 'active' : ''} onClick={() => setModTab('popular')}>Популярное</button><button className={modTab === 'performance' ? 'active' : ''} onClick={() => setModTab('performance')}>Оптимизация</button></div></div>
        <div className="mod-grid">
          {modSuggestions.filter((mod) => modTab === 'popular' || ['Sodium', 'Lithium'].includes(mod.name)).map((mod) => <article className="mod-card" key={mod.name}>
            <div className={`mod-emblem mod-emblem-${mod.color}`}><Package size={19} /></div><span className="mod-tag">{mod.tag}</span><h3>{mod.name}</h3><p>{mod.description}</p><button className="mod-open" onClick={() => launcherApi.openExternal(mod.url)}>Страница проекта <ArrowUpRight size={14} /></button>
          </article>)}
        </div>
      </div>
    );
  }

  function renderServers() {
    const filtered = savedServers.filter((server) => `${server.name} ${server.address}`.toLowerCase().includes(serverSearch.toLowerCase()));
    return (
      <div className="page page-subpage">
        <div className="page-heading subpage-heading">
          <div><div className="eyebrow"><span className="eyebrow-spark"><Globe2 size={13} /></span> ТВОИ ЛЮДИ ЖДУТ</div><h1>Мои серверы</h1><p>Храни любимые адреса и подключайся к ним сразу после запуска игры.</p></div>
          <button className="primary-small-button" onClick={() => { setServerFormOpen(true); setServerError(''); }}><Plus size={16} /> Добавить сервер</button>
        </div>
        <div className="server-summary"><div className="server-summary-icon"><Server size={19} /></div><div><strong>{savedServers.length} {savedServers.length === 1 ? 'сервер' : 'серверов'} в избранном</strong><span>Адреса сохраняются на этом устройстве.</span></div><span className="summary-signal"><i /><Wifi size={15} /></span></div>
        {savedServers.length > 0 && <div className="server-tools"><div className="search-field"><Search size={16} /><input value={serverSearch} onChange={(event) => setServerSearch(event.target.value)} placeholder="Поиск серверов…" aria-label="Поиск серверов" /></div><span className="muted-count">БЫСТРОЕ ПОДКЛЮЧЕНИЕ</span></div>}
        {filtered.length > 0 ? <div className="server-list">{filtered.map((server, index) => <article className="server-row" key={server.id}><div className={`server-cube server-cube-${index % 3}`}><Server size={18} /></div><div className="server-info"><strong>{server.name}</strong><span>{server.address}</span></div><div className="server-status-label"><i /> В избранном</div><button className="icon-button" onClick={() => copyAddress(server.address)} aria-label="Скопировать адрес" title="Скопировать адрес">{copiedAddress === server.address ? <Check size={16} /> : <Copy size={16} />}</button><button className="server-join" onClick={() => handleLaunch(server.address)}><Play size={14} fill="currentColor" /> Играть</button><button className="icon-button danger-hover" onClick={() => removeServer(server.id)} aria-label="Удалить сервер" title="Удалить сервер"><Trash2 size={15} /></button></article>)}</div> : <div className="server-empty"><div className="server-empty-art"><span /><span /><span /></div><div className="section-kicker">ТВОЁ МЕСТО ДЛЯ ПРИКЛЮЧЕНИЙ</div><h2>{savedServers.length ? 'Сервер не найден' : 'Здесь пока тихо'}</h2><p>{savedServers.length ? 'Попробуй изменить поисковый запрос.' : 'Добавь адрес любимого сервера — и запускай Minecraft прямо в мультиплеере.'}</p>{!savedServers.length && <button className="outline-button" onClick={() => setServerFormOpen(true)}><Plus size={15} /> Добавить первый сервер</button>}</div>}
        {serverFormOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setServerFormOpen(false); }}><div className="dialog-card server-dialog" role="dialog" aria-modal="true" aria-labelledby="server-dialog-title"><div className="dialog-top"><span className="dialog-icon"><Server size={17} /></span><button className="icon-button" onClick={() => setServerFormOpen(false)} aria-label="Закрыть"><X size={17} /></button></div><div className="section-kicker">ИЗБРАННОЕ</div><h2 id="server-dialog-title">Добавить сервер</h2><p className="dialog-intro">Укажи адрес — мы сохраним его в твоём списке.</p><form onSubmit={addServer} className="server-form"><label>Название сервера<input value={serverName} onChange={(event) => setServerName(event.target.value)} placeholder="Например, Друзья" maxLength={48} /></label><label>Адрес сервера<input value={serverAddress} onChange={(event) => setServerAddress(event.target.value)} placeholder="play.example.net:25565" autoFocus /></label>{serverError && <span className="form-error">{serverError}</span>}<button className="submit-button" type="submit"><Plus size={16} /> Сохранить сервер</button></form><div className="dialog-footnote"><Info size={13} /> Быстрое подключение использует версию, выбранную в лаунчере.</div></div></div>}
      </div>
    );
  }

  function renderNews() {
    const notes = [
      { tag: 'НАЧАЛО РАБОТЫ', title: 'Первый запуск без лишних шагов', text: 'Выбери официальный релиз и нажми «Играть». Lumen скачает необходимые игровые файлы при первом старте.', icon: Rocket, tint: 'violet' },
      { tag: 'АККАУНТ', title: 'Вход через Ely.by', text: 'Подключи игровой профиль Ely.by. Пароль не сохраняется; в настольной версии токен защищён системным хранилищем.', icon: ShieldCheck, tint: 'green' },
      { tag: 'ПРОИЗВОДИТЕЛЬНОСТЬ', title: 'Подбери память под свой компьютер', text: 'Оставь системе запас оперативной памяти. Для обычной игры часто достаточно 4–6 ГБ.', icon: Cpu, tint: 'amber' },
      { tag: 'МУЛЬТИПЛЕЕР', title: 'Играй с друзьями', text: 'Добавь адрес сервера в избранное — лаунчер передаст его в быстрый запуск Minecraft.', icon: UsersIcon, tint: 'blue' },
    ];
    const result = notes.filter((note) => `${note.title} ${note.text} ${note.tag}`.toLowerCase().includes(newsSearch.toLowerCase()));
    return (
      <div className="page page-subpage">
        <div className="page-heading subpage-heading"><div><div className="eyebrow"><span className="eyebrow-spark"><Newspaper size={13} /></span> НЕБОЛЬШИЕ ПОДСКАЗКИ</div><h1>Заметки Lumen</h1><p>Всё, что помогает быстрее оказаться в игре.</p></div><div className="search-field news-search"><Search size={16} /><input value={newsSearch} onChange={(event) => setNewsSearch(event.target.value)} placeholder="Поиск по заметкам…" /></div></div>
        <div className="news-page-feature"><div className="news-feature-sparkle">✦</div><span className="section-kicker">LUMEN GUIDE · 01</span><h2>У каждой большой истории<br /><em>есть маленькое начало.</em></h2><p>Подключи аккаунт, выбери любимую версию и создай новый мир.</p><button className="feature-cta" onClick={() => account ? selectPage('library') : openAuth()}>{account ? 'Выбрать версию' : 'Подключить Ely.by'} <ArrowRight size={15} /></button></div>
        <div className="note-grid">{result.map((note) => { const Icon = note.icon; return <article className="note-card" key={note.title}><div className={`note-icon note-icon-${note.tint}`}><Icon size={18} /></div><span className="section-kicker">{note.tag}</span><h3>{note.title}</h3><p>{note.text}</p></article>; })}{!result.length && <div className="empty-state"><Search size={22} /><strong>Заметки не найдены</strong><span>Попробуй другой запрос.</span></div>}</div>
      </div>
    );
  }

  function renderSettingsPage() {
    return <div className="page page-subpage"><div className="page-heading subpage-heading"><div><div className="eyebrow"><span className="eyebrow-spark"><Settings size={13} /></span> ПЕРСОНАЛЬНЫЕ НАСТРОЙКИ</div><h1>Настройки игры</h1><p>Настрой Lumen под свой компьютер и привычки.</p></div><button className="primary-small-button" onClick={handleSaveSettings} disabled={settingsSaving}>{settingsSaving ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />} Сохранить</button></div><SettingsPanel draft={settingsDraft} setDraft={setSettingsDraft} onChooseFolder={handleChooseFolder} isDesktop={launcherApi.isDesktop} /></div>;
  }

  function renderCurrentPage() {
    if (view === 'home') return renderHome();
    if (view === 'library') return renderLibrary();
    if (view === 'mods') return renderMods();
    if (view === 'servers') return renderServers();
    if (view === 'news') return renderNews();
    return renderSettingsPage();
  }

  const globalSearchResults = useMemo(() => {
    if (!searchValue.trim()) return [];
    const query = searchValue.toLowerCase();
    return [
      ...versions.filter((version) => version.id.toLowerCase().includes(query)).slice(0, 4).map((version) => ({ title: `Minecraft ${version.id}`, label: 'Версия игры', action: () => { setSelectedVersion(version.id); selectPage('library'); } })),
      ...savedServers.filter((server) => `${server.name} ${server.address}`.toLowerCase().includes(query)).slice(0, 3).map((server) => ({ title: server.name, label: server.address, action: () => selectPage('servers') })),
      ...navItems.filter((item) => item.label.toLowerCase().includes(query)).slice(0, 3).map((item) => ({ title: item.label, label: 'Раздел', action: () => selectPage(item.id) })),
    ].slice(0, 6);
  }, [searchValue, versions, savedServers]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand-lockup" onClick={() => selectPage('home')} aria-label="Lumen — главная">
          <span className="brand-symbol"><PixelMark /></span>
          <span className="brand-copy"><strong>LUMEN</strong><small>MINECRAFT LAUNCHER</small></span>
        </button>
        <button className="new-instance-button" onClick={() => { selectPage('library'); showToast('Выбери релиз, чтобы начать новую установку.'); }}><Plus size={16} strokeWidth={2.2} /><span>Новая версия</span><span className="shortcut">⌘ N</span></button>
        <div className="sidebar-section-label">БИБЛИОТЕКА</div>
        <nav className="primary-nav" aria-label="Основная навигация">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item${view === item.id ? ' active' : ''}`} onClick={() => selectPage(item.id)}><Icon size={17} strokeWidth={1.9} /><span>{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}{view === item.id && <span className="nav-active-mark" />}</button>; })}</nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-tip"><span className="tip-spark"><Sparkles size={14} /></span><div><strong>Маленькая подсказка</strong><span>Сохраняй адреса серверов для быстрого входа.</span></div></div>
        <button className={`nav-item settings-nav${view === 'settings' ? ' active' : ''}`} onClick={() => selectPage('settings')}><Settings size={17} strokeWidth={1.9} /><span>Настройки</span>{view === 'settings' && <span className="nav-active-mark" />}</button>
        <div className="sidebar-account">
          <div className="sidebar-account-top"><span className="sidebar-account-label">АККАУНТ</span><span className={`account-led${account ? ' on' : ''}`} /></div>
          {account ? <button className="sidebar-profile-button" onClick={() => setAccountMenuOpen((open) => !open)}><PixelAvatar account={account} size="small" /><span className="sidebar-profile-name"><strong>{account.username}</strong><small>Ely.by</small></span><ChevronDown size={14} /></button> : <button className="sidebar-connect-button" onClick={openAuth}><span className="sidebar-ely-icon">e</span><span>Подключить Ely.by</span><ArrowRight size={13} /></button>}
          <div className="sidebar-version-info"><span className="sidebar-version-dot" /> Minecraft Java <span>·</span> {currentVersion?.id || selectedVersion}</div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-left"><span className="topbar-context">LUMEN <ChevronRight size={12} /> <strong>{getPageTitle()}</strong></span><span className="desktop-status"><i /> {launcherApi.isDesktop ? 'Клиент готов' : 'Предпросмотр'}</span></div>
          <div className="topbar-actions">
            <div className={`global-search-wrap${searchOpen ? ' search-expanded' : ''}`}>
              {searchOpen ? <><Search size={15} /><input autoFocus value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Версии, серверы…" onKeyDown={(event) => { if (event.key === 'Escape') { setSearchOpen(false); setSearchValue(''); } }} /><button className="search-close" onClick={() => { setSearchOpen(false); setSearchValue(''); }} aria-label="Закрыть поиск"><X size={14} /></button>{searchValue && <div className="global-search-results">{globalSearchResults.length ? globalSearchResults.map((result, index) => <button key={`${result.title}-${index}`} onClick={() => { result.action(); setSearchOpen(false); setSearchValue(''); }}><span><strong>{result.title}</strong><small>{result.label}</small></span><ArrowUpRight size={14} /></button>) : <div className="search-no-results">Совпадений не найдено</div>}</div>}</> : <button className="topbar-icon-button" onClick={() => setSearchOpen(true)} aria-label="Поиск" title="Поиск"><Search size={17} /></button>}
            </div>
            <div className="topbar-popover-wrap"><button className={`topbar-icon-button${notificationOpen ? ' active' : ''}`} onClick={() => { setNotificationOpen((open) => !open); setAccountMenuOpen(false); }} aria-label="Уведомления" title="Уведомления"><Bell size={17} /><span className="notification-dot" /></button>{notificationOpen && <div className="notification-popover"><div className="popover-heading"><strong>Всё спокойно</strong><span className="popover-live"><i /> СЕЙЧАС</span></div><div className="notification-empty"><span><CheckCircle2 size={17} /></span><strong>Ты ничего не пропустил</strong><small>Когда появятся важные обновления, они будут здесь.</small></div></div>}</div>
            <span className="topbar-divider" />
            <div className="topbar-popover-wrap"><button className={`topbar-profile${account ? '' : ' topbar-profile-guest'}`} onClick={() => account ? setAccountMenuOpen((open) => !open) : openAuth()} aria-label={account ? `Аккаунт ${account.username}` : 'Войти в Ely.by'}>{account ? <><PixelAvatar account={account} size="small" /><span className="topbar-profile-name"><strong>{account.username}</strong><small>Профиль Ely.by</small></span><ChevronDown size={14} /></> : <><span className="guest-avatar"><UserRound size={16} /></span><span className="topbar-profile-name"><strong>Войти в Ely.by</strong><small>Игровой профиль</small></span><ArrowUpRight size={14} /></>}</button>{accountMenuOpen && account && <div className="account-popover"><div className="popover-account-header"><PixelAvatar account={account} /><span><strong>{account.username}</strong><small>Профиль Ely.by подключён</small></span></div><button onClick={() => { setAccountMenuOpen(false); openSettings(); }}><Settings size={15} /> Настройки игры</button><button className="logout-action" onClick={handleLogout}><LogOut size={15} /> Выйти из аккаунта</button></div>}</div>
            {launcherApi.isDesktop && <div className="window-controls"><button onClick={() => launcherApi.windowControl('minimize')} aria-label="Свернуть"><Minus size={14} /></button><button onClick={() => launcherApi.windowControl('maximize')} aria-label="Развернуть"><Maximize2 size={13} /></button><button className="window-close" onClick={() => launcherApi.windowControl('close')} aria-label="Закрыть"><X size={14} /></button></div>}
          </div>
        </header>
        <main className="main-scroll" onClick={() => { if (versionMenuOpen) setVersionMenuOpen(false); }}>
          <div className="content-wrap">{renderCurrentPage()}</div>
          <footer className="app-footer"><span>© 2026 LUMEN LAUNCHER</span><span><span className="footer-dot" /> СДЕЛАНО ДЛЯ ТВОЕГО СЛЕДУЮЩЕГО МИРА</span><button onClick={() => launcherApi.openExternal('https://docs.ely.by/en/minecraft-auth.html')}>ELY.BY AUTH <ExternalLink size={11} /></button></footer>
        </main>
      </section>

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

import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { 
  Users, 
  MessageSquare, 
  List,
  FileText,
  Settings,
  Bot,
  Download,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import type { ModulePermission } from '../types';
import { fetchSettings } from '../api/backend';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { to: '/members', icon: Users, label: 'Members', module: 'members' },
  { to: '/messaging', icon: MessageSquare, label: 'Bulk SMS', module: 'messaging' },
  { to: '/sms-logs', icon: List, label: 'SMS Logs', module: 'messaging' },
  { to: '/templates', icon: FileText, label: 'Templates', module: 'messaging' },
  { to: '/automation', icon: Bot, label: 'Automation', module: 'automation' },
  { to: '/settings', icon: Settings, label: 'Settings', module: 'settings' },
];

export function Sidebar() {
  const { isCollapsed, isMobileOpen, toggleSidebar, closeMobileSidebar } = useSidebar();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [churchName, setChurchName] = useState('ChurchCMS');
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const isIosSafari =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    /safari/i.test(window.navigator.userAgent) &&
    !/crios|fxios|edgios|opr|opera|android/i.test(window.navigator.userAgent);
  const visibleNavItems = navItems.filter((item) => !item.module || user?.modules.includes(item.module as ModulePermission));

  useEffect(() => {
    const local = localStorage.getItem('cms_settings');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed?.churchName) setChurchName(parsed.churchName);
      } catch {
        // ignore invalid local storage
      }
    }

    fetchSettings()
      .then((settings) => {
        if (settings?.churchName) {
          setChurchName(settings.churchName);
        }
      })
      .catch(() => undefined);

    const onSettingsChanged = (event: Event) => {
      const custom = event as CustomEvent<{ churchName?: string }>;
      if (custom.detail?.churchName) {
        setChurchName(custom.detail.churchName);
      }
    };

    window.addEventListener('church-settings-updated', onSettingsChanged);
    return () => window.removeEventListener('church-settings-updated', onSettingsChanged);
  }, []);

  useEffect(() => {
    const updateStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleUpdateAvailable = () => setUpdateAvailable(true);

    updateStandalone();
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', updateStandalone);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateStandalone);

    navigator.serviceWorker?.getRegistration?.().then((registration) => {
      if (registration) {
        setServiceWorkerRegistration(registration);
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', updateStandalone);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateStandalone);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== 'dismissed') {
      setInstallPrompt(null);
    }
  };

  const handleUpdate = async () => {
    const registration = serviceWorkerRegistration || (await navigator.serviceWorker?.getRegistration?.());
    if (!registration) return;

    await registration.update().catch(() => undefined);

    if (registration.waiting) {
      const waitingWorker = registration.waiting;
      const onStateChange = () => {
        if (waitingWorker.state === 'activated') {
          window.location.reload();
        }
      };

      waitingWorker.addEventListener('statechange', onStateChange);
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <aside
      className={`${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72 ${
        theme === 'dark'
          ? 'bg-linear-to-b from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800/80 shadow-xl shadow-slate-950/40'
          : 'bg-linear-to-b from-sky-50 via-white to-indigo-50 border-r border-sky-200/80 shadow-xl shadow-sky-200/30'
      } fixed inset-y-0 left-0 z-40 flex -translate-x-full flex-col overflow-x-hidden transition-all duration-300 md:relative md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : ''
      }`}
    >
      <div className={`p-6 ${theme === 'dark' ? 'border-b border-slate-800/80' : 'border-b border-sky-200/80'} ${isCollapsed ? 'md:px-4' : ''}`}>
        <div className={`flex items-center justify-between gap-3 ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'md:hidden' : 'gap-3'}`}>
            
            {(!isCollapsed || isMobileOpen) && (
              <div>
                <h1 className={`text-xl font-bold truncate max-w-42.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{churchName}</h1>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>SMS & Birthday Reminders</p>
              </div>
            )}
          </div>
          <button
            onClick={closeMobileSidebar}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all md:hidden ${
              theme === 'dark' ? 'text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:bg-sky-100'
            }`}
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSidebar}
            className={`hidden md:inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
              theme === 'dark'
                ? 'text-slate-100 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-sky-100'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={closeMobileSidebar}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'md:justify-center md:px-3 gap-3 px-4' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? theme === 'dark'
                    ? 'bg-linear-to-r from-indigo-500 to-cyan-500 text-white shadow-lg shadow-cyan-900/40'
                    : 'bg-linear-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-indigo-300/60'
                  : theme === 'dark'
                    ? 'text-slate-200 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-700 hover:bg-sky-100 hover:text-slate-900'
              }`
            }
            title={isCollapsed ? item.label : ''}
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-5 h-5 transition-colors shrink-0 ${
                    isActive
                      ? 'text-white'
                      : theme === 'dark'
                        ? 'text-slate-400 group-hover:text-slate-100'
                        : 'text-slate-500 group-hover:text-slate-900'
                  }`}
                />
                {(!isCollapsed || isMobileOpen) && (
                  <span className="font-medium text-[15px]">{item.label}</span>
                )}
                {isCollapsed && !isMobileOpen && (
                  <span
                    className={`absolute left-full ml-6 px-3 py-2 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none ${
                      theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`mt-auto border-t border-transparent ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {!isStandalone && (
          <button
            onClick={() => {
              if (installPrompt) {
                handleInstall();
                return;
              }
              if (isIosSafari) {
                setShowIosHint((prev) => !prev);
                return;
              }
            }}
            disabled={!installPrompt && !isIosSafari}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-colors ${
              isCollapsed ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
            } ${
              installPrompt
                ? theme === 'dark'
                  ? 'bg-sky-500 text-white hover:bg-sky-400'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
                : isIosSafari
                  ? theme === 'dark'
                    ? 'bg-slate-800 text-sky-100 hover:bg-slate-700'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  : theme === 'dark'
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            }`}
            title={
              installPrompt
                ? 'Install the app on your device'
                : isIosSafari
                  ? 'Install on iPhone'
                  : 'This browser does not support direct PWA install. Use Chrome or Edge.'
            }
          >
            <Download className="w-4 h-4" />
            {!isCollapsed && (
              <span>{installPrompt ? 'Install app' : isIosSafari ? 'Install on iPhone' : 'Install app'}</span>
            )}
          </button>
        )}

        {isStandalone && (
          <button
            onClick={handleUpdate}
            disabled={!updateAvailable}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition-colors ${
              isCollapsed ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
            } ${
              updateAvailable
                ? 'bg-amber-400 text-slate-900 hover:bg-amber-300'
                : theme === 'dark'
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
            }`}
            title={updateAvailable ? 'Update the installed app' : 'The app is up to date'}
          >
            <RefreshCcw className="w-4 h-4" />
            {!isCollapsed && <span>{updateAvailable ? 'Update app' : 'App installed'}</span>}
          </button>
        )}

        {!isStandalone && showIosHint && isIosSafari && (
          <div className={`mt-3 rounded-xl ${isCollapsed ? 'px-3 py-2' : 'px-4 py-3'} text-xs leading-5 shadow-sm ${
            theme === 'dark' ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-700 border border-sky-200'
          }`}>
            Tap <span className="font-semibold">Share</span>, then choose{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </div>
        )}
      </div>
    </aside>
  );
}

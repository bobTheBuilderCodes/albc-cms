import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  UserCheck, 
  MessageSquare, 
  DollarSign, 
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  UserCog,
  BellRing
} from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import type { ModulePermission } from '../types';
import { fetchSettings } from '../api/backend';
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, module: 'dashboard' },
  { to: '/members', icon: Users, label: 'Members', module: 'members' },
  { to: '/programs', icon: Calendar, label: 'Programs', module: 'programs' },
  { to: '/attendance', icon: UserCheck, label: 'Attendance', module: 'attendance' },
  { to: '/messaging', icon: MessageSquare, label: 'Messaging', module: 'messaging' },
  { to: '/finance', icon: DollarSign, label: 'Finance', module: 'finance' },
  { to: '/audit', icon: FileText, label: 'Audit Logs', module: 'audit' },
  { to: '/user-management', icon: UserCog, label: 'User Management', module: 'users' },
  { to: '/notifications-configuration', icon: BellRing, label: 'Notifications Configuration', module: 'settings' },
  { to: '/settings', icon: Settings, label: 'Settings', module: 'settings' },
];

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [churchName, setChurchName] = useState('ChurchCMS');
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

  return (
    <aside
      className={`${isCollapsed ? 'w-20' : 'w-72'} ${
        theme === 'dark'
          ? 'bg-linear-to-b from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800/80 shadow-xl shadow-slate-950/40'
          : 'bg-linear-to-b from-sky-50 via-white to-indigo-50 border-r border-sky-200/80 shadow-xl shadow-sky-200/30'
      } flex flex-col transition-all duration-300 overflow-x-hidden`}
    >
      <div className={`p-6 ${theme === 'dark' ? 'border-b border-slate-800/80' : 'border-b border-sky-200/80'} ${isCollapsed ? 'px-4' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-3'}`}>
          <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
            
            {!isCollapsed && (
              <div>
                <h1 className={`text-xl font-bold truncate max-w-42.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{churchName}</h1>
                <p className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Management System</p>
              </div>
            )}
          </div>
          <button
            onClick={toggleSidebar}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
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

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
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
                {!isCollapsed && (
                  <span className="font-medium text-[15px]">{item.label}</span>
                )}
                {isCollapsed && (
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

      
    </aside>
  );
}

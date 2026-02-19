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
  Church,
  ChevronLeft,
  ChevronRight,
  UserCog,
  BellRing
} from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';
import { useAuth } from '../contexts/AuthContext';
import type { ModulePermission } from '../types';
import { fetchSettings } from '../api/backend';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, module: 'dashboard' },
  { to: '/members', icon: Users, label: 'Members', module: 'members' },
  { to: '/programs', icon: Calendar, label: 'Programs', module: 'programs' },
  { to: '/attendance', icon: UserCheck, label: 'Attendance', module: 'attendance' },
  { to: '/messaging', icon: MessageSquare, label: 'Messaging', module: 'messaging' },
  { to: '/finance', icon: DollarSign, label: 'Finance', module: 'finance' },
  { to: '/audit', icon: FileText, label: 'Audit Logs', module: 'audit' },
  { to: '/user-management', icon: UserCog, label: 'User Management', module: 'users' },
  { to: '/notifications-configration', icon: BellRing, label: 'Notifications Configration', module: 'settings' },
  { to: '/settings', icon: Settings, label: 'Settings', module: 'settings' },
];

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { user } = useAuth();
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
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-blue-950 via-indigo-900 to-cyan-900 border-r border-cyan-800/40 flex flex-col shadow-xl shadow-blue-950/20 transition-all duration-300`}>
      <div className={`p-6 border-b border-cyan-500/20 ${isCollapsed ? 'px-4' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-11 h-11 bg-gradient-to-br from-fuchsia-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/30 flex-shrink-0">
            <Church className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl text-white font-bold truncate max-w-[190px]">{churchName}</h1>
              <p className="text-xs text-cyan-100/80 font-medium">Management System</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-fuchsia-500 to-sky-400 text-white shadow-lg shadow-fuchsia-500/35'
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`
            }
            title={isCollapsed ? item.label : ''}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-cyan-200/70 group-hover:text-cyan-100'} transition-colors flex-shrink-0`} />
                {!isCollapsed && (
                  <span className="font-medium text-[15px]">{item.label}</span>
                )}
                {isCollapsed && (
                  <span className="absolute left-full ml-6 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-cyan-500/20">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-cyan-100 hover:bg-white/10 rounded-xl transition-all"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
        {!isCollapsed && (
          <div className="text-center mt-3">
            <p className="text-xs text-cyan-100/70 font-medium">© 2026 {churchName}</p>
            <p className="text-xs text-cyan-100/50 mt-1">Version 1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}

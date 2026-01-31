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
  ChevronRight
} from 'lucide-react';
import { useSidebar } from '../contexts/SidebarContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/programs', icon: Calendar, label: 'Programs' },
  { to: '/attendance', icon: UserCheck, label: 'Attendance' },
  { to: '/messaging', icon: MessageSquare, label: 'Messaging' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
  { to: '/audit', icon: FileText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-white border-r border-neutral-200 flex flex-col shadow-sm transition-all duration-300`}>
      <div className={`p-6 border-b border-neutral-200 ${isCollapsed ? 'px-4' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 flex-shrink-0">
            <Church className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl text-neutral-900 font-bold">ChurchCMS</h1>
              <p className="text-xs text-neutral-500 font-medium">Management System</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
              }`
            }
            title={isCollapsed ? item.label : ''}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-primary-500'} transition-colors flex-shrink-0`} />
                {!isCollapsed && (
                  <span className="font-medium text-[15px]">{item.label}</span>
                )}
                {isCollapsed && (
                  <span className="absolute left-full ml-6 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-200">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-xl transition-all"
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
            <p className="text-xs text-neutral-400 font-medium">© 2026 ChurchCMS</p>
            <p className="text-xs text-neutral-300 mt-1">Version 1.0.0</p>
          </div>
        )}
      </div>
    </aside>
  );
}
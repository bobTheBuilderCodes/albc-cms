import { Bell, LogOut, User, ChevronDown, Check, Sun, Moon, Menu, Download, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import type { Notification } from '../types/notifications';
import {
  fetchMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/backend';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications().catch(() => undefined);
    // Refresh notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications().catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    updateStandalone();
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", updateStandalone);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", updateStandalone);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", updateStandalone);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", updateStandalone);
    };
  }, []);

  const loadNotifications = async () => {
    const response = await fetchMyNotifications();
    setNotifications(response.notifications);
    setUnreadCount(response.unreadCount);
  };

  const handleNotificationClick = (notification: Notification) => {
    markNotificationAsRead(notification.id).catch(() => undefined);
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, isRead: true } : n
    ));
    setUnreadCount((prev) => Math.max(0, prev - (notification.isRead ? 0 : 1)));
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setShowNotifications(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead().catch(() => undefined);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'birthday': return '🎂';
      case 'program_reminder': return '📅';
      case 'program_added': return '🗓️';
      case 'member_added': return '👤';
      case 'finance_entry': return '💸';
      case 'donation_received': return '💰';
      case 'sms_failed': return '⚠️';
      case 'attendance_low': return '📊';
      default: return '🔔';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-3 sm:px-6 shadow-sm">
      <div className="flex items-center">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2.5 text-neutral-500 bg-gray-200 hover:bg-neutral-100 rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isStandalone && (
          <>
            {installPrompt && (
              <button
                onClick={async () => {
                  await installPrompt.prompt();
                  const choice = await installPrompt.userChoice;
                  if (choice.outcome !== "dismissed") {
                    setInstallPrompt(null);
                  }
                }}
                className="md:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-sm hover:bg-blue-700 transition-colors"
                title="Install app"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            )}
            {!installPrompt && isIOS && (
              <div className="relative md:hidden">
                <button
                  onClick={() => setShowIosHint((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/80 border border-neutral-200 dark:border-slate-800 text-xs font-semibold text-neutral-700 dark:text-slate-200 shadow-sm"
                  title="How to install on iPhone"
                >
                  <Info className="w-4 h-4" />
                  Install help
                </button>
                {showIosHint && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowIosHint(false)}
                    />
                    <div className="absolute right-0 mt-2 w-64 z-20 rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shadow-xl p-3 text-xs text-neutral-700 dark:text-slate-200">
                      <p className="font-semibold mb-2">Install on iPhone</p>
                      <ol className="list-decimal pl-4 space-y-1">
                        <li>Open this site in Safari.</li>
                        <li>Tap the Share icon.</li>
                        <li>Select “Add to Home Screen”.</li>
                      </ol>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
        <button
          onClick={toggleTheme}
          className="p-2.5 text-neutral-500 bg-gray-200 hover:bg-neutral-100 rounded-xl transition-all"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowDropdown(false);
            }}
            className="relative p-2.5 text-neutral-500 bg-gray-200 hover:bg-neutral-100 rounded-xl transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-4.5 h-4.5 bg-gray-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 z-20 max-h-150 flex flex-col">
                <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-neutral-900 font-semibold">Notifications</h3>
                    <p className="text-xs text-neutral-500 font-medium">{unreadCount} unread</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto flex-1">
                  {notifications.length > 0 ? (
                    <div className="divide-y divide-neutral-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full text-left px-5 py-4 hover:bg-neutral-50 transition-colors ${
                            !notification.isRead ? 'bg-gray-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl shrink-0">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm text-neutral-900 font-semibold">{notification.title}</p>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 bg-gray-500 rounded-full shrink-0 mt-1"></span>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 font-medium line-clamp-2 mb-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-neutral-400 font-medium">
                                {getTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-5">
                      <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-500 font-medium">No notifications</p>
                      <p className="text-xs text-neutral-400 font-medium mt-1">You're all caught up!</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowDropdown(!showDropdown);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all"
          >
            <div className="w-9 h-9 bg-blue-900 from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">{user?.name.charAt(0)}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm text-neutral-900 font-semibold">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize font-medium">{user?.role}</p>
            </div>
            <ChevronDown className="hidden sm:block w-4 h-4 text-neutral-400" />
          </button>

          {showDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm text-neutral-900 font-semibold">{user?.name}</p>
                  <p className="text-xs text-neutral-500 font-medium">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/profile-settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <User className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm font-medium">Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

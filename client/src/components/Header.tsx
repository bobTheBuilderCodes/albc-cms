import { Bell, LogOut, User, ChevronDown, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { generateNotifications, markAsRead, markAllAsRead, isNotificationRead } from '../utils/notifications';
import type { Notification } from '../types/notifications';

export function Header() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const allNotifications = generateNotifications();
    const withReadStatus = allNotifications.map(n => ({
      ...n,
      isRead: isNotificationRead(n.id)
    }));
    setNotifications(withReadStatus);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setNotifications(prev => prev.map(n => 
      n.id === notification.id ? { ...n, isRead: true } : n
    ));
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setShowNotifications(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead(notifications);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'birthday': return '🎂';
      case 'program_reminder': return '📅';
      case 'member_added': return '👤';
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
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg text-neutral-900 font-semibold">Welcome back, <span className="text-primary-600">{user?.name.split(' ')[0]}</span></h2>
          <p className="text-xs text-neutral-500 font-medium">Manage your church with ease</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowDropdown(false);
            }}
            className="relative p-2.5 text-neutral-500 hover:bg-neutral-100 rounded-xl transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
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
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 z-20 max-h-[600px] flex flex-col">
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
                            !notification.isRead ? 'bg-primary-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm text-neutral-900 font-semibold">{notification.title}</p>
                                {!notification.isRead && (
                                  <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1"></span>
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
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">{user?.name.charAt(0)}</span>
            </div>
            <div className="text-left">
              <p className="text-sm text-neutral-900 font-semibold">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize font-medium">{user?.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-400" />
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
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-neutral-700 hover:bg-neutral-50 transition-colors">
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
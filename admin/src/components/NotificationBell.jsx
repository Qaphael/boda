import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../services/api';

const typeIcons = {
  rider_approved: 'check_circle',
  rider_rejected: 'cancel',
  rider_suspended: 'block',
  payment_flagged: 'flag',
  payment_released: 'check_circle',
  booking_created: 'receipt_long',
  ticket_created: 'support_agent',
  system: 'info',
};

const typeColors = {
  rider_approved: 'text-primary',
  rider_rejected: 'text-error',
  rider_suspended: 'text-error',
  payment_flagged: 'text-tertiary',
  payment_released: 'text-primary',
  booking_created: 'text-primary',
  ticket_created: 'text-tertiary',
  system: 'text-outline',
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await adminAPI.getNotifications({ limit: 20 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const handleToggle = () => {
    setOpen(!open);
    if (!open) loadNotifications();
  };

  const handleMarkRead = async (id) => {
    try {
      await adminAPI.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await adminAPI.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await adminAPI.deleteNotification(id);
      const wasUnread = notifications.find(n => n.id === id && !n.is_read);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={handleToggle} className="relative p-2 text-on-surface-variant hover:bg-surface-variant transition-all rounded-full opacity-80 active:opacity-100">
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center bg-error text-on-error text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-outline-variant rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-outline-variant flex items-center justify-between">
            <h3 className="text-headline-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-primary text-label-md hover:underline">Mark all read</button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant text-body-sm">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-3 py-2.5 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${typeColors[n.type] || 'text-outline'}`}>
                      {typeIcons[n.type] || 'info'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-body-md font-semibold text-on-surface truncate">{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>}
                      </div>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-outline">{formatTime(n.created_at)}</span>
                        {n.action_url && (
                          <a href={n.action_url} onClick={() => handleMarkRead(n.id)} className="text-[11px] text-primary hover:underline">View</a>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(n.id)} className="p-1 text-outline hover:text-on-surface rounded shrink-0">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

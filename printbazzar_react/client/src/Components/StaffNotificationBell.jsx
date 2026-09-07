import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HiOutlineBell, HiOutlineCheck, HiOutlineExclamation, HiOutlineClock } from 'react-icons/hi';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function StaffNotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/admin/staff-notifications');
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0);
        setNotifications(res.data.notifications || []);
      }
    } catch {
      // Silently catch in polling
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, notif) => {
    try {
      await api.patch(`/admin/staff-notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      // Navigate if linked to production job or order
      if (notif.productionJobId || notif.type?.includes('JOB') || notif.type?.includes('PRODUCTION')) {
        navigate('/admin/production-queue');
      } else if (notif.orderId) {
        navigate(`/admin/orders/${notif.orderId}`);
      }
      setIsOpen(false);
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/admin/staff-notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
        title="Internal Staff Notifications"
      >
        <HiOutlineBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-black animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-gray-200 z-50 overflow-hidden text-gray-900 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-3.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm">Staff Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <HiOutlineCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">
                No notifications right now. You are all caught up!
              </div>
            ) : (
              notifications.map((n) => {
                const isUrgent = n.type === 'URGENT_JOB' || n.type?.includes('ISSUE');
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n)}
                    className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-2.5 ${
                      !n.isRead ? 'bg-blue-50/50 hover:bg-blue-50 font-semibold' : 'hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isUrgent ? (
                        <span className="p-1 bg-red-100 text-red-600 rounded-full block">
                          <HiOutlineExclamation className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="p-1 bg-gray-100 text-gray-600 rounded-full block">
                          <HiOutlineBell className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`font-bold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
            <span className="text-[10px] text-gray-400 font-semibold">
              Live Factory Operational Alerts
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

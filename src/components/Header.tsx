import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import {
  Bell,
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Shield,
  Sparkles,
  User,
  Check,
  X,
  CalendarDays,
  CheckSquare,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate?: (view: string) => void;
  onOpenScanner?: () => void;
  onOpenIdCard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenScanner, onOpenIdCard }) => {
  const { user, employee, logout, quickLogin, isHR, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // All authenticated users can view notifications (employees see personal notifications, HR/Admin see operational notifications)
  const canViewNotifications = Boolean(user);

  const fetchNotifs = async () => {
    if (!canViewNotifications) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (e) {
      // Ignored
    }
  };

  const fetchAttendanceStatus = async () => {
    if (!user?.employee_id) return;
    try {
      const res = await api.getMyAttendance();
      setTodayStatus(res.todayStatus);
    } catch (e) {
      // Ignored
    }
  };

  useEffect(() => {
    if (canViewNotifications) {
      fetchNotifs();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
    fetchAttendanceStatus();
    const interval = setInterval(() => {
      if (canViewNotifications) fetchNotifs();
      fetchAttendanceStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, isHR, isAdmin]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    setMsg(null);
    try {
      await api.checkIn();
      setMsg({ text: 'Checked in successfully!', type: 'success' });
      fetchAttendanceStatus();
    } catch (e: any) {
      setMsg({ text: e.message || 'Check-in failed', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    setMsg(null);
    try {
      await api.checkOut();
      setMsg({ text: 'Checked out successfully!', type: 'success' });
      fetchAttendanceStatus();
    } catch (e: any) {
      setMsg({ text: e.message || 'Check-out failed', type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
    } catch (e) {}
  };

  const handleMarkDone = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.markNotificationDone(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_done: true, is_read: true, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (!notif.is_read && !notif.read) {
      await api.markNotificationRead(notif.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? { ...n, is_read: true, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotifs(false);
    if (!onNavigate) return;

    if (notif.type === 'leave' || notif.reference_type === 'LEAVE') {
      onNavigate('leave');
    } else if (
      notif.type === 'late' ||
      notif.type === 'absence_alert' ||
      notif.reference_type === 'ATTENDANCE' ||
      notif.reference_type === 'CONSECUTIVE_ABSENCE'
    ) {
      onNavigate('attendance');
    } else if (notif.type === 'task' || notif.reference_type === 'TASK') {
      onNavigate('tasks');
    } else {
      onNavigate('employees');
    }
  };

  const isCheckedIn = todayStatus?.isCheckedIn;
  const isCheckedOut = todayStatus?.isCheckedOut;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 lg:px-8 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Current View Title */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight text-white capitalize">
              {currentView.replace('-', ' ')}
            </h1>
            <span className="text-xs text-slate-400 font-medium">
              Dayflow Intelligent HRMS • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Center: Live Check-in / Check-out quick widget for current employee */}
        <div className="hidden md:flex items-center gap-3 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-inner">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-2.5 w-2.5">
              {isCheckedIn ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              )}
            </span>
            <span className="font-medium text-slate-300">
              {isCheckedIn
                ? `Active Session: Checked in at ${new Date(todayStatus?.record?.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : isCheckedOut
                ? 'Session Completed for Today'
                : 'Not Checked In Today'}
            </span>
          </div>

          {!isCheckedIn && !isCheckedOut && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow disabled:opacity-50"
            >
              <LogIn className="w-3.5 h-3.5" />
              Check In
            </button>
          )}

          {isCheckedIn && (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              Check Out
            </button>
          )}
        </div>

        {/* Right: Quick actions & Demo Switcher & Notifications & Profile */}
        <div className="flex items-center gap-2.5">
          {/* Quick Demo Switcher Dropdown */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700/60 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 ml-1" />
            <span className="text-slate-400 font-medium mr-1">Demo Persona:</span>
            <select
              aria-label="Demo Persona Switcher"
              className="bg-slate-900 text-xs text-slate-200 rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              value={
                user?.email === 'admin@dayflow.com' ? 'admin' :
                user?.email === 'hr@dayflow.com' ? 'hr' :
                user?.email === 'aarav.sharma@dayflow.com' ? 'emp1001' :
                user?.email === 'rohan.verma@dayflow.com' ? 'emp1004_low_activity' :
                user?.email === 'priya.nair@dayflow.com' ? 'emp1005_late' :
                user?.email === 'vikram.patel@dayflow.com' ? 'emp1009_absence' : 'custom'
              }
              onChange={(e) => quickLogin(e.target.value as any)}
            >
              <option value="admin">Admin (Full Control)</option>
              <option value="hr">HR Manager (Approvals & Reviews)</option>
              <option value="emp1001">EMP1001 Aarav (Top Performer)</option>
              <option value="emp1004_low_activity">EMP1004 Rohan (Low Activity Alert)</option>
              <option value="emp1005_late">EMP1005 Priya (Repeated Late 1% Penalty)</option>
              <option value="emp1009_absence">EMP1009 Vikram (3-Day Absence Alert)</option>
            </select>
          </div>

          {/* QR Scanner Trigger */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              title="Open QR / Barcode Scanner"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>
          )}

          {/* My ID Card Badge */}
          {employee && onOpenIdCard && (
            <button
              onClick={onOpenIdCard}
              title="View & Print Employee ID Badge"
              className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>ID Card</span>
            </button>
          )}

          {/* Notifications Dropdown: STRICTLY HR & ADMIN ONLY */}
          {canViewNotifications && (
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                title="HR Operational Notifications"
              >
                <Bell className="w-4 h-4 text-indigo-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span className="font-semibold text-sm text-white">HR Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-medium"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No operational notifications at this time.
                      </div>
                    ) : (
                      notifications.slice(0, 15).map((n) => {
                        const isUnread = !n.is_read && !n.read;
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleItemClick(n)}
                            className={`p-3 text-xs transition cursor-pointer hover:bg-slate-800/80 ${
                              isUnread ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : 'opacity-80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                                {n.type === 'leave' && <CalendarDays className="w-3.5 h-3.5 text-amber-400" />}
                                {n.type === 'late' && <Clock className="w-3.5 h-3.5 text-orange-400" />}
                                {n.type === 'absence_alert' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                                {n.type === 'task' && <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />}
                                <span>{n.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-slate-300 mt-1 leading-relaxed line-clamp-2 whitespace-pre-line">
                              {n.message}
                            </p>

                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                              <span className="text-[10px] text-indigo-400 font-medium flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Click to view details
                              </span>
                              {!n.is_done ? (
                                <button
                                  onClick={(e) => handleMarkDone(e, n.id)}
                                  className="text-[10px] bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-medium transition"
                                >
                                  Mark Done
                                </button>
                              ) : (
                                <span className="text-[10px] text-emerald-400 font-medium">✓ Done</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {onNavigate && (
                    <div className="p-2.5 bg-slate-800/60 border-t border-slate-700 text-center">
                      <button
                        onClick={() => {
                          setShowNotifs(false);
                          onNavigate('notifications');
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                      >
                        View Notification Center →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action feedback toast */}
      {msg && (
        <div
          className={`mt-2 text-xs py-1.5 px-3 rounded-lg flex items-center justify-between gap-2 ${
            msg.type === 'success' ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200' : 'bg-rose-950/80 border border-rose-700 text-rose-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
};

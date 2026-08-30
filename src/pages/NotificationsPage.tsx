import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarDays,
  CheckSquare,
  ShieldAlert,
  Search,
  Check,
  ExternalLink,
  RefreshCw,
  Filter,
  CheckCheck,
  Sparkles,
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigate?: (view: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterTab, setFilterTab] = useState<'ALL' | 'UNREAD' | 'PENDING' | 'DONE'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkDone = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.markNotificationDone(id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === id
            ? {
                ...n,
                is_done: true,
                is_read: true,
                read: true,
                done_at: new Date().toISOString(),
              }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification done:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleNavigateToSource = (notif: NotificationItem) => {
    if (!notif.is_read) {
      handleMarkRead(notif.id);
    }
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

  const filtered = notifications.filter(n => {
    // Tab filter
    if (filterTab === 'UNREAD' && (n.is_read || n.read)) return false;
    if (filterTab === 'PENDING' && n.is_done) return false;
    if (filterTab === 'DONE' && !n.is_done) return false;

    // Type filter
    if (typeFilter !== 'ALL' && n.type !== typeFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchEmp = n.employee_name?.toLowerCase().includes(q) || n.employee_code?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchEmp) return false;
    }

    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return <CalendarDays className="w-4 h-4 text-amber-400" />;
      case 'late':
        return <Clock className="w-4 h-4 text-orange-400" />;
      case 'absence_alert':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'leave':
        return <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">Leave Request</span>;
      case 'late':
        return <span className="text-[10px] bg-orange-500/10 text-orange-300 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium">Late Arrival</span>;
      case 'absence_alert':
        return <span className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded-full font-medium">Absence Alert</span>;
      case 'task':
        return <span className="text-[10px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium">Task Completed</span>;
      default:
        return <span className="text-[10px] bg-slate-500/10 text-slate-300 border border-slate-500/20 px-2 py-0.5 rounded-full font-medium">System Alert</span>;
    }
  };

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    pending: notifications.filter(n => !n.is_done).length,
    done: notifications.filter(n => n.is_done).length,
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              HR Notification Center
              {unreadCount > 0 && (
                <span className="text-xs bg-rose-500 text-white font-bold px-2.5 py-0.5 rounded-full shadow">
                  {unreadCount} Unread
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly confidential operational alerts for Leaves, Attendance Exceptions, Absence Flags, and Employee Updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-xl text-xs font-semibold transition"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl text-xs font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => setFilterTab('ALL')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === 'ALL'
              ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-slate-400">Total Alerts</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => setFilterTab('UNREAD')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === 'UNREAD'
              ? 'bg-rose-950/40 border-rose-500/50 shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-rose-400">Unread</div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{stats.unread}</div>
        </div>

        <div
          onClick={() => setFilterTab('PENDING')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === 'PENDING'
              ? 'bg-amber-950/40 border-amber-500/50 shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-amber-400">Action Pending</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{stats.pending}</div>
        </div>

        <div
          onClick={() => setFilterTab('DONE')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            filterTab === 'DONE'
              ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-emerald-400">Completed / Done</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1">{stats.done}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search alerts by employee name, code, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 text-xs text-slate-200 pl-9 pr-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Type Filter Select */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by notification type"
            className="bg-slate-900 text-xs text-slate-200 px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Event Types</option>
            <option value="leave">Leave Requests</option>
            <option value="late">Late Check-ins</option>
            <option value="absence_alert">3-Day Absence Alerts</option>
            <option value="task">Task Updates</option>
            <option value="system">System Alerts</option>
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <p className="text-xs">Loading operational alerts...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-800 rounded-full text-slate-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">No alerts found</p>
              <p className="text-xs text-slate-400 mt-1">
                {filterTab === 'UNREAD'
                  ? 'All notifications have been read.'
                  : 'No notification records match your filter criteria.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((item) => {
              const isUnread = !item.is_read && !item.read;
              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isUnread
                      ? 'bg-indigo-950/20 border-l-4 border-indigo-500'
                      : 'hover:bg-slate-800/30'
                  }`}
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="p-2.5 bg-slate-800 rounded-xl shrink-0 mt-0.5">
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-100">{item.title}</span>
                        {getTypeBadge(item.type)}
                        {isUnread && (
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.2 rounded font-semibold">
                            NEW
                          </span>
                        )}
                        {item.is_done && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed font-normal">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                        <span>
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {item.employee_code && (
                          <span>
                            Employee ID: <strong className="text-slate-300">{item.employee_code}</strong>
                          </span>
                        )}
                        {item.department && (
                          <span>
                            Dept: <strong className="text-slate-300">{item.department}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Deep link button */}
                    <button
                      onClick={() => handleNavigateToSource(item)}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      title="Open related module"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Review</span>
                    </button>

                    {/* Mark as read */}
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 px-2.5 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Mark Read</span>
                      </button>
                    )}

                    {/* Mark as done */}
                    {!item.is_done ? (
                      <button
                        onClick={() => handleMarkDone(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
                        title="Mark action as completed"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Done</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-medium px-2 py-1 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

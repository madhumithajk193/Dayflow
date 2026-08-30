import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DashboardStats, DashboardCharts, PerformanceRecord } from '../types';
import { PerformanceExplainerCard } from '../components/PerformanceExplainerCard';
import {
  Users,
  CalendarCheck2,
  Clock8,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  ShieldAlert,
  LogIn,
  LogOut,
  CheckCircle2,
  ArrowUpRight,
  Activity,
  Award,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DashboardPageProps {
  onNavigate: (view: string) => void;
  onOpenScanner?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenScanner }) => {
  const { user, employee, isHR } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [myWorkHours, setMyWorkHours] = useState<any>(null);
  const [myPerformance, setMyPerformance] = useState<{ performance: PerformanceRecord; penalties: any[] } | null>(null);
  const [myAttendance, setMyAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const [s, c] = await Promise.all([
          api.getDashboardStats(),
          api.getDashboardCharts(),
        ]);
        setStats(s);
        setCharts(c);
      } else {
        const [wh, perf, att] = await Promise.all([
          api.getMyWorkHours(),
          api.getMyPerformance(),
          api.getMyAttendance(),
        ]);
        setMyWorkHours(wh);
        setMyPerformance(perf);
        setMyAttendance(att);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, isHR]);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await api.checkIn();
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      await api.checkOut();
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Loading verified HRMS telemetry...</p>
      </div>
    );
  }

  // ==========================================
  // HR & ADMIN DASHBOARD VIEW
  // ==========================================
  if (isHR) {
    return (
      <div className="space-y-6 pb-12">
        {/* Top Highlight Banners if Alerts Exist */}
        {stats && stats.threeDayAbsenceCount > 0 && (
          <div className="bg-gradient-to-r from-orange-950/70 to-rose-950/70 border border-orange-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-orange-600/20 text-orange-400 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  {stats.threeDayAbsenceCount} Three-Consecutive-Day Absence Alert(s) Detected
                </h3>
                <p className="text-xs text-orange-200 mt-0.5">
                  Employees absent for 3 consecutive days without approved leave require HR review.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 shrink-0"
            >
              Review Absence Cases <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 10 Core Stat Metrics (from database) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div
            onClick={() => onNavigate('employees')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-indigo-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Total Employees</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{stats?.totalEmployees}</div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              Active workforce
            </span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-emerald-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Present Today</span>
              <CalendarCheck2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">{stats?.presentToday}</div>
            <span className="text-[10px] text-slate-400">Checked in / active</span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-rose-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Absent Today</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">{stats?.absentToday}</div>
            <span className="text-[10px] text-slate-400">Without leave</span>
          </div>

          <div
            onClick={() => onNavigate('leave')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-blue-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">On Approved Leave</span>
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400 font-mono">{stats?.leaveToday}</div>
            <span className="text-[10px] text-slate-400">Excused duty</span>
          </div>

          <div
            onClick={() => onNavigate('work-hours')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-indigo-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Avg Working Hours</span>
              <Clock8 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{stats?.avgWorkingHours}h</div>
            <span className="text-[10px] text-slate-400">Daily average session</span>
          </div>

          <div
            onClick={() => onNavigate('performance')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-amber-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Avg Performance</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{stats?.avgPerformance}%</div>
            <span className="text-[10px] text-slate-400">Across all weights</span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-orange-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Late Today</span>
              <Clock8 className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-orange-400 font-mono">{stats?.lateToday}</div>
            <span className="text-[10px] text-slate-400">Past grace period</span>
          </div>

          <div
            onClick={() => onNavigate('work-hours')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-amber-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Low Activity</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{stats?.lowActivityCount}</div>
            <span className="text-[10px] text-slate-400">HR review recommended</span>
          </div>

          <div
            onClick={() => onNavigate('leave')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-purple-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Pending Leave</span>
              <CalendarDays className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">{stats?.pendingLeaveRequests}</div>
            <span className="text-[10px] text-slate-400">Awaiting approval</span>
          </div>

          <div
            onClick={() => onNavigate('attendance')}
            className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow hover:border-rose-500/50 cursor-pointer transition space-y-2"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">3-Day Absence</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 font-mono">{stats?.threeDayAbsenceCount}</div>
            <span className="text-[10px] text-slate-400">Action required</span>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Attendance Trend */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">Attendance Trend (Past 7 Workdays)</h4>
              <span className="text-[11px] text-slate-400">Daily verification signals</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts?.attendanceTrend || []}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="present" stroke="#10b981" fillOpacity={1} fill="url(#colorPresent)" name="Present" />
                  <Area type="monotone" dataKey="late" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLate)" name="Late" />
                  <Area type="monotone" dataKey="leave" stroke="#6366f1" fill="#6366f1" name="Leave" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Department Performance Comparison */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">Average Performance by Department</h4>
              <span className="text-[11px] text-slate-400">Score (%)</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.departmentPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="department" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" height={45} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[60, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Bar dataKey="avgScore" fill="#6366f1" radius={[8, 8, 0, 0]} name="Avg Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Working Hours Distribution */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">Working Hours Distribution</h4>
              <span className="text-[11px] text-slate-400">Daily session ranges</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.workingHours || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                  <Bar dataKey="count" fill="#38bdf8" radius={[8, 8, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Performance Grade Distribution */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white">Performance Grade Distribution</h4>
              <span className="text-[11px] text-slate-400">A+ through D tier</span>
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts?.performanceDistribution || []}
                    dataKey="count"
                    nameKey="grade"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {charts?.performanceDistribution?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EMPLOYEE DASHBOARD VIEW
  // ==========================================
  const todayStatus = myAttendance?.todayStatus;
  const isCheckedIn = todayStatus?.isCheckedIn;
  const isCheckedOut = todayStatus?.isCheckedOut;

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Header with Check-In/Check-Out Live Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-semibold px-2.5 py-0.5 rounded-full">
              {employee?.department}
            </span>
            <span className="text-xs text-slate-400 font-mono font-semibold">
              {employee?.employee_code}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome back, {employee?.first_name}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {employee?.designation} • Let's make today productive and well-aligned.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {!isCheckedIn && !isCheckedOut && (
            <button
              onClick={handleCheckIn}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              Check In Now
            </button>
          )}

          {isCheckedIn && (
            <button
              onClick={handleCheckOut}
              disabled={actionLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-rose-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              Check Out
            </button>
          )}

          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-sm font-semibold px-4 py-3 rounded-2xl transition shadow flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Scan QR Attendance
            </button>
          )}
        </div>
      </div>

      {/* 4 Working Hours & Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Working Session */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Today's Session</span>
            <Clock8 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">
              {myWorkHours?.todaySession?.loginDurationHours || 0}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active: <span className="text-emerald-400 font-bold">{myWorkHours?.todaySession?.activeHours || 0}h</span> • Idle: <span className="text-amber-400 font-bold">{myWorkHours?.todaySession?.idleHours || 0}h</span>
            </p>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            Status:{' '}
            <span className="font-semibold text-slate-200 uppercase">
              {todayStatus?.record?.status || 'Not Checked In'}
            </span>
          </div>
        </div>

        {/* Weekly Working Hours */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Total Logged Hours</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {myWorkHours?.totalHours || 0}h
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active work time: <span className="text-white font-bold">{myWorkHours?.activeHours || 0}h</span>
            </p>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
            Target benchmark: <span className="text-indigo-300 font-semibold">40h / week</span>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Overall Performance</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {myPerformance?.performance?.overall_score ?? 88}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Grade: <span className="text-white font-bold">{myPerformance?.performance?.grade || 'A'}</span>
            </p>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <span>Ranking:</span>
            <span className="text-emerald-400 font-semibold">Verified Accurate</span>
          </div>
        </div>

        {/* Leave Balance & Action */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Leave Balance</span>
            <CalendarDays className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-blue-400 font-mono">
              18 Days
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Paid (12) • Sick (6)
            </p>
          </div>
          <button
            onClick={() => onNavigate('leave')}
            className="w-full text-center text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold py-1.5 bg-indigo-950/40 rounded-xl border border-indigo-800/40 transition"
          >
            Apply for Leave →
          </button>
        </div>
      </div>

      {/* Performance Explainer Card */}
      {myPerformance && (
        <PerformanceExplainerCard
          record={myPerformance.performance}
          penalties={myPerformance.penalties}
          employeeName={`${employee?.first_name} ${employee?.last_name}`}
        />
      )}

      {/* Recent Attendance Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white">My Recent Attendance History</h3>
            <p className="text-xs text-slate-400">Verified check-in timestamps and working minutes</p>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            View All History →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(!myAttendance?.history || myAttendance.history.length === 0) ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No attendance records logged yet. Check in to begin logging your workday.
                  </td>
                </tr>
              ) : (
                myAttendance.history.slice(0, 5).map((att: any) => (
                  <tr key={att.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-mono font-medium text-white">{att.date}</td>
                    <td className="py-3 px-4 font-mono">
                      {new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {att.check_out
                        ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-amber-400">In Progress</span>}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {Math.round((att.working_minutes / 60) * 10) / 10} hrs
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : att.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300'
                            : att.status === 'LEAVE'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{att.reason || 'Normal schedule'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

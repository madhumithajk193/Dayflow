import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Attendance, ThreeDayAbsenceAlert } from '../types';
import {
  CalendarCheck2,
  Calendar,
  Filter,
  AlertTriangle,
  ShieldAlert,
  Clock8,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCheck,
  Sparkles,
  FileText,
  Send,
  Check,
  AlertCircle,
  Edit3,
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { isHR, user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [threeDayAlerts, setThreeDayAlerts] = useState<ThreeDayAbsenceAlert[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Review states per employee alert
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});
  const [actionTakens, setActionTakens] = useState<{ [key: string]: string }>({});
  const [submittingReview, setSubmittingReview] = useState<{ [key: string]: boolean }>({});
  const [reviewErrors, setReviewErrors] = useState<{ [key: string]: string | null }>({});
  const [reviewSuccess, setReviewSuccess] = useState<{ [key: string]: string | null }>({});
  const [editingReview, setEditingReview] = useState<{ [key: string]: boolean }>({});
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('ALL');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const [att, alerts] = await Promise.all([
          api.getAllAttendance({
            date: selectedDate || undefined,
            department: department !== 'ALL' ? department : undefined,
            status: statusFilter !== 'ALL' ? statusFilter : undefined,
          }),
          api.getThreeDayAlerts(),
        ]);
        setAttendances(att);
        setThreeDayAlerts(alerts);

        // Pre-populate reviewNotes with existing review notes if available
        const initialNotes: { [key: string]: string } = {};
        const initialActions: { [key: string]: string } = {};
        for (const alert of alerts) {
          if (alert.review?.review_note) {
            initialNotes[alert.employee.id] = alert.review.review_note;
          }
          if (alert.review?.action_taken) {
            initialActions[alert.employee.id] = alert.review.action_taken;
          }
        }
        setReviewNotes(prev => ({ ...initialNotes, ...prev }));
        setActionTakens(prev => ({ ...initialActions, ...prev }));
      } else {
        const res = await api.getMyAttendance();
        setAttendances(res.history);
      }
    } catch (e) {
      console.error('Error loading attendance records:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, department, statusFilter, isHR]);

  const handleLogHRReview = async (alert: ThreeDayAbsenceAlert) => {
    const empId = alert.employee.id;
    const note = (reviewNotes[empId] || '').trim();

    if (!note) {
      setReviewErrors(prev => ({ ...prev, [empId]: 'Review note is required before logging HR review.' }));
      return;
    }

    setReviewErrors(prev => ({ ...prev, [empId]: null }));
    setReviewSuccess(prev => ({ ...prev, [empId]: null }));
    setSubmittingReview(prev => ({ ...prev, [empId]: true }));

    try {
      const actionTaken = actionTakens[empId] || 'HR_NOTE_LOGGED';
      await api.logAbsenceReview({
        employee_id: empId,
        review_note: note,
        alert_id: alert.id || alert.alert_id,
        absent_dates: alert.absentDates,
        consecutive_days: alert.consecutiveDays,
        action_taken: actionTaken,
      });

      setReviewSuccess(prev => ({ ...prev, [empId]: 'HR review logged successfully.' }));
      setEditingReview(prev => ({ ...prev, [empId]: false }));

      // Refresh alerts and attendance data from backend to ensure persistent state
      await fetchAttendance();
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to save HR review. Please check your connection and try again.';
      setReviewErrors(prev => ({ ...prev, [empId]: errMsg }));
    } finally {
      setSubmittingReview(prev => ({ ...prev, [empId]: false }));
    }
  };

  const departments = ['ALL', 'Engineering', 'Product', 'Design & UX', 'Human Resources', 'Operations', 'Sales & Growth'];

  const filteredAlerts = threeDayAlerts.filter(a => {
    if (alertFilter === 'PENDING') return a.reviewStatus === 'REQUIRES_HR_REVIEW';
    if (alertFilter === 'REVIEWED') return a.reviewStatus === 'REVIEWED' || a.reviewStatus === 'RESOLVED';
    return true;
  });

  const pendingAlertsCount = threeDayAlerts.filter(a => a.reviewStatus === 'REQUIRES_HR_REVIEW').length;
  const reviewedAlertsCount = threeDayAlerts.filter(a => a.reviewStatus === 'REVIEWED' || a.reviewStatus === 'RESOLVED').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Attendance Management</h2>
          <p className="text-xs text-slate-400">
            Automated check-in timestamps, late arrival detection, and consecutive absence monitoring
          </p>
        </div>
        <button
          onClick={fetchAttendance}
          disabled={loading}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Records
        </button>
      </div>

      {/* 3-Day Consecutive Absence Alerts Panel (For HR/Admin) */}
      {isHR && threeDayAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-rose-950/40 border border-rose-600/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-600/20 text-rose-400 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Three Consecutive Days Absence Alerts
                  </h3>
                  {pendingAlertsCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {pendingAlertsCount} Action Required
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-200">
                  Ethical HR Alert: System detected 3+ consecutive unexcused absences without prior approved leave. HR review is required before administrative action.
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setAlertFilter('ALL')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  alertFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({threeDayAlerts.length})
              </button>
              <button
                onClick={() => setAlertFilter('PENDING')}
                className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  alertFilter === 'PENDING' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Requires Review ({pendingAlertsCount})
              </button>
              <button
                onClick={() => setAlertFilter('REVIEWED')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  alertFilter === 'REVIEWED' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reviewed ({reviewedAlertsCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {filteredAlerts.map((alert) => {
              const empId = alert.employee.id;
              const isReviewed = alert.reviewStatus === 'REVIEWED' || alert.reviewStatus === 'RESOLVED' || !!alert.review;
              const isEditing = editingReview[empId] ?? !isReviewed;
              const isSubmitting = !!submittingReview[empId];
              const error = reviewErrors[empId];
              const successMsg = reviewSuccess[empId];

              return (
                <div
                  key={alert.id || alert.employee.id}
                  className={`p-5 rounded-2xl border transition space-y-3.5 ${
                    isReviewed
                      ? 'bg-slate-950/90 border-emerald-800/60 shadow-lg'
                      : 'bg-slate-950/90 border-rose-800/70 shadow-xl'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={alert.employee?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                        alt={alert.employee?.first_name || 'Employee'}
                        className={`w-11 h-11 rounded-full object-cover ring-2 ${
                          isReviewed ? 'ring-emerald-500' : 'ring-rose-500'
                        }`}
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white">
                          {alert.employee?.first_name || 'Employee'} {alert.employee?.last_name || ''}
                        </h4>
                        <p className="text-xs text-slate-400 font-mono">
                          {alert.employee?.employee_code || 'EMP'} • {alert.employee?.department || 'General'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold bg-rose-900/60 text-rose-200 px-2 py-0.5 rounded border border-rose-700">
                        {alert.consecutiveDays} Consecutive Days Absent
                      </span>
                      {isReviewed ? (
                        <span className="text-[10px] font-semibold bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HR Review Logged
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded-full border border-rose-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400" /> REQUIRES_HR_REVIEW
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Absent Dates:</span>
                      <span className="font-mono text-rose-300 font-semibold text-[11px]">
                        {alert.absentDates.join(', ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Approved Leave Records:</span>
                      <span className="text-slate-400 font-medium text-[11px]">None Found in Attendance DB</span>
                    </div>
                  </div>

                  {/* Existing Review Info if logged */}
                  {isReviewed && alert.review && !isEditing && (
                    <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Logged HR Review Note
                        </span>
                        <button
                          onClick={() => {
                            setEditingReview(prev => ({ ...prev, [empId]: true }));
                            setReviewNotes(prev => ({ ...prev, [empId]: alert.review?.review_note || '' }));
                          }}
                          className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" /> Edit Note
                        </button>
                      </div>
                      <p className="text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed font-sans">
                        "{alert.review.review_note}"
                      </p>
                      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-1 pt-0.5">
                        <span>Reviewed By: <strong className="text-slate-300">{alert.review.reviewed_by}</strong></span>
                        <span>{new Date(alert.review.reviewed_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    </div>
                  )}

                  {/* Review Form (for new or editing reviews) */}
                  {(!isReviewed || isEditing) && (
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          {isReviewed ? 'Update HR Review Note:' : 'HR Review Note (Required):'}
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Document HR findings (e.g. Reached out via phone; employee was hospitalised and will submit medical certificate)..."
                          value={reviewNotes[empId] ?? ''}
                          onChange={(e) => {
                            setReviewNotes({ ...reviewNotes, [empId]: e.target.value });
                            if (reviewErrors[empId]) {
                              setReviewErrors(prev => ({ ...prev, [empId]: null }));
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <select
                          value={actionTakens[empId] || 'HR_NOTE_LOGGED'}
                          onChange={(e) => setActionTakens({ ...actionTakens, [empId]: e.target.value })}
                          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
                        >
                          <option value="HR_NOTE_LOGGED">Action: Documented Note</option>
                          <option value="CONTACTED_EMPLOYEE">Action: Contacted Employee</option>
                          <option value="MEDICAL_LEAVE_PENDING">Action: Medical Leave Awaited</option>
                          <option value="SHOW_CAUSE_NOTICE">Action: Formal Inquiry Initiated</option>
                        </select>

                        <div className="flex items-center gap-2">
                          {isReviewed && (
                            <button
                              type="button"
                              onClick={() => setEditingReview(prev => ({ ...prev, [empId]: false }))}
                              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 transition"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleLogHRReview(alert)}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {isSubmitting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Review...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" /> {isReviewed ? 'Update Review' : 'Log HR Review'}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Feedback Banners */}
                  {error && (
                    <div className="bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs p-2.5 rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="bg-emerald-950/80 border border-emerald-700/80 text-emerald-200 text-xs p-2.5 rounded-xl flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Date Selection Toolbar */}
      {isHR && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-300 font-semibold">Date Filter:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Department:</span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-900">All Statuses</option>
                <option value="PRESENT" className="bg-slate-900">Present</option>
                <option value="LATE" className="bg-slate-900">Late</option>
                <option value="LEAVE" className="bg-slate-900">On Leave</option>
                <option value="ABSENT" className="bg-slate-900">Absent</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                {isHR && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Check In</th>
                <th className="py-3.5 px-4">Check Out</th>
                <th className="py-3.5 px-4">Late Delay</th>
                <th className="py-3.5 px-4">Work Duration</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading attendance records...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No attendance records for the selected date and filters.
                  </td>
                </tr>
              ) : (
                attendances.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/50 transition">
                    {isHR && (
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={att.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt="avatar"
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {att.employee_name || att.employee_id}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {att.employee_code} • {att.department}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 font-mono font-medium text-white">{att.date}</td>

                    <td className="py-3 px-4 font-mono">
                      {att.status === 'ABSENT' ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {att.check_out ? (
                        new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      ) : att.status === 'ABSENT' ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span className="text-amber-400">In Progress</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {att.late_minutes > 0 ? (
                        <span className="text-amber-400 font-bold">+{att.late_minutes} mins</span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">On Time</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {Math.round((att.working_minutes / 60) * 10) / 10} hrs
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          att.status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : att.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : att.status === 'LEAVE'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {att.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {att.reason || (att.status === 'PRESENT' ? 'Normal office arrival' : 'N/A')}
                    </td>
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

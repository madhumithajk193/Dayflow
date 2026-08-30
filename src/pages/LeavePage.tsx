import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeaveRequest } from '../types';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const LeavePage: React.FC = () => {
  const { isHR, user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Apply Leave Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'PAID' as const,
    start_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    end_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
    reason: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Review Modal for HR
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const data = await api.getAllLeaves({
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        });
        setLeaves(data);
      } else {
        const data = await api.getMyLeaves();
        setLeaves(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter, isHR]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await api.applyLeave(formData);
      setShowApplyModal(false);
      setFormData({
        leave_type: 'PAID',
        start_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        reason: '',
      });
      fetchLeaves();
    } catch (err: any) {
      setModalError(err.message || 'Failed to submit leave request');
    } finally {
      setModalLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewingLeave) return;
    setReviewLoading(true);
    try {
      await api.reviewLeave(reviewingLeave.id, {
        status: reviewAction,
        review_comments: reviewComment,
      });
      setReviewingLeave(null);
      setReviewComment('');
      fetchLeaves();
    } catch (e) {
      console.error(e);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Leave Management Portal</h2>
          <p className="text-xs text-slate-400">
            Automated absence justification and multi-day calendar leave workflow
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow shadow-indigo-600/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Apply for Leave
        </button>
      </div>

      {/* Leave Balances Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Paid Leave Balance</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">12 Days</div>
          <span className="text-[10px] text-slate-500">Accrued annually</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Sick Leave</span>
          <div className="text-2xl font-black text-blue-400 font-mono mt-1">6 Days</div>
          <span className="text-[10px] text-slate-500">Medical / Health</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Casual Leave</span>
          <div className="text-2xl font-black text-indigo-400 font-mono mt-1">5 Days</div>
          <span className="text-[10px] text-slate-500">Personal emergencies</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
          <span className="text-[10px] text-slate-400 font-semibold uppercase block">Pending Approvals</span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-1">
            {leaves.filter((l) => l.status === 'PENDING').length}
          </div>
          <span className="text-[10px] text-slate-500">In HR review queue</span>
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">
            {isHR ? 'All Employee Leave Applications' : 'My Leave Application History'}
          </h3>

          {isHR && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                aria-label="Filter by leave status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                {isHR && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Leave Type</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4">Days</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">HR Comments</th>
                {isHR && <th className="py-3.5 px-4 text-right">Review</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading leave records...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-800/50 transition">
                    {isHR && (
                      <td className="py-3 px-4">
                        <span className="font-bold text-white text-xs block">
                          {leave.employee_name || leave.employee_id}
                        </span>
                      </td>
                    )}

                    <td className="py-3 px-4">
                      <span className="font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                        {leave.leave_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {leave.start_date} → {leave.end_date}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {leave.days_count} {leave.days_count === 1 ? 'day' : 'days'}
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                      {leave.reason}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          leave.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          leave.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {leave.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3" />}
                        {leave.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {leave.status === 'PENDING' && <Clock className="w-3 h-3" />}
                        {leave.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px] italic">
                      {leave.review_comments || 'Pending assessment'}
                    </td>

                    {isHR && (
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setReviewingLeave(leave);
                              setReviewAction('APPROVED');
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs transition shadow"
                          >
                            Review & Decide
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-white">Apply for Leave</h3>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="m-4 p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleApply} className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Leave Category</label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PAID">Paid Annual Leave (12 remaining)</option>
                  <option value="SICK">Sick / Medical Leave (6 remaining)</option>
                  <option value="CASUAL">Casual Emergency Leave (5 remaining)</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Reason / Justification *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Provide context for HR review..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {modalLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HR Review Decision Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-base text-white">HR Leave Assessment</h3>
              <button onClick={() => setReviewingLeave(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <p className="text-slate-400">Employee: <span className="font-bold text-white">{reviewingLeave.employee_name}</span></p>
                <p className="text-slate-400">Type: <span className="font-bold text-indigo-400">{reviewingLeave.leave_type}</span></p>
                <p className="text-slate-400">Dates: <span className="font-mono text-white">{reviewingLeave.start_date} to {reviewingLeave.end_date}</span> ({reviewingLeave.days_count} days)</p>
                <p className="text-slate-400">Reason: <span className="text-slate-200 italic">{reviewingLeave.reason}</span></p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-medium block">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewAction('APPROVED')}
                    className={`py-2 rounded-xl font-bold transition ${
                      reviewAction === 'APPROVED' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Approve Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewAction('REJECTED')}
                    className={`py-2 rounded-xl font-bold transition ${
                      reviewAction === 'REJECTED' ? 'bg-rose-600 text-white shadow' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Reject Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">HR Review Comments</label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="e.g. Approved. Duty covered by team."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReviewSubmit}
                  disabled={reviewLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {reviewLoading ? 'Saving...' : 'Confirm Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

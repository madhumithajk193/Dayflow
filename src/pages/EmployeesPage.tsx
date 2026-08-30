import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Employee } from '../types';
import { IDCardModal } from '../components/IDCardModal';
import {
  Users,
  Search,
  Filter,
  Plus,
  QrCode,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  RefreshCw,
  X,
  Sparkles,
  CheckSquare,
} from 'lucide-react';

interface EmployeesPageProps {
  onSelectEmployee: (id: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onSelectEmployee }) => {
  const { isHR } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalActionLoading, setApprovalActionLoading] = useState<string | null>(null);

  // Add Employee Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    department: 'Engineering',
    designation: 'Software Engineer',
    salary: 95000,
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Selected for ID Badge preview
  const [badgeEmployee, setBadgeEmployee] = useState<Employee | null>(null);

  // Quick Task Assignment Modal
  const [taskEmployee, setTaskEmployee] = useState<Employee | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
  });
  const [taskModalLoading, setTaskModalLoading] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, approvals] = await Promise.all([
        api.getEmployees({
          search: search.trim() || undefined,
          department: department !== 'ALL' ? department : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        isHR ? api.getPendingApprovals() : Promise.resolve([]),
      ]);
      setEmployees(data || []);
      setPendingApprovals(approvals || []);
    } catch (e: any) {
      console.error('Workforce fetch error:', e);
      setError(e.message || 'Unable to load workforce data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, department, statusFilter, isHR]);

  const handleApproveEmployee = async (id: string) => {
    setApprovalActionLoading(id);
    try {
      await api.approveEmployee(id);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to approve employee');
    } finally {
      setApprovalActionLoading(null);
    }
  };

  const handleRejectEmployee = async (id: string) => {
    setApprovalActionLoading(id);
    try {
      await api.rejectEmployee(id);
      await fetchEmployees();
    } catch (err: any) {
      alert(err.message || 'Failed to reject employee');
    } finally {
      setApprovalActionLoading(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await api.createEmployee(formData);
      setShowAddModal(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        department: 'Engineering',
        designation: 'Software Engineer',
        salary: 95000,
      });
      fetchEmployees();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create employee');
    } finally {
      setModalLoading(false);
    }
  };

  const departments = ['ALL', 'Engineering', 'Product', 'Design & UX', 'Human Resources', 'Operations', 'Sales & Growth'];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workforce Directory</h2>
          <p className="text-xs text-slate-400">
            Manage company employees, track live attendance status, activity flags, and performance
          </p>
        </div>

        {isHR && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow shadow-indigo-600/30"
          >
            <Plus className="w-4 h-4" />
            Add New Employee
          </button>
        )}
      </div>

      {/* Pending Employee Approvals Banner (For HR) */}
      {isHR && pendingApprovals.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Pending Employee Registrations ({pendingApprovals.length})
                </h3>
                <p className="text-xs text-amber-200/80">
                  New employee accounts awaiting HR approval before portal access is granted
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingApprovals.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white truncate">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/40">
                      {p.employee_code}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{p.email} • {p.department} ({p.designation})</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleApproveEmployee(p.id)}
                    disabled={approvalActionLoading === p.id}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow disabled:opacity-50"
                  >
                    {approvalActionLoading === p.id ? '...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRejectEmployee(p.id)}
                    disabled={approvalActionLoading === p.id}
                    className="bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, EMP code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto flex-wrap">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium">Department:</span>
            <select
              aria-label="Filter by department"
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

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">ALL</option>
              <option value="ACTIVE" className="bg-slate-900">ACTIVE</option>
              <option value="INACTIVE" className="bg-slate-900">INACTIVE</option>
              <option value="PENDING" className="bg-slate-900">PENDING</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {(search || department !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setDepartment('ALL');
                setStatusFilter('ALL');
              }}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl border border-indigo-900/50 transition flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          {/* Employee Count Badge */}
          <div className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Employee count: {employees.length}</span>
          </div>

          <button
            onClick={fetchEmployees}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition"
            title="Refresh List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Department & Role</th>
                <th className="py-3.5 px-4">Today Status</th>
                <th className="py-3.5 px-4">Activity Signal</th>
                <th className="py-3.5 px-4">Performance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <p className="font-medium text-slate-300">Loading workforce records...</p>
                    <p className="text-[11px] text-slate-500">Fetching live employee directory data</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                    <p className="text-rose-400 font-semibold mb-1">Unable to load workforce data</p>
                    <p className="text-xs text-slate-500 mb-3">{error}</p>
                    <button
                      onClick={() => fetchEmployees()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-300 font-medium mb-1">No employees matching the criteria.</p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      {search || department !== 'ALL' ? 'Try adjusting your search terms or filter selection.' : 'No employee records registered in the system.'}
                    </p>
                    {(search || department !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('');
                          setDepartment('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/50 transition">
                    {/* Employee Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={emp.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={emp.first_name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">
                              {emp.first_name} {emp.last_name}
                            </span>
                            <span className="text-[10px] font-mono font-semibold bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded border border-slate-700">
                              {emp.employee_code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block">{emp.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{emp.designation}</p>
                      <span className="text-[11px] text-slate-400">{emp.department}</span>
                    </td>

                    {/* Today Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          emp.today_status === 'PRESENT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : emp.today_status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : emp.today_status === 'LEAVE'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : emp.today_status === 'ABSENT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {emp.today_status || 'NOT CHECKED IN'}
                      </span>
                    </td>

                    {/* Activity Signal */}
                    <td className="py-3.5 px-4">
                      {emp.activity_flag === 'LOW_ACTIVITY' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-700/60">
                          <AlertTriangle className="w-3 h-3" /> Low Activity
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Active / Normal
                        </span>
                      )}
                    </td>

                    {/* Performance */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {emp.performance_score}%
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                          {emp.performance_grade || 'A'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectEmployee(emp.id)}
                          className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                          title="View 360 Employee Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setTaskEmployee(emp);
                            setTaskSuccessMsg(null);
                          }}
                          className="p-1.5 text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/80 rounded-lg border border-emerald-800/40 transition"
                          title="Assign Task"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setBadgeEmployee(emp)}
                          className="p-1.5 text-indigo-300 hover:text-indigo-200 bg-indigo-950/60 hover:bg-indigo-900/80 rounded-lg border border-indigo-800/40 transition"
                          title="View ID Badge & QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-base text-white">Add New Employee</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="m-4 p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-200">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design & UX">Design & UX</option>
                    <option value="Human Resources">Human Resources</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales & Growth">Sales & Growth</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Annual CTC / Salary (₹ / INR)</label>
                <input
                  type="number"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {modalLoading ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Badge Modal */}
      {badgeEmployee && (
        <IDCardModal
          employee={badgeEmployee}
          isOpen={!!badgeEmployee}
          onClose={() => setBadgeEmployee(null)}
        />
      )}

      {/* Quick Task Assignment Modal */}
      {taskEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto font-sans">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Assign Task</h3>
                  <p className="text-xs text-slate-400">
                    To: {taskEmployee.first_name} {taskEmployee.last_name} ({taskEmployee.employee_code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTaskEmployee(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {taskSuccessMsg ? (
              <div className="p-6 text-center space-y-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-white">{taskSuccessMsg}</p>
                <button
                  onClick={() => setTaskEmployee(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setTaskModalLoading(true);
                  try {
                    await api.createTask({
                      title: taskForm.title,
                      description: taskForm.description,
                      assigned_to: taskEmployee.id,
                      priority: taskForm.priority,
                      due_date: taskForm.due_date,
                    });
                    setTaskSuccessMsg(`Task successfully assigned to ${taskEmployee.first_name}!`);
                  } catch (err: any) {
                    alert(err.message || 'Failed to create task');
                  } finally {
                    setTaskModalLoading(false);
                  }
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="e.g. Audit Q3 compliance report"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="Instructions and requirements..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 font-medium block mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={taskForm.due_date}
                      onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                  <button
                    type="button"
                    onClick={() => setTaskEmployee(null)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={taskModalLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                  >
                    {taskModalLoading ? 'Assigning...' : 'Assign Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

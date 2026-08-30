import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HRStaff, CreateHRPayload } from '../types';
import {
  ShieldCheck,
  UserPlus,
  Search,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  Building,
  KeyRound,
  Mail,
  BadgeCheck,
  Briefcase,
} from 'lucide-react';

export const HRManagementPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [hrList, setHrList] = useState<HRStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const initialFormState: CreateHRPayload = {
    first_name: '',
    last_name: '',
    email: '',
    employee_code: '',
    password: '',
    department: 'Human Resources',
    designation: 'HR Manager',
  };
  const [formData, setFormData] = useState<CreateHRPayload>(initialFormState);

  const fetchHRList = async () => {
    setLoading(true);
    try {
      const data = await api.getHRStaffList();
      setHrList(data);
    } catch (err: any) {
      console.error('Failed to load HR staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHRList();
    }
  }, [isAdmin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (modalError) setModalError(null);
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setModalError(null);
    setShowPassword(false);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setModalError(null);
  };

  const handleSubmitHR = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Client-side pre-validations
    if (!formData.first_name.trim()) {
      setModalError('First Name is required');
      return;
    }
    if (!formData.last_name.trim()) {
      setModalError('Last Name is required');
      return;
    }
    if (!formData.email.trim()) {
      setModalError('Email is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setModalError('Please enter a valid email address');
      return;
    }
    if (!formData.employee_code.trim()) {
      setModalError('HR Employee/Staff Code is required');
      return;
    }
    if (!formData.password) {
      setModalError('Password is required');
      return;
    }
    if (formData.password.length < 6) {
      setModalError('Password must be at least 6 characters long');
      return;
    }
    if (!formData.department.trim()) {
      setModalError('Department is required');
      return;
    }
    if (!formData.designation.trim()) {
      setModalError('Designation is required');
      return;
    }

    setModalLoading(true);
    try {
      await api.createHR({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        employee_code: formData.employee_code.trim().toUpperCase(),
        password: formData.password,
        department: formData.department.trim(),
        designation: formData.designation.trim(),
      });

      // Show success feedback
      setSuccessToast('HR created successfully.');
      setShowAddModal(false);
      setFormData(initialFormState);

      // Refresh list from DB
      await fetchHRList();

      setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
    } catch (err: any) {
      setModalError(err.message || 'Failed to create HR account');
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered List
  const filteredList = hrList.filter(hr => {
    const matchesSearch =
      hr.first_name.toLowerCase().includes(search.toLowerCase()) ||
      hr.last_name.toLowerCase().includes(search.toLowerCase()) ||
      hr.email.toLowerCase().includes(search.toLowerCase()) ||
      hr.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      hr.designation.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || hr.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const totalHRCount = hrList.filter(h => h.role === 'HR').length;
  const totalAdminCount = hrList.filter(h => h.role === 'ADMIN').length;

  if (!isAdmin) {
    return (
      <div id="hr-management-unauthorized" className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-2xl p-8 text-center text-slate-100">
          <Shield className="w-12 h-12 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-rose-200">Access Restricted</h2>
          <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
            Only users with administrative privileges (Role: <code className="text-rose-400 font-mono">ADMIN</code>) can access the HR Management console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="hr-management-page" className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">HR Management</h1>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Provision HR accounts, manage credentials, and configure human resources staff directory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-hr-list"
            onClick={fetchHRList}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            id="btn-open-add-hr-modal"
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add HR
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          id="hr-created-success-toast"
          className="flex items-center justify-between p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs shadow-lg animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 hover:bg-emerald-900/50 rounded-lg transition text-emerald-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total HR Staff</p>
            <p className="text-2xl font-bold text-white mt-1">{totalHRCount}</p>
          </div>
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">System Administrators</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">{totalAdminCount}</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Primary Department</p>
            <p className="text-base font-semibold text-slate-200 mt-1 truncate">Human Resources</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            id="input-search-hr"
            type="text"
            placeholder="Search by name, email, code, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            id="select-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">All Roles</option>
            <option value="HR">HR Staff Only</option>
            <option value="ADMIN">Administrators Only</option>
          </select>
        </div>
      </div>

      {/* HR Table List */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-indigo-400" />
            Human Resources Personnel Directory ({filteredList.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Loading HR directory from PostgreSQL...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No HR personnel found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">HR Staff Member</th>
                  <th className="px-4 py-3">Staff Code</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.map((hr) => (
                  <tr key={hr.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs ring-2 ring-indigo-500/20">
                          {hr.first_name[0]}
                          {hr.last_name[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-100">
                            {hr.first_name} {hr.last_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{hr.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                        {hr.employee_code}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{hr.department}</td>
                    <td className="px-4 py-3.5 text-slate-300 font-medium">{hr.designation}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border tracking-wide uppercase ${
                          hr.role === 'ADMIN'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {hr.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] text-slate-400">
                      {new Date(hr.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add HR Modal */}
      {showAddModal && (
        <div
          id="modal-add-hr"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Add HR Officer</h2>
                  <p className="text-xs text-slate-400">
                    Create a new Human Resources account with portal credentials.
                  </p>
                </div>
              </div>
              <button
                id="btn-close-add-hr-modal"
                onClick={handleCloseAddModal}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitHR} className="p-6 space-y-4">
              {modalError && (
                <div
                  id="add-hr-error-alert"
                  className="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-200 text-xs"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-hr-first-name"
                    type="text"
                    name="first_name"
                    required
                    placeholder="e.g. Maya"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Last Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-hr-last-name"
                    type="text"
                    name="last_name"
                    required
                    placeholder="e.g. Rao"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    id="input-hr-email"
                    type="email"
                    name="email"
                    required
                    placeholder="e.g. maya.rao@dayflow.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    HR Employee / Staff Code <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-hr-code"
                    type="text"
                    name="employee_code"
                    required
                    placeholder="e.g. HR1002"
                    value={formData.employee_code}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono uppercase text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-hr-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      required
                      placeholder="Min. 6 characters"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full px-3.5 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Department <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-hr-department"
                    type="text"
                    name="department"
                    required
                    placeholder="e.g. Human Resources"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Designation <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-hr-designation"
                    type="text"
                    name="designation"
                    required
                    placeholder="e.g. HR Operations Lead"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-add-hr"
                  type="submit"
                  disabled={modalLoading}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  {modalLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Creating in Database...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      Create HR Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

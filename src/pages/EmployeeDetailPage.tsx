import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PerformanceExplainerCard } from '../components/PerformanceExplainerCard';
import { IDCardModal } from '../components/IDCardModal';
import { formatINR } from '../utils/currency';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Calendar,
  CreditCard,
  QrCode,
  CheckCircle2,
  Clock8,
  Activity,
  AlertTriangle,
  Award,
  RefreshCw,
  Edit2,
  Save,
  X,
  Sparkles,
} from 'lucide-react';

interface EmployeeDetailPageProps {
  employeeId: string;
  onBack: () => void;
}

export const EmployeeDetailPage: React.FC<EmployeeDetailPageProps> = ({ employeeId, onBack }) => {
  const { isHR, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showIdCard, setShowIdCard] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployeeById(employeeId);
      setData(res);
      setEditForm({
        first_name: res.employee.first_name,
        last_name: res.employee.last_name,
        phone: res.employee.phone,
        address: res.employee.address,
        department: res.employee.department,
        designation: res.employee.designation,
        salary: res.employee.salary,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [employeeId]);

  const handleSave = async () => {
    setSaveLoading(true);
    try {
      await api.updateEmployee(employeeId, editForm);
      setIsEditing(false);
      fetchDetail();
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
        Loading employee 360 profile...
      </div>
    );
  }

  const { employee, performance, penalties, todayStatus, activity, tasks, attendanceHistory, payroll, leaveRequests } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to List
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIdCard(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow"
          >
            <QrCode className="w-4 h-4" /> View Digital ID Badge
          </button>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700 transition"
            >
              <Edit2 className="w-4 h-4" /> Edit Details
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saveLoading}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={employee.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={employee.first_name}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/30 shadow-lg"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-white">
                  {employee.first_name} {employee.last_name}
                </h2>
                <span className="font-mono text-xs font-bold bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-800">
                  {employee.employee_code}
                </span>
              </div>
              <p className="text-sm text-indigo-400 font-semibold">{employee.designation}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {employee.department}</span>
                <span>•</span>
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {employee.joining_date}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Today Status</span>
              <span className="text-xs font-black text-emerald-400 uppercase font-mono">
                {todayStatus?.record?.status || 'NOT CHECKED IN'}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Performance</span>
              <span className="text-xs font-black text-amber-400 font-mono">
                {performance?.overall_score}% ({performance?.grade})
              </span>
            </div>

            {payroll && (
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center min-w-[100px]">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Monthly Net</span>
                <span className="text-xs font-black text-white font-mono">
                  {formatINR(payroll.net_salary)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Contact & Personal Editable Fields */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Mail className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">Email Address</span>
              <span className="font-medium text-slate-200">{employee.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <Phone className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">Contact Phone</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs mt-0.5"
                />
              ) : (
                <span className="font-medium text-slate-200">{employee.phone}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500" />
            <div>
              <span className="text-slate-500 block text-[10px]">Location / Address</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white text-xs mt-0.5"
                />
              ) : (
                <span className="font-medium text-slate-200">{employee.address}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active Work Session & Activity Breakdown Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock8 className="w-4 h-4 text-indigo-400" />
              <h4 className="font-bold text-sm text-white">Today Working Hours Session</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {todayStatus?.todayDate}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Total Session Duration:</span>
              <span className="font-bold text-white font-mono">{activity?.loginDurationHours || 0} hrs</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Active Application Work:</span>
              <span className="font-bold text-emerald-400 font-mono">{activity?.activeHours || 0} hrs</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Idle / Inactivity:</span>
              <span className="font-bold text-amber-400 font-mono">{activity?.idleHours || 0} hrs</span>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              {activity?.message}
            </div>
          </div>
        </div>

        {/* 360 Performance Explainer */}
        <div className="lg:col-span-2">
          <PerformanceExplainerCard
            record={performance}
            penalties={penalties}
            employeeName={`${employee.first_name} ${employee.last_name}`}
          />
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-bold text-sm text-white">Attendance Logs & Timestamps</h4>
          <span className="text-xs text-slate-400">Past 30 records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Check In</th>
                <th className="py-3 px-4">Check Out</th>
                <th className="py-3 px-4">Late Mins</th>
                <th className="py-3 px-4">Work Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendanceHistory?.slice(0, 8).map((att: any) => (
                <tr key={att.id} className="hover:bg-slate-800/50 transition">
                  <td className="py-2.5 px-4 font-mono font-medium text-white">{att.date}</td>
                  <td className="py-2.5 px-4 font-mono">
                    {new Date(att.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-4 font-mono">
                    {att.check_out
                      ? new Date(att.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : <span className="text-amber-400">In Progress</span>}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-amber-400">
                    {att.late_minutes > 0 ? `+${att.late_minutes}m` : '0m'}
                  </td>
                  <td className="py-2.5 px-4 font-mono">
                    {Math.round((att.working_minutes / 60) * 10) / 10}h
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.status === 'PRESENT' ? 'bg-emerald-500/20 text-emerald-300' :
                        att.status === 'LATE' ? 'bg-amber-500/20 text-amber-300' :
                        att.status === 'LEAVE' ? 'bg-blue-500/20 text-blue-300' : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {att.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showIdCard && (
        <IDCardModal
          employee={employee}
          isOpen={showIdCard}
          onClose={() => setShowIdCard(false)}
        />
      )}
    </div>
  );
};

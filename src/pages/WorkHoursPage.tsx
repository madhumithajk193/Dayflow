import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Clock8, Activity, AlertTriangle, ShieldCheck, RefreshCw, Sparkles, UserCheck, HelpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const WorkHoursPage: React.FC = () => {
  const { isHR, user, employee } = useAuth();
  const [data, setData] = useState<any>(null);
  const [lowActivityList, setLowActivityList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkHours = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const [wh, low] = await Promise.all([
          api.getAllWorkHours(),
          api.getLowActivityEmployees(),
        ]);
        setData(wh);
        setLowActivityList(low);
      } else {
        const myWh = await api.getMyWorkHours();
        setData(myWh);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkHours();
  }, [isHR, user]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Working Hours & Activity Analytics</h2>
          <p className="text-xs text-slate-400">
            Precision session duration tracking, active work vs idle time ratio, and non-intrusive activity indicators
          </p>
        </div>
        <button
          onClick={fetchWorkHours}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Telemetry
        </button>
      </div>

      {/* Low Activity Alert Banner (Section 14 HR Review Requirement) */}
      {isHR && lowActivityList.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-2 border-amber-600/70 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600/20 text-amber-400 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Low Application Activity Detected ({lowActivityList.length} Case)
              </h3>
              <p className="text-xs text-amber-200">
                Ethical Standard: Flagged as "Low application activity detected — HR review recommended". This flag is purely advisory for supportive check-ins, not automatic penalty.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {lowActivityList.map((item, idx) => {
              const empId = item.employee?.id || item.employee_id || `low-${idx}`;
              const firstName = item.employee?.first_name || item.name?.split(' ')[0] || 'Employee';
              const lastName = item.employee?.last_name || item.name?.split(' ').slice(1).join(' ') || '';
              const code = item.employee?.employee_code || item.employee_code || 'EMP';
              const dept = item.employee?.department || item.department || 'General';
              const img = item.employee?.profile_image || item.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

              return (
                <div key={empId} className="bg-slate-950 p-4 rounded-2xl border border-amber-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={img}
                        alt={firstName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-500"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-white">
                          {firstName} {lastName}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {code} • {dept}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-900/60 text-amber-200 px-2 py-0.5 rounded border border-amber-700">
                      HR Review Recommended
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-xl text-center text-xs border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Session Time</span>
                      <span className="font-bold text-white font-mono">{item.loginDurationHours}h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Active Work</span>
                      <span className="font-bold text-emerald-400 font-mono">{item.activeHours}h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Idle Inactivity</span>
                      <span className="font-bold text-amber-400 font-mono">{item.idleHours}h</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 italic">
                    "{item.reason || 'Low application activity detected — HR review recommended'}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explanation of Working Hours vs Activity Standard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs text-slate-300 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Working Hours Distinction Standard</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-indigo-300 block">1. Total Session Duration</span>
            <p className="text-slate-400 text-[11px]">
              Calculated strictly from check-in to check-out timestamp. Standard shift benchmark is 8 hours / day.
            </p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-300 block">2. Active Work Time</span>
            <p className="text-slate-400 text-[11px]">
              Active tasks, ticket updates, code commits, and HRMS interactions during the logged session.
            </p>
          </div>
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-amber-300 block">3. Idle Time & Threshold</span>
            <p className="text-slate-400 text-[11px]">
              Periods of 30+ continuous minutes without activity. If idle time exceeds threshold, an advisory HR review is flagged.
            </p>
          </div>
        </div>
      </div>

      {/* Employee List Table of Working Hours (For HR) or Personal History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">
            {isHR ? 'Company Workforce Session Breakdown' : 'My Logged Working Hours'}
          </h3>
          <span className="text-xs text-slate-400">Current Workday Period</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                {isHR && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Total Session Duration</th>
                <th className="py-3.5 px-4">Active Work Time</th>
                <th className="py-3.5 px-4">Idle / Inactive</th>
                <th className="py-3.5 px-4">Activity Ratio</th>
                <th className="py-3.5 px-4">HR Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Loading working hour telemetry...
                  </td>
                </tr>
              ) : isHR && Array.isArray(data) ? (
                data.map((item: any, idx: number) => {
                  const empId = item.employee?.id || item.employee_id || `wh-${idx}`;
                  const firstName = item.employee?.first_name || item.name?.split(' ')[0] || 'Employee';
                  const lastName = item.employee?.last_name || item.name?.split(' ').slice(1).join(' ') || '';
                  const code = item.employee?.employee_code || item.employee_code || 'EMP';
                  const dept = item.employee?.department || item.department || 'General';
                  const img = item.employee?.profile_image || item.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

                  return (
                    <tr key={empId} className="hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={img}
                            alt={firstName}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                          />
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {firstName} {lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {code} • {dept}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {item.loginDurationHours || 0} hrs
                      </td>

                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        {item.activeHours || 0} hrs
                      </td>

                      <td className="py-3.5 px-4 font-mono text-amber-400">
                        {item.idleHours || 0} hrs
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${(item.activityScore || 0) >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${item.activityScore || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-300 font-semibold">{item.activityScore || 0}%</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {item.activityFlag === 'LOW_ACTIVITY' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-700">
                            <AlertTriangle className="w-3 h-3" /> HR Review Recommended
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="hover:bg-slate-800/50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {data?.todaySession?.loginDurationHours || 0} hrs
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                    {data?.todaySession?.activeHours || 0} hrs
                  </td>
                  <td className="py-3.5 px-4 font-mono text-amber-400">
                    {data?.todaySession?.idleHours || 0} hrs
                  </td>
                  <td className="py-3.5 px-4 font-mono text-indigo-300">
                    {data?.todaySession?.activityScore || 100}%
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-emerald-400 font-semibold text-[10px]">Optimal Session</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

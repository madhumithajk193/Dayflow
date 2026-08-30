import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PerformanceRecord, TopPerformer } from '../types';
import { PerformanceExplainerCard } from '../components/PerformanceExplainerCard';
import {
  Award,
  Trophy,
  Medal,
  TrendingUp,
  Filter,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

interface PerformancePageProps {
  onSelectEmployee?: (id: string) => void;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({ onSelectEmployee }) => {
  const { isHR, user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<TopPerformer[]>([]);
  const [penalties, setPenalties] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [department, setDepartment] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [myPerf, setMyPerf] = useState<{ performance: PerformanceRecord; penalties: any[] } | null>(null);

  const fetchPerformance = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (isHR) {
        const [lb, pen] = await Promise.all([
          api.getTopPerformers({
            timeframe,
            department: department !== 'ALL' ? department : undefined,
          }),
          api.getPenalties(),
        ]);
        setLeaderboard(lb);
        setPenalties(pen);
      } else {
        const [p, pen] = await Promise.all([
          api.getMyPerformance(),
          api.getPenalties(),
        ]);
        setMyPerf(p);
        setPenalties(pen);
      }
    } catch (e: any) {
      console.error('Failed to load performance:', e);
      setErrorMsg(e.message || 'Unable to retrieve performance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [timeframe, department, isHR]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.recalculateAllPerformance();
      await fetchPerformance();
    } catch (e: any) {
      console.error('Recalculation error:', e);
    } finally {
      setRecalculating(false);
    }
  };

  const departments = ['ALL', 'Engineering', 'Product', 'Design & UX', 'Human Resources', 'Operations', 'Sales & Growth'];

  if (loading && !myPerf && leaderboard.length === 0) {
    return (
      <div className="min-h-[350px] bg-slate-900/60 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        <div>
          <h3 className="text-sm font-bold text-white">Loading Performance Evaluation...</h3>
          <p className="text-xs text-slate-400 mt-1">Retrieving latest performance scores and milestones</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !myPerf && leaderboard.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Failed to Load Performance</h3>
          <p className="text-xs text-slate-400 mt-1">{errorMsg}</p>
        </div>
        <button
          onClick={fetchPerformance}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isHR ? 'Performance Evaluations & Rankings' : 'My Performance Evaluation'}
          </h2>
          <p className="text-xs text-slate-400">
            {isHR
              ? 'Workforce performance rankings, ratings, and evaluation milestones'
              : 'Review your personalized rating, milestone achievements, and evaluation pillars'}
          </p>
        </div>
        {isHR && (
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalculating...' : 'Recalculate All Scores'}
          </button>
        )}
      </div>

      {/* Employee Personal Performance Breakdown */}
      {!isHR && myPerf && (
        <PerformanceExplainerCard
          record={myPerf.performance}
          penalties={myPerf.penalties || penalties}
          employeeName="My Evaluation"
        />
      )}

      {/* HR Workforce Leaderboard Toolbar & Views */}
      {isHR && (
        <>
          {/* Leaderboard Toolbar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTimeframe('today')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  timeframe === 'today' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeframe('week')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  timeframe === 'week' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeframe('month')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  timeframe === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimeframe('year')}
                className={`px-3 py-1.5 rounded-lg font-medium transition ${
                  timeframe === 'year' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                This Year
              </button>
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
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
          </div>

      {/* Top 3 Podium Cards */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* 2nd Place */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl text-center flex flex-col items-center justify-between order-2 md:order-1 relative overflow-hidden">
            <div className="p-2 bg-slate-800 rounded-full text-slate-300 mb-2">
              <Medal className="w-6 h-6 text-slate-300" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2nd Place</span>
            <img
              src={leaderboard[1]?.employee?.profile_image || leaderboard[1]?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-slate-400 my-2"
            />
            <h4 className="font-bold text-white text-sm">
              {leaderboard[1]?.employee?.first_name || leaderboard[1]?.name?.split(' ')[0] || 'Employee'} {leaderboard[1]?.employee?.last_name || leaderboard[1]?.name?.split(' ').slice(1).join(' ') || ''}
            </h4>
            <p className="text-[11px] text-slate-400">{leaderboard[1]?.employee?.designation || leaderboard[1]?.designation || 'Staff'}</p>
            <div className="mt-3 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800 font-mono font-bold text-white text-sm">
              {leaderboard[1]?.performance?.overall_score ?? 0}% ({leaderboard[1]?.performance?.grade || 'B'})
            </div>
          </div>

          {/* 1st Place */}
          <div className="bg-gradient-to-b from-indigo-950/80 to-slate-900 border-2 border-indigo-500/60 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center justify-between order-1 md:order-2 relative overflow-hidden -mt-2">
            <div className="p-2.5 bg-amber-500/20 rounded-full text-amber-400 mb-1 ring-2 ring-amber-500/40">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Top Performer (1st)</span>
            <img
              src={leaderboard[0]?.employee?.profile_image || leaderboard[0]?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-400 shadow-xl my-2"
            />
            <h4 className="font-black text-white text-base">
              {leaderboard[0]?.employee?.first_name || leaderboard[0]?.name?.split(' ')[0] || 'Top Performer'} {leaderboard[0]?.employee?.last_name || leaderboard[0]?.name?.split(' ').slice(1).join(' ') || ''}
            </h4>
            <p className="text-xs text-indigo-300">
              {leaderboard[0]?.employee?.designation || leaderboard[0]?.designation || 'Specialist'} • {leaderboard[0]?.employee?.department || leaderboard[0]?.department || 'General'}
            </p>
            <div className="mt-3 bg-amber-500/20 px-5 py-2 rounded-xl border border-amber-500/40 font-mono font-black text-amber-300 text-lg shadow-inner">
              {leaderboard[0]?.performance?.overall_score ?? 0}% ({leaderboard[0]?.performance?.grade || 'A+'})
            </div>
          </div>

          {/* 3rd Place */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl text-center flex flex-col items-center justify-between order-3 relative overflow-hidden">
            <div className="p-2 bg-amber-950/60 rounded-full text-amber-600 mb-2">
              <Medal className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3rd Place</span>
            <img
              src={leaderboard[2]?.employee?.profile_image || leaderboard[2]?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt="Avatar"
              className="w-16 h-16 rounded-full object-cover ring-2 ring-amber-700 my-2"
            />
            <h4 className="font-bold text-white text-sm">
              {leaderboard[2]?.employee?.first_name || leaderboard[2]?.name?.split(' ')[0] || 'Employee'} {leaderboard[2]?.employee?.last_name || leaderboard[2]?.name?.split(' ').slice(1).join(' ') || ''}
            </h4>
            <p className="text-[11px] text-slate-400">{leaderboard[2]?.employee?.designation || leaderboard[2]?.designation || 'Staff'}</p>
            <div className="mt-3 bg-slate-950 px-4 py-1.5 rounded-xl border border-slate-800 font-mono font-bold text-white text-sm">
              {leaderboard[2]?.performance?.overall_score ?? 0}% ({leaderboard[2]?.performance?.grade || 'B'})
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-white">Workforce Performance Rankings</h3>
          <span className="text-xs text-slate-400">All departments</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Attendance</th>
                <th className="py-3 px-4">Working Hours</th>
                <th className="py-3 px-4">Tasks</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Punctuality</th>
                <th className="py-3 px-4">Penalty</th>
                <th className="py-3 px-4">Overall Score</th>
                <th className="py-3 px-4">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leaderboard.map((item, idx) => {
                const empId = item.employee?.id || item.employee_id || `emp-${idx}`;
                const firstName = item.employee?.first_name || item.name?.split(' ')[0] || 'Employee';
                const lastName = item.employee?.last_name || item.name?.split(' ').slice(1).join(' ') || '';
                const code = item.employee?.employee_code || item.employee_code || 'EMP';
                const dept = item.employee?.department || item.department || 'General';
                const img = item.employee?.profile_image || item.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

                return (
                  <tr
                    key={empId}
                    onClick={() => onSelectEmployee && item.employee?.id && onSelectEmployee(item.employee.id)}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-bold font-mono">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                        idx === 0 ? 'bg-amber-500/20 text-amber-400 font-black' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300 font-bold' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-600 font-bold' : 'text-slate-500'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={img}
                          alt="Avatar"
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

                    <td className="py-3 px-4 font-mono">{item.performance?.attendance_score ?? 0}%</td>
                    <td className="py-3 px-4 font-mono">{item.performance?.working_hours_score ?? 0}%</td>
                    <td className="py-3 px-4 font-mono text-indigo-300">{item.performance?.task_score ?? 0}%</td>
                    <td className="py-3 px-4 font-mono">{item.performance?.activity_score ?? 0}%</td>
                    <td className="py-3 px-4 font-mono">{item.performance?.punctuality_score ?? 0}%</td>

                    <td className="py-3 px-4 font-mono">
                      {(item.performance?.penalty_deduction ?? 0) > 0 ? (
                        <span className="text-rose-400 font-bold">-{item.performance.penalty_deduction}%</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                      {item.performance?.overall_score ?? 0}%
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.performance?.grade === 'A+' ? 'bg-emerald-500/20 text-emerald-300' :
                        item.performance?.grade === 'A' ? 'bg-blue-500/20 text-blue-300' :
                        item.performance?.grade === 'B' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {item.performance?.grade || 'B'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

          {/* Performance Penalties Audit Log (Configurable 1% deduction for >= 3 late check-ins) */}
          {penalties.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Applied Performance Penalties Audit Trail</span>
              </div>

              <div className="space-y-2">
                {penalties.map((pen) => (
                  <div
                    key={pen.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">Employee ID: {pen.employee_id}</span>
                      <p className="text-slate-400 text-[11px] mt-0.5">{pen.reason}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                        -{pen.penalty_percentage || pen.penalty}% Deduction
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">{pen.date || pen.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

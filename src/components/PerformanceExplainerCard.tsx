import React from 'react';
import { PerformanceRecord, PerformancePenalty } from '../types';
import { Award, CheckCircle, Clock, CheckSquare, Activity, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';

interface PerformanceExplainerProps {
  record: PerformanceRecord & { rating?: string; summary?: string };
  penalties?: PerformancePenalty[];
  employeeName?: string;
  rating?: string;
  summary?: string;
}

export const PerformanceExplainerCard: React.FC<PerformanceExplainerProps> = ({
  record,
  penalties = [],
  employeeName,
  rating: propRating,
  summary: propSummary,
}) => {
  const getRating = (score: number) => {
    if (score >= 92) return 'Outstanding';
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  };

  const getStatusBadge = (score: number) => {
    if (score >= 90) return { label: 'Optimal', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    if (score >= 80) return { label: 'Strong', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    if (score >= 70) return { label: 'On Track', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    if (score >= 60) return { label: 'Satisfactory', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    return { label: 'Needs Focus', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
  };

  const rating = propRating || record.rating || getRating(record.overall_score);
  const summary = propSummary || record.summary || (
    record.overall_score >= 85
      ? 'Strong operational consistency and dependable delivery across all active tasks and working hours.'
      : record.overall_score >= 75
      ? 'Steady and reliable contributions with regular attendance and consistent sprint achievements.'
      : 'Meets fundamental baseline requirements with identified opportunities for increased sprint throughput.'
  );

  const evaluationPillars = [
    {
      title: 'Attendance Consistency',
      status: getStatusBadge(record.attendance_score),
      icon: CheckCircle,
      color: 'text-emerald-400',
      description: 'Presence & schedule adherence',
    },
    {
      title: 'Working Hours',
      status: getStatusBadge(record.working_hours_score),
      icon: Clock,
      color: 'text-blue-400',
      description: 'Daily session engagement',
    },
    {
      title: 'Task Deliverables',
      status: getStatusBadge(record.task_score),
      icon: CheckSquare,
      color: 'text-indigo-400',
      description: 'Sprint milestones & quality',
    },
    {
      title: 'Application Activity',
      status: getStatusBadge(record.activity_score),
      icon: Activity,
      color: 'text-cyan-400',
      description: 'Active work session focus',
    },
    {
      title: 'Arrival Punctuality',
      status: getStatusBadge(record.punctuality_score),
      icon: Award,
      color: 'text-amber-400',
      description: 'On-time check-in discipline',
    },
  ];

  return (
    <div id="performance-summary-card" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl text-slate-100 space-y-6">
      {/* Header with Score & Rating */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-xl font-black text-white tracking-tight">
              {employeeName ? `${employeeName}'s Performance Summary` : 'Performance Overview'}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Evaluation Period: <span className="text-indigo-300 font-semibold">{record.period || 'Current Period (2026)'}</span>
          </p>
        </div>

        {/* Rating & Score Display */}
        <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800 shadow-inner">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Performance Score
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {record.overall_score}%
            </span>
          </div>

          <div className="h-10 w-[1px] bg-slate-800"></div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Rating
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                rating === 'Outstanding' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                rating === 'Excellent' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' :
                rating === 'Good' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {rating}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({record.grade})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Relevant Performance Summary Narrative */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex items-start gap-3">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0 mt-0.5">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Performance Assessment</h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{summary}</p>
        </div>
      </div>

      {/* Clean Evaluation Pillars (Without Formulas or Weights) */}
      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Core Evaluation Pillars</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {evaluationPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${pillar.color}`} />
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pillar.status.color}`}>
                    {pillar.status.label}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{pillar.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{pillar.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Penalties Notice (Clean summary without internal math) */}
      {record.penalty_deduction > 0 && (
        <div className="p-4 bg-rose-950/30 border border-rose-800/60 rounded-2xl flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-1.5 bg-rose-600/20 text-rose-400 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-rose-200">
                Attendance Policy Notice
              </p>
              <p className="text-slate-300 mt-0.5 text-xs">
                {penalties[0]?.reason || 'Repeated late arrivals have triggered a standard policy deduction on the current score.'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-rose-300 bg-rose-950 px-2.5 py-1 rounded-xl border border-rose-800 shrink-0">
            Deduction Applied
          </span>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Settings,
  ShieldCheck,
  Clock,
  Award,
  AlertTriangle,
  Save,
  RotateCcw,
  CheckCircle2,
  ListFilter,
  Sparkles,
  History,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<any>(null);
  const [initialSettings, setInitialSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reseeding, setReseeding] = useState(false);

  const normalizeSettingsState = (s: any) => {
    if (!s) return null;
    return {
      officeStartTime: s.officeStartTime || s.official_start_time || '09:00',
      officeEndTime: s.officeEndTime || s.official_end_time || '18:00',
      gracePeriodMinutes: s.gracePeriodMinutes ?? s.grace_period_minutes ?? 15,
      minimumWorkingHoursPerDay: s.minimumWorkingHoursPerDay ?? s.minimum_working_hours ?? 8,
      idleThresholdMinutes: s.idleThresholdMinutes ?? s.idle_threshold_minutes ?? 30,
      consecutiveAbsenceThreshold: s.consecutiveAbsenceThreshold ?? s.consecutive_absence_threshold ?? 3,
      lateOccurrenceThreshold: s.lateOccurrenceThreshold ?? s.late_occurrence_threshold ?? 3,
      latePenaltyPercentage: s.latePenaltyPercentage ?? s.late_penalty_percentage ?? 1,
      performanceWeights: {
        attendance: s.performanceWeights?.attendance ?? Math.round((s.weight_attendance || 0.20) * 100),
        workingHours: s.performanceWeights?.workingHours ?? Math.round((s.weight_working_hours || 0.20) * 100),
        taskCompletion: s.performanceWeights?.taskCompletion ?? Math.round((s.weight_task_completion || 0.30) * 100),
        activity: s.performanceWeights?.activity ?? Math.round((s.weight_activity || 0.15) * 100),
        punctuality: s.performanceWeights?.punctuality ?? Math.round((s.weight_punctuality || 0.15) * 100),
      },
    };
  };

  const fetchSettingsAndAudit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [s, logs] = await Promise.all([
        api.getSettings(),
        api.getAuditLogs().catch(() => []),
      ]);
      const normalized = normalizeSettingsState(s);
      setSettings(normalized);
      setInitialSettings(JSON.parse(JSON.stringify(normalized)));
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndAudit();
  }, []);

  const handleResetSettings = () => {
    if (initialSettings) {
      setSettings(JSON.parse(JSON.stringify(initialSettings)));
      setSavedMsg(null);
      setErrorMsg(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedMsg(null);

    // Form Validation
    if (!settings.officeStartTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(settings.officeStartTime.trim())) {
      setErrorMsg('Office start time must be a valid 24-hour time format (HH:mm, e.g. 09:00).');
      return;
    }

    if (Number(settings.gracePeriodMinutes) < 0 || isNaN(Number(settings.gracePeriodMinutes))) {
      setErrorMsg('Grace period minutes must be a non-negative number.');
      return;
    }

    if (Number(settings.minimumWorkingHoursPerDay) <= 0 || Number(settings.minimumWorkingHoursPerDay) > 24) {
      setErrorMsg('Minimum working hours must be between 1 and 24 hours.');
      return;
    }

    const weights = settings.performanceWeights || {};
    const totalWeights = (Number(weights.attendance) || 0) +
      (Number(weights.workingHours) || 0) +
      (Number(weights.taskCompletion) || 0) +
      (Number(weights.activity) || 0) +
      (Number(weights.punctuality) || 0);

    if (Math.abs(totalWeights - 100) > 1) {
      setErrorMsg(`Performance weights must sum to exactly 100% (Current sum: ${totalWeights}%).`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateSettings(settings);
      const normalized = normalizeSettingsState(res);
      setSettings(normalized);
      setInitialSettings(JSON.parse(JSON.stringify(normalized)));
      setSavedMsg('System configuration rules saved and persisted in PostgreSQL!');
      setTimeout(() => setSavedMsg(null), 4000);
      const logs = await api.getAuditLogs().catch(() => []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReseed = async () => {
    if (!window.confirm('Are you sure you want to reset and re-seed the full Dayflow HRMS dataset?')) return;
    setReseeding(true);
    try {
      await api.reseedDatabase();
      alert('Database successfully re-seeded with fresh Dayflow records!');
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Failed to reseed database.');
    } finally {
      setReseeding(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading system configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">System Rules & Audit Configuration</h2>
          <p className="text-xs text-slate-400">
            Configure automated working hour policies, penalty thresholds, and inspect immutable audit logs
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleReseed}
            disabled={reseeding}
            className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-semibold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 self-start sm:self-auto"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${reseeding ? 'animate-spin' : ''}`} />
            {reseeding ? 'Resetting DB...' : 'Reset / Reseed Demo Data'}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-2xl text-xs text-rose-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {savedMsg && (
        <div className="p-3 bg-emerald-950 border border-emerald-700 rounded-2xl text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Rules Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Working Hour & Punctuality Policies */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Office Timing & Absence Rules</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Standard Office Start Time</label>
                <input
                  type="text"
                  value={settings.officeStartTime}
                  onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                  placeholder="09:00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">24-hour format (HH:mm)</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={settings.gracePeriodMinutes}
                    onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 15 mins</span>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Min Daily Work Hours</label>
                  <input
                    type="number"
                    value={settings.minimumWorkingHoursPerDay}
                    onChange={(e) => setSettings({ ...settings, minimumWorkingHoursPerDay: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 8 hours</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Idle Detection Threshold</label>
                  <input
                    type="number"
                    value={settings.idleThresholdMinutes}
                    onChange={(e) => setSettings({ ...settings, idleThresholdMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 30 minutes</span>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Consecutive Absence Alert</label>
                  <input
                    type="number"
                    value={settings.consecutiveAbsenceThreshold}
                    onChange={(e) => setSettings({ ...settings, consecutiveAbsenceThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Default: 3 days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Engine Weights & Late Penalties */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Performance Formula & Penalty Rules</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Late Occurrence Threshold</label>
                  <input
                    type="number"
                    value={settings.lateOccurrenceThreshold}
                    onChange={(e) => setSettings({ ...settings, lateOccurrenceThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Occurrences before penalty (3)</span>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Late Penalty (%)</label>
                  <input
                    type="number"
                    value={settings.latePenaltyPercentage}
                    onChange={(e) => setSettings({ ...settings, latePenaltyPercentage: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Score deduction (1%)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-200 block">Performance Metric Weights (%)</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Attendance</span>
                    <input
                      type="number"
                      value={settings.performanceWeights.attendance}
                      onChange={(e) => setSettings({
                        ...settings,
                        performanceWeights: { ...settings.performanceWeights, attendance: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Working Hours</span>
                    <input
                      type="number"
                      value={settings.performanceWeights.workingHours}
                      onChange={(e) => setSettings({
                        ...settings,
                        performanceWeights: { ...settings.performanceWeights, workingHours: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tasks</span>
                    <input
                      type="number"
                      value={settings.performanceWeights.taskCompletion}
                      onChange={(e) => setSettings({
                        ...settings,
                        performanceWeights: { ...settings.performanceWeights, taskCompletion: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Application Activity</span>
                    <input
                      type="number"
                      value={settings.performanceWeights.activity}
                      onChange={(e) => setSettings({
                        ...settings,
                        performanceWeights: { ...settings.performanceWeights, activity: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Punctuality</span>
                    <input
                      type="number"
                      value={settings.performanceWeights.punctuality}
                      onChange={(e) => setSettings({
                        ...settings,
                        performanceWeights: { ...settings.performanceWeights, punctuality: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleResetSettings}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs px-5 py-3 rounded-2xl transition disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Changes</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-6 py-3 rounded-2xl transition shadow shadow-indigo-600/30 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Settings...' : 'Save & Enforce HR Rules'}</span>
          </button>
        </div>
      </form>

      {/* Immutable Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Immutable System Audit Logs</h3>
          </div>
          <span className="text-xs text-slate-400">Security & Action Verification Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.slice(0, 15).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition font-mono text-[11px]">
                  <td className="py-2.5 px-4 text-slate-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-indigo-300 font-semibold">{log.actor}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400">{log.target_entity} ({log.target_id?.slice(0, 8)})</td>
                  <td className="py-2.5 px-4 text-slate-300 font-sans text-xs">
                    {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

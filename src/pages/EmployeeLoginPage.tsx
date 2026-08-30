import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserCheck, ArrowLeft, Lock, Mail, AlertCircle, RefreshCw, KeyRound, Sparkles } from 'lucide-react';

interface EmployeeLoginPageProps {
  onBack: () => void;
}

export const EmployeeLoginPage: React.FC<EmployeeLoginPageProps> = ({ onBack }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your Employee ID / Email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(identifier.trim(), password, 'employee');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your employee details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoId: string, demoPass: string) => {
    setIdentifier(demoId);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative text-slate-100 font-sans">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full mx-auto space-y-6 relative z-10">
        {/* Navigation Back */}
        <button
          id="btn-back-to-portal-selection"
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-200 transition mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Portal Selection
        </button>

        {/* Card Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Employee Login</h2>
            <p className="text-xs text-slate-400">
              Enter your Employee ID (e.g. <span className="text-indigo-300 font-mono">EMP1001</span>) or registered email
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Employee ID or Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-employee-identifier"
                  type="text"
                  required
                  placeholder="EMP1001 or aarav.sharma@dayflow.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Password</label>
                <span className="text-[11px] text-slate-500">Default: emp123</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-employee-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 transition"
                />
              </div>
            </div>

            <button
              id="btn-employee-login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Employee Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Demo Employee Accounts (Click to fill):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('EMP1001', 'emp123')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <p className="text-xs font-semibold text-slate-200">Aarav Sharma</p>
                <p className="text-[10px] text-indigo-400 font-mono">EMP1001 • emp123</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('EMP1002', 'emp123')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <p className="text-xs font-semibold text-slate-200">Elena Rostova</p>
                <p className="text-[10px] text-indigo-400 font-mono">EMP1002 • emp123</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('EMP1005', 'emp123')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <p className="text-xs font-semibold text-slate-200">Priya Nair</p>
                <p className="text-[10px] text-indigo-400 font-mono">EMP1005 • emp123</p>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('EMP1009', 'emp123')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition"
              >
                <p className="text-xs font-semibold text-slate-200">Vikram Patel</p>
                <p className="text-[10px] text-indigo-400 font-mono">EMP1009 • emp123</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

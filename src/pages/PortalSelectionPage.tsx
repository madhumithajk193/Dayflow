import React from 'react';
import { UserCheck, ShieldCheck, ArrowRight, Clock, Award } from 'lucide-react';

interface PortalSelectionPageProps {
  onSelectPortal: (portal: 'employee' | 'hr') => void;
}

export const PortalSelectionPage: React.FC<PortalSelectionPageProps> = ({ onSelectPortal }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden text-slate-100 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full mx-auto relative z-10 space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 shadow-xl shadow-indigo-600/25 mb-1">
            <Clock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Dayflow <span className="text-indigo-400">HRMS</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-md mx-auto">
            Please select your dedicated portal to sign in and access your workspace.
          </p>
        </div>

        {/* Portal Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Employee Portal Card */}
          <button
            id="btn-select-employee-portal"
            type="button"
            onClick={() => onSelectPortal('employee')}
            className="group text-left p-8 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between space-y-6 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition duration-200 shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white group-hover:text-indigo-300 transition">
                  Employee Portal
                </h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Log working hours, scan attendance QR code, apply for leave, and manage assigned daily tasks.
                </p>
              </div>
            </div>

            <div className="flex items-center text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition pt-2">
              <span>Sign In as Employee</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition duration-200" />
            </div>
          </button>

          {/* HR Portal Card */}
          <button
            id="btn-select-hr-portal"
            type="button"
            onClick={() => onSelectPortal('hr')}
            className="group text-left p-8 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 flex flex-col justify-between space-y-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition duration-200 shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white group-hover:text-emerald-300 transition">
                  HR Portal
                </h2>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Manage employee registrations, approve leave requests, generate workplace QR kiosks, and monitor organization metrics.
                </p>
              </div>
            </div>

            <div className="flex items-center text-sm font-semibold text-emerald-400 group-hover:text-emerald-300 transition pt-2">
              <span>Sign In as HR / Admin</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition duration-200" />
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-4">
          <p className="text-xs text-slate-500">
            Dayflow Human Resource Management System • Enterprise Edition
          </p>
        </div>
      </div>
    </div>
  );
};

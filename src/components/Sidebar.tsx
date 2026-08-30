import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CalendarCheck2,
  Clock8,
  CheckSquare,
  CalendarDays,
  CreditCard,
  TrendingUp,
  FileBarChart2,
  QrCode,
  Settings,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  UserCheck,
  Building2,
  Layers,
  Sparkles,
  Bell,
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user, employee, logout, isAdmin, isHR, isEmployee } = useAuth();

  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'employees', label: 'Workforce', icon: Users },
    ...(isAdmin ? [{ id: 'hr-management', label: 'HR Management', icon: ShieldCheck }] : []),
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'work-hours', label: 'Working Hours', icon: Clock8 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'leave', label: 'Leave Requests', icon: CalendarDays },
    { id: 'payroll', label: 'Payroll', icon: CreditCard },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'barcode', label: 'Barcode / QR Terminal', icon: QrCode },
    { id: 'reports', label: 'Analytics & Reports', icon: FileBarChart2 },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const employeeNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'My Attendance', icon: CalendarCheck2 },
    { id: 'barcode', label: 'QR / Barcode Attendance Scan', icon: QrCode },
    { id: 'leave', label: 'My Leave', icon: CalendarDays },
    { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
    { id: 'payroll', label: 'My Payroll', icon: CreditCard },
    { id: 'performance', label: 'My Performance', icon: TrendingUp },
  ];

  const navItems = isHR ? adminNavItems : employeeNavItems;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-200 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold text-lg">
            D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight text-base">Dayflow</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-1.5 py-0.5 rounded uppercase">
                HRMS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal leading-tight">
              Every workday, perfectly aligned.
            </p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="mt-3 flex items-center justify-between bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Active Role:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] tracking-wide ${
              isAdmin
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : isHR
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {user?.role || 'EMPLOYEE'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          {isHR ? 'HR Administration' : 'Employee Self-Service'}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/80'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
          <img
            src={
              employee?.profile_image ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt="Profile"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/40"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100 truncate">
              {employee ? `${employee.first_name} ${employee.last_name}` : user?.email?.split('@')[0]}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {employee?.designation || user?.email}
            </p>
          </div>
          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

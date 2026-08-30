import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  FileBarChart2,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Clock8,
  TrendingUp,
  CreditCard,
  Printer,
  Sparkles,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { isHR } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'attendance' | 'work_hours' | 'performance' | 'leave' | 'payroll'>('attendance');

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error);
  }, []);

  const handleExportCSV = async (type: string) => {
    setLoading(true);
    try {
      let data: any[] = [];
      let filename = `dayflow_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;

      if (type === 'attendance') {
        const res = await api.getAllAttendance({});
        data = res.map((r: any) => ({
          EmployeeCode: r.employee_code,
          EmployeeName: r.employee_name,
          Date: r.date,
          CheckIn: r.check_in,
          CheckOut: r.check_out || 'In Progress',
          Status: r.status,
          LateMinutes: r.late_minutes,
          WorkingHours: Math.round((r.working_minutes / 60) * 10) / 10,
        }));
      } else if (type === 'work_hours') {
        const res = await api.getAllWorkHours();
        data = res.map((r: any) => ({
          EmployeeCode: r.employee.employee_code,
          EmployeeName: `${r.employee.first_name} ${r.employee.last_name}`,
          Department: r.employee.department,
          TotalSessionHours: r.loginDurationHours,
          ActiveWorkHours: r.activeHours,
          IdleHours: r.idleHours,
          ActivityScore: r.activityScore,
          ActivityFlag: r.activityFlag,
        }));
      } else if (type === 'performance') {
        const res = await api.getTopPerformers({ timeframe: 'month' });
        data = res.map((r: any, idx: number) => ({
          Rank: idx + 1,
          EmployeeCode: r.employee.employee_code,
          EmployeeName: `${r.employee.first_name} ${r.employee.last_name}`,
          Department: r.employee.department,
          AttendanceScore: r.performance.attendance_score,
          HoursScore: r.performance.working_hours_score,
          TaskScore: r.performance.task_score,
          ActivityScore: r.performance.activity_score,
          PunctualityScore: r.performance.punctuality_score,
          PenaltyDeduction: r.performance.penalty_deduction,
          OverallScore: r.performance.overall_score,
          Grade: r.performance.grade,
        }));
      } else if (type === 'leave') {
        const res = await api.getAllLeaves({});
        data = res.map((r: any) => ({
          EmployeeName: r.employee_name,
          LeaveType: r.leave_type,
          StartDate: r.start_date,
          EndDate: r.end_date,
          DaysCount: r.days_count,
          Status: r.status,
          Reason: r.reason,
          ReviewComments: r.review_comments,
        }));
      } else if (type === 'payroll') {
        const res = await api.getAllPayroll();
        data = res.map((r: any) => ({
          EmployeeName: r.employee_name,
          Currency: 'INR (₹)',
          BasicSalary: r.basic_salary,
          Allowances: (r.hra || 0) + (r.transport_allowance || 0) + (r.special_allowance || 0),
          GrossSalary: r.gross_salary,
          Deductions: (r.tax_deduction || 0) + (r.pf_deduction || 0) + (r.leave_deduction || 0),
          NetSalary: r.net_salary,
          Status: r.status,
          Month: r.month,
          Year: r.year,
        }));
      }

      if (data.length === 0) {
        alert('No records to export');
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((fieldName) => JSON.stringify(row[fieldName] ?? '', (key, value) => (value === null ? '' : value)))
            .join(',')
        ),
      ];
      const csvString = csvRows.join('\r\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Export failed.');
    } finally {
      setLoading(false);
    }
  };

  const reportModules = [
    {
      id: 'attendance',
      title: 'Attendance & Punctuality Report',
      description: 'Daily check-in/out timestamps, tardiness minutes, late penalty flags, and 3-consecutive-day absence markers.',
      icon: Clock8,
      color: 'text-emerald-400',
    },
    {
      id: 'work_hours',
      title: 'Working Hours & Inactivity Report',
      description: 'Total session durations, active application interaction hours, idle periods, and HR review flags.',
      icon: TrendingUp,
      color: 'text-blue-400',
    },
    {
      id: 'performance',
      title: 'Workforce Performance & Audit Report',
      description: 'Multi-factor evaluation breakdown (20/20/30/15/15), penalties, overall percentages, and performance grades.',
      icon: FileBarChart2,
      color: 'text-amber-400',
    },
    {
      id: 'leave',
      title: 'Leave & Absence Utilization Report',
      description: 'Leave categories (Paid, Sick, Casual), date ranges, days consumed, and HR approval justification records.',
      icon: Calendar,
      color: 'text-indigo-400',
    },
    {
      id: 'payroll',
      title: 'Compensation & Payroll Register',
      description: 'Gross compensation, HRA, statutory deductions, tax withholdings, and net disbursement amounts.',
      icon: CreditCard,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Analytics & Comprehensive Reports</h2>
          <p className="text-xs text-slate-400">
            Generate and export verified workforce intelligence data for compliance and executive auditing
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportModules.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 hover:border-indigo-500/40 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                    <Icon className={`w-6 h-6 ${m.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full uppercase">
                    CSV / Excel
                  </span>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">{m.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleExportCSV(m.id)}
                  disabled={loading}
                  className="w-full bg-slate-800 hover:bg-indigo-600 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-2 group-hover:bg-indigo-600 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export .CSV Report
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

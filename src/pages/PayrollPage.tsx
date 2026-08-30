import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Payroll } from '../types';
import { formatINR } from '../utils/currency';
import {
  CreditCard,
  IndianRupee,
  Printer,
  Download,
  Edit2,
  RefreshCw,
  X,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  Play,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

export const PayrollPage: React.FC = () => {
  const { isHR, user } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [myPayroll, setMyPayroll] = useState<(Payroll & { history?: Payroll[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPaystub, setSelectedPaystub] = useState<Payroll | null>(null);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('August');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Run/Generate Payroll State
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);

  // Payslip Download State
  const [downloadingPayslip, setDownloadingPayslip] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Payroll Modal (For HR)
  const [editPayroll, setEditPayroll] = useState<Payroll | null>(null);
  const [editForm, setEditForm] = useState({
    basic_salary: 0,
    hra: 0,
    transport_allowance: 0,
    special_allowance: 0,
    tax_deduction: 0,
    pf_deduction: 0,
    leave_deduction: 0,
    status: 'PAID' as 'PAID' | 'PENDING',
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = [2026, 2025];
  const departments = ['ALL', 'Engineering', 'Product', 'Design & UX', 'Human Resources', 'Operations', 'Sales & Growth'];

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      if (isHR) {
        const data = await api.getAllPayroll({
          month: selectedMonth,
          year: selectedYear,
          department: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        });
        setPayrolls(data);
      } else {
        const p = await api.getMyPayroll({
          month: selectedMonth,
          year: selectedYear,
        });
        setMyPayroll(p);
      }
    } catch (e) {
      console.error('Error fetching payroll:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [isHR, selectedMonth, selectedYear, selectedDepartment]);

  const handleDownloadPayslip = async (targetPayroll?: Payroll | null) => {
    if (downloadingPayslip) return;
    setDownloadingPayslip(true);
    setDownloadMsg(null);
    try {
      const p = targetPayroll || selectedPaystub || myPayroll;
      await api.downloadPayslip({
        payrollId: p?.id,
        month: p?.month || selectedMonth,
        year: p?.year || selectedYear,
      });
      setDownloadMsg({ type: 'success', text: 'Payslip downloaded successfully.' });
      setTimeout(() => setDownloadMsg(null), 4000);
    } catch (e: any) {
      console.error('Error downloading payslip:', e);
      setDownloadMsg({ type: 'error', text: e?.message || 'Unable to download payslip. Please try again.' });
      setTimeout(() => setDownloadMsg(null), 5000);
    } finally {
      setDownloadingPayslip(false);
    }
  };

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    setGenerateMsg(null);
    try {
      await api.generatePayroll({
        month: selectedMonth,
        year: selectedYear,
      });
      setGenerateMsg(`Payroll successfully processed for ${selectedMonth} ${selectedYear}`);
      await fetchPayroll();
      setTimeout(() => setGenerateMsg(null), 4000);
    } catch (e: any) {
      console.error(e);
      setGenerateMsg('Error generating payroll: ' + (e.message || 'Failed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleEditOpen = (p: Payroll) => {
    setEditPayroll(p);
    setEditForm({
      basic_salary: p.basic_salary,
      hra: p.hra,
      transport_allowance: p.transport_allowance,
      special_allowance: p.special_allowance,
      tax_deduction: p.tax_deduction,
      pf_deduction: p.pf_deduction,
      leave_deduction: p.leave_deduction,
      status: p.status || 'PAID',
    });
  };

  const handleSavePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayroll) return;
    setSaveLoading(true);
    try {
      await api.updatePayroll(editPayroll.id, editForm);
      setEditPayroll(null);
      await fetchPayroll();
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  // HR Summary Metrics
  const totalGross = payrolls.reduce((sum, p) => sum + (p.gross_salary || 0), 0);
  const totalDeductions = payrolls.reduce((sum, p) => sum + (p.tax_deduction + p.pf_deduction + p.leave_deduction), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);

  return (
    <div id="payroll-container" className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payroll & Compensation Management</h2>
          <p className="text-xs text-slate-400">
            Real workforce salary structures, statutory deductions, itemized allowances, and official payslips
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isHR && (
            <button
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Processing...' : `Run ${selectedMonth} Payroll`}
            </button>
          )}
          <button
            onClick={fetchPayroll}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3.5 py-2 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {generateMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{generateMsg}</span>
        </div>
      )}

      {downloadMsg && (
        <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
          downloadMsg.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
        }`}>
          {downloadMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{downloadMsg.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-slate-400">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-slate-900">
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter (HR only) */}
          {isHR && (
            <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Department:</span>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
              >
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="text-slate-400 text-[11px]">
          Showing payroll for <span className="text-white font-semibold">{selectedMonth} {selectedYear}</span>
        </div>
      </div>

      {/* HR Overview Metrics */}
      {isHR && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Gross Payroll
            </span>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {formatINR(totalGross)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Across {payrolls.length} active employees</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Total Deductions Withheld
            </span>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">
              -{formatINR(totalDeductions)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Tax TDS, PF & policy adjustments</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
              Total Net Disbursement
            </span>
            <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
              {formatINR(totalNet)}
            </div>
            <p className="text-[11px] text-emerald-500/80 mt-1">Net compensation payable</p>
          </div>
        </div>
      )}

      {/* Employee Personal Payroll Card */}
      {!isHR && myPayroll && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Monthly Compensation Summary</h3>
                <p className="text-xs text-slate-400">
                  Pay Period: <span className="text-indigo-300 font-semibold">{myPayroll.month || selectedMonth} {myPayroll.year || selectedYear}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => setSelectedPaystub(myPayroll)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow"
              >
                <FileText className="w-4 h-4" /> View Itemized Payslip
              </button>
              <button
                onClick={() => handleDownloadPayslip(myPayroll)}
                disabled={downloadingPayslip}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow disabled:opacity-50"
              >
                {downloadingPayslip ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloadingPayslip ? 'Generating...' : 'Download Payslip'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Gross Earnings</span>
              <div className="text-2xl font-black text-white font-mono mt-1">
                {formatINR(myPayroll.gross_salary)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Basic ({formatINR(myPayroll.basic_salary)}) + Allowances ({formatINR(myPayroll.allowances)})
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Deductions</span>
              <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                -{formatINR((myPayroll.tax_deduction || 0) + (myPayroll.pf_deduction || 0) + (myPayroll.leave_deduction || 0))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tax ({formatINR(myPayroll.tax_deduction)}) + PF ({formatINR(myPayroll.pf_deduction)})
              </p>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/40 to-slate-950 p-4 rounded-2xl border border-emerald-500/40">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Net Payout (Take-Home)</span>
              <div className="text-2xl font-black text-emerald-300 font-mono mt-1">
                {formatINR(myPayroll.net_salary)}
              </div>
              <p className="text-[11px] text-emerald-500/80 mt-1">
                Disbursed to verified bank account (INR)
              </p>
            </div>
          </div>

          {/* Historical Payrolls Table */}
          {myPayroll.history && myPayroll.history.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Voucher History</h4>
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Gross</th>
                      <th className="py-3 px-4">Deductions</th>
                      <th className="py-3 px-4">Net Payout</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {myPayroll.history.map((hist) => (
                      <tr key={hist.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-white">{hist.month} {hist.year}</td>
                        <td className="py-3 px-4 font-mono">{formatINR(hist.gross_salary)}</td>
                        <td className="py-3 px-4 font-mono text-rose-400">-{formatINR(hist.tax_deduction + hist.pf_deduction + hist.leave_deduction)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{formatINR(hist.net_salary)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {hist.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPaystub(hist)}
                              className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded-lg text-[11px] px-2 py-1 flex items-center gap-1"
                              title="View Itemized Payslip"
                            >
                              <FileText className="w-3 h-3" /> View
                            </button>
                            <button
                              onClick={() => handleDownloadPayslip(hist)}
                              disabled={downloadingPayslip}
                              className="p-1 text-emerald-300 hover:text-white bg-emerald-950/60 rounded-lg text-[11px] px-2 py-1 border border-emerald-800/40 flex items-center gap-1 disabled:opacity-50"
                              title="Download PDF Payslip"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Empty State if No Payroll for the Selected Period */}
      {!isHR && !myPayroll && !loading && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Payroll Record Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your compensation record for <span className="text-indigo-300 font-semibold">{selectedMonth} {selectedYear}</span> has not been generated yet. Please check back after HR processes the pay cycle.
            </p>
          </div>
        </div>
      )}

      {/* HR Workforce Payroll Table */}
      {isHR && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">
              Workforce Payroll Register ({selectedMonth} {selectedYear})
            </h3>
            <span className="text-xs text-slate-400">{payrolls.length} employee records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Basic Pay</th>
                  <th className="py-3.5 px-4">Allowances</th>
                  <th className="py-3.5 px-4">Gross Salary</th>
                  <th className="py-3.5 px-4">Deductions</th>
                  <th className="py-3.5 px-4">Net Payout</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No payroll records found for {selectedMonth} {selectedYear}. Click "Run {selectedMonth} Payroll" to generate records.
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {p.employee_name || p.employee_id}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {p.employee_code || p.employee_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {p.department || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono">{formatINR(p.basic_salary)}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatINR((p.hra || 0) + (p.transport_allowance || 0) + (p.special_allowance || 0))}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {formatINR(p.gross_salary)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-rose-400">
                        -{formatINR((p.tax_deduction || 0) + (p.pf_deduction || 0) + (p.leave_deduction || 0))}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                        {formatINR(p.net_salary)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPaystub(p)}
                            className="p-1.5 text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
                            title="View Itemized Payslip"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPayslip(p)}
                            disabled={downloadingPayslip}
                            className="p-1.5 text-emerald-400 hover:text-white bg-emerald-950/60 rounded-lg border border-emerald-800/40 transition disabled:opacity-50"
                            title="Download PDF Payslip"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditOpen(p)}
                            className="p-1.5 text-indigo-300 hover:text-white bg-indigo-950/60 rounded-lg border border-indigo-800/40 transition"
                            title="Edit Compensation"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {selectedPaystub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-base text-white">Official Compensation Voucher</h3>
              <button onClick={() => setSelectedPaystub(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-payslip" className="p-6 space-y-6 bg-slate-950">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-black text-white">Dayflow Technologies Inc.</h2>
                  <p className="text-xs text-slate-400">
                    Compensation Statement • {selectedPaystub.month} {selectedPaystub.year}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs text-indigo-400 font-bold bg-indigo-950 px-2.5 py-1 rounded border border-indigo-800/50">
                    SLIP #{selectedPaystub.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Employee info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Employee Name</span>
                  <span className="font-bold text-white">{selectedPaystub.employee_name || selectedPaystub.employee_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Department</span>
                  <span className="font-semibold text-slate-200">{selectedPaystub.department || 'General'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Disbursement Status</span>
                  <span className="font-bold text-emerald-400">
                    {selectedPaystub.status === 'PAID' ? 'PROCESSED & PAID' : 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-1.5">Earnings Breakdown (INR)</h4>
                  <div className="flex justify-between text-slate-300">
                    <span>Basic Salary:</span>
                    <span className="font-mono font-semibold">{formatINR(selectedPaystub.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>House Rent (HRA):</span>
                    <span className="font-mono">{formatINR(selectedPaystub.hra)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Transport Allowance:</span>
                    <span className="font-mono">{formatINR(selectedPaystub.transport_allowance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Special Allowance:</span>
                    <span className="font-mono">{formatINR(selectedPaystub.special_allowance)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-white">
                    <span>Gross Earnings:</span>
                    <span className="font-mono">{formatINR(selectedPaystub.gross_salary)}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="space-y-2 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                  <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-1.5">Deductions Breakdown (INR)</h4>
                  <div className="flex justify-between text-slate-300">
                    <span>Income Tax (TDS):</span>
                    <span className="font-mono text-rose-400">-{formatINR(selectedPaystub.tax_deduction)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Provident Fund (PF):</span>
                    <span className="font-mono text-rose-400">-{formatINR(selectedPaystub.pf_deduction)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Unpaid Leave / Adjustments:</span>
                    <span className="font-mono text-rose-400">-{formatINR(selectedPaystub.leave_deduction)}</span>
                  </div>
                  <div className="pt-8 border-t border-slate-800 flex justify-between font-bold text-rose-300">
                    <span>Total Deductions:</span>
                    <span className="font-mono">
                      -{formatINR((selectedPaystub.tax_deduction || 0) + (selectedPaystub.pf_deduction || 0) + (selectedPaystub.leave_deduction || 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Net Take-Home */}
              <div className="bg-gradient-to-r from-emerald-950/70 to-slate-900 p-4 rounded-2xl border border-emerald-500/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Net Take-Home Pay</span>
                  <span className="text-2xl font-black text-white font-mono">{formatINR(selectedPaystub.net_salary)}</span>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-950 px-3 py-1 rounded-xl border border-emerald-800 font-mono font-bold">
                  DIRECT DEPOSIT (INR)
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs text-slate-400">Confidential official payroll voucher</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-600 shadow"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Payslip
                </button>
                <button
                  onClick={() => handleDownloadPayslip(selectedPaystub)}
                  disabled={downloadingPayslip}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition shadow disabled:opacity-50"
                >
                  {downloadingPayslip ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {downloadingPayslip ? 'Generating payslip...' : 'Download Payslip'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payroll Modal */}
      {editPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-white">Edit Compensation Structure</h3>
                <p className="text-[11px] text-slate-400">
                  {editPayroll.employee_name || editPayroll.employee_id} • {editPayroll.month} {editPayroll.year}
                </p>
              </div>
              <button onClick={() => setEditPayroll(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayroll} className="p-5 space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Basic Monthly Salary (₹ / INR)</label>
                <input
                  type="number"
                  required
                  value={editForm.basic_salary}
                  onChange={(e) => setEditForm({ ...editForm, basic_salary: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={editForm.hra}
                    onChange={(e) => setEditForm({ ...editForm, hra: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Transport (₹)</label>
                  <input
                    type="number"
                    value={editForm.transport_allowance}
                    onChange={(e) => setEditForm({ ...editForm, transport_allowance: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Special Allowance (₹)</label>
                <input
                  type="number"
                  value={editForm.special_allowance}
                  onChange={(e) => setEditForm({ ...editForm, special_allowance: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Tax Deduction (₹)</label>
                  <input
                    type="number"
                    value={editForm.tax_deduction}
                    onChange={(e) => setEditForm({ ...editForm, tax_deduction: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1">PF Deduction (₹)</label>
                  <input
                    type="number"
                    value={editForm.pf_deduction}
                    onChange={(e) => setEditForm({ ...editForm, pf_deduction: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Payment Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'PAID' | 'PENDING' })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                >
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex justify-end gap-2 -mx-5 -mb-5 mt-4">
                <button
                  type="button"
                  onClick={() => setEditPayroll(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition shadow disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Update & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

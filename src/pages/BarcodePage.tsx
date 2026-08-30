import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Employee, EmployeeBarcode } from '../types';
import { IDCardModal } from '../components/IDCardModal';
import {
  QrCode,
  Scan,
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Camera,
  Layers,
  Search,
} from 'lucide-react';

export const BarcodePage: React.FC = () => {
  const { isHR, user, employee } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [barcodeData, setBarcodeData] = useState<EmployeeBarcode | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [actionMode, setActionMode] = useState<'auto' | 'check_in' | 'check_out' | 'verify'>('auto');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showIdModal, setShowIdModal] = useState(false);

  useEffect(() => {
    if (isHR) {
      api.getEmployees().then((emps) => {
        setEmployees(emps);
        if (emps.length > 0) {
          setSelectedEmp(emps[0]);
        }
      });
    } else if (employee) {
      setSelectedEmp(employee);
    }
  }, [isHR, employee]);

  useEffect(() => {
    if (selectedEmp) {
      api.generateBarcode(selectedEmp.id).then(setBarcodeData);
    }
  }, [selectedEmp]);

  const handleScan = async (overrideCode?: string) => {
    const code = overrideCode || scanInput;
    if (!code.trim()) return;
    setLoading(true);
    setScanError(null);
    setScanResult(null);

    try {
      const res = await api.scanBarcode(code.trim(), actionMode);
      setScanResult(res);
    } catch (err: any) {
      setScanError(err.message || 'Scan verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isHR ? 'QR & Barcode Identification Terminal' : 'My Digital Badge & Scan Terminal'}
          </h2>
          <p className="text-xs text-slate-400">
            {isHR
              ? 'Contactless smart badge generation, live scanning kiosk, and instant attendance synchronization'
              : 'Your official digital identification card and quick check-in terminal'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Scanning Kiosk */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
                <Scan className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Attendance Terminal Kiosk</h3>
                <p className="text-xs text-slate-400">Simulate badge scan or enter employee code</p>
              </div>
            </div>

            {/* Action mode switch */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActionMode('auto')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${actionMode === 'auto' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Auto
              </button>
              <button
                onClick={() => setActionMode('check_in')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${actionMode === 'check_in' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                In
              </button>
              <button
                onClick={() => setActionMode('check_out')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${actionMode === 'check_out' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}
              >
                Out
              </button>
            </div>
          </div>

          {/* Scanner Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {isHR ? 'Scan Barcode / QR Code' : 'Enter Badge Code or QR Payload'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                placeholder={isHR ? 'Scan badge or enter code (e.g. EMP1001)...' : 'Enter your badge code...'}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                onClick={() => handleScan()}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
                {isHR ? 'Scan Kiosk' : 'Submit Badge'}
              </button>
            </div>
          </div>

          {/* Quick Demo Badges to Test Instant Scans - HR ONLY */}
          {isHR && employees.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Badge Tap Simulator (HR Terminal):</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {employees.slice(0, 9).map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setScanInput(emp.employee_code);
                      handleScan(emp.employee_code);
                    }}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 p-2.5 rounded-xl text-left transition group"
                  >
                    <span className="font-mono text-indigo-400 text-xs font-bold block">{emp.employee_code}</span>
                    <span className="text-[11px] text-slate-300 truncate block">{emp.first_name} {emp.last_name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scan Error Feedback */}
          {scanError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Scan Success Receipt */}
          {scanResult && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-600/60 rounded-2xl text-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-800/50 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-xs text-emerald-300">
                    {scanResult.actionTaken === 'CHECK_IN_SUCCESS'
                      ? 'Attendance Check-In Successfully Recorded'
                      : scanResult.actionTaken === 'CHECK_OUT_SUCCESS'
                      ? 'Attendance Check-Out Successfully Completed'
                      : 'Employee Badge Verified'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {new Date(scanResult.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={scanResult.employee?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt="emp"
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500"
                />
                <div>
                  <h4 className="font-bold text-white text-sm">{scanResult.employee?.name || 'Employee'}</h4>
                  <p className="text-xs text-emerald-400 font-mono font-semibold">
                    {scanResult.employee?.employee_code || 'EMP'} • {scanResult.employee?.designation || 'Staff'}
                  </p>
                  <p className="text-[11px] text-slate-400">{scanResult.employee?.department || 'General'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-900/90 p-2.5 rounded-xl text-xs border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Today Work Status:</span>
                  <span className="font-bold text-white uppercase">{scanResult.currentStatus.record?.status || 'Active'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Check-in Timestamp:</span>
                  <span className="font-bold text-white font-mono">
                    {scanResult.currentStatus.record?.check_in
                      ? new Date(scanResult.currentStatus.record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Digital Badge Preview & Print */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-base text-white">Digital ID Badge</h3>
              {isHR && (
                <select
                  aria-label="Select employee badge"
                  value={selectedEmp?.id || ''}
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    if (emp) setSelectedEmp(emp);
                  }}
                  className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-2.5 py-1 text-white focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} ({emp.employee_code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedEmp && (
              <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-center space-y-3">
                <img
                  src={selectedEmp.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={selectedEmp.first_name}
                  className="w-16 h-16 rounded-full object-cover ring-2 ring-indigo-500 shadow-md"
                />
                <div>
                  <h4 className="font-bold text-base text-white">{selectedEmp.first_name} {selectedEmp.last_name}</h4>
                  <p className="text-xs text-indigo-400 font-semibold">{selectedEmp.designation}</p>
                  <p className="text-[11px] text-slate-400">{selectedEmp.department}</p>
                </div>

                <div className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                  {selectedEmp.employee_code}
                </div>

                {/* QR Display */}
                <div className="bg-white p-2.5 rounded-2xl shadow-inner mt-2">
                  {barcodeData?.qr_data ? (
                    <img src={barcodeData.qr_data} alt="QR Code" className="w-24 h-24" />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-slate-400 text-xs">
                      Loading QR...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowIdModal(true)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition shadow flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Open Full Printable ID Card
            </button>
          </div>
        </div>
      </div>

      {showIdModal && selectedEmp && (
        <IDCardModal
          employee={selectedEmp}
          isOpen={showIdModal}
          onClose={() => setShowIdModal(false)}
        />
      )}
    </div>
  );
};

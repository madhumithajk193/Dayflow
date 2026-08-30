import React, { useEffect, useState } from 'react';
import { Employee, EmployeeBarcode } from '../types';
import { api } from '../services/api';
import { QrCode, Printer, Download, X, Building2, CheckCircle2 } from 'lucide-react';

interface IDCardModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IDCardModal: React.FC<IDCardModalProps> = ({ employee, isOpen, onClose }) => {
  const [barcode, setBarcode] = useState<EmployeeBarcode | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (employee && isOpen) {
      setLoading(true);
      api.generateBarcode(employee.id)
        .then(setBarcode)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-base text-white">Employee Digital ID Badge</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card Area */}
        <div className="p-6 flex flex-col items-center justify-center bg-slate-950/50">
          <div
            id="printable-id-card"
            className="w-72 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-2xl text-center relative overflow-hidden"
          >
            {/* Top decorative stripe */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-600"></div>

            {/* Company Branding */}
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-6 w-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                D
              </div>
              <span className="font-bold text-sm tracking-tight text-white">Dayflow HRMS</span>
            </div>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
              Verified Identification
            </p>

            {/* Employee Photo */}
            <div className="mt-4 relative inline-block">
              <img
                src={employee?.profile_image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={employee?.first_name || 'Employee'}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/30 shadow-md mx-auto"
              />
              <span className="absolute bottom-0 right-0 bg-emerald-500 rounded-full p-0.5 ring-2 ring-slate-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </span>
            </div>

            {/* Name & Title */}
            <h4 className="font-bold text-base text-white mt-3 leading-tight">
              {employee.first_name} {employee.last_name}
            </h4>
            <p className="text-xs text-indigo-400 font-medium">{employee.designation}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{employee.department}</p>

            {/* Employee Code Badge */}
            <div className="mt-3 inline-block bg-slate-800 border border-slate-700 px-3 py-1 rounded-full font-mono text-xs font-bold text-emerald-400 tracking-wider">
              {employee.employee_code}
            </div>

            {/* QR Code */}
            <div className="mt-4 bg-white p-2.5 rounded-xl shadow-inner inline-block">
              {barcode?.qr_data ? (
                <img src={barcode.qr_data} alt="QR Code" className="w-28 h-28 mx-auto" />
              ) : (
                <div className="w-28 h-28 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-500 mt-3 font-mono">
              Issued: {employee.joining_date} • Auth ID: {employee.id}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-800/60 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">Scannable by Dayflow Attendance kiosk</span>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Badge
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

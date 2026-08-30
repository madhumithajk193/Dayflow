import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ArrowRight,
  Sparkles,
  Camera,
  CameraOff,
  Volume2,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeSessionPayload, setActiveSessionPayload] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const containerId = 'html5-qr-reader-element';

  // Play subtle confirmation beep using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio context might be restricted before user interaction
    }
  };

  // Fetch current live QR session for instant verification simulation
  useEffect(() => {
    if (isOpen) {
      api.getAttendanceQRSession()
        .then((s) => setActiveSessionPayload(s.qrPayload))
        .catch(() => {});
    }
  }, [isOpen]);

  // Stop camera helper
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      } finally {
        scannerRef.current = null;
        setIsCameraActive(false);
      }
    }
  };

  // Initialize camera scanner
  const startCamera = async () => {
    setCameraError(null);
    setErrorMsg(null);

    // Stop any existing instance
    await stopCamera();

    // Small delay to ensure DOM container is mounted
    setTimeout(async () => {
      const element = document.getElementById(containerId);
      if (!element) return;

      try {
        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Debounce rapid scans (limit to once every 2.5 seconds)
            const now = Date.now();
            if (now - lastScanTimeRef.current < 2500) {
              return;
            }
            lastScanTimeRef.current = now;
            handleScan(decodedText);
          },
          () => {
            // Ignored per-frame decode errors (normal while searching for QR)
          }
        );

        setIsCameraActive(true);
      } catch (err: any) {
        console.warn('Camera initialization error:', err);
        let msg = 'Camera could not be started.';
        const errStr = String(err).toLowerCase();
        if (errStr.includes('notallowederror') || errStr.includes('permission')) {
          msg = 'Camera permission is required. Please allow camera permissions in your browser to scan live barcodes.';
        } else if (errStr.includes('notfounderror') || errStr.includes('devices not found')) {
          msg = 'No camera device found on this system. You can enter or scan your badge code manually below.';
        } else {
          msg = `Camera access error: ${err.message || err}. You can enter badge code manually below.`;
        }
        setCameraError(msg);
        setIsCameraActive(false);
      }
    }, 150);
  };

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleScan = async (targetCode: string) => {
    const cleanCode = targetCode.trim();
    if (!cleanCode) {
      setErrorMsg('Please provide a valid QR code or badge code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResult(null);

    try {
      // Execute authenticated attendance recording
      const res = await api.scanQRAttendance(cleanCode);
      playBeep();
      setResult(res);
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify QR attendance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
        {/* Header */}
        <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Live QR Attendance Scanner</h3>
              <p className="text-xs text-slate-400">Scan workplace QR code to mark check-in/out</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              mode === 'camera'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" /> Live Camera Scanner
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
              mode === 'manual'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Keyboard className="w-4 h-4" /> Manual / Badge Code
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Camera View Mode */}
          {mode === 'camera' && (
            <div className="space-y-3">
              <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
                {/* Real HTML5 QR Video Element */}
                <div
                  id={containerId}
                  className={`w-full overflow-hidden rounded-2xl ${isCameraActive ? 'block' : 'hidden'}`}
                  style={{ minHeight: '240px' }}
                />

                {/* Loading / Connecting state */}
                {!isCameraActive && !cameraError && (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-4 space-y-3">
                    <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                    <p className="text-xs text-slate-300 font-medium">Initializing camera stream...</p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Please allow browser camera permissions when prompted.
                    </p>
                  </div>
                )}

                {/* Camera Permission / Device Error */}
                {cameraError && (
                  <div className="py-8 px-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl">
                      <CameraOff className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-amber-200 font-medium">{cameraError}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg transition"
                      >
                        Retry Camera
                      </button>
                      <button
                        onClick={() => setMode('manual')}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs text-white rounded-lg transition"
                      >
                        Switch to Manual Input
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Auto-detects active workplace QR
                </span>
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Audio confirmation enabled
                </span>
              </div>
            </div>
          )}

          {/* Manual Input Mode */}
          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Barcode / QR Payload / Employee Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter employee code (e.g. EMP1001) or QR token..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScan(code)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    onClick={() => handleScan(code)}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Live Office Session Quick Simulation */}
          {activeSessionPayload && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Active Office QR Kiosk Available</p>
                  <p className="text-[10px] text-slate-400">Click to verify attendance against today's terminal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCode(activeSessionPayload);
                  handleScan(activeSessionPayload);
                }}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow whitespace-nowrap disabled:opacity-50"
              >
                Scan Live Session
              </button>
            </div>
          )}

          {/* Success Result Receipt */}
          {result && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2 text-emerald-300 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{result.message || 'Attendance Recorded Successfully!'}</span>
              </div>
              {result.attendance && (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-emerald-500/20 space-y-1">
                  <p className="text-[11px]">
                    Status: <span className="font-bold text-white uppercase">{result.attendance.status}</span>
                  </p>
                  <p className="text-[11px]">
                    Check-in:{' '}
                    <span className="font-mono text-emerald-300 font-semibold">
                      {result.attendance.check_in ? new Date(result.attendance.check_in).toLocaleTimeString() : 'Recorded'}
                    </span>
                  </p>
                  {result.attendance.check_out && (
                    <p className="text-[11px]">
                      Check-out:{' '}
                      <span className="font-mono text-rose-300 font-semibold">
                        {new Date(result.attendance.check_out).toLocaleTimeString()}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Feedback */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};

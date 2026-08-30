import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { EmployeeDetailPage } from './pages/EmployeeDetailPage';
import { AttendancePage } from './pages/AttendancePage';
import { WorkHoursPage } from './pages/WorkHoursPage';
import { TasksPage } from './pages/TasksPage';
import { LeavePage } from './pages/LeavePage';
import { PayrollPage } from './pages/PayrollPage';
import { PerformancePage } from './pages/PerformancePage';
import { BarcodePage } from './pages/BarcodePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HRManagementPage } from './pages/HRManagementPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { QRScannerModal } from './components/QRScannerModal';
import { IDCardModal } from './components/IDCardModal';
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, employee, loading, isHR, isAdmin } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  
  // Modals
  const [scannerOpen, setScannerOpen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">Initializing Dayflow HRMS...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleSelectEmployee = (id: string) => {
    if (isHR) {
      setSelectedEmployeeId(id);
      setCurrentView('employee-detail');
    }
  };

  const renderContent = () => {
    // RBAC: If an employee attempts to view HR-exclusive sections, redirect to dashboard
    if (!isHR && ['employees', 'hr-management', 'reports', 'settings', 'work-hours', 'notifications'].includes(currentView)) {
      return (
        <DashboardPage
          onNavigate={(v) => setCurrentView(v)}
          onOpenScanner={() => setScannerOpen(true)}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(v) => setCurrentView(v)}
            onOpenScanner={() => setScannerOpen(true)}
          />
        );
      case 'notifications':
        return isHR ? <NotificationsPage onNavigate={(v) => setCurrentView(v)} /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      case 'employees':
        return isHR ? <EmployeesPage onSelectEmployee={handleSelectEmployee} /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      case 'hr-management':
        return isAdmin ? <HRManagementPage /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      case 'employee-detail':
        return (
          <EmployeeDetailPage
            employeeId={isHR ? (selectedEmployeeId || employee?.id || '') : (employee?.id || '')}
            onBack={() => setCurrentView(isHR ? 'employees' : 'dashboard')}
          />
        );
      case 'profile':
        return (
          <EmployeeDetailPage
            employeeId={employee?.id || ''}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      case 'attendance':
        return <AttendancePage />;
      case 'work-hours':
        return isHR ? <WorkHoursPage /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      case 'tasks':
        return <TasksPage />;
      case 'leave':
        return <LeavePage />;
      case 'payroll':
        return <PayrollPage />;
      case 'performance':
        return <PerformancePage onSelectEmployee={handleSelectEmployee} />;
      case 'barcode':
        return <BarcodePage />;
      case 'reports':
        return isHR ? <ReportsPage /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      case 'settings':
        return isHR ? <SettingsPage /> : <DashboardPage onNavigate={(v) => setCurrentView(v)} />;
      default:
        return (
          <DashboardPage
            onNavigate={(v) => setCurrentView(v)}
            onOpenScanner={() => setScannerOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(v) => {
          setSelectedEmployeeId(null);
          setCurrentView(v);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentView={currentView}
          onNavigate={(v) => setCurrentView(v)}
          onOpenScanner={() => setScannerOpen(true)}
          onOpenIdCard={() => setIdCardOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Global Modals */}
      {scannerOpen && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {idCardOpen && employee && (
        <IDCardModal
          employee={employee}
          isOpen={idCardOpen}
          onClose={() => setIdCardOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

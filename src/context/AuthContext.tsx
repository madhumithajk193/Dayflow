import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Employee } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  login: (identifier: string, pass: string, portal?: 'employee' | 'hr') => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  quickLogin: (type: 'admin' | 'hr' | 'emp1001' | 'emp1004_low_activity' | 'emp1005_late' | 'emp1009_absence') => Promise<void>;
  isAdmin: boolean;
  isHR: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setEmployee(data.employee);
    } catch (e) {
      api.clearToken();
      setUser(null);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('dayflow_token');
    if (token) {
      refreshProfile();
    } else {
      setLoading(false);
    }
  }, [refreshProfile]);

  // Periodic ethical activity heartbeat when user is active
  useEffect(() => {
    if (!user || !user.employee_id) return;

    // Send heartbeat every 60 seconds
    const interval = setInterval(() => {
      api.sendHeartbeat('PORTAL_INTERACTION', 'User actively viewing Dayflow HRMS').catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (identifier: string, pass: string, portal?: 'employee' | 'hr') => {
    setLoading(true);
    try {
      const res = await api.login(identifier, pass, portal);
      setUser(res.user);
      setEmployee(res.employee);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.register(data);
      setUser(res.user);
      setEmployee(res.employee);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } finally {
      setUser(null);
      setEmployee(null);
      setLoading(false);
    }
  };

  const quickLogin = async (type: 'admin' | 'hr' | 'emp1001' | 'emp1004_low_activity' | 'emp1005_late' | 'emp1009_absence') => {
    const creds: Record<string, { email: string; pass: string }> = {
      admin: { email: 'admin@dayflow.com', pass: 'admin123' },
      hr: { email: 'hr@dayflow.com', pass: 'hr123' },
      emp1001: { email: 'aarav.sharma@dayflow.com', pass: 'emp123' },
      emp1004_low_activity: { email: 'rohan.verma@dayflow.com', pass: 'emp123' },
      emp1005_late: { email: 'priya.nair@dayflow.com', pass: 'emp123' },
      emp1009_absence: { email: 'vikram.patel@dayflow.com', pass: 'emp123' },
    };

    const target = creds[type];
    if (target) {
      await login(target.email, target.pass);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isHR = user?.role === 'HR' || user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        quickLogin,
        isAdmin,
        isHR,
        isEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

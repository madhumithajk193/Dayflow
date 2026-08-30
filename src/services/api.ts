import { User, Employee, Attendance, AttendanceReview, ThreeDayAbsenceAlert, WorkSession, Task, LeaveRequest, PerformanceRecord, PerformancePenalty, TopPerformer, Payroll, NotificationItem, EmployeeBarcode, SystemSettings, DashboardStats, DashboardCharts, AuditLog, HRStaff, CreateHRPayload } from '../types';

const API_BASE = '/api';

function toQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'ALL') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('dayflow_token');
  }

  public setToken(token: string) {
    localStorage.setItem('dayflow_token', token);
  }

  public clearToken() {
    localStorage.removeItem('dayflow_token');
    localStorage.removeItem('dayflow_user');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data: T; message: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const resData = await response.json().catch(() => ({
      success: false,
      message: 'Network or parsing error',
      errorCode: 'PARSE_ERROR',
    }));

    if (!response.ok || !resData.success) {
      throw new Error(resData.message || 'API request failed');
    }

    return resData;
  }

  // Auth
  async login(identifierOrEmail: string, password: string, portal?: 'employee' | 'hr'): Promise<{ token: string; user: User; employee: Employee | null }> {
    const res = await this.request<{ token: string; user: User; employee: Employee | null }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifierOrEmail, email: identifierOrEmail, password, portal }),
    });
    this.setToken(res.data.token);
    localStorage.setItem('dayflow_user', JSON.stringify(res.data.user));
    return res.data;
  }

  async register(data: any): Promise<{ token: string; user: User; employee: Employee }> {
    const res = await this.request<{ token: string; user: User; employee: Employee }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.data.token);
    localStorage.setItem('dayflow_user', JSON.stringify(res.data.user));
    return res.data;
  }

  async getMe(): Promise<{ user: User; employee: Employee | null }> {
    const res = await this.request<{ user: User; employee: Employee | null }>('/auth/me');
    return res.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await this.request<DashboardStats>('/dashboard/stats');
    return res.data;
  }

  async getDashboardCharts(): Promise<DashboardCharts> {
    const res = await this.request<DashboardCharts>('/dashboard/charts');
    return res.data;
  }

  // Employees
  async getEmployees(params: { search?: string; department?: string; status?: string } = {}): Promise<Employee[]> {
    const query = toQueryString({
      search: params.search?.trim(),
      department: params.department !== 'ALL' ? params.department : undefined,
      status: params.status !== 'ALL' ? params.status : undefined,
    });
    const res = await this.request<Employee[]>(`/employees${query}`);
    return res.data;
  }

  async getEmployeeById(id: string): Promise<{
    employee: Employee;
    barcode: EmployeeBarcode | null;
    performance: PerformanceRecord;
    penalties: PerformancePenalty[];
    todayStatus: { todayDate: string; record: Attendance | null; isCheckedIn: boolean; isCheckedOut: boolean; activeSession: WorkSession | null };
    activity: any;
    tasks: Task[];
    attendanceHistory: Attendance[];
    payroll: Payroll | null;
    leaveRequests: LeaveRequest[];
  }> {
    const res = await this.request<any>(`/employees/${id}`);
    return res.data;
  }

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await this.request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const res = await this.request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.request(`/employees/${id}`, { method: 'DELETE' });
  }

  async getPendingApprovals(): Promise<Employee[]> {
    const res = await this.request<Employee[]>('/employees-approvals');
    return res.data;
  }

  async approveEmployee(id: string): Promise<Employee> {
    const res = await this.request<Employee>(`/employees/${id}/approve`, { method: 'PUT' });
    return res.data;
  }

  async rejectEmployee(id: string): Promise<Employee> {
    const res = await this.request<Employee>(`/employees/${id}/reject`, { method: 'PUT' });
    return res.data;
  }

  // Attendance
  async scanQRAttendance(qr_data: string): Promise<{ success: boolean; message: string; attendance: Attendance; session: WorkSession }> {
    const res = await this.request<any>('/attendance/scan-qr', {
      method: 'POST',
      body: JSON.stringify({ qr_data }),
    });
    return res.data;
  }

  async getAttendanceQRSession(): Promise<{ sessionId: string; qrDataUrl: string; qrPayload: string; expiresAt: string }> {
    const res = await this.request<{ sessionId: string; qrDataUrl: string; qrPayload: string; expiresAt: string }>('/attendance/qr-session');
    return res.data;
  }

  async checkIn(employee_id?: string, custom_time?: string): Promise<{ attendance: Attendance; session: WorkSession }> {
    const res = await this.request<{ attendance: Attendance; session: WorkSession }>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify({ employee_id, custom_time }),
    });
    return res.data;
  }

  async checkOut(employee_id?: string, custom_time?: string): Promise<{ attendance: Attendance; session: WorkSession }> {
    const res = await this.request<{ attendance: Attendance; session: WorkSession }>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify({ employee_id, custom_time }),
    });
    return res.data;
  }

  async getMyAttendance(): Promise<{ history: Attendance[]; todayStatus: any }> {
    const res = await this.request<{ history: Attendance[]; todayStatus: any }>('/attendance/my');
    return res.data;
  }

  async getAllAttendance(params: { date?: string; department?: string; status?: string } = {}): Promise<Attendance[]> {
    const query = toQueryString({
      date: params.date,
      department: params.department !== 'ALL' ? params.department : undefined,
      status: params.status !== 'ALL' ? params.status : undefined,
    });
    const res = await this.request<Attendance[]>(`/attendance/all${query}`);
    return res.data;
  }

  async getThreeDayAlerts(): Promise<ThreeDayAbsenceAlert[]> {
    const res = await this.request<ThreeDayAbsenceAlert[]>('/attendance/three-day-alerts');
    return res.data;
  }

  async logAbsenceReview(data: {
    employee_id: string;
    review_note: string;
    alert_id?: string;
    absent_dates?: string[];
    consecutive_days?: number;
    action_taken?: string;
  }): Promise<AttendanceReview> {
    const res = await this.request<AttendanceReview>('/attendance/review', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async getAttendanceReviews(employeeId?: string): Promise<AttendanceReview[]> {
    const endpoint = employeeId ? `/attendance/reviews/${employeeId}` : '/attendance/reviews';
    const res = await this.request<AttendanceReview[]>(endpoint);
    return res.data;
  }

  // Work Hours & Activity
  async getMyWorkHours(): Promise<{ todaySession: any; sessions: WorkSession[]; totalHours: number; activeHours: number; idleHours: number }> {
    const res = await this.request<any>('/work-hours/my');
    return res.data;
  }

  async getAllWorkHours(): Promise<any[]> {
    const res = await this.request<any[]>('/work-hours/all');
    return res.data;
  }

  async getLowActivityEmployees(): Promise<any[]> {
    const res = await this.request<any[]>('/work-hours/low-activity');
    return res.data;
  }

  async getEmployeeWorkHours(empId: string): Promise<any> {
    const res = await this.request<any>(`/work-hours/${empId}`);
    return res.data;
  }

  async sendHeartbeat(activity_type = 'USER_INTERACTION', details = 'User active in Dayflow portal'): Promise<any> {
    const res = await this.request<any>('/activity/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ activity_type, details }),
    });
    return res.data;
  }

  async getEmployeeActivity(empId: string): Promise<{ analysis: any; recentLogs: any[] }> {
    const res = await this.request<any>(`/activity/${empId}`);
    return res.data;
  }

  // Performance
  async getMyPerformance(): Promise<{ performance: PerformanceRecord; penalties: PerformancePenalty[] }> {
    const res = await this.request<{ performance: PerformanceRecord; penalties: PerformancePenalty[] }>('/performance/my');
    return res.data;
  }

  async getEmployeePerformance(empId: string): Promise<{ performance: PerformanceRecord; penalties: PerformancePenalty[] }> {
    const res = await this.request<any>(`/performance/${empId}`);
    return res.data;
  }

  async getTopPerformers(params: { timeframe?: string; department?: string } = {}): Promise<TopPerformer[]> {
    const query = toQueryString({
      timeframe: params.timeframe,
      department: params.department !== 'ALL' ? params.department : undefined,
    });
    const res = await this.request<TopPerformer[]>(`/performance/top-performers${query}`);
    return res.data;
  }

  async getPenalties(params: { employee_id?: string } = {}): Promise<PerformancePenalty[]> {
    const query = toQueryString({ employee_id: params.employee_id });
    const res = await this.request<PerformancePenalty[]>(`/performance/penalties${query}`);
    return res.data;
  }

  async recalculatePerformance(): Promise<void> {
    await this.request('/performance/recalculate', { method: 'POST' });
  }

  async recalculateAllPerformance(): Promise<void> {
    await this.request('/performance/recalculate', { method: 'POST' });
  }

  // Tasks
  async getTasks(params: { status?: string; priority?: string } = {}): Promise<Task[]> {
    const query = toQueryString({
      status: params.status !== 'ALL' ? params.status : undefined,
      priority: params.priority !== 'ALL' ? params.priority : undefined,
    });
    const res = await this.request<Task[]>(`/tasks${query}`);
    return res.data;
  }

  async getAllTasks(params: { status?: string; priority?: string } = {}): Promise<Task[]> {
    return this.getTasks(params);
  }

  async getMyTasks(): Promise<Task[]> {
    const res = await this.request<Task[]>('/tasks/my');
    return res.data;
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    const res = await this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    const res = await this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async updateTaskStatus(id: string, status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'): Promise<Task> {
    return this.updateTask(id, { status });
  }

  async deleteTask(id: string): Promise<void> {
    await this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  // Leave
  async applyLeave(data: { leave_type: string; start_date: string; end_date: string; reason: string }): Promise<LeaveRequest> {
    const res = await this.request<LeaveRequest>('/leave', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async getMyLeaves(): Promise<LeaveRequest[]> {
    const res = await this.request<LeaveRequest[]>('/leave/my');
    return res.data;
  }

  async getAllLeaves(params: { status?: string } = {}): Promise<LeaveRequest[]> {
    const query = toQueryString({
      status: params.status !== 'ALL' ? params.status : undefined,
    });
    const res = await this.request<LeaveRequest[]>(`/leave/all${query}`);
    return res.data;
  }

  async reviewLeave(id: string, data: { status: 'APPROVED' | 'REJECTED'; review_comments?: string }): Promise<LeaveRequest> {
    const res = await this.request<LeaveRequest>(`/leave/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async approveLeave(id: string, comment?: string): Promise<LeaveRequest> {
    return this.reviewLeave(id, { status: 'APPROVED', review_comments: comment });
  }

  async rejectLeave(id: string, comment?: string): Promise<LeaveRequest> {
    return this.reviewLeave(id, { status: 'REJECTED', review_comments: comment });
  }

  // Payroll
  async getMyPayroll(params: { month?: string; year?: number } = {}): Promise<Payroll & { history?: Payroll[] }> {
    const query = toQueryString({
      month: params.month,
      year: params.year,
    });
    const res = await this.request<Payroll & { history?: Payroll[] }>(`/payroll/my${query}`);
    return res.data;
  }

  async getAllPayroll(params: { month?: string; year?: number; department?: string } = {}): Promise<Payroll[]> {
    const query = toQueryString({
      month: params.month,
      year: params.year,
      department: params.department !== 'ALL' ? params.department : undefined,
    });
    const res = await this.request<Payroll[]>(`/payroll/all${query}`);
    return res.data;
  }

  async generatePayroll(data: { month?: string; year?: number; employee_id?: string } = {}): Promise<Payroll | Payroll[]> {
    const res = await this.request<any>('/payroll/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async updatePayroll(id: string, data: Partial<Payroll>): Promise<Payroll> {
    const res = await this.request<Payroll>(`/payroll/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async downloadPayslip(params?: { payrollId?: string; month?: string; year?: number }): Promise<{ filename: string }> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let endpoint = '/payroll/my/payslip';
    if (params?.payrollId) {
      endpoint = `/payroll/${params.payrollId}/payslip`;
    } else if (params?.month || params?.year) {
      const query = toQueryString({ month: params.month, year: params.year });
      endpoint = `/payroll/my/payslip${query}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      let errorMsg = 'Unable to download payslip. Please try again.';
      try {
        const errJson = await response.json();
        if (errJson?.message) errorMsg = errJson.message;
      } catch (_) {
        // ignore parse error
      }
      throw new Error(errorMsg);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      throw new Error('Server did not return a valid PDF payslip.');
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded payslip file is empty.');
    }

    let filename = `Dayflow_Payslip_${params?.month || 'August'}_${params?.year || 2026}.pdf`;
    const disposition = response.headers.get('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);

    return { filename };
  }

  // Barcode & QR
  async generateBarcode(employee_id?: string): Promise<EmployeeBarcode> {
    const res = await this.request<EmployeeBarcode>('/barcode/generate', {
      method: 'POST',
      body: JSON.stringify({ employee_id }),
    });
    return res.data;
  }

  async scanBarcode(code: string, action: 'auto' | 'check_in' | 'check_out' | 'verify' = 'auto'): Promise<any> {
    const res = await this.request<any>('/barcode/scan', {
      method: 'POST',
      body: JSON.stringify({ code, action }),
    });
    return res.data;
  }

  // Notifications (HR & Admin only)
  async getNotifications(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
    const res = await this.request<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications');
    return res.data;
  }

  async getUnreadNotificationCount(): Promise<number> {
    const res = await this.request<{ unreadCount: number }>('/notifications/unread-count');
    return res.data?.unreadCount || 0;
  }

  async markNotificationRead(id: string): Promise<NotificationItem> {
    const res = await this.request<NotificationItem>(`/notifications/${id}/read`, { method: 'PATCH' });
    return res.data;
  }

  async markNotificationDone(id: string): Promise<NotificationItem> {
    const res = await this.request<NotificationItem>(`/notifications/${id}/done`, { method: 'PATCH' });
    return res.data;
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.request('/notifications/read-all', { method: 'PATCH' });
  }

  // Settings & Audit
  async getSettings(): Promise<SystemSettings> {
    const res = await this.request<SystemSettings>('/settings');
    return res.data;
  }

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await this.request<SystemSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.data;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await this.request<AuditLog[]>('/audit');
    return res.data;
  }

  async reseedDatabase(): Promise<void> {
    await this.request('/system/reseed', { method: 'POST' });
  }

  async reseedSystem(): Promise<void> {
    await this.request('/system/reseed', { method: 'POST' });
  }

  // HR Management (ADMIN-ONLY)
  async getHRStaffList(): Promise<HRStaff[]> {
    const res = await this.request<HRStaff[]>('/admin/hr');
    return res.data;
  }

  async createHR(data: CreateHRPayload): Promise<HRStaff> {
    const res = await this.request<HRStaff>('/admin/hr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.data;
  }
}

export const api = new ApiClient();

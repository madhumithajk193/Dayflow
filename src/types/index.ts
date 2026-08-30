export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  employee_id: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  designation: string;
  joining_date: string;
  salary: number;
  profile_image: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';
  created_at: string;
  updated_at: string;
  // Computed runtime fields
  today_status?: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'LATE' | 'NOT_CHECKED_IN';
  is_checked_in?: boolean;
  performance_score?: number;
  performance_grade?: string;
  activity_flag?: 'NORMAL' | 'LOW_ACTIVITY' | 'REQUIRES_REVIEW' | 'OFFLINE';
}

export interface Attendance {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  profile_image?: string;
  date: string;
  check_in: string;
  check_out: string | null;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'LATE';
  late_minutes: number;
  working_minutes: number;
  reason: string | null;
  timestamps: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  attendance_id: string;
  start_time: string;
  end_time: string | null;
  active_minutes: number;
  idle_minutes: number;
  break_minutes: number;
  total_minutes: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface Task {
  id: string;
  employee_id: string;
  assigned_to?: string;
  assigned_to_name?: string;
  employee_name?: string;
  employee_code?: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  due_date: string;
  completion_date: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  profile_image?: string;
  leave_type: 'PAID' | 'SICK' | 'CASUAL' | 'MATERNITY' | 'PATERNITY' | 'UNPAID';
  start_date: string;
  end_date: string;
  days_count: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hr_comment?: string | null;
  review_comments?: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PerformanceRecord {
  id: string;
  employee_id: string;
  period: string;
  attendance_score: number;
  working_hours_score: number;
  task_score: number;
  activity_score: number;
  punctuality_score: number;
  penalty_deduction: number;
  overall_score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  calculated_at: string;
}

export interface PerformancePenalty {
  id: string;
  employee_id: string;
  old_score: number;
  penalty?: number;
  penalty_percentage?: number;
  new_score: number;
  reason: string;
  violation_type: string;
  date?: string;
  timestamp: string;
}

export interface TopPerformer {
  employee: Employee;
  performance: PerformanceRecord;
  rank: number;
}

export interface Payroll {
  id: string;
  employee_id: string;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  designation?: string;
  basic_salary: number;
  hra: number;
  transport_allowance: number;
  special_allowance: number;
  allowances: number;
  tax_deduction: number;
  pf_deduction: number;
  leave_deduction: number;
  deductions: number;
  gross_salary: number;
  net_salary: number;
  pay_period: string;
  month?: string;
  year?: number;
  status: 'PAID' | 'PENDING';
  disbursement_date: string | null;
  updated_at: string;
  employee?: Employee;
}

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  recipient_user_id?: string | null;
  employee_id?: string | null;
  employee_code?: string;
  employee_name?: string;
  department?: string;
  profile_image?: string;
  title: string;
  message: string;
  type: 'leave' | 'late' | 'absence_alert' | 'low_activity' | 'performance' | 'system' | 'task' | string;
  read: boolean;
  is_read: boolean;
  is_done?: boolean;
  reference_id?: string | null;
  reference_type?: string | null;
  created_at: string;
  read_at?: string | null;
  done_at?: string | null;
}

export interface EmployeeBarcode {
  id: string;
  employee_id: string;
  barcode_code: string;
  qr_data: string;
  generated_at: string;
}

export interface SystemSettings {
  officeStartTime?: string;
  official_start_time?: string;
  officeEndTime?: string;
  official_end_time?: string;
  gracePeriodMinutes?: number;
  grace_period_minutes?: number;
  minimumWorkingHoursPerDay?: number;
  minimum_working_hours?: number;
  idleThresholdMinutes?: number;
  idle_threshold_minutes?: number;
  lateOccurrenceThreshold?: number;
  late_occurrence_threshold?: number;
  latePenaltyPercentage?: number;
  late_penalty_percentage?: number;
  consecutiveAbsenceThreshold?: number;
  consecutive_absence_threshold?: number;
  performanceWeights: {
    attendance: number;
    workingHours: number;
    taskCompletion: number;
    activity: number;
    punctuality: number;
  };
}

export interface AttendanceReview {
  id: string;
  alert_id?: string | null;
  employee_id: string;
  hr_id: string;
  hr_email: string;
  review_note: string;
  absent_dates: string;
  consecutive_days: number;
  status: 'REQUIRES_HR_REVIEW' | 'REVIEWED' | 'RESOLVED';
  action_taken?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreeDayAbsenceAlert {
  id: string;
  alert_id?: string;
  employee: Employee;
  absentDates: string[];
  consecutiveDays: number;
  reviewStatus: 'REQUIRES_HR_REVIEW' | 'REVIEWED' | 'RESOLVED' | string;
  review?: {
    id: string;
    review_note: string;
    reviewed_by: string;
    reviewed_at: string;
    status: string;
    action_taken?: string;
  } | null;
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  leaveToday: number;
  lateToday: number;
  avgWorkingHours: number;
  avgPerformance: number;
  lowActivityCount: number;
  pendingLeaveRequests: number;
  threeDayAbsenceCount: number;
  threeDayAbsenceAlerts: ThreeDayAbsenceAlert[];
}

export interface DashboardCharts {
  attendanceTrend: Array<{ date: string; present: number; late: number; leave: number; absent: number }>;
  departmentPerformance: Array<{ department: string; avgScore: number }>;
  performanceDistribution: Array<{ grade: string; count: number }>;
  workingHours: Array<{ range: string; count: number }>;
  leaveStats: Array<{ type: string; count: number }>;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  actor?: string;
  action: string;
  entity?: string;
  target_entity?: string;
  entity_id?: string;
  target_id?: string;
  details: any;
  timestamp: string;
}

export interface HRStaff {
  id: string;
  user_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_code: string;
  department: string;
  designation: string;
  role: 'ADMIN' | 'HR';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | string;
  created_at: string;
}

export interface CreateHRPayload {
  first_name: string;
  last_name: string;
  email: string;
  employee_code: string;
  password: string;
  department: string;
  designation: string;
  phone?: string;
  address?: string;
  salary?: number;
}


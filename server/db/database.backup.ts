// BACKUP of original JSON persistence layer before PostgreSQL migration
import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'ADMIN' | 'HR' | 'EMPLOYEE';
  employee_id: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  employee_code: string; // EMP1001
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
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  check_in: string; // ISO
  check_out: string | null; // ISO
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
  start_time: string; // ISO
  end_time: string | null; // ISO
  active_minutes: number;
  idle_minutes: number;
  break_minutes: number;
  total_minutes: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface ActivityLog {
  id: string;
  employee_id: string;
  timestamp: string; // ISO
  activity_type: string;
  details: string;
}

export interface Task {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  due_date: string; // YYYY-MM-DD
  completion_date: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: 'PAID' | 'SICK' | 'UNPAID';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  days_count: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  hr_comment: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PerformanceRecord {
  id: string;
  employee_id: string;
  period: string; // e.g. "Current Period" or "2026-Q1"
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
  penalty: number;
  new_score: number;
  reason: string;
  violation_type: string;
  timestamp: string;
}

export interface Payroll {
  id: string;
  employee_id: string;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_salary: number;
  pay_period: string;
  status: 'PAID' | 'PENDING';
  disbursement_date: string | null;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id?: string;
  employee_id: string;
  title: string;
  message: string;
  type: 'leave' | 'late' | 'absence_alert' | 'low_activity' | 'performance' | 'system';
  read: boolean;
  created_at: string;
}

export interface EmployeeBarcode {
  id: string;
  employee_id: string;
  barcode_code: string;
  qr_data: string;
  generated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  official_start_time: string; // "09:00"
  official_end_time: string; // "18:00"
  grace_period_minutes: number; // 15
  minimum_working_hours: number; // 8
  idle_threshold_minutes: number; // 30
  late_occurrence_threshold: number; // 3
  late_penalty_percentage: number; // 1
  weight_attendance: number; // 0.20
  weight_working_hours: number; // 0.20
  weight_task_completion: number; // 0.30
  weight_activity: number; // 0.15
  weight_punctuality: number; // 0.15
  consecutive_absence_threshold: number; // 3
}

export interface DatabaseSchema {
  users: User[];
  employees: Employee[];
  departments: Department[];
  attendance: Attendance[];
  work_sessions: WorkSession[];
  activity_logs: ActivityLog[];
  tasks: Task[];
  leave_requests: LeaveRequest[];
  performance_records: PerformanceRecord[];
  performance_penalties: PerformancePenalty[];
  payroll: Payroll[];
  notifications: Notification[];
  employee_barcodes: EmployeeBarcode[];
  audit_logs: AuditLog[];
  settings: SystemSettings;
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'dayflow_database.json');

export const defaultSettingsBackup: SystemSettings = {
  official_start_time: '09:00',
  official_end_time: '18:00',
  grace_period_minutes: 15,
  minimum_working_hours: 8,
  idle_threshold_minutes: 30,
  late_occurrence_threshold: 3,
  late_penalty_percentage: 1,
  weight_attendance: 0.20,
  weight_working_hours: 0.20,
  weight_task_completion: 0.30,
  weight_activity: 0.15,
  weight_punctuality: 0.15,
  consecutive_absence_threshold: 3,
};

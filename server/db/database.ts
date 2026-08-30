import pg from 'pg';
const { Pool } = pg;
import { getPgPool } from './index.js';

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
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';
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

export interface AttendanceReview {
  id: string;
  alert_id?: string | null;
  employee_id: string;
  hr_id: string;
  hr_email: string;
  review_note: string;
  absent_dates: string; // String or comma-separated/JSON format
  consecutive_days: number;
  status: 'REVIEWED' | 'RESOLVED' | 'REQUIRES_HR_REVIEW';
  action_taken?: string | null;
  created_at: string;
  updated_at: string;
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
  month: string;
  year: number;
  status: 'PAID' | 'PENDING';
  disbursement_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id?: string | null;
  recipient_user_id?: string | null;
  employee_id?: string | null;
  title: string;
  message: string;
  type: 'leave' | 'late' | 'absence_alert' | 'low_activity' | 'performance' | 'system' | 'task' | string;
  read: boolean;
  is_read?: boolean;
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
  attendance_reviews: AttendanceReview[];
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

export const defaultSettings: SystemSettings = {
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

class Database {
  private data: DatabaseSchema;
  private isInitialized = false;
  private isSyncing = false;
  private hasPendingSync = false;
  private schemaEnsured = false;
  private syncTimeout: any = null;

  constructor() {
    this.data = {
      users: [],
      employees: [],
      departments: [],
      attendance: [],
      attendance_reviews: [],
      work_sessions: [],
      activity_logs: [],
      tasks: [],
      leave_requests: [],
      performance_records: [],
      performance_penalties: [],
      payroll: [],
      notifications: [],
      employee_barcodes: [],
      audit_logs: [],
      settings: { ...defaultSettings },
    };
  }

  private async ensureSchema(client: any) {
    if (this.schemaEnsured) return;
    // Create attendance_reviews table if it doesn't exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "attendance_reviews" (
          "id" text PRIMARY KEY NOT NULL,
          "alert_id" text,
          "employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
          "hr_id" text NOT NULL,
          "hr_email" text NOT NULL,
          "review_note" text NOT NULL,
          "absent_dates" text NOT NULL,
          "consecutive_days" integer DEFAULT 3 NOT NULL,
          "status" text DEFAULT 'REVIEWED' NOT NULL,
          "action_taken" text DEFAULT 'HR_NOTE_LOGGED',
          "created_at" text NOT NULL,
          "updated_at" text NOT NULL
        );
        CREATE INDEX IF NOT EXISTS "att_rev_emp_idx" ON "attendance_reviews" ("employee_id");
        CREATE INDEX IF NOT EXISTS "att_rev_hr_idx" ON "attendance_reviews" ("hr_id");
        CREATE INDEX IF NOT EXISTS "att_rev_alert_idx" ON "attendance_reviews" ("alert_id");
      `);
    } catch (tblErr: any) {
      // Table may exist or ignore
    }

    const alterStatements = [
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "hra" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "transport_allowance" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "special_allowance" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "allowances" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "tax_deduction" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "pf_deduction" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "leave_deduction" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "deductions" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "gross_salary" integer DEFAULT 0 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "month" text DEFAULT 'August' NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "year" integer DEFAULT 2026 NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "pay_period" text DEFAULT 'August 2026' NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'PAID' NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "disbursement_date" text;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "created_at" text DEFAULT '' NOT NULL;`,
      `ALTER TABLE "payroll" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT '' NOT NULL;`,
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "hr_comment" text;`,
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "reviewed_by" text;`,
      `ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "reviewed_at" text;`,
      `ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completion_date" text;`,
      `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "reason" text;`,
      `ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "timestamps" text DEFAULT '[]' NOT NULL;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipient_user_id" text;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "is_done" boolean DEFAULT false NOT NULL;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "reference_id" text;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "reference_type" text;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read_at" text;`,
      `ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "done_at" text;`,
      `ALTER TABLE "notifications" ALTER COLUMN "employee_id" DROP NOT NULL;`,
    ];

    for (const stmt of alterStatements) {
      try {
        await client.query(stmt);
      } catch (err: any) {
        // Ignore column already exists or table not yet created
      }
    }
    this.schemaEnsured = true;
  }

  public async init() {
    if (this.isInitialized) return;
    const pool = getPgPool();
    if (!pool) {
      this.isInitialized = true;
      return;
    }

    try {
      console.log('📦 Loading Dayflow HRMS data from PostgreSQL...');
      const client = await pool.connect();
      try {
        await this.ensureSchema(client);

        const [
          deptRes,
          empRes,
          userRes,
          attRes,
          attRevRes,
          wsRes,
          actRes,
          taskRes,
          leaveRes,
          perfRes,
          penRes,
          payRes,
          notifRes,
          bcRes,
          auditRes,
          settingsRes,
        ] = await Promise.all([
          client.query('SELECT * FROM departments ORDER BY code ASC'),
          client.query('SELECT * FROM employees ORDER BY employee_code ASC'),
          client.query('SELECT * FROM users'),
          client.query('SELECT * FROM attendance ORDER BY date DESC, check_in DESC'),
          client.query('SELECT * FROM attendance_reviews ORDER BY created_at DESC').catch(() => ({ rows: [] })),
          client.query('SELECT * FROM work_sessions ORDER BY start_time DESC'),
          client.query('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 2000'),
          client.query('SELECT * FROM tasks ORDER BY created_at DESC'),
          client.query('SELECT * FROM leave_requests ORDER BY created_at DESC'),
          client.query('SELECT * FROM performance_records ORDER BY calculated_at DESC'),
          client.query('SELECT * FROM performance_penalties ORDER BY timestamp DESC'),
          client.query('SELECT * FROM payroll'),
          client.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 500'),
          client.query('SELECT * FROM employee_barcodes'),
          client.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000'),
          client.query('SELECT * FROM system_settings WHERE id = $1', ['global']),
        ]);

        this.data.departments = deptRes.rows;
        this.data.employees = empRes.rows;
        this.data.users = userRes.rows;
        this.data.attendance = attRes.rows;
        this.data.attendance_reviews = attRevRes.rows;
        this.data.work_sessions = wsRes.rows;
        this.data.activity_logs = actRes.rows;
        this.data.tasks = taskRes.rows;
        this.data.leave_requests = leaveRes.rows;
        this.data.performance_records = perfRes.rows;
        this.data.performance_penalties = penRes.rows;
        this.data.payroll = payRes.rows.map(p => {
          const basic = Number(p.basic_salary) || 0;
          const hra = p.hra !== undefined && p.hra !== null ? Number(p.hra) : Math.round(basic * 0.20);
          const transport = p.transport_allowance !== undefined && p.transport_allowance !== null ? Number(p.transport_allowance) : Math.round(basic * 0.10);
          const special = p.special_allowance !== undefined && p.special_allowance !== null ? Number(p.special_allowance) : Math.round(basic * 0.10);
          const allowances = p.allowances !== undefined && p.allowances !== null && Number(p.allowances) > 0 ? Number(p.allowances) : (hra + transport + special);

          const tax = p.tax_deduction !== undefined && p.tax_deduction !== null ? Number(p.tax_deduction) : Math.round(basic * 0.10);
          const pf = p.pf_deduction !== undefined && p.pf_deduction !== null ? Number(p.pf_deduction) : Math.round(basic * 0.08);
          const leave = p.leave_deduction !== undefined && p.leave_deduction !== null ? Number(p.leave_deduction) : 0;
          const deductions = p.deductions !== undefined && p.deductions !== null && Number(p.deductions) > 0 ? Number(p.deductions) : (tax + pf + leave);

          const gross = p.gross_salary !== undefined && p.gross_salary !== null && Number(p.gross_salary) > 0 ? Number(p.gross_salary) : (basic + allowances);
          const net = p.net_salary !== undefined && p.net_salary !== null ? Number(p.net_salary) : Math.max(0, gross - deductions);

          return {
            ...p,
            basic_salary: basic,
            hra,
            transport_allowance: transport,
            special_allowance: special,
            allowances,
            tax_deduction: tax,
            pf_deduction: pf,
            leave_deduction: leave,
            deductions,
            gross_salary: gross,
            net_salary: net,
            month: p.month || 'August',
            year: Number(p.year) || 2026,
            pay_period: p.pay_period || `${p.month || 'August'} ${p.year || 2026}`,
            status: p.status || 'PAID',
            disbursement_date: p.disbursement_date || '2026-08-01',
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          };
        });
        this.data.notifications = notifRes.rows.map(n => ({
          id: n.id,
          user_id: n.user_id || null,
          recipient_user_id: n.recipient_user_id || n.user_id || null,
          employee_id: n.employee_id || null,
          title: n.title,
          message: n.message,
          type: n.type || 'system',
          read: n.read || n.is_read || false,
          is_read: n.is_read !== undefined && n.is_read !== null ? Boolean(n.is_read) : Boolean(n.read),
          is_done: Boolean(n.is_done),
          reference_id: n.reference_id || null,
          reference_type: n.reference_type || null,
          created_at: n.created_at || new Date().toISOString(),
          read_at: n.read_at || null,
          done_at: n.done_at || null,
        }));
        this.data.employee_barcodes = bcRes.rows;
        this.data.audit_logs = auditRes.rows;

        if (settingsRes.rows.length > 0) {
          const s = settingsRes.rows[0];
          this.data.settings = {
            official_start_time: s.official_start_time || defaultSettings.official_start_time,
            official_end_time: s.official_end_time || defaultSettings.official_end_time,
            grace_period_minutes: Number(s.grace_period_minutes) || defaultSettings.grace_period_minutes,
            minimum_working_hours: Number(s.minimum_working_hours) || defaultSettings.minimum_working_hours,
            idle_threshold_minutes: Number(s.idle_threshold_minutes) || defaultSettings.idle_threshold_minutes,
            late_occurrence_threshold: Number(s.late_occurrence_threshold) || defaultSettings.late_occurrence_threshold,
            late_penalty_percentage: Number(s.late_penalty_percentage) || defaultSettings.late_penalty_percentage,
            weight_attendance: Number(s.weight_attendance) || defaultSettings.weight_attendance,
            weight_working_hours: Number(s.weight_working_hours) || defaultSettings.weight_working_hours,
            weight_task_completion: Number(s.weight_task_completion) || defaultSettings.weight_task_completion,
            weight_activity: Number(s.weight_activity) || defaultSettings.weight_activity,
            weight_punctuality: Number(s.weight_punctuality) || defaultSettings.weight_punctuality,
            consecutive_absence_threshold: Number(s.consecutive_absence_threshold) || defaultSettings.consecutive_absence_threshold,
          };
        }

        console.log(`✅ Loaded ${this.data.employees.length} employees, ${this.data.users.length} users, and ${this.data.attendance.length} attendance records from PostgreSQL.`);

        // Ensure attendance records exist for today so HR Attendance view has complete daily records
        const todayStr = new Date().toISOString().split('T')[0];
        let addedToday = false;
        for (const emp of this.data.employees) {
          const hasToday = this.data.attendance.some(a => a.employee_id === emp.id && a.date === todayStr);
          if (!hasToday) {
            const attId = `att_${emp.id}_${todayStr}`;
            const checkInTime = `${todayStr}T08:50:00.000Z`;
            const attRecord: Attendance = {
              id: attId,
              employee_id: emp.id,
              date: todayStr,
              check_in: checkInTime,
              check_out: null,
              status: 'PRESENT',
              late_minutes: 0,
              working_minutes: 240,
              reason: null,
              timestamps: new Date().toISOString(),
            };
            this.data.attendance.unshift(attRecord);

            const sessionRecord: WorkSession = {
              id: `ws_${emp.id}_${todayStr}`,
              employee_id: emp.id,
              attendance_id: attId,
              start_time: checkInTime,
              end_time: null,
              active_minutes: 200,
              idle_minutes: 40,
              break_minutes: 0,
              total_minutes: 240,
              status: 'ACTIVE',
            };
            this.data.work_sessions.unshift(sessionRecord);
            addedToday = true;
          }
        }
        if (addedToday) {
          this.save();
        }
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('⚠️ Could not load data from PostgreSQL table, starting with current state:', err?.message || err);
    }

    this.isInitialized = true;
  }

  public save() {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }
    this.syncTimeout = setTimeout(() => {
      this.syncToPostgresAsync();
    }, 200);
  }

  public async saveSettingsToPostgres(s: SystemSettings) {
    const pool = getPgPool();
    if (!pool) return;
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO system_settings (
            id, official_start_time, official_end_time, grace_period_minutes, minimum_working_hours,
            idle_threshold_minutes, late_occurrence_threshold, late_penalty_percentage, weight_attendance,
            weight_working_hours, weight_task_completion, weight_activity, weight_punctuality, consecutive_absence_threshold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            official_start_time = EXCLUDED.official_start_time,
            official_end_time = EXCLUDED.official_end_time,
            grace_period_minutes = EXCLUDED.grace_period_minutes,
            minimum_working_hours = EXCLUDED.minimum_working_hours,
            idle_threshold_minutes = EXCLUDED.idle_threshold_minutes,
            late_occurrence_threshold = EXCLUDED.late_occurrence_threshold,
            late_penalty_percentage = EXCLUDED.late_penalty_percentage,
            weight_attendance = EXCLUDED.weight_attendance,
            weight_working_hours = EXCLUDED.weight_working_hours,
            weight_task_completion = EXCLUDED.weight_task_completion,
            weight_activity = EXCLUDED.weight_activity,
            weight_punctuality = EXCLUDED.weight_punctuality,
            consecutive_absence_threshold = EXCLUDED.consecutive_absence_threshold`,
          [
            'global', s.official_start_time, s.official_end_time, s.grace_period_minutes, s.minimum_working_hours,
            s.idle_threshold_minutes, s.late_occurrence_threshold, s.late_penalty_percentage, s.weight_attendance,
            s.weight_working_hours, s.weight_task_completion, s.weight_activity, s.weight_punctuality, s.consecutive_absence_threshold,
          ]
        );
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('Failed to persist settings directly to PostgreSQL:', err?.message || err);
    }
  }

  public async saveAsync() {
    await this.syncToPostgres();
  }

  private async syncToPostgresAsync() {
    if (this.isSyncing) {
      this.hasPendingSync = true;
      return;
    }
    await this.syncToPostgres();
  }

  public async syncToPostgres() {
    const pool = getPgPool();
    if (!pool) return;

    this.isSyncing = true;
    try {
      const client = await pool.connect();
      try {
        await this.ensureSchema(client);
        await client.query('BEGIN');

        // 1. Settings
        const s = this.data.settings;
        await client.query(
          `INSERT INTO system_settings (
            id, official_start_time, official_end_time, grace_period_minutes, minimum_working_hours,
            idle_threshold_minutes, late_occurrence_threshold, late_penalty_percentage, weight_attendance,
            weight_working_hours, weight_task_completion, weight_activity, weight_punctuality, consecutive_absence_threshold
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            official_start_time = EXCLUDED.official_start_time,
            official_end_time = EXCLUDED.official_end_time,
            grace_period_minutes = EXCLUDED.grace_period_minutes,
            minimum_working_hours = EXCLUDED.minimum_working_hours,
            idle_threshold_minutes = EXCLUDED.idle_threshold_minutes,
            late_occurrence_threshold = EXCLUDED.late_occurrence_threshold,
            late_penalty_percentage = EXCLUDED.late_penalty_percentage,
            weight_attendance = EXCLUDED.weight_attendance,
            weight_working_hours = EXCLUDED.weight_working_hours,
            weight_task_completion = EXCLUDED.weight_task_completion,
            weight_activity = EXCLUDED.weight_activity,
            weight_punctuality = EXCLUDED.weight_punctuality,
            consecutive_absence_threshold = EXCLUDED.consecutive_absence_threshold`,
          [
            'global', s.official_start_time, s.official_end_time, s.grace_period_minutes, s.minimum_working_hours,
            s.idle_threshold_minutes, s.late_occurrence_threshold, s.late_penalty_percentage, s.weight_attendance,
            s.weight_working_hours, s.weight_task_completion, s.weight_activity, s.weight_punctuality, s.consecutive_absence_threshold,
          ]
        );

        // 2. Departments
        for (const dept of this.data.departments) {
          await client.query(
            `INSERT INTO departments (id, name, code, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, description = EXCLUDED.description`,
            [dept.id, dept.name, dept.code, dept.description]
          );
        }

        // 3. Employees
        for (const emp of this.data.employees) {
          await client.query(
            `INSERT INTO employees (
              id, employee_code, first_name, last_name, email, phone, address, department, designation,
              joining_date, salary, profile_image, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              employee_code = EXCLUDED.employee_code,
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              department = EXCLUDED.department,
              designation = EXCLUDED.designation,
              joining_date = EXCLUDED.joining_date,
              salary = EXCLUDED.salary,
              profile_image = EXCLUDED.profile_image,
              status = EXCLUDED.status,
              updated_at = EXCLUDED.updated_at`,
            [
              emp.id, emp.employee_code, emp.first_name, emp.last_name, emp.email, emp.phone, emp.address,
              emp.department, emp.designation, emp.joining_date, emp.salary, emp.profile_image, emp.status,
              emp.created_at, emp.updated_at,
            ]
          );
        }

        const validEmpIds = new Set(this.data.employees.map(e => e.id));

        // 4. Users
        for (const user of this.data.users) {
          const empId = user.employee_id && validEmpIds.has(user.employee_id) ? user.employee_id : null;
          await client.query(
            `INSERT INTO users (id, email, password_hash, role, employee_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               password_hash = EXCLUDED.password_hash,
               role = EXCLUDED.role,
               employee_id = EXCLUDED.employee_id,
               updated_at = EXCLUDED.updated_at`,
            [user.id, user.email, user.password_hash, user.role, empId, user.created_at, user.updated_at]
          );
        }

        // 5. Attendance (Latest 150)
        const validAttIds = new Set<string>();
        for (const att of this.data.attendance.slice(0, 150)) {
          if (!validEmpIds.has(att.employee_id)) continue;
          await client.query(
            `INSERT INTO attendance (id, employee_id, date, check_in, check_out, status, late_minutes, working_minutes, reason, timestamps)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               check_out = EXCLUDED.check_out,
               status = EXCLUDED.status,
               late_minutes = EXCLUDED.late_minutes,
               working_minutes = EXCLUDED.working_minutes,
               reason = EXCLUDED.reason,
               timestamps = EXCLUDED.timestamps`,
            [att.id, att.employee_id, att.date, att.check_in, att.check_out, att.status, att.late_minutes, att.working_minutes, att.reason, att.timestamps]
          );
          validAttIds.add(att.id);
        }

        // 5b. Attendance Reviews
        for (const rev of this.data.attendance_reviews) {
          if (!validEmpIds.has(rev.employee_id)) continue;
          await client.query(
            `INSERT INTO attendance_reviews (id, alert_id, employee_id, hr_id, hr_email, review_note, absent_dates, consecutive_days, status, action_taken, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               review_note = EXCLUDED.review_note,
               status = EXCLUDED.status,
               action_taken = EXCLUDED.action_taken,
               updated_at = EXCLUDED.updated_at`,
            [rev.id, rev.alert_id || null, rev.employee_id, rev.hr_id, rev.hr_email, rev.review_note, rev.absent_dates, rev.consecutive_days, rev.status, rev.action_taken || 'HR_NOTE_LOGGED', rev.created_at, rev.updated_at]
          );
        }

        // 6. Work Sessions
        for (const ws of this.data.work_sessions) {
          if (!validEmpIds.has(ws.employee_id)) continue;
          const attId = ws.attendance_id && validAttIds.has(ws.attendance_id) ? ws.attendance_id : null;
          await client.query(
            `INSERT INTO work_sessions (id, employee_id, attendance_id, start_time, end_time, active_minutes, idle_minutes, break_minutes, total_minutes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET
               attendance_id = EXCLUDED.attendance_id,
               end_time = EXCLUDED.end_time,
               active_minutes = EXCLUDED.active_minutes,
               idle_minutes = EXCLUDED.idle_minutes,
               break_minutes = EXCLUDED.break_minutes,
               total_minutes = EXCLUDED.total_minutes,
               status = EXCLUDED.status`,
            [ws.id, ws.employee_id, attId, ws.start_time, ws.end_time, ws.active_minutes, ws.idle_minutes, ws.break_minutes, ws.total_minutes, ws.status]
          );
        }

        // 7. Activity Logs (Batch latest 100)
        for (const act of this.data.activity_logs.slice(0, 100)) {
          if (!validEmpIds.has(act.employee_id)) continue;
          await client.query(
            `INSERT INTO activity_logs (id, employee_id, timestamp, activity_type, details)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [act.id, act.employee_id, act.timestamp, act.activity_type, act.details]
          );
        }

        // 8. Tasks
        for (const t of this.data.tasks) {
          if (!validEmpIds.has(t.employee_id)) continue;
          await client.query(
            `INSERT INTO tasks (id, employee_id, title, description, priority, status, due_date, completion_date, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               description = EXCLUDED.description,
               priority = EXCLUDED.priority,
               status = EXCLUDED.status,
               due_date = EXCLUDED.due_date,
               completion_date = EXCLUDED.completion_date`,
            [t.id, t.employee_id, t.title, t.description, t.priority, t.status, t.due_date, t.completion_date, t.created_at]
          );
        }

        // 9. Leave Requests
        for (const l of this.data.leave_requests) {
          if (!validEmpIds.has(l.employee_id)) continue;
          await client.query(
            `INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days_count, reason, status, hr_comment, reviewed_by, reviewed_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               hr_comment = EXCLUDED.hr_comment,
               reviewed_by = EXCLUDED.reviewed_by,
               reviewed_at = EXCLUDED.reviewed_at`,
            [l.id, l.employee_id, l.leave_type, l.start_date, l.end_date, l.days_count, l.reason, l.status, l.hr_comment, l.reviewed_by, l.reviewed_at, l.created_at]
          );
        }

        // 10. Performance Records
        for (const p of this.data.performance_records) {
          if (!validEmpIds.has(p.employee_id)) continue;
          await client.query(
            `INSERT INTO performance_records (
              id, employee_id, period, attendance_score, working_hours_score, task_score, activity_score,
              punctuality_score, penalty_deduction, overall_score, grade, calculated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO UPDATE SET
              attendance_score = EXCLUDED.attendance_score,
              working_hours_score = EXCLUDED.working_hours_score,
              task_score = EXCLUDED.task_score,
              activity_score = EXCLUDED.activity_score,
              punctuality_score = EXCLUDED.punctuality_score,
              penalty_deduction = EXCLUDED.penalty_deduction,
              overall_score = EXCLUDED.overall_score,
              grade = EXCLUDED.grade,
              calculated_at = EXCLUDED.calculated_at`,
            [
              p.id, p.employee_id, p.period, p.attendance_score, p.working_hours_score, p.task_score,
              p.activity_score, p.punctuality_score, p.penalty_deduction, p.overall_score, p.grade, p.calculated_at,
            ]
          );
        }

        // 11. Performance Penalties
        for (const pen of this.data.performance_penalties) {
          if (!validEmpIds.has(pen.employee_id)) continue;
          await client.query(
            `INSERT INTO performance_penalties (id, employee_id, old_score, penalty, new_score, reason, violation_type, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               old_score = EXCLUDED.old_score,
               penalty = EXCLUDED.penalty,
               new_score = EXCLUDED.new_score,
               reason = EXCLUDED.reason`,
            [pen.id, pen.employee_id, pen.old_score, pen.penalty, pen.new_score, pen.reason, pen.violation_type, pen.timestamp]
          );
        }

        // 12. Payroll
        for (const pay of this.data.payroll) {
          if (!validEmpIds.has(pay.employee_id)) continue;
          await client.query(
            `INSERT INTO payroll (
              id, employee_id, basic_salary, hra, transport_allowance, special_allowance, allowances,
              tax_deduction, pf_deduction, leave_deduction, deductions, gross_salary, net_salary,
              pay_period, month, year, status, disbursement_date, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (id) DO UPDATE SET
              basic_salary = EXCLUDED.basic_salary,
              hra = EXCLUDED.hra,
              transport_allowance = EXCLUDED.transport_allowance,
              special_allowance = EXCLUDED.special_allowance,
              allowances = EXCLUDED.allowances,
              tax_deduction = EXCLUDED.tax_deduction,
              pf_deduction = EXCLUDED.pf_deduction,
              leave_deduction = EXCLUDED.leave_deduction,
              deductions = EXCLUDED.deductions,
              gross_salary = EXCLUDED.gross_salary,
              net_salary = EXCLUDED.net_salary,
              pay_period = EXCLUDED.pay_period,
              month = EXCLUDED.month,
              year = EXCLUDED.year,
              status = EXCLUDED.status,
              disbursement_date = EXCLUDED.disbursement_date,
              updated_at = EXCLUDED.updated_at`,
            [
              pay.id, pay.employee_id, pay.basic_salary, pay.hra || 0, pay.transport_allowance || 0, pay.special_allowance || 0, pay.allowances || 0,
              pay.tax_deduction || 0, pay.pf_deduction || 0, pay.leave_deduction || 0, pay.deductions || 0, pay.gross_salary || (pay.basic_salary + (pay.allowances || 0)),
              pay.net_salary, pay.pay_period || `${pay.month || 'August'} ${pay.year || 2026}`, pay.month || 'August', pay.year || 2026,
              pay.status || 'PAID', pay.disbursement_date, pay.created_at || new Date().toISOString(), pay.updated_at || new Date().toISOString(),
            ]
          );
        }

        // 13. Notifications (Batch latest 500)
        for (const n of this.data.notifications.slice(0, 500)) {
          const empId = n.employee_id && validEmpIds.has(n.employee_id) ? n.employee_id : null;
          await client.query(
            `INSERT INTO notifications (
              id, user_id, recipient_user_id, employee_id, title, message, type,
              read, is_read, is_done, reference_id, reference_type, created_at, read_at, done_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO UPDATE SET
              read = EXCLUDED.read,
              is_read = EXCLUDED.is_read,
              is_done = EXCLUDED.is_done,
              read_at = EXCLUDED.read_at,
              done_at = EXCLUDED.done_at,
              reference_id = EXCLUDED.reference_id,
              reference_type = EXCLUDED.reference_type`,
            [
              n.id,
              n.user_id || null,
              n.recipient_user_id || n.user_id || null,
              empId,
              n.title,
              n.message,
              n.type,
              n.read || n.is_read || false,
              n.is_read || n.read || false,
              Boolean(n.is_done),
              n.reference_id || null,
              n.reference_type || null,
              n.created_at || new Date().toISOString(),
              n.read_at || null,
              n.done_at || null,
            ]
          );
        }

        // 14. Barcodes
        for (const b of this.data.employee_barcodes) {
          if (!validEmpIds.has(b.employee_id)) continue;
          await client.query(
            `INSERT INTO employee_barcodes (id, employee_id, barcode_code, qr_data, generated_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET qr_data = EXCLUDED.qr_data, generated_at = EXCLUDED.generated_at`,
            [b.id, b.employee_id, b.barcode_code, b.qr_data, b.generated_at]
          );
        }

        // 15. Audit Logs (Batch latest 100)
        for (const a of this.data.audit_logs.slice(0, 100)) {
          await client.query(
            `INSERT INTO audit_logs (id, user_id, user_email, action, entity, entity_id, details, timestamp)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [a.id, a.user_id, a.user_email, a.action, a.entity, a.entity_id, a.details, a.timestamp]
          );
        }

        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('PostgreSQL sync transaction error:', err?.message || err);
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('PostgreSQL connection error in save:', err?.message || err);
    } finally {
      this.isSyncing = false;
      if (this.hasPendingSync) {
        this.hasPendingSync = false;
        setTimeout(() => this.syncToPostgresAsync(), 100);
      }
    }
  }

  public get users() { return this.data.users; }
  public get employees() { return this.data.employees; }
  public get departments() { return this.data.departments; }
  public get attendance() { return this.data.attendance; }
  public get attendance_reviews() { return this.data.attendance_reviews; }
  public get work_sessions() { return this.data.work_sessions; }
  public get activity_logs() { return this.data.activity_logs; }
  public get tasks() { return this.data.tasks; }
  public get leave_requests() { return this.data.leave_requests; }
  public get performance_records() { return this.data.performance_records; }
  public get performance_penalties() { return this.data.performance_penalties; }
  public get payroll() { return this.data.payroll; }
  public get notifications() { return this.data.notifications; }
  public set notifications(val: Notification[]) { this.data.notifications = val; this.save(); }
  public get employee_barcodes() { return this.data.employee_barcodes; }
  public get audit_logs() { return this.data.audit_logs; }
  public get settings() { return this.data.settings; }
  public set settings(val: SystemSettings) { this.data.settings = val; }

  public resetToEmpty() {
    this.data = {
      users: [],
      employees: [],
      departments: [],
      attendance: [],
      attendance_reviews: [],
      work_sessions: [],
      activity_logs: [],
      tasks: [],
      leave_requests: [],
      performance_records: [],
      performance_penalties: [],
      payroll: [],
      notifications: [],
      employee_barcodes: [],
      audit_logs: [],
      settings: { ...defaultSettings },
    };
  }
}

export const db = new Database();

import { pgTable, text, integer, boolean, timestamp, real, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Departments Table
export const departments = pgTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  description: text('description').notNull().default(''),
});

// 2. Employees Table
export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  employee_code: text('employee_code').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull().default('+1 (555) 000-0000'),
  address: text('address').notNull().default('Office HQ'),
  department: text('department').notNull().default('Engineering'),
  designation: text('designation').notNull().default('Associate'),
  joining_date: text('joining_date').notNull(),
  salary: integer('salary').notNull().default(80000),
  profile_image: text('profile_image').notNull().default(''),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'INACTIVE'
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  codeIdx: uniqueIndex('emp_code_idx').on(table.employee_code),
  emailIdx: uniqueIndex('emp_email_idx').on(table.email),
  deptIdx: index('emp_dept_idx').on(table.department),
}));

// 3. Users Table (Authentication)
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role').notNull().default('EMPLOYEE'), // 'ADMIN' | 'HR' | 'EMPLOYEE'
  employee_id: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  empIdx: index('users_emp_idx').on(table.employee_id),
}));

// 4. Attendance Table
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  date: text('date').notNull(), // YYYY-MM-DD
  check_in: text('check_in').notNull(),
  check_out: text('check_out'),
  status: text('status').notNull(), // 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'LATE'
  late_minutes: integer('late_minutes').notNull().default(0),
  working_minutes: integer('working_minutes').notNull().default(0),
  reason: text('reason'),
  timestamps: text('timestamps').notNull(),
}, (table) => ({
  empDateIdx: index('att_emp_date_idx').on(table.employee_id, table.date),
  dateIdx: index('att_date_idx').on(table.date),
  statusIdx: index('att_status_idx').on(table.status),
}));

// 5. Work Sessions Table
export const workSessions = pgTable('work_sessions', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  attendance_id: text('attendance_id').references(() => attendance.id, { onDelete: 'set null' }),
  start_time: text('start_time').notNull(),
  end_time: text('end_time'),
  active_minutes: integer('active_minutes').notNull().default(0),
  idle_minutes: integer('idle_minutes').notNull().default(0),
  break_minutes: integer('break_minutes').notNull().default(0),
  total_minutes: integer('total_minutes').notNull().default(0),
  status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'COMPLETED'
}, (table) => ({
  empStatusIdx: index('ws_emp_status_idx').on(table.employee_id, table.status),
  attIdx: index('ws_att_idx').on(table.attendance_id),
}));

// 6. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  timestamp: text('timestamp').notNull(),
  activity_type: text('activity_type').notNull(),
  details: text('details').notNull(),
}, (table) => ({
  empTimeIdx: index('act_emp_time_idx').on(table.employee_id, table.timestamp),
}));

// 7. Tasks Table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  priority: text('priority').notNull().default('MEDIUM'), // 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status: text('status').notNull().default('TODO'), // 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  due_date: text('due_date').notNull(),
  completion_date: text('completion_date'),
  created_at: text('created_at').notNull(),
}, (table) => ({
  empStatusIdx: index('task_emp_status_idx').on(table.employee_id, table.status),
  dueIdx: index('task_due_idx').on(table.due_date),
}));

// 8. Leave Requests Table
export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  leave_type: text('leave_type').notNull().default('PAID'), // 'PAID' | 'SICK' | 'UNPAID'
  start_date: text('start_date').notNull(),
  end_date: text('end_date').notNull(),
  days_count: integer('days_count').notNull().default(1),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'APPROVED' | 'REJECTED'
  hr_comment: text('hr_comment'),
  reviewed_by: text('reviewed_by'),
  reviewed_at: text('reviewed_at'),
  created_at: text('created_at').notNull(),
}, (table) => ({
  empStatusIdx: index('leave_emp_status_idx').on(table.employee_id, table.status),
}));

// 9. Performance Records Table
export const performanceRecords = pgTable('performance_records', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  attendance_score: integer('attendance_score').notNull(),
  working_hours_score: integer('working_hours_score').notNull(),
  task_score: integer('task_score').notNull(),
  activity_score: integer('activity_score').notNull(),
  punctuality_score: integer('punctuality_score').notNull(),
  penalty_deduction: real('penalty_deduction').notNull().default(0),
  overall_score: real('overall_score').notNull().default(0),
  grade: text('grade').notNull().default('B'), // 'A+' | 'A' | 'B' | 'C' | 'D'
  calculated_at: text('calculated_at').notNull(),
}, (table) => ({
  empIdx: index('perf_emp_idx').on(table.employee_id),
}));

// 10. Performance Penalties Table
export const performancePenalties = pgTable('performance_penalties', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  old_score: real('old_score').notNull().default(0),
  penalty: real('penalty').notNull().default(0),
  new_score: real('new_score').notNull().default(0),
  reason: text('reason').notNull(),
  violation_type: text('violation_type').notNull(),
  timestamp: text('timestamp').notNull(),
}, (table) => ({
  empTypeIdx: index('pen_emp_type_idx').on(table.employee_id, table.violation_type),
}));

// 11. Payroll Table
export const payroll = pgTable('payroll', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  basic_salary: integer('basic_salary').notNull(),
  hra: integer('hra').notNull().default(0),
  transport_allowance: integer('transport_allowance').notNull().default(0),
  special_allowance: integer('special_allowance').notNull().default(0),
  allowances: integer('allowances').notNull().default(0),
  tax_deduction: integer('tax_deduction').notNull().default(0),
  pf_deduction: integer('pf_deduction').notNull().default(0),
  leave_deduction: integer('leave_deduction').notNull().default(0),
  deductions: integer('deductions').notNull().default(0),
  gross_salary: integer('gross_salary').notNull().default(0),
  net_salary: integer('net_salary').notNull(),
  pay_period: text('pay_period').notNull(),
  month: text('month').notNull().default('August'),
  year: integer('year').notNull().default(2026),
  status: text('status').notNull().default('PAID'), // 'PAID' | 'PENDING'
  disbursement_date: text('disbursement_date'),
  created_at: text('created_at').notNull().default(''),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  empIdx: index('pay_emp_idx').on(table.employee_id),
  periodIdx: index('pay_period_idx').on(table.month, table.year),
}));

// 12. Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  recipient_user_id: text('recipient_user_id'),
  employee_id: text('employee_id').references(() => employees.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  read: boolean('read').notNull().default(false),
  is_read: boolean('is_read').notNull().default(false),
  is_done: boolean('is_done').notNull().default(false),
  reference_id: text('reference_id'),
  reference_type: text('reference_type'),
  created_at: text('created_at').notNull(),
  read_at: text('read_at'),
  done_at: text('done_at'),
}, (table) => ({
  empReadIdx: index('notif_emp_read_idx').on(table.employee_id, table.read),
  refIdx: index('notif_ref_idx').on(table.reference_type, table.reference_id),
}));

// 13. Employee Barcodes Table
export const employeeBarcodes = pgTable('employee_barcodes', {
  id: text('id').primaryKey(),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  barcode_code: text('barcode_code').notNull(),
  qr_data: text('qr_data').notNull(),
  generated_at: text('generated_at').notNull(),
}, (table) => ({
  empIdx: uniqueIndex('bc_emp_idx').on(table.employee_id),
}));

// 14. Audit Logs Table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  user_email: text('user_email').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entity_id: text('entity_id').notNull(),
  details: text('details').notNull(),
  timestamp: text('timestamp').notNull(),
}, (table) => ({
  timeIdx: index('audit_time_idx').on(table.timestamp),
  userIdx: index('audit_user_idx').on(table.user_id),
}));

// 15. Attendance Reviews Table (for 3-Day Absence HR reviews and compliance logs)
export const attendanceReviews = pgTable('attendance_reviews', {
  id: text('id').primaryKey(),
  alert_id: text('alert_id'),
  employee_id: text('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
  hr_id: text('hr_id').notNull(),
  hr_email: text('hr_email').notNull(),
  review_note: text('review_note').notNull(),
  absent_dates: text('absent_dates').notNull(), // Comma-separated or JSON date strings
  consecutive_days: integer('consecutive_days').notNull().default(3),
  status: text('status').notNull().default('REVIEWED'), // 'REVIEWED' | 'RESOLVED' | 'REQUIRES_HR_REVIEW'
  action_taken: text('action_taken').default('HR_NOTE_LOGGED'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
}, (table) => ({
  empIdx: index('att_rev_emp_idx').on(table.employee_id),
  hrIdx: index('att_rev_hr_idx').on(table.hr_id),
  alertIdx: index('att_rev_alert_idx').on(table.alert_id),
}));

// 16. System Settings Table
export const systemSettings = pgTable('system_settings', {
  id: text('id').primaryKey().default('global'),
  official_start_time: text('official_start_time').notNull().default('09:00'),
  official_end_time: text('official_end_time').notNull().default('18:00'),
  grace_period_minutes: integer('grace_period_minutes').notNull().default(15),
  minimum_working_hours: integer('minimum_working_hours').notNull().default(8),
  idle_threshold_minutes: integer('idle_threshold_minutes').notNull().default(30),
  late_occurrence_threshold: integer('late_occurrence_threshold').notNull().default(3),
  late_penalty_percentage: real('late_penalty_percentage').notNull().default(1),
  weight_attendance: real('weight_attendance').notNull().default(0.20),
  weight_working_hours: real('weight_working_hours').notNull().default(0.20),
  weight_task_completion: real('weight_task_completion').notNull().default(0.30),
  weight_activity: real('weight_activity').notNull().default(0.15),
  weight_punctuality: real('weight_punctuality').notNull().default(0.15),
  consecutive_absence_threshold: integer('consecutive_absence_threshold').notNull().default(3),
});

// Relationships
export const employeeRelations = relations(employees, ({ one, many }) => ({
  user: one(users, {
    fields: [employees.id],
    references: [users.employee_id],
  }),
  attendance: many(attendance),
  attendanceReviews: many(attendanceReviews),
  workSessions: many(workSessions),
  activityLogs: many(activityLogs),
  tasks: many(tasks),
  leaveRequests: many(leaveRequests),
  performanceRecords: many(performanceRecords),
  performancePenalties: many(performancePenalties),
  payroll: many(payroll),
  notifications: many(notifications),
  barcode: one(employeeBarcodes, {
    fields: [employees.id],
    references: [employeeBarcodes.employee_id],
  }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  employee: one(employees, {
    fields: [users.employee_id],
    references: [employees.id],
  }),
  auditLogs: many(auditLogs),
}));

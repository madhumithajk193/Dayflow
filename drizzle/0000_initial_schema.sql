-- Dayflow Intelligent HRMS - Initial PostgreSQL Schema Migration
-- Migration 0000: Full Relational HRMS Schema

CREATE TABLE IF NOT EXISTS "departments" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);

CREATE TABLE IF NOT EXISTS "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '+1 (555) 000-0000' NOT NULL,
	"address" text DEFAULT 'Office HQ' NOT NULL,
	"department" text DEFAULT 'Engineering' NOT NULL,
	"designation" text DEFAULT 'Associate' NOT NULL,
	"joining_date" text NOT NULL,
	"salary" integer DEFAULT 80000 NOT NULL,
	"profile_image" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'EMPLOYEE' NOT NULL,
	"employee_id" text REFERENCES "employees"("id") ON DELETE CASCADE,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"date" text NOT NULL,
	"check_in" text NOT NULL,
	"check_out" text,
	"status" text NOT NULL,
	"late_minutes" integer DEFAULT 0 NOT NULL,
	"working_minutes" integer DEFAULT 0 NOT NULL,
	"reason" text,
	"timestamps" text NOT NULL
);

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

CREATE TABLE IF NOT EXISTS "work_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"attendance_id" text REFERENCES "attendance"("id") ON DELETE SET NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"active_minutes" integer DEFAULT 0 NOT NULL,
	"idle_minutes" integer DEFAULT 0 NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);

CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"timestamp" text NOT NULL,
	"activity_type" text NOT NULL,
	"details" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'TODO' NOT NULL,
	"due_date" text NOT NULL,
	"completion_date" text,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"leave_type" text DEFAULT 'PAID' NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"days_count" integer DEFAULT 1 NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"hr_comment" text,
	"reviewed_by" text,
	"reviewed_at" text,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "performance_records" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"period" text NOT NULL,
	"attendance_score" integer NOT NULL,
	"working_hours_score" integer NOT NULL,
	"task_score" integer NOT NULL,
	"activity_score" integer NOT NULL,
	"punctuality_score" integer NOT NULL,
	"penalty_deduction" real DEFAULT 0 NOT NULL,
	"overall_score" real DEFAULT 0 NOT NULL,
	"grade" text DEFAULT 'B' NOT NULL,
	"calculated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "performance_penalties" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"old_score" real DEFAULT 0 NOT NULL,
	"penalty" real DEFAULT 0 NOT NULL,
	"new_score" real DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"violation_type" text NOT NULL,
	"timestamp" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "payroll" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"basic_salary" integer NOT NULL,
	"hra" integer DEFAULT 0 NOT NULL,
	"transport_allowance" integer DEFAULT 0 NOT NULL,
	"special_allowance" integer DEFAULT 0 NOT NULL,
	"allowances" integer DEFAULT 0 NOT NULL,
	"tax_deduction" integer DEFAULT 0 NOT NULL,
	"pf_deduction" integer DEFAULT 0 NOT NULL,
	"leave_deduction" integer DEFAULT 0 NOT NULL,
	"deductions" integer DEFAULT 0 NOT NULL,
	"gross_salary" integer DEFAULT 0 NOT NULL,
	"net_salary" integer NOT NULL,
	"pay_period" text NOT NULL,
	"month" text DEFAULT 'August' NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"status" text DEFAULT 'PAID' NOT NULL,
	"disbursement_date" text,
	"created_at" text DEFAULT '' NOT NULL,
	"updated_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "employee_barcodes" (
	"id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"barcode_code" text NOT NULL,
	"qr_data" text NOT NULL,
	"generated_at" text NOT NULL,
	CONSTRAINT "employee_barcodes_employee_id_unique" UNIQUE("employee_id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"details" text NOT NULL,
	"timestamp" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"official_start_time" text DEFAULT '09:00' NOT NULL,
	"official_end_time" text DEFAULT '18:00' NOT NULL,
	"grace_period_minutes" integer DEFAULT 15 NOT NULL,
	"minimum_working_hours" integer DEFAULT 8 NOT NULL,
	"idle_threshold_minutes" integer DEFAULT 30 NOT NULL,
	"late_occurrence_threshold" integer DEFAULT 3 NOT NULL,
	"late_penalty_percentage" real DEFAULT 1 NOT NULL,
	"weight_attendance" real DEFAULT 0.20 NOT NULL,
	"weight_working_hours" real DEFAULT 0.20 NOT NULL,
	"weight_task_completion" real DEFAULT 0.30 NOT NULL,
	"weight_activity" real DEFAULT 0.15 NOT NULL,
	"weight_punctuality" real DEFAULT 0.15 NOT NULL,
	"consecutive_absence_threshold" integer DEFAULT 3 NOT NULL
);

-- Indexes for high performance queries
CREATE INDEX IF NOT EXISTS "emp_dept_idx" ON "employees" ("department");
CREATE INDEX IF NOT EXISTS "users_emp_idx" ON "users" ("employee_id");
CREATE INDEX IF NOT EXISTS "att_emp_date_idx" ON "attendance" ("employee_id", "date");
CREATE INDEX IF NOT EXISTS "att_date_idx" ON "attendance" ("date");
CREATE INDEX IF NOT EXISTS "att_status_idx" ON "attendance" ("status");
CREATE INDEX IF NOT EXISTS "ws_emp_status_idx" ON "work_sessions" ("employee_id", "status");
CREATE INDEX IF NOT EXISTS "ws_att_idx" ON "work_sessions" ("attendance_id");
CREATE INDEX IF NOT EXISTS "act_emp_time_idx" ON "activity_logs" ("employee_id", "timestamp");
CREATE INDEX IF NOT EXISTS "task_emp_status_idx" ON "tasks" ("employee_id", "status");
CREATE INDEX IF NOT EXISTS "task_due_idx" ON "tasks" ("due_date");
CREATE INDEX IF NOT EXISTS "leave_emp_status_idx" ON "leave_requests" ("employee_id", "status");
CREATE INDEX IF NOT EXISTS "perf_emp_idx" ON "performance_records" ("employee_id");
CREATE INDEX IF NOT EXISTS "pen_emp_type_idx" ON "performance_penalties" ("employee_id", "violation_type");
CREATE INDEX IF NOT EXISTS "pay_emp_idx" ON "payroll" ("employee_id");
CREATE INDEX IF NOT EXISTS "notif_emp_read_idx" ON "notifications" ("employee_id", "read");
CREATE INDEX IF NOT EXISTS "audit_time_idx" ON "audit_logs" ("timestamp");
CREATE INDEX IF NOT EXISTS "audit_user_idx" ON "audit_logs" ("user_id");

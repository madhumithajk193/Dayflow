import { db, Payroll, Employee } from '../db/database.js';
import { AuditService } from './AuditService.js';

export interface PayrollCalculationInput {
  basic_salary: number;
  hra?: number;
  transport_allowance?: number;
  special_allowance?: number;
  allowances?: number;
  tax_deduction?: number;
  pf_deduction?: number;
  leave_deduction?: number;
  deductions?: number;
  month?: string;
  year?: number;
  status?: 'PAID' | 'PENDING';
  disbursement_date?: string | null;
}

export class PayrollService {
  /**
   * Calculates allowances, deductions, gross salary, and net salary using standardized business rules.
   */
  static calculateBreakdown(input: {
    basic_salary: number;
    hra?: number;
    transport_allowance?: number;
    special_allowance?: number;
    allowances?: number;
    tax_deduction?: number;
    pf_deduction?: number;
    leave_deduction?: number;
    deductions?: number;
  }) {
    const basic = Math.max(0, Math.round(Number(input.basic_salary) || 0));

    // Allowances calculation (Default: HRA=20%, Transport=10%, Special=10% if not explicitly set)
    const hra = input.hra !== undefined ? Math.max(0, Math.round(Number(input.hra))) : Math.round(basic * 0.20);
    const transport = input.transport_allowance !== undefined ? Math.max(0, Math.round(Number(input.transport_allowance))) : Math.round(basic * 0.10);
    const special = input.special_allowance !== undefined ? Math.max(0, Math.round(Number(input.special_allowance))) : Math.round(basic * 0.10);
    const totalAllowances = input.allowances !== undefined && input.hra === undefined && input.transport_allowance === undefined && input.special_allowance === undefined
      ? Math.max(0, Math.round(Number(input.allowances)))
      : hra + transport + special;

    // Deductions calculation (Default: Tax TDS=10%, PF=8%, Leave=0 if not explicitly set)
    const tax = input.tax_deduction !== undefined ? Math.max(0, Math.round(Number(input.tax_deduction))) : Math.round(basic * 0.10);
    const pf = input.pf_deduction !== undefined ? Math.max(0, Math.round(Number(input.pf_deduction))) : Math.round(basic * 0.08);
    const leave = input.leave_deduction !== undefined ? Math.max(0, Math.round(Number(input.leave_deduction))) : 0;
    const totalDeductions = input.deductions !== undefined && input.tax_deduction === undefined && input.pf_deduction === undefined && input.leave_deduction === undefined
      ? Math.max(0, Math.round(Number(input.deductions)))
      : tax + pf + leave;

    const grossSalary = basic + totalAllowances;
    const netSalary = Math.max(0, grossSalary - totalDeductions);

    return {
      basic_salary: basic,
      hra,
      transport_allowance: transport,
      special_allowance: special,
      allowances: totalAllowances,
      tax_deduction: tax,
      pf_deduction: pf,
      leave_deduction: leave,
      deductions: totalDeductions,
      gross_salary: grossSalary,
      net_salary: netSalary,
    };
  }

  /**
   * Generates or retrieves payroll for an employee for a specific month and year.
   */
  static generateOrGetForEmployee(employeeId: string, month = 'August', year = 2026): Payroll {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Check if payroll record already exists for this employee, month, and year
    let existing = db.payroll.find(
      p => p.employee_id === employeeId && p.month?.toLowerCase() === month.toLowerCase() && Number(p.year) === Number(year)
    );

    // Fallback search by employee_id if month/year was not set on older records
    if (!existing) {
      existing = db.payroll.find(p => p.employee_id === employeeId);
    }

    if (existing) {
      // Ensure all fields are calculated and normalized
      const breakdown = this.calculateBreakdown({
        basic_salary: existing.basic_salary || Math.round(employee.salary / 12),
        hra: existing.hra,
        transport_allowance: existing.transport_allowance,
        special_allowance: existing.special_allowance,
        allowances: existing.allowances,
        tax_deduction: existing.tax_deduction,
        pf_deduction: existing.pf_deduction,
        leave_deduction: existing.leave_deduction,
        deductions: existing.deductions,
      });

      existing.basic_salary = breakdown.basic_salary;
      existing.hra = breakdown.hra;
      existing.transport_allowance = breakdown.transport_allowance;
      existing.special_allowance = breakdown.special_allowance;
      existing.allowances = breakdown.allowances;
      existing.tax_deduction = breakdown.tax_deduction;
      existing.pf_deduction = breakdown.pf_deduction;
      existing.leave_deduction = breakdown.leave_deduction;
      existing.deductions = breakdown.deductions;
      existing.gross_salary = breakdown.gross_salary;
      existing.net_salary = breakdown.net_salary;
      existing.month = existing.month || month;
      existing.year = existing.year || year;
      existing.pay_period = existing.pay_period || `${existing.month} ${existing.year}`;
      existing.status = existing.status || 'PAID';
      existing.updated_at = existing.updated_at || new Date().toISOString();
      existing.created_at = existing.created_at || new Date().toISOString();

      db.save();
      return existing;
    }

    // Create new payroll record using employee's actual database salary
    const monthlyBasic = Math.round(employee.salary / 12);
    const breakdown = this.calculateBreakdown({ basic_salary: monthlyBasic });

    const newPayroll: Payroll = {
      id: `pay_${employee.id}_${year}_${month.toLowerCase()}`,
      employee_id: employee.id,
      ...breakdown,
      pay_period: `${month} ${year}`,
      month,
      year,
      status: 'PAID',
      disbursement_date: `${year}-08-01`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.payroll.push(newPayroll);
    db.save();
    return newPayroll;
  }

  /**
   * Generates payroll for all active employees for the selected month/year.
   */
  static generateAllPayrolls(month = 'August', year = 2026) {
    const activeEmployees = db.employees.filter(e => e.status === 'ACTIVE');
    const generated: Payroll[] = [];

    for (const emp of activeEmployees) {
      const p = this.generateOrGetForEmployee(emp.id, month, year);
      generated.push(p);
    }

    db.save();
    return generated;
  }

  /**
   * Gets payrolls for an employee with enriched employee information.
   */
  static getEmployeePayroll(employeeId: string, month?: string, year?: number) {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee record not found');

    let records = db.payroll.filter(p => p.employee_id === employeeId);

    if (month) {
      records = records.filter(p => p.month?.toLowerCase() === month.toLowerCase());
    }
    if (year) {
      records = records.filter(p => Number(p.year) === Number(year));
    }

    if (records.length === 0) {
      // Auto-generate for the default current month if no record exists yet
      const current = this.generateOrGetForEmployee(employeeId, month || 'August', year || 2026);
      records = [current];
    }

    return records.map(p => ({
      ...p,
      employee_code: employee.employee_code,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      department: employee.department,
      designation: employee.designation,
      profile_image: employee.profile_image,
      employee,
    }));
  }

  /**
   * Gets all payroll records for HR view with filtering.
   */
  static getAllPayrolls(filters: { month?: string; year?: number; department?: string } = {}) {
    // Ensure all active employees have a payroll record
    const activeEmployees = db.employees.filter(e => e.status === 'ACTIVE');
    const targetMonth = filters.month || 'August';
    const targetYear = filters.year || 2026;

    for (const emp of activeEmployees) {
      const existing = db.payroll.find(p => p.employee_id === emp.id);
      if (!existing) {
        this.generateOrGetForEmployee(emp.id, targetMonth, targetYear);
      }
    }

    let records = db.payroll;

    if (filters.month && filters.month !== 'ALL') {
      records = records.filter(p => p.month?.toLowerCase() === filters.month?.toLowerCase());
    }
    if (filters.year) {
      records = records.filter(p => Number(p.year) === Number(filters.year));
    }

    const enriched = records.map(p => {
      const emp = db.employees.find(e => e.id === p.employee_id);
      return {
        ...p,
        employee_code: emp?.employee_code || 'EMP0000',
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        department: emp?.department || 'General',
        designation: emp?.designation || 'Associate',
        profile_image: emp?.profile_image || '',
        employee: emp,
      };
    });

    if (filters.department && filters.department !== 'ALL') {
      return enriched.filter(p => p.department.toLowerCase() === filters.department?.toLowerCase());
    }

    return enriched;
  }

  /**
   * Updates an existing payroll record with newly configured compensation numbers.
   */
  static updatePayroll(
    payrollIdOrEmployeeId: string,
    updates: Partial<PayrollCalculationInput> & { status?: 'PAID' | 'PENDING'; disbursement_date?: string | null },
    userId: string,
    userEmail: string
  ): Payroll {
    const pay = db.payroll.find(p => p.id === payrollIdOrEmployeeId || p.employee_id === payrollIdOrEmployeeId);
    if (!pay) {
      throw new Error(`Payroll record not found: ${payrollIdOrEmployeeId}`);
    }

    const employee = db.employees.find(e => e.id === pay.employee_id);

    // Calculate updated breakdown
    const basic = updates.basic_salary !== undefined ? Number(updates.basic_salary) : pay.basic_salary;
    const hra = updates.hra !== undefined ? Number(updates.hra) : pay.hra;
    const transport = updates.transport_allowance !== undefined ? Number(updates.transport_allowance) : pay.transport_allowance;
    const special = updates.special_allowance !== undefined ? Number(updates.special_allowance) : pay.special_allowance;
    const allowances = updates.allowances !== undefined ? Number(updates.allowances) : undefined;

    const tax = updates.tax_deduction !== undefined ? Number(updates.tax_deduction) : pay.tax_deduction;
    const pf = updates.pf_deduction !== undefined ? Number(updates.pf_deduction) : pay.pf_deduction;
    const leave = updates.leave_deduction !== undefined ? Number(updates.leave_deduction) : pay.leave_deduction;
    const deductions = updates.deductions !== undefined ? Number(updates.deductions) : undefined;

    const breakdown = this.calculateBreakdown({
      basic_salary: basic,
      hra,
      transport_allowance: transport,
      special_allowance: special,
      allowances,
      tax_deduction: tax,
      pf_deduction: pf,
      leave_deduction: leave,
      deductions,
    });

    pay.basic_salary = breakdown.basic_salary;
    pay.hra = breakdown.hra;
    pay.transport_allowance = breakdown.transport_allowance;
    pay.special_allowance = breakdown.special_allowance;
    pay.allowances = breakdown.allowances;
    pay.tax_deduction = breakdown.tax_deduction;
    pay.pf_deduction = breakdown.pf_deduction;
    pay.leave_deduction = breakdown.leave_deduction;
    pay.deductions = breakdown.deductions;
    pay.gross_salary = breakdown.gross_salary;
    pay.net_salary = breakdown.net_salary;

    if (updates.status !== undefined) pay.status = updates.status;
    if (updates.disbursement_date !== undefined) pay.disbursement_date = updates.disbursement_date;
    if (updates.month !== undefined) pay.month = updates.month;
    if (updates.year !== undefined) pay.year = Number(updates.year);
    pay.pay_period = `${pay.month || 'August'} ${pay.year || 2026}`;
    pay.updated_at = new Date().toISOString();

    db.save();

    AuditService.log(
      userId,
      userEmail,
      'UPDATE_PAYROLL',
      'payroll',
      pay.id,
      `Updated compensation for ${employee?.employee_code || pay.employee_id}: Net Salary = $${pay.net_salary}`
    );

    return pay;
  }
}

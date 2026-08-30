import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, User, Employee, Task, LeaveRequest, Payroll, SystemSettings } from '../db/database.js';
import { authenticateToken, requireRole, requireSelfOrAdmin, AuthRequest } from '../middleware/auth.js';
import { AttendanceService } from '../services/AttendanceService.js';
import { ActivityService } from '../services/ActivityService.js';
import { PerformanceService } from '../services/PerformanceService.js';
import { BarcodeService } from '../services/BarcodeService.js';
import { LeaveService } from '../services/LeaveService.js';
import { AuditService } from '../services/AuditService.js';
import { SeedService } from '../services/SeedService.js';
import { PayrollService } from '../services/PayrollService.js';
import { NotificationService } from '../services/NotificationService.js';
import { PdfService } from '../services/PdfService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dayflow_super_secret_jwt_key_hackathon_2026';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as any;

// Fast health-check route (bypass DB seed middleware)
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'Dayflow Intelligent HRMS', timestamp: new Date().toISOString() });
});

// Middleware to ensure DB and seed data are populated before handling requests
router.use(async (req: Request, res: Response, next) => {
  try {
    if (db.users.length === 0 || db.employees.length === 0) {
      await db.init();
      await SeedService.seed();
    }
  } catch (err) {
    console.error('DB ready middleware error:', err);
  }
  next();
});

// Helper for sending standard responses
const success = (res: Response, data: any = {}, message = 'Operation successful', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res: Response, message = 'An error occurred', errorCode = 'BAD_REQUEST', statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message, errorCode });
};

// ==========================================
// 1. AUTHENTICATION & REGISTRATION
// ==========================================

router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      password,
      role = 'EMPLOYEE',
      department = 'Engineering',
      designation = 'Software Engineer',
      phone = '',
      address = '',
      salary = 85000,
    } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return error(res, 'First name, last name, email and password are required', 'VALIDATION_ERROR');
    }

    // Check unique email
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return error(res, 'An account with this email already exists', 'EMAIL_EXISTS');
    }

    // Generate unique employee code
    const nextNum = db.employees.length + 1001;
    const employee_code = `EMP${nextNum}`;
    const employee_id = `emp_${String(db.employees.length + 1).padStart(3, '0')}`;

    const password_hash = await bcrypt.hash(password, 10);

    const newEmp: Employee = {
      id: employee_id,
      employee_code,
      first_name,
      last_name,
      email,
      phone: phone || '+1 (555) 000-0000',
      address: address || 'Remote / Office',
      department,
      designation,
      joining_date: new Date().toISOString().split('T')[0],
      salary: Number(salary) || 85000,
      profile_image: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.employees.push(newEmp);

    const newUser: User = {
      id: `usr_${employee_id}`,
      email,
      password_hash,
      role: ['ADMIN', 'HR', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE',
      employee_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    // Create Initial Payroll Record
    PayrollService.generateOrGetForEmployee(employee_id, 'August', 2026);

    // Create QR code
    await BarcodeService.generateForEmployee(employee_id);

    // Initial Performance Record
    PerformanceService.calculateForEmployee(employee_id);

    AuditService.log(newUser.id, newUser.email, 'REGISTER', 'user', newUser.id, `New employee registered: ${employee_code}`);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, employee_id: newUser.employee_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return success(res, {
      token,
      user: { id: newUser.id, email: newUser.email, role: newUser.role, employee_id },
      employee: newEmp,
    }, 'Account registered successfully', 201);
  } catch (err: any) {
    return error(res, err.message || 'Registration failed', 'SERVER_ERROR', 500);
  }
});

router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password, identifier, employeeId, portal } = req.body;
    const loginInput = (identifier || email || employeeId || '').trim();

    if (!loginInput || !password) {
      return error(res, 'Employee ID / Email and password are required', 'VALIDATION_ERROR');
    }

    const inputLower = loginInput.toLowerCase();
    // 1. Try finding user directly by email
    let user = db.users.find(u => u.email.toLowerCase() === inputLower);

    // 2. If not found, try matching by employee_code or employee ID
    if (!user) {
      const emp = db.employees.find(
        e => e.employee_code.toLowerCase() === inputLower || e.id.toLowerCase() === inputLower
      );
      if (emp) {
        user = db.users.find(u => u.email.toLowerCase() === emp.email.toLowerCase()) ||
               db.users.find(u => u.employee_id === emp.id);
      }
    }

    // 3. If not found, try matching by username prefix (e.g. 'admin', 'hr')
    if (!user) {
      user = db.users.find(u => u.id.toLowerCase() === inputLower || u.email.split('@')[0].toLowerCase() === inputLower);
    }

    if (!user) {
      return error(res, 'Invalid credentials. User not found.', 'INVALID_CREDENTIALS', 401);
    }

    const validPass = await bcrypt.compare(password, user.password_hash);
    if (!validPass) {
      return error(res, 'Invalid credentials. Incorrect password.', 'INVALID_CREDENTIALS', 401);
    }

    // Portal verification
    if (portal === 'hr') {
      if (user.role !== 'HR' && user.role !== 'ADMIN') {
        return error(res, 'Access denied. HR credentials required.', 'FORBIDDEN', 403);
      }
    } else if (portal === 'employee') {
      if (user.role === 'HR' || user.role === 'ADMIN') {
        // If HR/admin has employee profile, allow; if not, notify
        const emp = db.employees.find(e => e.id === user.employee_id);
        if (!emp) {
          return error(res, 'No associated employee profile found for this account.', 'NO_EMPLOYEE_PROFILE', 403);
        }
      }
    }

    const employee = db.employees.find(e => e.id === user.employee_id) || null;

    if (employee && employee.status === 'REJECTED') {
      return error(res, 'Your employee registration has been rejected. Please contact HR.', 'ACCOUNT_REJECTED', 403);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    AuditService.log(user.id, user.email, 'LOGIN', 'user', user.id, `User logged in to ${portal || 'system'} portal`);

    return success(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
      },
      employee,
    }, 'Logged in successfully');
  } catch (err: any) {
    return error(res, err.message || 'Login failed', 'SERVER_ERROR', 500);
  }
});

router.get('/auth/me', authenticateToken, (req: AuthRequest, res: Response) => {
  const user = db.users.find(u => u.id === req.user?.id);
  if (!user) return error(res, 'User not found', 'NOT_FOUND', 404);
  const employee = db.employees.find(e => e.id === user.employee_id) || null;
  return success(res, { user: { id: user.id, email: user.email, role: user.role, employee_id: user.employee_id }, employee });
});

router.post('/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.user) {
    AuditService.log(req.user.id, req.user.email, 'LOGOUT', 'user', req.user.id, 'User signed out');
  }
  return success(res, null, 'Logged out successfully');
});

// ==========================================
// 2. DASHBOARD STATS & ANALYTICS
// ==========================================

router.get('/dashboard/stats', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const today = AttendanceService.getTodayDateStr();
    const totalEmployees = db.employees.filter(e => e.status === 'ACTIVE').length;

    const todayAttendances = db.attendance.filter(a => a.date === today);
    const presentToday = todayAttendances.filter(a => ['PRESENT', 'LATE'].includes(a.status)).length;
    const absentToday = todayAttendances.filter(a => a.status === 'ABSENT').length;
    const leaveToday = todayAttendances.filter(a => a.status === 'LEAVE').length;
    const lateToday = todayAttendances.filter(a => a.status === 'LATE').length;

    // Pending leave requests
    const pendingLeave = db.leave_requests.filter(l => l.status === 'PENDING').length;

    // Average Performance
    const performanceRecords = db.performance_records;
    const avgPerformance = performanceRecords.length > 0
      ? Math.round((performanceRecords.reduce((acc, r) => acc + r.overall_score, 0) / performanceRecords.length) * 10) / 10
      : 88;

    // Average Working Hours from recent sessions
    const recentSessions = db.work_sessions.slice(0, 100);
    const avgWorkingMins = recentSessions.length > 0
      ? Math.round(recentSessions.reduce((acc, s) => acc + (s.total_minutes || 0), 0) / recentSessions.length)
      : 480;
    const avgWorkingHours = Math.round((avgWorkingMins / 60) * 10) / 10;

    // Low Activity Count
    let lowActivityCount = 0;
    for (const emp of db.employees) {
      const act = ActivityService.analyzeEmployeeActivity(emp.id);
      if (act.isLowActivity) lowActivityCount++;
    }

    // 3-Day Absence Alerts
    const absenceAlerts = AttendanceService.detectThreeConsecutiveAbsences();
    const pendingAbsenceAlertsCount = absenceAlerts.filter(a => a.reviewStatus === 'REQUIRES_HR_REVIEW').length;

    return success(res, {
      totalEmployees,
      presentToday,
      absentToday,
      leaveToday,
      lateToday,
      avgWorkingHours,
      avgPerformance,
      lowActivityCount,
      pendingLeaveRequests: pendingLeave,
      threeDayAbsenceCount: pendingAbsenceAlertsCount,
      threeDayAbsenceAlerts: absenceAlerts,
    });
  } catch (err: any) {
    return error(res, err.message, 'SERVER_ERROR', 500);
  }
});

router.get('/dashboard/charts', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    // 1. Attendance Trend (Last 7 weekdays)
    const datesMap: { [key: string]: { date: string; present: number; late: number; leave: number; absent: number } } = {};
    const attendances = db.attendance.slice(0, 300);
    attendances.forEach(a => {
      if (!datesMap[a.date]) {
        datesMap[a.date] = { date: a.date.slice(5), present: 0, late: 0, leave: 0, absent: 0 };
      }
      if (a.status === 'PRESENT') datesMap[a.date].present++;
      else if (a.status === 'LATE') datesMap[a.date].late++;
      else if (a.status === 'LEAVE') datesMap[a.date].leave++;
      else if (a.status === 'ABSENT') datesMap[a.date].absent++;
    });
    const attendanceTrend = Object.values(datesMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

    // 2. Department Performance
    const deptScores: { [key: string]: { total: number; count: number } } = {};
    db.employees.forEach(emp => {
      const perf = db.performance_records.find(p => p.employee_id === emp.id);
      if (!deptScores[emp.department]) deptScores[emp.department] = { total: 0, count: 0 };
      if (perf) {
        deptScores[emp.department].total += perf.overall_score;
        deptScores[emp.department].count++;
      }
    });
    const departmentPerformance = Object.keys(deptScores).map(dept => ({
      department: dept,
      avgScore: deptScores[dept].count > 0 ? Math.round((deptScores[dept].total / deptScores[dept].count) * 10) / 10 : 85,
    }));

    // 3. Performance Distribution
    const performanceDistribution = [
      { grade: 'A+ (92-100%)', count: db.performance_records.filter(p => p.grade === 'A+').length },
      { grade: 'A (85-91%)', count: db.performance_records.filter(p => p.grade === 'A').length },
      { grade: 'B (75-84%)', count: db.performance_records.filter(p => p.grade === 'B').length },
      { grade: 'C (60-74%)', count: db.performance_records.filter(p => p.grade === 'C').length },
      { grade: 'D (<60%)', count: db.performance_records.filter(p => p.grade === 'D').length },
    ];

    // 4. Working Hours Distribution
    const workingHours = [
      { range: '< 6 hrs', count: db.work_sessions.filter(s => (s.total_minutes || 0) < 360).length },
      { range: '6 - 7.5 hrs', count: db.work_sessions.filter(s => (s.total_minutes || 0) >= 360 && (s.total_minutes || 0) < 450).length },
      { range: '7.5 - 9 hrs', count: db.work_sessions.filter(s => (s.total_minutes || 0) >= 450 && (s.total_minutes || 0) <= 540).length },
      { range: '> 9 hrs', count: db.work_sessions.filter(s => (s.total_minutes || 0) > 540).length },
    ];

    // 5. Leave Statistics
    const leaveStats = [
      { type: 'Paid Leave', count: db.leave_requests.filter(l => l.leave_type === 'PAID').length },
      { type: 'Sick Leave', count: db.leave_requests.filter(l => l.leave_type === 'SICK').length },
      { type: 'Unpaid Leave', count: db.leave_requests.filter(l => l.leave_type === 'UNPAID').length },
    ];

    return success(res, {
      attendanceTrend,
      departmentPerformance,
      performanceDistribution,
      workingHours,
      leaveStats,
    });
  } catch (err: any) {
    return error(res, err.message, 'SERVER_ERROR', 500);
  }
});

// ==========================================
// 3. EMPLOYEE MANAGEMENT
// ==========================================

router.get('/employees', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const { search, department, status, sort = 'name', order = 'asc' } = req.query;

  let list = db.employees.map(emp => {
    const perf = db.performance_records.find(p => p.employee_id === emp.id) || null;
    const attStatus = AttendanceService.getTodayStatus(emp.id);
    const activity = ActivityService.analyzeEmployeeActivity(emp.id);
    return {
      ...emp,
      today_status: attStatus.record?.status || 'NOT_CHECKED_IN',
      is_checked_in: attStatus.isCheckedIn,
      performance_score: perf?.overall_score ?? 85,
      performance_grade: perf?.grade ?? 'B',
      activity_flag: activity.flag,
    };
  });

  const searchVal = search && search !== 'undefined' ? String(search).trim().toLowerCase() : '';
  if (searchVal) {
    list = list.filter(e =>
      e.first_name.toLowerCase().includes(searchVal) ||
      e.last_name.toLowerCase().includes(searchVal) ||
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(searchVal) ||
      e.employee_code.toLowerCase().includes(searchVal) ||
      e.email.toLowerCase().includes(searchVal) ||
      e.designation.toLowerCase().includes(searchVal)
    );
  }

  const deptVal = department && department !== 'undefined' && department !== 'ALL' ? String(department).trim().toLowerCase() : '';
  if (deptVal) {
    list = list.filter(e => e.department.toLowerCase() === deptVal);
  }

  const statusVal = status && status !== 'undefined' && status !== 'ALL' ? String(status).trim() : '';
  if (statusVal) {
    list = list.filter(e => e.status === statusVal);
  }

  return success(res, list);
});

router.get('/employees/:id', authenticateToken, requireSelfOrAdmin, (req: AuthRequest, res: Response) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return error(res, 'Employee not found', 'NOT_FOUND', 404);

  const barcode = db.employee_barcodes.find(b => b.employee_id === emp.id) || null;
  const performance = db.performance_records.find(p => p.employee_id === emp.id) || PerformanceService.calculateForEmployee(emp.id);
  const penalties = db.performance_penalties.filter(p => p.employee_id === emp.id);
  const todayStatus = AttendanceService.getTodayStatus(emp.id);
  const activity = ActivityService.analyzeEmployeeActivity(emp.id);
  const tasks = db.tasks.filter(t => t.employee_id === emp.id);
  const attendanceHistory = db.attendance.filter(a => a.employee_id === emp.id).slice(0, 30);
  const payroll = db.payroll.find(p => p.employee_id === emp.id) || null;
  const leaveRequests = db.leave_requests.filter(l => l.employee_id === emp.id);

  return success(res, {
    employee: emp,
    barcode,
    performance,
    penalties,
    todayStatus,
    activity,
    tasks,
    attendanceHistory,
    payroll: ['ADMIN', 'HR'].includes(req.user?.role || '') || req.user?.employee_id === emp.id ? payroll : null,
    leaveRequests,
  });
});

router.post('/employees', authenticateToken, requireRole(['ADMIN', 'HR']), async (req: AuthRequest, res: Response) => {
  try {
    let { first_name, last_name, name, email, phone, address, department, designation, salary, password, employee_id: customEmpCode } = req.body;
    
    if (name && (!first_name || !last_name)) {
      const parts = name.trim().split(/\s+/);
      first_name = parts[0] || '';
      last_name = parts.slice(1).join(' ') || 'Employee';
    }

    if (!first_name || !email) {
      return error(res, 'Employee name and email are required', 'VALIDATION_ERROR', 400);
    }

    if (!department) {
      return error(res, 'Department is required', 'VALIDATION_ERROR', 400);
    }

    if (!designation) {
      return error(res, 'Designation is required', 'VALIDATION_ERROR', 400);
    }

    if (salary === undefined || salary === null || isNaN(Number(salary))) {
      return error(res, 'Valid salary amount is required', 'VALIDATION_ERROR', 400);
    }

    if (db.employees.some(e => e.email.toLowerCase() === email.toLowerCase())) {
      return error(res, 'An employee with this email already exists', 'EMAIL_EXISTS', 409);
    }

    const nextNum = db.employees.length + 1001;
    const employee_code = (customEmpCode || `EMP${nextNum}`).trim();

    if (db.employees.some(e => e.employee_code.toLowerCase() === employee_code.toLowerCase())) {
      return error(res, `Employee code ${employee_code} already exists`, 'CODE_EXISTS', 409);
    }

    const employee_id = `emp_${String(db.employees.length + 1).padStart(3, '0')}`;

    const emp: Employee = {
      id: employee_id,
      employee_code,
      first_name,
      last_name: last_name || '',
      email,
      phone: phone || '+1 (555) 000-0000',
      address: address || 'Office HQ',
      department: department || 'Engineering',
      designation: designation || 'Associate',
      joining_date: req.body.joining_date || new Date().toISOString().split('T')[0],
      salary: Number(salary) || 80000,
      profile_image: req.body.profile_image || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.employees.push(emp);

    const rawPassword = password || 'emp123';
    const hash = await bcrypt.hash(rawPassword, 10);
    db.users.push({
      id: `usr_${employee_id}`,
      email,
      password_hash: hash,
      role: 'EMPLOYEE',
      employee_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await BarcodeService.generateForEmployee(employee_id);
    PerformanceService.calculateForEmployee(employee_id);
    db.save();

    AuditService.log(req.user!.id, req.user!.email, 'CREATE_EMPLOYEE', 'employee', employee_id, `Created employee ${employee_code}`);

    return success(res, emp, 'Employee created successfully', 201);
  } catch (err: any) {
    return error(res, err.message, 'SERVER_ERROR', 500);
  }
});

router.put('/employees/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return error(res, 'Employee not found', 'NOT_FOUND', 404);

  const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
  const isSelf = req.user?.employee_id === emp.id;

  if (!isHrOrAdmin && !isSelf) {
    return error(res, 'Permission denied', 'FORBIDDEN', 403);
  }

  // Employees can only update personal contact fields
  if (isSelf && !isHrOrAdmin) {
    if (req.body.phone !== undefined) emp.phone = req.body.phone;
    if (req.body.address !== undefined) emp.address = req.body.address;
    if (req.body.profile_image !== undefined) emp.profile_image = req.body.profile_image;
  } else if (isHrOrAdmin) {
    // Admin/HR can update any info
    if (req.body.first_name !== undefined) emp.first_name = req.body.first_name;
    if (req.body.last_name !== undefined) emp.last_name = req.body.last_name;
    if (req.body.phone !== undefined) emp.phone = req.body.phone;
    if (req.body.address !== undefined) emp.address = req.body.address;
    if (req.body.department !== undefined) emp.department = req.body.department;
    if (req.body.designation !== undefined) emp.designation = req.body.designation;
    if (req.body.salary !== undefined) emp.salary = Number(req.body.salary);
    if (req.body.status !== undefined) emp.status = req.body.status;
  }

  emp.updated_at = new Date().toISOString();
  db.save();

  AuditService.log(req.user!.id, req.user!.email, 'UPDATE_EMPLOYEE', 'employee', emp.id, `Updated employee ${emp.employee_code}`);

  return success(res, emp, 'Employee details updated successfully');
});

router.delete('/employees/:id', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return error(res, 'Employee not found', 'NOT_FOUND', 404);

  emp.status = 'INACTIVE';
  emp.updated_at = new Date().toISOString();
  db.save();

  AuditService.log(req.user!.id, req.user!.email, 'DEACTIVATE_EMPLOYEE', 'employee', emp.id, `Deactivated employee ${emp.employee_code}`);

  return success(res, null, 'Employee deactivated successfully');
});

// Employee Registration & Approval Workflows
router.get('/employees-approvals', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const pending = db.employees.filter(e => e.status === 'PENDING');
  return success(res, pending);
});

router.put('/employees/:id/approve', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return error(res, 'Employee not found', 'NOT_FOUND', 404);

  emp.status = 'ACTIVE';
  emp.updated_at = new Date().toISOString();
  db.save();

  AuditService.log(req.user!.id, req.user!.email, 'APPROVE_EMPLOYEE', 'employee', emp.id, `Approved employee registration for ${emp.employee_code}`);
  return success(res, emp, `Employee ${emp.first_name} ${emp.last_name} approved successfully`);
});

router.put('/employees/:id/reject', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (!emp) return error(res, 'Employee not found', 'NOT_FOUND', 404);

  emp.status = 'REJECTED';
  emp.updated_at = new Date().toISOString();
  db.save();

  AuditService.log(req.user!.id, req.user!.email, 'REJECT_EMPLOYEE', 'employee', emp.id, `Rejected employee registration for ${emp.employee_code}`);
  return success(res, emp, `Employee registration rejected`);
});

// ==========================================
// 3b. HR MANAGEMENT (ADMIN-ONLY)
// ==========================================

// Get all HR & Admin staff list
const handleGetHRStaff = (req: AuthRequest, res: Response) => {
  const hrUsers = db.users.filter(u => u.role === 'HR' || u.role === 'ADMIN');
  const hrList = hrUsers.map(u => {
    const emp = db.employees.find(e => e.id === u.employee_id || e.email.toLowerCase() === u.email.toLowerCase());
    return {
      id: u.id,
      user_id: u.id,
      employee_id: u.employee_id || emp?.id || '',
      first_name: emp?.first_name || (u.role === 'ADMIN' ? 'System' : 'HR'),
      last_name: emp?.last_name || (u.role === 'ADMIN' ? 'Administrator' : 'Specialist'),
      email: u.email,
      employee_code: emp?.employee_code || (u.role === 'ADMIN' ? 'ADM001' : 'HR1001'),
      department: emp?.department || 'Human Resources',
      designation: emp?.designation || (u.role === 'ADMIN' ? 'Chief Administrator' : 'HR Specialist'),
      role: u.role,
      status: emp?.status || 'ACTIVE',
      created_at: u.created_at || emp?.created_at || new Date().toISOString(),
    };
  });

  return success(res, hrList, 'HR staff list retrieved successfully');
};

router.get('/admin/hr', authenticateToken, requireRole(['ADMIN']), handleGetHRStaff);
router.get('/admin/hr-staff', authenticateToken, requireRole(['ADMIN']), handleGetHRStaff);
router.get('/hr-management', authenticateToken, requireRole(['ADMIN']), handleGetHRStaff);

// Create a new HR account (ADMIN-ONLY)
const handleCreateHR = async (req: AuthRequest, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      employee_code,
      hr_code,
      staff_code,
      password,
      department,
      designation,
      phone,
      address,
      salary,
    } = req.body;

    const fn = (first_name || '').trim();
    const ln = (last_name || '').trim();
    const em = (email || '').trim().toLowerCase();
    const code = (employee_code || hr_code || staff_code || '').trim().toUpperCase();
    const pwd = (password || '').trim();
    const dept = (department || 'Human Resources').trim();
    const desig = (designation || 'HR Manager').trim();

    // 1. Validate required fields
    if (!fn) {
      return error(res, 'First Name is required', 'VALIDATION_ERROR', 400);
    }
    if (!ln) {
      return error(res, 'Last Name is required', 'VALIDATION_ERROR', 400);
    }
    if (!em) {
      return error(res, 'Email is required', 'VALIDATION_ERROR', 400);
    }
    if (!code) {
      return error(res, 'HR Employee/Staff Code is required', 'VALIDATION_ERROR', 400);
    }
    if (!pwd) {
      return error(res, 'Password is required', 'VALIDATION_ERROR', 400);
    }
    if (!dept) {
      return error(res, 'Department is required', 'VALIDATION_ERROR', 400);
    }
    if (!desig) {
      return error(res, 'Designation is required', 'VALIDATION_ERROR', 400);
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(em)) {
      return error(res, 'Please provide a valid email address', 'INVALID_EMAIL', 400);
    }

    // 3. Validate password length
    if (pwd.length < 6) {
      return error(res, 'Password must be at least 6 characters long', 'INVALID_PASSWORD', 400);
    }

    // 4. Prevent duplicate email
    const emailExistsInUsers = db.users.some(u => u.email.toLowerCase() === em);
    const emailExistsInEmployees = db.employees.some(e => e.email.toLowerCase() === em);
    if (emailExistsInUsers || emailExistsInEmployees) {
      return error(res, 'An account with this email already exists', 'DUPLICATE_EMAIL', 409);
    }

    // 5. Prevent duplicate HR/Staff code
    const codeExists = db.employees.some(e => e.employee_code.toUpperCase() === code);
    if (codeExists) {
      return error(res, `HR Employee/Staff code "${code}" already exists`, 'DUPLICATE_CODE', 409);
    }

    // 6. Hash password with bcrypt
    const password_hash = await bcrypt.hash(pwd, 10);

    // 7. Create Employee Record
    const employee_id = `emp_hr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newEmployee: Employee = {
      id: employee_id,
      employee_code: code,
      first_name: fn,
      last_name: ln,
      email: em,
      phone: phone || '+1 (555) 000-0000',
      address: address || 'Dayflow Corporate HQ, HR Department',
      department: dept,
      designation: desig,
      joining_date: req.body.joining_date || new Date().toISOString().split('T')[0],
      salary: Number(salary) || 105000,
      profile_image: req.body.profile_image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.employees.push(newEmployee);

    // 8. Create User Record (Always enforce role = 'HR')
    const user_id = `usr_${employee_id}`;
    const newUser: User = {
      id: user_id,
      email: em,
      password_hash,
      role: 'HR',
      employee_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(newUser);

    // 9. Sync to PostgreSQL
    db.save();

    // 10. Generate QR / Barcode & setup
    await BarcodeService.generateForEmployee(employee_id).catch(() => {});
    PerformanceService.calculateForEmployee(employee_id);

    // 11. Audit Log
    AuditService.log(
      req.user!.id,
      req.user!.email,
      'CREATE_HR',
      'user',
      user_id,
      `Admin created new HR account for ${fn} ${ln} (${em}, Code: ${code})`
    );

    // 12. Response (Never return plaintext password or password_hash!)
    return success(
      res,
      {
        id: user_id,
        user_id,
        employee_id,
        first_name: fn,
        last_name: ln,
        email: em,
        employee_code: code,
        department: dept,
        designation: desig,
        role: 'HR',
        status: 'ACTIVE',
        created_at: newUser.created_at,
      },
      'HR created successfully.',
      201
    );
  } catch (err: any) {
    return error(res, err.message || 'Internal server error while creating HR account', 'SERVER_ERROR', 500);
  }
};

router.post('/admin/hr', authenticateToken, requireRole(['ADMIN']), handleCreateHR);
router.post('/admin/hr-staff', authenticateToken, requireRole(['ADMIN']), handleCreateHR);
router.post('/hr-management', authenticateToken, requireRole(['ADMIN']), handleCreateHR);

// ==========================================
// 4. ATTENDANCE & WORKING HOURS
// ==========================================

// QR Code Check-In for Employee (Security: Identifies employee from JWT)
router.post('/attendance/scan-qr', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const employeeId = req.user?.employee_id;
    if (!employeeId) {
      return error(res, 'No authenticated employee profile associated with this account', 'NO_EMPLOYEE_PROFILE', 403);
    }

    const qr_data = req.body.qr_data || req.body.qrPayload || req.body.sessionToken || req.body.sessionId || req.body.qrData || req.body.data;
    if (!qr_data) {
      return error(res, 'QR data string is required', 'VALIDATION_ERROR');
    }

    const result = AttendanceService.validateAndRecordQRAttendance(employeeId, qr_data);
    AuditService.log(req.user!.id, req.user!.email, 'QR_ATTENDANCE', 'attendance', result.attendance.id, `QR attendance verified for employee ${employeeId}`);

    return success(res, result, result.message || 'Attendance marked successfully');
  } catch (err: any) {
    const msg = err.message || 'Failed to process QR attendance';
    if (msg.includes('already marked')) {
      return error(res, 'Attendance already marked', 'ALREADY_MARKED', 400);
    }
    if (msg.includes('Invalid attendance QR code')) {
      return error(res, 'Invalid attendance QR code', 'INVALID_QR', 400);
    }
    return error(res, msg, 'QR_SCAN_ERROR', 400);
  }
});

// Generate or fetch live workplace QR session
router.get('/attendance/qr-session', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const session = await AttendanceService.generateAttendanceQRSession();
    return success(res, session, 'Active QR attendance session generated');
  } catch (err: any) {
    return error(res, err.message, 'QR_GENERATE_ERROR', 500);
  }
});


router.post('/attendance/check-in', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const targetEmpId = req.body.employee_id || req.user?.employee_id;
    if (!targetEmpId) return error(res, 'Employee ID required', 'VALIDATION_ERROR');

    // Self or Admin check
    if (!['ADMIN', 'HR'].includes(req.user?.role || '') && targetEmpId !== req.user?.employee_id) {
      return error(res, 'Cannot check in for another employee', 'FORBIDDEN', 403);
    }

    const result = AttendanceService.checkIn(targetEmpId, req.body.custom_time);
    AuditService.log(req.user!.id, req.user!.email, 'CHECK_IN', 'attendance', result.attendance.id, `Check-in recorded for ${targetEmpId}`);

    return success(res, result, 'Checked in successfully');
  } catch (err: any) {
    return error(res, err.message, 'CHECKIN_ERROR');
  }
});

router.post('/attendance/check-out', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const targetEmpId = req.body.employee_id || req.user?.employee_id;
    if (!targetEmpId) return error(res, 'Employee ID required', 'VALIDATION_ERROR');

    if (!['ADMIN', 'HR'].includes(req.user?.role || '') && targetEmpId !== req.user?.employee_id) {
      return error(res, 'Cannot check out for another employee', 'FORBIDDEN', 403);
    }

    const result = AttendanceService.checkOut(targetEmpId, req.body.custom_time);
    AuditService.log(req.user!.id, req.user!.email, 'CHECK_OUT', 'attendance', result.attendance.id, `Check-out recorded for ${targetEmpId}`);

    return success(res, result, 'Checked out successfully');
  } catch (err: any) {
    return error(res, err.message, 'CHECKOUT_ERROR');
  }
});

router.get('/attendance/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const history = AttendanceService.getEmployeeAttendanceHistory(req.user!.employee_id);
  const todayStatus = AttendanceService.getTodayStatus(req.user!.employee_id);
  return success(res, { history, todayStatus });
});

function normalizeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const str = String(dateStr).trim();
  if (!str || str === 'ALL' || str === 'null' || str === 'undefined') return '';
  
  // Check if DD-MM-YYYY format (e.g., 26-08-2026)
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Check if YYYY-MM-DD format (e.g., 2026-08-26)
  const yyyymmdd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // Ignore
  }
  return str;
}

router.get('/attendance/all', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const { date, department, status } = req.query;
  let list = db.attendance.map(a => {
    const emp = db.employees.find(e => e.id === a.employee_id);
    return {
      ...a,
      employee_code: emp?.employee_code,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      department: emp?.department || '',
      profile_image: emp?.profile_image,
    };
  });

  if (date && date !== 'ALL' && date !== 'null' && date !== 'undefined' && String(date).trim() !== '') {
    const normDate = normalizeDate(String(date));
    if (normDate) {
      list = list.filter(a => normalizeDate(a.date) === normDate);
    }
  }
  if (department && department !== 'ALL' && department !== 'null' && department !== 'undefined' && String(department).trim() !== '') {
    const deptQuery = String(department).trim().toLowerCase();
    list = list.filter(a => a.department.trim().toLowerCase() === deptQuery);
  }
  if (status && status !== 'ALL' && status !== 'null' && status !== 'undefined' && String(status).trim() !== '') {
    const statQuery = String(status).trim().toUpperCase();
    list = list.filter(a => a.status.toUpperCase() === statQuery);
  }

  return success(res, list);
});

router.get('/attendance/three-day-alerts', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const alerts = AttendanceService.detectThreeConsecutiveAbsences();
  return success(res, alerts);
});

// Log HR Review for 3-Day Consecutive Absence Alert (Security: Extracts HR ID from JWT)
router.post(['/attendance/review', '/attendance/three-day-alerts/review'], authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { employee_id, review_note, alert_id, absent_dates, consecutive_days, action_taken } = req.body;

    if (!employee_id || typeof employee_id !== 'string' || employee_id.trim() === '') {
      return error(res, 'Employee ID is required.', 'VALIDATION_ERROR', 400);
    }

    if (!review_note || typeof review_note !== 'string' || review_note.trim() === '') {
      return error(res, 'Review note is required.', 'VALIDATION_ERROR', 400);
    }

    const emp = db.employees.find(e => e.id === employee_id.trim());
    if (!emp) {
      return error(res, 'Employee not found.', 'NOT_FOUND', 404);
    }

    // HR user ID and email strictly identified from authenticated JWT token
    const hrId = req.user!.id;
    const hrEmail = req.user!.email;

    const review = AttendanceService.logAbsenceReview({
      employeeId: employee_id.trim(),
      hrId,
      hrEmail,
      reviewNote: review_note.trim(),
      alertId: alert_id,
      absentDates: Array.isArray(absent_dates) ? absent_dates : undefined,
      consecutiveDays: Number(consecutive_days) || 3,
      actionTaken: action_taken || 'HR_NOTE_LOGGED',
    });

    AuditService.log(
      hrId,
      hrEmail,
      'LOG_HR_REVIEW',
      'attendance_review',
      review.id,
      `HR logged review for employee ${emp.employee_code} (${emp.first_name} ${emp.last_name}): "${review_note.trim()}"`
    );

    return success(res, review, 'HR review logged successfully', 201);
  } catch (err: any) {
    return error(res, err.message || 'Unable to save HR review. Please try again.', 'REVIEW_ERROR', 500);
  }
});

// Retrieve all attendance reviews
router.get('/attendance/reviews', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const reviews = AttendanceService.getAbsenceReviews();
  return success(res, reviews);
});

router.get('/attendance/reviews/:employeeId', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const reviews = AttendanceService.getAbsenceReviews(req.params.employeeId);
  return success(res, reviews);
});

// Working Hours & Activity Breakdown
router.get('/work-hours/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const empId = req.user!.employee_id;
  const sessions = db.work_sessions.filter(s => s.employee_id === empId);
  const activity = ActivityService.analyzeEmployeeActivity(empId);

  // Calculate Weekly and Monthly Totals
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.total_minutes || 0), 0);
  const activeMinutes = sessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0);
  const idleMinutes = sessions.reduce((acc, s) => acc + (s.idle_minutes || 0), 0);

  return success(res, {
    todaySession: activity,
    sessions: sessions.slice(0, 30),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    activeHours: Math.round((activeMinutes / 60) * 10) / 10,
    idleHours: Math.round((idleMinutes / 60) * 10) / 10,
  });
});

router.get('/work-hours/all', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const all = ActivityService.getAllWorkHours();
  return success(res, all);
});

router.get('/work-hours/low-activity', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const low = ActivityService.getLowActivityEmployees();
  return success(res, low);
});

router.get('/work-hours/:employeeId', authenticateToken, requireSelfOrAdmin, (req: AuthRequest, res: Response) => {
  const empId = req.params.employeeId;
  const sessions = db.work_sessions.filter(s => s.employee_id === empId);
  const activity = ActivityService.analyzeEmployeeActivity(empId);
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.total_minutes || 0), 0);

  return success(res, {
    todaySession: activity,
    sessions: sessions.slice(0, 30),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
  });
});

// ==========================================
// 5. ACTIVITY HEARTBEAT & IDLE MONITORING
// ==========================================

router.post('/activity/heartbeat', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user!.employee_id;
    const { activity_type, details } = req.body;
    const result = ActivityService.recordHeartbeat(empId, activity_type, details);
    return success(res, result);
  } catch (err: any) {
    return error(res, err.message, 'HEARTBEAT_ERROR');
  }
});

router.get('/activity/:employeeId', authenticateToken, requireSelfOrAdmin, (req: AuthRequest, res: Response) => {
  const empId = req.params.employeeId;
  const analysis = ActivityService.analyzeEmployeeActivity(empId);
  const recentLogs = ActivityService.getRecentLogs(empId, 25);
  return success(res, { analysis, recentLogs });
});

// ==========================================
// 6. PERFORMANCE ENGINE & TOP PERFORMERS
// ==========================================

router.get('/performance/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const empId = req.user!.employee_id;
  if (!empId) {
    return error(res, 'Employee profile not associated with account', 'NOT_FOUND', 404);
  }
  const result = PerformanceService.getCleanPerformance(empId);
  return success(res, result);
});

router.get('/performance/top-performers', authenticateToken, (req: Request, res: Response) => {
  const { timeframe, department } = req.query;
  const list = PerformanceService.getTopPerformers({
    timeframe: timeframe ? String(timeframe) : undefined,
    department: department ? String(department) : undefined,
  });
  return success(res, list);
});

router.get('/performance/penalties', authenticateToken, (req: AuthRequest, res: Response) => {
  const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
  let list = db.performance_penalties;
  if (!isHrOrAdmin) {
    list = list.filter(p => p.employee_id === req.user?.employee_id);
  } else if (req.query.employee_id) {
    list = list.filter(p => p.employee_id === String(req.query.employee_id));
  }
  return success(res, list);
});

router.post('/performance/recalculate', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  for (const emp of db.employees) {
    PerformanceService.calculateForEmployee(emp.id);
  }
  return success(res, null, 'Performance scores recalculated for all active employees.');
});

router.get('/performance/:employeeId', authenticateToken, requireSelfOrAdmin, (req: AuthRequest, res: Response) => {
  const empId = req.params.employeeId;
  const result = PerformanceService.getCleanPerformance(empId);
  return success(res, result);
});

// ==========================================
// 7. TASK MANAGEMENT
// ==========================================

router.get('/tasks', authenticateToken, (req: AuthRequest, res: Response) => {
  const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
  let tasks = db.tasks;

  if (!isHrOrAdmin) {
    tasks = tasks.filter(t => t.employee_id === req.user?.employee_id);
  }

  const enriched = tasks.map(t => {
    const emp = db.employees.find(e => e.id === t.employee_id);
    return {
      ...t,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unassigned',
      employee_code: emp?.employee_code,
    };
  });

  return success(res, enriched);
});

router.get('/tasks/my', authenticateToken, (req: AuthRequest, res: Response) => {
  const tasks = db.tasks.filter(t => t.employee_id === req.user?.employee_id);
  const enriched = tasks.map(t => {
    const emp = db.employees.find(e => e.id === t.employee_id);
    return {
      ...t,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unassigned',
      employee_code: emp?.employee_code,
    };
  });
  return success(res, enriched);
});

router.post('/tasks', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const { employee_id, assigned_to, title, description, priority = 'MEDIUM', due_date } = req.body;
  const targetEmpId = employee_id || assigned_to;
  if (!targetEmpId || !title || !due_date) {
    return error(res, 'Employee, title, and due date are required', 'VALIDATION_ERROR');
  }

  const task: Task = {
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    employee_id: targetEmpId,
    title,
    description: description || '',
    priority,
    status: 'TODO',
    due_date,
    completion_date: null,
    created_at: new Date().toISOString(),
  };

  db.tasks.unshift(task);
  db.save();

  // Notify employee
  const targetEmp = db.employees.find(e => e.id === targetEmpId);
  if (targetEmp) {
    NotificationService.notifyTaskAssigned(task, targetEmp);
  }

  AuditService.log(req.user!.id, req.user!.email, 'CREATE_TASK', 'task', task.id, `Assigned task "${title}" to ${targetEmp?.first_name || targetEmpId}`);

  return success(res, task, 'Task created and assigned successfully', 201);
});

router.all(['/tasks/:id', '/tasks/:id/status'], authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return error(res, 'Task not found', 'NOT_FOUND', 404);

  const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
  const isOwner = req.user?.employee_id === task.employee_id;

  if (!isHrOrAdmin && !isOwner) {
    return error(res, 'Permission denied', 'FORBIDDEN', 403);
  }

  if (req.body.status !== undefined) {
    const oldStatus = task.status;
    task.status = req.body.status;
    if (req.body.status === 'COMPLETED') {
      task.completion_date = new Date().toISOString();
      if (oldStatus !== 'COMPLETED') {
        const emp = db.employees.find(e => e.id === task.employee_id);
        if (emp) {
          NotificationService.notifyTaskCompleted(task, emp);
        }
      }
    } else {
      task.completion_date = null;
    }
  }

  if (isHrOrAdmin) {
    if (req.body.title !== undefined) task.title = req.body.title;
    if (req.body.description !== undefined) task.description = req.body.description;
    if (req.body.priority !== undefined) task.priority = req.body.priority;
    if (req.body.due_date !== undefined) task.due_date = req.body.due_date;
    if (req.body.employee_id !== undefined) task.employee_id = req.body.employee_id;
  }

  db.save();

  // Recalculate performance of assignee
  PerformanceService.calculateForEmployee(task.employee_id);

  return success(res, task, 'Task updated successfully');
});

router.delete('/tasks/:id', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx < 0) return error(res, 'Task not found', 'NOT_FOUND', 404);

  const [removed] = db.tasks.splice(idx, 1);
  db.save();

  PerformanceService.calculateForEmployee(removed.employee_id);

  return success(res, null, 'Task deleted successfully');
});

// ==========================================
// 8. LEAVE MANAGEMENT
// ==========================================

router.post(['/leave', '/leaves'], authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { leave_type = 'PAID', start_date, end_date, reason } = req.body;
    if (!start_date || !end_date || !reason) {
      return error(res, 'Start date, end date, and reason are required', 'VALIDATION_ERROR');
    }

    const leave = LeaveService.applyLeave(req.user!.employee_id, leave_type, start_date, end_date, reason);
    return success(res, leave, 'Leave request submitted successfully', 201);
  } catch (err: any) {
    return error(res, err.message, 'LEAVE_ERROR');
  }
});

router.get(['/leave/my', '/leaves/my'], authenticateToken, (req: AuthRequest, res: Response) => {
  const leaves = db.leave_requests.filter(l => l.employee_id === req.user?.employee_id);
  return success(res, leaves);
});

router.get(['/leave/all', '/leaves/all', '/leaves'], authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const enriched = db.leave_requests.map(l => {
    const emp = db.employees.find(e => e.id === l.employee_id);
    return {
      ...l,
      employee_code: emp?.employee_code,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
      department: emp?.department || '',
      profile_image: emp?.profile_image,
    };
  });
  return success(res, enriched);
});

router.all(['/leave/:id/approve', '/leaves/:id/approve'], authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { comment = 'Approved by HR', hr_comment } = req.body || {};
    const leave = LeaveService.approveLeave(req.params.id, req.user!.id, req.user!.email, comment || hr_comment || 'Approved by HR');
    return success(res, leave, 'Leave request approved successfully');
  } catch (err: any) {
    return error(res, err.message, 'LEAVE_APPROVE_ERROR');
  }
});

router.all(['/leave/:id/reject', '/leaves/:id/reject'], authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { comment = 'Rejected by HR', rejection_reason, hr_comment } = req.body || {};
    const leave = LeaveService.rejectLeave(req.params.id, req.user!.id, req.user!.email, comment || rejection_reason || hr_comment || 'Rejected by HR');
    return success(res, leave, 'Leave request rejected');
  } catch (err: any) {
    return error(res, err.message, 'LEAVE_REJECT_ERROR');
  }
});

router.all(['/leave/:id/review', '/leaves/:id/review', '/leave/:id/status', '/leaves/:id/status'], authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { status, review_comments, hr_comment, rejection_reason } = req.body || {};
    const note = review_comments || hr_comment || rejection_reason || '';
    if (status === 'APPROVED') {
      const leave = LeaveService.approveLeave(req.params.id, req.user!.id, req.user!.email, note || 'Approved by HR');
      return success(res, leave, 'Leave request approved successfully');
    } else if (status === 'REJECTED') {
      const leave = LeaveService.rejectLeave(req.params.id, req.user!.id, req.user!.email, note || 'Rejected by HR');
      return success(res, leave, 'Leave request rejected');
    } else {
      return error(res, 'Invalid review status. Must be APPROVED or REJECTED', 'VALIDATION_ERROR');
    }
  } catch (err: any) {
    return error(res, err.message, 'LEAVE_REVIEW_ERROR');
  }
});

// ==========================================
// 9. PAYROLL MANAGEMENT
// ==========================================

router.get('/payroll/my', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.employee_id;
    if (!empId) {
      return error(res, 'Authenticated user has no associated employee record', 'UNAUTHORIZED', 401);
    }
    const { month, year } = req.query;
    const records = PayrollService.getEmployeePayroll(
      empId,
      month ? String(month) : undefined,
      year ? Number(year) : undefined
    );
    const latest = records[0];
    return success(res, { ...latest, history: records });
  } catch (err: any) {
    return error(res, err.message, 'PAYROLL_FETCH_ERROR');
  }
});

router.get('/payroll/my/payslip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const empId = req.user?.employee_id;
    if (!empId) {
      return error(res, 'Authenticated user has no associated employee record', 'UNAUTHORIZED', 401);
    }
    const { month, year } = req.query;
    const targetMonth = month ? String(month) : 'August';
    const targetYear = year ? Number(year) : 2026;

    const payroll = PayrollService.generateOrGetForEmployee(empId, targetMonth, targetYear);
    const employee = db.employees.find(e => e.id === empId);
    if (!employee) {
      return error(res, 'Employee record not found', 'NOT_FOUND', 404);
    }

    const pdfBuffer = await PdfService.generatePayslipPdf(payroll, employee);

    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12'
    };
    const monthNum = monthMap[(payroll.month || 'August').toLowerCase()] || '08';
    const filename = `Dayflow_Payslip_${employee.employee_code || employee.id}_${payroll.year || 2026}-${monthNum}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err: any) {
    console.error('Payslip generation error:', err);
    return error(res, err.message || 'Failed to generate payslip PDF', 'PDF_GENERATION_ERROR', 500);
  }
});

router.get('/payroll/:id/payslip', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const paramId = req.params.id;
    let payroll = db.payroll.find(p => p.id === paramId || p.employee_id === paramId);

    if (!payroll) {
      // Check if param is an employee ID
      const emp = db.employees.find(e => e.id === paramId || e.employee_code === paramId);
      if (emp) {
        payroll = PayrollService.generateOrGetForEmployee(emp.id, 'August', 2026);
      }
    }

    if (!payroll) {
      return error(res, 'Payroll record not found', 'NOT_FOUND', 404);
    }

    // Authorization check: Employee can only download their own payslip
    const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
    if (!isHrOrAdmin && payroll.employee_id !== req.user?.employee_id) {
      return error(res, 'Forbidden: You cannot access other employees payslip', 'FORBIDDEN', 403);
    }

    const employee = db.employees.find(e => e.id === payroll.employee_id);
    if (!employee) {
      return error(res, 'Employee record not found', 'NOT_FOUND', 404);
    }

    const pdfBuffer = await PdfService.generatePayslipPdf(payroll, employee);

    const monthMap: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12'
    };
    const monthNum = monthMap[(payroll.month || 'August').toLowerCase()] || '08';
    const filename = `Dayflow_Payslip_${employee.employee_code || employee.id}_${payroll.year || 2026}-${monthNum}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (err: any) {
    console.error('Payslip generation error:', err);
    return error(res, err.message || 'Failed to generate payslip PDF', 'PDF_GENERATION_ERROR', 500);
  }
});

router.get('/payroll/all', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { month, year, department } = req.query;
    const list = PayrollService.getAllPayrolls({
      month: month ? String(month) : undefined,
      year: year ? Number(year) : undefined,
      department: department ? String(department) : undefined,
    });
    return success(res, list);
  } catch (err: any) {
    return error(res, err.message, 'PAYROLL_FETCH_ALL_ERROR');
  }
});

router.post('/payroll/generate', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const { month = 'August', year = 2026, employee_id } = req.body;
    if (employee_id) {
      const generated = PayrollService.generateOrGetForEmployee(employee_id, String(month), Number(year));
      return success(res, generated, `Payroll generated for employee for ${month} ${year}`);
    } else {
      const generatedList = PayrollService.generateAllPayrolls(String(month), Number(year));
      return success(res, generatedList, `Payrolls generated for ${generatedList.length} employees for ${month} ${year}`);
    }
  } catch (err: any) {
    return error(res, err.message, 'PAYROLL_GENERATE_ERROR');
  }
});

router.get('/payroll/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  const pay = db.payroll.find(p => p.id === req.params.id || p.employee_id === req.params.id);
  if (!pay) return error(res, 'Payroll record not found', 'NOT_FOUND', 404);

  // Authorization check: Employee can only view their own
  const isHrOrAdmin = ['ADMIN', 'HR'].includes(req.user?.role || '');
  if (!isHrOrAdmin && pay.employee_id !== req.user?.employee_id) {
    return error(res, 'Forbidden: You cannot access other employees payroll', 'FORBIDDEN', 403);
  }

  const emp = db.employees.find(e => e.id === pay.employee_id);
  return success(res, { ...pay, employee: emp });
});

router.put('/payroll/:id', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  try {
    const updated = PayrollService.updatePayroll(
      req.params.id,
      req.body,
      req.user!.id,
      req.user!.email
    );
    return success(res, updated, 'Payroll record updated and recalculated successfully');
  } catch (err: any) {
    return error(res, err.message, 'PAYROLL_UPDATE_ERROR');
  }
});

// ==========================================
// 10. BARCODE & QR CODE RECOGNITION
// ==========================================

router.post('/barcode/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const targetEmpId = req.body.employee_id || req.user?.employee_id;
    if (!targetEmpId) return error(res, 'Employee ID required', 'VALIDATION_ERROR');

    const barcode = await BarcodeService.generateForEmployee(targetEmpId);
    return success(res, barcode, 'Barcode / QR generated');
  } catch (err: any) {
    return error(res, err.message, 'BARCODE_ERROR');
  }
});

router.post('/barcode/scan', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code, action = 'auto' } = req.body;
    if (!code) return error(res, 'QR code or Barcode string required', 'VALIDATION_ERROR');

    const result = await BarcodeService.scanBarcode(code, action);
    AuditService.log(
      req.user!.id,
      req.user!.email,
      'SCAN_BARCODE',
      'employee',
      result.employee.id,
      `Scanned barcode for ${result.employee.employee_code}. Action: ${result.actionTaken}`
    );

    return success(res, result, `Scan verified: ${result.actionTaken}`);
  } catch (err: any) {
    return error(res, err.message, 'SCAN_FAILED');
  }
});

// ==========================================
// 11. NOTIFICATIONS (Role-Isolated & Active Tracked)
// ==========================================

router.get('/notifications', authenticateToken, (req: AuthRequest, res: Response) => {
  const data = NotificationService.getNotificationsForUser(req.user!);
  return success(res, data);
});

router.get('/notifications/unread-count', authenticateToken, (req: AuthRequest, res: Response) => {
  const data = NotificationService.getNotificationsForUser(req.user!);
  return success(res, { unreadCount: data.unreadCount });
});

router.all(['/notifications/:id/read'], authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const notif = NotificationService.markAsRead(req.params.id, req.user!);
    return success(res, notif, 'Notification marked as read');
  } catch (err: any) {
    return error(res, err.message, 'NOT_FOUND', 404);
  }
});

router.all(['/notifications/:id/done'], authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const notif = NotificationService.markAsDone(req.params.id, req.user!);
    return success(res, notif, 'Notification marked as done');
  } catch (err: any) {
    return error(res, err.message, 'NOT_FOUND', 404);
  }
});

router.all(['/notifications/read-all'], authenticateToken, (req: AuthRequest, res: Response) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  NotificationService.markAllAsRead(req.user!);
  return success(res, null, 'All notifications marked as read');
});

// ==========================================
// 12. SYSTEM SETTINGS & AUDIT LOGS
// ==========================================

router.get('/settings', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  const s = db.settings;
  return success(res, {
    ...s,
    officeStartTime: s.official_start_time,
    officeEndTime: s.official_end_time,
    gracePeriodMinutes: s.grace_period_minutes,
    minimumWorkingHoursPerDay: s.minimum_working_hours,
    idleThresholdMinutes: s.idle_threshold_minutes,
    consecutiveAbsenceThreshold: s.consecutive_absence_threshold,
    lateOccurrenceThreshold: s.late_occurrence_threshold,
    latePenaltyPercentage: s.late_penalty_percentage,
    performanceWeights: {
      attendance: Math.round((s.weight_attendance || 0.20) * 100),
      workingHours: Math.round((s.weight_working_hours || 0.20) * 100),
      taskCompletion: Math.round((s.weight_task_completion || 0.30) * 100),
      activity: Math.round((s.weight_activity || 0.15) * 100),
      punctuality: Math.round((s.weight_punctuality || 0.15) * 100),
    },
  });
});

router.put('/settings', authenticateToken, requireRole(['ADMIN', 'HR']), async (req: AuthRequest, res: Response) => {
  try {
    const current = db.settings;
    const body = req.body || {};

    let weightAtt = current.weight_attendance;
    let weightWork = current.weight_working_hours;
    let weightTask = current.weight_task_completion;
    let weightAct = current.weight_activity;
    let weightPunct = current.weight_punctuality;

    if (body.performanceWeights) {
      const pw = body.performanceWeights;
      if (pw.attendance !== undefined) weightAtt = Number(pw.attendance) > 1 ? Number(pw.attendance) / 100 : Number(pw.attendance);
      if (pw.workingHours !== undefined) weightWork = Number(pw.workingHours) > 1 ? Number(pw.workingHours) / 100 : Number(pw.workingHours);
      if (pw.taskCompletion !== undefined) weightTask = Number(pw.taskCompletion) > 1 ? Number(pw.taskCompletion) / 100 : Number(pw.taskCompletion);
      if (pw.activity !== undefined) weightAct = Number(pw.activity) > 1 ? Number(pw.activity) / 100 : Number(pw.activity);
      if (pw.punctuality !== undefined) weightPunct = Number(pw.punctuality) > 1 ? Number(pw.punctuality) / 100 : Number(pw.punctuality);
    }
    if (body.weight_attendance !== undefined) weightAtt = Number(body.weight_attendance) > 1 ? Number(body.weight_attendance) / 100 : Number(body.weight_attendance);
    if (body.weight_working_hours !== undefined) weightWork = Number(body.weight_working_hours) > 1 ? Number(body.weight_working_hours) / 100 : Number(body.weight_working_hours);
    if (body.weight_task_completion !== undefined) weightTask = Number(body.weight_task_completion) > 1 ? Number(body.weight_task_completion) / 100 : Number(body.weight_task_completion);
    if (body.weight_activity !== undefined) weightAct = Number(body.weight_activity) > 1 ? Number(body.weight_activity) / 100 : Number(body.weight_activity);
    if (body.weight_punctuality !== undefined) weightPunct = Number(body.weight_punctuality) > 1 ? Number(body.weight_punctuality) / 100 : Number(body.weight_punctuality);

    const updated: SystemSettings = {
      official_start_time: body.officeStartTime || body.official_start_time || current.official_start_time,
      official_end_time: body.officeEndTime || body.official_end_time || current.official_end_time,
      grace_period_minutes: Number(body.gracePeriodMinutes ?? body.grace_period_minutes ?? current.grace_period_minutes),
      minimum_working_hours: Number(body.minimumWorkingHoursPerDay ?? body.minimum_working_hours ?? current.minimum_working_hours),
      idle_threshold_minutes: Number(body.idleThresholdMinutes ?? body.idle_threshold_minutes ?? current.idle_threshold_minutes),
      late_occurrence_threshold: Number(body.lateOccurrenceThreshold ?? body.late_occurrence_threshold ?? current.late_occurrence_threshold),
      late_penalty_percentage: Number(body.latePenaltyPercentage ?? body.late_penalty_percentage ?? current.late_penalty_percentage),
      consecutive_absence_threshold: Number(body.consecutiveAbsenceThreshold ?? body.consecutive_absence_threshold ?? current.consecutive_absence_threshold),
      weight_attendance: weightAtt,
      weight_working_hours: weightWork,
      weight_task_completion: weightTask,
      weight_activity: weightAct,
      weight_punctuality: weightPunct,
    };

    db.settings = updated;
    PerformanceService.recalculateAll();
    await db.saveSettingsToPostgres(updated);
    AuditService.log(req.user!.id, req.user!.email, 'UPDATE_SETTINGS', 'system_settings', 'global', 'Updated HR operational rules and weights');

    const s = db.settings;
    return success(res, {
      ...s,
      officeStartTime: s.official_start_time,
      officeEndTime: s.official_end_time,
      gracePeriodMinutes: s.grace_period_minutes,
      minimumWorkingHoursPerDay: s.minimum_working_hours,
      idleThresholdMinutes: s.idle_threshold_minutes,
      consecutiveAbsenceThreshold: s.consecutive_absence_threshold,
      lateOccurrenceThreshold: s.late_occurrence_threshold,
      latePenaltyPercentage: s.late_penalty_percentage,
      performanceWeights: {
        attendance: Math.round(s.weight_attendance * 100),
        workingHours: Math.round(s.weight_working_hours * 100),
        taskCompletion: Math.round(s.weight_task_completion * 100),
        activity: Math.round(s.weight_activity * 100),
        punctuality: Math.round(s.weight_punctuality * 100),
      },
    }, 'System settings updated and performance scores recalculated');
  } catch (err: any) {
    return error(res, err.message, 'SETTINGS_ERROR');
  }
});

router.get('/audit', authenticateToken, requireRole(['ADMIN', 'HR']), (req: AuthRequest, res: Response) => {
  return success(res, AuditService.getRecentLogs(100));
});

router.post('/system/reseed', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    await SeedService.seed();
    return success(res, null, 'System database successfully seeded with complete demo dataset');
  } catch (err: any) {
    return error(res, err.message, 'RESEED_ERROR', 500);
  }
});

export default router;

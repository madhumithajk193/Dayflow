import bcrypt from 'bcryptjs';
import { db, User, Employee, Department, Attendance, WorkSession, Task, LeaveRequest, Payroll, SystemSettings } from '../db/database.js';
import { PerformanceService } from './PerformanceService.js';
import { BarcodeService } from './BarcodeService.js';
import { PayrollService } from './PayrollService.js';

export class SeedService {
  static async seed() {
    if (db.users.length > 0 && db.employees.length >= 10) {
      console.log('Database already seeded with', db.employees.length, 'employees.');
      return;
    }

    console.log('Seeding Dayflow Intelligent HRMS with realistic full-scale dataset...');
    db.resetToEmpty();

    const passwordHashAdmin = await bcrypt.hash('admin123', 10);
    const passwordHashHR = await bcrypt.hash('hr123', 10);
    const passwordHashEmp = await bcrypt.hash('emp123', 10);

    // 1. Departments
    const departments: Department[] = [
      { id: 'dept_eng', name: 'Engineering', code: 'ENG', description: 'Software and Cloud Infrastructure Engineering' },
      { id: 'dept_prod', name: 'Product', code: 'PRD', description: 'Product Management and User Strategy' },
      { id: 'dept_des', name: 'Design & UX', code: 'DSN', description: 'Product Design and Design Systems' },
      { id: 'dept_hr', name: 'Human Resources', code: 'HR', description: 'Talent Acquisition, People Operations & Culture' },
      { id: 'dept_ops', name: 'Operations', code: 'OPS', description: 'Enterprise Business Operations & Logistics' },
      { id: 'dept_sales', name: 'Sales & Growth', code: 'SLS', description: 'Global Sales and Revenue Growth' },
    ];
    db.departments.push(...departments);

    // 2. Demo Employees (20+ realistic profiles)
    const rawEmployees = [
      { code: 'EMP1001', fn: 'Aarav', ln: 'Sharma', email: 'aarav.sharma@dayflow.com', dept: 'Engineering', des: 'Principal Software Architect', sal: 165000, img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 234-5671', addr: 'San Francisco, CA', join: '2022-01-15' },
      { code: 'EMP1002', fn: 'Elena', ln: 'Rostova', email: 'elena.rostova@dayflow.com', dept: 'Engineering', des: 'Senior Full Stack Lead', sal: 145000, img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 345-6782', addr: 'Seattle, WA', join: '2022-04-10' },
      { code: 'EMP1003', fn: 'Marcus', ln: 'Chen', email: 'marcus.chen@dayflow.com', dept: 'Product', des: 'Director of Product', sal: 155000, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 456-7893', addr: 'Austin, TX', join: '2021-11-01' },
      { code: 'EMP1004', fn: 'Rohan', ln: 'Verma', email: 'rohan.verma@dayflow.com', dept: 'Engineering', des: 'Backend Systems Engineer', sal: 120000, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 567-8904', addr: 'Denver, CO', join: '2023-03-20' }, // will be set to Low Activity for demo
      { code: 'EMP1005', fn: 'Priya', ln: 'Nair', email: 'priya.nair@dayflow.com', dept: 'Design & UX', des: 'Lead UI/UX Designer', sal: 125000, img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 678-9015', addr: 'New York, NY', join: '2023-01-12' }, // will be repeated late (1% penalty demo)
      { code: 'EMP1006', fn: 'Sarah', ln: 'Jenkins', email: 'sarah.jenkins@dayflow.com', dept: 'Human Resources', des: 'Senior HR Business Partner', sal: 110000, img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 789-0126', addr: 'Boston, MA', join: '2022-06-01' },
      { code: 'EMP1007', fn: 'David', ln: 'Kim', email: 'david.kim@dayflow.com', dept: 'Sales & Growth', des: 'Enterprise Account Executive', sal: 130000, img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 890-1237', addr: 'Chicago, IL', join: '2022-09-15' },
      { code: 'EMP1008', fn: 'Ananya', ln: 'Iyer', email: 'ananya.iyer@dayflow.com', dept: 'Operations', des: 'Operations Strategist', sal: 105000, img: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 901-2348', addr: 'Atlanta, GA', join: '2023-05-10' },
      { code: 'EMP1009', fn: 'Vikram', ln: 'Patel', email: 'vikram.patel@dayflow.com', dept: 'Engineering', des: 'Cloud DevOps Specialist', sal: 128000, img: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 012-3459', addr: 'Phoenix, AZ', join: '2023-02-01' }, // will have 3-day consecutive absence alert
      { code: 'EMP1010', fn: 'Chloe', ln: 'Dupont', email: 'chloe.dupont@dayflow.com', dept: 'Design & UX', des: 'Brand & Visual Designer', sal: 98000, img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 123-4560', addr: 'Portland, OR', join: '2023-07-15' },
      { code: 'EMP1011', fn: 'Lucas', ln: 'Silva', email: 'lucas.silva@dayflow.com', dept: 'Engineering', des: 'Security & QA Engineer', sal: 118000, img: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 234-5670', addr: 'San Diego, CA', join: '2023-04-05' },
      { code: 'EMP1012', fn: 'Fatima', ln: 'Al-Mansoor', email: 'fatima.mansoor@dayflow.com', dept: 'Product', des: 'Senior Technical Product Manager', sal: 140000, img: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 345-6781', addr: 'Miami, FL', join: '2022-08-20' },
      { code: 'EMP1013', fn: 'Liam', ln: 'O\'Connor', email: 'liam.oconnor@dayflow.com', dept: 'Sales & Growth', des: 'Senior Growth Representative', sal: 95000, img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 456-7892', addr: 'Dallas, TX', join: '2023-09-01' },
      { code: 'EMP1014', fn: 'Kavita', ln: 'Reddy', email: 'kavita.reddy@dayflow.com', dept: 'Operations', des: 'Procurement Specialist', sal: 92000, img: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 567-8903', addr: 'Houston, TX', join: '2023-10-10' },
      { code: 'EMP1015', fn: 'James', ln: 'Wilson', email: 'james.wilson@dayflow.com', dept: 'Engineering', des: 'Frontend React Specialist', sal: 115000, img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 678-9014', addr: 'Salt Lake City, UT', join: '2023-11-01' },
      { code: 'EMP1016', fn: 'Maya', ln: 'Lin', email: 'maya.lin@dayflow.com', dept: 'Product', des: 'Associate Product Manager', sal: 98000, img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 789-0125', addr: 'San Jose, CA', join: '2024-01-10' },
      { code: 'EMP1017', fn: 'Mateo', ln: 'Fernandez', email: 'mateo.fernandez@dayflow.com', dept: 'Engineering', des: 'Mobile Application Developer', sal: 112000, img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 890-1236', addr: 'Orlando, FL', join: '2024-02-15' },
      { code: 'EMP1018', fn: 'Zara', ln: 'Hassan', email: 'zara.hassan@dayflow.com', dept: 'Human Resources', des: 'Talent Acquisition Specialist', sal: 88000, img: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 901-2347', addr: 'Philadelphia, PA', join: '2024-03-01' },
      { code: 'EMP1019', fn: 'Tariq', ln: 'Mahmood', email: 'tariq.mahmood@dayflow.com', dept: 'Sales & Growth', des: 'Account Executive', sal: 92000, img: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 012-3458', addr: 'Raleigh, NC', join: '2024-04-12' },
      { code: 'EMP1020', fn: 'Hannah', ln: 'Schmidt', email: 'hannah.schmidt@dayflow.com', dept: 'Operations', des: 'HR Operations Coordinator', sal: 82000, img: 'https://images.unsplash.com/photo-1534751516642-a171edd2521d?w=150&auto=format&fit=crop&q=80', phone: '+1 (555) 123-4569', addr: 'Minneapolis, MN', join: '2024-05-01' },
    ];

    // Admin User & Employee
    const adminEmp: Employee = {
      id: 'emp_admin',
      employee_code: 'ADM001',
      first_name: 'System',
      last_name: 'Administrator',
      email: 'admin@dayflow.com',
      phone: '+1 (555) 000-0001',
      address: 'Dayflow Executive HQ',
      department: 'Human Resources',
      designation: 'Chief Administrator & HR Director',
      joining_date: '2020-01-01',
      salary: 220000,
      profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      created_at: new Date('2020-01-01').toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.employees.push(adminEmp);

    const adminUser: User = {
      id: 'usr_admin_1',
      email: 'admin@dayflow.com',
      password_hash: passwordHashAdmin,
      role: 'ADMIN',
      employee_id: 'emp_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(adminUser);

    // HR User
    const hrUser: User = {
      id: 'usr_hr_1',
      email: 'hr@dayflow.com',
      password_hash: passwordHashHR,
      role: 'HR',
      employee_id: 'emp_006',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.users.push(hrUser);

    // Populate Employees, Users, Payroll, QR codes
    for (let i = 0; i < rawEmployees.length; i++) {
      const e = rawEmployees[i];
      const empId = 'emp_' + String(i + 1).padStart(3, '0');

      const emp: Employee = {
        id: empId,
        employee_code: e.code,
        first_name: e.fn,
        last_name: e.ln,
        email: e.email,
        phone: e.phone,
        address: e.addr,
        department: e.dept,
        designation: e.des,
        joining_date: e.join,
        salary: e.sal,
        profile_image: e.img,
        status: 'ACTIVE',
        created_at: new Date(e.join).toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.employees.push(emp);

      // Create login user for each employee
      const user: User = {
        id: 'usr_' + empId,
        email: e.email,
        password_hash: passwordHashEmp,
        role: (i === 5 ? 'HR' : 'EMPLOYEE'),
        employee_id: empId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.users.push(user);

      // Barcode / QR Code
      await BarcodeService.generateForEmployee(empId);
    }

    // 3. Populate Past 14 Days Attendance & Work Sessions
    const now = new Date();
    const dates: string[] = [];
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      // Skip weekends (Sunday=0, Saturday=6)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        dates.push(date.toISOString().split('T')[0]);
      }
    }

    const todayStr = now.toISOString().split('T')[0];

    for (const emp of db.employees) {
      for (const dateStr of dates) {
        const isToday = dateStr === todayStr;

        // Specific scenarios for demo:
        // EMP1009 (Vikram Patel) -> 3 Consecutive Absences
        if (emp.employee_code === 'EMP1009' && dates.slice(-3).includes(dateStr)) {
          db.attendance.push({
            id: `att_${emp.id}_${dateStr}`,
            employee_id: emp.id,
            date: dateStr,
            check_in: `${dateStr}T09:00:00.000Z`,
            check_out: null,
            status: 'ABSENT',
            late_minutes: 0,
            working_minutes: 0,
            reason: 'Unexcused absence without prior leave notice',
            timestamps: new Date().toISOString(),
          });
          continue;
        }

        // EMP1005 (Priya Nair) -> Late on 4 days (Repeated Late penalty trigger)
        let isLate = false;
        let lateMins = 0;
        if (emp.employee_code === 'EMP1005' && dates.slice(-5, -1).includes(dateStr)) {
          isLate = true;
          lateMins = 35 + Math.floor(Math.random() * 20); // 35 - 55 mins late
        } else if (Math.random() < 0.1) {
          isLate = true;
          lateMins = 20 + Math.floor(Math.random() * 15);
        }

        // EMP1010 (Chloe Dupont) -> On Approved Leave for 3 days
        if (emp.employee_code === 'EMP1010' && dates.slice(-4, -1).includes(dateStr)) {
          db.attendance.push({
            id: `att_${emp.id}_${dateStr}`,
            employee_id: emp.id,
            date: dateStr,
            check_in: `${dateStr}T09:00:00.000Z`,
            check_out: `${dateStr}T18:00:00.000Z`,
            status: 'LEAVE',
            late_minutes: 0,
            working_minutes: 480,
            reason: 'Approved Annual Vacation',
            timestamps: new Date().toISOString(),
          });
          continue;
        }

        const checkInHour = isLate ? 9 : 8;
        const checkInMin = isLate ? (lateMins > 60 ? 15 : lateMins) : 45 + Math.floor(Math.random() * 15);
        const checkInTime = new Date(`${dateStr}T${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}:00Z`);

        const checkOutHour = 17 + Math.floor(Math.random() * 2);
        const checkOutMin = Math.floor(Math.random() * 59);
        const checkOutTime = new Date(`${dateStr}T${String(checkOutHour).padStart(2, '0')}:${String(checkOutMin).padStart(2, '0')}:00Z`);

        const totalMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));
        
        // EMP1004 (Rohan Verma) -> Low Activity Demo scenario (Logged in 8.5h, active 1.2h)
        let activeMinutes = Math.round(totalMinutes * 0.82);
        let idleMinutes = Math.round(totalMinutes * 0.18);
        if (emp.employee_code === 'EMP1004') {
          activeMinutes = 75; // 1.25 hours active
          idleMinutes = totalMinutes - activeMinutes;
        }

        const attStatus = isLate ? 'LATE' : 'PRESENT';

        const attId = `att_${emp.id}_${dateStr}`;
        db.attendance.push({
          id: attId,
          employee_id: emp.id,
          date: dateStr,
          check_in: checkInTime.toISOString(),
          check_out: isToday ? null : checkOutTime.toISOString(), // Keep checked in for today demo!
          status: attStatus,
          late_minutes: isLate ? lateMins : 0,
          working_minutes: isToday ? 240 : totalMinutes - 45,
          reason: isLate ? `Arrived late by ${lateMins} minutes` : null,
          timestamps: new Date().toISOString(),
        });

        // Work session
        db.work_sessions.push({
          id: `ws_${emp.id}_${dateStr}`,
          employee_id: emp.id,
          attendance_id: attId,
          start_time: checkInTime.toISOString(),
          end_time: isToday ? null : checkOutTime.toISOString(),
          active_minutes: isToday ? 180 : activeMinutes,
          idle_minutes: isToday ? (emp.employee_code === 'EMP1004' ? 180 : 30) : idleMinutes,
          break_minutes: isToday ? 0 : 45,
          total_minutes: isToday ? 210 : totalMinutes,
          status: isToday ? 'ACTIVE' : 'COMPLETED',
        });
      }
    }

    // 4. Tasks
    const sampleTasks: Array<Omit<Task, 'id' | 'created_at'>> = [
      { employee_id: 'emp_001', title: 'Complete Microservice Architecture Review', description: 'Evaluate latency benchmarks and service mesh failovers.', priority: 'HIGH', status: 'COMPLETED', due_date: '2026-08-20', completion_date: '2026-08-19T14:30:00Z' },
      { employee_id: 'emp_001', title: 'Kubernetes Cluster Zero-Trust Setup', description: 'Configure mTLS and Pod Security Standards.', priority: 'URGENT', status: 'IN_PROGRESS', due_date: '2026-08-25', completion_date: null },
      { employee_id: 'emp_002', title: 'Implement Real-time WebSocket Gateway', description: 'Build resilient message queuing for instant notifications.', priority: 'HIGH', status: 'COMPLETED', due_date: '2026-08-18', completion_date: '2026-08-18T16:00:00Z' },
      { employee_id: 'emp_002', title: 'Database Index & Query Optimization', description: 'Reduce slow query execution time under 10ms.', priority: 'MEDIUM', status: 'IN_PROGRESS', due_date: '2026-08-28', completion_date: null },
      { employee_id: 'emp_003', title: 'Q3 Product Roadmap & OKRs Finalization', description: 'Align quarterly engineering goals with client deliverables.', priority: 'URGENT', status: 'COMPLETED', due_date: '2026-08-15', completion_date: '2026-08-15T11:00:00Z' },
      { employee_id: 'emp_004', title: 'Refactor Payment Webhook Ingestion', description: 'Add idempotency keys and retry policies.', priority: 'MEDIUM', status: 'TODO', due_date: '2026-08-27', completion_date: null },
      { employee_id: 'emp_005', title: 'Design System Figma Component Library 3.0', description: 'Update color tokens, typography scales and button variants.', priority: 'HIGH', status: 'COMPLETED', due_date: '2026-08-19', completion_date: '2026-08-19T17:00:00Z' },
      { employee_id: 'emp_005', title: 'Accessibility WCAG AA Compliance Audit', description: 'Audit contrast ratios and screen reader ARIA landmarks.', priority: 'MEDIUM', status: 'OVERDUE', due_date: '2026-08-16', completion_date: null },
      { employee_id: 'emp_009', title: 'CI/CD Pipeline Security Scanning', description: 'Integrate container image vulnerability scanning in GitHub Actions.', priority: 'HIGH', status: 'OVERDUE', due_date: '2026-08-17', completion_date: null },
      { employee_id: 'emp_010', title: 'Produce Brand Guidelines Deck', description: 'Brand assets and marketing collateral guidelines.', priority: 'LOW', status: 'COMPLETED', due_date: '2026-08-14', completion_date: '2026-08-13T15:00:00Z' },
    ];

    for (let i = 0; i < sampleTasks.length; i++) {
      const t = sampleTasks[i];
      db.tasks.push({
        id: 'task_' + (i + 1),
        ...t,
        created_at: new Date(Date.now() - (10 - i) * 86400000).toISOString(),
      });
    }

    // 5. Leave Requests
    db.leave_requests.push(
      {
        id: 'leave_demo_1',
        employee_id: 'emp_010',
        leave_type: 'PAID',
        start_date: dates[dates.length - 4] || '2026-08-18',
        end_date: dates[dates.length - 2] || '2026-08-20',
        days_count: 3,
        reason: 'Annual Family Vacation',
        status: 'APPROVED',
        hr_comment: 'Approved by HR Operations team.',
        reviewed_by: 'hr@dayflow.com',
        reviewed_at: '2026-08-17T10:00:00Z',
        created_at: '2026-08-15T09:00:00Z',
      },
      {
        id: 'leave_demo_2',
        employee_id: 'emp_007',
        leave_type: 'SICK',
        start_date: '2026-08-24',
        end_date: '2026-08-25',
        days_count: 2,
        reason: 'Medical checkup and recovery',
        status: 'PENDING',
        hr_comment: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'leave_demo_3',
        employee_id: 'emp_004',
        leave_type: 'PAID',
        start_date: '2026-08-28',
        end_date: '2026-08-29',
        days_count: 2,
        reason: 'Personal conference attendance',
        status: 'PENDING',
        hr_comment: null,
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      }
    );

    // 6. Calculate Performance for all Employees
    for (const emp of db.employees) {
      PerformanceService.calculateForEmployee(emp.id);
    }

    // 7. Seed Complete Payroll Records for all Employees (August and July)
    for (const emp of db.employees) {
      // August (Current)
      PayrollService.generateOrGetForEmployee(emp.id, 'August', 2026);
      
      // July (Previous)
      const monthlyBasic = Math.round(emp.salary / 12);
      const julyBreakdown = PayrollService.calculateBreakdown({ basic_salary: monthlyBasic });
      db.payroll.push({
        id: `pay_${emp.id}_2026_july`,
        employee_id: emp.id,
        ...julyBreakdown,
        pay_period: 'July 2026',
        month: 'July',
        year: 2026,
        status: 'PAID',
        disbursement_date: '2026-07-01',
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      });
    }

    // 8. Seed Notifications (HR Operational alerts)
    db.notifications = [
      {
        id: 'notif_demo_leave_1',
        employee_id: 'emp_007',
        title: 'New Leave Request',
        message: 'EMP007 - Elena Rostova submitted a 2-day SICK leave request (2026-08-25 to 2026-08-26). Status: PENDING',
        type: 'leave',
        reference_type: 'LEAVE',
        reference_id: 'leave_demo_1',
        read: false,
        is_read: false,
        is_done: false,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'notif_demo_leave_2',
        employee_id: 'emp_008',
        title: 'New Leave Request',
        message: 'EMP008 - Liam Davies submitted a 3-day PAID leave request (2026-08-26 to 2026-08-28). Status: PENDING',
        type: 'leave',
        reference_type: 'LEAVE',
        reference_id: 'leave_demo_2',
        read: false,
        is_read: false,
        is_done: false,
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'notif_demo_late_1',
        employee_id: 'emp_003',
        title: 'Late Attendance Detected',
        message: 'EMP003 - Marcus Vance checked in 32 minutes late (09:32 AM).',
        type: 'late',
        reference_type: 'ATTENDANCE',
        reference_id: 'att_demo_late_1',
        read: false,
        is_read: false,
        is_done: false,
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        id: 'notif_system_welcome',
        employee_id: 'emp_001',
        title: 'Dayflow HRMS Notification Center Active',
        message: 'Intelligent Notification Center initialized. Real-time alerts for Leave requests, Late check-ins, and 3-day absence flags are active.',
        type: 'system',
        reference_type: 'SYSTEM',
        reference_id: 'sys_init',
        read: true,
        is_read: true,
        is_done: true,
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
        read_at: new Date(Date.now() - 3600000 * 23).toISOString(),
        done_at: new Date(Date.now() - 3600000 * 23).toISOString(),
      },
    ];

    db.save();
    console.log('Dayflow Intelligent HRMS database successfully initialized!');
  }
}

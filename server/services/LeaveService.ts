import { db, LeaveRequest, Attendance, Notification } from '../db/database.js';
import { AuditService } from './AuditService.js';
import { PerformanceService } from './PerformanceService.js';
import { NotificationService } from './NotificationService.js';

export class LeaveService {
  static applyLeave(employeeId: string, leaveType: 'PAID' | 'SICK' | 'UNPAID', startDate: string, endDate: string, reason: string) {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) throw new Error('End date cannot be prior to start date');

    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leave: LeaveRequest = {
      id: 'leave_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      employee_id: employeeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_count: diffDays,
      reason,
      status: 'PENDING',
      hr_comment: null,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
    };

    db.leave_requests.unshift(leave);

    // Notify HR / Admins with duplicate prevention
    NotificationService.notifyLeaveSubmitted(leave, employee);

    db.save();
    return leave;
  }

  static approveLeave(leaveId: string, hrUserId: string, hrEmail: string, hrComment = 'Approved by HR') {
    const leave = db.leave_requests.find(l => l.id === leaveId);
    if (!leave) throw new Error('Leave request not found');

    leave.status = 'APPROVED';
    leave.hr_comment = hrComment;
    leave.reviewed_by = hrEmail;
    leave.reviewed_at = new Date().toISOString();

    const employee = db.employees.find(e => e.id === leave.employee_id);

    // Update attendance records for the duration to status LEAVE
    const cur = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const existing = db.attendance.find(a => a.employee_id === leave.employee_id && a.date === dateStr);
      if (existing) {
        existing.status = 'LEAVE';
        existing.reason = `Approved Leave (${leave.leave_type}): ${leave.reason}`;
      } else {
        db.attendance.unshift({
          id: 'att_leave_' + leave.employee_id + '_' + dateStr,
          employee_id: leave.employee_id,
          date: dateStr,
          check_in: `${dateStr}T09:00:00.000Z`,
          check_out: `${dateStr}T18:00:00.000Z`,
          status: 'LEAVE',
          late_minutes: 0,
          working_minutes: 480,
          reason: `Approved Leave (${leave.leave_type}): ${leave.reason}`,
          timestamps: new Date().toISOString(),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }

    // Mark HR notification as done and send notification to employee
    if (employee) {
      NotificationService.notifyLeaveDecisionToEmployee(leave, employee, true, hrComment);
    }

    AuditService.log(hrUserId, hrEmail, 'APPROVE_LEAVE', 'leave_request', leave.id, `Approved leave for ${employee?.first_name || leave.employee_id}`);
    db.save();

    PerformanceService.calculateForEmployee(leave.employee_id);

    return leave;
  }

  static rejectLeave(leaveId: string, hrUserId: string, hrEmail: string, hrComment = 'Leave request rejected by HR') {
    const leave = db.leave_requests.find(l => l.id === leaveId);
    if (!leave) throw new Error('Leave request not found');

    leave.status = 'REJECTED';
    leave.hr_comment = hrComment;
    leave.reviewed_by = hrEmail;
    leave.reviewed_at = new Date().toISOString();

    const employee = db.employees.find(e => e.id === leave.employee_id);

    if (employee) {
      NotificationService.notifyLeaveDecisionToEmployee(leave, employee, false, hrComment);
    }

    AuditService.log(hrUserId, hrEmail, 'REJECT_LEAVE', 'leave_request', leave.id, `Rejected leave for ${employee?.first_name || leave.employee_id}`);
    db.save();
    return leave;
  }
}

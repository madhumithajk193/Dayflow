import { db, Attendance, AttendanceReview, WorkSession, Notification } from '../db/database.js';
import { PerformanceService } from './PerformanceService.js';
import { NotificationService } from './NotificationService.js';

export class AttendanceService {
  static getTodayDateStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  static checkIn(employeeId: string, customCheckInTime?: string) {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const today = this.getTodayDateStr();
    const existing = db.attendance.find(a => a.employee_id === employeeId && a.date === today);
    if (existing && !existing.check_out) {
      throw new Error('Employee already has an active check-in for today');
    }

    const checkInDate = customCheckInTime ? new Date(customCheckInTime) : new Date();
    const settings = db.settings;

    // Check office start time comparison
    const [startHour, startMin] = settings.official_start_time.split(':').map(Number);
    const officeStartTime = new Date(checkInDate);
    officeStartTime.setHours(startHour, startMin, 0, 0);

    const diffMinutes = Math.floor((checkInDate.getTime() - officeStartTime.getTime()) / (1000 * 60));
    const isLate = diffMinutes > settings.grace_period_minutes;
    const lateMinutes = isLate ? diffMinutes : 0;
    const status = isLate ? 'LATE' : 'PRESENT';

    const attendanceId = existing ? existing.id : ('att_' + employeeId + '_' + Date.now());
    const attendanceRecord: Attendance = {
      id: attendanceId,
      employee_id: employeeId,
      date: today,
      check_in: checkInDate.toISOString(),
      check_out: null,
      status,
      late_minutes: lateMinutes,
      working_minutes: 0,
      reason: isLate ? `Arrived ${lateMinutes} mins after start time (${settings.official_start_time})` : null,
      timestamps: new Date().toISOString(),
    };

    if (existing) {
      const idx = db.attendance.findIndex(a => a.id === existing.id);
      db.attendance[idx] = attendanceRecord;
    } else {
      db.attendance.unshift(attendanceRecord);
    }

    // Create WorkSession
    const sessionId = 'ws_' + employeeId + '_' + Date.now();
    const sessionRecord: WorkSession = {
      id: sessionId,
      employee_id: employeeId,
      attendance_id: attendanceId,
      start_time: checkInDate.toISOString(),
      end_time: null,
      active_minutes: 5,
      idle_minutes: 0,
      break_minutes: 0,
      total_minutes: 5,
      status: 'ACTIVE',
    };
    db.work_sessions.unshift(sessionRecord);

    // If late, create HR notification with duplicate prevention
    if (isLate) {
      NotificationService.notifyLateAttendance(attendanceRecord, employee);
    }

    db.save();

    // Recalculate performance
    PerformanceService.calculateForEmployee(employeeId);

    return { attendance: attendanceRecord, session: sessionRecord };
  }

  static checkOut(employeeId: string, customCheckOutTime?: string) {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const today = this.getTodayDateStr();
    const attendance = db.attendance.find(a => a.employee_id === employeeId && a.date === today && !a.check_out);
    if (!attendance) {
      throw new Error('No active check-in found for today to check out from');
    }

    const checkOutDate = customCheckOutTime ? new Date(customCheckOutTime) : new Date();
    const checkInDate = new Date(attendance.check_in);
    
    let totalMinutes = Math.max(1, Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60)));
    
    // Find active session
    const session = db.work_sessions.find(s => s.attendance_id === attendance.id && s.status === 'ACTIVE');
    let activeMinutes = Math.min(totalMinutes, Math.round(totalMinutes * 0.85)); // default realistic active ratio
    let idleMinutes = Math.max(0, totalMinutes - activeMinutes);
    let breakMinutes = 0;

    if (totalMinutes > 300) {
      // If > 5h, add 45m lunch break
      breakMinutes = 45;
      activeMinutes = Math.max(10, activeMinutes - breakMinutes);
    }

    if (session) {
      session.end_time = checkOutDate.toISOString();
      session.status = 'COMPLETED';
      session.total_minutes = totalMinutes;
      session.break_minutes = breakMinutes;
      session.active_minutes = activeMinutes;
      session.idle_minutes = idleMinutes;
    }

    attendance.check_out = checkOutDate.toISOString();
    attendance.working_minutes = Math.max(0, totalMinutes - breakMinutes);

    db.save();

    // Recalculate performance
    PerformanceService.calculateForEmployee(employeeId);

    return { attendance, session };
  }

  static getEmployeeAttendanceHistory(employeeId: string) {
    return db.attendance.filter(a => a.employee_id === employeeId);
  }

  static getTodayStatus(employeeId: string) {
    const today = this.getTodayDateStr();
    const record = db.attendance.find(a => a.employee_id === employeeId && a.date === today);
    const activeSession = db.work_sessions.find(
      s => s.employee_id === employeeId && s.status === 'ACTIVE'
    );
    return {
      todayDate: today,
      record: record || null,
      isCheckedIn: !!record && !record.check_out,
      isCheckedOut: !!record && !!record.check_out,
      activeSession: activeSession || null,
    };
  }

  static logAbsenceReview(params: {
    employeeId: string;
    hrId: string;
    hrEmail: string;
    reviewNote: string;
    alertId?: string;
    absentDates?: string[];
    consecutiveDays?: number;
    actionTaken?: string;
  }): AttendanceReview {
    const { employeeId, hrId, hrEmail, reviewNote, alertId, absentDates, consecutiveDays, actionTaken } = params;

    if (!reviewNote || reviewNote.trim() === '') {
      throw new Error('Review note is required.');
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error('Employee not found.');
    }

    const datesList = absentDates && absentDates.length > 0 ? absentDates : [];
    const datesStr = datesList.length > 0
      ? datesList.join(',')
      : (alertId ? alertId : 'Consecutive Absences');

    const resolvedAlertId = alertId || `alert_${employeeId}_${datesList.slice(0, 3).sort().join('_')}`;
    const now = new Date().toISOString();

    // Check if existing review exists for this alert or employee
    let review = db.attendance_reviews.find(
      r => (alertId && r.alert_id === alertId) ||
           (r.employee_id === employeeId && r.alert_id === resolvedAlertId) ||
           (r.employee_id === employeeId && datesList.some(d => r.absent_dates.includes(d)))
    );

    if (review) {
      review.review_note = reviewNote.trim();
      review.hr_id = hrId;
      review.hr_email = hrEmail;
      review.status = 'REVIEWED';
      review.action_taken = actionTaken || 'HR_NOTE_LOGGED';
      review.updated_at = now;
    } else {
      review = {
        id: 'att_rev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        alert_id: resolvedAlertId,
        employee_id: employeeId,
        hr_id: hrId,
        hr_email: hrEmail,
        review_note: reviewNote.trim(),
        absent_dates: datesStr,
        consecutive_days: consecutiveDays || 3,
        status: 'REVIEWED',
        action_taken: actionTaken || 'HR_NOTE_LOGGED',
        created_at: now,
        updated_at: now,
      };
      db.attendance_reviews.unshift(review);
    }

    // Auto-complete HR's absence alert notification and send notice to employee
    NotificationService.notifyAbsenceReviewLogged(employee, resolvedAlertId, reviewNote.trim());

    db.save();
    return review;
  }

  static getAbsenceReviews(employeeId?: string): AttendanceReview[] {
    if (employeeId) {
      return db.attendance_reviews.filter(r => r.employee_id === employeeId);
    }
    return db.attendance_reviews;
  }

  static detectThreeConsecutiveAbsences() {
    const employees = db.employees.filter(e => e.status === 'ACTIVE');
    const alerts: Array<{
      id: string;
      alert_id: string;
      employee: typeof employees[0];
      absentDates: string[];
      consecutiveDays: number;
      reviewStatus: 'REQUIRES_HR_REVIEW' | 'REVIEWED' | 'RESOLVED';
      review?: {
        id: string;
        review_note: string;
        reviewed_by: string;
        reviewed_at: string;
        status: string;
        action_taken?: string;
      } | null;
    }> = [];

    const threshold = db.settings.consecutive_absence_threshold || 3;

    for (const emp of employees) {
      // Find all records for this employee sorted by date descending
      const records = db.attendance
        .filter(a => a.employee_id === emp.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const approvedLeaves = db.leave_requests.filter(
        l => l.employee_id === emp.id && l.status === 'APPROVED'
      );

      let consecutive = 0;
      const absentDates: string[] = [];

      for (const rec of records) {
        // Exclude dates with approved leave (excused absence)
        const isApprovedLeave = rec.status === 'LEAVE' || approvedLeaves.some(
          l => rec.date >= l.start_date && rec.date <= l.end_date
        );

        if (isApprovedLeave) {
          // Approved leave breaks the consecutive unexcused absence streak
          break;
        }

        if (rec.status === 'ABSENT') {
          consecutive++;
          absentDates.push(rec.date);
          if (consecutive >= threshold) {
            break;
          }
        } else if (rec.status === 'PRESENT' || rec.status === 'LATE' || rec.status === 'HALF_DAY') {
          break;
        }
      }

      if (consecutive >= threshold) {
        const alertId = `alert_${emp.id}_${absentDates.slice(0, threshold).sort().join('_')}`;

        // Check if there is an existing review for this employee / absent dates
        const existingReview = db.attendance_reviews.find(
          r => r.employee_id === emp.id && (
            r.alert_id === alertId ||
            absentDates.some(d => r.absent_dates.includes(d))
          )
        );

        const isReviewed = !!existingReview;
        const reviewStatus = isReviewed ? (existingReview.status as any || 'REVIEWED') : 'REQUIRES_HR_REVIEW';

        alerts.push({
          id: alertId,
          alert_id: alertId,
          employee: emp,
          absentDates,
          consecutiveDays: consecutive,
          reviewStatus,
          review: existingReview ? {
            id: existingReview.id,
            review_note: existingReview.review_note,
            reviewed_by: existingReview.hr_email,
            reviewed_at: existingReview.created_at,
            status: existingReview.status,
            action_taken: existingReview.action_taken || 'HR_NOTE_LOGGED',
          } : null,
        });

        // Ensure alert notification exists only if not already reviewed
        if (!isReviewed) {
          NotificationService.notifyConsecutiveAbsence(emp, consecutive, alertId);
        }
      }
    }
    db.save();
    return alerts;
  }

  // Active QR Attendance Sessions
  private static activeQRSessions: Map<string, { sessionId: string; token: string; date: string; expiresAt: number }> = new Map();

  static async generateAttendanceQRSession(): Promise<{ sessionId: string; qrDataUrl: string; qrPayload: string; expiresAt: string }> {
    const today = this.getTodayDateStr();
    const sessionId = 'qrsess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const token = 'ATTEND_' + Buffer.from(`${sessionId}_${today}_DAYFLOW_SECURE`).toString('base64');
    const expiresAtMs = Date.now() + 1000 * 60 * 60 * 12; // Valid for 12 hours

    this.activeQRSessions.set(sessionId, {
      sessionId,
      token,
      date: today,
      expiresAt: expiresAtMs,
    });

    const qrPayload = JSON.stringify({
      protocol: 'DAYFLOW_ATTENDANCE_V1',
      sessionId,
      token,
      date: today,
      type: 'DAILY_CHECKIN',
      issuedAt: new Date().toISOString(),
    });

    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    return {
      sessionId,
      qrDataUrl,
      qrPayload,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  static validateAndRecordQRAttendance(employeeId: string, qrPayloadOrCode: string) {
    if (!employeeId) {
      throw new Error('Authenticated employee ID is required');
    }

    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) {
      throw new Error('Employee record not found');
    }

    const raw = qrPayloadOrCode.trim();
    let isValidQR = false;
    const today = this.getTodayDateStr();

    // Check if JSON payload from HR QR Generator
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.protocol === 'DAYFLOW_ATTENDANCE_V1' && parsed.date === today) {
          isValidQR = true;
        } else if (parsed.system === 'DAYFLOW_HRMS') {
          // Employee badge QR code
          if (parsed.id === employeeId || parsed.code === employee.employee_code) {
            isValidQR = true;
          }
        }
      } catch (e) {
        // Invalid JSON
      }
    } else {
      // Check if raw token, session ID, employee code or standard session format
      if (raw.startsWith('sess_') || raw.includes('ATTEND_') || raw.toUpperCase() === 'DAYFLOW_DAILY_ATTENDANCE' || raw.toUpperCase() === employee.employee_code.toUpperCase()) {
        isValidQR = true;
      }
    }

    if (!isValidQR) {
      throw new Error('Invalid attendance QR code');
    }

    // Check if attendance already marked for today
    const existing = db.attendance.find(a => a.employee_id === employeeId && a.date === today);
    if (existing && existing.check_in && !existing.check_out) {
      const checkoutRes = this.checkOut(employeeId);
      return {
        success: true,
        message: 'Attendance check-out recorded successfully via QR code',
        attendance: checkoutRes.attendance,
        session: checkoutRes.session,
      };
    }

    // Check-in employee
    const result = this.checkIn(employeeId);
    return {
      success: true,
      message: 'Attendance check-in recorded successfully via QR code',
      attendance: result.attendance,
      session: result.session,
    };
  }
}

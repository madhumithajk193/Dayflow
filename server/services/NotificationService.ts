import { db, Notification, LeaveRequest, Attendance, Task, Employee } from '../db/database.js';

export class NotificationService {
  /**
   * Creates a notification with automatic duplicate prevention
   */
  static createNotification(data: {
    title: string;
    message: string;
    type: 'leave' | 'late' | 'absence_alert' | 'low_activity' | 'performance' | 'system' | 'task' | string;
    employee_id?: string | null;
    reference_id?: string | null;
    reference_type?: 'LEAVE' | 'ATTENDANCE' | 'CONSECUTIVE_ABSENCE' | 'TASK' | 'EMPLOYEE' | string | null;
    recipient_user_id?: string | null;
    recipient_role?: 'HR' | 'ADMIN' | 'EMPLOYEE' | 'ALL' | null;
  }): Notification {
    const { title, message, type, employee_id, reference_id, reference_type, recipient_user_id } = data;

    // Prevent duplicate notifications if reference_type and reference_id match
    if (reference_type && reference_id) {
      const existing = db.notifications.find(
        n => n.reference_type === reference_type && n.reference_id === reference_id && (!employee_id || n.employee_id === employee_id)
      );
      if (existing) {
        return existing;
      }
    }

    const notif: Notification = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      recipient_user_id: recipient_user_id || null,
      user_id: recipient_user_id || null,
      employee_id: employee_id || null,
      type: type as any,
      title,
      message,
      reference_id: reference_id || null,
      reference_type: reference_type || null,
      read: false,
      is_read: false,
      is_done: false,
      created_at: new Date().toISOString(),
      read_at: null,
      done_at: null,
    };

    db.notifications.unshift(notif);
    db.save();

    return notif;
  }

  /**
   * Get notifications filtered and isolated by authenticated user's role and identity
   */
  static getNotificationsForUser(user: { id: string; role: string; employee_id?: string | null }): {
    notifications: any[];
    unreadCount: number;
  } {
    const isHrOrAdmin = user.role === 'ADMIN' || user.role === 'HR';

    let userNotifs = db.notifications;

    if (!isHrOrAdmin) {
      // STRICT EMPLOYEE ISOLATION: Only notifications for this specific employee
      userNotifs = db.notifications.filter(
        n => (user.employee_id && n.employee_id === user.employee_id) || (n.recipient_user_id && n.recipient_user_id === user.id)
      );
    } else {
      // HR/ADMIN: HR operational notifications (exclude private notifications for employees unless they are system-wide)
      userNotifs = db.notifications.filter(
        n => !n.recipient_user_id || n.recipient_user_id === user.id || n.reference_type === 'LEAVE' || n.reference_type === 'ATTENDANCE' || n.reference_type === 'CONSECUTIVE_ABSENCE' || n.type === 'absence_alert' || n.type === 'late'
      );
    }

    const enriched = userNotifs.map(n => {
      const emp = n.employee_id ? db.employees.find(e => e.id === n.employee_id) : null;
      return {
        ...n,
        is_read: Boolean(n.is_read || n.read),
        read: Boolean(n.read || n.is_read),
        is_done: Boolean(n.is_done),
        employee_code: emp?.employee_code,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : undefined,
        department: emp?.department,
        profile_image: emp?.profile_image,
      };
    });

    // Unread count: active unread and not done
    const unreadCount = enriched.filter(n => !n.is_read && !n.is_done).length;
    return { notifications: enriched, unreadCount };
  }

  /**
   * Enriches notification with employee details and calculates unread count (legacy HR helper)
   */
  static getHRNotifications(): { notifications: any[]; unreadCount: number } {
    return this.getNotificationsForUser({ id: 'hr_admin', role: 'HR' });
  }

  /**
   * Mark a single notification as read
   */
  static markAsRead(id: string, user?: { id: string; role: string; employee_id?: string | null }): Notification {
    const notif = db.notifications.find(n => n.id === id);
    if (!notif) {
      throw new Error('Notification not found');
    }

    // Role check if user provided
    if (user && user.role !== 'ADMIN' && user.role !== 'HR') {
      if (notif.employee_id && notif.employee_id !== user.employee_id && notif.recipient_user_id !== user.id) {
        throw new Error('Permission denied to access this notification');
      }
    }

    notif.is_read = true;
    notif.read = true;
    notif.read_at = notif.read_at || new Date().toISOString();
    db.save();

    return notif;
  }

  /**
   * Mark a single notification as done / completed
   */
  static markAsDone(id: string, user?: { id: string; role: string; employee_id?: string | null }): Notification {
    const notif = db.notifications.find(n => n.id === id);
    if (!notif) {
      throw new Error('Notification not found');
    }

    if (user && user.role !== 'ADMIN' && user.role !== 'HR') {
      if (notif.employee_id && notif.employee_id !== user.employee_id && notif.recipient_user_id !== user.id) {
        throw new Error('Permission denied to access this notification');
      }
    }

    notif.is_done = true;
    notif.is_read = true;
    notif.read = true;
    notif.done_at = notif.done_at || new Date().toISOString();
    if (!notif.read_at) {
      notif.read_at = notif.done_at;
    }
    db.save();

    return notif;
  }

  /**
   * Automatically marks matching pending HR notifications as done when action is completed
   */
  static markAsDoneByReference(referenceType: string, referenceId: string): void {
    const now = new Date().toISOString();
    let updated = false;
    db.notifications.forEach(n => {
      if (n.reference_type === referenceType && n.reference_id === referenceId) {
        n.is_done = true;
        n.is_read = true;
        n.read = true;
        n.done_at = n.done_at || now;
        if (!n.read_at) n.read_at = now;
        updated = true;
      }
    });
    if (updated) {
      db.save();
    }
  }

  /**
   * Mark all active notifications for user as read
   */
  static markAllAsRead(user?: { id: string; role: string; employee_id?: string | null }): void {
    const now = new Date().toISOString();
    const isHrOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

    db.notifications.forEach(n => {
      let isForThisUser = false;
      if (!user) {
        isForThisUser = true;
      } else if (isHrOrAdmin) {
        isForThisUser = !n.recipient_user_id || n.recipient_user_id === user.id || n.reference_type === 'LEAVE' || n.reference_type === 'ATTENDANCE' || n.reference_type === 'CONSECUTIVE_ABSENCE';
      } else {
        isForThisUser = (user.employee_id && n.employee_id === user.employee_id) || (n.recipient_user_id && n.recipient_user_id === user.id);
      }

      if (isForThisUser) {
        n.is_read = true;
        n.read = true;
        if (!n.read_at) n.read_at = now;
      }
    });
    db.save();
  }

  /**
   * Event Trigger: Employee submits leave request (HR Notification)
   */
  static notifyLeaveSubmitted(leave: LeaveRequest, employee: Employee): Notification {
    const datesStr = `${leave.start_date} to ${leave.end_date}`;
    return this.createNotification({
      title: 'New Leave Request',
      message: `Employee: ${employee.first_name} ${employee.last_name} (${employee.employee_code})\nType: ${leave.leave_type} Leave\nDates: ${datesStr}\nStatus: PENDING`,
      type: 'leave',
      employee_id: employee.id,
      reference_id: leave.id,
      reference_type: 'LEAVE',
    });
  }

  /**
   * Event Trigger: HR Approves or Rejects Leave (Employee Notification)
   */
  static notifyLeaveDecisionToEmployee(leave: LeaveRequest, employee: Employee, approved: boolean, remark?: string): Notification {
    // 1. Auto-complete HR's pending notification
    this.markAsDoneByReference('LEAVE', leave.id);

    // 2. Send decision notification to employee
    const title = approved ? 'Leave Request Approved' : 'Leave Request Rejected';
    const message = approved
      ? `Your ${leave.leave_type} leave request from ${leave.start_date} to ${leave.end_date} has been approved.${remark ? ` HR Note: ${remark}` : ''}`
      : `Your ${leave.leave_type} leave request from ${leave.start_date} to ${leave.end_date} was rejected.${remark ? ` HR Note: ${remark}` : ''}`;

    const notif: Notification = {
      id: `notif_leave_${approved ? 'appr' : 'rej'}_${leave.id}_${Date.now()}`,
      recipient_user_id: null,
      user_id: null,
      employee_id: employee.id,
      type: 'leave',
      title,
      message,
      reference_id: leave.id,
      reference_type: 'LEAVE',
      read: false,
      is_read: false,
      is_done: false,
      created_at: new Date().toISOString(),
      read_at: null,
      done_at: null,
    };

    db.notifications.unshift(notif);
    db.save();
    return notif;
  }

  /**
   * Event Trigger: Task Assigned to Employee
   */
  static notifyTaskAssigned(task: Task, employee: Employee): Notification {
    const notif: Notification = {
      id: `notif_task_${task.id}_${Date.now()}`,
      recipient_user_id: null,
      user_id: null,
      employee_id: employee.id,
      type: 'task',
      title: 'New Task Assigned',
      message: `You have been assigned: "${task.title}" with due date ${task.due_date}. Priority: ${task.priority}`,
      reference_id: task.id,
      reference_type: 'TASK',
      read: false,
      is_read: false,
      is_done: false,
      created_at: new Date().toISOString(),
      read_at: null,
      done_at: null,
    };

    db.notifications.unshift(notif);
    db.save();
    return notif;
  }

  /**
   * Event Trigger: Employee checks in late
   */
  static notifyLateAttendance(attendance: Attendance, employee: Employee): Notification {
    const checkInTimeStr = new Date(attendance.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return this.createNotification({
      title: 'Late Attendance Detected',
      message: `Employee: ${employee.employee_code} - ${employee.first_name} ${employee.last_name}\nCheck-in: ${checkInTimeStr}\nLate by: ${attendance.late_minutes} minutes`,
      type: 'late',
      employee_id: employee.id,
      reference_id: attendance.id,
      reference_type: 'ATTENDANCE',
    });
  }

  /**
   * Event Trigger: 3 consecutive unexcused absences detected
   */
  static notifyConsecutiveAbsence(employee: Employee, consecutiveDays: number, alertId: string): Notification {
    return this.createNotification({
      title: '3-Day Consecutive Absence Alert',
      message: `Employee: ${employee.employee_code} - ${employee.first_name} ${employee.last_name}\nConsecutive Absences: ${consecutiveDays} days without approved leave.\nAction: Attendance Management Review required.`,
      type: 'absence_alert',
      employee_id: employee.id,
      reference_id: alertId,
      reference_type: 'CONSECUTIVE_ABSENCE',
    });
  }

  /**
   * Event Trigger: HR logs review on absence alert (Auto-completes HR alert & notifies employee)
   */
  static notifyAbsenceReviewLogged(employee: Employee, alertId: string, reviewNote: string): void {
    // 1. Auto-complete HR's pending absence alert notification
    this.markAsDoneByReference('CONSECUTIVE_ABSENCE', alertId);

    // 2. Send notification to employee
    const notif: Notification = {
      id: `notif_abs_rev_${alertId}_${Date.now()}`,
      recipient_user_id: null,
      user_id: null,
      employee_id: employee.id,
      type: 'absence_alert',
      title: 'Attendance Review Update',
      message: `HR has reviewed your absence record. Note: "${reviewNote}". Please connect with People Operations if you have questions.`,
      reference_id: alertId,
      reference_type: 'CONSECUTIVE_ABSENCE',
      read: false,
      is_read: false,
      is_done: false,
      created_at: new Date().toISOString(),
      read_at: null,
      done_at: null,
    };

    db.notifications.unshift(notif);
    db.save();
  }

  /**
   * Event Trigger: Employee completes / updates task
   */
  static notifyTaskCompleted(task: Task, employee: Employee): Notification {
    return this.createNotification({
      title: 'Employee Task Update',
      message: `Employee: ${employee.employee_code} - ${employee.first_name} ${employee.last_name}\nTask: ${task.title}\nStatus: COMPLETED`,
      type: 'task',
      employee_id: employee.id,
      reference_id: task.id,
      reference_type: 'TASK',
    });
  }
}

import { db, ActivityLog, WorkSession } from '../db/database.js';

export class ActivityService {
  static recordHeartbeat(employeeId: string, activityType = 'USER_INTERACTION', details = 'User active in Dayflow portal') {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const now = new Date();
    const log: ActivityLog = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      employee_id: employeeId,
      timestamp: now.toISOString(),
      activity_type: activityType,
      details,
    };
    db.activity_logs.unshift(log);
    if (db.activity_logs.length > 2000) {
      db.activity_logs.pop();
    }

    // Find active work session for today
    const activeSession = db.work_sessions.find(
      s => s.employee_id === employeeId && s.status === 'ACTIVE'
    );

    if (activeSession) {
      // Calculate delta from last updated or session start
      const start = new Date(activeSession.start_time).getTime();
      const current = now.getTime();
      const elapsedMinutes = Math.max(1, Math.floor((current - start) / (1000 * 60)));

      // Add active minutes (default heartbeats arrive every 1-2 mins)
      // Cap addition safely
      activeSession.active_minutes = Math.min(elapsedMinutes, activeSession.active_minutes + 2);
      
      const idleMinutes = Math.max(0, elapsedMinutes - activeSession.active_minutes);
      activeSession.idle_minutes = idleMinutes;
      activeSession.total_minutes = elapsedMinutes;
    }

    db.save();
    return { success: true, log, activeSession };
  }

  static analyzeEmployeeActivity(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const sessions = db.work_sessions.filter(s => s.employee_id === employeeId);
    
    if (sessions.length === 0) {
      return {
        hasSession: false,
        status: 'OFFLINE',
        loginDurationHours: 0,
        activeHours: 0,
        idleHours: 0,
        message: 'No active or completed session for today.',
      };
    }

    const latest = sessions[0];
    const totalMinutes = latest.total_minutes || 0;
    const activeMinutes = latest.active_minutes || 0;
    const idleMinutes = latest.idle_minutes || Math.max(0, totalMinutes - activeMinutes);

    const loginHours = Math.round((totalMinutes / 60) * 10) / 10;
    const activeHours = Math.round((activeMinutes / 60) * 10) / 10;
    const idleHours = Math.round((idleMinutes / 60) * 10) / 10;

    let isLowActivity = false;
    let message = 'Activity within normal parameters.';
    let flag = 'NORMAL';

    // If session is long (> 4 hours) and active percentage is below 35% OR idle exceeds threshold
    if (loginHours >= 4 && (activeMinutes / Math.max(1, totalMinutes) < 0.35 || idleMinutes > 180)) {
      isLowActivity = true;
      flag = 'LOW_ACTIVITY';
      message = 'Low application activity detected — HR review recommended.';
    }

    return {
      hasSession: true,
      sessionId: latest.id,
      sessionStatus: latest.status,
      loginDurationHours: loginHours,
      activeHours,
      idleHours,
      totalMinutes,
      activeMinutes,
      idleMinutes,
      isLowActivity,
      flag,
      message,
    };
  }

  static getAllWorkHours() {
    const activeEmployees = db.employees.filter(e => e.status === 'ACTIVE');
    return activeEmployees.map(emp => {
      const activity = this.analyzeEmployeeActivity(emp.id);
      const perf = db.performance_records.find(p => p.employee_id === emp.id);
      const activityScore = perf ? perf.activity_score : 85;
      return {
        employee: emp,
        loginDurationHours: activity.loginDurationHours || 8.0,
        activeHours: activity.activeHours || 6.5,
        idleHours: activity.idleHours || 1.5,
        activityScore,
        activityFlag: activity.flag,
        reason: activity.message,
      };
    });
  }

  static getLowActivityEmployees() {
    const all = this.getAllWorkHours();
    return all.filter(item => item.activityFlag === 'LOW_ACTIVITY' || item.activityScore < 50 || item.idleHours >= 2.5);
  }

  static getRecentLogs(employeeId?: string, limit = 50) {
    if (employeeId) {
      return db.activity_logs.filter(l => l.employee_id === employeeId).slice(0, limit);
    }
    return db.activity_logs.slice(0, limit);
  }
}

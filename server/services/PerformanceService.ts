import { db, PerformanceRecord, PerformancePenalty } from '../db/database.js';

export class PerformanceService {
  static calculateForEmployee(employeeId: string, period = 'Current Period', autoSave = true): PerformanceRecord {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const settings = db.settings;

    // 1. Attendance Score (Percentage of present/half-day/approved leave days over expected work days)
    const attendances = db.attendance.filter(a => a.employee_id === employeeId);
    let attendanceScore = 90; // Default baseline if new
    if (attendances.length > 0) {
      const positiveDays = attendances.filter(a => ['PRESENT', 'HALF_DAY', 'LEAVE', 'LATE'].includes(a.status)).length;
      attendanceScore = Math.min(100, Math.round((positiveDays / attendances.length) * 100));
    }

    // 2. Working Hours Score (Average daily working hours vs minimum expected e.g. 8h)
    let workingHoursScore = 85;
    const completedSessions = db.work_sessions.filter(ws => ws.employee_id === employeeId);
    if (completedSessions.length > 0) {
      const avgMinutes = completedSessions.reduce((acc, s) => acc + (s.total_minutes || 0), 0) / completedSessions.length;
      const targetMinutes = (settings.minimum_working_hours || 8) * 60;
      workingHoursScore = Math.min(100, Math.round((avgMinutes / targetMinutes) * 100));
    }

    // 3. Task Completion Score
    const tasks = db.tasks.filter(t => t.employee_id === employeeId);
    let taskScore = 85;
    if (tasks.length > 0) {
      const completed = tasks.filter(t => t.status === 'COMPLETED').length;
      taskScore = Math.min(100, Math.round((completed / tasks.length) * 100));
    }

    // 4. Activity Score (Ratio of active work vs total session duration)
    let activityScore = 85;
    if (completedSessions.length > 0) {
      const totalSessionMins = completedSessions.reduce((acc, s) => acc + (s.total_minutes || 0), 0);
      const totalActiveMins = completedSessions.reduce((acc, s) => acc + (s.active_minutes || 0), 0);
      if (totalSessionMins > 0) {
        activityScore = Math.min(100, Math.round((totalActiveMins / totalSessionMins) * 100));
      }
    }

    // 5. Punctuality Score (100 - proportion of late arrivals)
    const presentRecords = attendances.filter(a => ['PRESENT', 'LATE'].includes(a.status));
    let punctualityScore = 95;
    let lateCount = 0;
    if (presentRecords.length > 0) {
      lateCount = presentRecords.filter(a => a.status === 'LATE' || a.late_minutes > (settings.grace_period_minutes || 15)).length;
      punctualityScore = Math.max(0, Math.min(100, Math.round(100 - (lateCount / presentRecords.length) * 40)));
    }

    // Penalties Calculation: Repeated late penalty rule
    let penaltyDeduction = 0;
    if (lateCount >= (settings.late_occurrence_threshold || 3)) {
      penaltyDeduction = settings.late_penalty_percentage || 1;
      
      // Check if penalty already logged
      const existingPenalty = db.performance_penalties.find(
        p => p.employee_id === employeeId && p.violation_type === 'REPEATED_LATE'
      );
      if (!existingPenalty) {
        const penaltyEntry: PerformancePenalty = {
          id: 'pen_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          employee_id: employeeId,
          old_score: 0, // will set below
          penalty: penaltyDeduction,
          new_score: 0,
          reason: `Repeated late arrival (${lateCount} occurrences exceed threshold of ${settings.late_occurrence_threshold})`,
          violation_type: 'REPEATED_LATE',
          timestamp: new Date().toISOString(),
        };
        db.performance_penalties.push(penaltyEntry);
      }
    }

    // Weighted Formula
    const rawScore =
      attendanceScore * (settings.weight_attendance || 0.2) +
      workingHoursScore * (settings.weight_working_hours || 0.2) +
      taskScore * (settings.weight_task_completion || 0.3) +
      activityScore * (settings.weight_activity || 0.15) +
      punctualityScore * (settings.weight_punctuality || 0.15);

    const overallScore = Math.max(0, Math.min(100, Math.round((rawScore - penaltyDeduction) * 10) / 10));

    // Update penalty old/new score if exists
    const pen = db.performance_penalties.find(p => p.employee_id === employeeId && p.violation_type === 'REPEATED_LATE');
    if (pen) {
      pen.old_score = Math.round(rawScore * 10) / 10;
      pen.new_score = overallScore;
    }

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'B';
    if (overallScore >= 92) grade = 'A+';
    else if (overallScore >= 85) grade = 'A';
    else if (overallScore >= 75) grade = 'B';
    else if (overallScore >= 60) grade = 'C';
    else grade = 'D';

    const record: PerformanceRecord = {
      id: 'perf_' + employeeId + '_' + Date.now(),
      employee_id: employeeId,
      period,
      attendance_score: attendanceScore,
      working_hours_score: workingHoursScore,
      task_score: taskScore,
      activity_score: activityScore,
      punctuality_score: punctualityScore,
      penalty_deduction: penaltyDeduction,
      overall_score: overallScore,
      grade,
      calculated_at: new Date().toISOString(),
    };

    // Upsert performance record
    const existingIdx = db.performance_records.findIndex(p => p.employee_id === employeeId);
    if (existingIdx >= 0) {
      db.performance_records[existingIdx] = record;
    } else {
      db.performance_records.push(record);
    }
    if (autoSave) {
      db.save();
    }

    return record;
  }

  static recalculateAll(period = 'Current Period'): PerformanceRecord[] {
    const results: PerformanceRecord[] = [];
    for (const emp of db.employees) {
      results.push(this.calculateForEmployee(emp.id, period, false));
    }
    db.save();
    return results;
  }

  static getRating(score: number): string {
    if (score >= 92) return 'Outstanding';
    if (score >= 85) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  }

  static getSummary(score: number, grade: string): string {
    if (score >= 92) {
      return 'Consistently exceeds all organizational milestones with exceptional quality, punctuality, and work deliverables.';
    }
    if (score >= 85) {
      return 'Strong operational consistency and dependable delivery across all active tasks and working hours.';
    }
    if (score >= 75) {
      return 'Steady and reliable contributions with regular attendance and consistent sprint achievements.';
    }
    if (score >= 60) {
      return 'Meets fundamental baseline requirements with identified opportunities for increased sprint throughput.';
    }
    return 'Performance is below expected targets. Immediate alignment and skill coaching recommended.';
  }

  static getCleanPerformance(employeeId: string) {
    let record = db.performance_records.find(p => p.employee_id === employeeId);
    if (!record) {
      record = this.calculateForEmployee(employeeId);
    }

    const penalties = db.performance_penalties.filter(p => p.employee_id === employeeId);
    const rating = this.getRating(record.overall_score);
    const summary = this.getSummary(record.overall_score, record.grade);

    return {
      overall_score: record.overall_score,
      grade: record.grade,
      grade_tier: record.grade,
      period: record.period || 'Current Evaluation Period',
      review_period: record.period || 'Current Evaluation Period',
      performance: {
        score: record.overall_score,
        overall_score: record.overall_score,
        rating,
        grade: record.grade,
        period: record.period || 'Current Evaluation Period',
        summary,
        calculated_at: record.calculated_at,
        attendance_score: record.attendance_score,
        working_hours_score: record.working_hours_score,
        task_score: record.task_score,
        activity_score: record.activity_score,
        punctuality_score: record.punctuality_score,
        penalty_deduction: record.penalty_deduction,
      },
      penalties,
      rating,
      summary,
    };
  }

  static getTopPerformers(filter: { timeframe?: string; department?: string } = {}) {
    // Recalculate all active employees
    const employees = db.employees.filter(e => e.status === 'ACTIVE');
    
    let list = employees.map(emp => {
      let record = db.performance_records.find(p => p.employee_id === emp.id);
      if (!record) {
        record = this.calculateForEmployee(emp.id);
      }
      return {
        employee: emp,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        name: `${emp.first_name} ${emp.last_name}`,
        department: emp.department,
        designation: emp.designation,
        profile_image: emp.profile_image,
        performance: record,
      };
    });

    if (filter.department && filter.department !== 'ALL') {
      list = list.filter(item => item.department.toLowerCase() === filter.department?.toLowerCase());
    }

    // Sort descending by overall_score
    list.sort((a, b) => b.performance.overall_score - a.performance.overall_score);

    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }
}

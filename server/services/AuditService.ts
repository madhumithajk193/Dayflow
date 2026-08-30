import { db, AuditLog } from '../db/database.js';

export class AuditService {
  static log(userId: string, userEmail: string, action: string, entity: string, entityId: string, details: string) {
    const entry: AuditLog = {
      id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: userId,
      user_email: userEmail,
      action,
      entity,
      entity_id: entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    db.audit_logs.unshift(entry);
    // Keep max 1000 logs
    if (db.audit_logs.length > 1000) {
      db.audit_logs.pop();
    }
    db.save();
    return entry;
  }

  static getRecentLogs(limit = 100) {
    return db.audit_logs.slice(0, limit);
  }
}

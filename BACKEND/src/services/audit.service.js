const crypto = require('crypto');
const { getDb } = require('../config/database');

/**
 * Service for logging persistent audit trail entries
 */
class AuditService {
  /**
   * Log an action to the audit_logs table
   * @param {Object} params
   * @param {string|number} params.userId
   * @param {string} params.username
   * @param {string} params.action
   * @param {string} params.details
   * @param {string} [params.ipAddress]
   * @param {string} [params.userAgent]
   * @param {string} [params.status='SUCCESS']
   * @param {string} [params.projectId]
   * @param {Object} [params.trx] Optional Knex transaction
   */
  static async logAction({
    userId = null,
    username = 'SYSTEM',
    action,
    details = '',
    ipAddress = null,
    userAgent = null,
    status = 'SUCCESS',
    projectId = null,
    trx = null
  }) {
    const db = trx || getDb();
    const id = crypto.randomUUID();

    try {
      await db('audit_logs').insert({
        id,
        user_id: userId ? String(userId) : null,
        username,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
        ip_address: ipAddress,
        user_agent: userAgent,
        status,
        project_id: projectId,
        created_at: new Date()
      });
      return id;
    } catch (err) {
      // Never crash the primary workflow if an audit log insert fails, but log to stderr
      console.error('[AuditService.logAction] Failed to insert audit log:', err.message);
      return null;
    }
  }

  static async logEvent(params) {
    return this.logAction({
      userId: params.actorId || params.userId,
      username: params.actorEmail || params.username || 'SYSTEM',
      action: params.action,
      details: params.details,
      ipAddress: params.ipAddress,
      status: params.status || 'SUCCESS',
      projectId: params.projectId
    });
  }
}

module.exports = AuditService;

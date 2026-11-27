const crypto = require('crypto');
const { getDb } = require('../config/database');
const EmailService = require('./email.service');
const academicScope = require('../utils/academicScope');

const OFFICE_NOTIFICATION_MAP = {
  convocation: { role: 'CONVOCATION_OFFICER', label: 'Convocation', link: '/dashboard/convocation', scoped: false },
  'smart card': { role: 'SMART_CARD_OFFICER', label: 'Smart Card', link: '/dashboard/smart-card', scoped: false },
  library: { role: 'LIBRARY_OFFICER', label: 'Library', link: '/dashboard/library', scoped: false },
  'hall warden': { role: 'HALL_WARDEN', label: 'Hall Warden', link: '/dashboard/hall-warden', scoped: false },
  usab: { role: 'USAB_OFFICER', label: 'USAB', link: '/dashboard/usab', scoped: false },
  daruso: { role: 'DARUSO_OFFICER', label: 'DARUSO', link: '/dashboard/daruso', scoped: false },
  'games coach': { role: 'GAMES_COACH', label: 'Games Coach', link: '/dashboard/games-coach', scoped: false },
  'dean of students': { role: 'DEAN_OF_STUDENTS', label: 'Dean of Students', link: '/dashboard/dean-of-students', scoped: false },
  workshop: { role: 'WORKSHOP_OFFICER', label: 'Workshop', link: '/dashboard/workshop', scoped: false },
  laboratory: { role: 'LABORATORY_OFFICER', label: 'Laboratory', link: '/dashboard/laboratory', scoped: false },
  department: { role: 'DEPARTMENT_OFFICER', label: 'Department', link: '/department/dashboard', scoped: true },
  principal: { role: 'PRINCIPAL', label: 'Principal', link: '/dashboard/principal', scoped: true },
  finance: { role: 'FINANCE_OFFICER', label: 'Finance', link: '/dashboard/finance', scoped: false },
  supervisor: { role: 'SUPERVISOR', label: 'Research Supervisor', link: '/dashboard/supervisor', scoped: true }
};

/**
 * Service for creating, dispatching, and managing student/staff notifications.
 * Fully compatible with original Spring Boot StudentNotificationController and Angular NotificationService.
 */
class NotificationService {
  static normalizeOfficeKey(office) {
    return String(office || '').replace(/[_\s]+/g, ' ').trim().toLowerCase();
  }

  /**
   * Helper to resolve student record for a user.
   * Strictly limited to STUDENT accounts so staff accounts never inherit student notifications.
   */
  static async resolveStudent(user) {
    if (!user) return null;
    if (user.role && String(user.role).toUpperCase() !== 'STUDENT') {
      return null;
    }
    const db = getDb();
    const userId = user.userId || user.id;

    if (userId) {
      const studentByUserId = await db('students').where({ user_id: String(userId) }).first();
      if (studentByUserId) return studentByUserId;
    }

    if (user.email) {
      const studentByEmail = await db('students').where({ email: user.email }).first();
      if (studentByEmail) return studentByEmail;
    }

    if (user.registrationNumber) {
      const studentByReg = await db('students')
        .whereRaw('UPPER(registration_number) = ?', [user.registrationNumber.toUpperCase()])
        .first();
      if (studentByReg) return studentByReg;
    }

    return null;
  }

  /**
   * Synchronize clearance approval/rejection updates into notifications for students.
   * Mirrors Spring Boot StudentNotificationController.syncClearanceNotifications.
   */
  static async syncClearanceNotifications(user) {
    try {
      const student = await this.resolveStudent(user);
      if (!student) return;

      const db = getDb();
      const userId = user.userId || user.id;

      // Ensure student user_id is linked if missing
      if (!student.user_id && userId) {
        await db('students').where({ id: student.id }).update({ user_id: String(userId) });
        student.user_id = String(userId);
      }

      const latestRequest = await db('clearance_requests')
        .where({ student_id: student.id })
        .orderBy('id', 'desc')
        .first();

      if (!latestRequest) return;

      const approvals = await db('department_approvals')
        .where({ clearance_request_id: latestRequest.id });

      const existing = await db('notifications')
        .where(builder => {
          if (userId) builder.where({ user_id: String(userId) });
          builder.orWhere({ student_id: String(student.id) });
        });

      for (const app of approvals) {
        if (app.status === 'APPROVED') {
          const title = `Clearance Approved - ${app.department}`;
          const exists = existing.some(n => n.title && n.title.toLowerCase() === title.toLowerCase());
          if (!exists) {
            const notifId = crypto.randomUUID();
            await db('notifications').insert({
              id: notifId,
              user_id: userId ? String(userId) : null,
              student_id: String(student.id),
              title,
              message: `Your clearance request has been approved by the ${app.department} office (${app.approved_by || 'Verified'}).`,
              type: 'APPROVAL',
              is_read: false,
              read_at: null,
              created_at: app.approval_date || new Date()
            });
            existing.push({ title });
          }
        } else if (app.status === 'REJECTED') {
          const title = `Clearance Action Required - ${app.department}`;
          const exists = existing.some(n => n.title && n.title.toLowerCase() === title.toLowerCase());
          if (!exists) {
            const notifId = crypto.randomUUID();
            await db('notifications').insert({
              id: notifId,
              user_id: userId ? String(userId) : null,
              student_id: String(student.id),
              title,
              message: `Your clearance request was rejected by ${app.department}. Reason: ${app.comments || 'Action required'}`,
              type: 'REJECTION',
              is_read: false,
              read_at: null,
              created_at: app.approval_date || new Date()
            });
            existing.push({ title });
          }
        }
      }

      if (latestRequest.status === 'COMPLETED') {
        const title = 'Clearance Complete!';
        const exists = existing.some(n => n.title && n.title.toLowerCase() === title.toLowerCase());
        if (!exists) {
          const notifId = crypto.randomUUID();
          await db('notifications').insert({
            id: notifId,
            user_id: userId ? String(userId) : null,
            student_id: String(student.id),
            title,
            message: 'Congratulations! Your clearance has been fully completed and approved by all offices.',
            type: 'CLEARANCE_UPDATE',
            is_read: false,
            read_at: null,
            created_at: new Date()
          });
          existing.push({ title });
        }
      }
    } catch (err) {
      console.warn('[NotificationService.syncClearanceNotifications] Error syncing:', err.message);
    }
  }

  /**
   * Persist a notification in MySQL
   */
  static async sendNotification({
    userId = null,
    studentId = null,
    title,
    message,
    type = 'CLEARANCE_UPDATE',
    link = null,
    projectId = null,
    trx = null
  }) {
    const db = trx || getDb();
    const id = crypto.randomUUID();

    try {
      await db('notifications').insert({
        id,
        user_id: userId ? String(userId) : null,
        student_id: studentId ? String(studentId) : null,
        title,
        message,
        type,
        is_read: false,
        read_at: null,
        link,
        project_id: projectId,
        created_at: new Date()
      });
      return id;
    } catch (err) {
      console.error('[NotificationService.sendNotification] Error creating notification:', err.message);
      return null;
    }
  }

  static async notify(params) {
    return this.sendNotification(params);
  }

  /**
   * Dispatch an office-scoped notification to the active staff officer(s) responsible
   * for approving a student's clearance at a specific stage.
   *
   * Uses student_id = null so staff notifications NEVER bleed into the student's inbox,
   * and applies college/department scope filtering for Department, Principal, and Supervisor.
   */
  static async notifyOfficePendingApproval({
    office,
    student,
    clearanceRequest = null,
    customTitle = null,
    customMessage = null,
    trx = null
  }) {
    const db = trx || getDb();
    const key = this.normalizeOfficeKey(office);
    const meta = OFFICE_NOTIFICATION_MAP[key];
    if (!meta) return [];

    try {
      const candidates = await db('users')
        .where({ role: meta.role })
        .andWhere(builder => {
          builder.where({ is_active: 1 })
            .orWhere({ is_active: true })
            .orWhereNull('is_active');
        })
        .select('id', 'role', 'college', 'department', 'email', 'full_name');

      if (!candidates || candidates.length === 0) {
        return [];
      }

      const targetCollege = String(student?.college || clearanceRequest?.college || '').trim();
      const targetDepartment = String(student?.department || clearanceRequest?.department || student?.programme || clearanceRequest?.programme || '').trim();

      let recipients = candidates;
      if (meta.scoped) {
        const [activeColleges, activeDepartments] = await Promise.all([
          db('colleges').where({ is_active: 1 }).select('code', 'name'),
          db('departments').where({ is_active: 1 }).select('code', 'name')
        ]);
        const catalogs = { activeColleges, activeDepartments };
        recipients = candidates.filter(officer =>
          academicScope.matchesUserAcademicScope(
            officer,
            { college: targetCollege, department: targetDepartment },
            catalogs
          )
        );
      }

      if (recipients.length === 0) {
        return [];
      }

      const studentName = String(student?.full_name || student?.fullName || clearanceRequest?.full_name || 'A student').trim();
      const regNo = String(student?.registration_number || student?.registrationNumber || clearanceRequest?.registration_number || '').trim();
      const programme = String(student?.programme || clearanceRequest?.programme || '').trim();
      const identityLabel = regNo ? `${studentName} (${regNo})` : studentName;
      const programmeSuffix = programme ? ` — ${programme}` : '';

      const title = customTitle || `${meta.label} Clearance Approval Required`;
      const message = customMessage || `${identityLabel}${programmeSuffix} is ready for ${meta.label} clearance review and approval.`;

      const createdIds = [];
      for (const officer of recipients) {
        const officerId = String(officer.id);
        const duplicate = await db('notifications')
          .where({ user_id: officerId, title, message })
          .andWhere(builder => {
            builder.where({ is_read: false })
              .orWhere({ is_read: 0 })
              .orWhereNull('is_read');
          })
          .first();

        if (duplicate) continue;

        const id = await this.sendNotification({
          userId: officerId,
          studentId: null,
          title,
          message,
          type: 'CLEARANCE_UPDATE',
          link: meta.link,
          trx: db
        });
        if (id) createdIds.push(id);
      }

      return createdIds;
    } catch (err) {
      console.warn(`[NotificationService.notifyOfficePendingApproval] Failed for ${office}:`, err.message);
      return [];
    }
  }

  /**
   * Dispatch office-scoped notifications to multiple offices individually.
   */
  static async notifyOfficesPendingApproval({
    offices = [],
    student,
    clearanceRequest = null,
    trx = null
  }) {
    const results = [];
    const seen = new Set();
    for (const office of offices) {
      const key = this.normalizeOfficeKey(office);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const ids = await this.notifyOfficePendingApproval({
        office,
        student,
        clearanceRequest,
        trx
      });
      results.push(...ids);
    }
    return results;
  }

  static async sendApprovalNotification(studentId, officeName, officerName, trx = null) {
    const notifId = await this.sendNotification({
      studentId,
      title: `${officeName} Clearance Approved`,
      message: `Your clearance has been approved by ${officeName} (Officer: ${officerName || 'Staff'}).`,
      type: 'APPROVAL',
      trx
    });

    if (studentId && EmailService.isConfigured()) {
      EmailService.dispatchAsync(async () => {
        const db = getDb();
        const student = await db('students').where({ id: String(studentId) }).first();
        if (student) {
          await EmailService.sendClearanceUpdateEmail(
            student,
            'APPROVED',
            officeName,
            `Approved by ${officerName || 'Clearance Officer'}.`
          );
        }
      });
    }

    return notifId;
  }

  static async sendRejectionNotification(studentId, officeName, reason, trx = null) {
    const notifId = await this.sendNotification({
      studentId,
      title: `${officeName} Clearance Rejected`,
      message: `Your clearance was rejected by ${officeName}. Reason: ${reason || 'No specific reason provided.'}`,
      type: 'REJECTION',
      trx
    });

    if (studentId && EmailService.isConfigured()) {
      EmailService.dispatchAsync(async () => {
        const db = getDb();
        const student = await db('students').where({ id: String(studentId) }).first();
        if (student) {
          await EmailService.sendClearanceUpdateEmail(
            student,
            'REJECTED',
            officeName,
            reason || 'No specific reason provided.'
          );
        }
      });
    }

    return notifId;
  }

  /**
   * List notifications for authenticated user (student or staff)
   */
  static async listNotificationsForUser(user, options = {}) {
    await this.syncClearanceNotifications(user);
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;

    let query = db('notifications')
      .where(builder => {
        if (userId) builder.where({ user_id: String(userId) });
        if (student) {
          builder.orWhere({ student_id: String(student.id) });
        }
      })
      .orderBy('created_at', 'desc');

    if (options.limit && Number.isInteger(options.limit)) {
      query = query.limit(options.limit);
    }

    const rows = await query;
    return rows.map(r => ({
      id: r.id,
      title: r.title || 'Notification',
      message: r.message || '',
      type: r.type === 'CERTIFICATE_READY' ? 'CLEARANCE_UPDATE' : (r.type || 'CLEARANCE_UPDATE'),
      read: Boolean(r.is_read),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      link: r.link || null
    }));
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCountForUser(user) {
    await this.syncClearanceNotifications(user);
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;

    const result = await db('notifications')
      .where(builder => {
        if (userId) builder.where({ user_id: String(userId) });
        if (student) {
          builder.orWhere({ student_id: String(student.id) });
        }
      })
      .andWhere(builder => {
        builder.where({ is_read: false })
          .orWhere({ is_read: 0 })
          .orWhereNull('is_read');
      })
      .count('id as count')
      .first();

    return { unreadCount: Number(result?.count || 0) };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(id, user) {
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;

    const notice = await db('notifications').where({ id }).first();
    if (!notice) return null;

    const isOwner = (userId && notice.user_id === String(userId)) ||
      (student && notice.student_id === String(student.id));

    if (!isOwner) return null;

    const now = new Date();
    await db('notifications').where({ id }).update({
      is_read: true,
      read_at: now
    });

    return {
      id: notice.id,
      title: notice.title || 'Notification',
      message: notice.message || '',
      type: notice.type === 'CERTIFICATE_READY' ? 'CLEARANCE_UPDATE' : (notice.type || 'CLEARANCE_UPDATE'),
      read: true,
      createdAt: notice.created_at ? new Date(notice.created_at).toISOString() : now.toISOString(),
      link: notice.link || null
    };
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(user) {
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;
    const now = new Date();

    const updated = await db('notifications')
      .where(builder => {
        if (userId) builder.where({ user_id: String(userId) });
        if (student) {
          builder.orWhere({ student_id: String(student.id) });
        }
      })
      .andWhere(builder => {
        builder.where({ is_read: false })
          .orWhere({ is_read: 0 })
          .orWhereNull('is_read');
      })
      .update({
        is_read: true,
        read_at: now
      });

    return { updated: Number(updated || 0), unreadCount: 0 };
  }

  /**
   * Delete a single notification
   */
  static async deleteNotification(id, user) {
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;

    const notice = await db('notifications').where({ id }).first();
    if (!notice) return false;

    const isOwner = (userId && notice.user_id === String(userId)) ||
      (student && notice.student_id === String(student.id));

    if (!isOwner) return false;

    await db('notifications').where({ id }).del();
    return true;
  }

  /**
   * Clear all notifications for user
   */
  static async clearAllNotifications(user) {
    const student = await this.resolveStudent(user);
    const db = getDb();
    const userId = user.userId || user.id;

    await db('notifications')
      .where(builder => {
        if (userId) builder.where({ user_id: String(userId) });
        if (student) {
          builder.orWhere({ student_id: String(student.id) });
        }
      })
      .del();

    return true;
  }
}

module.exports = NotificationService;

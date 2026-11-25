const crypto = require('crypto');
const { getDb } = require('../config/database');
const AuditService = require('./audit.service');
const NotificationService = require('./notification.service');

const CONTROL_NUMBER_REGEX = /^[A-Za-z0-9-]{4,40}$/;
const COLLECTION_METHODS = new Set(['Physical Collection', 'Post by DHL']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function toIsoOrNull(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function resolveProjectId(user) {
  const pid = user?.projectId || user?.project_id;
  return pid && String(pid).trim() ? String(pid).trim() : 'UDSM-MAIN';
}

function formatResponse(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.user_id || row.student_id,
    studentName: row.student_name,
    registrationNumber: row.registration_number,
    copies: Number(row.copies || 1),
    amountTzs: Number(row.amount_tzs || row.amount || 15000),
    controlNumber: row.control_number,
    status: row.status,
    rejectionReason: row.rejection_reason || null,
    submittedAt: toIsoOrNull(row.submitted_at || row.created_at),
    reviewedAt: toIsoOrNull(row.reviewed_at || row.verified_at),
    reviewedBy: row.reviewed_by || row.verified_by || null,
    collectionMethod: row.collection_method || null,
    collectionAddress: row.collection_address || null,
    postingRegion: row.posting_region || null,
    postingWard: row.posting_ward || null,
    postingPoBox: row.posting_po_box || null,
    contactPhone: row.contact_phone || null,
    contactEmail: row.contact_email || null
  };
}

class TranscriptPaymentService {
  /**
   * Ensure a linked students table row exists so FK fk_transcript_student(student_id -> students.id) always succeeds.
   */
  static async resolveOrCreateStudentRow(trx, user) {
    let student = await trx('students').where({ user_id: user.id }).first();
    if (!student && user.registrationNumber) {
      student = await trx('students')
        .whereRaw('LOWER(registration_number) = ?', [user.registrationNumber.trim().toLowerCase()])
        .first();
    }
    if (student) return student;

    const studentId = crypto.randomUUID();
    const now = new Date();
    await trx('students').insert({
      id: studentId,
      user_id: user.id,
      registration_number: user.registrationNumber,
      full_name: user.fullName || user.username || user.email,
      email: user.email || null,
      college: user.college || null,
      department: user.department || null,
      programme: user.programme || null,
      clearance_status: 'PENDING',
      is_final_year: 1,
      project_id: resolveProjectId(user),
      created_at: now,
      updated_at: now
    });
    return trx('students').where({ id: studentId }).first();
  }

  /**
   * POST /api/v1/transcript-payments
   */
  static async submit(studentUser, payload = {}, reqContext = {}) {
    if (!studentUser || studentUser.role !== 'STUDENT') {
      throw createHttpError(403, 'Only students can submit transcript payments.');
    }

    const regNo = studentUser.registrationNumber ? String(studentUser.registrationNumber).trim() : '';
    if (!regNo) {
      throw createHttpError(400, 'Student registration number is missing.');
    }

    const rawControl = payload.controlNumber ? String(payload.controlNumber).trim() : '';
    if (!rawControl || !CONTROL_NUMBER_REGEX.test(rawControl)) {
      throw createHttpError(400, 'Enter a valid payment control number');
    }

    const db = getDb();
    const projectId = resolveProjectId(studentUser);
    const controlNumber = rawControl.toUpperCase();

    return db.transaction(async (trx) => {
      // Check duplicate control number within project
      const dupControl = await trx('transcript_payment_requests')
        .where({ project_id: projectId })
        .andWhereRaw('LOWER(control_number) = ?', [controlNumber.toLowerCase()])
        .first();
      if (dupControl) {
        throw createHttpError(409, 'This control number is already linked to another transcript payment request.');
      }

      // Check existing active PENDING request for this student
      const existingPending = await trx('transcript_payment_requests')
        .where({ project_id: projectId, status: 'PENDING' })
        .andWhere((qb) => {
          qb.where({ user_id: studentUser.id }).orWhere({ active_student_id: studentUser.id });
        })
        .first();
      if (existingPending) {
        throw createHttpError(409, 'A transcript payment is already awaiting Finance verification.');
      }

      const fullUser = await trx('users').where({ id: studentUser.id }).first();
      const computedName = (studentUser.fullName || fullUser?.full_name || [
        fullUser?.first_name,
        fullUser?.middle_name,
        fullUser?.last_name
      ].filter(Boolean).join(' ')).trim();

      if (!computedName) {
        throw createHttpError(400, 'Student name is missing.');
      }

      const studentRow = await this.resolveOrCreateStudentRow(trx, studentUser);
      const id = crypto.randomUUID();
      const now = new Date();

      await trx('transcript_payment_requests').insert({
        id,
        project_id: projectId,
        student_id: studentRow.id,
        user_id: studentUser.id,
        active_student_id: studentUser.id,
        student_name: computedName,
        registration_number: regNo,
        college: studentRow.college || studentUser.college || null,
        department: studentRow.department || studentUser.department || null,
        programme: studentRow.programme || studentUser.programme || null,
        phone_number: studentRow.phone_number || fullUser?.phone_number || null,
        copies: 1,
        amount: 15000.00,
        amount_tzs: 15000,
        control_number: controlNumber,
        status: 'PENDING',
        rejection_reason: null,
        submitted_at: now,
        reviewed_at: null,
        reviewed_by: null,
        version: 0,
        created_at: now,
        updated_at: now
      });

      await AuditService.logAction({
        userId: studentUser.id,
        username: studentUser.email || studentUser.username,
        action: 'SUBMIT_TRANSCRIPT_PAYMENT',
        details: `Student ${regNo} submitted transcript payment control number ${controlNumber} (TZS 15,000)`,
        ipAddress: reqContext.ip || null,
        userAgent: reqContext.userAgent || null,
        projectId,
        trx
      });

      const created = await trx('transcript_payment_requests').where({ id }).first();
      return formatResponse(created);
    });
  }

  /**
   * GET /api/v1/transcript-payments/mine
   */
  static async getMine(studentUser) {
    const db = getDb();
    const projectId = resolveProjectId(studentUser);
    const studentRow = await db('students').where({ user_id: studentUser.id }).first();

    const rows = await db('transcript_payment_requests')
      .where({ project_id: projectId })
      .andWhere((qb) => {
        qb.where({ user_id: studentUser.id });
        if (studentRow) {
          qb.orWhere({ student_id: studentRow.id });
        }
      })
      .orderBy('submitted_at', 'asc');

    return rows.map(formatResponse);
  }

  /**
   * Helper: verify student has an APPROVED transcript payment (globally or for specific requestId)
   */
  static async hasApprovedPayment(studentUser, requestId = null) {
    if (!studentUser) return false;
    const db = getDb();
    const projectId = resolveProjectId(studentUser);
    const studentRow = await db('students').where({ user_id: studentUser.id }).first();

    let qb = db('transcript_payment_requests')
      .where({ project_id: projectId, status: 'APPROVED' })
      .andWhere((builder) => {
        builder.where({ user_id: studentUser.id });
        if (studentRow) {
          builder.orWhere({ student_id: studentRow.id });
        }
      });

    if (requestId !== null) {
      if (!String(requestId).trim()) return false;
      qb = qb.andWhere({ id: String(requestId).trim() });
    }

    const row = await qb.first();
    return Boolean(row);
  }

  /**
   * GET /api/v1/transcript-payments/finance?status=
   */
  static async getFinanceRequests(reviewer, status) {
    const db = getDb();
    const projectId = resolveProjectId(reviewer);

    let qb = db('transcript_payment_requests').where({ project_id: projectId });

    if (status && String(status).trim() && String(status).trim().toUpperCase() !== 'ALL') {
      const normalized = String(status).trim().toUpperCase();
      if (!['PENDING', 'APPROVED', 'REJECTED'].includes(normalized)) {
        throw createHttpError(400, 'Unsupported transcript payment status.');
      }
      qb = qb.andWhere({ status: normalized });
    }

    const rows = await qb.orderBy('submitted_at', 'desc');
    return rows.map(formatResponse);
  }

  /**
   * POST /api/v1/transcript-payments/:id/approve
   */
  static async approve(reviewer, id, reqContext = {}) {
    const db = getDb();
    const projectId = resolveProjectId(reviewer);

    return db.transaction(async (trx) => {
      const existing = await trx('transcript_payment_requests')
        .where({ id, project_id: projectId })
        .forUpdate()
        .first();

      if (!existing) {
        throw createHttpError(404, 'Transcript payment request not found.');
      }
      if (existing.status !== 'PENDING') {
        throw createHttpError(409, 'This transcript payment request has already been reviewed.');
      }

      const now = new Date();
      const reviewerName = reviewer.username || reviewer.email || reviewer.fullName || 'Finance Officer';

      await trx('transcript_payment_requests').where({ id }).update({
        status: 'APPROVED',
        active_student_id: null,
        reviewed_by: reviewerName,
        reviewed_at: now,
        verified_by: reviewerName,
        verified_at: now,
        rejection_reason: null,
        version: Number(existing.version || 0) + 1,
        updated_at: now
      });

      await NotificationService.sendNotification({
        userId: existing.user_id || null,
        studentId: existing.student_id,
        title: 'Transcript Payment Approved',
        message: `Your transcript payment (Control Number: ${existing.control_number}) has been verified and approved by Finance. You may now upload your required transcript documents.`,
        type: 'APPROVAL',
        projectId,
        trx
      });

      await AuditService.logAction({
        userId: reviewer.id,
        username: reviewer.email || reviewer.username,
        action: 'APPROVE_TRANSCRIPT_PAYMENT',
        details: `Approved transcript payment #${id} (${existing.control_number}) for ${existing.registration_number}`,
        ipAddress: reqContext.ip || null,
        userAgent: reqContext.userAgent || null,
        projectId,
        trx
      });

      const updated = await trx('transcript_payment_requests').where({ id }).first();
      return formatResponse(updated);
    });
  }

  /**
   * POST /api/v1/transcript-payments/:id/reject
   */
  static async reject(reviewer, id, reason, reqContext = {}) {
    const cleanReason = reason ? String(reason).trim() : '';
    if (cleanReason.length < 5 || cleanReason.length > 500) {
      throw createHttpError(400, 'Rejection reason must be between 5 and 500 characters.');
    }

    const db = getDb();
    const projectId = resolveProjectId(reviewer);

    return db.transaction(async (trx) => {
      const existing = await trx('transcript_payment_requests')
        .where({ id, project_id: projectId })
        .forUpdate()
        .first();

      if (!existing) {
        throw createHttpError(404, 'Transcript payment request not found.');
      }
      if (existing.status !== 'PENDING') {
        throw createHttpError(409, 'This transcript payment request has already been reviewed.');
      }

      const now = new Date();
      const reviewerName = reviewer.username || reviewer.email || reviewer.fullName || 'Finance Officer';

      await trx('transcript_payment_requests').where({ id }).update({
        status: 'REJECTED',
        active_student_id: null,
        reviewed_by: reviewerName,
        reviewed_at: now,
        verified_by: reviewerName,
        verified_at: now,
        rejection_reason: cleanReason,
        comments: cleanReason,
        version: Number(existing.version || 0) + 1,
        updated_at: now
      });

      await NotificationService.sendNotification({
        userId: existing.user_id || null,
        studentId: existing.student_id,
        title: 'Transcript Payment Rejected',
        message: `Your transcript payment (Control Number: ${existing.control_number}) was rejected by Finance. Reason: ${cleanReason}`,
        type: 'REJECTION',
        projectId,
        trx
      });

      await AuditService.logAction({
        userId: reviewer.id,
        username: reviewer.email || reviewer.username,
        action: 'REJECT_TRANSCRIPT_PAYMENT',
        details: `Rejected transcript payment #${id} (${existing.control_number}) for ${existing.registration_number}: ${cleanReason}`,
        ipAddress: reqContext.ip || null,
        userAgent: reqContext.userAgent || null,
        projectId,
        trx
      });

      const updated = await trx('transcript_payment_requests').where({ id }).first();
      return formatResponse(updated);
    });
  }

  /**
   * PUT /api/v1/transcript-payments/:id/collection
   * Enforces strict 3-step gating: Finance APPROVED + all 3 required transcript documents uploaded.
   */
  static async updateCollection(studentUser, id, input = {}, reqContext = {}) {
    if (!studentUser || studentUser.role !== 'STUDENT') {
      throw createHttpError(403, 'Only students can update their transcript collection preference.');
    }

    const collectionMethod = input.collectionMethod ? String(input.collectionMethod).trim() : '';
    const collectionAddress = input.collectionAddress ? String(input.collectionAddress).trim() : '';

    if (!COLLECTION_METHODS.has(collectionMethod)) {
      throw createHttpError(400, 'Collection method must be "Physical Collection" or "Post by DHL".');
    }
    if (!collectionAddress || collectionAddress.length > 1000) {
      throw createHttpError(400, 'Collection address is required and must be at most 1000 characters.');
    }
    if (input.contactEmail && String(input.contactEmail).trim() && !EMAIL_REGEX.test(String(input.contactEmail).trim())) {
      throw createHttpError(400, 'Invalid contact email format.');
    }

    const db = getDb();
    const projectId = resolveProjectId(studentUser);
    const studentRow = await db('students').where({ user_id: studentUser.id }).first();

    const existing = await db('transcript_payment_requests')
      .where({ id, project_id: projectId })
      .andWhere((qb) => {
        qb.where({ user_id: studentUser.id });
        if (studentRow) qb.orWhere({ student_id: studentRow.id });
      })
      .first();

    if (!existing) {
      throw createHttpError(404, 'Transcript payment request not found.');
    }

    if (existing.status !== 'APPROVED') {
      throw createHttpError(403, 'Finance approval is required before selecting collection.');
    }

    // Lazy require DocumentService to avoid circular dependency
    const DocumentService = require('./document.service');
    const hasDocs = await DocumentService.hasRequiredTranscriptDocuments(studentUser.id, id);
    if (!hasDocs) {
      throw createHttpError(403, 'All required transcript documents must be uploaded before selecting collection.');
    }

    const now = new Date();
    await db('transcript_payment_requests').where({ id }).update({
      collection_method: collectionMethod,
      collection_address: collectionAddress,
      posting_region: input.postingRegion ? String(input.postingRegion).trim().substring(0, 100) : null,
      posting_ward: input.postingWard ? String(input.postingWard).trim().substring(0, 100) : null,
      posting_po_box: input.postingPoBox ? String(input.postingPoBox).trim().substring(0, 100) : null,
      contact_phone: input.contactPhone ? String(input.contactPhone).trim().substring(0, 40) : null,
      contact_email: input.contactEmail ? String(input.contactEmail).trim().substring(0, 255) : null,
      version: Number(existing.version || 0) + 1,
      updated_at: now
    });

    await AuditService.logAction({
      userId: studentUser.id,
      username: studentUser.email || studentUser.username,
      action: 'UPDATE_TRANSCRIPT_COLLECTION',
      details: `Updated transcript collection for #${id} to ${collectionMethod}`,
      ipAddress: reqContext.ip || null,
      userAgent: reqContext.userAgent || null,
      projectId
    });

    const updated = await db('transcript_payment_requests').where({ id }).first();
    return formatResponse(updated);
  }
}

module.exports = TranscriptPaymentService;

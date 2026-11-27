const crypto = require('crypto');
const { getDb } = require('../config/database');
const { hashPassword } = require('../utils/password');
const { revokeAllUserSessions } = require('../utils/token');
const { ROLES } = require('../constants/roles');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const EmailService = require('./email.service');

function createHttpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Prevent regional station secretaries (DUS_SECRETARY with a regional stationCode)
 * from invoking central Main Campus DUS verification, dispatch, or personnel CRUD.
 */
function assertCentralDusAuthority(actor = {}, actionLabel = 'perform this central DUS operation') {
  const role = String(actor?.role || '').toUpperCase();
  const actorStation = actor?.stationCode ? String(actor.stationCode).trim().toUpperCase() : '';
  if (role === ROLES.DUS_SECRETARY && actorStation && actorStation !== 'UDSM-MAIN') {
    throw createHttpError(
      403,
      `Forbidden: Regional station secretaries (${actorStation}) are not authorized to ${actionLabel}.`
    );
  }
}

function toIsoOrNull(val) {
  if (!val) return null;
  const d = val instanceof Date ? val : new Date(val);
  return Number.isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function generateNineDigitCode(prefix) {
  const rand = crypto.randomInt(100000000, 1000000000);
  return `${prefix}${rand}`;
}

function mapStudentToConsignmentResponse(s) {
  return {
    id: s.id,
    registrationNumber: s.registration_number,
    fullName: s.full_name,
    email: s.email || null,
    phoneNumber: s.phone_number || null,
    programme: s.programme || null,
    college: s.college || null,
    department: s.department || null,
    award: s.award || null,
    isPostgraduate: Boolean(s.is_postgraduate),
    graduationYear: s.graduation_year || null,
    clearanceStatus: s.clearance_status || 'PENDING',
    certificateVerified: Boolean(s.certificate_verified),
    certificateVerifiedAt: toIsoOrNull(s.certificate_verified_at),
    digitalSignatureHash: s.digital_signature_hash || null,
    signedBy: s.signed_by || null,
    signedAt: toIsoOrNull(s.signed_at),
    dispatchStatus: s.dispatch_status || 'Pending Dispatch',
    dispatchedAt: toIsoOrNull(s.dispatched_at),

    // Regional / Campus Collection Station logistics fields
    stationCode: s.station_code || null,
    stationName: s.station_name || null,
    intakeStatus: s.intake_status || 'Awaiting Intake',
    stationReceivedAt: toIsoOrNull(s.station_received_at),
    stationReceivedBy: s.station_received_by || null,
    vaultLockerNumber: s.vault_locker_number || null,
    handoverCollectorType: s.handover_collector_type || null,
    handoverCollectorName: s.handover_collector_name || null,
    handoverCollectorId: s.handover_collector_id || null,
    handoverCollectorPhone: s.handover_collector_phone || null,
    handoverApprovedAt: toIsoOrNull(s.handover_approved_at),
    handoverSecretary: s.handover_secretary || null,
    handoverReceiptToken: s.handover_receipt_token || null,
    transitIssueNotes: s.transit_issue_notes || null
  };
}

function mapStationSecretaryUser(u) {
  const computedFullName = u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
  return {
    id: u.id,
    fullName: computedFullName,
    firstName: u.first_name || null,
    lastName: u.last_name || null,
    email: u.email,
    username: u.username,
    phoneNumber: u.phone_number || null,
    stationCode: u.station_code || u.college || 'UDSM-MAIN',
    stationName: u.station_name || 'UDSM Main Campus - Central DUS',
    role: u.role || ROLES.DUS_SECRETARY,
    active: Boolean(u.is_active),
    createdAt: toIsoOrNull(u.created_at),
    lastLogin: toIsoOrNull(u.last_login)
  };
}

class DusSecretaryService {
  /**
   * Look up a student by registrationNumber (case-insensitive), id, user_id, or email (case-insensitive).
   */
  static async findStudentByIdentifier(identifier) {
    if (!identifier || !String(identifier).trim()) {
      throw createHttpError(400, 'Student ID or Registration Number is required.');
    }

    const db = getDb();
    const search = String(identifier).trim();
    const lowerSearch = search.toLowerCase();

    let student = await db('students')
      .whereRaw('LOWER(registration_number) = ?', [lowerSearch])
      .first();

    if (!student) {
      student = await db('students').where({ id: search }).first();
    }

    if (!student) {
      student = await db('students').where({ user_id: search }).first();
    }

    if (!student) {
      student = await db('students')
        .whereRaw('LOWER(email) = ?', [lowerSearch])
        .first();
    }

    if (!student) {
      throw createHttpError(404, `Student record not found for: ${search}`);
    }

    return student;
  }

  /**
   * Resolve linked User ID for in-app notifications.
   */
  static async resolveStudentUserId(student) {
    if (student.user_id) return student.user_id;
    if (!student.email) return null;

    const db = getDb();
    const user = await db('users')
      .whereRaw('LOWER(email) = ?', [String(student.email).trim().toLowerCase()])
      .first();
    return user ? user.id : null;
  }

  // =========================================================================
  // WAVE 4A: MAIN CAMPUS DUS SECRETARY ENDPOINTS
  // =========================================================================

  /**
   * GET /api/v1/dus-secretary/students?query=&paginated=true&page=1&pageSize=25&section=&filterTab=
   * Supports both legacy array mode (no paginated param) and full server-side pagination
   * with authoritative SQL KPI counts across the entire students registry (all 5,316+ students).
   */
  static async getStudents(queryOrOpts) {
    const db = getDb();
    const isPaginatedObj = queryOrOpts && typeof queryOrOpts === 'object' && queryOrOpts.paginated;

    const applySearchAndFilters = (qb, query, section, filterTab) => {
      if (query && String(query).trim()) {
        const pattern = `%${String(query).trim().toLowerCase()}%`;
        qb.where(function () {
          this.whereRaw('LOWER(COALESCE(registration_number, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(full_name, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(email, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(programme, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(college, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(phone_number, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(digital_signature_hash, "")) LIKE ?', [pattern])
            .orWhereRaw('LOWER(COALESCE(station_name, "")) LIKE ?', [pattern]);
        });
      }

      const sec = String(section || '').toLowerCase();
      const tab = String(filterTab || 'ALL').toUpperCase();

      if (sec === 'verification') {
        if (tab === 'PENDING') {
          qb.andWhereRaw('COALESCE(certificate_verified, 0) = 0');
        } else if (tab === 'DISPATCHED') {
          qb.andWhere('certificate_verified', 1);
        }
      } else if (sec === 'dispatch') {
        if (tab === 'PENDING') {
          qb.andWhereRaw("COALESCE(dispatch_status, 'Pending Dispatch') NOT IN ('Dispatched', 'Collected')");
        } else if (tab === 'DISPATCHED') {
          qb.andWhereRaw("dispatch_status IN ('Dispatched', 'Collected')");
        }
      }
      return qb;
    };

    if (!isPaginatedObj) {
      const query = typeof queryOrOpts === 'string' ? queryOrOpts : queryOrOpts?.query;
      let qb = db('students');
      if (query && String(query).trim()) {
        applySearchAndFilters(qb, query, '', 'ALL');
        const rows = await qb.orderBy('created_at', 'desc').limit(200);
        return rows.map(mapStudentToConsignmentResponse);
      }
      const rows = await qb.orderBy('created_at', 'desc').limit(500);
      return rows.map(mapStudentToConsignmentResponse);
    }

    const { query, section, filterTab } = queryOrOpts;
    const pageSize = Math.min(100, Math.max(1, parseInt(queryOrOpts.pageSize, 10) || 25));
    const requestedPage = Math.max(1, parseInt(queryOrOpts.page, 10) || 1);

    // 1. Authoritative KPI summary across ALL students in database
    const [kpiRow] = await db('students').select(
      db.raw('COUNT(*) AS totalStudents'),
      db.raw('SUM(CASE WHEN certificate_verified = 1 THEN 1 ELSE 0 END) AS verifiedCount'),
      db.raw('SUM(CASE WHEN COALESCE(certificate_verified, 0) = 0 THEN 1 ELSE 0 END) AS unverifiedCount'),
      db.raw("SUM(CASE WHEN certificate_verified = 1 AND COALESCE(dispatch_status, 'Pending Dispatch') NOT IN ('Dispatched', 'Collected') THEN 1 ELSE 0 END) AS pendingDispatchCount"),
      db.raw("SUM(CASE WHEN dispatch_status = 'Dispatched' AND COALESCE(intake_status, '') NOT IN ('Received at Station', 'Collected by Student') THEN 1 ELSE 0 END) AS inTransitCount"),
      db.raw("SUM(CASE WHEN intake_status = 'Received at Station' THEN 1 ELSE 0 END) AS inVaultCount"),
      db.raw("SUM(CASE WHEN dispatch_status = 'Collected' OR intake_status = 'Collected by Student' THEN 1 ELSE 0 END) AS collectedCount")
    );

    // 2. Per-station pipeline counts across ALL students
    const stationRows = await db('students')
      .whereNotNull('station_code')
      .andWhere('station_code', '!=', '')
      .groupBy('station_code')
      .select(
        'station_code',
        db.raw('COUNT(*) AS total'),
        db.raw("SUM(CASE WHEN dispatch_status = 'Dispatched' AND COALESCE(intake_status, '') NOT IN ('Received at Station', 'Collected by Student') THEN 1 ELSE 0 END) AS inTransit"),
        db.raw("SUM(CASE WHEN intake_status = 'Received at Station' THEN 1 ELSE 0 END) AS inVault"),
        db.raw("SUM(CASE WHEN dispatch_status = 'Collected' OR intake_status = 'Collected by Student' THEN 1 ELSE 0 END) AS collected")
      );

    // 3. Filtered total & exact paginated slice
    const countQb = applySearchAndFilters(db('students'), query, section, filterTab);
    const [countRow] = await countQb.count({ total: '*' });
    const filteredTotal = Number(countRow?.total || 0);
    const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
    const safePage = Math.min(requestedPage, totalPages);
    const offset = (safePage - 1) * pageSize;

    const itemsQb = applySearchAndFilters(db('students'), query, section, filterTab);
    const rows = await itemsQb
      .orderByRaw('COALESCE(certificate_verified, 0) DESC')
      .orderBy('updated_at', 'desc')
      .orderBy('created_at', 'desc')
      .limit(pageSize)
      .offset(offset);

    return {
      items: rows.map(mapStudentToConsignmentResponse),
      total: filteredTotal,
      page: safePage,
      pageSize,
      totalPages,
      stats: {
        totalStudents: Number(kpiRow?.totalStudents || 0),
        verifiedCount: Number(kpiRow?.verifiedCount || 0),
        unverifiedCount: Number(kpiRow?.unverifiedCount || 0),
        pendingDispatchCount: Number(kpiRow?.pendingDispatchCount || 0),
        inTransitCount: Number(kpiRow?.inTransitCount || 0),
        inVaultCount: Number(kpiRow?.inVaultCount || 0),
        collectedCount: Number(kpiRow?.collectedCount || 0)
      },
      stationStats: (stationRows || []).map(r => ({
        stationCode: r.station_code,
        total: Number(r.total || 0),
        inTransit: Number(r.inTransit || 0),
        inVault: Number(r.inVault || 0),
        collected: Number(r.collected || 0)
      }))
    };
  }

  /**
   * GET /api/v1/dus-secretary/students/:studentId/documents
   * Retrieves deduplicated academic documents uploaded for pre-verification review by DUS Directorate.
   */
  static async getStudentTranscriptDocuments(studentId) {
    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();

    const candidateIds = [student.id];
    if (student.user_id && !candidateIds.includes(student.user_id)) {
      candidateIds.push(student.user_id);
    }

    const docs = await db('documents')
      .whereIn('student_id', candidateIds)
      .orderBy('upload_date', 'desc');

    const seen = new Set();
    const uniqueDocs = [];
    for (const d of docs) {
      if (!d || !d.id || seen.has(d.id)) continue;
      seen.add(d.id);
      uniqueDocs.push({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type,
        category: d.document_category || null,
        fileUrl: d.file_url,
        fileSize: d.file_size || 0,
        verified: Boolean(d.is_verified),
        verifiedBy: d.verified_by || null,
        verifiedDate: toIsoOrNull(d.verified_date),
        verificationComment: d.verification_comment || null,
        uploadDate: toIsoOrNull(d.upload_date),
        description: d.description || null
      });
    }

    return uniqueDocs;
  }

  /**
   * POST /api/v1/dus-secretary/verify-certificate
   */
  static async verifyCertificate(payload = {}, actor = {}, reqContext = {}) {
    assertCentralDusAuthority(actor, 'verify or seal education certificates');
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student ID or Registration Number is required.');
    }

    const verified = payload.verified === true || payload.verified === 'true';
    const rawHash = payload.digitalSignatureHash ? String(payload.digitalSignatureHash).trim() : '';
    const rawSignedBy = payload.signedBy ? String(payload.signedBy).trim() : '';

    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();
    const now = new Date();

    const updates = {
      certificate_verified: verified ? 1 : 0,
      certificate_verified_at: verified ? now : null,
      updated_at: now
    };

    let finalSignatureHash = student.digital_signature_hash || null;
    let finalSignedBy = student.signed_by || null;
    let finalSignedAt = student.signed_at || null;

    if (rawHash) {
      finalSignatureHash = rawHash;
      finalSignedBy = rawSignedBy || 'DUS Examination Office';
      finalSignedAt = now;
      updates.digital_signature_hash = finalSignatureHash;
      updates.signed_by = finalSignedBy;
      updates.signed_at = finalSignedAt;
    } else if (verified && (!student.digital_signature_hash || !String(student.digital_signature_hash).trim())) {
      finalSignatureHash = generateNineDigitCode('UDSM-DUS-SIG-');
      finalSignedBy = rawSignedBy || 'DUS Examination Office';
      finalSignedAt = now;
      updates.digital_signature_hash = finalSignatureHash;
      updates.signed_by = finalSignedBy;
      updates.signed_at = finalSignedAt;
    }

    await db('students').where({ id: student.id }).update(updates);

    // Keep clearance_requests synchronized
    try {
      const reqUpdates = {
        certificate_verified: updates.certificate_verified,
        certificate_verified_at: updates.certificate_verified_at,
        updated_at: now
      };
      if (finalSignatureHash) {
        reqUpdates.digital_signature_hash = finalSignatureHash;
        reqUpdates.signed_by = finalSignedBy;
        reqUpdates.signed_at = finalSignedAt;
      }
      await db('clearance_requests').where({ student_id: student.id }).update(reqUpdates);
    } catch (err) {
      console.warn(`[DusSecretaryService.verifyCertificate] Failed to sync clearance_requests for ${student.registration_number}:`, err.message);
    }

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'DUS_VERIFY_CERTIFICATE',
      details: `Certificate verification for ${student.registration_number} -> verified=${verified}, hash=${finalSignatureHash || 'N/A'}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      studentId: student.id,
      registrationNumber: student.registration_number,
      certificateVerified: verified,
      digitalSignatureHash: finalSignatureHash,
      signedBy: finalSignedBy,
      message: `Database successfully updated for student ${student.registration_number}`
    };
  }

  /**
   * POST /api/v1/dus-secretary/update-dispatch
   */
  static async updateDispatchState(payload = {}, actor = {}, reqContext = {}) {
    assertCentralDusAuthority(actor, 'update main campus consignment dispatch');
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student ID is required.');
    }

    const rawDispatchStatus = payload.dispatchStatus ? String(payload.dispatchStatus).trim() : '';
    const rawStationCode = payload.stationCode ? String(payload.stationCode).trim() : '';
    const rawStationName = payload.stationName ? String(payload.stationName).trim() : '';

    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();
    const now = new Date();

    const finalDispatchStatus = rawDispatchStatus || 'Pending Dispatch';

    // 1. Resolve destination collection station
    let targetStation = null;

    if (rawStationCode) {
      targetStation = await db('collection_stations')
        .whereRaw('LOWER(code) = ?', [rawStationCode.toLowerCase()])
        .first();
    }

    // 2. Match by stationName if not resolved by code
    if (!targetStation && rawStationName) {
      const nameQuery = rawStationName.toLowerCase();
      const allStations = await db('collection_stations');
      targetStation = allStations.find(s =>
        (s.name && s.name.toLowerCase().includes(nameQuery)) ||
        (s.code && nameQuery.includes(s.code.toLowerCase()))
      ) || null;
    }

    // 3. Auto-match by student's college/department
    if (!targetStation) {
      const college = (student.college || '').toLowerCase();
      let autoCode = null;
      if (college.includes('coict') || college.includes('informatics') || college.includes('comput')) {
        autoCode = 'COICT-HUB';
      } else if (college.includes('arusha')) {
        autoCode = 'ARUSHA-HUB';
      } else if (college.includes('mwanza')) {
        autoCode = 'MWANZA-HUB';
      } else if (college.includes('mbeya')) {
        autoCode = 'MBEYA-HUB';
      } else if (college.includes('dodoma')) {
        autoCode = 'DODOMA-HUB';
      }

      if (autoCode) {
        targetStation = await db('collection_stations')
          .whereRaw('LOWER(code) = ?', [autoCode.toLowerCase()])
          .first();
      }
    }

    // 4. Fallback default UDSM-MAIN
    if (!targetStation) {
      targetStation = await db('collection_stations')
        .whereRaw('LOWER(code) = ?', ['udsm-main'])
        .first();
    }

    let finalStationCode = student.station_code || null;
    let finalStationName = student.station_name || null;

    if (targetStation) {
      finalStationCode = targetStation.code;
      finalStationName = targetStation.name;
    } else {
      if (rawStationCode) finalStationCode = rawStationCode;
      if (rawStationName) finalStationName = rawStationName;
    }

    // Transition intake_status & dispatched_at
    let finalIntakeStatus = student.intake_status || 'Awaiting Intake';
    let finalDispatchedAt = student.dispatched_at || null;

    if (finalDispatchStatus.toLowerCase() === 'dispatched') {
      finalDispatchedAt = now;
      finalIntakeStatus = 'In-Transit';
    } else if (finalDispatchStatus.toLowerCase() === 'collected') {
      finalIntakeStatus = 'Collected by Student';
    } else if (finalDispatchStatus.toLowerCase() === 'pending dispatch') {
      finalIntakeStatus = 'Awaiting Intake';
      finalDispatchedAt = null;
    }

    await db('students').where({ id: student.id }).update({
      dispatch_status: finalDispatchStatus,
      station_code: finalStationCode,
      station_name: finalStationName,
      intake_status: finalIntakeStatus,
      dispatched_at: finalDispatchedAt,
      updated_at: now
    });

    // Synchronize with clearance_requests for this student
    try {
      const reqUpdates = {
        dispatch_status: finalDispatchStatus,
        dispatched_at: finalDispatchedAt,
        updated_at: now
      };
      if (student.certificate_verified !== null && student.certificate_verified !== undefined) {
        reqUpdates.certificate_verified = student.certificate_verified ? 1 : 0;
        reqUpdates.certificate_verified_at = student.certificate_verified_at || null;
      }
      if (student.digital_signature_hash) {
        reqUpdates.digital_signature_hash = student.digital_signature_hash;
        reqUpdates.signed_by = student.signed_by;
        reqUpdates.signed_at = student.signed_at;
      }
      await db('clearance_requests').where({ student_id: student.id }).update(reqUpdates);
    } catch (err) {
      console.warn(`[DusSecretaryService.updateDispatchState] Failed to sync clearance_requests for ${student.registration_number}:`, err.message);
    }

    // Notify student when dispatched
    if (finalDispatchStatus.toLowerCase() === 'dispatched') {
      const targetUserId = await this.resolveStudentUserId(student);
      const stationLabel = finalStationName || 'Collection Station';
      const title = `Consignment Dispatched to ${stationLabel}`;
      const msg = `Dear ${student.full_name},\n\n`
        + 'Your Degree Certificate & Academic Transcript have been physically dispatched from UDSM Main Campus DUS Directorate.\n\n'
        + `Destination Collection Station: ${stationLabel} (${finalStationCode || 'STATION'})\n`
        + 'Status: In-Transit from Main Campus\n'
        + `Dispatched At: ${toIsoOrNull(finalDispatchedAt)}\n\n`
        + 'You will receive an automatic notification once the package arrives at the station intake desk and is secured in the station vault.';

      await NotificationService.sendNotification({
        userId: targetUserId,
        studentId: student.id,
        title,
        message: msg,
        type: 'SYSTEM',
        projectId: student.project_id || actor.projectId || null
      });

      EmailService.dispatchAsync(() =>
        EmailService.sendClearanceUpdateEmail(
          student,
          'CERTIFICATE_DISPATCHED',
          'DUS Directorate Main Campus',
          msg
        )
      );
    }

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'DUS_UPDATE_DISPATCH',
      details: `Dispatch updated for ${student.registration_number}: status=${finalDispatchStatus}, station=${finalStationCode || 'N/A'}, intake=${finalIntakeStatus}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      registrationNumber: student.registration_number,
      dispatchStatus: finalDispatchStatus,
      stationCode: finalStationCode,
      stationName: finalStationName,
      intakeStatus: finalIntakeStatus,
      dispatchedAt: toIsoOrNull(finalDispatchedAt),
      message: `Consignment routed to ${finalStationName || finalStationCode || 'Collection Station'} and marked as ${finalIntakeStatus}.`
    };
  }

  /**
   * POST /api/v1/dus-secretary/notify-release
   */
  static async notifyCertificateRelease(payload = {}, actor = {}, reqContext = {}) {
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student registration number or ID is required.');
    }

    const student = await this.findStudentByIdentifier(studentId);
    const targetUserId = await this.resolveStudentUserId(student);

    const releaseType = payload.releaseType && String(payload.releaseType).trim()
      ? String(payload.releaseType).trim()
      : 'Academic Transcript & Degree Certificate';

    const instructions = payload.instructions && String(payload.instructions).trim()
      ? String(payload.instructions).trim()
      : 'Please visit the Directorate of Undergraduate Studies (DUS) Examination Office with your original Student ID / National ID.';

    const releaseDate = payload.releaseDate && String(payload.releaseDate).trim()
      ? String(payload.releaseDate).trim()
      : 'Immediate';

    const trackingNumber = payload.trackingNumber ? String(payload.trackingNumber).trim() : '';
    const customNote = payload.customNote ? String(payload.customNote).trim() : '';

    const title = `Certificate & Transcript Ready for Release (${releaseType})`;
    const lines = [
      `Dear ${student.full_name},`,
      '',
      `Your ${releaseType} has been processed and is ready for release.`,
      '',
      `Release Date: ${releaseDate}`,
      `Instructions: ${instructions}`
    ];
    if (trackingNumber) {
      lines.push(`DHL Tracking Code: ${trackingNumber}`);
    }
    if (customNote) {
      lines.push(`Note: ${customNote}`);
    }

    const fullMessage = lines.join('\n');

    await NotificationService.sendNotification({
      userId: targetUserId,
      studentId: student.id,
      title,
      message: fullMessage,
      type: 'SYSTEM',
      projectId: student.project_id || actor.projectId || null
    });

    const emailResult = await EmailService.sendClearanceUpdateEmail(
      student,
      'CERTIFICATE_RELEASE',
      'DUS Examination Office',
      fullMessage
    );

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'DUS_NOTIFY_RELEASE',
      details: `Sent certificate release notification (${releaseType}) to ${student.registration_number}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      studentName: student.full_name,
      registrationNumber: student.registration_number,
      message: 'Certificate release notification successfully dispatched.',
      emailSent: Boolean(emailResult?.sent),
      timestamp: new Date().toISOString()
    };
  }

  // =========================================================================
  // WAVE 4B: REGIONAL STATION INTAKE & HANDOVER ENDPOINTS
  // =========================================================================

  /**
   * GET /api/v1/dus-secretary/station/consignments?stationCode=&query=&status=
   * Enforces regional station isolation for non-super-privileged station secretaries.
   */
  static async getStationConsignments({ stationCode, query, status } = {}, actor = null) {
    const db = getDb();
    const allStudents = await db('students').orderBy('updated_at', 'desc');

    let effectiveStationCode = stationCode ? String(stationCode).trim() : '';

    // Security reinforcement: lock regional station secretaries to their assigned stationCode
    if (actor) {
      const role = String(actor.role || '').toUpperCase();
      const isSuperPrivileged = [
        'ADMIN',
        'ADMINISTRATOR',
        'SUPERUSER',
        'DIRECTOR_OF_UNDERGRADUATE_STUDIES'
      ].includes(role);
      const actorStation = actor.stationCode ? String(actor.stationCode).trim() : '';
      if (!isSuperPrivileged && actorStation && actorStation.toUpperCase() !== 'UDSM-MAIN') {
        effectiveStationCode = actorStation;
      }
    }

    const cleanStationCode = effectiveStationCode;
    const cleanStatus = status ? String(status).trim() : '';
    const cleanQuery = query ? String(query).trim().toLowerCase() : '';

    const filtered = allStudents.filter(s => {
      // Filter by station code if specified and not ALL
      if (cleanStationCode && cleanStationCode.toUpperCase() !== 'ALL') {
        const lowerCode = cleanStationCode.toLowerCase();
        const matchStation =
          (s.station_code && s.station_code.toLowerCase() === lowerCode) ||
          (s.college && s.college.toLowerCase().includes(lowerCode)) ||
          (s.station_name && s.station_name.toLowerCase().includes(lowerCode));
        if (!matchStation) return false;
      }

      // Filter by status if specified and not ALL
      if (cleanStatus && cleanStatus.toUpperCase() !== 'ALL') {
        const upperStatus = cleanStatus.toUpperCase();
        const disp = (s.dispatch_status || '').toLowerCase();
        const intake = (s.intake_status || '').toLowerCase();

        if (upperStatus === 'IN_TRANSIT') {
          if (disp !== 'dispatched' || intake === 'received at station' || intake === 'collected by student') {
            return false;
          }
        } else if (upperStatus === 'IN_VAULT') {
          if (intake !== 'received at station') {
            return false;
          }
        } else if (upperStatus === 'COLLECTED') {
          if (disp !== 'collected' && intake !== 'collected by student') {
            return false;
          }
        }
      }

      // Search query
      if (cleanQuery) {
        const match =
          (s.registration_number && s.registration_number.toLowerCase().includes(cleanQuery)) ||
          (s.full_name && s.full_name.toLowerCase().includes(cleanQuery)) ||
          (s.email && s.email.toLowerCase().includes(cleanQuery)) ||
          (s.station_name && s.station_name.toLowerCase().includes(cleanQuery)) ||
          (s.vault_locker_number && s.vault_locker_number.toLowerCase().includes(cleanQuery)) ||
          (s.digital_signature_hash && s.digital_signature_hash.toLowerCase().includes(cleanQuery));
        if (!match) return false;
      }

      return true;
    }).slice(0, 500);

    return filtered.map(mapStudentToConsignmentResponse);
  }

  /**
   * POST /api/v1/dus-secretary/station/intake
   */
  static async receiveStationIntake(payload = {}, actor = {}, reqContext = {}) {
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student registration number or ID is required.');
    }

    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();
    const now = new Date();

    const stationCode = payload.stationCode && String(payload.stationCode).trim()
      ? String(payload.stationCode).trim()
      : student.station_code;

    const stationName = payload.stationName && String(payload.stationName).trim()
      ? String(payload.stationName).trim()
      : student.station_name;

    const vaultLockerNumber = payload.vaultLockerNumber && String(payload.vaultLockerNumber).trim()
      ? String(payload.vaultLockerNumber).trim()
      : `VAULT-${crypto.randomInt(100, 1000)}`;

    const receivedBy = payload.receivedBy && String(payload.receivedBy).trim()
      ? String(payload.receivedBy).trim()
      : (actor.fullName || 'Station Intake Secretary');

    const packageCondition = payload.packageCondition && String(payload.packageCondition).trim()
      ? String(payload.packageCondition).trim()
      : 'Intact & Sealed';

    await db('students').where({ id: student.id }).update({
      intake_status: 'Received at Station',
      station_code: stationCode,
      station_name: stationName,
      vault_locker_number: vaultLockerNumber,
      station_received_by: receivedBy,
      station_received_at: now,
      updated_at: now
    });

    // Notify student of arrival at pickup station
    const targetUserId = await this.resolveStudentUserId(student);
    const arrivalTitle = `Certificate Arrived at Collection Station: ${stationName || 'Local Hub'}`;
    const arrivalMsg = `Dear ${student.full_name},\n\n`
      + `Your Certificate & Transcript consignment from UDSM Main Campus has safely arrived at your collection station: ${stationName || 'Campus Collection Desk'}.\n`
      + `Vault / Shelf Bin: ${vaultLockerNumber}\n`
      + `Package Condition: ${packageCondition}\n\n`
      + 'You may now present your valid Student ID or National NIDA ID at the station counter for verification and collection.';

    await NotificationService.sendNotification({
      userId: targetUserId,
      studentId: student.id,
      title: arrivalTitle,
      message: arrivalMsg,
      type: 'SYSTEM',
      projectId: student.project_id || actor.projectId || null
    });

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'STATION_RECEIVE_INTAKE',
      details: `Consignment logged into station vault for ${student.registration_number} at ${stationName || stationCode || 'Station'} (${vaultLockerNumber})`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      registrationNumber: student.registration_number,
      intakeStatus: 'Received at Station',
      vaultLockerNumber,
      stationReceivedAt: now.toISOString(),
      message: 'Consignment acknowledged and placed in station vault.'
    };
  }

  /**
   * POST /api/v1/dus-secretary/station/bulk-intake
   */
  static async bulkStationIntake(payload = {}, actor = {}, reqContext = {}) {
    const studentIds = payload.studentIds;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw createHttpError(400, 'Student IDs list cannot be empty for bulk intake.');
    }

    const stationCode = payload.stationCode ? String(payload.stationCode).trim() : '';
    const stationName = payload.stationName ? String(payload.stationName).trim() : '';
    const receivedBy = payload.receivedBy && String(payload.receivedBy).trim()
      ? String(payload.receivedBy).trim()
      : (actor.fullName || 'Station Intake Secretary');

    const db = getDb();
    let count = 0;

    for (const id of studentIds) {
      try {
        const student = await this.findStudentByIdentifier(id);
        const now = new Date();
        const updates = {
          intake_status: 'Received at Station',
          station_received_by: receivedBy,
          station_received_at: now,
          updated_at: now
        };
        if (stationCode) updates.station_code = stationCode;
        if (stationName) updates.station_name = stationName;
        if (!student.vault_locker_number || !String(student.vault_locker_number).trim()) {
          updates.vault_locker_number = `VAULT-BIN-${100 + (count % 50)}`;
        }
        await db('students').where({ id: student.id }).update(updates);
        count += 1;
      } catch (err) {
        console.warn(`[DusSecretaryService.bulkStationIntake] Skipping ID ${id}:`, err.message);
      }
    }

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'STATION_BULK_INTAKE',
      details: `Bulk station intake processed ${count} of ${studentIds.length} consignments at ${stationCode || stationName || 'Station'}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || null
    });

    return {
      success: true,
      processedCount: count,
      message: `Bulk intake successfully processed ${count} consignments into station vault.`
    };
  }

  /**
   * POST /api/v1/dus-secretary/station/approve-handover
   */
  static async approveStationHandover(payload = {}, actor = {}, reqContext = {}) {
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student ID or Registration Number is required.');
    }

    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();
    const now = new Date();

    const releaseToken = generateNineDigitCode('UDSM-RCV-PASS-');

    const handoverSecretary = payload.secretaryName && String(payload.secretaryName).trim()
      ? String(payload.secretaryName).trim()
      : (actor.fullName || 'Station DUS Secretary');

    const collectorType = payload.collectorType && String(payload.collectorType).trim()
      ? String(payload.collectorType).trim()
      : 'Student in Person';

    const collectorName = payload.collectorName && String(payload.collectorName).trim()
      ? String(payload.collectorName).trim()
      : student.full_name;

    const collectorId = payload.collectorIdNumber && String(payload.collectorIdNumber).trim()
      ? String(payload.collectorIdNumber).trim()
      : student.registration_number;

    const collectorPhone = payload.collectorPhone && String(payload.collectorPhone).trim()
      ? String(payload.collectorPhone).trim()
      : (student.phone_number || null);

    await db('students').where({ id: student.id }).update({
      dispatch_status: 'Collected',
      intake_status: 'Collected by Student',
      handover_approved_at: now,
      handover_secretary: handoverSecretary,
      handover_collector_type: collectorType,
      handover_collector_name: collectorName,
      handover_collector_id: collectorId,
      handover_collector_phone: collectorPhone,
      handover_receipt_token: releaseToken,
      updated_at: now
    });

    // Synchronize dispatch_status onto clearance_requests
    try {
      await db('clearance_requests')
        .where({ student_id: student.id })
        .update({
          dispatch_status: 'Collected',
          updated_at: now
        });
    } catch (err) {
      console.warn(`[DusSecretaryService.approveStationHandover] Failed to sync clearance_requests for ${student.registration_number}:`, err.message);
    }

    // Notify student of physical handover confirmation
    const targetUserId = await this.resolveStudentUserId(student);
    const confirmTitle = `Certificate Handover Confirmation - ${student.registration_number}`;
    const confirmMsg = `Dear ${student.full_name},\n\n`
      + 'This confirms that your official University of Dar es Salaam Degree Certificate and Academic Transcript have been handed over.\n\n'
      + `Collection Station: ${student.station_name || 'UDSM Campus Center'}\n`
      + `Collector Name: ${collectorName} (${collectorType})\n`
      + `Collector ID: ${collectorId}\n`
      + `Handover Official: ${handoverSecretary}\n`
      + `Official Clearance Pass Token: ${releaseToken}\n`
      + `Timestamp: ${now.toISOString()}\n\n`
      + 'Thank you for completing your clearance with the University of Dar es Salaam.';

    await NotificationService.sendNotification({
      userId: targetUserId,
      studentId: student.id,
      title: confirmTitle,
      message: confirmMsg,
      type: 'SYSTEM',
      projectId: student.project_id || actor.projectId || null
    });

    EmailService.dispatchAsync(() =>
      EmailService.sendClearanceUpdateEmail(
        student,
        'CERTIFICATE_COLLECTION_COMPLETE',
        'Station DUS Secretary Office',
        confirmMsg
      )
    );

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'STATION_APPROVE_HANDOVER',
      details: `Certificate handed over for ${student.registration_number} (${collectorType}: ${collectorName}) via pass token ${releaseToken}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      registrationNumber: student.registration_number,
      studentName: student.full_name,
      handoverReceiptToken: releaseToken,
      handoverApprovedAt: now.toISOString(),
      message: 'Certificate & transcript handover officially approved and recorded.'
    };
  }

  /**
   * POST /api/v1/dus-secretary/station/report-discrepancy
   */
  static async reportStationDiscrepancy(payload = {}, actor = {}, reqContext = {}) {
    const studentId = payload.studentId ? String(payload.studentId).trim() : '';
    if (!studentId) {
      throw createHttpError(400, 'Student ID is required.');
    }

    const issueType = payload.issueType ? String(payload.issueType).trim() : 'Transit Issue';
    const description = payload.description ? String(payload.description).trim() : '';
    const reportedBy = payload.reportedBy && String(payload.reportedBy).trim()
      ? String(payload.reportedBy).trim()
      : (actor.fullName || 'Station Secretary');

    const student = await this.findStudentByIdentifier(studentId);
    const db = getDb();
    const now = new Date();
    const note = `[${now.toISOString()}] Issue (${issueType}): ${description} reported by ${reportedBy}`;

    await db('students').where({ id: student.id }).update({
      transit_issue_notes: note,
      updated_at: now
    });

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'STATION_REPORT_DISCREPANCY',
      details: `Discrepancy flagged for ${student.registration_number}: ${note}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || student.project_id || null
    });

    return {
      success: true,
      registrationNumber: student.registration_number,
      transitIssueNotes: note,
      message: 'Transit issue noted and flagged for Main Campus DUS review.'
    };
  }

  // =========================================================================
  // WAVE 4C: STATION SECRETARY USER MANAGEMENT ENDPOINTS
  // =========================================================================

  /**
   * GET /api/v1/dus-secretary/station-secretaries
   */
  static async getStationSecretaries() {
    const db = getDb();
    const rows = await db('users')
      .where({ role: ROLES.DUS_SECRETARY })
      .orderBy('created_at', 'desc');
    return rows.map(mapStationSecretaryUser);
  }

  /**
   * POST /api/v1/dus-secretary/station-secretaries
   */
  static async createStationSecretary(payload = {}, actor = {}, reqContext = {}) {
    assertCentralDusAuthority(actor, 'create station secretary accounts');
    const fullName = payload.fullName ? String(payload.fullName).trim() : '';
    const email = payload.email ? String(payload.email).trim() : '';
    const phoneNumber = payload.phoneNumber !== undefined && payload.phoneNumber !== null
      ? String(payload.phoneNumber).trim()
      : null;
    const stationCode = payload.stationCode ? String(payload.stationCode).trim() : '';
    const rawPasswordInput = payload.password ? String(payload.password).trim() : '';

    if (!fullName) {
      throw createHttpError(400, 'Full name is required.');
    }
    if (!email) {
      throw createHttpError(400, 'Email address is required.');
    }
    if (!stationCode) {
      throw createHttpError(400, 'Station code is required.');
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase();

    const existingEmail = await db('users')
      .whereRaw('LOWER(email) = ?', [cleanEmail])
      .first();
    if (existingEmail) {
      throw createHttpError(409, `A user with email '${cleanEmail}' already exists.`);
    }

    const station = await db('collection_stations')
      .whereRaw('LOWER(code) = ?', [stationCode.toLowerCase()])
      .first();
    if (!station) {
      throw createHttpError(404, `Collection station not found for code: ${stationCode}`);
    }

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];

    const baseUsername = cleanEmail.includes('@') ? cleanEmail.substring(0, cleanEmail.indexOf('@')) : cleanEmail;
    let username = baseUsername;
    let suffix = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await db('users').where({ username }).first()) {
      username = `${baseUsername}${suffix}`;
      suffix += 1;
    }

    const rawPassword = rawPasswordInput || 'UDSM@Station2026';
    const hashedPassword = await hashPassword(rawPassword);
    const id = crypto.randomUUID();
    const now = new Date();

    await db('users').insert({
      id,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      email: cleanEmail,
      username,
      password: hashedPassword,
      phone_number: phoneNumber || null,
      role: ROLES.DUS_SECRETARY,
      station_code: station.code,
      station_name: station.name,
      college: station.name,
      department: 'Station Intake & Custody Counter',
      is_active: 1,
      is_email_verified: 1,
      is_locked: 0,
      project_id: actor.projectId || 'UDSM',
      created_at: now,
      updated_at: now
    });

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'CREATE_STATION_SECRETARY',
      details: `Created Station Secretary ${fullName} (${cleanEmail}) for station ${station.name} (${station.code})`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || 'UDSM'
    });

    return {
      success: true,
      id,
      fullName,
      email: cleanEmail,
      username,
      stationCode: station.code,
      stationName: station.name,
      active: true,
      message: `Station Secretary account created successfully for ${station.name}`
    };
  }

  /**
   * PUT /api/v1/dus-secretary/station-secretaries/:id
   */
  static async updateStationSecretary(id, payload = {}, actor = {}, reqContext = {}) {
    assertCentralDusAuthority(actor, 'update station secretary accounts');
    const db = getDb();
    const user = await db('users').where({ id }).first();
    if (!user) {
      throw createHttpError(404, `Station Secretary not found with ID: ${id}`);
    }

    const updates = { updated_at: new Date() };

    if (payload.fullName !== undefined && payload.fullName !== null && String(payload.fullName).trim()) {
      const cleanName = String(payload.fullName).trim();
      const parts = cleanName.split(/\s+/);
      updates.full_name = cleanName;
      updates.first_name = parts[0];
      updates.last_name = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
    }

    if (payload.phoneNumber !== undefined && payload.phoneNumber !== null) {
      updates.phone_number = String(payload.phoneNumber).trim();
    }

    if (payload.stationCode !== undefined && payload.stationCode !== null && String(payload.stationCode).trim()) {
      const code = String(payload.stationCode).trim();
      const station = await db('collection_stations')
        .whereRaw('LOWER(code) = ?', [code.toLowerCase()])
        .first();
      if (!station) {
        throw createHttpError(404, `Collection station not found for code: ${code}`);
      }
      updates.station_code = station.code;
      updates.station_name = station.name;
      updates.college = station.name;
    }

    if (payload.password !== undefined && payload.password !== null && String(payload.password).trim()) {
      updates.password = await hashPassword(String(payload.password).trim());
    }

    let shouldRevokeSessions = false;
    if (payload.active !== undefined && payload.active !== null) {
      const isActiveBool = Boolean(payload.active);
      updates.is_active = isActiveBool ? 1 : 0;
      if (!isActiveBool) {
        shouldRevokeSessions = true;
      }
    }

    await db('users').where({ id }).update(updates);

    if (shouldRevokeSessions) {
      await revokeAllUserSessions(id, 'station_secretary_deactivated');
    }

    const saved = await db('users').where({ id }).first();

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'UPDATE_STATION_SECRETARY',
      details: `Updated Station Secretary ${saved.email} -> station=${saved.station_code}, active=${Boolean(saved.is_active)}`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || saved.project_id || null
    });

    return {
      success: true,
      id: saved.id,
      fullName: saved.full_name,
      email: saved.email,
      stationCode: saved.station_code,
      stationName: saved.station_name,
      active: Boolean(saved.is_active),
      message: 'Station Secretary details updated successfully.'
    };
  }

  /**
   * DELETE /api/v1/dus-secretary/station-secretaries/:id
   */
  static async deleteStationSecretary(id, actor = {}, reqContext = {}) {
    assertCentralDusAuthority(actor, 'deactivate station secretary accounts');
    const db = getDb();
    const user = await db('users').where({ id }).first();
    if (!user) {
      throw createHttpError(404, `Station Secretary not found with ID: ${id}`);
    }

    await db('users').where({ id }).update({
      is_active: 0,
      updated_at: new Date()
    });

    await revokeAllUserSessions(id, 'station_secretary_deactivated');

    await AuditService.logAction({
      userId: actor.id,
      username: actor.email || actor.username || 'DUS_SECRETARY',
      action: 'DEACTIVATE_STATION_SECRETARY',
      details: `Deactivated Station Secretary ${user.email} (${user.station_code || 'N/A'})`,
      ipAddress: reqContext.ipAddress || null,
      userAgent: reqContext.userAgent || null,
      projectId: actor.projectId || user.project_id || null
    });

    return {
      success: true,
      message: 'Station Secretary account deactivated successfully.'
    };
  }
}

module.exports = DusSecretaryService;

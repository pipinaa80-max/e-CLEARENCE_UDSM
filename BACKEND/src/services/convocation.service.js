const crypto = require('crypto');
const { getDb } = require('../config/database');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');

class ConvocationService {
  /**
   * Submit a control number / payment receipt for Convocation.
   * Per UDSM workflow update: Convocation auto-approves immediately on submission
   * and advances the student to Parallel stage; Finance verifies the control number at final clearance.
   */
  static async submitReceipt(user, data, file = null, reqContext = {}) {
    const db = getDb();
    const studentId = data.studentId || String(user.id);

    return db.transaction(async (trx) => {
      // Look up student record
      let student = await trx('students').where({ id: studentId }).first();
      if (!student && user.registrationNumber) {
        student = await trx('students').whereRaw('LOWER(registration_number) = ?', [user.registrationNumber.toLowerCase()]).first();
      }
      if (!student) {
        student = await trx('students').where({ user_id: user.id }).first();
      }

      const now = new Date();
      const receiptNumber = data.receiptNumber?.trim() || `REC-${Date.now()}`;
      const controlNumber = data.controlNumber?.trim() || 'DIRECT-PAYMENT';
      const paymentDate = data.paymentDate?.trim() || now.toISOString().split('T')[0];

      // File metadata (supports file upload or JSON receipt payload)
      const fileName = file?.originalname || data.fileName || 'convocation-receipt.pdf';
      const fileType = file?.mimetype || data.fileType || 'application/pdf';
      const fileSize = file?.size || data.fileSize || 1024;

      const autoApprovalComment = 'Convocation was auto-approved on submission; Finance reviews the control number at final clearance.';

      // Check for existing pending receipt (update in place if present, otherwise insert)
      const existingPending = await trx('convocation_receipts')
        .where({ student_id: studentId, status: 'PENDING' })
        .first();

      let receipt;
      if (existingPending) {
        const fileUrl = file?.path ? `/uploads/convocation/${file.filename}` : (data.fileUrl || existingPending.file_url);
        await trx('convocation_receipts').where({ id: existingPending.id }).update({
          control_number: controlNumber,
          receipt_number: receiptNumber,
          payment_date: paymentDate,
          file_name: fileName,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize,
          status: 'APPROVED',
          approved_by: 'System (Control Number Submission)',
          approved_at: now,
          comments: autoApprovalComment,
          submitted_at: now
        });
        receipt = await trx('convocation_receipts').where({ id: existingPending.id }).first();
      } else {
        const receiptId = crypto.randomUUID();
        const fileUrl = file?.path ? `/uploads/convocation/${file.filename}` : (data.fileUrl || `/uploads/convocation/${receiptId}.pdf`);
        receipt = {
          id: receiptId,
          student_id: studentId,
          control_number: controlNumber,
          receipt_number: receiptNumber,
          payment_date: paymentDate,
          file_name: fileName,
          file_url: fileUrl,
          file_type: fileType,
          file_size: fileSize,
          status: 'APPROVED',
          approved_by: 'System (Control Number Submission)',
          approved_at: now,
          comments: autoApprovalComment,
          submitted_at: now
        };
        await trx('convocation_receipts').insert(receipt);
      }

      // Auto-approve Stage 1 (Convocation) on student's latest clearance request and advance to Parallel
      if (student) {
        const clearanceRequest = await trx('clearance_requests')
          .where({ student_id: student.id })
          .orderBy('submitted_at', 'desc')
          .forUpdate()
          .first();

        if (clearanceRequest) {
          await trx('department_approvals')
            .where({
              clearance_request_id: clearanceRequest.id,
              department: 'Convocation'
            })
            .update({
              status: 'APPROVED',
              approved_by: 'System (Auto-Approved on Control Number Submission)',
              approval_date: now,
              comments: controlNumber
                ? `Control number submitted; Finance review is pending: ${controlNumber}`
                : 'Control number submitted; Finance review is pending.'
            });

          const remainingRejections = await trx('department_approvals')
            .where({ clearance_request_id: clearanceRequest.id, status: 'REJECTED' })
            .first();

          if (clearanceRequest.current_stage === 'Convocation' || !remainingRejections) {
            const updates = {
              status: remainingRejections ? 'REJECTED' : 'PENDING'
            };
            if (clearanceRequest.current_stage === 'Convocation') {
              updates.current_stage = 'Parallel';
              updates.current_office = 'Parallel';
            }
            await trx('clearance_requests').where({ id: clearanceRequest.id }).update(updates);
          }
        }
      }

      await NotificationService.sendNotification({
        userId: user.id,
        studentId: student ? String(student.id) : studentId,
        title: 'Convocation Auto-Approved',
        message: `Control number (${controlNumber}) submitted. Convocation is complete automatically, and Finance will verify it at final clearance.`,
        type: 'CLEARANCE_UPDATE',
        trx
      });

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'SUBMIT_CONVOCATION_RECEIPT',
        details: `Student submitted convocation receipt #${receiptNumber} (Control: ${controlNumber}) — auto-approved for Parallel stage`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Control number submitted. Convocation is complete automatically, and Finance will review it at final clearance.',
        receipt
      };
    });
  }

  /**
   * List all pending convocation receipts for officer review
   */
  static async getPendingReceipts() {
    const db = getDb();
    const receipts = await db('convocation_receipts')
      .leftJoin('students', 'convocation_receipts.student_id', 'students.id')
      .leftJoin('users', 'convocation_receipts.student_id', 'users.id')
      .select(
        'convocation_receipts.*',
        db.raw('COALESCE(students.full_name, users.full_name) as student_name'),
        db.raw('COALESCE(students.registration_number, users.registration_number) as registration_number'),
        'students.programme',
        'students.department',
        'students.college'
      )
      .orderBy('convocation_receipts.submitted_at', 'desc');

    const pendingCount = receipts.filter(r => r.status === 'PENDING').length;
    const approvedCount = receipts.filter(r => r.status === 'APPROVED').length;
    const rejectedCount = receipts.filter(r => r.status === 'REJECTED').length;

    return {
      receipts: receipts.map(r => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name || 'N/A',
        registrationNumber: r.registration_number || 'N/A',
        programme: r.programme,
        department: r.department,
        college: r.college,
        controlNumber: r.control_number,
        receiptNumber: r.receipt_number,
        paymentDate: r.payment_date,
        fileUrl: r.file_url,
        status: r.status,
        approvedBy: r.approved_by,
        approvedAt: r.approved_at,
        comments: r.comments,
        submittedAt: r.submitted_at
      })),
      pendingCount,
      approvedCount,
      rejectedCount
    };
  }

  /**
   * Approve a convocation receipt and advance the clearance request to Parallel stage
   */
  static async approveReceipt(receiptId, officer, reqContext = {}) {
    const db = getDb();

    return db.transaction(async (trx) => {
      const receipt = await trx('convocation_receipts').where({ id: receiptId }).forUpdate().first();
      if (!receipt) {
        const err = new Error('Receipt not found');
        err.statusCode = 404;
        throw err;
      }

      if (receipt.status !== 'PENDING') {
        const err = new Error('Receipt is already processed');
        err.statusCode = 400;
        throw err;
      }

      const officerName = officer.fullName || officer.username || 'Finance Officer';

      await trx('convocation_receipts').where({ id: receiptId }).update({
        status: 'APPROVED',
        approved_by: officerName,
        approved_at: new Date()
      });

      // Find student record
      let student = await trx('students').where({ id: receipt.student_id }).first();
      if (!student) {
        student = await trx('students').where({ user_id: receipt.student_id }).first();
      }

      // Update clearance request if one exists
      let clearanceRequest = null;
      if (student) {
        clearanceRequest = await trx('clearance_requests')
          .where({ student_id: student.id })
          .orderBy('submitted_at', 'desc')
          .forUpdate()
          .first();
      }

      if (clearanceRequest) {
        // Update Convocation approval record
        await trx('department_approvals')
          .where({
            clearance_request_id: clearanceRequest.id,
            department: 'Convocation'
          })
          .update({
            status: 'APPROVED',
            approved_by: officerName,
            approval_date: new Date(),
            comments: 'Receipt verified and approved'
          });

        // Advance stage to Parallel
        await trx('clearance_requests')
          .where({ id: clearanceRequest.id })
          .update({
            current_stage: 'Parallel',
            current_office: 'Parallel',
            status: 'PENDING' // Clear any previous rejection status
          });
      }

      await NotificationService.sendApprovalNotification(
        student ? student.id : receipt.student_id,
        'Convocation',
        officerName,
        trx
      );

      await AuditService.logAction({
        userId: officer.id,
        username: officer.email || officer.username,
        action: 'APPROVE_CONVOCATION_RECEIPT',
        details: `Convocation receipt #${receiptId} approved by ${officerName}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Receipt approved successfully'
      };
    });
  }

  /**
   * Reject a convocation receipt with a mandatory reason
   */
  static async rejectReceipt(receiptId, reason, officer, reqContext = {}) {
    if (!reason || reason.trim().length < 5) {
      const err = new Error('A rejection reason of at least 5 characters is required');
      err.statusCode = 400;
      throw err;
    }

    const db = getDb();

    return db.transaction(async (trx) => {
      const receipt = await trx('convocation_receipts').where({ id: receiptId }).forUpdate().first();
      if (!receipt) {
        const err = new Error('Receipt not found');
        err.statusCode = 404;
        throw err;
      }

      if (receipt.status === 'REJECTED') {
        const err = new Error('Receipt is already rejected');
        err.statusCode = 400;
        throw err;
      }

      const officerName = officer.fullName || officer.username || 'Finance Officer';

      await trx('convocation_receipts').where({ id: receiptId }).update({
        status: 'REJECTED',
        approved_by: officerName,
        approved_at: new Date(),
        comments: reason.trim()
      });

      let student = await trx('students').where({ id: receipt.student_id }).first();
      if (!student) {
        student = await trx('students').where({ user_id: receipt.student_id }).first();
      }

      if (student) {
        const clearanceRequest = await trx('clearance_requests')
          .where({ student_id: student.id })
          .orderBy('submitted_at', 'desc')
          .forUpdate()
          .first();

        if (clearanceRequest) {
          await trx('department_approvals')
            .where({
              clearance_request_id: clearanceRequest.id,
              department: 'Convocation'
            })
            .update({
              status: 'REJECTED',
              approved_by: officerName,
              approval_date: new Date(),
              comments: reason.trim()
            });

          await trx('clearance_requests')
            .where({ id: clearanceRequest.id })
            .update({
              status: 'REJECTED',
              current_stage: 'Convocation',
              current_office: 'Convocation'
            });
        }
      }

      await NotificationService.sendRejectionNotification(
        student ? student.id : receipt.student_id,
        'Convocation',
        reason.trim(),
        trx
      );

      await AuditService.logAction({
        userId: officer.id,
        username: officer.email || officer.username,
        action: 'REJECT_CONVOCATION_RECEIPT',
        details: `Convocation receipt #${receiptId} rejected by ${officerName}: ${reason.trim()}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Receipt rejected successfully'
      };
    });
  }

  /**
   * Get receipt status for a student
   */
  static async getReceiptStatus(studentId) {
    const db = getDb();
    let student = await db('students').where({ id: studentId }).first();
    if (!student) {
      student = await db('students').where({ user_id: studentId }).first();
    }
    const targetId = student ? student.id : studentId;

    const receipt = await db('convocation_receipts')
      .where({ student_id: targetId })
      .orWhere({ student_id: studentId })
      .orderBy('submitted_at', 'desc')
      .first();

    if (!receipt) {
      return {
        hasReceipt: false,
        status: null,
        message: 'No convocation receipt on file'
      };
    }

    return {
      hasReceipt: true,
      receiptId: receipt.id,
      receiptNumber: receipt.receipt_number,
      controlNumber: receipt.control_number,
      paymentDate: receipt.payment_date,
      fileUrl: receipt.file_url,
      status: receipt.status,
      approvedBy: receipt.approved_by,
      approvedAt: receipt.approved_at,
      comments: receipt.comments,
      submittedAt: receipt.submitted_at
    };
  }
}

module.exports = ConvocationService;

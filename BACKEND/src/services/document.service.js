const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../config/database');
const env = require('../config/env');
const AuditService = require('./audit.service');
const NotificationService = require('./notification.service');
const { isPostgraduateRecord } = require('../utils/postgraduate');
const { assertOfficerAcademicScope, loadAcademicCatalogs } = require('../utils/academicScope');

const DEFAULT_CATEGORIES = [
  'Convocation Receipt',
  'Bank Pay-in Slip',
  'ID Card Copy',
  'Academic Transcript Attachment',
  'Clearance Supporting Document',
  'Diploma Certificate',
  'Undergraduate Certificate'
];

const REQUIRED_CLEARANCE_DOCUMENTS = [
  'Transcript',
  'O-Level Certificate',
  'A-Level Certificate',
  'Identity Document'
];

const TRANSCRIPT_PAYMENT_DESCRIPTION_PREFIX = 'Transcript document for payment request ';

const ALLOWED_TRANSCRIPT_DOCUMENTS = [
  'Birth Certificate',
  'O-Level Certificate',
  'A-Level Certificate',
  'Diploma Certificate',
  'Undergraduate Certificate'
];

function unlinkQuietly(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (_) {
      // Ignore cleanup errors
    }
  }
}

class DocumentService {
  /**
   * Resolve student database record by student ID, user ID, or registration number
   */
  static async resolveStudent(identifier) {
    if (!identifier) return null;

    let student = await db('students').where({ id: identifier }).first();
    if (student) return student;

    student = await db('students').where({ user_id: identifier }).first();
    if (student) return student;

    student = await db('students').where({ registration_number: identifier }).first();
    return student || null;
  }

  /**
   * Upload and register a document
   */
  static async uploadDocument({ studentId, file, description, documentCategory, requestingUser }) {
    if (!file) {
      throw Object.assign(new Error('No file provided for upload.'), { status: 400 });
    }

    const student = await this.resolveStudent(studentId || requestingUser.id);
    if (!student) {
      // Clean up uploaded file
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      throw Object.assign(new Error(`Student record not found for identifier '${studentId}'.`), { status: 404 });
    }

    // Authorization: Students may only upload for their own profile
    if (requestingUser.role === 'STUDENT') {
      if (requestingUser.id !== student.user_id && requestingUser.registrationNumber !== student.registration_number) {
        unlinkQuietly(file.path);
        throw Object.assign(new Error('Forbidden: Students can only upload documents for their own profile.'), { status: 403 });
      }
    }

    let category = documentCategory || 'Clearance Supporting Document';
    const trimmedDesc = description ? String(description).trim() : '';

    // Transcript document upload gating (scoped strictly to transcript payment requests)
    if (trimmedDesc.startsWith(TRANSCRIPT_PAYMENT_DESCRIPTION_PREFIX)) {
      const paymentId = trimmedDesc.slice(TRANSCRIPT_PAYMENT_DESCRIPTION_PREFIX.length).trim();
      if (!paymentId) {
        unlinkQuietly(file.path);
        throw Object.assign(new Error('Transcript payment request ID is required in document description.'), { status: 400 });
      }

      const canonicalCategory = ALLOWED_TRANSCRIPT_DOCUMENTS.find(
        reqCat => reqCat.toLowerCase() === String(category || '').trim().toLowerCase()
      );
      if (!canonicalCategory) {
        unlinkQuietly(file.path);
        throw Object.assign(
          new Error(`Unsupported transcript document type '${category}'. Expected one of: ${ALLOWED_TRANSCRIPT_DOCUMENTS.join(', ')}.`),
          { status: 400 }
        );
      }
      category = canonicalCategory;

      if (requestingUser.role === 'STUDENT') {
        const TranscriptPaymentService = require('./transcriptPayment.service');
        const hasApproved = await TranscriptPaymentService.hasApprovedPayment(requestingUser, paymentId);
        if (!hasApproved) {
          unlinkQuietly(file.path);
          throw Object.assign(
            new Error('Transcript payment must be approved by Finance before uploading transcript documents.'),
            { status: 403 }
          );
        }
      }

      // Prevent duplicate upload of the same transcript document category for the same payment request
      const duplicate = await db('documents')
        .where({
          student_id: student.id,
          document_category: category,
          description: trimmedDesc
        })
        .first();

      if (duplicate) {
        unlinkQuietly(file.path);
        throw Object.assign(
          new Error(`${category} has already been uploaded for this transcript payment request.`),
          { status: 409 }
        );
      }
    }

    // Determine document ID and rename file to match ID predictably inside private storage
    const docId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const targetDiskName = `${docId}${ext}`;
    if (!fs.existsSync(env.PRIVATE_DOCUMENTS_DIR)) {
      fs.mkdirSync(env.PRIVATE_DOCUMENTS_DIR, { recursive: true });
    }
    const targetDiskPath = path.join(env.PRIVATE_DOCUMENTS_DIR, targetDiskName);

    if (file.path !== targetDiskPath) {
      fs.renameSync(file.path, targetDiskPath);
    }

    const downloadUrl = `/api/v1/documents/${docId}/download`;

    const now = new Date();
    try {
      await db('documents').insert({
        id: docId,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_url: downloadUrl,
        file_size: file.size,
        description: trimmedDesc || null,
        upload_date: now,
        document_category: category,
        is_verified: 0,
        verified_by: null,
        verified_date: null,
        verification_comment: null,
        student_id: student.id,
        project_id: student.project_id || requestingUser.projectId || 'udsm-main'
      });
    } catch (dbErr) {
      // Immediate cleanup of disk file if database record insertion fails
      if (fs.existsSync(targetDiskPath)) {
        try {
          fs.unlinkSync(targetDiskPath);
        } catch (unlinkErr) {
          console.error(`Failed to clean up file ${targetDiskPath} after DB failure:`, unlinkErr.message);
        }
      }
      throw dbErr;
    }

    await AuditService.logEvent({
      action: 'DOCUMENT_UPLOAD',
      entityName: 'documents',
      entityId: docId,
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      actorEmail: requestingUser.email,
      details: {
        fileName: file.originalname,
        category,
        fileSize: file.size,
        studentId: student.id,
        regNo: student.registration_number
      }
    });

    const studentName = student.full_name || (student.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : student.registration_number);

    return {
      id: docId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileUrl: downloadUrl,
      fileSize: file.size,
      description: description || null,
      uploadDate: now.toISOString(),
      category,
      verified: false,
      verifiedBy: null,
      verifiedDate: null,
      verificationComment: null,
      studentId: student.id,
      studentName
    };
  }

  /**
   * Enforce role-based access scoping for documents (acronym & catalog aware):
   * - Students: only their own documents
   * - Department Officers & Supervisors: only students in their own department (and college if assigned)
   * - Principals: only students in their own college
   */
  static async checkDocumentAccess(requestingUser, student) {
    if (!requestingUser || !student) return;

    if (requestingUser.role === 'STUDENT') {
      if (requestingUser.id !== student.user_id && requestingUser.registrationNumber !== student.registration_number) {
        throw Object.assign(new Error('Forbidden: You can only access your own documents.'), { status: 403 });
      }
      return;
    }

    if (['DEPARTMENT_OFFICER', 'SUPERVISOR', 'PRINCIPAL', 'COLLEGE_PRINCIPAL'].includes(requestingUser.role)) {
      const catalogs = await loadAcademicCatalogs(db, requestingUser);
      assertOfficerAcademicScope(
        requestingUser,
        {
          college: (student.college || '').trim(),
          department: (student.department || '').trim()
        },
        { ...catalogs, actionLabel: 'access documents' }
      );
    }
  }

  /**
   * Get student documents with pagination
   */
  static async getStudentDocuments({ studentId, page = 0, size = 10, requestingUser }) {
    const student = await this.resolveStudent(studentId);
    if (!student) {
      throw Object.assign(new Error(`Student not found for identifier '${studentId}'.`), { status: 404 });
    }

    // Role and institutional scope enforcement
    await this.checkDocumentAccess(requestingUser, student);

    const pageNum = Math.max(0, parseInt(page, 10) || 0);
    const pageSize = Math.max(1, Math.min(100, parseInt(size, 10) || 10));
    const offset = pageNum * pageSize;

    const totalCountQuery = await db('documents')
      .where({ student_id: student.id })
      .count('id as total')
      .first();

    const totalElements = parseInt(totalCountQuery?.total || 0, 10);
    const totalPages = Math.ceil(totalElements / pageSize);

    const rows = await db('documents')
      .where({ student_id: student.id })
      .orderBy('upload_date', 'desc')
      .limit(pageSize)
      .offset(offset);

    const studentName = student.full_name || (student.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : student.registration_number);

    const content = rows.map(r => ({
      id: r.id,
      fileName: r.file_name,
      fileType: r.file_type,
      fileUrl: r.file_url,
      fileSize: Number(r.file_size),
      description: r.description,
      uploadDate: r.upload_date ? new Date(r.upload_date).toISOString() : null,
      category: r.document_category,
      verified: Boolean(r.is_verified),
      verifiedBy: r.verified_by,
      verifiedDate: r.verified_date ? new Date(r.verified_date).toISOString() : null,
      verificationComment: r.verification_comment,
      studentId: r.student_id,
      studentName
    }));

    return {
      content,
      totalElements,
      totalPages,
      size: pageSize,
      number: pageNum
    };
  }

  /**
   * Get document metadata by ID
   */
  static async getDocumentById(documentId, requestingUser) {
    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) {
      throw Object.assign(new Error(`Document '${documentId}' not found.`), { status: 404 });
    }

    const student = await db('students').where({ id: doc.student_id }).first();

    // Role and institutional scope enforcement
    await this.checkDocumentAccess(requestingUser, student);

    const studentName = student ? (student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || doc.student_id) : doc.student_id;

    return {
      id: doc.id,
      fileName: doc.file_name,
      fileType: doc.file_type,
      fileUrl: doc.file_url,
      fileSize: Number(doc.file_size),
      description: doc.description,
      uploadDate: doc.upload_date ? new Date(doc.upload_date).toISOString() : null,
      category: doc.document_category,
      verified: Boolean(doc.is_verified),
      verifiedBy: doc.verified_by,
      verifiedDate: doc.verified_date ? new Date(doc.verified_date).toISOString() : null,
      verificationComment: doc.verification_comment,
      studentId: doc.student_id,
      studentName
    };
  }

  /**
   * Verify or reject a student document
   */
  static async verifyDocument({ documentId, officerId, verified, comment, requestingUser }) {
    if (requestingUser.role === 'STUDENT') {
      throw Object.assign(new Error('Forbidden: Students cannot verify documents.'), { status: 403 });
    }

    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) {
      throw Object.assign(new Error(`Document '${documentId}' not found.`), { status: 404 });
    }

    const isVerifiedBool = (verified === true || verified === 'true' || verified === 1 || verified === '1');
    const officerName = requestingUser.fullName || requestingUser.username || officerId || 'Staff Officer';
    const now = new Date();

    await db('documents').where({ id: documentId }).update({
      is_verified: isVerifiedBool ? 1 : 0,
      verified_by: officerName,
      verified_date: now,
      verification_comment: comment || (isVerifiedBool ? 'Verified by clearance officer' : 'Rejected by clearance officer')
    });

    // Notify student
    await NotificationService.notify({
      studentId: doc.student_id,
      title: isVerifiedBool ? 'Document Verified' : 'Document Verification Rejected',
      message: `Your document '${doc.file_name}' (${doc.document_category}) has been ${isVerifiedBool ? 'verified' : 'rejected'}. Comment: ${comment || 'No comment provided.'}`,
      type: isVerifiedBool ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED'
    });

    await AuditService.logEvent({
      action: isVerifiedBool ? 'DOCUMENT_VERIFY' : 'DOCUMENT_REJECT',
      entityName: 'documents',
      entityId: doc.id,
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      actorEmail: requestingUser.email,
      details: {
        fileName: doc.file_name,
        verified: isVerifiedBool,
        comment
      }
    });

    return this.getDocumentById(documentId, requestingUser);
  }

  /**
   * Delete document
   * - Students may only delete pending (unverified) documents.
   * - Verified documents are locked.
   * - Staff/Admins can delete.
   */
  static async deleteDocument({ documentId, studentId, requestingUser }) {
    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) {
      throw Object.assign(new Error(`Document '${documentId}' not found.`), { status: 404 });
    }

    const student = await db('students').where({ id: doc.student_id }).first();

    if (requestingUser.role === 'STUDENT') {
      if (!student || (requestingUser.id !== student.user_id && requestingUser.registrationNumber !== student.registration_number)) {
        throw Object.assign(new Error('Forbidden: You can only delete your own documents.'), { status: 403 });
      }
    }

    // Verified documents are locked for all users to protect institutional audit trails
    if (Boolean(doc.is_verified)) {
      throw Object.assign(new Error('Cannot delete a verified document. Once verified, documents are part of official clearance audit records.'), { status: 400 });
    }

    // Delete physical file from disk (private storage first, legacy UPLOAD_DIR fallback)
    const diskPath = this.resolveDocumentDiskPath(doc);
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (err) {
        // Log but continue deletion of DB record
        console.error(`Warning: Failed to delete disk file ${diskPath}:`, err.message);
      }
    }

    await db('documents').where({ id: documentId }).delete();

    await AuditService.logEvent({
      action: 'DOCUMENT_DELETE',
      entityName: 'documents',
      entityId: doc.id,
      actorId: requestingUser.id,
      actorRole: requestingUser.role,
      actorEmail: requestingUser.email,
      details: {
        fileName: doc.file_name,
        studentId: doc.student_id
      }
    });

    return {
      success: true,
      message: `Document '${doc.file_name}' was deleted successfully.`
    };
  }

  /**
   * Get categories available / present for student
   */
  static async getCategories(studentId, requestingUser) {
    const student = await this.resolveStudent(studentId);
    if (!student) {
      return DEFAULT_CATEGORIES;
    }

    await this.checkDocumentAccess(requestingUser, student);

    const existing = await db('documents')
      .where({ student_id: student.id })
      .distinct('document_category')
      .pluck('document_category');

    const combined = Array.from(new Set([...DEFAULT_CATEGORIES, ...existing.filter(Boolean)]));
    return combined;
  }

  /**
   * Check if a document row matches a required clearance document name
   */
  static matchesRequiredDocument(doc, requiredName) {
    const target = String(requiredName || '').trim().toLowerCase();
    const cat = String(doc.document_category || '').trim().toLowerCase();
    const ftype = String(doc.file_type || '').trim().toLowerCase();
    return cat === target || ftype === target;
  }

  /**
   * Return required clearance documents that the student has not yet uploaded
   */
  static async getMissingDocuments(studentId, requestingUser) {
    const student = await this.resolveStudent(studentId);
    if (!student) {
      throw Object.assign(new Error(`Student not found for identifier '${studentId}'.`), { status: 404 });
    }

    await this.checkDocumentAccess(requestingUser, student);

    const docs = await db('documents').where({ student_id: student.id });
    const missing = [];
    if (!docs.some(doc => this.matchesRequiredDocument(doc, 'Transcript'))) missing.push('Transcript');
    if (!docs.some(doc => this.matchesRequiredDocument(doc, 'O-Level Certificate'))) missing.push('O-Level Certificate');
    if (!docs.some(doc => this.matchesRequiredDocument(doc, 'A-Level Certificate') || this.matchesRequiredDocument(doc, 'Diploma Certificate'))) {
      missing.push('A-Level or Diploma Certificate');
    }
    if (!docs.some(doc => this.matchesRequiredDocument(doc, 'Identity Document'))) missing.push('Identity Document');
    return missing;
  }

  /**
   * Return verification status summary for a student's documents
   */
  static async getDocumentVerificationStatus(studentId, requestingUser) {
    const student = await this.resolveStudent(studentId);
    if (!student) {
      throw Object.assign(new Error(`Student not found for identifier '${studentId}'.`), { status: 404 });
    }

    await this.checkDocumentAccess(requestingUser, student);

    const rows = await db('documents')
      .where({ student_id: student.id })
      .orderBy('upload_date', 'desc');

    const studentName = student.full_name || (student.first_name ? `${student.first_name} ${student.last_name || ''}`.trim() : student.registration_number);

    const documents = rows.map(r => ({
      id: r.id,
      fileName: r.file_name,
      fileType: r.file_type,
      fileUrl: r.file_url,
      fileSize: Number(r.file_size),
      description: r.description,
      uploadDate: r.upload_date ? new Date(r.upload_date).toISOString() : null,
      category: r.document_category,
      verified: Boolean(r.is_verified),
      verifiedBy: r.verified_by,
      verifiedDate: r.verified_date ? new Date(r.verified_date).toISOString() : null,
      verificationComment: r.verification_comment,
      studentId: r.student_id,
      studentName
    }));

    const missingDocuments = REQUIRED_CLEARANCE_DOCUMENTS.filter(
      reqName => !rows.some(doc => this.matchesRequiredDocument(doc, reqName))
    );
    const hasAllRequiredDocuments = missingDocuments.length === 0;
    const allRequiredDocumentsVerified = hasAllRequiredDocuments && REQUIRED_CLEARANCE_DOCUMENTS.every(
      reqName => rows.some(doc => this.matchesRequiredDocument(doc, reqName) && Boolean(doc.is_verified))
    );

    return {
      studentId: student.id,
      documents,
      allRequiredDocumentsVerified,
      hasAllRequiredDocuments,
      missingDocuments
    };
  }

  /**
   * Check if student has required clearance documents
   */
  static async hasRequiredDocuments(studentId, requestingUser = null) {
    const student = await this.resolveStudent(studentId);
    if (!student) return false;

    if (requestingUser) {
      await this.checkDocumentAccess(requestingUser, student);
    }

    const count = await db('documents')
      .where({ student_id: student.id, is_verified: 1 })
      .count('id as total')
      .first();

    return parseInt(count?.total || 0, 10) > 0;
  }

  /**
   * Return uploaded transcript document categories for a specific transcript payment request
   */
  static async getTranscriptDocumentCategories(studentIdOrUserId, paymentRequestId) {
    const cleanPaymentId = paymentRequestId ? String(paymentRequestId).trim() : '';
    if (!cleanPaymentId) return [];

    const student = await this.resolveStudent(studentIdOrUserId);
    if (!student) return [];

    const expectedDescription = `${TRANSCRIPT_PAYMENT_DESCRIPTION_PREFIX}${cleanPaymentId}`;
    const docs = await db('documents')
      .where({ student_id: student.id, description: expectedDescription })
      .select('document_category', 'file_type');

    const matched = [];
    for (const reqName of ALLOWED_TRANSCRIPT_DOCUMENTS) {
      if (docs.some(d => this.matchesRequiredDocument(d, reqName))) {
        matched.push(reqName);
      }
    }
    return matched;
  }

  /**
   * Check if student has uploaded all required transcript documents for a specific payment request:
   * - Birth Certificate + O-Level Certificate + (A-Level Certificate OR Diploma Certificate)
   * - Plus Undergraduate Certificate for Postgraduate students
   */
  static async hasRequiredTranscriptDocuments(studentIdOrUserId, paymentRequestId) {
    const student = await this.resolveStudent(studentIdOrUserId);
    if (!student) return false;

    const categories = await this.getTranscriptDocumentCategories(studentIdOrUserId, paymentRequestId);
    const hasBirth = categories.includes('Birth Certificate');
    const hasOLevel = categories.includes('O-Level Certificate');
    const hasEntry = categories.includes('A-Level Certificate') || categories.includes('Diploma Certificate');

    let isPostgrad = isPostgraduateRecord(student);
    if (!isPostgrad && student.user_id) {
      const linkedUser = await db('users').where({ id: student.user_id }).first();
      if (linkedUser) {
        isPostgrad = isPostgraduateRecord(linkedUser);
      }
    }
    const hasUndergrad = !isPostgrad || categories.includes('Undergraduate Certificate');
    return hasBirth && hasOLevel && hasEntry && hasUndergrad;
  }

  /**
   * Resolve physical file path on disk (prefers private-documents storage, falls back to legacy UPLOAD_DIR)
   */
  static resolveDocumentDiskPath(doc) {
    const ext = path.extname(doc.file_name || '').toLowerCase();
    const privatePath = path.join(env.PRIVATE_DOCUMENTS_DIR, `${doc.id}${ext}`);
    if (fs.existsSync(privatePath)) {
      return privatePath;
    }
    const legacyPath = path.join(env.UPLOAD_DIR, `${doc.id}${ext}`);
    if (fs.existsSync(legacyPath)) {
      return legacyPath;
    }
    return privatePath;
  }

  /**
   * Get stream and metadata for authenticated download
   */
  static async getDownloadStream(documentId, requestingUser) {
    const doc = await db('documents').where({ id: documentId }).first();
    if (!doc) {
      throw Object.assign(new Error(`Document '${documentId}' not found.`), { status: 404 });
    }

    const student = await db('students').where({ id: doc.student_id }).first();

    // Role and institutional scope enforcement
    await this.checkDocumentAccess(requestingUser, student);

    const diskPath = this.resolveDocumentDiskPath(doc);

    if (!fs.existsSync(diskPath)) {
      throw Object.assign(new Error('Physical file not found on storage disk.'), { status: 404 });
    }

    const stat = fs.statSync(diskPath);
    const stream = fs.createReadStream(diskPath);

    return {
      stream,
      fileName: doc.file_name,
      fileType: doc.file_type,
      fileSize: stat.size
    };
  }
}

module.exports = DocumentService;

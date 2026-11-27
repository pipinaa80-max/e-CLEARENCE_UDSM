const crypto = require('crypto');
const { getDb } = require('../config/database');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const {
  matchesDepartmentScope,
  matchesCollegeScope,
  loadAcademicCatalogs
} = require('../utils/academicScope');
const {
  parseDebtFlagCsvBuffer,
  parseDebtFlagExcelBuffer,
  generateDebtFlagTemplateCsvBuffer
} = require('../utils/spreadsheet');

function formatDebtFlag(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    registrationNumber: row.registration_number,
    studentName: row.student_name,
    college: row.college || '',
    department: row.department || '',
    programme: row.programme || '',
    amount: Number(row.amount || 0),
    category: row.item_category || 'Equipment / Item Rental',
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    reason: row.reason || '',
    negotiationNotes: row.negotiation_notes || null,
    status: row.status || 'OPEN',
    lecturerId: row.lecturer_id,
    lecturerName: row.lecturer_name || '',
    lecturerEmail: row.lecturer_email || null,
    lecturerPhone: row.lecturer_phone || null,
    resolutionNote: row.resolution_note || null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null
  };
}

class StudentDebtService {
  /**
   * Look up any student's clearance status before a lecturer flags a debt/liability.
   * Lecturers are allowed to look up and flag ANY student across the university;
   * the returned college & department always reflect the student's own academic unit.
   */
  static async lookupClearance(lecturer, registrationNumber) {
    if (!registrationNumber || !registrationNumber.trim()) {
      const err = new Error('Enter a student registration number.');
      err.statusCode = 400;
      throw err;
    }
    const regNo = registrationNumber.trim();
    const db = getDb();

    // Find student in both students and users tables for complete authoritative info
    const student = await db('students').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();
    const studentAccount = await db('users').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();

    if (studentAccount && studentAccount.role && studentAccount.role !== 'STUDENT') {
      const err = new Error('The registration number does not belong to a student account.');
      err.statusCode = 400;
      throw err;
    }

    const studentName = student?.full_name
      || studentAccount?.full_name
      || `Pre-registered Student (${regNo})`;

    const college = (student?.college || studentAccount?.college || lecturer?.college || '').trim();
    const department = (student?.department || studentAccount?.department || lecturer?.department || '').trim();

    // Find latest clearance request
    const latestRequest = await db('clearance_requests')
      .join('students', 'clearance_requests.student_id', 'students.id')
      .whereRaw('LOWER(students.registration_number) = ?', [regNo.toLowerCase()])
      .orderBy('clearance_requests.submitted_at', 'desc')
      .select('clearance_requests.*')
      .first();

    const isCleared = (student && (student.clearance_status === 'CLEARED' || student.clearance_status === 'COMPLETED'))
      || (latestRequest && (latestRequest.status === 'CLEARED' || latestRequest.status === 'COMPLETED'));

    const clearanceStatus = isCleared ? 'CLEARED'
      : !latestRequest ? 'NOT_STARTED'
      : latestRequest.status;

    return {
      registrationNumber: student?.registration_number || studentAccount?.registration_number || regNo,
      studentName,
      college,
      department,
      clearanceStatus,
      status: clearanceStatus,
      currentStage: latestRequest ? latestRequest.current_stage : null,
      cleared: Boolean(isCleared)
    };
  }

  /**
   * List debt flags created by the lecturer
   */
  static async listForLecturer(lecturerId) {
    const db = getDb();
    const rows = await db('student_debt_flags')
      .where({ lecturer_id: String(lecturerId) })
      .orderBy('created_at', 'desc');
    return rows.map(formatDebtFlag);
  }

  /**
   * List open debt flags routed to a Department Officer's department (catalog-aware).
   * Because flags always store the student's own college & department, any flag raised
   * by any lecturer across the university automatically surfaces here for the student's
   * Department Officer.
   */
  static async listOpenForDepartment(user) {
    const db = getDb();
    const rows = await db('student_debt_flags')
      .where({ status: 'OPEN' })
      .orderBy('created_at', 'desc');

    if (user.role === 'DEPARTMENT_OFFICER' && (user.department || user.college)) {
      const { activeColleges, activeDepartments } = await loadAcademicCatalogs(db, user);
      return rows
        .filter((flag) => {
          if (user.college && flag.college && !matchesCollegeScope(flag.college, user.college, activeColleges)) {
            return false;
          }
          if (user.department && !matchesDepartmentScope(flag.department, user.department, activeDepartments)) {
            return false;
          }
          return true;
        })
        .map(formatDebtFlag);
    }

    return rows.map(formatDebtFlag);
  }

  /**
   * List open debt flags for a student
   */
  static async listForStudent(user) {
    const db = getDb();
    if (!user.registrationNumber) {
      return [];
    }

    const rows = await db('student_debt_flags')
      .where({ status: 'OPEN' })
      .andWhereRaw('LOWER(registration_number) = ?', [user.registrationNumber.trim().toLowerCase()])
      .orderBy('created_at', 'desc');
    return rows.map(formatDebtFlag);
  }

  /**
   * Create a student debt/liability flag.
   * Lecturers can flag any student across the university, and the recorded flag
   * reflects the student's own college and department so it routes to the student's
   * Department Officer.
   */
  static async create(lecturer, data, reqContext = {}) {
    const db = getDb();
    const regNo = data.registrationNumber ? data.registrationNumber.trim() : null;

    if (!regNo) {
      const err = new Error('Registration number is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!data.amount || isNaN(data.amount) || Number(data.amount) <= 0) {
      const err = new Error('A valid positive debt amount is required.');
      err.statusCode = 400;
      throw err;
    }

    if (!data.reason || !data.reason.trim()) {
      const err = new Error('Reason for debt flag is required.');
      err.statusCode = 400;
      throw err;
    }

    // Look up authoritative student details from both students and users tables
    const studentProfile = await db('students').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();
    const studentUser = await db('users').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();

    if (studentUser && studentUser.role !== 'STUDENT') {
      const err = new Error('The registration number does not belong to a student account.');
      err.statusCode = 400;
      throw err;
    }

    // Prevent flagging students who have already completed clearance
    const latestRequest = studentProfile
      ? await db('clearance_requests')
          .where({ student_id: studentProfile.id })
          .orderBy('submitted_at', 'desc')
          .first()
      : null;

    const isAlreadyCleared =
      (studentProfile && (studentProfile.clearance_status === 'CLEARED' || studentProfile.clearance_status === 'COMPLETED')) ||
      (latestRequest && (latestRequest.status === 'CLEARED' || latestRequest.status === 'COMPLETED'));

    if (isAlreadyCleared) {
      const err = new Error('This student is already cleared. A debt flag cannot be recorded for a cleared student.');
      err.statusCode = 409;
      throw err;
    }

    // Always reflect the student's own college & department first so it routes to their Department Officer
    const studentCollege = (
      studentProfile?.college ||
      studentUser?.college ||
      data.college ||
      lecturer.college ||
      ''
    ).trim();
    const studentDepartment = (
      studentProfile?.department ||
      studentUser?.department ||
      data.department ||
      lecturer.department ||
      ''
    ).trim();
    const canonicalRegNo = studentProfile?.registration_number || studentUser?.registration_number || regNo;
    const studentName = studentProfile?.full_name || studentUser?.full_name || data.studentName?.trim() || `Pre-registered Student (${canonicalRegNo})`;
    const studentId = studentUser ? String(studentUser.id) : (studentProfile ? String(studentProfile.id) : `prereg-${canonicalRegNo.toLowerCase()}`);
    const programme = studentProfile?.programme || studentUser?.programme || 'External / Pre-registered';

    const id = crypto.randomUUID();

    const newFlag = {
      id,
      student_id: studentId,
      registration_number: canonicalRegNo,
      student_name: studentName,
      college: studentCollege,
      department: studentDepartment,
      programme,
      amount: Number(data.amount),
      item_category: data.category?.trim() || 'Equipment / Item Rental',
      due_date: data.dueDate ? new Date(data.dueDate) : null,
      reason: data.reason.trim(),
      negotiation_notes: data.negotiationNotes?.trim() || null,
      status: 'OPEN',
      lecturer_id: String(lecturer.id),
      lecturer_name: lecturer.fullName || lecturer.username,
      lecturer_email: lecturer.email || null,
      lecturer_phone: lecturer.phoneNumber || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db('student_debt_flags').insert(newFlag);

    // Notify student if user exists
    if (studentUser) {
      await NotificationService.sendNotification({
        userId: studentUser.id,
        studentId: studentProfile ? String(studentProfile.id) : null,
        title: 'Clearance Flagged: Outstanding Debt / Rental Record',
        message: `Lecturer ${lecturer.fullName || lecturer.username} recorded an outstanding liability (${newFlag.item_category}) of TZS ${newFlag.amount}: ${newFlag.reason}. This has been routed to ${studentDepartment || 'your department'} and locks Department clearance until resolved.`,
        type: 'CLEARANCE_UPDATE'
      });
    }

    await AuditService.logAction({
      userId: lecturer.id,
      username: lecturer.email || lecturer.username,
      action: 'CREATE_STUDENT_DEBT_FLAG',
      details: `Lecturer flagged student ${canonicalRegNo} (${studentCollege || 'N/A'} / ${studentDepartment || 'N/A'}) with amount TZS ${newFlag.amount} for ${newFlag.reason}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return formatDebtFlag(newFlag);
  }

  /**
   * Resolve an outstanding debt flag
   */
  static async resolve(lecturer, flagId, data, reqContext = {}) {
    const db = getDb();
    const flag = await db('student_debt_flags').where({ id: flagId }).first();

    if (!flag) {
      const err = new Error('Debt record not found.');
      err.statusCode = 404;
      throw err;
    }

    // Role check: creator, Admin/Superuser, or same-department lecturer (catalog-aware)
    const isCreator = String(lecturer.id) === String(flag.lecturer_id);
    const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SUPERUSER'].includes(lecturer.role);
    let isSameDept = false;
    if (!isCreator && !isAdmin && lecturer.department && flag.department) {
      const { activeDepartments } = await loadAcademicCatalogs(db, lecturer);
      isSameDept = matchesDepartmentScope(flag.department, lecturer.department, activeDepartments);
    }

    if (!isCreator && !isAdmin && !isSameDept) {
      const err = new Error('You can only resolve debt records you recorded or records in your registered department.');
      err.statusCode = 403;
      throw err;
    }

    const resolutionNote = data.resolutionNote?.trim() || 'Debt cleared / item returned';

    await db('student_debt_flags').where({ id: flagId }).update({
      status: 'RESOLVED',
      resolution_note: resolutionNote,
      resolved_at: new Date(),
      updated_at: new Date()
    });

    const updatedFlag = await db('student_debt_flags').where({ id: flagId }).first();

    // Notify student
    const studentProf = await db('students').whereRaw('LOWER(registration_number) = ?', [flag.registration_number.toLowerCase()]).first();
    const studentUsr = await db('users').whereRaw('LOWER(registration_number) = ?', [flag.registration_number.toLowerCase()]).first();

    await NotificationService.sendNotification({
      userId: studentUsr ? String(studentUsr.id) : null,
      studentId: studentProf ? String(studentProf.id) : null,
      title: 'Debt / Liability Flag Resolved',
      message: `Your debt/liability flag for ${flag.item_category} (${flag.reason}) has been marked as RESOLVED by ${lecturer.fullName || lecturer.username}. Note: ${resolutionNote}.`,
      type: 'CLEARANCE_UPDATE'
    });

    await AuditService.logAction({
      userId: lecturer.id,
      username: lecturer.email || lecturer.username,
      action: 'RESOLVE_STUDENT_DEBT_FLAG',
      details: `Resolved flag #${flagId} for student ${flag.registration_number}: ${resolutionNote}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return formatDebtFlag(updatedFlag);
  }

  /**
   * Bulk upload student debt/liability flags from CSV or Excel (.xlsx/.xls)
   */
  static async bulkUpload(lecturer, file, reqContext = {}) {
    if (!file || !file.buffer) {
      const err = new Error('Invalid or empty file.');
      err.statusCode = 400;
      throw err;
    }

    const filename = (file.originalname || '').toLowerCase();
    let rows = [];

    if (filename.endsWith('.csv')) {
      rows = parseDebtFlagCsvBuffer(file.buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rows = await parseDebtFlagExcelBuffer(file.buffer);
    } else {
      const err = new Error('Unsupported file format. Please upload CSV or Excel.');
      err.statusCode = 400;
      throw err;
    }

    let count = 0;
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await this.create(lecturer, row, reqContext);
        count += 1;
      } catch (err) {
        console.warn(`[StudentDebtService.bulkUpload] Failed to create flag for ${row.registrationNumber}:`, err.message);
        errors.push({
          row: i + 2,
          registrationNumber: row.registrationNumber || 'Unknown',
          message: err.message || 'Could not create debt flag'
        });
      }
    }

    await AuditService.logAction({
      userId: lecturer.id,
      username: lecturer.email || lecturer.username,
      action: 'BULK_UPLOAD_STUDENT_DEBT_FLAGS',
      details: `Lecturer bulk-flagged ${count} student(s) (skipped ${errors.length}) from ${file.originalname}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return {
      count,
      skippedCount: errors.length,
      errors
    };
  }

  static generateCsvTemplate() {
    return generateDebtFlagTemplateCsvBuffer();
  }
}

module.exports = StudentDebtService;

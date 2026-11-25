const crypto = require('crypto');
const { getDb } = require('../config/database');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const {
  parseDebtFlagCsvBuffer,
  parseDebtFlagExcelBuffer,
  generateDebtFlagTemplateCsvBuffer
} = require('../utils/spreadsheet');

class StudentDebtService {
  /**
   * Look up a student's clearance status before a lecturer flags a debt
   */
  static async lookupClearance(lecturer, registrationNumber) {
    if (!registrationNumber || !registrationNumber.trim()) {
      const err = new Error('Enter a student registration number.');
      err.statusCode = 400;
      throw err;
    }
    const regNo = registrationNumber.trim();
    const db = getDb();

    // Find student in students table or users table
    const student = await db('students').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();
    const studentAccount = !student
      ? await db('users').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first()
      : null;

    const studentName = student ? student.full_name
      : studentAccount ? studentAccount.full_name
      : `Pre-registered Student (${regNo})`;

    const college = student ? student.college
      : studentAccount ? studentAccount.college
      : lecturer.college || 'College of Information and Communication Technologies (CoICT)';

    const department = student ? student.department
      : studentAccount ? studentAccount.department
      : lecturer.department || 'Department of Computer Science & Engineering';

    // Find latest clearance request
    const latestRequest = await db('clearance_requests')
      .join('students', 'clearance_requests.student_id', 'students.id')
      .whereRaw('LOWER(students.registration_number) = ?', [regNo.toLowerCase()])
      .orderBy('clearance_requests.submitted_at', 'desc')
      .select('clearance_requests.*')
      .first();

    const isCleared = (student && (student.clearance_status === 'CLEARED' || student.clearance_status === 'COMPLETED'))
      || (latestRequest && (latestRequest.status === 'CLEARED' || latestRequest.status === 'COMPLETED'));

    const status = isCleared ? 'CLEARED'
      : !latestRequest ? 'NOT_STARTED'
      : latestRequest.status;

    return {
      registrationNumber: regNo,
      studentName,
      college,
      department,
      status,
      currentStage: latestRequest ? latestRequest.current_stage : null,
      cleared: Boolean(isCleared)
    };
  }

  /**
   * List debt flags created by the lecturer
   */
  static async listForLecturer(lecturerId) {
    const db = getDb();
    return db('student_debt_flags')
      .where({ lecturer_id: String(lecturerId) })
      .orderBy('created_at', 'desc');
  }

  /**
   * List open debt flags for a department
   */
  static async listOpenForDepartment(user) {
    const db = getDb();
    let query = db('student_debt_flags').where({ status: 'OPEN' });

    if (user.role === 'DEPARTMENT_OFFICER' && user.department) {
      query = query.andWhere((builder) => {
        builder.whereRaw('LOWER(department) LIKE ?', [`%${user.department.trim().toLowerCase()}%`]);
      });
    }

    return query.orderBy('created_at', 'desc');
  }

  /**
   * List open debt flags for a student
   */
  static async listForStudent(user) {
    const db = getDb();
    if (!user.registrationNumber) {
      return [];
    }

    return db('student_debt_flags')
      .where({ status: 'OPEN' })
      .andWhereRaw('LOWER(registration_number) = ?', [user.registrationNumber.trim().toLowerCase()])
      .orderBy('created_at', 'desc');
  }

  /**
   * Create a student debt/liability flag
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

    // Look up student details
    const studentProfile = await db('students').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();
    const studentUser = await db('users').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();

    if (studentUser && studentUser.role !== 'STUDENT') {
      const err = new Error('The registration number does not belong to a student account.');
      err.statusCode = 400;
      throw err;
    }

    const studentCollege = studentUser?.college || studentProfile?.college || lecturer.college || 'CoICT';
    const studentDepartment = studentUser?.department || studentProfile?.department || lecturer.department || 'Computer Science & Engineering';
    const studentName = data.studentName?.trim() || studentUser?.full_name || studentProfile?.full_name || `Pre-registered Student (${regNo})`;
    const studentId = studentUser ? String(studentUser.id) : (studentProfile ? String(studentProfile.id) : `prereg-${regNo.toLowerCase()}`);
    const programme = studentUser?.programme || studentProfile?.programme || 'External / Pre-registered';

    const id = crypto.randomUUID();

    const newFlag = {
      id,
      student_id: studentId,
      registration_number: regNo,
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
        message: `Lecturer ${lecturer.fullName || lecturer.username} recorded an outstanding liability (${newFlag.item_category}) of TZS ${newFlag.amount}: ${newFlag.reason}. Please contact your lecturer to resolve this.`,
        type: 'CLEARANCE_UPDATE'
      });
    }

    await AuditService.logAction({
      userId: lecturer.id,
      username: lecturer.email || lecturer.username,
      action: 'CREATE_STUDENT_DEBT_FLAG',
      details: `Lecturer flagged student ${regNo} with amount TZS ${newFlag.amount} for ${newFlag.reason}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return newFlag;
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

    // Role check: must be creator or lecturer in same college/department or Admin/Superuser
    const isCreator = String(lecturer.id) === String(flag.lecturer_id);
    const isAdmin = ['ADMIN', 'ADMINISTRATOR', 'SUPERUSER'].includes(lecturer.role);
    const isSameDept = lecturer.department && flag.department &&
      lecturer.department.toLowerCase().includes(flag.department.toLowerCase());

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

    return updatedFlag;
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
    for (const row of rows) {
      try {
        await this.create(lecturer, row, reqContext);
        count += 1;
      } catch (err) {
        console.warn(`[StudentDebtService.bulkUpload] Failed to create flag for ${row.registrationNumber}:`, err.message);
      }
    }

    await AuditService.logAction({
      userId: lecturer.id,
      username: lecturer.email || lecturer.username,
      action: 'BULK_UPLOAD_STUDENT_DEBT_FLAGS',
      details: `Lecturer bulk-flagged ${count} student(s) from ${file.originalname}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return count;
  }

  static generateCsvTemplate() {
    return generateDebtFlagTemplateCsvBuffer();
  }
}

module.exports = StudentDebtService;

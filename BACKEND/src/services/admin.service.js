const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../config/database');
const { hashPassword } = require('../utils/password');
const { ROLES, ALL_ROLES } = require('../constants/roles');
const AuditService = require('./audit.service');
const {
  parseCsvBuffer,
  parseExcelBuffer,
  mapEntitiesToTableRows,
  generateExcelBuffer,
  generateCsvBuffer,
  generateEmptyTemplateExcelBuffer,
  generateEmptyTemplateCsvBuffer
} = require('../utils/spreadsheet');

const STRICT_ROLE_ALIAS_MAP = {
  STUDENT: ROLES.STUDENT,
  ACADEMIC_STAFF: ROLES.ACADEMIC_STAFF,
  LECTURER: ROLES.LECTURER,
  DEPARTMENT: ROLES.DEPARTMENT_OFFICER,
  DEPARTMENT_OFFICER: ROLES.DEPARTMENT_OFFICER,
  PRINCIPAL: ROLES.PRINCIPAL,
  LIBRARY: ROLES.LIBRARY_OFFICER,
  LIBRARY_OFFICER: ROLES.LIBRARY_OFFICER,
  FINANCE: ROLES.FINANCE_OFFICER,
  FINANCE_OFFICER: ROLES.FINANCE_OFFICER,
  CONVOCATION: ROLES.CONVOCATION_OFFICER,
  CONVOCATION_OFFICER: ROLES.CONVOCATION_OFFICER,
  GAMES: ROLES.GAMES_COACH,
  GAMES_COACH: ROLES.GAMES_COACH,
  WARDEN: ROLES.HALL_WARDEN,
  HALL_WARDEN: ROLES.HALL_WARDEN,
  USAB: ROLES.USAB_OFFICER,
  USAB_OFFICER: ROLES.USAB_OFFICER,
  DARUSO: ROLES.DARUSO_OFFICER,
  DARUSO_OFFICER: ROLES.DARUSO_OFFICER,
  DEAN: ROLES.DEAN_OF_STUDENTS,
  DEAN_OF_STUDENTS: ROLES.DEAN_OF_STUDENTS,
  SMART_CARD: ROLES.SMART_CARD_OFFICER,
  SMARTCARD: ROLES.SMART_CARD_OFFICER,
  SMART_CARD_OFFICER: ROLES.SMART_CARD_OFFICER,
  ICT: ROLES.SMART_CARD_OFFICER,
  ICT_OFFICER: ROLES.SMART_CARD_OFFICER,
  IT: ROLES.SMART_CARD_OFFICER,
  IT_OFFICER: ROLES.SMART_CARD_OFFICER,
  WORKSHOP: ROLES.WORKSHOP_OFFICER,
  WORKSHOP_OFFICER: ROLES.WORKSHOP_OFFICER,
  LABORATORY: ROLES.LABORATORY_OFFICER,
  LABORATORY_OFFICER: ROLES.LABORATORY_OFFICER,
  DUS: ROLES.DIRECTOR_OF_UNDERGRADUATE_STUDIES,
  DIRECTOR_OF_UNDERGRADUATE_STUDIES: ROLES.DIRECTOR_OF_UNDERGRADUATE_STUDIES,
  DIRECTOR_OF_UNDEGRADUATE_STUDIES: ROLES.DIRECTOR_OF_UNDERGRADUATE_STUDIES,
  DUS_SECRETARY: ROLES.DUS_SECRETARY,
  STATION_SECRETARY: ROLES.DUS_SECRETARY,
  ADMIN: ROLES.ADMINISTRATOR,
  ADMINISTRATOR: ROLES.ADMINISTRATOR,
  SUPERUSER: ROLES.SUPERUSER
};

function resolveRoleStrict(roleInput) {
  if (!roleInput || typeof roleInput !== 'string' || !roleInput.trim()) {
    return null;
  }
  const normalized = roleInput.toUpperCase().trim().replace(/[\s-]+/g, '_');
  const clean = normalized.startsWith('ROLE_') ? normalized.substring(5) : normalized;
  return STRICT_ROLE_ALIAS_MAP[clean] || null;
}

function formatAdminUser(row) {
  if (!row) return null;
  const activeBool = Boolean(row.is_active);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.full_name,
    firstName: row.first_name,
    middleName: row.middle_name || null,
    lastName: row.last_name,
    registrationNumber: row.registration_number || null,
    programme: row.programme || null,
    college: row.college || null,
    department: row.department || null,
    academicYear: row.academic_year || null,
    graduationYear: row.graduation_year || null,
    semester: row.semester || null,
    yearOfStudy: row.year_of_study || null,
    phoneNumber: row.phone_number || null,
    hall: row.hall || null,
    wing: row.wing || null,
    block: row.block || null,
    roomNumber: row.room_number || null,
    address: row.address || null,
    physicalAddress: row.physical_address || null,
    sponsor: row.sponsor || null,
    photo: null, // Stripped for lightweight admin list responses (matches Spring Boot)
    role: row.role,
    isActive: activeBool,
    active: activeBool,
    isEmailVerified: Boolean(row.is_email_verified),
    isLocked: Boolean(row.is_locked),
    projectId: row.project_id || null,
    stationCode: row.station_code || null,
    stationName: row.station_name || null,
    lastLogin: row.last_login || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

class AdminService {
  static async getAllUsers() {
    const db = getDb();
    const rows = await db('users').orderBy('created_at', 'desc');
    return rows.map(formatAdminUser);
  }

  static getAllRoles() {
    return [...ALL_ROLES];
  }

  static async createUser(payload = {}, actor = {}, reqContext = {}) {
    const db = getDb();

    const rawEmail = payload.email ? String(payload.email).trim().toLowerCase() : '';
    const rawPassword = payload.password ? String(payload.password) : '';
    const firstName = payload.firstName ? String(payload.firstName).trim() : '';
    const middleName = payload.middleName ? String(payload.middleName).trim() : null;
    const lastName = payload.lastName ? String(payload.lastName).trim() : '';

    if (!rawEmail) {
      const err = new Error('Email is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!rawPassword) {
      const err = new Error('Password is required.');
      err.statusCode = 400;
      throw err;
    }
    if (!firstName || !lastName) {
      const err = new Error('First name and last name are required.');
      err.statusCode = 400;
      throw err;
    }

    const existingEmail = await db('users').whereRaw('LOWER(email) = ?', [rawEmail]).first();
    if (existingEmail) {
      const err = new Error('Email is already registered.');
      err.statusCode = 409;
      throw err;
    }

    const regNo = payload.registrationNumber ? String(payload.registrationNumber).trim() : null;
    if (regNo) {
      const existingReg = await db('users')
        .whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()])
        .first();
      if (existingReg) {
        const err = new Error('Registration number already exists.');
        err.statusCode = 409;
        throw err;
      }
    }

    let resolvedRole = ROLES.STUDENT;
    if (payload.role) {
      const parsed = resolveRoleStrict(String(payload.role));
      if (!parsed) {
        const err = new Error(`Invalid role name: ${payload.role}`);
        err.statusCode = 400;
        throw err;
      }
      if (parsed === ROLES.SUPERUSER && actor.role !== ROLES.SUPERUSER) {
        const err = new Error('Only a Superuser can provision another Superuser account.');
        err.statusCode = 403;
        throw err;
      }
      resolvedRole = parsed;
    }

    const fullName = payload.fullName && String(payload.fullName).trim()
      ? String(payload.fullName).trim()
      : `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

    const college = payload.college || payload.faculty || null;
    const department = payload.department || null;
    const programme = payload.programme || null;
    const phone = payload.phone || payload.phoneNumber || null;
    const yearOfStudy = payload.yearOfStudy || null;
    const academicYear = payload.academicYear || null;

    const hashedPassword = await hashPassword(rawPassword);
    const userId = crypto.randomUUID();
    const now = new Date();

    const createdUser = await db.transaction(async (trx) => {
      await trx('users').insert({
        id: userId,
        username: rawEmail,
        email: rawEmail,
        password: hashedPassword,
        full_name: fullName,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        registration_number: regNo,
        programme,
        college,
        department,
        academic_year: academicYear,
        year_of_study: yearOfStudy,
        phone_number: phone,
        station_code: payload.stationCode || null,
        station_name: payload.stationName || null,
        role: resolvedRole,
        is_active: 1,
        is_email_verified: 1,
        project_id: actor.projectId || payload.projectId || null,
        created_by: actor.email || actor.username || 'ADMINISTRATOR',
        created_at: now,
        updated_at: now
      });

      if (resolvedRole === ROLES.STUDENT && regNo) {
        const existingStudent = await trx('students')
          .whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()])
          .first();

        if (!existingStudent) {
          await trx('students').insert({
            id: crypto.randomUUID(),
            registration_number: regNo,
            full_name: fullName,
            email: rawEmail,
            phone_number: phone,
            programme,
            faculty: college,
            college,
            department,
            year_of_study: yearOfStudy,
            academic_year: academicYear,
            user_id: userId,
            is_final_year: yearOfStudy ? String(yearOfStudy).toLowerCase() === 'final year' : 1,
            clearance_status: 'PENDING',
            project_id: actor.projectId || payload.projectId || null,
            created_at: now,
            updated_at: now
          });
        } else if (!existingStudent.user_id) {
          await trx('students').where({ id: existingStudent.id }).update({
            user_id: userId,
            updated_at: now
          });
        }
      }

      await AuditService.logAction({
        userId: actor.id || null,
        username: actor.email || actor.username || 'ADMINISTRATOR',
        action: 'ADMIN_CREATE_USER',
        details: `Admin created and activated user ${rawEmail} with role ${resolvedRole}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return trx('users').where({ id: userId }).first();
    });

    return formatAdminUser(createdUser);
  }

  static async deleteUserInTransaction(trx, user) {
    if (user.role === ROLES.SUPERUSER || (user.email && user.email.toLowerCase() === 'superuser@admin.local')) {
      const err = new Error('Superuser account cannot be deleted.');
      err.statusCode = 403;
      throw err;
    }

    // Locate any linked student row (by user_id, reg_no, or email)
    let student = await trx('students').where({ user_id: user.id }).first();
    if (!student && user.registration_number) {
      student = await trx('students')
        .whereRaw('LOWER(registration_number) = ?', [user.registration_number.toLowerCase()])
        .first();
    }
    if (!student && user.email) {
      student = await trx('students')
        .whereRaw('LOWER(email) = ?', [user.email.toLowerCase()])
        .first();
    }

    // Clean tables without foreign-key cascade on users/students
    await trx('convocation_receipts').where({ student_id: user.id }).del();
    await trx('student_debt_flags').where({ student_id: user.id }).del();

    if (student) {
      await trx('convocation_receipts').where({ student_id: student.id }).del();
      await trx('student_debt_flags').where({ student_id: student.id }).del();
      if (student.registration_number) {
        await trx('student_debt_flags')
          .whereRaw('LOWER(registration_number) = ?', [student.registration_number.toLowerCase()])
          .del();
      }
      if (!student.user_id) {
        // Student was linked by email/regNo without FK, delete explicitly
        await trx('students').where({ id: student.id }).del();
      }
    }

    // Deleting user cascades to students, clearance_requests, department_approvals,
    // documents, notifications, refresh_tokens, user_sessions, clearance_certificates
    await trx('users').where({ id: user.id }).del();
  }

  static async deleteUser(userId, actor = {}, reqContext = {}) {
    const db = getDb();
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      const err = new Error(`User not found with ID: ${userId}`);
      err.statusCode = 404;
      throw err;
    }

    await db.transaction(async (trx) => {
      await this.deleteUserInTransaction(trx, user);

      await AuditService.logAction({
        userId: actor.id || null,
        username: actor.email || actor.username || 'ADMINISTRATOR',
        action: 'ADMIN_DELETE_USER',
        details: `Admin deleted user ${user.email} (${user.id})`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });
    });

    return { success: true, message: 'User deleted successfully' };
  }

  static async deleteUsers(userIds, actor = {}, reqContext = {}) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return { success: true, message: 'No users selected for deletion', deletedCount: 0 };
    }

    const db = getDb();
    let deletedCount = 0;

    await db.transaction(async (trx) => {
      for (const id of userIds) {
        const user = await trx('users').where({ id }).first();
        if (!user) continue;
        await this.deleteUserInTransaction(trx, user);
        deletedCount++;
      }

      await AuditService.logAction({
        userId: actor.id || null,
        username: actor.email || actor.username || 'ADMINISTRATOR',
        action: 'ADMIN_BULK_DELETE_USERS',
        details: `Admin bulk deleted ${deletedCount} user(s)`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });
    });

    return {
      success: true,
      message: 'Selected users deleted successfully',
      deletedCount
    };
  }

  static async updateUserRole(userId, roleInput, actor = {}, reqContext = {}) {
    const db = getDb();
    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      const err = new Error(`User not found with ID: ${userId}`);
      err.statusCode = 404;
      throw err;
    }

    if (user.role === ROLES.SUPERUSER || (user.email && user.email.toLowerCase() === 'superuser@admin.local')) {
      const err = new Error('Superuser role cannot be modified.');
      err.statusCode = 403;
      throw err;
    }

    const resolvedRole = resolveRoleStrict(roleInput);
    if (!resolvedRole) {
      const err = new Error(`Invalid role name: ${roleInput}`);
      err.statusCode = 400;
      throw err;
    }

    if (resolvedRole === ROLES.SUPERUSER && actor.role !== ROLES.SUPERUSER) {
      const err = new Error('Only a Superuser can assign the Superuser role.');
      err.statusCode = 403;
      throw err;
    }

    await db('users').where({ id: userId }).update({
      role: resolvedRole,
      updated_by: actor.email || actor.username || 'ADMINISTRATOR',
      updated_at: new Date()
    });

    await AuditService.logAction({
      userId: actor.id || null,
      username: actor.email || actor.username || 'ADMINISTRATOR',
      action: 'ADMIN_UPDATE_USER_ROLE',
      details: `Updated user ${user.email} role from ${user.role} to ${resolvedRole}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    const updated = await db('users').where({ id: userId }).first();
    return formatAdminUser(updated);
  }

  static async getAllClearanceRequests() {
    const db = getDb();
    const rows = await db('clearance_requests as cr')
      .leftJoin('students as s', 'cr.student_id', 's.id')
      .select(
        'cr.id',
        'cr.student_id',
        'cr.status',
        'cr.current_stage',
        'cr.current_office',
        'cr.submitted_at',
        'cr.updated_at',
        'cr.college',
        'cr.department',
        'cr.programme',
        'cr.project_id',
        's.id as joined_student_id',
        's.full_name as s_full_name',
        's.registration_number as s_registration_number',
        's.email as s_email',
        's.phone_number as s_phone_number',
        's.programme as s_programme',
        's.college as s_college',
        's.department as s_department'
      )
      .orderBy('cr.submitted_at', 'desc');

    return rows.map(r => {
      const item = {
        id: r.id,
        studentId: r.student_id,
        status: r.status,
        currentStage: r.current_stage,
        currentOffice: r.current_office,
        submittedAt: r.submitted_at,
        updatedAt: r.updated_at,
        college: r.college || r.s_college || null,
        department: r.department || r.s_department || null,
        programme: r.programme || r.s_programme || null,
        projectId: r.project_id || null
      };

      if (r.joined_student_id) {
        item.studentName = r.s_full_name;
        item.registrationNumber = r.s_registration_number;
        item.student = {
          id: r.joined_student_id,
          fullName: r.s_full_name,
          registrationNumber: r.s_registration_number,
          email: r.s_email,
          phoneNumber: r.s_phone_number,
          programme: r.s_programme,
          college: r.s_college,
          department: r.s_department
        };
      } else {
        item.studentName = 'Student';
        item.registrationNumber = r.student_id || '—';
      }

      return item;
    });
  }

  static async importLocalStorage(exportData, actor = {}, reqContext = {}) {
    if (!exportData || typeof exportData !== 'object' || Array.isArray(exportData)) {
      const err = new Error('Export must be a JSON object.');
      err.statusCode = 400;
      throw err;
    }

    if (exportData.users !== undefined && !Array.isArray(exportData.users)) {
      const err = new Error('users must be an array.');
      err.statusCode = 400;
      throw err;
    }

    const db = getDb();
    const projectId = actor.projectId || 'default';
    let usersImported = 0;

    if (Array.isArray(exportData.users)) {
      for (const userEntry of exportData.users) {
        if (!userEntry || typeof userEntry !== 'object') {
          const err = new Error('Each imported user must be a valid registration object.');
          err.statusCode = 400;
          throw err;
        }
        if (!userEntry.password || !String(userEntry.password).trim()) {
          const err = new Error('Every imported user must include a password.');
          err.statusCode = 422;
          throw err;
        }
        await this.createUser(userEntry, actor, reqContext);
        usersImported++;
      }
    }

    let legacyRecordsImported = 0;
    const now = new Date();
    for (const [key, value] of Object.entries(exportData)) {
      await db('project_local_storage').insert({
        project_id: projectId,
        storage_key: String(key).slice(0, 150),
        storage_value: JSON.stringify(value),
        imported_at: now
      });
      legacyRecordsImported++;
    }

    return {
      projectId,
      usersImported,
      legacyRecordsImported,
      message: 'Local-storage data imported into clearance_db. Normalized users are available in users/students; other legacy records are preserved for review.'
    };
  }

  static async getImportedLocalStorage(actor = {}) {
    const db = getDb();
    const projectId = actor.projectId || 'default';
    const rows = await db('project_local_storage')
      .where({ project_id: projectId })
      .orderBy('imported_at', 'desc');

    return rows.map(r => ({
      id: r.id,
      projectId: r.project_id,
      storageKey: r.storage_key,
      storageValue: r.storage_value,
      importedAt: r.imported_at
    }));
  }

  /**
   * Upsert user + synced student row from a parsed bulk upload row
   */
  static async saveOrUpdateUserAndStudent(request, actor = {}) {
    const db = getDb();
    const email = request.email ? String(request.email).trim().toLowerCase() : '';
    const regNo = request.registrationNumber ? String(request.registrationNumber).trim() : '';

    let user = null;
    if (email) {
      user = await db('users').whereRaw('LOWER(email) = ?', [email]).first();
    }
    if (!user && regNo) {
      user = await db('users').whereRaw('LOWER(registration_number) = ?', [regNo.toLowerCase()]).first();
    }

    const resolvedRole = (request.role && resolveRoleStrict(request.role)) || ROLES.STUDENT;
    const finalRole = (resolvedRole === ROLES.SUPERUSER && actor.role !== ROLES.SUPERUSER)
      ? ROLES.STUDENT
      : resolvedRole;

    const now = new Date();

    if (!user) {
      const userId = crypto.randomUUID();
      const firstName = request.firstName ? String(request.firstName).trim() : 'User';
      const middleName = request.middleName ? String(request.middleName).trim() : null;
      const lastName = request.lastName ? String(request.lastName).trim() : firstName;
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
      const hashedPassword = await hashPassword(request.password || regNo || 'Welcome@UDSM123');

      await db('users').insert({
        id: userId,
        username: email || regNo || userId,
        email: email || `${userId}@udsm.ac.tz`,
        password: hashedPassword,
        full_name: fullName,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        registration_number: regNo || null,
        college: request.college || null,
        department: request.department || null,
        programme: request.programme || null,
        phone_number: request.phone || null,
        year_of_study: request.yearOfStudy || null,
        role: finalRole,
        is_active: 1,
        is_email_verified: 1,
        project_id: actor.projectId || null,
        created_by: actor.email || actor.username || 'BULK_UPLOAD',
        created_at: now,
        updated_at: now
      });

      user = await db('users').where({ id: userId }).first();
    } else {
      const firstName = request.firstName && request.firstName.trim() ? request.firstName.trim() : user.first_name;
      const middleName = request.middleName !== undefined ? (request.middleName || null) : user.middle_name;
      const lastName = request.lastName && request.lastName.trim() ? request.lastName.trim() : user.last_name;
      const fullName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();

      const updates = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        full_name: fullName,
        is_active: 1,
        is_email_verified: 1,
        updated_at: now
      };
      if (regNo) updates.registration_number = regNo;
      if (request.college) updates.college = request.college;
      if (request.department) updates.department = request.department;
      if (request.programme) updates.programme = request.programme;
      if (request.phone) updates.phone_number = request.phone;
      if (request.yearOfStudy) updates.year_of_study = request.yearOfStudy;
      if (request.password) updates.password = await hashPassword(request.password);

      await db('users').where({ id: user.id }).update(updates);
      user = await db('users').where({ id: user.id }).first();
    }

    // Synchronize student row for STUDENT role
    const finalRegNo = user.registration_number || regNo;
    if (user.role === ROLES.STUDENT && finalRegNo) {
      let student = await db('students')
        .whereRaw('LOWER(registration_number) = ?', [finalRegNo.toLowerCase()])
        .first();
      if (!student) {
        student = await db('students').where({ user_id: user.id }).first();
      }

      if (!student) {
        await db('students').insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          registration_number: finalRegNo,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          college: user.college,
          faculty: user.college,
          department: user.department,
          programme: user.programme,
          year_of_study: user.year_of_study,
          clearance_status: 'PENDING',
          is_final_year: 1,
          project_id: user.project_id || null,
          created_at: now,
          updated_at: now
        });
      } else {
        await db('students').where({ id: student.id }).update({
          user_id: user.id,
          registration_number: finalRegNo,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          college: user.college,
          faculty: user.college,
          department: user.department,
          programme: user.programme,
          year_of_study: user.year_of_study,
          updated_at: now
        });
      }
    }

    return user;
  }

  static async cleanOrphanStudents(actor = {}, reqContext = {}) {
    const db = getDb();
    let count = 0;

    await db.transaction(async (trx) => {
      const orphans = await trx('students')
        .leftJoin('users', 'students.user_id', 'users.id')
        .whereNull('users.id')
        .select('students.id', 'students.registration_number');

      for (const s of orphans) {
        await trx('notifications').where({ student_id: s.id }).del();
        const reqs = await trx('clearance_requests').where({ student_id: s.id }).select('id');
        if (reqs.length > 0) {
          await trx('department_approvals')
            .whereIn('clearance_request_id', reqs.map(r => r.id))
            .del();
          await trx('clearance_requests').where({ student_id: s.id }).del();
        }
        await trx('documents').where({ student_id: s.id }).del();
        await trx('convocation_receipts').where({ student_id: s.id }).del();
        await trx('student_debt_flags').where({ student_id: s.id }).del();
        if (s.registration_number) {
          await trx('student_debt_flags')
            .whereRaw('LOWER(registration_number) = ?', [s.registration_number.toLowerCase()])
            .del();
        }
        await trx('students').where({ id: s.id }).del();
        count += 1;
      }
    });

    await AuditService.logAction({
      userId: actor.id || null,
      username: actor.email || actor.username || 'ADMINISTRATOR',
      action: 'ADMIN_CLEAN_ORPHAN_STUDENTS',
      details: `Cleaned up ${count} orphan student record(s)`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return count;
  }

  static async purgeStudents(registrationNumbers = null, actor = {}, reqContext = {}) {
    const db = getDb();
    let studentsToDelete = [];

    if (Array.isArray(registrationNumbers) && registrationNumbers.length > 0) {
      const lowered = registrationNumbers
        .filter(r => r !== null && r !== undefined && String(r).trim())
        .map(r => String(r).trim().toLowerCase());
      if (lowered.length > 0) {
        studentsToDelete = await db('users')
          .where({ role: ROLES.STUDENT })
          .whereRaw(
            `LOWER(registration_number) IN (${lowered.map(() => '?').join(',')})`,
            lowered
          );
      }
    } else {
      let qb = db('users').where({ role: ROLES.STUDENT });
      if (actor.projectId) {
        qb = qb.andWhere({ project_id: actor.projectId });
      }
      studentsToDelete = await qb;
    }

    let count = 0;
    await db.transaction(async (trx) => {
      for (const u of studentsToDelete) {
        await this.deleteUserInTransaction(trx, u);
        count += 1;
      }
    });

    const orphanCount = await this.cleanOrphanStudents(actor, reqContext);
    count += orphanCount;

    await AuditService.logAction({
      userId: actor.id || null,
      username: actor.email || actor.username || 'ADMINISTRATOR',
      action: 'ADMIN_PURGE_STUDENTS',
      details: `Purged ${count} student record(s) and related clearance data`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return count;
  }

  static async processBulkUpload(file, actor = {}, reqContext = {}, uploadType = 'STUDENT') {
    if (!file || !file.buffer) {
      const err = new Error('Invalid or empty file.');
      err.statusCode = 400;
      throw err;
    }

    const normalizedType = String(uploadType || 'STUDENT').toUpperCase() === 'STAFF' ? 'STAFF' : 'STUDENT';
    const filename = (file.originalname || '').toLowerCase();
    let rows = [];

    if (filename.endsWith('.csv')) {
      rows = parseCsvBuffer(file.buffer, normalizedType);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rows = await parseExcelBuffer(file.buffer, normalizedType);
    } else {
      const err = new Error('Unsupported file format. Please upload CSV or Excel.');
      err.statusCode = 400;
      throw err;
    }

    let count = 0;
    for (const rowReq of rows) {
      try {
        await this.saveOrUpdateUserAndStudent(rowReq, actor);
        count++;
      } catch (err) {
        console.error(`[AdminService.processBulkUpload] Row failed (${rowReq.email || rowReq.registrationNumber}):`, err.message);
      }
    }

    await AuditService.logAction({
      userId: actor.id || null,
      username: actor.email || actor.username || 'ADMINISTRATOR',
      action: 'ADMIN_BULK_UPLOAD_USERS',
      details: `Bulk uploaded ${count} ${normalizedType.toLowerCase()} record(s) from ${file.originalname}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return count;
  }

  static async generateTemplateExcel(type = 'STUDENT') {
    return generateEmptyTemplateExcelBuffer(type);
  }

  static generateTemplateCsv(type = 'STUDENT') {
    return generateEmptyTemplateCsvBuffer(type);
  }

  static async seedUdsmSampleData(actor = {}, reqContext = {}) {
    const projectRoot = path.resolve(__dirname, '../../..');
    const candidates = [
      path.join(projectRoot, 'udsm_20_students_and_staff_data.csv'),
      path.join(projectRoot, 'frontend', 'angular-app', 'public', 'udsm_20_students_and_staff_data.csv'),
      path.resolve(process.cwd(), 'udsm_20_students_and_staff_data.csv')
    ];

    const csvPath = candidates.find(p => fs.existsSync(p));
    if (!csvPath) {
      const err = new Error('Sample CSV file (udsm_20_students_and_staff_data.csv) not found.');
      err.statusCode = 404;
      throw err;
    }

    const buffer = fs.readFileSync(csvPath);
    const rows = parseCsvBuffer(buffer);
    let count = 0;

    for (const rowReq of rows) {
      try {
        await this.saveOrUpdateUserAndStudent(rowReq, actor);
        count++;
      } catch (err) {
        console.warn(`[AdminService.seedUdsmSampleData] Skipped ${rowReq.email}:`, err.message);
      }
    }

    await AuditService.logAction({
      userId: actor.id || null,
      username: actor.email || actor.username || 'ADMINISTRATOR',
      action: 'ADMIN_SEED_SAMPLE_DATA',
      details: `Seeded ${count} user(s) from ${path.basename(csvPath)}`,
      ipAddress: reqContext.ip,
      userAgent: reqContext.userAgent
    });

    return count;
  }

  static async exportUsersToExcel() {
    const db = getDb();
    const [users, students] = await Promise.all([
      db('users').orderBy('created_at', 'asc'),
      db('students')
    ]);
    const rows = mapEntitiesToTableRows(users, students);
    return generateExcelBuffer(rows);
  }

  static async exportUsersToCsv() {
    const db = getDb();
    const [users, students] = await Promise.all([
      db('users').orderBy('created_at', 'asc'),
      db('students')
    ]);
    const rows = mapEntitiesToTableRows(users, students);
    return generateCsvBuffer(rows);
  }

  static async regenerateSampleFiles() {
    const db = getDb();
    const [users, students] = await Promise.all([
      db('users').orderBy('created_at', 'asc'),
      db('students')
    ]);
    const rows = mapEntitiesToTableRows(users, students);
    const [excelBuffer, csvBuffer] = await Promise.all([
      generateExcelBuffer(rows),
      Promise.resolve(generateCsvBuffer(rows))
    ]);

    const projectRoot = path.resolve(__dirname, '../../..');
    const excelTargets = [
      path.join(projectRoot, 'udsm_clearance_50_students_and_staff.xlsx'),
      path.join(projectRoot, 'udsm_20_students_and_staff_data.xlsx')
    ];
    const csvTargets = [
      path.join(projectRoot, 'udsm_clearance_50_students_and_staff.csv'),
      path.join(projectRoot, 'udsm_20_students_and_staff_data.csv')
    ];

    for (const target of excelTargets) {
      fs.writeFileSync(target, excelBuffer);
    }
    for (const target of csvTargets) {
      fs.writeFileSync(target, csvBuffer);
    }

    return rows.length;
  }
}

module.exports = AdminService;

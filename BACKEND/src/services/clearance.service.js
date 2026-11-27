const { getDb } = require('../config/database');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const { isPostgraduateRecord } = require('../utils/postgraduate');
const academicScope = require('../utils/academicScope');

// Standard parallel offices
const STANDARD_PARALLEL_OFFICES = [
  'Games Coach',
  'Hall Warden',
  'USAB',
  'DARUSO',
  'Library',
  'Dean of Students',
  'Smart Card'
];

class ClearanceService {
  /**
   * Helper to normalize office names for comparison
   */
  static normalizeOfficeName(name) {
    if (!name) return '';
    return name.replace(/[_\s]+/g, ' ').trim().toLowerCase();
  }

  static normalizeAcademicUnitString(raw) {
    return academicScope.normalizeAcademicUnitString(raw);
  }

  static generateInitials(norm) {
    return academicScope.generateInitials(norm);
  }

  static extractAcronymOrInitials(raw, norm) {
    return academicScope.extractAcronymOrInitials(raw, norm);
  }

  static isComputerScienceAlias(raw) {
    return academicScope.isComputerScienceAlias(raw);
  }

  static matchesCatalogEntity(raw, norm, entity) {
    return academicScope.matchesCatalogEntity(raw, norm, entity);
  }

  static matchesDepartmentScope(studentScope, userScope, activeDepartments = []) {
    return academicScope.matchesDepartmentScope(studentScope, userScope, activeDepartments);
  }

  static matchesCollegeScope(studentScope, userScope, activeColleges = []) {
    return academicScope.matchesCollegeScope(studentScope, userScope, activeColleges);
  }

  /**
   * Map user role to institutional office
   */
  static resolveTargetOffice(user, requestedOffice) {
    if (requestedOffice && requestedOffice.trim()) {
      if (['ADMIN', 'ADMINISTRATOR', 'SUPERUSER'].includes(user.role)) {
        return requestedOffice.trim();
      }
    }

    switch (user.role) {
      case 'CONVOCATION_OFFICER': return 'Convocation';
      case 'LIBRARY_OFFICER': return 'Library';
      case 'FINANCE_OFFICER': return 'Finance';
      case 'GAMES_COACH': return 'Games Coach';
      case 'HALL_WARDEN': return 'Hall Warden';
      case 'USAB_OFFICER': return 'USAB';
      case 'DARUSO_OFFICER': return 'DARUSO';
      case 'DEAN_OF_STUDENTS': return 'Dean of Students';
      case 'SMART_CARD_OFFICER': return 'Smart Card';
      case 'WORKSHOP_OFFICER': return 'Workshop';
      case 'LABORATORY_OFFICER': return 'Laboratory';
      case 'DEPARTMENT_OFFICER': return 'Department';
      case 'PRINCIPAL': return 'Principal';
      case 'SUPERVISOR': return 'Supervisor';
      default: return requestedOffice && requestedOffice.trim() ? requestedOffice.trim() : 'Department';
    }
  }

  /**
   * Determine if an approval is part of Stage 2 (Parallel)
   */
  static isParallelOffice(officeName) {
    const norm = this.normalizeOfficeName(officeName);
    if (norm === 'convocation' || norm === 'department' || norm === 'principal' || norm === 'finance' || norm === 'supervisor') {
      return false;
    }
    return true;
  }

  /**
   * Submit student clearance request
   */
  static async submitClearanceRequest(user, requestDTO, reqContext = {}) {
    const db = getDb();

    return db.transaction(async (trx) => {
      // Find or verify student
      let student = null;
      if (user.role === 'STUDENT') {
        student = await trx('students').where({ user_id: user.id }).first();
        if (!student && user.registrationNumber) {
          student = await trx('students').whereRaw('LOWER(registration_number) = ?', [user.registrationNumber.toLowerCase()]).first();
        }
      } else if (requestDTO.registrationNumber) {
        student = await trx('students').whereRaw('LOWER(registration_number) = ?', [requestDTO.registrationNumber.trim().toLowerCase()]).first();
      }

      const effectiveAward = (requestDTO.award && String(requestDTO.award).trim())
        ? String(requestDTO.award).trim()
        : (student?.award || user.award || null);
      const effectiveUndergradCert = (requestDTO.undergraduateCertificate && String(requestDTO.undergraduateCertificate).trim())
        ? String(requestDTO.undergraduateCertificate).trim()
        : (requestDTO.undergraduateCertificateUrl && String(requestDTO.undergraduateCertificateUrl).trim())
          ? String(requestDTO.undergraduateCertificateUrl).trim()
          : (student?.undergraduate_certificate_url || null);

      const college = requestDTO.college || student?.college || user.college || 'CoICT';
      const department = requestDTO.department || student?.department || user.department || 'Computer Science & Engineering';
      const programme = requestDTO.programme || student?.programme || user.programme || 'Degree Programme';

      const isPostgrad = isPostgraduateRecord({
        isPostgraduate: requestDTO.isPostgraduate !== undefined
          ? requestDTO.isPostgraduate
          : (student?.is_postgraduate || user.isPostgraduate),
        award: effectiveAward,
        programme
      });

      if (!student) {
        // Create student profile from user details if missing
        const studentId = `std-${Date.now()}`;
        const newStudent = {
          id: studentId,
          user_id: user.id,
          registration_number: user.registrationNumber || requestDTO.registrationNumber || `REG-${Date.now()}`,
          full_name: user.fullName || requestDTO.studentName || 'Student',
          college,
          department,
          programme,
          award: effectiveAward,
          is_postgraduate: isPostgrad ? 1 : 0,
          undergraduate_certificate_url: effectiveUndergradCert,
          email: user.email,
          phone_number: requestDTO.phoneNumber || user.phoneNumber || null,
          hall: requestDTO.hall || null,
          wing: requestDTO.wing || null,
          block: requestDTO.block || null,
          room_number: requestDTO.roomNumber || null,
          address: requestDTO.address || requestDTO.physicalAddress || null,
          physical_address: requestDTO.physicalAddress || requestDTO.address || null,
          photo: requestDTO.photo || null,
          sponsor: requestDTO.sponsor || 'HESLB',
          clearance_status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date()
        };
        await trx('students').insert(newStudent);
        student = newStudent;
      } else {
        // Update student record with submitted details
        const updates = {
          updated_at: new Date()
        };
        if (requestDTO.hall) updates.hall = requestDTO.hall;
        if (requestDTO.wing) updates.wing = requestDTO.wing;
        if (requestDTO.block) updates.block = requestDTO.block;
        if (requestDTO.roomNumber) updates.room_number = requestDTO.roomNumber;
        if (requestDTO.address) updates.address = requestDTO.address;
        if (requestDTO.physicalAddress) updates.physical_address = requestDTO.physicalAddress;
        if (requestDTO.phoneNumber) updates.phone_number = requestDTO.phoneNumber;
        if (requestDTO.photo) updates.photo = requestDTO.photo;
        if (requestDTO.sponsor) updates.sponsor = requestDTO.sponsor;
        if (effectiveAward) updates.award = effectiveAward;
        if (isPostgrad) updates.is_postgraduate = 1;
        if (effectiveUndergradCert) updates.undergraduate_certificate_url = effectiveUndergradCert;

        await trx('students').where({ id: student.id }).update(updates);
        student = { ...student, ...updates };
      }

      // Check if student already has a pending clearance request
      const existingPending = await trx('clearance_requests')
        .where({ student_id: student.id, status: 'PENDING' })
        .first();

      if (existingPending) {
        const err = new Error('You already have a pending clearance request');
        err.statusCode = 400;
        throw err;
      }

      // Insert new clearance request
      const [requestId] = await trx('clearance_requests').insert({
        student_id: student.id,
        college,
        department,
        programme,
        award: effectiveAward,
        is_postgraduate: isPostgrad ? 1 : 0,
        undergraduate_certificate_url: effectiveUndergradCert,
        wing: requestDTO.wing || student.wing || null,
        block: requestDTO.block || student.block || null,
        address: requestDTO.address || student.address || null,
        physical_address: requestDTO.physicalAddress || student.physical_address || null,
        status: 'PENDING',
        current_stage: 'Convocation',
        current_office: 'Convocation',
        submitted_at: new Date()
      });

      // Build sequential approval records in department_approvals
      const approvalsToInsert = [];
      let order = 1;

      // 1. Stage 1: Convocation
      approvalsToInsert.push({
        clearance_request_id: requestId,
        department: 'Convocation',
        status: 'PENDING',
        order_number: order++
      });

      // 2. Stage 2: Parallel Offices
      for (const office of STANDARD_PARALLEL_OFFICES) {
        approvalsToInsert.push({
          clearance_request_id: requestId,
          department: office,
          status: 'PENDING',
          order_number: order++
        });
      }

      // Conditional parallel offices based on college
      const colLower = college.toLowerCase();
      if (colLower.includes('engineering') || colLower.includes('coet')) {
        approvalsToInsert.push({
          clearance_request_id: requestId,
          department: 'Workshop',
          status: 'PENDING',
          order_number: order++
        });
      }
      if (colLower.includes('health') || colLower.includes('allied') || colLower.includes('mchas')) {
        approvalsToInsert.push({
          clearance_request_id: requestId,
          department: 'Laboratory',
          status: 'PENDING',
          order_number: order++
        });
      }

      // 3. Stage 3: Department
      approvalsToInsert.push({
        clearance_request_id: requestId,
        department: 'Department',
        status: 'PENDING',
        order_number: order++
      });

      // 4. Stage 4: Principal
      approvalsToInsert.push({
        clearance_request_id: requestId,
        department: 'Principal',
        status: 'PENDING',
        order_number: order++
      });

      // 5. Stage 5: Finance
      approvalsToInsert.push({
        clearance_request_id: requestId,
        department: 'Finance',
        status: 'PENDING',
        order_number: order++
      });

      // 6. Stage 6: Research Supervisor (Final check for Postgraduate students ONLY)
      if (isPostgrad) {
        approvalsToInsert.push({
          clearance_request_id: requestId,
          department: 'Supervisor',
          status: 'PENDING',
          order_number: order++
        });
      }

      await trx('department_approvals').insert(approvalsToInsert);

      // Check if student has open debt/liability flags
      const openDebts = await trx('student_debt_flags')
        .whereRaw('LOWER(registration_number) = ?', [student.registration_number.toLowerCase()])
        .andWhere({ status: 'OPEN' });

      if (openDebts.length > 0) {
        for (const debt of openDebts) {
          await NotificationService.sendNotification({
            userId: user.id,
            studentId: student.id,
            title: 'Clearance Flagged: Outstanding Debt / Rental Record',
            message: `Your clearance has been automatically flagged due to an open rental/liability record at stage/department: ${debt.department}. Lecturer: ${debt.lecturer_name}. Reason: ${debt.reason}. Amount: TZS ${debt.amount}. Please resolve this debt with the lecturer.`,
            type: 'CLEARANCE_UPDATE',
            trx
          });
        }
      }

      await NotificationService.sendNotification({
        userId: user.id,
        studentId: student.id,
        title: 'Clearance Request Submitted',
        message: 'Your clearance request has been submitted successfully. Stage 1 (Convocation) review is now pending.',
        type: 'CLEARANCE_UPDATE',
        trx
      });

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'SUBMIT_CLEARANCE',
        details: `Student ${student.registration_number} submitted clearance request #${requestId}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Clearance request submitted successfully',
        requestId
      };
    });
  }

  /**
   * Helper to recalculate and advance current_stage
   */
  static async updateClearanceStage(trx, requestId) {
    const approvals = await trx('department_approvals')
      .where({ clearance_request_id: requestId })
      .orderBy('order_number', 'asc');

    // 1. Check Convocation
    const convocation = approvals.find(a => this.normalizeOfficeName(a.department) === 'convocation');
    if (convocation && convocation.status !== 'APPROVED') {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Convocation',
        current_office: 'Convocation'
      });
      return 'Convocation';
    }

    // 2. Check Parallel Offices
    const parallelApprovals = approvals.filter(a => this.isParallelOffice(a.department));
    const allParallelApproved = parallelApprovals.every(a => a.status === 'APPROVED');
    if (!allParallelApproved) {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Parallel',
        current_office: 'Parallel'
      });
      return 'Parallel';
    }

    // 3. Check Department
    const deptApproval = approvals.find(a => this.normalizeOfficeName(a.department) === 'department');
    if (deptApproval && deptApproval.status !== 'APPROVED') {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Department',
        current_office: 'Department'
      });
      return 'Department';
    }

    // 4. Check Principal
    const principalApproval = approvals.find(a => this.normalizeOfficeName(a.department) === 'principal');
    if (principalApproval && principalApproval.status !== 'APPROVED') {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Principal',
        current_office: 'Principal'
      });
      return 'Principal';
    }

    // 5. Check Finance
    const financeApproval = approvals.find(a => this.normalizeOfficeName(a.department) === 'finance');
    if (financeApproval && financeApproval.status !== 'APPROVED') {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Finance',
        current_office: 'Finance'
      });
      return 'Finance';
    }

    // 6. Check Supervisor (Postgraduate final check)
    const supervisorApproval = approvals.find(a => this.normalizeOfficeName(a.department) === 'supervisor');
    if (supervisorApproval && supervisorApproval.status !== 'APPROVED') {
      await trx('clearance_requests').where({ id: requestId }).update({
        current_stage: 'Supervisor',
        current_office: 'Supervisor'
      });
      return 'Supervisor';
    }

    // All approved
    await trx('clearance_requests').where({ id: requestId }).update({
      current_stage: 'Completed',
      current_office: 'Completed',
      status: 'COMPLETED'
    });
    return 'Completed';
  }

  /**
   * Office Officer approval
   */
  static async approveOfficeClearance(user, decisionDTO, reqContext = {}) {
    const db = getDb();
    const requestId = decisionDTO.requestId;
    const requestedOffice = decisionDTO.office;
    const comments = decisionDTO.comments || 'Approved';

    if (!requestId) {
      const err = new Error('Request ID is required');
      err.statusCode = 400;
      throw err;
    }

    const office = this.resolveTargetOffice(user, requestedOffice);

    return db.transaction(async (trx) => {
      // Find request with row lock
      let clearanceRequest = null;
      if (!isNaN(requestId)) {
        clearanceRequest = await trx('clearance_requests').where({ id: Number(requestId) }).forUpdate().first();
      }
      if (!clearanceRequest) {
        // Try by student registration
        const student = await trx('students').whereRaw('LOWER(registration_number) = ?', [String(requestId).toLowerCase()]).first();
        if (student) {
          clearanceRequest = await trx('clearance_requests')
            .where({ student_id: student.id })
            .orderBy('submitted_at', 'desc')
            .forUpdate()
            .first();
        }
      }

      if (!clearanceRequest) {
        const err = new Error(`Clearance request not found: ${requestId}`);
        err.statusCode = 404;
        throw err;
      }

      // Fetch student details
      const student = await trx('students').where({ id: clearanceRequest.student_id }).first();

      // College / Department Scoping (Principal, Department Officer, Research Supervisor)
      const catalogs = await academicScope.loadAcademicCatalogs(trx, user);
      academicScope.assertOfficerAcademicScope(
        user,
        {
          college: (student?.college || clearanceRequest.college || '').trim(),
          department: (student?.department || clearanceRequest.department || '').trim()
        },
        { ...catalogs, actionLabel: 'approve clearance' }
      );

      // Fetch all approval records for this request
      const allApprovals = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id })
        .forUpdate();

      // Find matching approval record for this office
      const approval = allApprovals.find(a => this.normalizeOfficeName(a.department) === this.normalizeOfficeName(office));
      if (!approval) {
        const err = new Error(`Department approval not found for office: ${office}`);
        err.statusCode = 404;
        throw err;
      }

      if (approval.status === 'APPROVED') {
        return {
          success: true,
          message: `Clearance already approved by ${approval.department}`
        };
      }

      // ==============================================================
      // STRICT STAGE GATING RULES
      // ==============================================================
      const convocation = allApprovals.find(a => this.normalizeOfficeName(a.department) === 'convocation');
      const parallelApprovals = allApprovals.filter(a => this.isParallelOffice(a.department));
      const deptApproval = allApprovals.find(a => this.normalizeOfficeName(a.department) === 'department');
      const principalApproval = allApprovals.find(a => this.normalizeOfficeName(a.department) === 'principal');

      const isConvocationApproved = convocation && convocation.status === 'APPROVED';
      const areAllParallelApproved = parallelApprovals.length > 0 && parallelApprovals.every(a => a.status === 'APPROVED');
      const isDeptApproved = deptApproval && deptApproval.status === 'APPROVED';
      const isPrincipalApproved = principalApproval && principalApproval.status === 'APPROVED';

      const normTarget = this.normalizeOfficeName(office);

      // Rule for Parallel Offices: Convocation must be approved first, and Smart Card must approve before other parallel offices
      if (this.isParallelOffice(office)) {
        if (!isConvocationApproved) {
          const err = new Error('Convocation clearance must be approved before parallel offices can approve.');
          err.statusCode = 409;
          throw err;
        }
        if (normTarget !== 'smart card') {
          const smartCardApproval = parallelApprovals.find(a => this.normalizeOfficeName(a.department) === 'smart card');
          const isSmartCardApproved = smartCardApproval && smartCardApproval.status === 'APPROVED';
          if (!isSmartCardApproved) {
            const err = new Error(`Smart Card approval is required first before ${approval.department} can approve.`);
            err.statusCode = 409;
            throw err;
          }
        }
      }

      // Rule for Department: Convocation AND all parallel offices must be approved
      if (normTarget === 'department') {
        if (!isConvocationApproved || !areAllParallelApproved) {
          const err = new Error('All parallel offices must approve before Department clearance can be granted.');
          err.statusCode = 409;
          throw err;
        }

        // Check if student has unresolved debt/rental flags
        if (student?.registration_number) {
          const openDebts = await trx('student_debt_flags')
            .whereRaw('LOWER(registration_number) = ?', [student.registration_number.toLowerCase()])
            .andWhere({ status: 'OPEN' });

          if (openDebts.length > 0) {
            const debtDetails = openDebts.map(d => `${d.item_category}: TZS ${d.amount} (${d.reason})`).join(', ');
            const err = new Error(`Cannot approve department clearance: student has open debt/liability records that must be resolved by a lecturer (${debtDetails}).`);
            err.statusCode = 409;
            throw err;
          }
        }
      }

      // Rule for Principal: Department must be approved
      if (normTarget === 'principal') {
        if (!isConvocationApproved || !areAllParallelApproved || !isDeptApproved) {
          const err = new Error('Department clearance must be approved before Principal endorsement.');
          err.statusCode = 409;
          throw err;
        }
      }

      // Rule for Finance: STRICT LOCK — Stages 1, 2, 3, and 4 must ALL be approved
      if (normTarget === 'finance') {
        if (!isConvocationApproved || !areAllParallelApproved || !isDeptApproved || !isPrincipalApproved) {
          const err = new Error('Finance clearance is locked until Convocation, all Parallel Offices, Department, and Principal endorsements are approved.');
          err.statusCode = 409;
          throw err;
        }
      }

      // Rule for Supervisor (Postgraduate Final Check): Finance must be approved first
      if (normTarget === 'supervisor') {
        const financeApproval = allApprovals.find(a => this.normalizeOfficeName(a.department) === 'finance');
        const isFinanceApproved = financeApproval && financeApproval.status === 'APPROVED';
        if (!isFinanceApproved) {
          const err = new Error('Finance approval is required before Research Supervisor clearance.');
          err.statusCode = 409;
          throw err;
        }
      }

      // Record the approval
      const officerName = user.fullName || user.username || 'Authorized Officer';
      await trx('department_approvals')
        .where({ id: approval.id })
        .update({
          status: 'APPROVED',
          approved_by: officerName,
          approval_date: new Date(),
          comments
        });

      // Recalculate status and stage
      const refreshedApprovals = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id });

      const totalCount = refreshedApprovals.length;
      const approvedCount = refreshedApprovals.filter(a => a.status === 'APPROVED').length;
      const rejectedCount = refreshedApprovals.filter(a => a.status === 'REJECTED').length;

      if (rejectedCount > 0) {
        await trx('clearance_requests').where({ id: clearanceRequest.id }).update({
          status: 'REJECTED'
        });
      } else if (totalCount > 0 && approvedCount === totalCount) {
        // Complete clearance!
        await trx('clearance_requests').where({ id: clearanceRequest.id }).update({
          status: 'COMPLETED',
          current_stage: 'Completed',
          current_office: 'Completed'
        });

        if (student) {
          await trx('students').where({ id: student.id }).update({
            clearance_status: 'CLEARED',
            updated_at: new Date()
          });

          await NotificationService.sendNotification({
            userId: student.user_id,
            studentId: student.id,
            title: 'Clearance Complete!',
            message: 'Congratulations! Your clearance has been fully approved by all university offices.',
            type: 'CLEARANCE_UPDATE',
            trx
          });
        }
      } else {
        const nextStage = await this.updateClearanceStage(trx, clearanceRequest.id);
        // Clear rejection status if this approval fixed the rejection
        if (clearanceRequest.status === 'REJECTED' && rejectedCount === 0) {
          await trx('clearance_requests').where({ id: clearanceRequest.id }).update({
            status: 'PENDING'
          });
        }

        // Notify ONLY the specific next office(s) whose queue just unlocked for this student
        if (student) {
          if (normTarget === 'smart card') {
            const pendingOtherParallels = refreshedApprovals
              .filter(a =>
                this.isParallelOffice(a.department) &&
                this.normalizeOfficeName(a.department) !== 'smart card' &&
                a.status === 'PENDING'
              )
              .map(a => a.department);

            if (pendingOtherParallels.length > 0) {
              await NotificationService.notifyOfficesPendingApproval({
                offices: pendingOtherParallels,
                student,
                clearanceRequest,
                trx
              });
            }
          } else if (this.isParallelOffice(office) && nextStage === 'Department') {
            await NotificationService.notifyOfficePendingApproval({
              office: 'Department',
              student,
              clearanceRequest,
              trx
            });
          } else if (normTarget === 'department' && nextStage === 'Principal') {
            await NotificationService.notifyOfficePendingApproval({
              office: 'Principal',
              student,
              clearanceRequest,
              trx
            });
          } else if (normTarget === 'principal' && nextStage === 'Finance') {
            await NotificationService.notifyOfficePendingApproval({
              office: 'Finance',
              student,
              clearanceRequest,
              trx
            });
          } else if (normTarget === 'finance' && nextStage === 'Supervisor') {
            await NotificationService.notifyOfficePendingApproval({
              office: 'Supervisor',
              student,
              clearanceRequest,
              trx
            });
          }
        }
      }

      await NotificationService.sendApprovalNotification(
        student ? student.id : clearanceRequest.student_id,
        approval.department,
        officerName,
        trx
      );

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'APPROVE_CLEARANCE',
        details: `Office ${approval.department} approved clearance for request #${clearanceRequest.id}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: `Clearance approved successfully by ${approval.department}`
      };
    });
  }

  /**
   * Bulk approve office requests
   */
  static async bulkApproveOfficeClearance(user, bulkDTO, reqContext = {}) {
    const requestIds = bulkDTO.requestIds || [];
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      const err = new Error('No request IDs provided for bulk approval.');
      err.statusCode = 400;
      throw err;
    }

    let approvedCount = 0;
    let skippedCount = 0;
    const skippedReasons = [];

    for (const reqId of requestIds) {
      try {
        await this.approveOfficeClearance(user, {
          requestId: reqId,
          office: bulkDTO.office,
          comments: bulkDTO.comments || 'Bulk approved'
        }, reqContext);
        approvedCount++;
      } catch (err) {
        skippedCount++;
        skippedReasons.push(`Request #${reqId}: ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Bulk approval complete. Approved: ${approvedCount}, Skipped: ${skippedCount}`,
      approvedCount,
      skippedCount,
      skippedReasons
    };
  }

  /**
   * Office Officer rejection
   */
  static async rejectOfficeClearance(user, decisionDTO, reqContext = {}) {
    const db = getDb();
    const requestId = decisionDTO.requestId;
    const requestedOffice = decisionDTO.office;
    const reason = decisionDTO.reason;

    if (!requestId) {
      const err = new Error('Request ID is required');
      err.statusCode = 400;
      throw err;
    }

    if (!reason || !reason.trim()) {
      const err = new Error('A rejection reason is required');
      err.statusCode = 400;
      throw err;
    }

    const office = this.resolveTargetOffice(user, requestedOffice);

    return db.transaction(async (trx) => {
      let clearanceRequest = null;
      if (!isNaN(requestId)) {
        clearanceRequest = await trx('clearance_requests').where({ id: Number(requestId) }).forUpdate().first();
      }
      if (!clearanceRequest) {
        const student = await trx('students').whereRaw('LOWER(registration_number) = ?', [String(requestId).toLowerCase()]).first();
        if (student) {
          clearanceRequest = await trx('clearance_requests')
            .where({ student_id: student.id })
            .orderBy('submitted_at', 'desc')
            .forUpdate()
            .first();
        }
      }

      if (!clearanceRequest) {
        const err = new Error(`Clearance request not found: ${requestId}`);
        err.statusCode = 404;
        throw err;
      }

      const student = await trx('students').where({ id: clearanceRequest.student_id }).first();
      const catalogs = await academicScope.loadAcademicCatalogs(trx, user);
      academicScope.assertOfficerAcademicScope(
        user,
        {
          college: (student?.college || clearanceRequest.college || '').trim(),
          department: (student?.department || clearanceRequest.department || '').trim()
        },
        { ...catalogs, actionLabel: 'reject clearance' }
      );

      const approval = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id })
        .andWhereRaw('LOWER(department) = ?', [this.normalizeOfficeName(office)])
        .forUpdate()
        .first();

      if (!approval) {
        const err = new Error(`Department approval not found for office: ${office}`);
        err.statusCode = 404;
        throw err;
      }

      const officerName = user.fullName || user.username || 'Authorized Officer';

      await trx('department_approvals')
        .where({ id: approval.id })
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
          current_office: approval.department
        });

      await NotificationService.sendRejectionNotification(
        clearanceRequest.student_id,
        approval.department,
        reason.trim(),
        trx
      );

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'REJECT_CLEARANCE',
        details: `Office ${approval.department} rejected clearance for request #${clearanceRequest.id}: ${reason.trim()}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: `Clearance rejected by ${approval.department}`
      };
    });
  }

  /**
   * Withdraw office decision back to PENDING
   */
  static async withdrawOfficeClearance(user, decisionDTO, reqContext = {}) {
    const db = getDb();
    const requestId = decisionDTO.requestId;
    const requestedOffice = decisionDTO.office;

    const office = this.resolveTargetOffice(user, requestedOffice);

    return db.transaction(async (trx) => {
      let clearanceRequest = null;
      if (!isNaN(requestId)) {
        clearanceRequest = await trx('clearance_requests').where({ id: Number(requestId) }).forUpdate().first();
      }
      if (!clearanceRequest) {
        const student = await trx('students').whereRaw('LOWER(registration_number) = ?', [String(requestId).toLowerCase()]).first();
        if (student) {
          clearanceRequest = await trx('clearance_requests')
            .where({ student_id: student.id })
            .orderBy('submitted_at', 'desc')
            .forUpdate()
            .first();
        }
      }

      if (!clearanceRequest) {
        const err = new Error(`Clearance request not found: ${requestId}`);
        err.statusCode = 404;
        throw err;
      }

      const student = await trx('students').where({ id: clearanceRequest.student_id }).first();
      const catalogs = await academicScope.loadAcademicCatalogs(trx, user);
      academicScope.assertOfficerAcademicScope(
        user,
        {
          college: (student?.college || clearanceRequest.college || '').trim(),
          department: (student?.department || clearanceRequest.department || '').trim()
        },
        { ...catalogs, actionLabel: 'withdraw clearance decision' }
      );

      const approval = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id })
        .andWhereRaw('LOWER(department) = ?', [this.normalizeOfficeName(office)])
        .forUpdate()
        .first();

      if (!approval) {
        const err = new Error(`Department approval not found for office: ${office}`);
        err.statusCode = 404;
        throw err;
      }

      await trx('department_approvals')
        .where({ id: approval.id })
        .update({
          status: 'PENDING',
          approved_by: null,
          approval_date: null,
          comments: null
        });

      // Recalculate status
      const refreshed = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id });

      const hasRejection = refreshed.some(a => a.status === 'REJECTED');
      if (!hasRejection && clearanceRequest.status === 'REJECTED') {
        await trx('clearance_requests').where({ id: clearanceRequest.id }).update({
          status: 'PENDING'
        });
      }

      if (clearanceRequest.status === 'COMPLETED') {
        await trx('clearance_requests').where({ id: clearanceRequest.id }).update({
          status: 'PENDING'
        });
        await trx('students').where({ id: clearanceRequest.student_id }).update({
          clearance_status: 'PENDING'
        });
      }

      await this.updateClearanceStage(trx, clearanceRequest.id);

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'WITHDRAW_CLEARANCE',
        details: `Officer withdrew decision for ${approval.department} on request #${clearanceRequest.id}`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Decision withdrawn successfully; request returned to Pending.'
      };
    });
  }

  /**
   * Submit Finance receipt after rejection
   */
  static async submitFinanceReceipt(user, payload, reqContext = {}) {
    const db = getDb();

    return db.transaction(async (trx) => {
      let student = await trx('students').where({ user_id: user.id }).first();
      if (!student && user.registrationNumber) {
        student = await trx('students').whereRaw('LOWER(registration_number) = ?', [user.registrationNumber.toLowerCase()]).first();
      }

      if (!student) {
        const err = new Error('Student profile not found');
        err.statusCode = 404;
        throw err;
      }

      const clearanceRequest = await trx('clearance_requests')
        .where({ student_id: student.id })
        .orderBy('submitted_at', 'desc')
        .forUpdate()
        .first();

      if (!clearanceRequest) {
        const err = new Error('No clearance request found for student');
        err.statusCode = 404;
        throw err;
      }

      const financeApproval = await trx('department_approvals')
        .where({ clearance_request_id: clearanceRequest.id, department: 'Finance' })
        .forUpdate()
        .first();

      if (!financeApproval) {
        const err = new Error('Finance approval record not found');
        err.statusCode = 404;
        throw err;
      }

      const note = payload?.note?.trim() || 'Payment receipt reported by student for verification';

      await trx('department_approvals')
        .where({ id: financeApproval.id })
        .update({
          status: 'PENDING',
          comments: note,
          approval_date: null,
          approved_by: null
        });

      await trx('clearance_requests')
        .where({ id: clearanceRequest.id })
        .update({
          status: 'PENDING',
          current_stage: 'Finance',
          current_office: 'Finance'
        });

      await NotificationService.sendNotification({
        userId: user.id,
        studentId: student.id,
        title: 'Payment Receipt Submitted',
        message: 'Your payment receipt has been received and returned to Finance for verification.',
        type: 'CLEARANCE_UPDATE',
        trx
      });

      await NotificationService.notifyOfficePendingApproval({
        office: 'Finance',
        student,
        clearanceRequest,
        customTitle: 'Finance Verification Resubmitted',
        customMessage: `${student.full_name || 'A student'} (${student.registration_number || student.id}) resubmitted payment receipt/control number for Finance verification.`,
        trx
      });

      await AuditService.logAction({
        userId: user.id,
        username: user.email || user.username,
        action: 'SUBMIT_FINANCE_RECEIPT',
        details: `Student ${student.registration_number} reported payment receipt after rejection`,
        ipAddress: reqContext.ip,
        userAgent: reqContext.userAgent,
        trx
      });

      return {
        success: true,
        message: 'Payment receipt submitted successfully and returned to Finance.'
      };
    });
  }

  /**
   * Retrieve office review queue
   */
  static async getOfficeRequests(user, requestedOffice, statusFilter) {
    const db = getDb();
    const office = this.resolveTargetOffice(user, requestedOffice);

    // Fetch requests with student join
    let query = db('clearance_requests')
      .join('students', 'clearance_requests.student_id', 'students.id')
      .select(
        'clearance_requests.*',
        'students.user_id as student_user_id',
        'students.full_name as student_name',
        'students.registration_number',
        'students.email as student_email',
        'students.phone_number as student_phone',
        'students.hall as student_hall',
        'students.room_number as student_room_number',
        'students.sponsor as student_sponsor',
        'students.photo as student_photo',
        'students.award as student_award',
        'students.is_postgraduate as student_is_postgraduate',
        'students.undergraduate_certificate_url as student_undergrad_cert_url'
      );

    const catalogs = await academicScope.loadAcademicCatalogs(db, user);

    const allRequests = await query.orderBy('clearance_requests.submitted_at', 'desc');
    const requests = allRequests.filter(req =>
      academicScope.matchesUserAcademicScope(
        user,
        {
          college: (req.college || '').trim(),
          department: (req.department || req.programme || '').trim()
        },
        catalogs
      )
    );

    if (requests.length === 0) {
      return [];
    }

    const requestIds = requests.map(r => r.id);
    const allApprovals = await db('department_approvals')
      .whereIn('clearance_request_id', requestIds)
      .orderBy('order_number', 'asc');

    const approvalsByReq = {};
    for (const app of allApprovals) {
      if (!approvalsByReq[app.clearance_request_id]) {
        approvalsByReq[app.clearance_request_id] = [];
      }
      approvalsByReq[app.clearance_request_id].push(app);
    }

    // Batch-fetch latest convocation control numbers for all students in the queue
    const studentLookupIds = Array.from(new Set(
      requests.flatMap(r => [r.student_id, r.student_user_id]).filter(Boolean).map(String)
    ));
    const controlByStudentKey = {};
    if (studentLookupIds.length > 0) {
      const receipts = await db('convocation_receipts')
        .whereIn('student_id', studentLookupIds)
        .orderBy('submitted_at', 'desc');
      for (const rec of receipts) {
        const key = String(rec.student_id);
        if (!controlByStudentKey[key] && rec.control_number) {
          controlByStudentKey[key] = rec.control_number;
        }
      }
    }

    const filteredResponses = [];

    for (const req of requests) {
      const approvals = approvalsByReq[req.id] || [];
      const officeApproval = approvals.find(a => this.normalizeOfficeName(a.department) === this.normalizeOfficeName(office));

      if (!officeApproval) {
        continue;
      }

      // Check status filter
      if (statusFilter && statusFilter.toUpperCase() !== 'ALL') {
        if (officeApproval.status.toUpperCase() !== statusFilter.toUpperCase()) {
          continue;
        }
      }

      // Hide from queue if earlier stage is strictly blocking visibility
      if (officeApproval.status === 'PENDING') {
        const normTarget = this.normalizeOfficeName(office);

        if (this.isParallelOffice(office)) {
          const conv = approvals.find(a => this.normalizeOfficeName(a.department) === 'convocation');
          if (conv && conv.status !== 'APPROVED') {
            continue; // Not ready for parallel office review
          }
          if (normTarget !== 'smart card') {
            const smartCard = approvals.find(a => this.normalizeOfficeName(a.department) === 'smart card');
            if (!smartCard || smartCard.status !== 'APPROVED') {
              continue; // Smart Card must approve before other parallel offices
            }
          }
        } else if (normTarget === 'department') {
          const conv = approvals.find(a => this.normalizeOfficeName(a.department) === 'convocation');
          const parallels = approvals.filter(a => this.isParallelOffice(a.department));
          if (!conv || conv.status !== 'APPROVED' || !parallels.every(p => p.status === 'APPROVED')) {
            continue; // Not ready for department review
          }
        } else if (normTarget === 'principal') {
          const dept = approvals.find(a => this.normalizeOfficeName(a.department) === 'department');
          if (!dept || dept.status !== 'APPROVED') {
            continue; // Not ready for principal review
          }
        } else if (normTarget === 'finance') {
          // Finance can view pending queue once principal is approved
          const princ = approvals.find(a => this.normalizeOfficeName(a.department) === 'principal');
          if (!princ || princ.status !== 'APPROVED') {
            continue;
          }
        } else if (normTarget === 'supervisor') {
          // Supervisor can view pending postgraduate queue once Finance is approved
          const fin = approvals.find(a => this.normalizeOfficeName(a.department) === 'finance');
          if (!fin || fin.status !== 'APPROVED') {
            continue;
          }
        }
      }

      const controlNumber = controlByStudentKey[String(req.student_id)]
        || (req.student_user_id ? controlByStudentKey[String(req.student_user_id)] : null)
        || null;
      filteredResponses.push(this.mapToResponse(req, approvals, null, controlNumber));
    }

    return filteredResponses;
  }

  /**
   * Get logged in student's active clearance request
   */
  static async getMyClearanceRequest(user) {
    const db = getDb();
    let student = await db('students').where({ user_id: user.id }).first();
    if (!student && user.registrationNumber) {
      student = await db('students').whereRaw('LOWER(registration_number) = ?', [user.registrationNumber.toLowerCase()]).first();
    }

    if (!student) {
      const err = new Error('Student profile not found');
      err.statusCode = 404;
      throw err;
    }

    return this.getClearanceStatus(student.id, user);
  }

  /**
   * Get clearance status by student ID or registration number
   */
  static async getClearanceStatus(identifier, requestingUser = null) {
    const db = getDb();

    let student = await db('students').where({ id: identifier }).first();
    if (!student) {
      student = await db('students').whereRaw('LOWER(registration_number) = ?', [String(identifier).toLowerCase()]).first();
    }
    if (!student) {
      student = await db('students').where({ user_id: identifier }).first();
    }

    if (!student) {
      const err = new Error('Student not found');
      err.statusCode = 404;
      throw err;
    }

    // Prevent horizontal privilege escalation (IDOR): students may only view their own clearance status
    if (requestingUser && requestingUser.role === 'STUDENT') {
      const matchesUserId = student.user_id && String(requestingUser.id) === String(student.user_id);
      const matchesRegNo =
        requestingUser.registrationNumber &&
        student.registration_number &&
        String(requestingUser.registrationNumber).trim().toLowerCase() === String(student.registration_number).trim().toLowerCase();
      if (!matchesUserId && !matchesRegNo) {
        const err = new Error('Forbidden: You are only authorized to view your own clearance status.');
        err.statusCode = 403;
        throw err;
      }
    }

    // Find pending request first, then fallback to latest
    let request = await db('clearance_requests')
      .where({ student_id: student.id, status: 'PENDING' })
      .first();

    if (!request) {
      request = await db('clearance_requests')
        .where({ student_id: student.id })
        .orderBy('submitted_at', 'desc')
        .first();
    }

    if (!request) {
      return {
        requestId: null,
        studentId: student.id,
        studentName: student.full_name,
        registrationNumber: student.registration_number,
        status: 'PENDING',
        statusMessage: 'No clearance request found',
        approvals: []
      };
    }

    const approvals = await db('department_approvals')
      .where({ clearance_request_id: request.id })
      .orderBy('order_number', 'asc');

    const lookupIds = [student.id, student.user_id].filter(Boolean).map(String);
    const latestReceipt = lookupIds.length > 0
      ? await db('convocation_receipts')
          .whereIn('student_id', lookupIds)
          .orderBy('submitted_at', 'desc')
          .first()
      : null;

    return this.mapToResponse(request, approvals, student, latestReceipt?.control_number || null);
  }

  /**
   * Analytics summary for dashboard (preserves Phase-4 summary counts AND adds DUS Director
   * requestList, totalRegisteredStudents, and registeredStudentsByYear)
   */
  static async getAnalyticsSummary(user = {}) {
    const db = getDb();
    const AnalyticsService = require('./analytics.service');
    const full = await AnalyticsService.getFullSummary(user);

    // Scope DUS vs DPGS cleanly (DUS = Undergraduate, DPGS = Postgraduate, Admin = All)
    const isDusScope = user.role === 'DIRECTOR_OF_UNDERGRADUATE_STUDIES';
    const isDpgsScope = user.role === 'DIRECTOR_OF_POSTGRADUATE_STUDIES';

    // Fetch mapped clearance requests with approvals for DUS / DPGS Director analytics views
    let reqQuery = db('clearance_requests')
      .leftJoin('students', 'clearance_requests.student_id', 'students.id')
      .leftJoin('users', 'students.user_id', 'users.id')
      .select(
        'clearance_requests.*',
        'students.full_name as student_full_name',
        'students.registration_number as student_reg_no',
        'students.programme as student_programme',
        'students.year_of_study as student_year_of_study',
        'students.award as student_award',
        'students.is_postgraduate as student_is_postgraduate',
        'users.id as linked_user_id',
        'users.full_name as user_full_name',
        'users.email as user_email',
        'users.registration_number as user_reg_no',
        'users.college as user_college',
        'users.department as user_department',
        'users.year_of_study as user_year_of_study',
        'users.award as user_award',
        'users.is_postgraduate as user_is_postgraduate'
      )
      .orderBy('clearance_requests.submitted_at', 'desc');

    const analyticsCatalogs = await academicScope.loadAcademicCatalogs(db, user);
    const rawReqRows = await reqQuery;
    const reqRows = rawReqRows.filter(req => {
      if (!academicScope.matchesUserAcademicScope(
        user,
        {
          college: (req.college || req.user_college || '').trim(),
          department: (req.department || req.user_department || '').trim()
        },
        analyticsCatalogs
      )) {
        return false;
      }
      const pg = isPostgraduateRecord({
        isPostgraduate: req.is_postgraduate || req.student_is_postgraduate || req.user_is_postgraduate,
        award: req.award || req.student_award || req.user_award,
        programme: req.programme || req.student_programme
      });
      if (isDusScope) return !pg;
      if (isDpgsScope) return pg;
      return true;
    });

    const reqIds = reqRows.map(r => r.id).filter(Boolean);
    const approvalsByReqId = {};
    if (reqIds.length > 0) {
      const appRows = await db('department_approvals')
        .whereIn('clearance_request_id', reqIds)
        .orderBy('order_number', 'asc');
      for (const app of appRows) {
        if (!approvalsByReqId[app.clearance_request_id]) {
          approvalsByReqId[app.clearance_request_id] = [];
        }
        approvalsByReqId[app.clearance_request_id].push({
          office: app.department,
          status: app.status || 'PENDING',
          comment: app.comments || null,
          reviewedBy: app.approved_by || null,
          reviewedAt: app.approval_date ? new Date(app.approval_date).toISOString() : null
        });
      }
    }

    const requestList = reqRows.map(req => {
      const award = req.award || req.student_award || req.user_award || null;
      const programme = req.programme || req.student_programme || '';
      const isPg = isPostgraduateRecord({
        isPostgraduate: req.is_postgraduate || req.student_is_postgraduate || req.user_is_postgraduate,
        award,
        programme
      });
      return {
        id: String(req.id),
        studentId: String(req.student_id || req.linked_user_id || ''),
        studentName: req.user_full_name || req.student_full_name || 'Student',
        registrationNumber: req.student_reg_no || req.user_reg_no || '',
        email: req.user_email || '',
        college: req.college || req.user_college || '',
        department: req.department || req.user_department || '',
        programme,
        award,
        isPostgraduate: isPg,
        yearOfStudy: req.student_year_of_study || req.user_year_of_study || null,
        status: req.status,
        currentStage: req.current_stage,
        currentOffice: req.current_office,
        requestDate: req.submitted_at ? new Date(req.submitted_at).toISOString() : null,
        approvals: approvalsByReqId[req.id] || []
      };
    });

    // Compute registered student totals & year cohort breakdown (scoped for DUS/DPGS & college/department officers)
    const rawStudentUsers = await db('users')
      .where({ role: 'STUDENT' })
      .select('year_of_study', 'registration_number', 'award', 'programme', 'is_postgraduate', 'college', 'department');

    const studentUsers = rawStudentUsers.filter(u => {
      if (!academicScope.matchesUserAcademicScope(user, { college: u.college, department: u.department }, analyticsCatalogs)) {
        return false;
      }
      const pg = isPostgraduateRecord(u);
      if (isDusScope) return !pg;
      if (isDpgsScope) return pg;
      return true;
    });

    const totalRegisteredStudents = studentUsers.length;
    const registeredStudentsByYear = {};
    for (const u of studentUsers) {
      const y = u.year_of_study ? String(u.year_of_study).trim() : '';
      const reg = u.registration_number ? String(u.registration_number).trim() : '';
      let label = 'Year 2026';
      const yYearMatch = y.match(/20\d{2}/);
      const regYearMatch = reg.match(/20\d{2}/);
      if (yYearMatch) {
        label = `Year ${yYearMatch[0]}`;
      } else if (regYearMatch) {
        label = `Year ${regYearMatch[0]}`;
      } else if (/^\d+$/.test(y)) {
        const yrNum = parseInt(y, 10);
        label = `Year ${2026 - yrNum + 1}`;
      }
      registeredStudentsByYear[label] = (registeredStudentsByYear[label] || 0) + 1;
    }

    return {
      total: full.requests.total,
      completed: full.requests.completed,
      pending: full.requests.pending,
      rejected: full.requests.rejected,
      ...full,
      requestList,
      totalRegisteredStudents,
      registeredStudentsByYear
    };
  }

  /**
   * Map database records to standard ClearanceResponse matching Angular frontend
   */
  static mapToResponse(request, approvals = [], student = null, controlNumber = null) {
    const total = approvals.length;
    const approved = approvals.filter(a => a.status === 'APPROVED').length;
    const pending = approvals.filter(a => a.status === 'PENDING').length;
    const rejected = approvals.filter(a => a.status === 'REJECTED').length;

    const progressPercentage = total > 0 ? Math.round((approved * 100) / total) : 0;

    const approvalDTOs = approvals.map(a => ({
      id: String(a.id),
      departmentName: a.department,
      status: a.status,
      statusMessage: a.status === 'APPROVED' ? 'Approved' : (a.status === 'REJECTED' ? 'Rejected' : 'Waiting for review'),
      approvedBy: a.approved_by,
      approvalDate: a.approval_date,
      comments: a.comments,
      order: a.order_number
    }));

    return {
      requestId: String(request.id),
      studentId: String(request.student_id),
      registrationNumber: student?.registration_number || request.registration_number || '',
      studentName: student?.full_name || request.student_name || '',
      email: student?.email || request.student_email || null,
      phoneNumber: student?.phone_number || request.student_phone || null,
      programme: request.programme || student?.programme || '',
      faculty: request.college || student?.college || '',
      college: request.college || student?.college || '',
      department: request.department || student?.department || '',
      address: request.address || student?.address || null,
      physicalAddress: request.physical_address || student?.physical_address || null,
      hall: request.hall || student?.hall || null,
      wing: request.wing || student?.wing || null,
      block: request.block || student?.block || null,
      roomNumber: request.room_number || student?.room_number || null,
      sponsor: student?.sponsor || request.student_sponsor || null,
      photo: student?.photo || request.student_photo || null,
      controlNumber: controlNumber || null,
      control_number: controlNumber || null,
      award: request.award || student?.award || request.student_award || null,
      isPostgraduate: isPostgraduateRecord({
        isPostgraduate: request.is_postgraduate || student?.is_postgraduate || request.student_is_postgraduate,
        award: request.award || student?.award || request.student_award,
        programme: request.programme || student?.programme
      }),
      is_postgraduate: isPostgraduateRecord({
        isPostgraduate: request.is_postgraduate || student?.is_postgraduate || request.student_is_postgraduate,
        award: request.award || student?.award || request.student_award,
        programme: request.programme || student?.programme
      }),
      undergraduateCertificateUrl: request.undergraduate_certificate_url || student?.undergraduate_certificate_url || request.student_undergrad_cert_url || null,
      undergraduate_certificate_url: request.undergraduate_certificate_url || student?.undergraduate_certificate_url || request.student_undergrad_cert_url || null,
      status: request.status,
      currentStage: request.current_stage || 'Convocation',
      currentOffice: request.current_office || 'Convocation',
      progressPercentage,
      totalDepartments: total,
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      completedCount: approved,
      requestDate: request.submitted_at,
      approvals: approvalDTOs,
      statusMessage: request.status === 'COMPLETED' ? 'Completed' : (request.status === 'REJECTED' ? 'Rejected' : 'Waiting for review')
    };
  }
}

module.exports = ClearanceService;

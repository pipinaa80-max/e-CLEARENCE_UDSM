process.env.NODE_ENV = 'test';

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Phase 3: Core Clearance Workflow Engine Suite', () => {
  let request;
  let testDb;

  // Test accounts and tokens
  let studentUser, studentToken;
  let convocationOfficer, convocationToken;
  let libraryOfficer, libraryToken;
  let gamesCoach, gamesCoachToken;
  let usabOfficer, usabToken;
  let darusoOfficer, darusoToken;
  let deanOfStudents, deanToken;
  let smartCardOfficer, smartCardToken;
  let hallWarden, wardenToken;
  let deptOfficerCoICT, deptTokenCoICT;
  let deptOfficerWrong, deptTokenWrong;
  let lecturerCoICT, lecturerTokenCoICT;
  let principalCoICT, principalTokenCoICT;
  let principalWrong, principalTokenWrong;
  let financeOfficer, financeToken;
  let adminUser, adminToken;

  const TEST_REG_NO = '2022-04-99999';
  const PASSWORD = 'TestPassword123!';

  async function getActiveRequestId() {
    const db = testDb || getDb();
    const req = await db('clearance_requests').orderBy('id', 'desc').first();
    return req ? req.id : null;
  }

  async function createTestActor(userData) {
    const db = testDb || getDb();
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nameParts = (userData.full_name || 'Workflow User').split(' ');
    const firstName = nameParts[0] || 'Workflow';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    await db('users').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      ...userData,
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    const user = await db('users').where({ id: userId }).first();
    const sessionId = await createUserSession({ userId: user.id, deviceInfo: 'Workflow-Test-Runner', ipAddress: '127.0.0.1' });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    try {
      request = supertest(app);
      testDb = getDb();

    // Verify test database isolation
    assert.strictEqual(
      env.NODE_ENV,
      'test',
      'Phase 3 tests must run strictly with NODE_ENV=test'
    );
    assert.strictEqual(
      testDb.client.connectionSettings.database,
      'clearance_test_db',
      'Test suite must run strictly against clearance_test_db'
    );

    // Clean up any leftover test data
    await testDb('notifications').del();
    await testDb('audit_logs').del();
    await testDb('student_debt_flags').del();
    await testDb('department_approvals').del();
    await testDb('convocation_receipts').del();
    await testDb('clearance_requests').del();
    await testDb('students').whereRaw('LOWER(registration_number) LIKE ?', ['%99999%']).del();
    await testDb('user_sessions').del();
    await testDb('refresh_tokens').del();
    await testDb('users').where('username', 'like', 'wf_%').orWhere('email', 'like', '%wf_%').del();

    // 1. Student
    const stdActor = await createTestActor({
      username: 'wf_student',
      email: 'wf_student@udsm.ac.tz',
      full_name: 'Workflow Test Student',
      registration_number: TEST_REG_NO,
      role: 'STUDENT',
      college: 'College of Information and Communication Technologies (CoICT)',
      department: 'Department of Computer Science & Engineering',
      programme: 'BSc. Computer Science'
    });
    studentUser = stdActor.user;
    studentToken = stdActor.token;

    // Create student profile record
    await testDb('students').insert({
      id: `std-wf-${Date.now()}`,
      user_id: studentUser.id,
      registration_number: TEST_REG_NO,
      full_name: studentUser.full_name,
      college: studentUser.college,
      department: studentUser.department,
      programme: studentUser.programme,
      email: studentUser.email,
      clearance_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date()
    });

    // 2. Convocation Officer
    const convActor = await createTestActor({
      username: 'wf_convocation',
      email: 'wf_convocation@udsm.ac.tz',
      full_name: 'Convocation Reviewer',
      role: 'CONVOCATION_OFFICER'
    });
    convocationOfficer = convActor.user;
    convocationToken = convActor.token;

    // 3. Parallel Officers
    const libActor = await createTestActor({
      username: 'wf_library',
      email: 'wf_library@udsm.ac.tz',
      full_name: 'Library Officer',
      role: 'LIBRARY_OFFICER'
    });
    libraryOfficer = libActor.user;
    libraryToken = libActor.token;

    const gamesActor = await createTestActor({
      username: 'wf_games',
      email: 'wf_games@udsm.ac.tz',
      full_name: 'Games Coach',
      role: 'GAMES_COACH'
    });
    gamesCoach = gamesActor.user;
    gamesCoachToken = gamesActor.token;

    const usabActor = await createTestActor({
      username: 'wf_usab',
      email: 'wf_usab@udsm.ac.tz',
      full_name: 'USAB Officer',
      role: 'USAB_OFFICER'
    });
    usabOfficer = usabActor.user;
    usabToken = usabActor.token;

    const darusoActor = await createTestActor({
      username: 'wf_daruso',
      email: 'wf_daruso@udsm.ac.tz',
      full_name: 'DARUSO Officer',
      role: 'DARUSO_OFFICER'
    });
    darusoOfficer = darusoActor.user;
    darusoToken = darusoActor.token;

    const deanActor = await createTestActor({
      username: 'wf_dean',
      email: 'wf_dean@udsm.ac.tz',
      full_name: 'Dean of Students',
      role: 'DEAN_OF_STUDENTS'
    });
    deanOfStudents = deanActor.user;
    deanToken = deanActor.token;

    const cardActor = await createTestActor({
      username: 'wf_smartcard',
      email: 'wf_smartcard@udsm.ac.tz',
      full_name: 'Smart Card Officer',
      role: 'SMART_CARD_OFFICER'
    });
    smartCardOfficer = cardActor.user;
    smartCardToken = cardActor.token;

    const wardenActor = await createTestActor({
      username: 'wf_warden',
      email: 'wf_warden@udsm.ac.tz',
      full_name: 'Hall Warden',
      role: 'HALL_WARDEN'
    });
    hallWarden = wardenActor.user;
    wardenToken = wardenActor.token;

    // 4. Department Officer & Lecturer
    const deptActor = await createTestActor({
      username: 'wf_dept_coict',
      email: 'wf_dept_coict@udsm.ac.tz',
      full_name: 'CoICT CSE HOD',
      role: 'DEPARTMENT_OFFICER',
      college: 'College of Information and Communication Technologies (CoICT)',
      department: 'Department of Computer Science & Engineering'
    });
    deptOfficerCoICT = deptActor.user;
    deptTokenCoICT = deptActor.token;

    const deptWrongActor = await createTestActor({
      username: 'wf_dept_wrong',
      email: 'wf_dept_wrong@udsm.ac.tz',
      full_name: 'Wrong Department HOD',
      role: 'DEPARTMENT_OFFICER',
      college: 'College of Natural and Applied Sciences (CoNAS)',
      department: 'Department of Physics'
    });
    deptOfficerWrong = deptWrongActor.user;
    deptTokenWrong = deptWrongActor.token;

    const lecActor = await createTestActor({
      username: 'wf_lecturer_coict',
      email: 'wf_lecturer_coict@udsm.ac.tz',
      full_name: 'Dr. Lecturer CoICT',
      role: 'LECTURER',
      college: 'College of Information and Communication Technologies (CoICT)',
      department: 'Department of Computer Science & Engineering'
    });
    lecturerCoICT = lecActor.user;
    lecturerTokenCoICT = lecActor.token;

    // 5. Principal
    const princActor = await createTestActor({
      username: 'wf_principal_coict',
      email: 'wf_principal_coict@udsm.ac.tz',
      full_name: 'Principal CoICT',
      role: 'PRINCIPAL',
      college: 'College of Information and Communication Technologies (CoICT)'
    });
    principalCoICT = princActor.user;
    principalTokenCoICT = princActor.token;

    const princWrongActor = await createTestActor({
      username: 'wf_principal_wrong',
      email: 'wf_principal_wrong@udsm.ac.tz',
      full_name: 'Principal CoET',
      role: 'PRINCIPAL',
      college: 'College of Engineering and Technology (CoET)'
    });
    principalWrong = princWrongActor.user;
    principalTokenWrong = princWrongActor.token;

    // 6. Finance Officer
    const finActor = await createTestActor({
      username: 'wf_finance',
      email: 'wf_finance@udsm.ac.tz',
      full_name: 'University Bursar',
      role: 'FINANCE_OFFICER'
    });
    financeOfficer = finActor.user;
    financeToken = finActor.token;

    // 7. Administrator
    const admActor = await createTestActor({
      username: 'wf_admin',
      email: 'wf_admin@udsm.ac.tz',
      full_name: 'System Administrator',
      role: 'ADMINISTRATOR'
    });
    adminUser = admActor.user;
    adminToken = admActor.token;
    } catch (err) {
      console.error('CRITICAL BEFORE HOOK ERROR:', err);
      throw err;
    }
  });

  // =========================================================================
  // 1. Student Clearance Request Creation & Initial State
  // =========================================================================
  describe('1. Clearance Request Submission & Structure', () => {
    let createdRequestId;

    it('Student submits clearance request successfully', async () => {
      const res = await request
        .post('/api/v1/clearance/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentName: studentUser.full_name,
          registrationNumber: TEST_REG_NO,
          programme: 'BSc. Computer Science',
          college: 'College of Information and Communication Technologies (CoICT)',
          department: 'Department of Computer Science & Engineering',
          hall: 'Hall 5',
          roomNumber: 'A-12',
          phoneNumber: '+255711999999',
          sponsor: 'HESLB'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.requestId);
      createdRequestId = res.body.requestId;
    });

    it('Verifies initial stage is Convocation and all required approval records exist', async () => {
      const res = await request
        .get('/api/v1/clearance/my-request')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'PENDING');
      assert.strictEqual(res.body.currentStage, 'Convocation');
      assert.strictEqual(res.body.currentOffice, 'Convocation');
      assert.strictEqual(res.body.totalDepartments, 11); // Convocation + 7 Parallel + Department + Principal + Finance
      assert.strictEqual(res.body.approvedCount, 0);
      assert.strictEqual(res.body.progressPercentage, 0);

      // Verify Convocation is order 1
      const convApproval = res.body.approvals.find(a => a.departmentName === 'Convocation');
      assert.ok(convApproval);
      assert.strictEqual(convApproval.status, 'PENDING');
      assert.strictEqual(convApproval.order, 1);
    });

    it('Prevents duplicate pending clearance requests for the same student', async () => {
      const res = await request
        .post('/api/v1/clearance/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          registrationNumber: TEST_REG_NO
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.message, /already have a pending clearance request/i);
    });

    it('Unauthorized request rejected with 401', async () => {
      const res = await request
        .post('/api/v1/clearance/request')
        .send({ registrationNumber: TEST_REG_NO });

      assert.strictEqual(res.status, 401);
    });
  });

  // =========================================================================
  // 2. Stage 1: Convocation Review, Rejection & Approval
  // =========================================================================
  describe('2. Stage 1: Convocation Review & Gating', () => {
    let clearanceReqId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Parallel office cannot approve while Stage 1 (Convocation) is pending', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Library',
          comments: 'Early approval attempt'
        });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /Convocation clearance must be approved before parallel offices can approve/i);
    });

    it('Department cannot approve while Stage 1 (Convocation) is pending', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deptTokenCoICT}`)
        .send({
          requestId: clearanceReqId,
          office: 'Department',
          comments: 'Early dept approval attempt'
        });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /parallel offices must approve before Department/i);
    });

    it('Finance strictly locked while Stage 1 is pending', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Finance',
          comments: 'Early finance attempt'
        });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /Finance clearance is locked/i);
    });

    it('Convocation Officer can reject clearance with mandatory reason', async () => {
      const res = await request
        .post('/api/v1/clearance/office/reject')
        .set('Authorization', `Bearer ${convocationToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Convocation',
          reason: 'Convocation fee payment receipt not found in bank records.'
        });

      assert.strictEqual(res.status, 200);

      // Verify request is marked REJECTED
      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.status, 'REJECTED');
    });

    it('Student submits convocation payment receipt (auto-approves Stage 1 and unblocks Stage 2)', async () => {
      const res = await request
        .post('/api/v1/convocation/submit-receipt')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: studentUser.id,
          controlNumber: '991234567890',
          receiptNumber: 'REC-UDSM-CONV-001',
          paymentDate: '2026-11-10'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.receipt.status, 'APPROVED');

      // Verify clearance request automatically moved to Parallel stage (Finance verifies at final stage)
      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.current_stage, 'Parallel');
      assert.strictEqual(reqRecord.status, 'PENDING');
    });

    it('Finance Officer can inspect submitted convocation receipts', async () => {
      const pendingRes = await request
        .get('/api/v1/convocation/pending')
        .set('Authorization', `Bearer ${financeToken}`);

      assert.strictEqual(pendingRes.status, 200);
      assert.ok(pendingRes.body.receipts.length > 0);
      assert.strictEqual(pendingRes.body.receipts[0].controlNumber, '991234567890');
      assert.strictEqual(pendingRes.body.receipts[0].status, 'APPROVED');
    });
  });

  // =========================================================================
  // 3. Stage 2: Parallel Offices Independence & Progression
  // =========================================================================
  describe('3. Stage 2: Independent Parallel Office Approvals', () => {
    let clearanceReqId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Smart Card must approve first before other parallel offices can approve', async () => {
      // Attempting Library approval BEFORE Smart Card should be blocked (409)
      const blockedLib = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({ requestId: clearanceReqId, office: 'Library', comments: 'Attempting before Smart Card' });
      assert.strictEqual(blockedLib.status, 409);
      assert.match(blockedLib.body.message, /Smart Card approval is required first/i);

      // Smart Card approves first and unlocks remaining parallel offices
      const cardRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${smartCardToken}`)
        .send({ requestId: clearanceReqId, office: 'Smart Card', comments: 'ID Card deactivated' });
      assert.strictEqual(cardRes.status, 200);
    });

    it('Remaining parallel offices can approve independently in any order after Smart Card', async () => {
      // 1. Library approves
      const libRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({ requestId: clearanceReqId, office: 'Library', comments: 'No overdue books' });
      assert.strictEqual(libRes.status, 200);

      // 2. Games Coach approves
      const gamesRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${gamesCoachToken}`)
        .send({ requestId: clearanceReqId, office: 'Games Coach', comments: 'Sports gear returned' });
      assert.strictEqual(gamesRes.status, 200);

      // 3. Hall Warden approves
      const wardenRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${wardenToken}`)
        .send({ requestId: clearanceReqId, office: 'Hall Warden', comments: 'Keys handed over' });
      assert.strictEqual(wardenRes.status, 200);
    });

    it('Department cannot approve while parallel offices are partially complete', async () => {
      // 4 of 7 parallel offices approved, 3 remain
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deptTokenCoICT}`)
        .send({ requestId: clearanceReqId, office: 'Department' });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /All parallel offices must approve before Department/i);
    });

    it('Remaining parallel offices complete their approvals', async () => {
      // 4. USAB
      const usabRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${usabToken}`)
        .send({ requestId: clearanceReqId, office: 'USAB', comments: 'Medical records cleared' });
      assert.strictEqual(usabRes.status, 200);

      // 5. DARUSO
      const darusoRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${darusoToken}`)
        .send({ requestId: clearanceReqId, office: 'DARUSO', comments: 'Student union dues paid' });
      assert.strictEqual(darusoRes.status, 200);

      // 6. Dean of Students
      const deanRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deanToken}`)
        .send({ requestId: clearanceReqId, office: 'Dean of Students', comments: 'Conduct satisfactory' });
      assert.strictEqual(deanRes.status, 200);

      // Check stage has automatically advanced to Department
      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.current_stage, 'Department');
    });

    it('Duplicate approval on an already approved office returns success idempotently without duplicate records', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({ requestId: clearanceReqId, office: 'Library', comments: 'Repeat call' });

      assert.strictEqual(res.status, 200);
      assert.match(res.body.message, /already approved/i);

      // Verify count in database
      const count = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId, department: 'Library' })
        .count('id as c');
      assert.strictEqual(count[0].c, 1);
    });
  });

  // =========================================================================
  // 4. Stage 3: Department Approval & Lecturer Debt Flagging
  // =========================================================================
  describe('4. Stage 3: Department Review, Scope & Lecturer Debt Flags', () => {
    let clearanceReqId;
    let createdFlagId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Lecturer flags student with an outstanding lab equipment debt', async () => {
      const res = await request
        .post('/api/v1/student-debts')
        .set('Authorization', `Bearer ${lecturerTokenCoICT}`)
        .send({
          registrationNumber: TEST_REG_NO,
          studentName: studentUser.full_name,
          amount: 85000,
          category: 'Laboratory Equipment',
          reason: 'Unreturned FPGA Development Board (Altera DE10-Lite)',
          dueDate: '2026-11-20'
        });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.status, 'OPEN');
      createdFlagId = res.body.id;
    });

    it('Department approval is BLOCKED while student has open debt/liability flags', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deptTokenCoICT}`)
        .send({
          requestId: clearanceReqId,
          office: 'Department',
          comments: 'Attempting approval while debt open'
        });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /student has open debt\/liability records/i);
    });

    it('Department Officer from a different department cannot approve', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deptTokenWrong}`)
        .send({
          requestId: clearanceReqId,
          office: 'Department'
        });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /cannot approve clearance for student in/i);
    });

    it('Lecturer resolves the debt flag', async () => {
      const res = await request
        .patch(`/api/v1/student-debts/${createdFlagId}/resolve`)
        .set('Authorization', `Bearer ${lecturerTokenCoICT}`)
        .send({
          resolutionNote: 'FPGA board inspected and returned in working order.'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'RESOLVED');
    });

    it('Department Officer approves clearance and advances stage to Principal', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${deptTokenCoICT}`)
        .send({
          requestId: clearanceReqId,
          office: 'Department',
          comments: 'Final FYP report submitted and defense passed.'
        });

      assert.strictEqual(res.status, 200);

      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.current_stage, 'Principal');
    });
  });

  // =========================================================================
  // 5. Stage 4: Principal Approval & College Scope
  // =========================================================================
  describe('5. Stage 4: Principal Endorsement', () => {
    let clearanceReqId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Principal from a different college cannot approve', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${principalTokenWrong}`)
        .send({
          requestId: clearanceReqId,
          office: 'Principal'
        });

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /cannot approve clearance for student in/i);
    });

    it('Finance strictly locked while Principal is pending', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Finance'
        });

      assert.strictEqual(res.status, 409);
      assert.match(res.body.message, /Finance clearance is locked/i);
    });

    it('Principal of student college approves clearance and advances stage to Finance', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${principalCoICT.token || principalTokenCoICT}`)
        .send({
          requestId: clearanceReqId,
          office: 'Principal',
          comments: 'College academic board endorsement granted.'
        });

      assert.strictEqual(res.status, 200);

      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.current_stage, 'Finance');
    });
  });

  // =========================================================================
  // 6. Stage 5: Finance Final Approval & Completion
  // =========================================================================
  describe('6. Stage 5: Finance Approval & Full Completion', () => {
    let clearanceReqId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Finance Officer approves final clearance and completes request', async () => {
      const res = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Finance',
          comments: 'Tuition fees, caution money, and convocation dues confirmed clear.'
        });

      assert.strictEqual(res.status, 200);

      // Verify clearance request is COMPLETED
      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.status, 'COMPLETED');
      assert.strictEqual(reqRecord.current_stage, 'Completed');
      assert.strictEqual(reqRecord.current_office, 'Completed');

      // Verify student clearance_status is updated to CLEARED
      const studentRecord = await testDb('students').where({ user_id: studentUser.id }).first();
      assert.strictEqual(studentRecord.clearance_status, 'CLEARED');
    });

    it('Student can view fully completed clearance status and 100% progress', async () => {
      const res = await request
        .get('/api/v1/clearance/my-request')
        .set('Authorization', `Bearer ${studentToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'COMPLETED');
      assert.strictEqual(res.body.currentStage, 'Completed');
      assert.strictEqual(res.body.progressPercentage, 100);
      assert.strictEqual(res.body.approvedCount, 11);
      assert.strictEqual(res.body.pendingCount, 0);
      assert.strictEqual(res.body.rejectedCount, 0);
    });

    it('Verifies audit log and notifications recorded accurately', async () => {
      const logs = await testDb('audit_logs')
        .where({ user_id: String(financeOfficer.id) })
        .andWhere({ action: 'APPROVE_CLEARANCE' });
      assert.ok(logs.length > 0);

      const notifications = await testDb('notifications')
        .where({ user_id: String(studentUser.id) })
        .andWhere({ title: 'Clearance Complete!' });
      assert.ok(notifications.length > 0);
    });
  });

  // =========================================================================
  // 7. Rejection, Resubmission, Withdrawal & Integrity Scenarios
  // =========================================================================
  describe('7. Rejection, Resubmission, Withdrawal & Integrity Scenarios', () => {
    let clearanceReqId;

    beforeEach(async () => {
      clearanceReqId = await getActiveRequestId();
    });

    it('Unauthorized attempt by student or unauthenticated client to withdraw or approve is rejected', async () => {
      // 1. Unauthenticated request -> 401
      const unauthRes = await request
        .post('/api/v1/clearance/office/withdraw')
        .send({ requestId: clearanceReqId, office: 'Finance' });
      assert.strictEqual(unauthRes.status, 401);

      // 2. Student trying to call officer withdraw -> 403
      const studentRes = await request
        .post('/api/v1/clearance/office/withdraw')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ requestId: clearanceReqId, office: 'Finance' });
      assert.strictEqual(studentRes.status, 403);

      // 3. Student trying to call officer approve -> 403
      const studentApproveRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ requestId: clearanceReqId, office: 'Finance' });
      assert.strictEqual(studentApproveRes.status, 403);
    });

    it('Officer withdraws decision: restores office to PENDING, recalculates stage, and does NOT affect unrelated offices', async () => {
      // Snapshot state of all approvals before withdrawal
      const approvalsBefore = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId });
      const nonFinanceBefore = approvalsBefore.filter(a => a.department !== 'Finance');
      assert.strictEqual(nonFinanceBefore.length, 10);
      assert.ok(nonFinanceBefore.every(a => a.status === 'APPROVED'));

      // Finance Officer withdraws their approval
      const withdrawRes = await request
        .post('/api/v1/clearance/office/withdraw')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ requestId: clearanceReqId, office: 'Finance' });
      assert.strictEqual(withdrawRes.status, 200);
      assert.strictEqual(withdrawRes.body.success, true);

      // Verify Finance approval row is now PENDING with null review fields
      const financeApp = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId, department: 'Finance' })
        .first();
      assert.strictEqual(financeApp.status, 'PENDING');
      assert.strictEqual(financeApp.approved_by, null);
      assert.strictEqual(financeApp.approval_date, null);

      // Verify request status and stage returned to Finance
      const reqRecord = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqRecord.status, 'PENDING');
      assert.strictEqual(reqRecord.current_stage, 'Finance');

      // Verify student clearance status returned to PENDING
      const studentRecord = await testDb('students').where({ user_id: studentUser.id }).first();
      assert.strictEqual(studentRecord.clearance_status, 'PENDING');

      // CRITICAL: Verify ALL 10 unrelated offices remain APPROVED and completely untouched!
      const approvalsAfter = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId });
      const nonFinanceAfter = approvalsAfter.filter(a => a.department !== 'Finance');
      assert.strictEqual(nonFinanceAfter.length, 10);
      for (const beforeApp of nonFinanceBefore) {
        const afterApp = nonFinanceAfter.find(a => a.department === beforeApp.department);
        assert.ok(afterApp, `Office ${beforeApp.department} must exist`);
        assert.strictEqual(afterApp.status, 'APPROVED', `Office ${beforeApp.department} must remain APPROVED`);
        assert.strictEqual(afterApp.approved_by, beforeApp.approved_by);
      }

      // Verify audit log for WITHDRAW_CLEARANCE
      const auditLog = await testDb('audit_logs')
        .where({ user_id: String(financeOfficer.id), action: 'WITHDRAW_CLEARANCE' })
        .first();
      assert.ok(auditLog);
    });

    it('Finance Officer rejects clearance; student resubmits bank receipt, resetting only Finance and preserving all other approvals', async () => {
      // 1. Finance Officer rejects with specific reason
      const rejectRes = await request
        .post('/api/v1/clearance/office/reject')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Finance',
          reason: 'Outstanding tuition fee arrears of TZS 250,000 found in SARIS ledger.'
        });
      assert.strictEqual(rejectRes.status, 200);

      // Verify request is marked REJECTED
      const reqAfterReject = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqAfterReject.status, 'REJECTED');
      assert.strictEqual(reqAfterReject.current_office, 'Finance');

      const financeAppReject = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId, department: 'Finance' })
        .first();
      assert.strictEqual(financeAppReject.status, 'REJECTED');
      assert.match(financeAppReject.comments, /tuition fee arrears/i);

      // 2. Student resubmits bank payment receipt
      const resubmitRes = await request
        .post('/api/v1/clearance/submit-finance-receipt')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          note: 'Paid arrears via CRDB Bank on 2026-11-11, Control No: 991234567890, Receipt: CRDB-REC-77889'
        });
      assert.strictEqual(resubmitRes.status, 200);
      assert.strictEqual(resubmitRes.body.success, true);

      // 3. Verify request returned to PENDING with current stage Finance
      const reqAfterResubmit = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqAfterResubmit.status, 'PENDING');
      assert.strictEqual(reqAfterResubmit.current_stage, 'Finance');
      assert.strictEqual(reqAfterResubmit.current_office, 'Finance');

      // 4. Verify Finance approval returned to PENDING with student receipt note
      const financeAppResubmit = await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId, department: 'Finance' })
        .first();
      assert.strictEqual(financeAppResubmit.status, 'PENDING');
      assert.match(financeAppResubmit.comments, /CRDB-REC-77889/);

      // 5. CRITICAL: Verify none of the 10 other offices were affected by Finance resubmission
      const allApprovals = await testDb('department_approvals').where({ clearance_request_id: clearanceReqId });
      const nonFinance = allApprovals.filter(a => a.department !== 'Finance');
      assert.strictEqual(nonFinance.length, 10);
      assert.ok(nonFinance.every(a => a.status === 'APPROVED'), 'All 10 non-Finance offices must stay APPROVED');

      // 6. Finance Officer verifies and approves -> completes request again
      const finalApproveRes = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({
          requestId: clearanceReqId,
          office: 'Finance',
          comments: 'Arrears payment verified and cleared.'
        });
      assert.strictEqual(finalApproveRes.status, 200);

      const reqFinal = await testDb('clearance_requests').where({ id: clearanceReqId }).first();
      assert.strictEqual(reqFinal.status, 'COMPLETED');
      assert.strictEqual(reqFinal.current_stage, 'Completed');

      const stdFinal = await testDb('students').where({ user_id: studentUser.id }).first();
      assert.strictEqual(stdFinal.clearance_status, 'CLEARED');
    });

    it('Convocation receipt rejection followed by new receipt submission and approval cycle', async () => {
      // 1. Create a second test student with their own clearance request
      const std2Actor = await createTestActor({
        username: 'wf_student2',
        email: 'wf_student2@udsm.ac.tz',
        full_name: 'Workflow Student Two',
        registration_number: '2026-04-TEST99998',
        role: 'STUDENT',
        college: 'College of Information and Communication Technologies (CoICT)',
        department: 'Department of Computer Science & Engineering',
        programme: 'BSc. Computer Science'
      });

      await testDb('students').insert({
        id: `std-wf2-${Date.now()}`,
        user_id: std2Actor.user.id,
        registration_number: '2026-04-TEST99998',
        full_name: std2Actor.user.full_name,
        college: std2Actor.user.college,
        department: std2Actor.user.department,
        programme: std2Actor.user.programme,
        email: std2Actor.user.email,
        clearance_status: 'PENDING',
        created_at: new Date(),
        updated_at: new Date()
      });

      const submitRes = await request
        .post('/api/v1/clearance/request')
        .set('Authorization', `Bearer ${std2Actor.token}`)
        .send({
          studentName: std2Actor.user.full_name,
          registrationNumber: '2026-04-TEST99998',
          programme: 'BSc. Computer Science',
          college: 'College of Information and Communication Technologies (CoICT)',
          department: 'Department of Computer Science & Engineering',
          hall: 'Hall 2'
        });
      assert.strictEqual(submitRes.status, 200);
      const req2Id = submitRes.body.requestId;

      // 2. Student 2 submits first convocation receipt (auto-approved on submission)
      const receiptRes1 = await request
        .post('/api/v1/convocation/submit-receipt')
        .set('Authorization', `Bearer ${std2Actor.token}`)
        .send({
          studentId: std2Actor.user.id,
          controlNumber: '991122334455',
          receiptNumber: 'REC-BLURRY-001',
          paymentDate: '2026-11-10'
        });
      assert.strictEqual(receiptRes1.status, 200);

      // Find receipt
      const receipt1 = await testDb('convocation_receipts').where({ receipt_number: 'REC-BLURRY-001' }).first();
      assert.ok(receipt1);
      assert.strictEqual(receipt1.status, 'APPROVED');

      // 3. Finance Officer REJECTS the invalid control number / receipt
      const rejectReceiptRes = await request
        .post(`/api/v1/convocation/reject/${receipt1.id}`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reason: 'Receipt scan is blurry and illegible. Please re-upload a clear copy.' });
      assert.strictEqual(rejectReceiptRes.status, 200);

      // Verify receipt is marked REJECTED
      const receipt1After = await testDb('convocation_receipts').where({ id: receipt1.id }).first();
      assert.strictEqual(receipt1After.status, 'REJECTED');

      // Verify request was rolled back to Convocation stage (cannot advance until resubmitted)
      const req2State = await testDb('clearance_requests').where({ id: req2Id }).first();
      assert.strictEqual(req2State.current_stage, 'Convocation');
      assert.strictEqual(req2State.status, 'REJECTED');

      // 4. Student 2 submits a clear second receipt (auto-approves and advances to Parallel immediately)
      const receiptRes2 = await request
        .post('/api/v1/convocation/submit-receipt')
        .set('Authorization', `Bearer ${std2Actor.token}`)
        .send({
          studentId: std2Actor.user.id,
          controlNumber: '991122334455',
          receiptNumber: 'REC-CLEAR-002',
          paymentDate: '2026-11-11'
        });
      assert.strictEqual(receiptRes2.status, 200);

      const receipt2 = await testDb('convocation_receipts').where({ receipt_number: 'REC-CLEAR-002' }).first();
      assert.ok(receipt2);
      assert.strictEqual(receipt2.status, 'APPROVED');

      // Verify clearance request moved to Parallel stage automatically!
      const req2Advanced = await testDb('clearance_requests').where({ id: req2Id }).first();
      assert.strictEqual(req2Advanced.current_stage, 'Parallel');
      assert.strictEqual(req2Advanced.status, 'PENDING');
    });
  });

  after(async () => {
    // Teardown all test data created in testDb
    await testDb('notifications').del();
    await testDb('audit_logs').del();
    await testDb('student_debt_flags').del();
    await testDb('department_approvals').del();
    await testDb('convocation_receipts').del();
    await testDb('clearance_requests').del();
    await testDb('students').whereRaw('LOWER(registration_number) LIKE ?', ['%99999%']).del();
    await testDb('user_sessions').del();
    await testDb('refresh_tokens').del();
    await testDb('users').where('username', 'like', 'wf_%').orWhere('email', 'like', '%wf_%').del();
    await testDb.destroy();
  });
});

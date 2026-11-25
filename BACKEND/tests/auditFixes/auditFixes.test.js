process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');
const supertest = require('supertest');
const app = require('../../src/app');
const env = require('../../src/config/env');
const { getDb } = require('../../src/config/database');
const ClearanceService = require('../../src/services/clearance.service');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Audit Follow-Up Fixes Verification Suite (4 Fixes)', () => {
  let request;
  let testDb;

  let administrator, administratorToken;
  let dusDirector, dusToken;
  let student, studentToken;
  let smartCardOfficer, smartCardToken;
  let libraryOfficer, libraryToken;
  let cseDeptOfficer, cseDeptToken;
  let mechDeptOfficer, mechDeptToken;

  let createdSponsorId;
  let clearanceReqId;

  async function createActor(userData) {
    const db = testDb || getDb();
    const hashedPassword = await hashPassword('AuditPass123!');
    const userId = `usr-af-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const parts = (userData.full_name || 'Audit User').split(' ');

    await db('users').insert({
      id: userId,
      first_name: parts[0] || 'Audit',
      last_name: parts.slice(1).join(' ') || 'User',
      ...userData,
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    const user = await db('users').where({ id: userId }).first();
    const sessionId = await createUserSession({
      userId: user.id,
      deviceInfo: 'AuditFixes-Test-Runner',
      ipAddress: '127.0.0.1'
    });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    request = supertest(app);
    testDb = getDb();

    await testDb('sponsors').where('name', 'like', 'AuditTestSponsor%').del();
    await testDb('convocation_receipts').where('control_number', 'like', '99AF%').del();
    await testDb('department_approvals')
      .whereIn('clearance_request_id', testDb('clearance_requests').select('id').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-AF%')))
      .del();
    await testDb('clearance_requests').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-AF%')).del();
    await testDb('students').where('registration_number', 'like', '2026-04-AF%').del();
    await testDb('users').where('username', 'like', 'af_test_%').del();

    const admin = await createActor({
      username: 'af_test_administrator',
      email: 'af_test_administrator@udsm.ac.tz',
      full_name: 'Audit Administrator',
      role: 'ADMINISTRATOR'
    });
    administrator = admin.user;
    administratorToken = admin.token;

    const dus = await createActor({
      username: 'af_test_dus',
      email: 'af_test_dus@udsm.ac.tz',
      full_name: 'Audit DUS Director',
      role: 'DIRECTOR_OF_UNDERGRADUATE_STUDIES'
    });
    dusDirector = dus.user;
    dusToken = dus.token;

    const std = await createActor({
      username: 'af_test_student',
      email: 'af_test_student@udsm.ac.tz',
      full_name: 'Audit Student CSE',
      registration_number: '2026-04-AF0001',
      role: 'STUDENT',
      college: 'College of Information and Communication Technologies (CoICT)',
      department: 'Department of Computer Science and Engineering',
      programme: 'BSc. Computer Science',
      year_of_study: '2026'
    });
    student = std.user;
    studentToken = std.token;

    const sc = await createActor({
      username: 'af_test_smartcard',
      email: 'af_test_smartcard@udsm.ac.tz',
      full_name: 'Audit Smart Card',
      role: 'SMART_CARD_OFFICER'
    });
    smartCardOfficer = sc.user;
    smartCardToken = sc.token;

    const lib = await createActor({
      username: 'af_test_library',
      email: 'af_test_library@udsm.ac.tz',
      full_name: 'Audit Library',
      role: 'LIBRARY_OFFICER'
    });
    libraryOfficer = lib.user;
    libraryToken = lib.token;

    // Officer assigned acronym "CSE" (must match "Department of Computer Science and Engineering")
    const cse = await createActor({
      username: 'af_test_dept_cse',
      email: 'af_test_dept_cse@udsm.ac.tz',
      full_name: 'Audit HOD CSE',
      role: 'DEPARTMENT_OFFICER',
      college: 'CoICT',
      department: 'CSE'
    });
    cseDeptOfficer = cse.user;
    cseDeptToken = cse.token;

    const mech = await createActor({
      username: 'af_test_dept_mech',
      email: 'af_test_dept_mech@udsm.ac.tz',
      full_name: 'Audit HOD Mechanical',
      role: 'DEPARTMENT_OFFICER',
      college: 'CoET',
      department: 'Mechanical Engineering'
    });
    mechDeptOfficer = mech.user;
    mechDeptToken = mech.token;
  });

  after(async () => {
    if (createdSponsorId) {
      await testDb('sponsors').where({ id: createdSponsorId }).del();
    }
    await testDb('sponsors').where('name', 'like', 'AuditTestSponsor%').del();
    await testDb('convocation_receipts').where('control_number', 'like', '99AF%').del();
    await testDb('notifications').whereIn('user_id', [student?.id].filter(Boolean)).del();
    await testDb('department_approvals')
      .whereIn('clearance_request_id', testDb('clearance_requests').select('id').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-AF%')))
      .del();
    await testDb('clearance_requests').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-AF%')).del();
    await testDb('students').where('registration_number', 'like', '2026-04-AF%').del();
    await testDb('user_sessions')
      .whereIn('user_id', [administrator?.id, dusDirector?.id, student?.id, smartCardOfficer?.id, libraryOfficer?.id, cseDeptOfficer?.id, mechDeptOfficer?.id].filter(Boolean))
      .del();
    await testDb('users').where('username', 'like', 'af_test_%').del();
    await testDb.destroy();
  });

  describe('Fix 1: ADMINISTRATOR role access on /api/v1/sponsors/*', () => {
    it('Allows ADMINISTRATOR to list all sponsors and create/update/delete a sponsor', async () => {
      const listRes = await request
        .get('/api/v1/sponsors/all')
        .set('Authorization', `Bearer ${administratorToken}`);
      assert.strictEqual(listRes.status, 200);
      assert.ok(Array.isArray(listRes.body));

      const createRes = await request
        .post('/api/v1/sponsors')
        .set('Authorization', `Bearer ${administratorToken}`)
        .send({ name: 'AuditTestSponsor_2026', code: 'ATS26', description: 'Audit verification sponsor' });
      assert.strictEqual(createRes.status, 201);
      createdSponsorId = createRes.body.id;

      const updateRes = await request
        .put(`/api/v1/sponsors/${createdSponsorId}`)
        .set('Authorization', `Bearer ${administratorToken}`)
        .send({ description: 'Updated by ADMINISTRATOR' });
      assert.strictEqual(updateRes.status, 200);

      const delRes = await request
        .delete(`/api/v1/sponsors/${createdSponsorId}`)
        .set('Authorization', `Bearer ${administratorToken}`);
      assert.strictEqual(delRes.status, 204);
    });
  });

  describe('Fix 3: Acronym, prefix & catalog-aware Department & College scope matching', () => {
    it('Matches acronyms, prefixes, CS aliases, and catalog codes accurately', async () => {
      const depts = await testDb('departments').where({ is_active: 1 }).select('code', 'name');
      const cols = await testDb('colleges').where({ is_active: 1 }).select('code', 'name');

      assert.strictEqual(
        ClearanceService.matchesDepartmentScope('Department of Computer Science and Engineering', 'CSE', depts),
        true
      );
      assert.strictEqual(
        ClearanceService.matchesDepartmentScope('Department of Computer Science & Engineering', 'DoCSE', depts),
        true
      );
      assert.strictEqual(
        ClearanceService.matchesDepartmentScope('Department of Electronics and Telecommunications Engineering', 'ETE', depts),
        true
      );
      assert.strictEqual(
        ClearanceService.matchesDepartmentScope('Department of Computer Science and Engineering', 'Mechanical Engineering', depts),
        false
      );

      assert.strictEqual(
        ClearanceService.matchesCollegeScope('College of Information and Communication Technologies (CoICT)', 'CoICT', cols),
        true
      );
      assert.strictEqual(
        ClearanceService.matchesCollegeScope('College of Engineering and Technology', 'CoET', cols),
        true
      );
      assert.strictEqual(
        ClearanceService.matchesCollegeScope('College of Information and Communication Technologies (CoICT)', 'CoET', cols),
        false
      );
    });
  });

  describe('Fix 4 & Fix 2: Smart Card pre-gate in Stage 2 + Analytics Summary dual compatibility', () => {
    it('Enforces Smart Card first in Stage 2 queue and approval, then unlocks Library', async () => {
      const submitRes = await request
        .post('/api/v1/clearance/request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentName: student.full_name,
          registrationNumber: student.registration_number,
          college: student.college,
          department: student.department,
          programme: student.programme,
          hall: 'Hall 1'
        });
      assert.strictEqual(submitRes.status, 200);
      clearanceReqId = submitRes.body.requestId;

      // Auto-approve Stage 1 (Convocation) via control number submission
      const convRes = await request
        .post('/api/v1/convocation/submit-receipt')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: student.id,
          controlNumber: '99AF12345678',
          receiptNumber: 'REC-AF-001',
          paymentDate: '2026-11-24'
        });
      assert.strictEqual(convRes.status, 200);

      // Before Smart Card approves: Smart Card sees it, Library does NOT see it in pending queue
      const scQueue = await request
        .get('/api/v1/clearance/office/requests?office=Smart%20Card&status=PENDING')
        .set('Authorization', `Bearer ${smartCardToken}`);
      assert.strictEqual(scQueue.status, 200);
      assert.ok(scQueue.body.some(r => String(r.requestId) === String(clearanceReqId)));

      const libQueueBefore = await request
        .get('/api/v1/clearance/office/requests?office=Library&status=PENDING')
        .set('Authorization', `Bearer ${libraryToken}`);
      assert.strictEqual(libQueueBefore.status, 200);
      assert.strictEqual(libQueueBefore.body.some(r => String(r.requestId) === String(clearanceReqId)), false);

      // Library approval attempt before Smart Card returns 409
      const libBlocked = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({ requestId: clearanceReqId, office: 'Library' });
      assert.strictEqual(libBlocked.status, 409);

      // Smart Card approves
      const scApprove = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${smartCardToken}`)
        .send({ requestId: clearanceReqId, office: 'Smart Card', comments: 'Card returned' });
      assert.strictEqual(scApprove.status, 200);

      // Now Library sees it in pending queue and can approve
      const libQueueAfter = await request
        .get('/api/v1/clearance/office/requests?office=Library&status=PENDING')
        .set('Authorization', `Bearer ${libraryToken}`);
      assert.strictEqual(libQueueAfter.status, 200);
      assert.ok(libQueueAfter.body.some(r => String(r.requestId) === String(clearanceReqId)));

      const libApprove = await request
        .post('/api/v1/clearance/office/approve')
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({ requestId: clearanceReqId, office: 'Library', comments: 'Books cleared' });
      assert.strictEqual(libApprove.status, 200);
    });

    it('Returns both Phase-4 summary counts AND DUS Director requestList/registeredStudentsByYear on /analytics-summary', async () => {
      const res = await request
        .get('/api/v1/clearance/analytics-summary')
        .set('Authorization', `Bearer ${dusToken}`);

      assert.strictEqual(res.status, 200);
      // Phase-4 contract preserved
      assert.ok(res.body.requests && typeof res.body.requests.total === 'number');
      // DUS Director contract added
      assert.ok(Array.isArray(res.body.requestList));
      assert.ok(res.body.requestList.some(r => String(r.id) === String(clearanceReqId)));
      assert.ok(typeof res.body.totalRegisteredStudents === 'number' && res.body.totalRegisteredStudents >= 1);
      assert.ok(res.body.registeredStudentsByYear && typeof res.body.registeredStudentsByYear === 'object');
    });

    it('Enforces acronym-aware Department scope in getOfficeRequests (CSE sees request; Mechanical does not)', async () => {
      // Mark all remaining parallel offices approved so Department stage is visible
      await testDb('department_approvals')
        .where({ clearance_request_id: clearanceReqId })
        .whereNotIn('department', ['Department', 'Principal', 'Finance'])
        .update({ status: 'APPROVED', approved_by: 'Test Setup', approval_date: new Date() });

      const cseQueue = await request
        .get('/api/v1/clearance/office/requests?office=Department&status=PENDING')
        .set('Authorization', `Bearer ${cseDeptToken}`);
      assert.strictEqual(cseQueue.status, 200);
      assert.ok(cseQueue.body.some(r => String(r.requestId) === String(clearanceReqId)));

      const mechQueue = await request
        .get('/api/v1/clearance/office/requests?office=Department&status=PENDING')
        .set('Authorization', `Bearer ${mechDeptToken}`);
      assert.strictEqual(mechQueue.status, 200);
      assert.strictEqual(mechQueue.body.some(r => String(r.requestId) === String(clearanceReqId)), false);
    });
  });

  describe('Production Hardening Guards', () => {
    it('Configures Express trust proxy for reverse-proxy deployments', () => {
      assert.strictEqual(app.get('trust proxy'), 1);
    });

    it('Fails fast when mandatory production environment variables are missing', () => {
      const backendRoot = path.resolve(__dirname, '../..');
      const result = spawnSync(process.execPath, ['-e', "require('./src/config/env')"], {
        cwd: backendRoot,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          JWT_SECRET: '',
          CERTIFICATE_VERIFY_BASE_URL: '',
          CORS_ALLOWED_ORIGINS: '',
          FRONTEND_URL: ''
        },
        encoding: 'utf8'
      });
      assert.notStrictEqual(result.status, 0);
      assert.match(result.stderr || '', /FATAL:/);
    });

    it('Blocks dev sample-data seeding endpoints with 403 when NODE_ENV is production', async () => {
      const prevEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';
      try {
        const res1 = await request
          .post('/api/v1/admin/users/seed-sample-data')
          .set('Authorization', `Bearer ${administratorToken}`);
        assert.strictEqual(res1.status, 403);

        const res2 = await request
          .post('/api/v1/admin/generate-sample-files')
          .set('Authorization', `Bearer ${administratorToken}`);
        assert.strictEqual(res2.status, 403);
      } finally {
        env.NODE_ENV = prevEnv;
      }
    });
  });
});

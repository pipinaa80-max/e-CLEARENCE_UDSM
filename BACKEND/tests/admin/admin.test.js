process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Wave 3A: Admin Core User & Clearance Oversight API Suite', () => {
  const request = supertest(app);
  let testDb;

  const PASSWORD = 'Wave3APassword123!';
  let adminUser, adminToken;
  let studentActor, studentToken;
  let superuserActor;

  const createdUserIds = [];

  async function createActor(userData, { createSession = true } = {}) {
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-w3a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await testDb('users').insert({
      id: userId,
      first_name: 'Wave3A',
      last_name: 'Actor',
      ...userData,
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdUserIds.push(userId);
    const user = await testDb('users').where({ id: userId }).first();
    let token = null;
    if (createSession) {
      const sessionId = await createUserSession({ userId: user.id, deviceInfo: 'Wave3A-Test', ipAddress: '127.0.0.1' });
      token = generateAccessToken(user, sessionId);
    }
    return { user, token };
  }

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    // Clean leftover Wave 3A fixtures
    await testDb('project_local_storage').where({ project_id: 'w3a-test-project' }).del();
    await testDb('users').where('email', 'like', 'w3a_%@udsm.ac.tz').del();

    const adm = await createActor({
      username: 'w3a_admin@udsm.ac.tz',
      email: 'w3a_admin@udsm.ac.tz',
      full_name: 'Wave3A Administrator',
      role: 'ADMINISTRATOR',
      project_id: 'w3a-test-project'
    });
    adminUser = adm.user;
    adminToken = adm.token;

    const std = await createActor({
      username: 'w3a_std@udsm.ac.tz',
      email: 'w3a_std@udsm.ac.tz',
      full_name: 'Wave3A Regular Student',
      registration_number: '2026-04-66300',
      role: 'STUDENT'
    });
    studentActor = std.user;
    studentToken = std.token;

    const su = await createActor({
      username: 'w3a_super@udsm.ac.tz',
      email: 'w3a_super@udsm.ac.tz',
      full_name: 'Wave3A Protected Superuser',
      role: 'SUPERUSER'
    }, { createSession: false });
    superuserActor = su.user;
  });

  after(async () => {
    await testDb('project_local_storage').where({ project_id: 'w3a-test-project' }).del();
    const cleanupIds = [...createdUserIds];
    if (cleanupIds.length > 0) {
      await testDb('audit_logs').whereIn('user_id', cleanupIds).del();
      await testDb('user_sessions').whereIn('user_id', cleanupIds).del();
      await testDb('refresh_tokens').whereIn('user_id', cleanupIds).del();
      await testDb('users').whereIn('id', cleanupIds).del();
    }
    await testDb('users').where('email', 'like', 'w3a_%@udsm.ac.tz').del();
    await testDb.destroy();
  });

  it('Enforces admin authorization on /api/v1/admin/* (401 unauth, 403 student)', async () => {
    await request.get('/api/v1/admin/users').expect(401);
    await request
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);
  });

  it('GET /api/v1/admin/roles returns all 21 canonical system roles', async () => {
    const res = await request
      .get('/api/v1/admin/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 21);
    assert.ok(res.body.includes('FINANCE_OFFICER'));
    assert.ok(res.body.includes('DUS_SECRETARY'));
  });

  it('POST /api/v1/admin/users provisions staff and student accounts and activates immediately', async () => {
    // 1. Provision a Finance Officer (using UI alias "Finance")
    const staffRes = await request
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Asha',
        lastName: 'Bursar',
        email: 'w3a_finance@udsm.ac.tz',
        password: PASSWORD,
        role: 'Finance',
        registrationNumber: 'STF-FIN-301',
        department: 'Bursar & Treasury'
      })
      .expect(200);

    assert.strictEqual(staffRes.body.success, true);
    assert.strictEqual(staffRes.body.user.role, 'FINANCE_OFFICER');
    assert.strictEqual(staffRes.body.user.isActive, true);
    assert.strictEqual(staffRes.body.user.isEmailVerified, true);
    createdUserIds.push(staffRes.body.user.id);

    // Verify provisioned staff can immediately log in
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ identifier: 'w3a_finance@udsm.ac.tz', password: PASSWORD })
      .expect(200);
    assert.strictEqual(loginRes.body.role, 'FINANCE_OFFICER');

    // 2. Provision a Student (creates linked students record)
    const studentRes = await request
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Juma',
        lastName: 'Khamis',
        email: 'w3a_student_created@udsm.ac.tz',
        password: PASSWORD,
        role: 'Student',
        registrationNumber: '2026-04-66301',
        college: 'CoICT',
        department: 'CSE',
        programme: 'BSc. CS'
      })
      .expect(200);

    createdUserIds.push(studentRes.body.user.id);
    const linkedStudent = await testDb('students')
      .where({ user_id: studentRes.body.user.id })
      .first();
    assert.ok(linkedStudent);
    assert.strictEqual(linkedStudent.registration_number, '2026-04-66301');

    // 3. Duplicate email returns 409
    await request
      .post('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Dup',
        lastName: 'User',
        email: 'w3a_finance@udsm.ac.tz',
        password: PASSWORD,
        role: 'Library'
      })
      .expect(409);
  });

  it('GET /api/v1/admin/users lists sanitized users with photo stripped', async () => {
    const res = await request
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    const found = res.body.find(u => u.email === 'w3a_finance@udsm.ac.tz');
    assert.ok(found);
    assert.strictEqual(found.password, undefined);
    assert.strictEqual(found.photo, null);
    assert.strictEqual(found.isActive, true);
  });

  it('PUT /api/v1/admin/users/:userId/role updates role via query param and protects SUPERUSER', async () => {
    const target = await testDb('users').where({ email: 'w3a_finance@udsm.ac.tz' }).first();

    const updateRes = await request
      .put(`/api/v1/admin/users/${target.id}/role?role=${encodeURIComponent('Library')}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    assert.strictEqual(updateRes.body.role, 'LIBRARY_OFFICER');

    // Invalid role -> 400
    await request
      .put(`/api/v1/admin/users/${target.id}/role?role=NON_EXISTENT_ROLE`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(400);

    // Modifying SUPERUSER -> 403
    await request
      .put(`/api/v1/admin/users/${superuserActor.id}/role?role=STUDENT`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(403);
  });

  it('GET /api/v1/admin/clearance-requests returns clearance requests with joined student info', async () => {
    const createdStudentUser = await testDb('users').where({ email: 'w3a_student_created@udsm.ac.tz' }).first();
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({ identifier: createdStudentUser.email, password: PASSWORD })
      .expect(200);

    await request
      .post('/api/v1/clearance/request')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({
        registrationNumber: '2026-04-66301',
        college: 'CoICT',
        department: 'CSE',
        programme: 'BSc. CS'
      })
      .expect(200);

    const res = await request
      .get('/api/v1/admin/clearance-requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    const found = res.body.find(r => r.registrationNumber === '2026-04-66301');
    assert.ok(found);
    assert.strictEqual(found.studentName, 'Juma Khamis');
    assert.ok(found.student);
    assert.strictEqual(found.student.registrationNumber, '2026-04-66301');
  });

  it('POST and GET /api/v1/admin/import/local-storage persist legacy records and validate passwords', async () => {
    // Missing password -> 422
    await request
      .post('/api/v1/admin/import/local-storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        users: [{ firstName: 'No', lastName: 'Pass', email: 'w3a_nopass@udsm.ac.tz' }]
      })
      .expect(422);

    // Valid import
    const importRes = await request
      .post('/api/v1/admin/import/local-storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        users: [{
          firstName: 'Legacy',
          lastName: 'Imported',
          email: 'w3a_legacy@udsm.ac.tz',
          password: PASSWORD,
          role: 'Student',
          registrationNumber: '2026-04-66302'
        }],
        clearanceRequests: [{ legacyId: 'old-1', status: 'PENDING' }]
      })
      .expect(200);

    assert.strictEqual(importRes.body.usersImported, 1);
    assert.strictEqual(importRes.body.legacyRecordsImported, 2);

    const listRes = await request
      .get('/api/v1/admin/import/local-storage')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.ok(Array.isArray(listRes.body));
    assert.ok(listRes.body.some(r => r.storageKey === 'clearanceRequests'));
  });

  it('DELETE /api/v1/admin/users/:userId and bulk DELETE /api/v1/admin/users delete users cleanly & protect SUPERUSER', async () => {
    // Deleting SUPERUSER -> 403
    await request
      .delete(`/api/v1/admin/users/${superuserActor.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    // Single delete of student with active clearance request (cascades cleanly)
    const studentUser = await testDb('users').where({ email: 'w3a_student_created@udsm.ac.tz' }).first();
    await request
      .delete(`/api/v1/admin/users/${studentUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deletedStudent = await testDb('students').where({ registration_number: '2026-04-66301' }).first();
    assert.strictEqual(deletedStudent, undefined);

    // Bulk delete remaining Wave 3A created users
    const staffUser = await testDb('users').where({ email: 'w3a_finance@udsm.ac.tz' }).first();
    const legacyUser = await testDb('users').where({ email: 'w3a_legacy@udsm.ac.tz' }).first();

    const bulkRes = await request
      .delete('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send([staffUser.id, legacyUser.id])
      .expect(200);

    assert.strictEqual(bulkRes.body.success, true);
    assert.strictEqual(bulkRes.body.deletedCount, 2);
  });
});

process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Wave 2: Missing Auth & Document Sub-Endpoints Suite', () => {
  const request = supertest(app);
  let testDb;

  const PASSWORD = 'Wave2Password123!';
  const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');

  let adminUser, adminToken;
  let student1, student1Token, student1Rec;
  let student2, student2Token;
  let unverifiedUser;
  let stationSecretary;

  const createdUserIds = [];
  const createdStudentIds = [];
  const createdDocIds = [];

  async function createActor(userData, { createSession = true } = {}) {
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-w2-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await testDb('users').insert({
      id: userId,
      first_name: 'Wave2',
      last_name: 'User',
      ...userData,
      password: hashedPassword,
      is_active: userData.is_active !== undefined ? userData.is_active : 1,
      is_locked: 0,
      is_email_verified: userData.is_email_verified !== undefined ? userData.is_email_verified : 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdUserIds.push(userId);
    const user = await testDb('users').where({ id: userId }).first();
    let token = null;
    if (createSession) {
      const sessionId = await createUserSession({ userId: user.id, deviceInfo: 'Wave2-Test', ipAddress: '127.0.0.1' });
      token = generateAccessToken(user, sessionId);
    }
    return { user, token };
  }

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    await testDb('users').where('username', 'like', 'w2_%').del();

    const adm = await createActor({
      username: 'w2_admin',
      email: 'w2_admin@udsm.ac.tz',
      full_name: 'Wave2 Admin',
      role: 'ADMINISTRATOR'
    });
    adminUser = adm.user;
    adminToken = adm.token;

    const s1 = await createActor({
      username: 'w2_student1',
      email: 'w2_student1@udsm.ac.tz',
      full_name: 'Wave2 Student One',
      registration_number: '2026-04-77201',
      college: 'CoICT',
      department: 'CSE',
      programme: 'BSc. CS',
      role: 'STUDENT'
    });
    student1 = s1.user;
    student1Token = s1.token;

    const std1Id = `std-w2-${Date.now()}-1`;
    await testDb('students').insert({
      id: std1Id,
      user_id: student1.id,
      registration_number: student1.registration_number,
      full_name: student1.full_name,
      email: student1.email,
      college: 'CoICT',
      department: 'CSE',
      programme: 'BSc. CS',
      clearance_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date()
    });
    createdStudentIds.push(std1Id);
    student1Rec = await testDb('students').where({ id: std1Id }).first();

    const s2 = await createActor({
      username: 'w2_student2',
      email: 'w2_student2@udsm.ac.tz',
      full_name: 'Wave2 Student Two',
      registration_number: '2026-04-77202',
      role: 'STUDENT'
    });
    student2 = s2.user;
    student2Token = s2.token;

    const unv = await createActor({
      username: 'w2_unverified',
      email: 'w2_unverified@udsm.ac.tz',
      full_name: 'Wave2 Unverified Student',
      registration_number: '2026-04-77203',
      role: 'STUDENT',
      is_active: 0,
      is_email_verified: 0
    }, { createSession: false });
    unverifiedUser = unv.user;

    const sec = await createActor({
      username: 'w2_station_sec',
      email: 'w2_station_sec@udsm.ac.tz',
      full_name: 'Arusha Station Secretary',
      role: 'DUS_SECRETARY',
      station_code: 'ARUSHA-HUB',
      station_name: 'UDSM Arusha Regional Collection Station'
    }, { createSession: false });
    stationSecretary = sec.user;
  });

  after(async () => {
    for (const docId of createdDocIds) {
      const diskPath = path.join(env.UPLOAD_DIR, `${docId}.pdf`);
      if (fs.existsSync(diskPath)) {
        try { fs.unlinkSync(diskPath); } catch (_) {}
      }
    }
    if (createdDocIds.length > 0) {
      await testDb('documents').whereIn('id', createdDocIds).del();
    }
    if (createdUserIds.length > 0) {
      await testDb('notifications').whereIn('user_id', createdUserIds).del();
      await testDb('audit_logs').whereIn('user_id', createdUserIds).del();
      await testDb('refresh_tokens').whereIn('user_id', createdUserIds).del();
      await testDb('user_sessions').whereIn('user_id', createdUserIds).del();
    }
    if (createdStudentIds.length > 0) {
      await testDb('students').whereIn('id', createdStudentIds).del();
    }
    if (createdUserIds.length > 0) {
      await testDb('users').whereIn('id', createdUserIds).del();
    }
    await testDb.destroy();
  });

  // =========================================================================
  // 1. Auth Wave 2 Endpoints & Query-Param Compatibility
  // =========================================================================
  describe('Auth Additions & Compatibility', () => {
    it('POST /api/v1/auth/login returns stationCode and stationName for station secretaries', async () => {
      const res = await request
        .post('/api/v1/auth/login')
        .send({ identifier: stationSecretary.email, password: PASSWORD })
        .expect(200);

      assert.strictEqual(res.body.role, 'DUS_SECRETARY');
      assert.strictEqual(res.body.stationCode, 'ARUSHA-HUB');
      assert.strictEqual(res.body.stationName, 'UDSM Arusha Regional Collection Station');

      // Verify refresh token also works via query parameter (Angular AuthService contract)
      const refreshRes = await request
        .post(`/api/v1/auth/refresh?refreshToken=${encodeURIComponent(res.body.refreshToken)}`)
        .send({})
        .expect(200);
      assert.ok(refreshRes.body.accessToken);
      assert.ok(refreshRes.body.refreshToken);
    });

    it('GET /api/v1/auth/profile/:userId returns merged user/student profile and 404 for unknown user', async () => {
      const res = await request
        .get(`/api/v1/auth/profile/${student1.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      assert.strictEqual(res.body.id, student1.id);
      assert.strictEqual(res.body.registrationNumber, student1.registration_number);
      assert.strictEqual(res.body.clearanceStatus, 'PENDING');
      assert.strictEqual(res.body.password, undefined);

      await request
        .get('/api/v1/auth/profile/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('PUT /api/v1/auth/deactivate/:userId and /activate/:userId toggle account state and revoke sessions', async () => {
      // Non-admin blocked with 403
      await request
        .put(`/api/v1/auth/deactivate/${student2.id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(403);

      // Admin deactivates student2
      const deactRes = await request
        .put(`/api/v1/auth/deactivate/${student2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      assert.strictEqual(deactRes.body.success, true);

      // Existing student2 token is now rejected
      await request
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${student2Token}`)
        .expect(401);

      // Admin reactivates student2
      const actRes = await request
        .put(`/api/v1/auth/activate/${student2.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      assert.strictEqual(actRes.body.success, true);

      const updatedUser = await testDb('users').where({ id: student2.id }).first();
      assert.strictEqual(Boolean(updatedUser.is_active), true);
      assert.strictEqual(Boolean(updatedUser.is_email_verified), true);

      const notif = await testDb('notifications')
        .where({ user_id: student2.id, title: 'Account Activated' })
        .first();
      assert.ok(notif);
    });

    it('POST /api/v1/auth/resend-verification and /verify-email activate unverified user via query params', async () => {
      const resendRes = await request
        .post(`/api/v1/auth/resend-verification?email=${encodeURIComponent(unverifiedUser.email)}`)
        .send({})
        .expect(200);

      assert.strictEqual(resendRes.body.success, true);
      assert.ok(resendRes.body._testVerificationToken);

      // Invalid token fails with 400
      await request
        .post('/api/v1/auth/verify-email?token=invalid-token-xyz')
        .send({})
        .expect(400);

      // Valid token activates account
      const verifyRes = await request
        .post(`/api/v1/auth/verify-email?token=${encodeURIComponent(resendRes.body._testVerificationToken)}`)
        .send({})
        .expect(200);
      assert.strictEqual(verifyRes.body.success, true);

      const verifiedUser = await testDb('users').where({ id: unverifiedUser.id }).first();
      assert.strictEqual(Boolean(verifiedUser.is_email_verified), true);
      assert.strictEqual(Boolean(verifiedUser.is_active), true);
      assert.strictEqual(verifiedUser.verification_token, null);

      // Resending on already-verified user returns friendly 200
      const alreadyRes = await request
        .post(`/api/v1/auth/resend-verification?email=${encodeURIComponent(unverifiedUser.email)}`)
        .send({})
        .expect(200);
      assert.match(alreadyRes.body.message, /already verified/i);
    });

    it('POST /api/v1/auth/reset-password and /reset-password/confirm also accept query parameters', async () => {
      const reqRes = await request
        .post(`/api/v1/auth/reset-password?email=${encodeURIComponent(unverifiedUser.email)}`)
        .send({})
        .expect(200);
      assert.ok(reqRes.body._testResetToken);

      const confirmRes = await request
        .post(`/api/v1/auth/reset-password/confirm?token=${encodeURIComponent(reqRes.body._testResetToken)}&newPassword=${encodeURIComponent('NewWave2Pass@2026')}`)
        .send({})
        .expect(200);
      assert.strictEqual(confirmRes.body.success, true);
    });
  });

  // =========================================================================
  // 2. Document Wave 2 Sub-Endpoints (/missing and /verification-status)
  // =========================================================================
  describe('Document Missing & Verification-Status Endpoints', () => {
    const requiredCategories = [
      'Transcript',
      'O-Level Certificate',
      'A-Level Certificate',
      'Identity Document'
    ];

    it('GET /api/v1/documents/student/:studentId/missing returns all 4 required documents before upload', async () => {
      const res = await request
        .get(`/api/v1/documents/student/${student1Rec.id}/missing`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);

      assert.deepStrictEqual(res.body, requiredCategories);
    });

    it('Enforces student ownership on /missing and /verification-status (403 for other student)', async () => {
      // Fresh token for student2 after reactivation
      const loginRes = await request
        .post('/api/v1/auth/login')
        .send({ identifier: student2.email, password: PASSWORD })
        .expect(200);

      await request
        .get(`/api/v1/documents/student/${student1Rec.id}/missing`)
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);

      await request
        .get(`/api/v1/documents/student/${student1Rec.id}/verification-status`)
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(403);
    });

    it('Updates /missing and /verification-status as required documents are uploaded and verified', async () => {
      // Upload all 4 required documents
      for (const category of requiredCategories) {
        const upRes = await request
          .post('/api/v1/documents/upload')
          .set('Authorization', `Bearer ${student1Token}`)
          .field('studentId', student1Rec.id)
          .field('category', category)
          .attach('file', VALID_PDF_BUFFER, `${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`)
          .expect(201);
        createdDocIds.push(upRes.body.data.id);
      }

      // Missing should now be empty
      const missingRes = await request
        .get(`/api/v1/documents/student/${student1Rec.id}/missing`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);
      assert.deepStrictEqual(missingRes.body, []);

      // Verification status should show all uploaded, not yet verified
      const beforeVerifyRes = await request
        .get(`/api/v1/documents/student/${student1Rec.id}/verification-status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .expect(200);
      assert.strictEqual(beforeVerifyRes.body.success, true);
      assert.strictEqual(beforeVerifyRes.body.data.documents.length, 4);
      assert.strictEqual(beforeVerifyRes.body.data.hasAllRequiredDocuments, true);
      assert.strictEqual(beforeVerifyRes.body.data.allRequiredDocumentsVerified, false);

      // Verify all 4 documents as admin
      for (const docId of createdDocIds) {
        await request
          .put(`/api/v1/documents/verify/${docId}?verified=true&comment=Verified`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      // Now allRequiredDocumentsVerified should be true
      const afterVerifyRes = await request
        .get(`/api/v1/documents/student/${student1Rec.id}/verification-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      assert.strictEqual(afterVerifyRes.body.data.allRequiredDocumentsVerified, true);
    });
  });
});

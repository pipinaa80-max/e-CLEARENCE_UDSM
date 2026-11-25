process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const { db, testConnection } = require('../../src/config/database');
const { hashPassword, verifyPassword, normalizeHashPrefix } = require('../../src/utils/password');
const {
  generateAccessToken,
  generateAndSaveRefreshToken,
  verifyToken,
  isTokenRevoked,
  revokeAccessToken,
  revokeRefreshToken,
  rotateRefreshToken,
  cleanupExpiredTokens
} = require('../../src/utils/token');
const { ROLES, ALL_ROLES } = require('../../src/constants/roles');
const env = require('../../src/config/env');

describe('Phase 2: Authentication Engine, Token Persistence & Role Authorization Suite', () => {
  // Test fixture identifiers
  const testStudentId = 'test-usr-student-001';
  const testStaffId = 'test-usr-staff-001';
  const testSuperuserId = 'test-usr-superuser-001';

  const testStudentEmail = 'test.student@udsm.ac.tz';
  const testStudentReg = '2026-04-TEST01';
  const testStudentPassword = 'TestStudent@2026!';

  const testStaffEmail = 'test.library@udsm.ac.tz';
  const testStaffPassword = 'TestStaff@2026!';

  const testSuperuserEmail = 'test.super@admin.local';
  const testSuperuserPassword = 'TestSuperuser@2026!';

  async function cleanupAllTestRecords() {
    await db('students')
      .where('id', 'like', 'test-%')
      .orWhere('registration_number', 'like', '2026-04-%')
      .orWhere('registration_number', 'like', '%2024-04-%')
      .del();

    await db('users')
      .where('id', 'like', 'test-%')
      .orWhere('id', 'like', 'usr-test-%')
      .orWhere('email', 'like', '%@test.local')
      .orWhere('email', 'like', 'test.%@udsm.ac.tz')
      .orWhere('email', 'like', 'temp.reg%')
      .orWhere('email', 'like', 'new.student%')
      .orWhere('email', 'like', 'attacker.%')
      .orWhere('email', 'like', 'bot%@udsm.ac.tz')
      .del();

    await db('user_sessions').del();
    await db('revoked_tokens').del();
    await db('refresh_tokens').del();
  }

  before(async () => {
    // 0. Ensure connected to dedicated test database
    const conn = await testConnection();
    assert.equal(conn.database, 'clearance_test_db', 'Test suite must run strictly against clearance_test_db');

    // Run migrations and seeders on test database
    await db.migrate.latest();
    await db.seed.run();

    // Clean up test fixtures
    await cleanupAllTestRecords();

    // 1. Seed test student with BCrypt hash
    const studentHash = await hashPassword(testStudentPassword);
    await db('users').insert({
      id: testStudentId,
      username: testStudentEmail,
      email: testStudentEmail,
      password: studentHash,
      full_name: 'Test Student One',
      first_name: 'Test',
      last_name: 'Student',
      registration_number: testStudentReg,
      college: 'CoICT',
      department: 'Computer Science and Engineering',
      programme: 'BSc in Computer Science',
      role: ROLES.STUDENT,
      is_active: 1,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    await db('students').insert({
      id: 'test-std-001',
      registration_number: testStudentReg,
      full_name: 'Test Student One',
      email: testStudentEmail,
      college: 'CoICT',
      faculty: 'CoICT',
      department: 'Computer Science and Engineering',
      programme: 'BSc in Computer Science',
      user_id: testStudentId,
      is_final_year: 1,
      clearance_status: 'PENDING',
      created_at: new Date(),
      updated_at: new Date()
    });

    // 2. Seed test staff (Library Officer)
    const staffHash = await hashPassword(testStaffPassword);
    await db('users').insert({
      id: testStaffId,
      username: testStaffEmail,
      email: testStaffEmail,
      password: staffHash,
      full_name: 'Test Library Officer',
      first_name: 'Library',
      last_name: 'Officer',
      registration_number: 'STF-LIB-001',
      department: 'Library Services',
      role: ROLES.LIBRARY_OFFICER,
      is_active: 1,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    // 3. Seed test superuser
    const superuserHash = await hashPassword(testSuperuserPassword);
    await db('users').insert({
      id: testSuperuserId,
      username: testSuperuserEmail,
      email: testSuperuserEmail,
      password: superuserHash,
      full_name: 'Test System Superuser',
      first_name: 'System',
      last_name: 'Superuser',
      role: ROLES.SUPERUSER,
      is_active: 1,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  after(async () => {
    await cleanupAllTestRecords();
    await db.destroy();
  });

  // --------------------------------------------------------------------------
  // 1. BCrypt Password Compatibility
  // --------------------------------------------------------------------------
  describe('1. BCrypt Password Verification Compatibility', () => {
    test('Standard $2a$10$ Spring Security BCrypt hashes verify correctly', async () => {
      const springHash = '$2a$10$PLgn8ppzf4Jcdxl4Uk69kOdnOXh9E74UyUu.rfDc4QQgPW9JEjxei';
      const password = 'SecretSpringPass!2026';
      const dynamicHash = await hashPassword(password);
      assert.ok(dynamicHash.startsWith('$2a$') || dynamicHash.startsWith('$2b$'));

      const verified = await verifyPassword(password, springHash);
      assert.equal(verified, true, 'Spring Security BCrypt hash must verify without requiring a password reset');

      const failed = await verifyPassword('WrongPassword123', springHash);
      assert.equal(failed, false, 'Invalid password must return false');
    });

    test('Normalizes {bcrypt} and $2y$ prefixes cleanly', () => {
      const withPrefix = '{bcrypt}$2a$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN';
      const normalized = normalizeHashPrefix(withPrefix);
      assert.ok(!normalized.startsWith('{bcrypt}'));
      assert.ok(normalized.startsWith('$2a$'));

      const phpVariant = '$2y$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMN';
      const normalizedPhp = normalizeHashPrefix(phpVariant);
      assert.ok(normalizedPhp.startsWith('$2a$'));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Student and Staff Login Flows
  // --------------------------------------------------------------------------
  describe('2. Student and Staff Login Flows', () => {
    test('Student logs in successfully using email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.accessToken);
      assert.ok(res.body.refreshToken);
      assert.equal(res.body.email, testStudentEmail);
      assert.equal(res.body.role, 'STUDENT');

      // Verify refresh token is persistently stored in MySQL
      const decoded = verifyToken(res.body.refreshToken);
      const dbToken = await db('refresh_tokens').where({ jti: decoded.jti }).first();
      assert.ok(dbToken, 'Refresh token must be recorded in refresh_tokens table');
      assert.equal(dbToken.is_revoked, 0);
    });

    test('Student logs in successfully using registration number identifier', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          registrationNumber: testStudentReg,
          password: testStudentPassword
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.accessToken);
      assert.equal(res.body.registrationNumber, testStudentReg);
    });

    test('Staff (Library Officer) logs in successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStaffEmail,
          password: testStaffPassword
        });

      assert.equal(res.status, 200);
      assert.ok(res.body.accessToken);
      assert.equal(res.body.role, 'LIBRARY_OFFICER');
    });

    test('Login fails on incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: 'CompletelyWrongPassword!'
        });

      assert.equal(res.status, 401);
      assert.equal(res.body.error, 'Unauthorized');
    });

    test('Login fails on non-existent identifier with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: 'nonexistent.user@udsm.ac.tz',
          password: 'SomePassword123!'
        });

      assert.equal(res.status, 401);
    });

    test('Honeypot trap triggers 403 Forbidden for automated bots', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword,
          honeypotTrap: 'bot-injected-hidden-payload'
        });

      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'Forbidden');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Persistent MySQL Token Lifecycle, Rotation & Revocation
  // --------------------------------------------------------------------------
  describe('3. Persistent MySQL Token Lifecycle, Rotation & Revocation', () => {
    let studentAccessToken;
    let studentRefreshToken;

    before(async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword
        });
      studentAccessToken = res.body.accessToken;
      studentRefreshToken = res.body.refreshToken;
    });

    test('Protected profile endpoint succeeds with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${studentAccessToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.email, testStudentEmail);
    });

    test('Protected endpoint rejects missing or invalid token with 401', async () => {
      const resNoToken = await request(app).get('/api/v1/auth/profile');
      assert.equal(resNoToken.status, 401);

      const resBadToken = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid.tampered.token');
      assert.equal(resBadToken.status, 401);
    });

    test('Token refresh rotates refresh token and invalidates previous token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: studentRefreshToken });

      assert.equal(res.status, 200);
      assert.ok(res.body.accessToken || res.body.token);
      assert.ok(res.body.refreshToken);
      assert.notEqual(res.body.refreshToken, studentRefreshToken, 'Rotated refresh token must be different');

      // Verify old refresh token is marked revoked in MySQL
      const oldDecoded = verifyToken(studentRefreshToken);
      const oldRecord = await db('refresh_tokens').where({ jti: oldDecoded.jti }).first();
      assert.equal(oldRecord.is_revoked, 1, 'Previous refresh token must be marked is_revoked = 1');
      assert.ok(oldRecord.replaced_by_jti, 'Must track the replacement token JTI');
    });

    test('Refresh-token family replay test: rotating, reusing old token triggers family revocation, replacement token becomes unusable', async () => {
      // 1. Fresh login to establish new token family
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(loginRes.status, 200);

      const initialAccess = loginRes.body.accessToken;
      const initialRefresh = loginRes.body.refreshToken;

      // 2. Rotate token legitimately -> Step 1: Valid refresh token can be rotated
      const rotateRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefresh });
      assert.equal(rotateRes.status, 200);
      const replacementRefresh = rotateRes.body.refreshToken;
      const replacementAccess = rotateRes.body.accessToken;
      assert.notEqual(replacementRefresh, initialRefresh);

      // Verify legitimate rotated token works
      const testProfile = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${replacementAccess}`);
      assert.equal(testProfile.status, 200);

      // 3. Reusing the PREVIOUS (now invalidated) refresh token -> Step 2: returns 401
      const replayRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: initialRefresh });
      assert.equal(replayRes.status, 401);
      assert.equal(replayRes.body.error, 'SecurityBreach');

      // 4. Verify DB state -> Step 3: Reuse triggers revocation of the entire token family
      const decodedInitial = verifyToken(initialRefresh);
      const initialRecord = await db('refresh_tokens').where({ jti: decodedInitial.jti }).first();
      const familyRecords = await db('refresh_tokens').where({ family_id: initialRecord.family_id });
      assert.ok(familyRecords.length >= 2, 'Family must have at least 2 tokens');
      for (const rec of familyRecords) {
        assert.equal(rec.is_revoked, 1, `Every token in family ${initialRecord.family_id} must be revoked`);
      }

      // 5. Verify Step 4: The replacement refresh token and its session can no longer be used!
      const subsequentRefreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: replacementRefresh });
      assert.equal(subsequentRefreshRes.status, 401, 'Replacement refresh token must also be rejected after family revocation');
    });

    test('Complete logout verification: access token revoked, refresh token invalidated, both remain invalid after simulated restart', async () => {
      // 1. Log in to establish fresh session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword
        });

      const tokenToRevoke = loginRes.body.accessToken;
      const refreshToRevoke = loginRes.body.refreshToken;

      // 2. Call logout endpoint (targeted session logout)
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokenToRevoke}`)
        .send({ refreshToken: refreshToRevoke });

      assert.equal(logoutRes.status, 200);

      // 3. Verify access token JTI is recorded in revoked_tokens MySQL table
      const decodedAccess = verifyToken(tokenToRevoke);
      const revokedInDb = await isTokenRevoked(decodedAccess.jti);
      assert.equal(revokedInDb, true, 'Access token JTI must be persistently recorded in MySQL revoked_tokens');

      // 4. Verify refresh token is marked is_revoked = 1 in MySQL refresh_tokens
      const decodedRefresh = verifyToken(refreshToRevoke);
      const revokedRefresh = await db('refresh_tokens').where({ jti: decodedRefresh.jti }).first();
      assert.ok(revokedRefresh, 'Refresh token must be found in database');
      assert.equal(revokedRefresh.is_revoked, 1, 'Refresh token must be marked is_revoked = 1');

      // 5. Simulated restart: querying MySQL directly confirms both remain invalid
      const accessDirectCheck = await db('revoked_tokens').where({ jti: decodedAccess.jti }).first();
      assert.ok(accessDirectCheck, 'Access token must persist in revoked_tokens table across restarts');

      const refreshDirectCheck = await db('refresh_tokens').where({ jti: decodedRefresh.jti }).first();
      assert.equal(refreshDirectCheck.is_revoked, 1, 'Refresh token must persist as revoked across restarts');

      // 6. Access is rejected on subsequent calls
      const profileRes = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${tokenToRevoke}`);

      assert.equal(profileRes.status, 401);
      assert.equal(profileRes.body.message, 'Token has been revoked. Please log in again.');

      // 7. Refresh is rejected with revoked refresh token
      const refreshAttempt = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: refreshToRevoke });

      assert.equal(refreshAttempt.status, 401);
    });

    test('Expired token cleanup purges old records from database safely', async () => {
      // Insert an expired dummy record
      await db('revoked_tokens').insert({
        id: crypto.randomUUID(),
        jti: 'test-expired-jti',
        token_type: 'access',
        expires_at: new Date(Date.now() - 60000), // 1 minute ago
        reason: 'test_expired'
      });

      const { deletedRevoked } = await cleanupExpiredTokens();
      assert.ok(deletedRevoked >= 1, 'Cleanup function must purge expired tokens');

      const check = await db('revoked_tokens').where({ jti: 'test-expired-jti' }).first();
      assert.equal(check, undefined, 'Expired token must no longer exist');
    });
  });

  // --------------------------------------------------------------------------
  // 3b. Cross-Device Access-Token & Session Invalidation Suite (Scenarios A-D)
  // --------------------------------------------------------------------------
  describe('3b. Cross-Device Access-Token & Session Invalidation Suite (Scenarios A-D)', () => {
    test('Scenario A — Global logout invalidates all access tokens and refresh tokens across all devices', async () => {
      // 1. Create two independent authenticated sessions for the same user
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Laptop-Chrome-Device-1')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login1.status, 200);
      const session1 = { access: login1.body.accessToken, refresh: login1.body.refreshToken };

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mobile-Safari-Device-2')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login2.status, 200);
      const session2 = { access: login2.body.accessToken, refresh: login2.body.refreshToken };

      // 2. Verify both access tokens initially work
      const check1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(check1.status, 200);
      const check2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(check2.status, 200);

      // 3. Perform global logout from Session 1 (allDevices: true)
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${session1.access}`)
        .send({ allDevices: true });
      assert.equal(logoutRes.status, 200);

      // 4. Verify BOTH access tokens are rejected
      const postLogout1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(postLogout1.status, 401, 'Session 1 access token must be rejected after global logout');

      const postLogout2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(postLogout2.status, 401, 'Session 2 access token on other device must be rejected after global logout');

      // 5. Verify BOTH refresh tokens are rejected
      const refresh1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session1.refresh });
      assert.equal(refresh1.status, 401, 'Session 1 refresh token must be rejected after global logout');

      const refresh2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session2.refresh });
      assert.equal(refresh2.status, 401, 'Session 2 refresh token must be rejected after global logout');
    });

    test('Scenario B — Password change invalidates all existing access tokens and refresh tokens across devices', async () => {
      // 1. Create two independent authenticated sessions
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login1.status, 200);
      const session1 = { access: login1.body.accessToken, refresh: login1.body.refreshToken };

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login2.status, 200);
      const session2 = { access: login2.body.accessToken, refresh: login2.body.refreshToken };

      // Verify both work
      const check1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(check1.status, 200);
      const check2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(check2.status, 200);

      // 2. Change password from Session 1
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${session1.access}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'ChangedPassword@2026!'
        });
      assert.equal(changeRes.status, 200);

      // 3. Verify BOTH old access tokens are rejected
      const postChange1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(postChange1.status, 401, 'Old access token 1 must be rejected after password change');

      const postChange2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(postChange2.status, 401, 'Old access token 2 on other device must be rejected after password change');

      // 4. Verify BOTH old refresh tokens are rejected
      const refresh1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session1.refresh });
      assert.equal(refresh1.status, 401, 'Old refresh token 1 must be rejected after password change');

      const refresh2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session2.refresh });
      assert.equal(refresh2.status, 401, 'Old refresh token 2 must be rejected after password change');

      // 5. Restore original password for downstream tests
      const restoredHash = await hashPassword(testStudentPassword);
      await db('users').where({ id: testStudentId }).update({ password: restoredHash });
    });

    test('Scenario C — Password reset invalidates all existing sessions across devices', async () => {
      // 1. Create two independent authenticated sessions
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login1.status, 200);
      const session1 = { access: login1.body.accessToken, refresh: login1.body.refreshToken };

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login2.status, 200);
      const session2 = { access: login2.body.accessToken, refresh: login2.body.refreshToken };

      // Verify both work
      const check1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(check1.status, 200);
      const check2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(check2.status, 200);

      // 2. Request password reset
      const resetReq = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ email: testStudentEmail });
      assert.equal(resetReq.status, 200);
      const rawToken = resetReq.body._testResetToken;

      // 3. Complete password reset
      const confirmRes = await request(app)
        .post('/api/v1/auth/reset-password/confirm')
        .send({
          token: rawToken,
          newPassword: 'ResetPassword@2026!'
        });
      assert.equal(confirmRes.status, 200);

      // 4. Verify BOTH old access tokens are rejected
      const postReset1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(postReset1.status, 401, 'Old session 1 access token must be rejected after password reset');

      const postReset2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(postReset2.status, 401, 'Old session 2 access token on other device must be rejected after password reset');

      // 5. Verify BOTH old refresh tokens are rejected
      const refresh1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session1.refresh });
      assert.equal(refresh1.status, 401, 'Old session 1 refresh token must be rejected after password reset');

      const refresh2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session2.refresh });
      assert.equal(refresh2.status, 401, 'Old session 2 refresh token must be rejected after password reset');

      // 6. Restore original password
      const restoredHash = await hashPassword(testStudentPassword);
      await db('users').where({ id: testStudentId }).update({ password: restoredHash });
    });

    test('Scenario D — Targeted logout invalidates only the selected session while other sessions remain valid', async () => {
      // 1. Create two independent authenticated sessions
      const login1 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Desktop-Client-1')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login1.status, 200);
      const session1 = { access: login1.body.accessToken, refresh: login1.body.refreshToken };

      const login2 = await request(app)
        .post('/api/v1/auth/login')
        .set('User-Agent', 'Mobile-Client-2')
        .send({ identifier: testStudentEmail, password: testStudentPassword });
      assert.equal(login2.status, 200);
      const session2 = { access: login2.body.accessToken, refresh: login2.body.refreshToken };

      // 2. Perform targeted logout of Session 1 ONLY
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${session1.access}`)
        .send({ refreshToken: session1.refresh });
      assert.equal(logoutRes.status, 200);

      // 3. Verify Session 1 access token is rejected
      const checkSession1 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session1.access}`);
      assert.equal(checkSession1.status, 401, 'Logged out session 1 access token must be rejected');

      // 4. Verify Session 1 refresh token is rejected
      const refreshSession1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session1.refresh });
      assert.equal(refreshSession1.status, 401, 'Logged out session 1 refresh token must be rejected');

      // 5. Verify Session 2 access token REMAINS VALID (HTTP 200)
      const checkSession2 = await request(app).get('/api/v1/auth/profile').set('Authorization', `Bearer ${session2.access}`);
      assert.equal(checkSession2.status, 200, 'Other device session 2 access token must remain completely valid');
      assert.equal(checkSession2.body.email, testStudentEmail);

      // 6. Verify Session 2 refresh token CAN STILL BE ROTATED (HTTP 200)
      const rotateSession2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session2.refresh });
      assert.equal(rotateSession2.status, 200, 'Other device session 2 refresh token must rotate successfully');
      assert.ok(rotateSession2.body.accessToken || rotateSession2.body.token);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Password Reset & Password Change Security
  // --------------------------------------------------------------------------
  describe('4. Password Reset & Password Change Security', () => {
    test('Reset password request for non-existent email returns 200 without email enumeration or raw token exposure', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ email: 'unknown.ghost@udsm.ac.tz' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(
        res.body.message,
        'Password reset request processed. Outbound email delivery is pending university SMTP service configuration.'
      );
      assert.equal(res.body._testResetToken, undefined);
    });

    test('Reset password never exposes raw token or false dispatch claims in production mode', async () => {
      const originalEnv = env.NODE_ENV;
      try {
        env.NODE_ENV = 'production';
        const res = await request(app)
          .post('/api/v1/auth/reset-password')
          .send({ email: testStudentEmail });

        assert.equal(res.status, 200);
        assert.equal(res.body.success, true);
        assert.equal(res.body._testResetToken, undefined, 'Raw reset token must NEVER be exposed in production');
        assert.equal(
          res.body.message,
          'Password reset request processed. Outbound email delivery is pending university SMTP service configuration.'
        );
      } finally {
        env.NODE_ENV = originalEnv;
      }
    });

    test('Reset password generates secure 256-bit token and stores SHA-256 hash in database', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ email: testStudentEmail });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body._testResetToken, 'Test token returned in test mode for verification');

      const rawToken = res.body._testResetToken;
      const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // Verify database contains the SHA-256 hash, NOT the raw token
      const user = await db('users').where({ id: testStudentId }).first();
      assert.equal(user.reset_token, expectedHash, 'Database must store SHA-256 hash of reset token');
      assert.ok(new Date(user.reset_token_expiry) > new Date(), 'Expiry must be in the future');
    });

    test('Reset password confirm rejects weak passwords with 400 Bad Request', async () => {
      const user = await db('users').where({ id: testStudentId }).first();
      const rawToken = 'dummy-raw-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await db('users').where({ id: testStudentId }).update({
        reset_token: tokenHash,
        reset_token_expiry: new Date(Date.now() + 3600000)
      });

      const res = await request(app)
        .post('/api/v1/auth/reset-password/confirm')
        .send({
          token: rawToken,
          newPassword: 'short'
        });

      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'WeakPassword');
    });

    test('Reset password confirm resets password, enforces single-use, and revokes sessions', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await db('users').where({ id: testStudentId }).update({
        reset_token: tokenHash,
        reset_token_expiry: new Date(Date.now() + 3600000)
      });

      const newPassword = 'NewSecretPassword@2026!';
      const res = await request(app)
        .post('/api/v1/auth/reset-password/confirm')
        .send({
          token: rawToken,
          newPassword
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Verify single-use: token must be nullified immediately
      const userAfter = await db('users').where({ id: testStudentId }).first();
      assert.equal(userAfter.reset_token, null, 'Reset token must be nullified after use');
      assert.equal(userAfter.reset_token_expiry, null);

      // Verify cannot reuse same token
      const reuseRes = await request(app)
        .post('/api/v1/auth/reset-password/confirm')
        .send({
          token: rawToken,
          newPassword: 'AnotherPassword@2026!'
        });
      assert.equal(reuseRes.status, 400);
      assert.equal(reuseRes.body.error, 'InvalidToken');

      // Verify login with new password succeeds
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: newPassword
        });
      assert.equal(loginRes.status, 200);

      // Restore original password for downstream tests
      const restoredHash = await hashPassword(testStudentPassword);
      await db('users').where({ id: testStudentId }).update({ password: restoredHash });
    });

    test('Change password requires valid current password and validates new password strength', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword
        });
      const token = loginRes.body.accessToken;

      // 1. Wrong current password -> 401
      const wrongRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword!',
          newPassword: 'ValidNewPassword123!'
        });
      assert.equal(wrongRes.status, 401);
      assert.equal(wrongRes.body.error, 'InvalidCurrentPassword');

      // 2. Weak new password -> 400
      const weakRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'weak'
        });
      assert.equal(weakRes.status, 400);
      assert.equal(weakRes.body.error, 'WeakPassword');

      // 3. Valid change password -> 200
      const validRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testStudentPassword,
          newPassword: 'UpdatedPassword@2026!'
        });
      assert.equal(validRes.status, 200);

      // Restore original password
      const restoredHash = await hashPassword(testStudentPassword);
      await db('users').where({ id: testStudentId }).update({ password: restoredHash });
    });
  });

  // --------------------------------------------------------------------------
  // 5. Registration Rules & Privilege Escalation Prevention
  // --------------------------------------------------------------------------
  describe('5. Registration Rules & Privilege Escalation Prevention', () => {
    test('Self-registration creates student accounts successfully', async () => {
      const regNo = '2026-04-REG001';
      const email = 'temp.reg1@udsm.ac.tz';

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Juma',
          lastName: 'Mussa',
          email,
          password: 'Password123!',
          registrationNumber: regNo,
          college: 'CoICT',
          department: 'Computer Science and Engineering',
          programme: 'BSc in CS'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);

      // Verify row in database has role = STUDENT
      const createdUser = await db('users').where({ email }).first();
      assert.ok(createdUser);
      assert.equal(createdUser.role, ROLES.STUDENT);

      const createdStudent = await db('students').where({ registration_number: regNo }).first();
      assert.ok(createdStudent);
      assert.equal(createdStudent.user_id, createdUser.id);
    });

    test('Self-registration rejects privileged role assignment attempts with 403 Forbidden', async () => {
      const maliciousAttempts = [
        ROLES.ADMINISTRATOR,
        ROLES.SUPERUSER,
        ROLES.FINANCE_OFFICER,
        ROLES.LECTURER,
        ROLES.PRINCIPAL
      ];

      for (const role of maliciousAttempts) {
        const res = await request(app)
          .post('/api/v1/auth/register')
          .send({
            firstName: 'Attacker',
            lastName: 'User',
            email: `attacker.${role.toLowerCase()}@udsm.ac.tz`,
            password: 'Password123!',
            registrationNumber: `2026-04-ATT-${role}`,
            role
          });

        assert.equal(
          res.status,
          403,
          `Self-registration must block privilege escalation attempt to ${role}`
        );
        assert.equal(res.body.error, 'PrivilegeEscalationAttempt');
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. Role-Based Authorization Enforcement Across All 21 Roles & Matrix Constraints
  // --------------------------------------------------------------------------
  describe('6. Role-Based Authorization Enforcement Across All 21 Roles', () => {
    test('Verifies access permissions for every single one of the 21 roles', async () => {
      assert.equal(ALL_ROLES.length, 21, 'Must verify all 21 defined role constants (20 roles + sub-role)');

      for (const role of ALL_ROLES) {
        const pathSegment = role.toLowerCase().replace(/_/g, '-');

        const roleUser = {
          id: `usr-test-${role.toLowerCase()}`,
          email: `${role.toLowerCase()}@test.local`,
          username: `${role.toLowerCase()}_user`,
          role: role,
          project_id: null,
          registration_number: null,
          is_active: 1
        };

        const roleToken = generateAccessToken(roleUser);

        // Ensure test user exists in DB for authenticate middleware check
        await db('users')
          .insert({
            id: roleUser.id,
            username: roleUser.username,
            email: roleUser.email,
            password: 'dummy_hashed_password',
            first_name: 'Role',
            last_name: 'Test',
            role: role,
            is_active: 1,
            is_email_verified: 1,
            created_at: new Date()
          })
          .onConflict('id')
          .merge(['role', 'is_active']);

        // 1. Calling own authorized endpoint -> MUST SUCCEED (200 OK)
        const accessRes = await request(app)
          .get(`/api/v1/test-roles/${pathSegment}`)
          .set('Authorization', `Bearer ${roleToken}`);

        assert.equal(
          accessRes.status,
          200,
          `Role ${role} must be authorized on its own endpoint /api/v1/test-roles/${pathSegment}`
        );

        // 2. Calling an unauthorized endpoint (unless SUPERUSER) -> MUST BE REJECTED (403 Forbidden)
        if (role !== ROLES.SUPERUSER) {
          const superRes = await request(app)
            .get('/api/v1/test-roles/superuser')
            .set('Authorization', `Bearer ${roleToken}`);

          assert.equal(
            superRes.status,
            403,
            `Role ${role} must NOT be allowed to access superuser endpoint`
          );
        }
      }
    });

    test('Superuser endpoints strictly reject Administrator and other staff roles', async () => {
      const adminUser = {
        id: 'usr-test-admin-check',
        email: 'admin.check@test.local',
        username: 'admin_check',
        role: ROLES.ADMINISTRATOR,
        is_active: 1
      };
      await db('users')
        .insert({
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          password: 'dummy_hash_for_test',
          first_name: 'Admin',
          last_name: 'Check',
          role: ROLES.ADMINISTRATOR,
          is_active: 1,
          created_at: new Date()
        })
        .onConflict('id')
        .merge(['role', 'is_active']);

      const adminToken = generateAccessToken(adminUser);

      // Attempt accessing superuser gate with Administrator role
      const res = await request(app)
        .get('/api/v1/test-roles/superuser')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 403, 'Administrator must be denied superuser control plane access');
      assert.equal(res.body.error, 'Forbidden');
    });
  });

  // --------------------------------------------------------------------------
  // 7. Profile Management & Non-Updatable Constraints
  // --------------------------------------------------------------------------
  describe('7. Profile Management & Non-Updatable Constraints', () => {
    let studentToken;

    before(async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          identifier: testStudentEmail,
          password: testStudentPassword
        });
      assert.equal(loginRes.status, 200, `Profile setup login must succeed. Body: ${JSON.stringify(loginRes.body)}`);
      studentToken = loginRes.body.accessToken;
    });

    test('User can update their own permitted profile fields', async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          phoneNumber: '+255712999888',
          hall: 'Hall 4',
          roomNumber: 'Room 204'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      const updated = await db('users').where({ id: testStudentId }).first();
      assert.equal(updated.phone_number, '+255712999888');
      assert.equal(updated.hall, 'Hall 4');
      assert.equal(updated.room_number, 'Room 204');
    });

    test('User cannot modify their own role, email, or id via profile update', async () => {
      const res = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          phoneNumber: '+255712111222',
          role: ROLES.SUPERUSER,
          email: 'hacked.email@udsm.ac.tz',
          id: 'new-id-injection'
        });

      assert.equal(res.status, 200);

      const user = await db('users').where({ id: testStudentId }).first();
      assert.equal(user.phone_number, '+255712111222', 'Permitted field must be updated');
      assert.equal(user.role, ROLES.STUDENT, 'Role must remain STUDENT');
      assert.equal(user.email, testStudentEmail, 'Email must remain unchanged');
      assert.equal(user.id, testStudentId, 'ID must remain unchanged');
    });
  });
});

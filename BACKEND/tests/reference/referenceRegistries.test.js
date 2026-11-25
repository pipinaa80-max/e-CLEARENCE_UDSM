process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Wave 1: Collection Stations & Colleges/Departments API Suite', () => {
  const request = supertest(app);
  let testDb;
  let adminUser, adminToken;
  let dusUser, dusToken;
  let studentUser, studentToken;

  const createdStationIds = [];
  const createdCollegeIds = [];
  const createdDeptIds = [];

  async function createActor(userData) {
    const hashedPassword = await hashPassword('Wave1Pass123!');
    const userId = `usr-w1-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await testDb('users').insert({
      id: userId,
      first_name: 'Wave1',
      last_name: 'Actor',
      ...userData,
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    const user = await testDb('users').where({ id: userId }).first();
    const sessionId = await createUserSession({ userId: user.id, deviceInfo: 'Wave1-Test', ipAddress: '127.0.0.1' });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    // Clean any leftover Wave 1 test actors
    await testDb('users').where('username', 'like', 'w1_%').del();

    const adm = await createActor({
      username: 'w1_admin',
      email: 'w1_admin@udsm.ac.tz',
      full_name: 'Wave1 Admin',
      role: 'ADMINISTRATOR'
    });
    adminUser = adm.user;
    adminToken = adm.token;

    const dus = await createActor({
      username: 'w1_dus',
      email: 'w1_dus@udsm.ac.tz',
      full_name: 'Wave1 DUS',
      role: 'DIRECTOR_OF_UNDERGRADUATE_STUDIES'
    });
    dusUser = dus.user;
    dusToken = dus.token;

    const std = await createActor({
      username: 'w1_student',
      email: 'w1_student@udsm.ac.tz',
      full_name: 'Wave1 Student',
      registration_number: '2026-04-88801',
      role: 'STUDENT'
    });
    studentUser = std.user;
    studentToken = std.token;
  });

  after(async () => {
    if (createdDeptIds.length > 0) {
      await testDb('departments').whereIn('id', createdDeptIds).del();
    }
    if (createdCollegeIds.length > 0) {
      await testDb('colleges').whereIn('id', createdCollegeIds).del();
    }
    if (createdStationIds.length > 0) {
      await testDb('collection_stations').whereIn('id', createdStationIds).del();
    }
    const actorIds = [adminUser?.id, dusUser?.id, studentUser?.id].filter(Boolean);
    if (actorIds.length > 0) {
      await testDb('user_sessions').whereIn('user_id', actorIds).del();
      await testDb('users').whereIn('id', actorIds).del();
    }
    await testDb.destroy();
  });

  // =========================================================================
  // 1. Collection Stations (/api/v1/collection-stations)
  // =========================================================================
  describe('Collection Stations Endpoints', () => {
    let testStationId;
    const uniqueCode = `TANGA-W1-${Date.now()}`;

    it('GET /api/v1/collection-stations returns active stations publicly without auth', async () => {
      const res = await request.get('/api/v1/collection-stations').expect(200);
      assert.ok(Array.isArray(res.body));
      if (res.body.length > 0) {
        assert.ok(res.body[0].code);
        assert.strictEqual(res.body[0].isActive, true);
      }
    });

    it('GET /api/v1/collection-stations/all rejects unauthenticated and student requests', async () => {
      await request.get('/api/v1/collection-stations/all').expect(401);
      await request
        .get('/api/v1/collection-stations/all')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('POST /api/v1/collection-stations creates a new station (DUS role) and rejects duplicate code', async () => {
      const res = await request
        .post('/api/v1/collection-stations')
        .set('Authorization', `Bearer ${dusToken}`)
        .send({
          code: uniqueCode,
          name: 'UDSM Tanga Regional Hub',
          region: 'Tanga',
          district: 'Tanga City',
          address: 'Uhuru Street Plot 12',
          operatingHours: 'Mon - Fri: 08:30 - 16:00',
          contactPhone: '+255 27 2640001',
          contactEmail: 'tanga.hub@udsm.ac.tz'
        })
        .expect(200);

      assert.ok(res.body.id);
      assert.strictEqual(res.body.code, uniqueCode);
      assert.strictEqual(res.body.name, 'UDSM Tanga Regional Hub');
      assert.strictEqual(res.body.operatingHours, 'Mon - Fri: 08:30 - 16:00');
      assert.strictEqual(res.body.isActive, true);
      testStationId = res.body.id;
      createdStationIds.push(testStationId);

      // Duplicate code returns 409
      await request
        .post('/api/v1/collection-stations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: uniqueCode,
          name: 'Duplicate Station',
          region: 'Tanga',
          address: 'Other Address'
        })
        .expect(409);
    });

    it('PUT /api/v1/collection-stations/:id updates station details', async () => {
      const res = await request
        .put(`/api/v1/collection-stations/${testStationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'UDSM Tanga Regional Collection Hub',
          contactPhone: '+255 27 2649999'
        })
        .expect(200);

      assert.strictEqual(res.body.name, 'UDSM Tanga Regional Collection Hub');
      assert.strictEqual(res.body.contactPhone, '+255 27 2649999');
    });

    it('DELETE /api/v1/collection-stations/:id soft-deactivates station (hidden from active, visible in /all)', async () => {
      await request
        .delete(`/api/v1/collection-stations/${testStationId}`)
        .set('Authorization', `Bearer ${dusToken}`)
        .expect(204);

      const activeRes = await request.get('/api/v1/collection-stations').expect(200);
      assert.ok(!activeRes.body.some(s => s.id === testStationId));

      const allRes = await request
        .get('/api/v1/collection-stations/all')
        .set('Authorization', `Bearer ${dusToken}`)
        .expect(200);
      const found = allRes.body.find(s => s.id === testStationId);
      assert.ok(found);
      assert.strictEqual(found.isActive, false);
    });
  });

  // =========================================================================
  // 2. Colleges & Departments (/api/v1/colleges)
  // =========================================================================
  describe('Colleges & Departments Endpoints', () => {
    let testCollegeId;
    let testDeptId;
    const uniqueColCode = `COLW1-${Date.now()}`;
    const uniqueDeptCode = `DEPW1-${Date.now()}`;

    it('POST /api/v1/colleges creates a college and enforces role gating', async () => {
      await request
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: uniqueColCode, name: 'Unauthorized College' })
        .expect(403);

      const res = await request
        .post('/api/v1/colleges')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: uniqueColCode,
          name: 'Wave1 Test College',
          description: 'Created during Wave 1 migration verification'
        })
        .expect(200);

      assert.ok(res.body.id);
      assert.strictEqual(res.body.code, uniqueColCode);
      assert.strictEqual(res.body.name, 'Wave1 Test College');
      assert.strictEqual(res.body.isActive, true);
      assert.ok(Array.isArray(res.body.departments));
      testCollegeId = res.body.id;
      createdCollegeIds.push(testCollegeId);
    });

    it('POST /api/v1/colleges/:collegeId/departments creates a department under the college', async () => {
      const res = await request
        .post(`/api/v1/colleges/${testCollegeId}/departments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: uniqueDeptCode,
          name: 'Wave1 Test Department',
          description: 'Test department under Wave1 college'
        })
        .expect(200);

      assert.ok(res.body.id);
      assert.strictEqual(res.body.code, uniqueDeptCode);
      assert.strictEqual(res.body.collegeId, testCollegeId);
      assert.strictEqual(res.body.college.code, uniqueColCode);
      testDeptId = res.body.id;
      createdDeptIds.push(testDeptId);
    });

    it('GET /api/v1/colleges returns active colleges hydrated with their departments', async () => {
      const res = await request
        .get('/api/v1/colleges')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      assert.ok(Array.isArray(res.body));
      const found = res.body.find(c => c.id === testCollegeId);
      assert.ok(found);
      assert.ok(found.departments.some(d => d.id === testDeptId));
    });

    it('GET /api/v1/colleges/departments resolves static route (not swallowed by /:id)', async () => {
      const res = await request
        .get('/api/v1/colleges/departments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      assert.ok(Array.isArray(res.body));
      const found = res.body.find(d => d.id === testDeptId);
      assert.ok(found);
      assert.strictEqual(found.code, uniqueDeptCode);
    });

    it('GET /api/v1/colleges/:id and /:collegeId/departments return expected records', async () => {
      const colRes = await request
        .get(`/api/v1/colleges/${testCollegeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      assert.strictEqual(colRes.body.id, testCollegeId);
      assert.strictEqual(colRes.body.departments.length, 1);

      const deptsRes = await request
        .get(`/api/v1/colleges/${testCollegeId}/departments`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      assert.strictEqual(deptsRes.body.length, 1);
      assert.strictEqual(deptsRes.body[0].id, testDeptId);
    });

    it('PUT /api/v1/colleges/departments/:deptId and PUT /api/v1/colleges/:id update records', async () => {
      const deptRes = await request
        .put(`/api/v1/colleges/departments/${testDeptId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Wave1 Updated Department' })
        .expect(200);
      assert.strictEqual(deptRes.body.name, 'Wave1 Updated Department');

      const colRes = await request
        .put(`/api/v1/colleges/${testCollegeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Wave1 Updated College' })
        .expect(200);
      assert.strictEqual(colRes.body.name, 'Wave1 Updated College');
    });

    it('DELETE /api/v1/colleges/:id soft-deactivates the college', async () => {
      await request
        .delete(`/api/v1/colleges/${testCollegeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const activeRes = await request
        .get('/api/v1/colleges')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      assert.ok(!activeRes.body.some(c => c.id === testCollegeId));
    });
  });
});

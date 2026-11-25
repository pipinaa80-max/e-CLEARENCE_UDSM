process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Control Plane & Branding API Suite', () => {
  let request;
  let testDb;
  let userActor, userToken;

  before(async () => {
    testDb = getDb();
    request = supertest(app);

    const hashedPassword = await hashPassword('ControlPass123!');
    const userId = `usr-cp-${Date.now()}`;

    await testDb('users').insert({
      id: userId,
      email: `cp-test-${Date.now()}@udsm.ac.tz`,
      username: `cptest_${Date.now()}`,
      password: hashedPassword,
      role: 'STUDENT',
      first_name: 'Control',
      last_name: 'Plane',
      full_name: 'Control Plane Tester',
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    userActor = await testDb('users').where({ id: userId }).first();
    const sessionId = await createUserSession({
      userId: userActor.id,
      deviceInfo: 'ControlPlane-Test-Runner',
      ipAddress: '127.0.0.1'
    });
    userToken = generateAccessToken(userActor, sessionId);
  });

  after(async () => {
    if (userActor?.id) {
      await testDb('user_sessions').where({ user_id: userActor.id }).del();
      await testDb('users').where({ id: userActor.id }).del();
    }
    if (testDb) {
      await testDb.destroy();
    }
  });

  it('GET /api/v1/control-plane/public/branding returns canonical UDSM branding', async () => {
    const res = await request
      .get('/api/v1/control-plane/public/branding')
      .expect(200);

    assert.strictEqual(res.body.universityName, 'University of Dar es Salaam');
    assert.strictEqual(res.body.shortName, 'UDSM');
    assert.strictEqual(res.body.logoUrl, '/udsm-logo.png');
    assert.strictEqual(res.body.primaryColor, '#0864af');
  });

  it('GET /api/v1/control-plane/branding/current returns branding without auth token', async () => {
    const res = await request
      .get('/api/v1/control-plane/branding/current')
      .expect(200);

    assert.strictEqual(res.body.universityName, 'University of Dar es Salaam');
    assert.strictEqual(res.body.shortName, 'UDSM');
  });

  it('GET /api/v1/control-plane/branding/current returns branding with auth token', async () => {
    const res = await request
      .get('/api/v1/control-plane/branding/current')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    assert.strictEqual(res.body.universityName, 'University of Dar es Salaam');
    assert.strictEqual(res.body.shortName, 'UDSM');
  });

  it('GET /api/v1/control-plane/overview requires authentication (401)', async () => {
    await request
      .get('/api/v1/control-plane/overview')
      .expect(401);
  });

  it('GET /api/v1/control-plane/overview returns project configuration with auth', async () => {
    const res = await request
      .get('/api/v1/control-plane/overview')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body.dashboards));
    assert.strictEqual(res.body.branding.universityName, 'University of Dar es Salaam');
  });
});

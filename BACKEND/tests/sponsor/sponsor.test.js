process.env.NODE_ENV = 'test';

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');

describe('Sponsor API Suite', () => {
  const request = supertest(app);

  after(async () => {
    await getDb().destroy();
  });

  it('GET /api/v1/sponsors returns active sponsors list with 200', async () => {
    const res = await request
      .get('/api/v1/sponsors')
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 4);

    const names = res.body.map(s => s.name);
    assert.ok(names.includes('HESLB'), 'Must include HESLB');
    assert.ok(names.includes('PRIVATE'), 'Must include PRIVATE');
    assert.ok(names.includes('Karimjee Scholarships'), 'Must include Karimjee');
    assert.ok(names.includes('MO scholarship'), 'Must include MO scholarship');
  });

  it('GET /api/v1/sponsors/all rejects unauthenticated request with 401', async () => {
    await request
      .get('/api/v1/sponsors/all')
      .expect(401);
  });
});

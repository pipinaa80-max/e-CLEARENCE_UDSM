const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const controller = require('../../src/controllers/sponsor.controller');
const { getDb } = require('../../src/config/database');

describe('Sponsor Controller In-Memory Unit Suite', () => {
  after(async () => {
    await getDb().destroy();
  });
  it('getActiveSponsors returns 200 with default sponsors array when DB is offline', async () => {
    let statusCode = null;
    let jsonBody = null;

    const req = {};
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      }
    };
    const next = (err) => { throw err; };

    await controller.getActiveSponsors(req, res, next);

    assert.strictEqual(statusCode, 200);
    assert.ok(Array.isArray(jsonBody));
    assert.ok(jsonBody.length >= 4);

    const names = jsonBody.map(s => s.name);
    assert.ok(names.includes('HESLB'), 'Must contain HESLB');
    assert.ok(names.includes('PRIVATE'), 'Must contain PRIVATE');
    assert.ok(names.includes('Karimjee Scholarships'), 'Must contain Karimjee');
    assert.ok(names.includes('MO scholarship'), 'Must contain MO scholarship');
  });

  it('createSponsor rejects empty or missing name with 400', async () => {
    let statusCode = null;
    let jsonBody = null;

    const req = { body: { name: '' } };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        jsonBody = body;
        return this;
      }
    };
    const next = () => {};

    await controller.createSponsor(req, res, next);

    assert.strictEqual(statusCode, 400);
    assert.strictEqual(jsonBody.error, 'BadRequest');
  });
});

process.env.NODE_ENV = 'test';

const { describe, it, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const { PNG } = require('pngjs');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');

describe('Wave 5: Standalone QR Code Utility API Suite (/api/v1/qr/*)', () => {
  const request = supertest(app);

  after(async () => {
    await getDb().destroy();
  });

  it('GET /api/v1/qr/generate rejects missing or blank text with 400', async () => {
    await request.get('/api/v1/qr/generate').expect(400);
    await request.get('/api/v1/qr/generate').query({ text: '   ' }).expect(400);
  });

  it('GET /api/v1/qr/generate produces a valid PNG QR image and POST /api/v1/qr/read decodes it round-trip', async () => {
    const payload = 'https://clearance.udsm.ac.tz/verify/UDSM-CERT-2026-998877';

    const genRes = await request
      .get('/api/v1/qr/generate')
      .query({ text: payload })
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    assert.ok(genRes.headers['content-type'].includes('image/png'));
    assert.ok(Buffer.isBuffer(genRes.body));
    assert.ok(genRes.body.length > 100);
    // Verify PNG magic header
    assert.strictEqual(genRes.body[0], 0x89);
    assert.strictEqual(genRes.body[1], 0x50);
    assert.strictEqual(genRes.body[2], 0x4e);
    assert.strictEqual(genRes.body[3], 0x47);

    // Round-trip decode via POST /api/v1/qr/read
    const readRes = await request
      .post('/api/v1/qr/read')
      .attach('file', genRes.body, { filename: 'cert-qr.png', contentType: 'image/png' })
      .expect(200);

    assert.ok(readRes.headers['content-type'].includes('text/plain'));
    assert.strictEqual(readRes.text, payload);
  });

  it('POST /api/v1/qr/read rejects missing file with 400 plain text', async () => {
    const res = await request
      .post('/api/v1/qr/read')
      .expect(400);

    assert.ok(res.text.includes('QR code image is required'));
  });

  it('POST /api/v1/qr/read rejects invalid/non-image buffers and blank images without QR codes with 400', async () => {
    // 1. Plain text disguised as PNG
    await request
      .post('/api/v1/qr/read')
      .attach('file', Buffer.from('not-a-valid-png-file'), { filename: 'fake.png', contentType: 'image/png' })
      .expect(400);

    // 2. Valid solid-white PNG with no QR code
    const blankPng = new PNG({ width: 100, height: 100 });
    blankPng.data.fill(255);
    const blankBuffer = PNG.sync.write(blankPng);

    const blankRes = await request
      .post('/api/v1/qr/read')
      .attach('file', blankBuffer, { filename: 'blank.png', contentType: 'image/png' })
      .expect(400);

    assert.ok(blankRes.body.message.includes('Unable to decode QR code'));
  });
});

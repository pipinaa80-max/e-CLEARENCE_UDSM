process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Transcript Payment Workflow & Convocation Control Number Suite', () => {
  let request;
  let testDb;

  let student1, student1Token;
  let student2, student2Token;
  let financeOfficer, financeToken;

  let rejectedPaymentId;
  let approvedPaymentId;

  const PASSWORD = 'TestPassword123!';

  async function createActor(userData) {
    const db = testDb || getDb();
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-tp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const parts = (userData.full_name || 'TP User').split(' ');

    await db('users').insert({
      id: userId,
      first_name: parts[0] || 'TP',
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
      deviceInfo: 'TranscriptPayment-Test-Runner',
      ipAddress: '127.0.0.1'
    });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    request = supertest(app);
    testDb = getDb();

    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    // Run latest migrations cleanly in test DB to ensure transcript_payment_requests columns exist
    await testDb.migrate.latest();

    // Clean leftover transcript payment test rows
    await testDb('documents').where('description', 'like', 'Transcript document for payment request %').del();
    await testDb('transcript_payment_requests').where('registration_number', 'like', '2026-04-TP%').del();
    await testDb('convocation_receipts').where('control_number', 'like', '99TP%').del();
    await testDb('department_approvals')
      .whereIn('clearance_request_id', testDb('clearance_requests').select('id').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-TP%')))
      .del();
    await testDb('clearance_requests').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-TP%')).del();
    await testDb('students').where('registration_number', 'like', '2026-04-TP%').del();
    await testDb('users').where('username', 'like', 'tp_test_%').del();

    const s1 = await createActor({
      username: 'tp_test_student1',
      email: 'tp_test_student1@udsm.ac.tz',
      full_name: 'Amina Transcript One',
      registration_number: '2026-04-TP0001',
      role: 'STUDENT',
      college: 'CoICT',
      department: 'Computer Science and Engineering',
      programme: 'BSc. Computer Science'
    });
    student1 = s1.user;
    student1Token = s1.token;

    const s2 = await createActor({
      username: 'tp_test_student2',
      email: 'tp_test_student2@udsm.ac.tz',
      full_name: 'Juma Transcript Two',
      registration_number: '2026-04-TP0002',
      role: 'STUDENT',
      college: 'CoICT',
      department: 'Computer Science and Engineering',
      programme: 'BSc. Computer Science'
    });
    student2 = s2.user;
    student2Token = s2.token;

    const fin = await createActor({
      username: 'tp_test_finance',
      email: 'tp_test_finance@udsm.ac.tz',
      full_name: 'Finance Reviewer TP',
      role: 'FINANCE_OFFICER'
    });
    financeOfficer = fin.user;
    financeToken = fin.token;
  });

  after(async () => {
    await testDb('documents').where('description', 'like', 'Transcript document for payment request %').del();
    await testDb('transcript_payment_requests').where('registration_number', 'like', '2026-04-TP%').del();
    await testDb('convocation_receipts').where('control_number', 'like', '99TP%').del();
    await testDb('notifications').whereIn('user_id', [student1?.id, student2?.id].filter(Boolean)).del();
    await testDb('department_approvals')
      .whereIn('clearance_request_id', testDb('clearance_requests').select('id').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-TP%')))
      .del();
    await testDb('clearance_requests').whereIn('student_id', testDb('students').select('id').where('registration_number', 'like', '2026-04-TP%')).del();
    await testDb('students').where('registration_number', 'like', '2026-04-TP%').del();
    await testDb('user_sessions').whereIn('user_id', [student1?.id, student2?.id, financeOfficer?.id].filter(Boolean)).del();
    await testDb('users').where('username', 'like', 'tp_test_%').del();
    await testDb.destroy();
  });

  describe('1. Transcript Payment Submission & Validation', () => {
    it('Rejects invalid control number format (400)', async () => {
      const res = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ controlNumber: 'ab!' });

      assert.strictEqual(res.status, 400);
    });

    it('Forbids Finance Officer from submitting a student payment (403)', async () => {
      const res = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ controlNumber: '99TP1000001' });

      assert.strictEqual(res.status, 403);
    });

    it('Student submits valid transcript payment control number (200)', async () => {
      const res = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ controlNumber: '99tp-0001-a' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.controlNumber, '99TP-0001-A');
      assert.strictEqual(res.body.status, 'PENDING');
      assert.strictEqual(res.body.copies, 1);
      assert.strictEqual(res.body.amountTzs, 15000);
      assert.strictEqual(res.body.studentId, student1.id);
      rejectedPaymentId = res.body.id;
    });

    it('Prevents second active PENDING payment request for same student (409)', async () => {
      const res = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ controlNumber: '99TP-0001-B' });

      assert.strictEqual(res.status, 409);
    });

    it('Prevents duplicate control number across students (409)', async () => {
      const res = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ controlNumber: '99tp-0001-a' });

      assert.strictEqual(res.status, 409);
    });

    it('Student lists their own transcript payments via GET /mine', async () => {
      const res = await request
        .get('/api/v1/transcript-payments/mine')
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body));
      assert.strictEqual(res.body.length, 1);
      assert.strictEqual(res.body[0].id, rejectedPaymentId);
    });
  });

  describe('2. Finance Queue, Rejection, Resubmission & Approval', () => {
    it('Blocks Student from viewing Finance queue (403)', async () => {
      const res = await request
        .get('/api/v1/transcript-payments/finance')
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 403);
    });

    it('Finance Officer views PENDING queue', async () => {
      const res = await request
        .get('/api/v1/transcript-payments/finance?status=PENDING')
        .set('Authorization', `Bearer ${financeToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.some(r => r.id === rejectedPaymentId));
    });

    it('Finance rejects with too-short reason (400)', async () => {
      const res = await request
        .post(`/api/v1/transcript-payments/${rejectedPaymentId}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reason: 'bad' });

      assert.strictEqual(res.status, 400);
    });

    it('Finance rejects first payment with valid reason (200)', async () => {
      const res = await request
        .post(`/api/v1/transcript-payments/${rejectedPaymentId}/reject`)
        .set('Authorization', `Bearer ${financeToken}`)
        .send({ reason: 'Control number payment not settled in GePG bank ledger.' });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'REJECTED');
      assert.strictEqual(res.body.rejectionReason, 'Control number payment not settled in GePG bank ledger.');
    });

    it('Student submits replacement control number after rejection and Finance approves it', async () => {
      const submitRes = await request
        .post('/api/v1/transcript-payments')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ controlNumber: '99TP-0002-OK' });

      assert.strictEqual(submitRes.status, 200);
      approvedPaymentId = submitRes.body.id;

      const approveRes = await request
        .post(`/api/v1/transcript-payments/${approvedPaymentId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`);

      assert.strictEqual(approveRes.status, 200);
      assert.strictEqual(approveRes.body.status, 'APPROVED');
      assert.ok(approveRes.body.reviewedAt);

      // Double approval returns 409
      const dupApprove = await request
        .post(`/api/v1/transcript-payments/${approvedPaymentId}/approve`)
        .set('Authorization', `Bearer ${financeToken}`);
      assert.strictEqual(dupApprove.status, 409);
    });
  });

  describe('3. Strict 3-Step Transcript Document & Collection Gating', () => {
    it('Blocks transcript document upload for rejected payment request (403)', async () => {
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1.id)
        .field('fileType', 'Birth Certificate')
        .field('description', `Transcript document for payment request ${rejectedPaymentId}`)
        .attach('file', Buffer.from('%PDF-1.4\nfake-birth-cert'), {
          filename: 'birth.pdf',
          contentType: 'application/pdf'
        });

      assert.strictEqual(res.status, 403);
    });

    it('Blocks collection preference update before uploading all 3 required documents (403)', async () => {
      const res = await request
        .put(`/api/v1/transcript-payments/${approvedPaymentId}/collection`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          collectionMethod: 'Physical Collection',
          collectionAddress: 'UDSM Main Campus, DUS Office'
        });

      assert.strictEqual(res.status, 403);
    });

    it('Reports has-required=false and empty categories before uploads', async () => {
      const hasRes = await request
        .get(`/api/v1/documents/transcript/${approvedPaymentId}/has-required`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(hasRes.status, 200);
      assert.strictEqual(hasRes.body, false);

      const catRes = await request
        .get(`/api/v1/documents/transcript/${approvedPaymentId}/categories`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(catRes.status, 200);
      assert.deepStrictEqual(catRes.body, []);
    });

    it('Uploads all 3 required transcript documents via Angular JSON-Blob multipart contract & blocks duplicates', async () => {
      const categories = ['Birth Certificate', 'O-Level Certificate', 'A-Level Certificate'];

      for (const cat of categories) {
        const metadataJson = JSON.stringify({
          studentId: student1.id,
          fileType: cat,
          description: `Transcript document for payment request ${approvedPaymentId}`
        });

        const res = await request
          .post('/api/v1/documents/upload')
          .set('Authorization', `Bearer ${student1Token}`)
          .attach('document', Buffer.from(metadataJson), {
            filename: 'blob',
            contentType: 'application/json'
          })
          .attach('file', Buffer.from(`%PDF-1.4\n${cat}`), {
            filename: `${cat.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            contentType: 'application/pdf'
          });

        assert.strictEqual(res.status, 201, `Failed uploading ${cat}: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.data.category, cat);
      }

      // Duplicate upload of Birth Certificate for same payment request returns 409
      const dupRes = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1.id)
        .field('fileType', 'Birth Certificate')
        .field('description', `Transcript document for payment request ${approvedPaymentId}`)
        .attach('file', Buffer.from('%PDF-1.4\ndup'), {
          filename: 'dup.pdf',
          contentType: 'application/pdf'
        });
      assert.strictEqual(dupRes.status, 409);

      const hasRes = await request
        .get(`/api/v1/documents/transcript/${approvedPaymentId}/has-required`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(hasRes.status, 200);
      assert.strictEqual(hasRes.body, true);

      const catRes = await request
        .get(`/api/v1/documents/transcript/${approvedPaymentId}/categories`)
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(catRes.status, 200);
      assert.deepStrictEqual(catRes.body, categories);
    });

    it('Allows collection preference update after Finance approval + all 3 documents (200)', async () => {
      const badMethod = await request
        .put(`/api/v1/transcript-payments/${approvedPaymentId}/collection`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          collectionMethod: 'Carrier Pigeon',
          collectionAddress: 'Some address'
        });
      assert.strictEqual(badMethod.status, 400);

      const res = await request
        .put(`/api/v1/transcript-payments/${approvedPaymentId}/collection`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          collectionMethod: 'Post by DHL',
          collectionAddress: 'P.O. Box 35091, Dar es Salaam',
          postingRegion: 'Dar es Salaam',
          postingWard: 'Ubungo',
          postingPoBox: '35091',
          contactPhone: '+255712345678',
          contactEmail: 'amina.tp@udsm.ac.tz'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.collectionMethod, 'Post by DHL');
      assert.strictEqual(res.body.collectionAddress, 'P.O. Box 35091, Dar es Salaam');
      assert.strictEqual(res.body.postingRegion, 'Dar es Salaam');
      assert.strictEqual(res.body.contactEmail, 'amina.tp@udsm.ac.tz');
    });
  });

  describe('4. Convocation Auto-Approval & ClearanceResponse.controlNumber', () => {
    it('Auto-approves Convocation on receipt submission and exposes controlNumber on clearance status', async () => {
      const submitClearance = await request
        .post('/api/v1/clearance/request')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          studentName: student1.full_name,
          registrationNumber: student1.registration_number,
          college: 'CoICT',
          department: 'Computer Science and Engineering',
          programme: 'BSc. Computer Science',
          hall: 'Hall 1'
        });
      assert.strictEqual(submitClearance.status, 200);

      const submitControl = await request
        .post('/api/v1/convocation/submit-receipt')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          studentId: student1.id,
          controlNumber: '99TP55443322',
          receiptNumber: 'REC-TP-AUTO-1',
          paymentDate: '2026-11-24'
        });
      assert.strictEqual(submitControl.status, 200);
      assert.strictEqual(submitControl.body.receipt.status, 'APPROVED');

      const statusRes = await request
        .get('/api/v1/clearance/my-request')
        .set('Authorization', `Bearer ${student1Token}`);
      assert.strictEqual(statusRes.status, 200);
      assert.strictEqual(statusRes.body.currentStage, 'Parallel');
      assert.strictEqual(statusRes.body.controlNumber, '99TP55443322');
      assert.strictEqual(statusRes.body.control_number, '99TP55443322');
    });
  });
});

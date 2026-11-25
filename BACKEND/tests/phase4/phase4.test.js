process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');
const CertificateService = require('../../src/services/certificate.service');

describe('Phase 4: Document Management, PDF Certificate & Analytics Engine Suite', () => {
  let request;
  let testDb;

  let student1, student1Token, student1Rec;
  let student2, student2Token, student2Rec;
  let convocationOfficer, convocationToken;
  let libraryOfficer, libraryToken;
  let dusOfficer, dusToken;
  let principalOfficer, principalToken;
  let gamesCoach, gamesToken;
  let adminUser, adminToken;

  const PASSWORD = 'TestPassword123!';
  const REG_STUDENT_1 = '2022-04-77771';
  const REG_STUDENT_2 = '2022-04-77772';

  // Sample valid file buffers
  const VALID_PDF_BUFFER = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nxref\n0 2\n0000000000 65535 f\n0000000018 00000 n\ntrailer<</Size 2/Root 1 0 R>>\nstartxref\n71\n%%EOF');
  const VALID_PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89]);

  async function createTestActor(userData) {
    const db = testDb || getDb();
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-p4-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nameParts = (userData.full_name || 'Phase4 User').split(' ');
    const firstName = nameParts[0] || 'Phase4';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    await db('users').insert({
      id: userId,
      first_name: firstName,
      last_name: lastName,
      ...userData,
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    const user = await db('users').where({ id: userId }).first();
    const sessionId = await createUserSession({ userId: user.id, deviceInfo: 'Phase4-Test-Runner', ipAddress: '127.0.0.1' });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    try {
      request = supertest(app);
      testDb = getDb();

      assert.strictEqual(env.NODE_ENV, 'test');
      assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

      // Ensure test database schema is up-to-date with latest migrations
      await testDb.migrate.latest();

      // Clean up Phase 4 test artifacts
      await testDb('clearance_certificates').del();
      await testDb('documents').del();
      await testDb('student_debt_flags').del();
      await testDb('department_approvals').del();
      await testDb('clearance_requests').del();
      await testDb('students').whereRaw('LOWER(registration_number) LIKE ?', ['%7777%']).del();
      await testDb('user_sessions').del();
      await testDb('refresh_tokens').del();
      await testDb('users').where('username', 'like', 'p4_%').orWhere('email', 'like', '%p4_%').del();

    // Ensure upload dir exists
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    }

    // 1. Student 1
    const s1 = await createTestActor({
      username: 'p4_student1',
      email: 'p4_student1@udsm.ac.tz',
      full_name: 'Amina Phase4 Juma',
      registration_number: REG_STUDENT_1,
      role: 'STUDENT',
      college: 'CoICT',
      department: 'CSE'
    });
    student1 = s1.user;
    student1Token = s1.token;

    const s1Id = `std-p4-1-${Date.now()}`;
    await testDb('students').insert({
      id: s1Id,
      user_id: student1.id,
      registration_number: REG_STUDENT_1,
      full_name: 'Amina Phase4 Juma',
      college: 'CoICT',
      department: 'CSE',
      programme: 'BSc Computer Science',
      graduation_year: '2026',
      clearance_status: 'PENDING',
      project_id: 'udsm-main',
      created_at: new Date(),
      updated_at: new Date()
    });
    student1Rec = await testDb('students').where({ id: s1Id }).first();

    // 2. Student 2
    const s2 = await createTestActor({
      username: 'p4_student2',
      email: 'p4_student2@udsm.ac.tz',
      full_name: 'Baraka Phase4 Mwita',
      registration_number: REG_STUDENT_2,
      role: 'STUDENT',
      college: 'CoICT',
      department: 'CSE'
    });
    student2 = s2.user;
    student2Token = s2.token;

    const s2Id = `std-p4-2-${Date.now()}`;
    await testDb('students').insert({
      id: s2Id,
      user_id: student2.id,
      registration_number: REG_STUDENT_2,
      full_name: 'Baraka Phase4 Mwita',
      college: 'CoICT',
      department: 'CSE',
      programme: 'BSc Computer Engineering',
      graduation_year: '2026',
      clearance_status: 'PENDING',
      project_id: 'udsm-main',
      created_at: new Date(),
      updated_at: new Date()
    });
    student2Rec = await testDb('students').where({ id: s2Id }).first();

    // 3. Convocation Officer
    const co = await createTestActor({
      username: 'p4_convocation',
      email: 'p4_convocation@udsm.ac.tz',
      full_name: 'Zawadi Convocation Officer',
      role: 'CONVOCATION_OFFICER'
    });
    convocationOfficer = co.user;
    convocationToken = co.token;

    // 4. Library Officer
    const lib = await createTestActor({
      username: 'p4_library',
      email: 'p4_library@udsm.ac.tz',
      full_name: 'Charles Library Officer',
      role: 'LIBRARY_OFFICER'
    });
    libraryOfficer = lib.user;
    libraryToken = lib.token;

    // 5. Director of Undergraduate Studies (DUS)
    const dus = await createTestActor({
      username: 'p4_dus',
      email: 'p4_dus@udsm.ac.tz',
      full_name: 'Prof. DUS Officer',
      role: 'DIRECTOR_OF_UNDERGRADUATE_STUDIES'
    });
    dusOfficer = dus.user;
    dusToken = dus.token;

    // 6. Principal
    const princ = await createTestActor({
      username: 'p4_principal',
      email: 'p4_principal@udsm.ac.tz',
      full_name: 'Dr. Principal CoICT',
      role: 'PRINCIPAL',
      college: 'CoICT'
    });
    principalOfficer = princ.user;
    principalToken = princ.token;

    // 7. Games Coach (unauthorized for executive analytics)
    const games = await createTestActor({
      username: 'p4_games',
      email: 'p4_games@udsm.ac.tz',
      full_name: 'Coach Athletics',
      role: 'GAMES_COACH'
    });
    gamesCoach = games.user;
    gamesToken = games.token;

    // 8. Administrator
    const adm = await createTestActor({
      username: 'p4_admin',
      email: 'p4_admin@udsm.ac.tz',
      full_name: 'System Admin',
      role: 'ADMINISTRATOR'
    });
    adminUser = adm.user;
    adminToken = adm.token;
  } catch (err) {
    console.error('CRITICAL BEFORE HOOK ERROR:', err);
    throw err;
  }
  });

  const createdDiskFiles = [];

  after(async () => {
    for (const filePath of createdDiskFiles) {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
    }
    // Clean up Phase 4 test data
    await testDb('clearance_certificates').del();
    await testDb('documents').del();
    await testDb('student_debt_flags').del();
    await testDb('department_approvals').del();
    await testDb('clearance_requests').del();
    await testDb('students').whereRaw('LOWER(registration_number) LIKE ?', ['%7777%']).del();
    await testDb('user_sessions').del();
    await testDb('refresh_tokens').del();
    await testDb('users').where('username', 'like', 'p4_%').orWhere('email', 'like', '%p4_%').del();
    await testDb.destroy();
  });

  // =========================================================================
  // SUITE 1: DOCUMENT MANAGEMENT & SECURE FILE UPLOADS
  // =========================================================================
  describe('1. Document Management & Secure File Uploads Suite', () => {
    let uploadedPdfDocId;
    let uploadedPngDocId;

    it('Student uploads a valid PDF document with metadata', async () => {
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1Rec.id)
        .field('description', 'Official Convocation Fee Pay-in Slip')
        .field('category', 'Convocation Receipt')
        .attach('file', VALID_PDF_BUFFER, 'convocation_receipt.pdf');

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.id);
      assert.strictEqual(res.body.data.fileName, 'convocation_receipt.pdf');
      assert.strictEqual(res.body.data.fileType, 'application/pdf');
      assert.strictEqual(res.body.data.category, 'Convocation Receipt');
      assert.strictEqual(res.body.data.verified, false);
      assert.strictEqual(res.body.data.studentId, student1Rec.id);

      uploadedPdfDocId = res.body.data.id;

      // Verify physical file was created in PRIVATE_DOCUMENTS_DIR with UUID naming
      const ext = path.extname(res.body.data.fileName);
      const expectedPath = path.join(env.PRIVATE_DOCUMENTS_DIR, `${uploadedPdfDocId}${ext}`);
      assert.ok(fs.existsSync(expectedPath), 'Physical file must exist on disk with UUID-based filename');
      createdDiskFiles.push(expectedPath);
    });

    it('Student uploads a valid PNG image document', async () => {
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1Rec.id)
        .field('description', 'Scanned University Smart ID Card')
        .field('category', 'ID Card Copy')
        .attach('file', VALID_PNG_BUFFER, 'id_card.png');

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.fileType, 'image/png');
      assert.strictEqual(res.body.data.category, 'ID Card Copy');

      uploadedPngDocId = res.body.data.id;
      createdDiskFiles.push(path.join(env.PRIVATE_DOCUMENTS_DIR, `${uploadedPngDocId}.png`));
    });

    it('Upload rejects disallowed file extensions (.exe) with 400 Bad Request', async () => {
      const badBuffer = Buffer.from('malicious payload');
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1Rec.id)
        .attach('file', badBuffer, 'trojan.exe');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('Upload rejects deceptive MIME/extension mismatch (magic byte verification failure)', async () => {
      // Extension says .pdf, but content is arbitrary plain text without %PDF header
      const fakePdfBuffer = Buffer.from('This is a text file, not a real PDF document!');
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1Rec.id)
        .attach('file', fakePdfBuffer, 'fake_receipt.pdf');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error, 'SecurityValidationFailed');
      assert.match(res.body.message, /magic byte/i);
    });

    it('Path traversal attack in filename is prevented and neutralized', async () => {
      const res = await request
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${student1Token}`)
        .field('studentId', student1Rec.id)
        .field('category', 'Clearance Supporting Document')
        .attach('file', VALID_PDF_BUFFER, '../../../../system_root.pdf');

      assert.strictEqual(res.status, 201);
      assert.ok(res.body.data.id);

      // Verify it did not escape PRIVATE_DOCUMENTS_DIR
      const safePath = path.join(env.PRIVATE_DOCUMENTS_DIR, `${res.body.data.id}.pdf`);
      assert.ok(fs.existsSync(safePath), 'File must be stored safely in designated PRIVATE_DOCUMENTS_DIR without path traversal');
      createdDiskFiles.push(safePath);
    });

    it('Student can view their own documents list with pagination', async () => {
      const res = await request
        .get(`/api/v1/documents/student/${student1Rec.id}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .query({ page: 0, size: 10 });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.content));
      assert.ok(res.body.totalElements >= 2);
      assert.ok(res.body.content.some(d => d.id === uploadedPdfDocId));
    });

    it('Student cannot view another student documents (403 Forbidden)', async () => {
      const res = await request
        .get(`/api/v1/documents/student/${student2Rec.id}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('Clearing Officer can view any student documents', async () => {
      const res = await request
        .get(`/api/v1/documents/student/${student1Rec.id}`)
        .set('Authorization', `Bearer ${libraryToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.content));
    });

    it('Student cannot verify documents (403 Forbidden)', async () => {
      const res = await request
        .put(`/api/v1/documents/verify/${uploadedPdfDocId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ verified: true });

      assert.strictEqual(res.status, 403);
    });

    it('Officer verifies student document with comments', async () => {
      const res = await request
        .put(`/api/v1/documents/verify/${uploadedPdfDocId}`)
        .set('Authorization', `Bearer ${convocationToken}`)
        .send({
          verified: true,
          comment: 'Pay-in slip matches university convocation ledger entry #98421.'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.verified, true);
      assert.strictEqual(res.body.data.verificationComment, 'Pay-in slip matches university convocation ledger entry #98421.');

      // Verify notification recorded for student
      const notif = await testDb('notifications')
        .where({ student_id: student1Rec.id, type: 'DOCUMENT_VERIFIED' })
        .first();
      assert.ok(notif, 'Student notification must be logged on document verification');
    });

    it('Officer rejects a document with feedback comments', async () => {
      const res = await request
        .put(`/api/v1/documents/verify/${uploadedPngDocId}`)
        .set('Authorization', `Bearer ${libraryToken}`)
        .send({
          verified: false,
          comment: 'Smart Card image is blurry. Please re-scan with high contrast.'
        });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.verified, false);
      assert.strictEqual(res.body.data.verificationComment, 'Smart Card image is blurry. Please re-scan with high contrast.');
    });

    it('Student cannot delete a verified document (400 Bad Request)', async () => {
      const res = await request
        .delete(`/api/v1/documents/${uploadedPdfDocId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /verified/i);
    });

    it('Student can delete a pending or rejected unverified document', async () => {
      const res = await request
        .delete(`/api/v1/documents/${uploadedPngDocId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);

      // Verify file deleted from disk
      const diskPath = path.join(env.UPLOAD_DIR, `${uploadedPngDocId}.png`);
      assert.strictEqual(fs.existsSync(diskPath), false, 'Physical file must be unlinked from storage on delete');

      // Verify DB record deleted
      const checkDb = await testDb('documents').where({ id: uploadedPngDocId }).first();
      assert.strictEqual(checkDb, undefined);
    });

    it('Authenticated file download streams document content with nosniff and safe disposition', async () => {
      const res = await request
        .get(`/api/v1/documents/${uploadedPdfDocId}/download`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['content-type'], 'application/pdf');
      assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
      assert.match(res.headers['content-disposition'], /inline; filename=/i);
      assert.ok(Buffer.isBuffer(res.body));
      assert.ok(res.body.subarray(0, 4).equals(Buffer.from('%PDF')));
    });

    it('Unauthorized student cannot download another student document', async () => {
      const res = await request
        .get(`/api/v1/documents/${uploadedPdfDocId}/download`)
        .set('Authorization', `Bearer ${student2Token}`);

      assert.strictEqual(res.status, 403);
    });

    it('Department officer from different department is blocked (403) from accessing student documents', async () => {
      const { user: diffDeptOfficer, token: diffToken } = await createTestActor({
        username: 'p4_dept_other',
        email: 'p4_dept_other@udsm.ac.tz',
        role: 'DEPARTMENT_OFFICER',
        college: 'CoICT',
        department: 'Electrical Engineering' // Mismatches student1's 'CSE'
      });

      const res = await request
        .get(`/api/v1/documents/student/${student1Rec.id}`)
        .set('Authorization', `Bearer ${diffToken}`);

      assert.strictEqual(res.status, 403);
      assert.match(res.body.message, /department/i);
    });
  });

  // =========================================================================
  // SUITE 2: PDF CLEARANCE CERTIFICATE GENERATION & VERIFICATION
  // =========================================================================
  describe('2. PDF Clearance Certificate Generation & Tamper-Proof Verification Suite', () => {
    let completedReqId;
    let inProgressReqId;
    let generatedCertCode;

    before(async () => {
      // 1. Setup in-progress request for Student 2
      const [ipId] = await testDb('clearance_requests').insert({
        student_id: student2Rec.id,
        status: 'IN_PROGRESS',
        current_stage: 'Department',
        submitted_at: new Date(Date.now() - 3600000 * 24 * 3),
        updated_at: new Date(),
        college: 'CoICT',
        department: 'CSE',
        programme: 'BSc Computer Engineering',
        project_id: 'udsm-main'
      });
      inProgressReqId = ipId;

      // 2. Setup 100% completed clearance request for Student 1
      const [compReqId] = await testDb('clearance_requests').insert({
        student_id: student1Rec.id,
        status: 'COMPLETED',
        current_stage: 'Completed',
        submitted_at: new Date(Date.now() - 3600000 * 24 * 5),
        updated_at: new Date(),
        college: 'CoICT',
        department: 'CSE',
        programme: 'BSc Computer Science',
        project_id: 'udsm-main'
      });
      completedReqId = compReqId;

      // Add all completed department approvals for Student 1
      const officeNames = [
        'Convocation', 'Library', 'Games Coach', 'Hall Warden',
        'USAB', 'DARUSO', 'Dean of Students', 'Smart Card',
        'Department', 'Principal', 'Finance'
      ];
      for (const off of officeNames) {
        await testDb('department_approvals').insert({
          clearance_request_id: completedReqId,
          department: off,
          status: 'APPROVED',
          approved_by: `Officer ${off}`,
          approval_date: new Date(),
          comments: 'Approved without remarks.'
        });
      }
    });

    it('Certificate download is REJECTED (400) if clearance request is not COMPLETED', async () => {
      const res = await request
        .get(`/api/v1/clearance/certificate/${inProgressReqId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /must be 'COMPLETED'/i);
    });

    it('Certificate generation is BLOCKED if student has unresolved debt flags', async () => {
      // Temporarily attach an open debt flag to Student 1
      const flagId = `debt-flag-p4-${Date.now()}`;
      await testDb('student_debt_flags').insert({
        id: flagId,
        student_id: student1Rec.id,
        registration_number: REG_STUDENT_1,
        college: 'CoICT',
        department: 'CSE',
        lecturer_id: 'usr-lec-1',
        amount: 50000,
        reason: 'Unreturned Embedded Systems Development Board',
        status: 'OPEN',
        created_at: new Date()
      });

      const res = await request
        .get(`/api/v1/clearance/certificate/${completedReqId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 400);
      assert.match(res.body.message, /debt/i);

      // Clean up debt flag
      await testDb('student_debt_flags').where({ id: flagId }).del();
    });

    it('Generates official PDF certificate stream for COMPLETED request with zero debts', async () => {
      const res = await request
        .get(`/api/v1/clearance/certificate/${completedReqId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['content-type'], 'application/pdf');
      assert.ok(Buffer.isBuffer(res.body));
      assert.ok(res.body.subarray(0, 4).equals(Buffer.from('%PDF')), 'Output must be a valid PDF buffer');

      // Verify certificate record created in clearance_certificates
      const certRec = await testDb('clearance_certificates')
        .where({ clearance_request_id: completedReqId })
        .first();

      assert.ok(certRec);
      assert.ok(certRec.certificate_number.startsWith('UDSM-CLR-'));
      assert.strictEqual(certRec.verification_code.length, 48, 'Verification code must be 24 random bytes / 48 hex chars (192 bits of entropy)');
      assert.notStrictEqual(certRec.verification_code, certRec.certificate_number, 'Verification code must be separate from certificate number');
      assert.ok(certRec.digital_signature_hash);
      assert.strictEqual(certRec.is_revoked, 0);

      generatedCertCode = certRec.verification_code;

      // Verify clearance_requests record was updated with certificate metadata
      const reqRec = await testDb('clearance_requests').where({ id: completedReqId }).first();
      assert.strictEqual(reqRec.certificate_verified, 1);
      assert.ok(reqRec.digital_signature_hash);
    });

    it('Concurrent certificate creation handles race conditions and prevents duplicate records', async () => {
      // Execute 2 concurrent requests to generate the certificate for the same completed clearance request
      const [resA, resB] = await Promise.all([
        CertificateService.getOrCreateCertificate(completedReqId, dusOfficer),
        CertificateService.getOrCreateCertificate(completedReqId, dusOfficer)
      ]);

      assert.strictEqual(resA.cert.id, resB.cert.id, 'Concurrent calls must return the same certificate record');
      assert.strictEqual(resA.cert.certificate_number, resB.cert.certificate_number);

      // Verify that database has exactly 1 certificate record for this request
      const count = await testDb('clearance_certificates')
        .where({ clearance_request_id: completedReqId })
        .count('id as total')
        .first();

      assert.strictEqual(Number(count.total), 1, 'Exactly one certificate record must exist for the clearance request');
    });

    it('Student convenience endpoint GET /api/v1/clearance/my-certificate streams certificate', async () => {
      const res = await request
        .get('/api/v1/clearance/my-certificate')
        .set('Authorization', `Bearer ${student1Token}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['content-type'], 'application/pdf');
      assert.ok(res.body.subarray(0, 4).equals(Buffer.from('%PDF')));
    });

    it('Public certificate verification endpoint returns VALID minimal details with privacy protection', async () => {
      const res = await request
        .get(`/api/v1/clearance/certificate/verify/${generatedCertCode}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.isValid, true);
      assert.strictEqual(res.body.status, 'VALID');
      assert.strictEqual(res.body.studentName, 'Amina Phase4 Juma');
      assert.ok(res.body.certificateNumber);
      assert.ok(res.body.verificationHash);
      assert.strictEqual(res.body.clearanceStatus, 'COMPLETED');
      assert.ok(res.body.programme);
      assert.ok(res.body.college);
      assert.ok(res.body.issuedAt);

      // Privacy audit: Verify internal database IDs, registration numbers, and paths are omitted
      assert.strictEqual(res.body.id, undefined);
      assert.strictEqual(res.body.clearance_request_id, undefined);
      assert.strictEqual(res.body.student_id, undefined);
      assert.strictEqual(res.body.user_id, undefined);
      assert.strictEqual(res.body.filePath, undefined);
    });

    it('Public certificate verification returns 404 for invalid code', async () => {
      const res = await request
        .get('/api/v1/clearance/certificate/verify/NON_EXISTENT_CODE_999');

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.isValid, false);
      assert.strictEqual(res.body.status, 'NOT_FOUND');
    });

    it('Public certificate verification returns 400 for malformed/whitespace code', async () => {
      const res = await request
        .get('/api/v1/clearance/certificate/verify/%20');

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.isValid, false);
      assert.strictEqual(res.body.status, 'INVALID');
      assert.match(res.body.message, /required/i);
    });

    it('Public certificate verification flags REVOKED certificates without leaking internal disciplinary reason', async () => {
      // Mark certificate as revoked
      await testDb('clearance_certificates')
        .where({ verification_code: generatedCertCode })
        .update({
          is_revoked: 1,
          revocation_reason: 'Confidential Disciplinary Board Suspension Order #2026/04'
        });

      const res = await request
        .get(`/api/v1/clearance/certificate/verify/${generatedCertCode}`);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.isValid, false);
      assert.strictEqual(res.body.status, 'REVOKED');
      assert.match(res.body.message, /officially revoked/i);

      // PRIVACY PROTECTION: Confirm internal disciplinary reason is strictly excluded from public output
      assert.strictEqual(res.body.reason, undefined, 'Internal disciplinary reason must not be leaked to public');
      assert.strictEqual(res.body.revocationReason, undefined, 'Internal revocation reason must not be leaked to public');

      // Restore active status
      await testDb('clearance_certificates')
        .where({ verification_code: generatedCertCode })
        .update({ is_revoked: 0 });
    });

    it('Fails safely with clear configuration error if required verification URL is missing in production', () => {
      assert.throws(() => {
        const prevEnv = process.env.NODE_ENV;
        const prevUrl = process.env.CERTIFICATE_VERIFY_BASE_URL;
        try {
          process.env.NODE_ENV = 'production';
          delete process.env.CERTIFICATE_VERIFY_BASE_URL;
          if (process.env.NODE_ENV === 'production' && (!process.env.CERTIFICATE_VERIFY_BASE_URL || !process.env.CERTIFICATE_VERIFY_BASE_URL.trim())) {
            throw new Error('FATAL: CERTIFICATE_VERIFY_BASE_URL must be explicitly configured in production environment. Assumed fallback domains are strictly prohibited.');
          }
        } finally {
          process.env.NODE_ENV = prevEnv;
          if (prevUrl) process.env.CERTIFICATE_VERIFY_BASE_URL = prevUrl;
        }
      }, /FATAL: CERTIFICATE_VERIFY_BASE_URL must be explicitly configured/);
    });
  });

  // =========================================================================
  // SUITE 3: COMPREHENSIVE CLEARANCE ANALYTICS ENGINE
  // =========================================================================
  describe('3. Clearance Analytics Engine Suite', () => {
    it('Authorized role (DUS) accesses full university-wide analytics summary', async () => {
      const res = await request
        .get('/api/v1/clearance/analytics-summary')
        .set('Authorization', `Bearer ${dusToken}`);

      assert.strictEqual(res.status, 200);
      assert.ok(res.body.requests);
      assert.ok(res.body.requests.total >= 2);
      assert.ok(res.body.requests.completed >= 1);
      assert.ok(typeof res.body.completionRate === 'number');
      assert.ok(res.body.stageBottlenecks);
      assert.ok(res.body.offices);
      assert.ok(Array.isArray(res.body.colleges));
    });

    it('Unauthorized role (GAMES_COACH) rejected from analytics with 403 Forbidden', async () => {
      const res = await request
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${gamesToken}`);

      assert.strictEqual(res.status, 403);
    });

    it('Overview metrics endpoint returns bottlenecks and turnaround metrics', async () => {
      const res = await request
        .get('/api/v1/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.stageBottlenecks);
      assert.ok(res.body.data.stageBottlenecks.Department !== undefined);
      assert.ok(typeof res.body.data.completionRate === 'number');
      assert.ok(typeof res.body.data.avgTurnaroundHours === 'number');
    });

    it('Office performance breakdown returns all 13 institutional offices', async () => {
      const res = await request
        .get('/api/v1/analytics/offices')
        .set('Authorization', `Bearer ${dusToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      const offices = res.body.data;
      assert.ok(offices.Convocation);
      assert.ok(offices.Library);
      assert.ok(offices['Games Coach']);
      assert.ok(offices['Hall Warden']);
      assert.ok(offices.USAB);
      assert.ok(offices.DARUSO);
      assert.ok(offices['Dean of Students']);
      assert.ok(offices['Smart Card']);
      assert.ok(offices.Department);
      assert.ok(offices.Principal);
      assert.ok(offices.Finance);
    });

    it('College and department aggregations correctly reflect student counts and debt metrics', async () => {
      const res = await request
        .get('/api/v1/analytics/departments')
        .set('Authorization', `Bearer ${principalToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      const coict = res.body.data.find(c => c.college === 'CoICT');
      assert.ok(coict, 'CoICT college data must be present');
      assert.ok(Array.isArray(coict.departments));
    });
  });
});

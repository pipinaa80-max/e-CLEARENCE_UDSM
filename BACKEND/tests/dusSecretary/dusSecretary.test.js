process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('Wave 4: DUS Secretary & Regional Collection Station API Suite', () => {
  const request = supertest(app);
  let testDb;

  const PASSWORD = 'Wave4Password123!';
  let dusSecretaryUser, dusSecretaryToken;
  let principalToken;
  let studentActor, studentToken;
  let libraryToken;

  let student1, student2, student3;
  let clearanceReq1Id;

  const createdUserIds = [];
  const createdStudentIds = [];
  const createdStationIds = [];

  async function createActor(userData, { createSession = true } = {}) {
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-w4-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await testDb('users').insert({
      id: userId,
      first_name: 'Wave4',
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
      const sessionId = await createUserSession({
        userId: user.id,
        deviceInfo: 'Wave4-Test',
        ipAddress: '127.0.0.1'
      });
      token = generateAccessToken(user, sessionId);
    }
    return { user, token };
  }

  async function ensureStation(code, name, region, address) {
    const existing = await testDb('collection_stations')
      .whereRaw('LOWER(code) = ?', [code.toLowerCase()])
      .first();
    if (existing) return existing;

    const id = `st-w4-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    await testDb('collection_stations').insert({
      id,
      code,
      name,
      region,
      district: region,
      address,
      operating_hours: 'Mon - Fri: 08:00 - 16:00',
      is_active: 1,
      created_at: now,
      updated_at: now
    });
    createdStationIds.push(id);
    return testDb('collection_stations').where({ id }).first();
  }

  async function createStudentFixture(data) {
    const id = `std-w4-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await testDb('students').insert({
      id,
      clearance_status: 'COMPLETED',
      certificate_verified: 0,
      dispatch_status: 'Pending Dispatch',
      intake_status: 'Awaiting Intake',
      is_final_year: 1,
      created_at: now,
      updated_at: now,
      ...data
    });
    createdStudentIds.push(id);
    return testDb('students').where({ id }).first();
  }

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    // Clean any leftover Wave 4 fixtures
    await testDb('students').where('registration_number', 'like', '2026-W4-%').del();
    await testDb('users').where('email', 'like', 'w4_%@udsm.ac.tz').del();

    // Ensure collection stations exist for routing tests
    await ensureStation('UDSM-MAIN', 'UDSM Main Campus - Central DUS', 'Dar es Salaam', 'Mwalimu Nyerere Campus');
    await ensureStation('COICT-HUB', 'CoICT Kijitonyama Collection Hub', 'Dar es Salaam', 'Kijitonyama Campus');
    await ensureStation('ARUSHA-HUB', 'Arusha Regional Collection Station', 'Arusha', 'Arusha CBD');

    // Actors
    const dus = await createActor({
      username: 'w4_dus_sec@udsm.ac.tz',
      email: 'w4_dus_sec@udsm.ac.tz',
      full_name: 'Wave4 Main DUS Secretary',
      role: 'DUS_SECRETARY',
      station_code: 'UDSM-MAIN',
      station_name: 'UDSM Main Campus - Central DUS'
    });
    dusSecretaryUser = dus.user;
    dusSecretaryToken = dus.token;

    const prin = await createActor({
      username: 'w4_principal@udsm.ac.tz',
      email: 'w4_principal@udsm.ac.tz',
      full_name: 'Wave4 Principal',
      role: 'PRINCIPAL'
    });
    principalToken = prin.token;

    const lib = await createActor({
      username: 'w4_library@udsm.ac.tz',
      email: 'w4_library@udsm.ac.tz',
      full_name: 'Wave4 Library Officer',
      role: 'LIBRARY_OFFICER'
    });
    libraryToken = lib.token;

    const stdUser = await createActor({
      username: 'w4_student1@udsm.ac.tz',
      email: 'w4_student1@udsm.ac.tz',
      full_name: 'Amina Wave4 Mbwana',
      registration_number: '2026-W4-00001',
      role: 'STUDENT'
    });
    studentActor = stdUser.user;
    studentToken = stdUser.token;

    // Students
    student1 = await createStudentFixture({
      user_id: studentActor.id,
      registration_number: '2026-W4-00001',
      full_name: 'Amina Wave4 Mbwana',
      email: 'w4_student1@udsm.ac.tz',
      phone_number: '+255712000111',
      programme: 'BSc in Computer Science',
      college: 'College of Information and Communication Technologies (CoICT)',
      department: 'Computer Science and Engineering',
      graduation_year: '2026'
    });

    student2 = await createStudentFixture({
      registration_number: '2026-W4-00002',
      full_name: 'Juma Wave4 Kilimo',
      email: 'w4_student2@udsm.ac.tz',
      phone_number: '+255712000222',
      programme: 'BA in Economics',
      college: 'College of Social Sciences (CoSS)',
      department: 'Economics',
      graduation_year: '2026'
    });

    student3 = await createStudentFixture({
      registration_number: '2026-W4-00003',
      full_name: 'Neema Wave4 Mollel',
      email: 'w4_student3@udsm.ac.tz',
      phone_number: '+255712000333',
      programme: 'BSc in Civil Engineering',
      college: 'Arusha Campus Center',
      department: 'Civil Engineering',
      graduation_year: '2026'
    });

    // Clearance request linked to student1 to test synchronization
    const [reqId] = await testDb('clearance_requests').insert({
      student_id: student1.id,
      status: 'COMPLETED',
      current_stage: 'COMPLETED',
      current_office: 'DUS',
      college: student1.college,
      department: student1.department,
      programme: student1.programme,
      submitted_at: new Date(),
      updated_at: new Date()
    });
    clearanceReq1Id = reqId;
  });

  after(async () => {
    if (createdStudentIds.length > 0) {
      await testDb('notifications').whereIn('student_id', createdStudentIds).del();
      await testDb('clearance_requests').whereIn('student_id', createdStudentIds).del();
      await testDb('students').whereIn('id', createdStudentIds).del();
    }
    await testDb('students').where('registration_number', 'like', '2026-W4-%').del();

    const w4Users = await testDb('users').where('email', 'like', 'w4_%@udsm.ac.tz').select('id');
    const allCleanupUserIds = Array.from(new Set([...createdUserIds, ...w4Users.map(u => u.id)]));
    if (allCleanupUserIds.length > 0) {
      await testDb('notifications').whereIn('user_id', allCleanupUserIds).del();
      await testDb('audit_logs').whereIn('user_id', allCleanupUserIds).del();
      await testDb('user_sessions').whereIn('user_id', allCleanupUserIds).del();
      await testDb('refresh_tokens').whereIn('user_id', allCleanupUserIds).del();
      await testDb('users').whereIn('id', allCleanupUserIds).del();
    }

    if (createdStationIds.length > 0) {
      await testDb('collection_stations').whereIn('id', createdStationIds).del();
    }

    await testDb.destroy();
  });

  it('Enforces authentication and role authorization on /api/v1/dus-secretary/*', async () => {
    await request.get('/api/v1/dus-secretary/students').expect(401);

    await request
      .get('/api/v1/dus-secretary/students')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    await request
      .get('/api/v1/dus-secretary/students')
      .set('Authorization', `Bearer ${libraryToken}`)
      .expect(403);

    await request
      .get('/api/v1/dus-secretary/students')
      .set('Authorization', `Bearer ${principalToken}`)
      .expect(200);
  });

  it('GET /api/v1/dus-secretary/students lists and searches student consignments', async () => {
    const res = await request
      .get('/api/v1/dus-secretary/students')
      .query({ query: '2026-W4-00001' })
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].registrationNumber, '2026-W4-00001');
    assert.strictEqual(res.body[0].fullName, 'Amina Wave4 Mbwana');
    assert.strictEqual(res.body[0].certificateVerified, false);
    assert.strictEqual(res.body[0].dispatchStatus, 'Pending Dispatch');
    assert.strictEqual(res.body[0].intakeStatus, 'Awaiting Intake');
  });

  it('POST /api/v1/dus-secretary/verify-certificate verifies certificate, auto-generates hash, and syncs clearance_requests', async () => {
    await request
      .post('/api/v1/dus-secretary/verify-certificate')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({})
      .expect(400);

    await request
      .post('/api/v1/dus-secretary/verify-certificate')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({ studentId: 'NON-EXISTENT-999', verified: true })
      .expect(404);

    const res = await request
      .post('/api/v1/dus-secretary/verify-certificate')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00001',
        verified: true,
        signedBy: 'Dr. DUS Main Secretary'
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.registrationNumber, '2026-W4-00001');
    assert.strictEqual(res.body.certificateVerified, true);
    assert.match(res.body.digitalSignatureHash, /^UDSM-DUS-SIG-\d{9}$/);
    assert.strictEqual(res.body.signedBy, 'Dr. DUS Main Secretary');

    // Confirm clearance_requests synced
    const cr = await testDb('clearance_requests').where({ id: clearanceReq1Id }).first();
    assert.strictEqual(Boolean(cr.certificate_verified), true);
    assert.strictEqual(cr.digital_signature_hash, res.body.digitalSignatureHash);
    assert.strictEqual(cr.signed_by, 'Dr. DUS Main Secretary');
  });

  it('POST /api/v1/dus-secretary/update-dispatch routes to station, auto-matches college, syncs clearance_requests, and notifies student', async () => {
    // 1. Auto-match CoICT student without passing stationCode -> COICT-HUB
    const res1 = await request
      .post('/api/v1/dus-secretary/update-dispatch')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00001',
        dispatchStatus: 'Dispatched'
      })
      .expect(200);

    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res1.body.dispatchStatus, 'Dispatched');
    assert.strictEqual(res1.body.stationCode, 'COICT-HUB');
    assert.strictEqual(res1.body.intakeStatus, 'In-Transit');
    assert.ok(res1.body.dispatchedAt);

    // Verify clearance_requests synced
    const cr = await testDb('clearance_requests').where({ id: clearanceReq1Id }).first();
    assert.strictEqual(cr.dispatch_status, 'Dispatched');
    assert.ok(cr.dispatched_at);

    // Verify in-app notification created for student1
    const notif = await testDb('notifications')
      .where({ student_id: student1.id })
      .orderBy('created_at', 'desc')
      .first();
    assert.ok(notif);
    assert.ok(notif.title.includes('Consignment Dispatched'));

    // 2. Explicit stationCode ARUSHA-HUB for student2 and student3
    const res2 = await request
      .post('/api/v1/dus-secretary/update-dispatch')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: student2.id,
        dispatchStatus: 'Dispatched',
        stationCode: 'ARUSHA-HUB'
      })
      .expect(200);
    assert.strictEqual(res2.body.stationCode, 'ARUSHA-HUB');
    assert.strictEqual(res2.body.intakeStatus, 'In-Transit');

    // Auto-match Arusha college for student3
    const res3 = await request
      .post('/api/v1/dus-secretary/update-dispatch')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: student3.registration_number,
        dispatchStatus: 'Dispatched'
      })
      .expect(200);
    assert.strictEqual(res3.body.stationCode, 'ARUSHA-HUB');
  });

  it('POST /api/v1/dus-secretary/notify-release sends student notification and returns metadata', async () => {
    const res = await request
      .post('/api/v1/dus-secretary/notify-release')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00001',
        releaseType: 'Degree Certificate & Official Transcript',
        releaseDate: '2026-11-25',
        instructions: 'Bring your original NIDA ID card.',
        trackingNumber: 'DHL-TZ-998877',
        customNote: 'Sealed envelope #42'
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.studentName, 'Amina Wave4 Mbwana');
    assert.strictEqual(res.body.registrationNumber, '2026-W4-00001');
    assert.strictEqual(res.body.emailSent, false);
    assert.ok(res.body.timestamp);

    const notif = await testDb('notifications')
      .where({ student_id: student1.id })
      .andWhere('title', 'like', '%Ready for Release%')
      .first();
    assert.ok(notif);
    assert.ok(notif.message.includes('DHL-TZ-998877'));
    assert.ok(notif.message.includes('Sealed envelope #42'));
  });

  it('GET /station/consignments & POST /station/intake & /station/bulk-intake manage station vault custody', async () => {
    // 1. Check IN_TRANSIT at COICT-HUB
    const transitRes = await request
      .get('/api/v1/dus-secretary/station/consignments')
      .query({ stationCode: 'COICT-HUB', status: 'IN_TRANSIT', query: '2026-W4-' })
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.strictEqual(transitRes.body.length, 1);
    assert.strictEqual(transitRes.body[0].registrationNumber, '2026-W4-00001');

    // 2. Receive single intake into COICT-HUB vault
    const intakeRes = await request
      .post('/api/v1/dus-secretary/station/intake')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00001',
        stationCode: 'COICT-HUB',
        stationName: 'CoICT Kijitonyama Collection Hub',
        vaultLockerNumber: 'VAULT-A12',
        receivedBy: 'CoICT Station Secretary',
        packageCondition: 'Intact & Tamper-Evident Sealed'
      })
      .expect(200);

    assert.strictEqual(intakeRes.body.success, true);
    assert.strictEqual(intakeRes.body.intakeStatus, 'Received at Station');
    assert.strictEqual(intakeRes.body.vaultLockerNumber, 'VAULT-A12');
    assert.ok(intakeRes.body.stationReceivedAt);

    // Confirm moved from IN_TRANSIT to IN_VAULT
    const vaultRes = await request
      .get('/api/v1/dus-secretary/station/consignments')
      .query({ stationCode: 'COICT-HUB', status: 'IN_VAULT', query: 'VAULT-A12' })
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.strictEqual(vaultRes.body.length, 1);
    assert.strictEqual(vaultRes.body[0].vaultLockerNumber, 'VAULT-A12');

    // 3. Bulk intake error on empty array
    await request
      .post('/api/v1/dus-secretary/station/bulk-intake')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({ studentIds: [] })
      .expect(400);

    // 4. Bulk intake student2 + student3 + one invalid ID (skipped gracefully)
    const bulkRes = await request
      .post('/api/v1/dus-secretary/station/bulk-intake')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentIds: ['2026-W4-00002', '2026-W4-00003', 'INVALID-ID-SKIP'],
        stationCode: 'ARUSHA-HUB',
        stationName: 'Arusha Regional Collection Station',
        receivedBy: 'Arusha Intake Officer'
      })
      .expect(200);

    assert.strictEqual(bulkRes.body.success, true);
    assert.strictEqual(bulkRes.body.processedCount, 2);

    const arushaVault = await request
      .get('/api/v1/dus-secretary/station/consignments')
      .query({ stationCode: 'ARUSHA-HUB', status: 'IN_VAULT', query: '2026-W4-' })
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.strictEqual(arushaVault.body.length, 2);
    assert.ok(arushaVault.body.every(s => /^VAULT-BIN-\d+$/.test(s.vaultLockerNumber)));
  });

  it('POST /station/report-discrepancy records timestamped transit issue notes', async () => {
    const res = await request
      .post('/api/v1/dus-secretary/station/report-discrepancy')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00002',
        issueType: 'Damaged Envelope Seal',
        description: 'Outer courier pouch torn at corner, inner certificate intact.',
        reportedBy: 'Arusha Intake Officer'
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.registrationNumber, '2026-W4-00002');
    assert.ok(res.body.transitIssueNotes.includes('Damaged Envelope Seal'));
    assert.ok(res.body.transitIssueNotes.includes('Arusha Intake Officer'));
  });

  it('POST /station/approve-handover generates pass token, updates status to Collected, and notifies student', async () => {
    const res = await request
      .post('/api/v1/dus-secretary/station/approve-handover')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        studentId: '2026-W4-00001',
        collectorType: 'Student in Person',
        collectorName: 'Amina Wave4 Mbwana',
        collectorIdNumber: '19990101-12345-00001-11',
        collectorPhone: '+255712000111',
        secretaryName: 'CoICT Station Secretary'
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.registrationNumber, '2026-W4-00001');
    assert.strictEqual(res.body.studentName, 'Amina Wave4 Mbwana');
    assert.match(res.body.handoverReceiptToken, /^UDSM-RCV-PASS-\d{9}$/);
    assert.ok(res.body.handoverApprovedAt);

    // Appears under COLLECTED filter
    const collectedRes = await request
      .get('/api/v1/dus-secretary/station/consignments')
      .query({ stationCode: 'COICT-HUB', status: 'COLLECTED', query: '2026-W4-00001' })
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.strictEqual(collectedRes.body.length, 1);
    assert.strictEqual(collectedRes.body[0].dispatchStatus, 'Collected');
    assert.strictEqual(collectedRes.body[0].intakeStatus, 'Collected by Student');
    assert.strictEqual(collectedRes.body[0].handoverReceiptToken, res.body.handoverReceiptToken);

    // Clearance request synced to Collected
    const cr = await testDb('clearance_requests').where({ id: clearanceReq1Id }).first();
    assert.strictEqual(cr.dispatch_status, 'Collected');

    // Handover notification sent
    const notif = await testDb('notifications')
      .where({ student_id: student1.id })
      .andWhere('title', 'like', '%Handover Confirmation%')
      .first();
    assert.ok(notif);
    assert.ok(notif.message.includes(res.body.handoverReceiptToken));
  });

  it('Station Secretary Staff CRUD (GET/POST/PUT/DELETE /station-secretaries) + login station routing', async () => {
    // 1. Validation & error cases
    await request
      .post('/api/v1/dus-secretary/station-secretaries')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({ fullName: '', email: 'w4_bad@udsm.ac.tz', stationCode: 'ARUSHA-HUB' })
      .expect(400);

    await request
      .post('/api/v1/dus-secretary/station-secretaries')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({ fullName: 'Missing Station', email: 'w4_nostation@udsm.ac.tz', stationCode: 'UNKNOWN-999' })
      .expect(404);

    // 2. Create regional station secretary (using default password)
    const createRes = await request
      .post('/api/v1/dus-secretary/station-secretaries')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        fullName: 'Grace Wave4 Arusha',
        email: 'w4_arusha_sec@udsm.ac.tz',
        phoneNumber: '+255754111222',
        stationCode: 'ARUSHA-HUB'
      })
      .expect(201);

    assert.strictEqual(createRes.body.success, true);
    assert.strictEqual(createRes.body.email, 'w4_arusha_sec@udsm.ac.tz');
    assert.strictEqual(createRes.body.stationCode, 'ARUSHA-HUB');
    assert.strictEqual(createRes.body.active, true);
    const secId = createRes.body.id;
    createdUserIds.push(secId);

    // Duplicate email -> 409
    await request
      .post('/api/v1/dus-secretary/station-secretaries')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        fullName: 'Duplicate Grace',
        email: 'w4_arusha_sec@udsm.ac.tz',
        stationCode: 'ARUSHA-HUB'
      })
      .expect(409);

    // 3. List includes created secretary
    const listRes = await request
      .get('/api/v1/dus-secretary/station-secretaries')
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    const found = listRes.body.find(u => u.id === secId);
    assert.ok(found);
    assert.strictEqual(found.stationCode, 'ARUSHA-HUB');
    assert.strictEqual(found.role, 'DUS_SECRETARY');

    // 4. Created secretary can log in with default password and gets stationCode for Angular routing
    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({
        email: 'w4_arusha_sec@udsm.ac.tz',
        password: 'UDSM@Station2026'
      })
      .expect(200);

    assert.strictEqual(loginRes.body.role, 'DUS_SECRETARY');
    assert.strictEqual(loginRes.body.stationCode, 'ARUSHA-HUB');
    assert.ok(loginRes.body.accessToken);
    const regionalToken = loginRes.body.accessToken;

    // 5. Update secretary: reassign to COICT-HUB & update fullName
    const updateRes = await request
      .put(`/api/v1/dus-secretary/station-secretaries/${secId}`)
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .send({
        fullName: 'Grace Wave4 Kijitonyama',
        stationCode: 'COICT-HUB',
        phoneNumber: '+255754999888'
      })
      .expect(200);

    assert.strictEqual(updateRes.body.success, true);
    assert.strictEqual(updateRes.body.fullName, 'Grace Wave4 Kijitonyama');
    assert.strictEqual(updateRes.body.stationCode, 'COICT-HUB');

    // 6. Soft-deactivate via DELETE & verify existing token is revoked
    const delRes = await request
      .delete(`/api/v1/dus-secretary/station-secretaries/${secId}`)
      .set('Authorization', `Bearer ${dusSecretaryToken}`)
      .expect(200);

    assert.strictEqual(delRes.body.success, true);

    const dbUser = await testDb('users').where({ id: secId }).first();
    assert.strictEqual(Number(dbUser.is_active), 0);

    // Revoked session / inactive user rejected
    const afterDelCheck = await request
      .get('/api/v1/dus-secretary/students')
      .set('Authorization', `Bearer ${regionalToken}`);
    assert.ok([401, 403].includes(afterDelCheck.status));
  });
});

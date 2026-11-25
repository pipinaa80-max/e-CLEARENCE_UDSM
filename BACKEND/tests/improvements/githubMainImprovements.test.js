process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const ExcelJS = require('exceljs');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');

describe('GitHub Main Improvements & 7 New Endpoints Verification Suite', () => {
  const request = supertest(app);
  let testDb;

  const PASSWORD = 'ImprovePassword123!';
  let adminToken, lecturerToken, dusMainToken, regionalArushaToken;
  let lecturerUser, testStudent, orphanStudentId;

  const createdUserIds = [];
  const createdStudentIds = [];
  const createdDocIds = [];

  async function createActor(userData) {
    const hashedPassword = await hashPassword(PASSWORD);
    const id = `usr-imp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    await testDb('users').insert({
      id,
      first_name: 'Imp',
      last_name: 'Actor',
      password: hashedPassword,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date(),
      ...userData
    });
    createdUserIds.push(id);
    const user = await testDb('users').where({ id }).first();
    const sessionId = await createUserSession({ userId: id, deviceInfo: 'Imp-Test', ipAddress: '127.0.0.1' });
    const token = generateAccessToken(user, sessionId);
    return { user, token };
  }

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    // Run latest migrations so idx_debt_flags_student_lecturer is applied
    await testDb.migrate.latest();

    await testDb('student_debt_flags').where('registration_number', 'like', '2026-IMP-%').del();
    await testDb('students').where('registration_number', 'like', '2026-IMP-%').del();
    await testDb('users').where('email', 'like', 'imp_%@udsm.ac.tz').del();

    const adm = await createActor({
      username: 'imp_admin@udsm.ac.tz',
      email: 'imp_admin@udsm.ac.tz',
      full_name: 'Imp Admin',
      role: 'ADMINISTRATOR'
    });
    adminToken = adm.token;

    const lec = await createActor({
      username: 'imp_lecturer@udsm.ac.tz',
      email: 'imp_lecturer@udsm.ac.tz',
      full_name: 'Dr. Imp Lecturer',
      role: 'LECTURER',
      college: 'CoICT',
      department: 'CSE'
    });
    lecturerUser = lec.user;
    lecturerToken = lec.token;

    const dusMain = await createActor({
      username: 'imp_dus_main@udsm.ac.tz',
      email: 'imp_dus_main@udsm.ac.tz',
      full_name: 'Imp Main DUS Secretary',
      role: 'DUS_SECRETARY',
      station_code: 'UDSM-MAIN',
      station_name: 'UDSM Main Campus - Central DUS'
    });
    dusMainToken = dusMain.token;

    const arushaSec = await createActor({
      username: 'imp_arusha_sec@udsm.ac.tz',
      email: 'imp_arusha_sec@udsm.ac.tz',
      full_name: 'Imp Arusha Secretary',
      role: 'DUS_SECRETARY',
      station_code: 'ARUSHA-HUB',
      station_name: 'Arusha Regional Collection Station'
    });
    regionalArushaToken = arushaSec.token;

    const stdUsr = await createActor({
      username: 'imp_std1@udsm.ac.tz',
      email: 'imp_std1@udsm.ac.tz',
      full_name: 'Imp Student One',
      registration_number: '2026-IMP-00001',
      role: 'STUDENT',
      college: 'CoICT',
      department: 'CSE'
    });

    const std1Id = `std-imp-1-${Date.now()}`;
    await testDb('students').insert({
      id: std1Id,
      user_id: stdUsr.user.id,
      registration_number: '2026-IMP-00001',
      full_name: 'Imp Student One',
      email: 'imp_std1@udsm.ac.tz',
      programme: 'BSc CS',
      college: 'CoICT',
      department: 'CSE',
      station_code: 'COICT-HUB',
      station_name: 'CoICT Kijitonyama Collection Hub',
      dispatch_status: 'Dispatched',
      intake_status: 'In-Transit',
      is_final_year: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdStudentIds.push(std1Id);
    testStudent = await testDb('students').where({ id: std1Id }).first();

    // Create a second student assigned to ARUSHA-HUB
    const std2Id = `std-imp-2-${Date.now()}`;
    await testDb('students').insert({
      id: std2Id,
      registration_number: '2026-IMP-00002',
      full_name: 'Imp Arusha Student',
      email: 'imp_std2@udsm.ac.tz',
      programme: 'BA Law',
      college: 'Arusha Center',
      station_code: 'ARUSHA-HUB',
      station_name: 'Arusha Regional Collection Station',
      dispatch_status: 'Dispatched',
      intake_status: 'In-Transit',
      is_final_year: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdStudentIds.push(std2Id);
    orphanStudentId = std2Id; // user_id is NULL -> qualifies as orphan student!

    // Insert a sample academic document for student1
    const docId = `doc-imp-${Date.now()}`;
    await testDb('documents').insert({
      id: docId,
      student_id: std1Id,
      file_name: 'o-level-cert.pdf',
      file_type: 'application/pdf',
      file_url: '/uploads/o-level-cert.pdf',
      file_size: 2048,
      document_category: 'ACADEMIC_CERTIFICATE',
      description: 'O-Level Certificate',
      is_verified: 0,
      upload_date: new Date()
    });
    createdDocIds.push(docId);
  });

  after(async () => {
    await testDb('student_debt_flags').where('registration_number', 'like', '2026-IMP-%').del();
    await testDb('student_debt_flags').where({ lecturer_id: lecturerUser.id }).del();
    if (createdDocIds.length > 0) {
      await testDb('documents').whereIn('id', createdDocIds).del();
    }
    await testDb('students').where('registration_number', 'like', '2026-IMP-%').del();
    const extraUsers = await testDb('users')
      .where('email', 'like', 'imp_%@udsm.ac.tz')
      .orWhere('registration_number', 'like', '2026-IMP-%')
      .orWhere('registration_number', 'like', 'PF-IMP-%')
      .select('id');
    const allUserIds = Array.from(new Set([...createdUserIds, ...extraUsers.map(u => u.id)]));
    if (allUserIds.length > 0) {
      await testDb('notifications').whereIn('user_id', allUserIds).del();
      await testDb('audit_logs').whereIn('user_id', allUserIds).del();
      await testDb('user_sessions').whereIn('user_id', allUserIds).del();
      await testDb('refresh_tokens').whereIn('user_id', allUserIds).del();
      await testDb('users').whereIn('id', allUserIds).del();
    }
    await testDb.destroy();
  });

  it('GET /api/v1/admin/export/template/csv and /excel serve STUDENT and STAFF templates', async () => {
    const csvStudent = await request
      .get('/api/v1/admin/export/template/csv')
      .query({ type: 'STUDENT' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(csvStudent.text.includes('Registration Number'));
    assert.ok(csvStudent.text.includes('Programme'));

    const csvStaff = await request
      .get('/api/v1/admin/export/template/csv')
      .query({ type: 'STAFF' })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    assert.ok(csvStaff.text.includes('Staff ID (PF Number)'));

    const xlsxStaff = await request
      .get('/api/v1/admin/export/template/excel')
      .query({ type: 'STAFF' })
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsxStaff.body);
    assert.strictEqual(wb.worksheets[0].name, 'Staff_Registration_Template');
  });

  it('POST /api/v1/admin/users/bulk-upload respects uploadType=STAFF default role & ICT->SMART_CARD mapping', async () => {
    const csv = [
      'First Name,Last Name,Email,Role,Staff ID (PF Number),College,Department',
      'Juma,StaffImp,imp_staff_default@udsm.ac.tz,,PF-IMP-001,CoICT,CSE',
      'Khadija,IctImp,imp_ict_staff@udsm.ac.tz,ICT,PF-IMP-002,CoICT,ICT'
    ].join('\n');

    const res = await request
      .post('/api/v1/admin/users/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('uploadType', 'STAFF')
      .attach('file', Buffer.from(csv, 'utf8'), { filename: 'staff.csv', contentType: 'text/csv' })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.processedCount, 2);
    assert.ok(res.body.message.includes('staff members'));

    const staffDefault = await testDb('users').where({ email: 'imp_staff_default@udsm.ac.tz' }).first();
    assert.strictEqual(staffDefault.role, 'ACADEMIC_STAFF');

    const ictStaff = await testDb('users').where({ email: 'imp_ict_staff@udsm.ac.tz' }).first();
    assert.strictEqual(ictStaff.role, 'SMART_CARD_OFFICER');
  });

  it('GET /api/v1/student-debts/template/csv and POST /api/v1/student-debts/bulk-upload flag students from CSV', async () => {
    const tpl = await request
      .get('/api/v1/student-debts/template/csv')
      .set('Authorization', `Bearer ${lecturerToken}`)
      .expect(200);
    assert.ok(tpl.text.includes('Registration Number,Student Name,Category,Amount,Reason'));

    const debtCsv = [
      'Registration Number,Student Name,Category,Amount,Reason,Due Date,Negotiation Notes',
      '2026-IMP-00001,Imp Student One,Laboratory Equipment,45000,Unreturned Oscilloscope Probe,2026-12-01,Return to Lab 2',
      '2026-IMP-99999,PreReg Debt Student,Library Book,25000,Lost Algorithms Textbook,2026-12-10,Replace or pay'
    ].join('\n');

    const res = await request
      .post('/api/v1/student-debts/bulk-upload')
      .set('Authorization', `Bearer ${lecturerToken}`)
      .attach('file', Buffer.from(debtCsv, 'utf8'), { filename: 'debts.csv', contentType: 'text/csv' })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.count, 2);

    const flags = await testDb('student_debt_flags').where({ lecturer_id: lecturerUser.id });
    assert.strictEqual(flags.length, 2);
    assert.ok(flags.some(f => f.registration_number === '2026-IMP-00001' && Number(f.amount) === 45000));
  });

  it('GET /api/v1/dus-secretary/students/:studentId/documents returns academic documents & regional station lock enforces isolation', async () => {
    const docRes = await request
      .get('/api/v1/dus-secretary/students/2026-IMP-00001/documents')
      .set('Authorization', `Bearer ${dusMainToken}`)
      .expect(200);

    assert.ok(Array.isArray(docRes.body));
    assert.strictEqual(docRes.body.length, 1);
    assert.strictEqual(docRes.body[0].fileName, 'o-level-cert.pdf');
    assert.strictEqual(docRes.body[0].category, 'ACADEMIC_CERTIFICATE');

    // Regional Arusha secretary attempts to spoof stationCode=COICT-HUB -> locked strictly to ARUSHA-HUB
    const spoofRes = await request
      .get('/api/v1/dus-secretary/station/consignments')
      .query({ stationCode: 'COICT-HUB', query: '2026-IMP-' })
      .set('Authorization', `Bearer ${regionalArushaToken}`)
      .expect(200);

    assert.strictEqual(spoofRes.body.length, 1);
    assert.strictEqual(spoofRes.body[0].registrationNumber, '2026-IMP-00002');
    assert.strictEqual(spoofRes.body[0].stationCode, 'ARUSHA-HUB');
  });

  it('GET /api/v1/qr/generate enforces 1024-character DoS cap', async () => {
    const oversized = 'A'.repeat(1025);
    await request
      .get('/api/v1/qr/generate')
      .query({ text: oversized })
      .expect(400);
  });

  it('DELETE /api/v1/admin/maintenance/students/clean-orphans and /purge remove targeted records cleanly', async () => {
    // 1. Clean orphans should remove student2 (user_id IS NULL)
    const orphanRes = await request
      .delete('/api/v1/admin/maintenance/students/clean-orphans')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.strictEqual(orphanRes.body.success, true);
    assert.ok(orphanRes.body.cleanedCount >= 1);

    const orphanAfter = await testDb('students').where({ id: orphanStudentId }).first();
    assert.strictEqual(orphanAfter, undefined);

    // 2. Purge student1 explicitly by registrationNumbers list
    const purgeRes = await request
      .delete('/api/v1/admin/maintenance/students/purge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(['2026-IMP-00001'])
      .expect(200);

    assert.strictEqual(purgeRes.body.success, true);
    assert.ok(purgeRes.body.purgedCount >= 1);

    const std1After = await testDb('students').where({ id: testStudent.id }).first();
    assert.strictEqual(std1After, undefined);
  });
});

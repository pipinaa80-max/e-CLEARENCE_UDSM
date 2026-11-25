process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');
const { EXPORT_HEADERS } = require('../../src/utils/spreadsheet');

describe('Wave 3B: Admin Bulk CSV/Excel Import & Export API Suite', () => {
  const request = supertest(app);
  let testDb;
  let adminUser, adminToken;

  const PASSWORD = 'Wave3BPassword123!';
  const testEmails = [
    'w3b_admin@udsm.ac.tz',
    'w3b_student_csv@udsm.ac.tz',
    'w3b_staff_csv@udsm.ac.tz',
    'w3b_student_xlsx@udsm.ac.tz'
  ];

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    await testDb('users').whereIn('email', testEmails).del();

    const hashedPassword = await hashPassword(PASSWORD);
    const adminId = `usr-w3b-admin-${Date.now()}`;
    await testDb('users').insert({
      id: adminId,
      username: 'w3b_admin@udsm.ac.tz',
      email: 'w3b_admin@udsm.ac.tz',
      password: hashedPassword,
      first_name: 'Wave3B',
      last_name: 'Admin',
      full_name: 'Wave3B Admin',
      role: 'ADMINISTRATOR',
      is_active: 1,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    adminUser = await testDb('users').where({ id: adminId }).first();
    const sessionId = await createUserSession({ userId: adminUser.id, deviceInfo: 'Wave3B-Test', ipAddress: '127.0.0.1' });
    adminToken = generateAccessToken(adminUser, sessionId);
  });

  after(async () => {
    const users = await testDb('users').whereIn('email', testEmails).select('id');
    const ids = users.map(u => u.id);
    if (ids.length > 0) {
      await testDb('audit_logs').whereIn('user_id', ids).del();
      await testDb('user_sessions').whereIn('user_id', ids).del();
      await testDb('refresh_tokens').whereIn('user_id', ids).del();
      await testDb('users').whereIn('id', ids).del();
    }
    await testDb.destroy();
  });

  it('POST /api/v1/admin/users/bulk-upload rejects unsupported file extensions with 400', async () => {
    const res = await request
      .post('/api/v1/admin/users/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('not a spreadsheet'), 'invalid.txt')
      .expect(400);

    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Unsupported file format/i);
  });

  it('POST /api/v1/admin/users/bulk-upload imports CSV with fuzzy headers, PF role inference, and student sync', async () => {
    const csvContent = [
      'SN,Registration,First Name,Other Name,Surname,College,Department,Programme,Role,Email,Phone',
      '1,2026-04-55301,Amina,Hassan,Mwinyi,CoICT,CSE,BSc. Computer Science,STUDENT,w3b_student_csv@udsm.ac.tz,+255712553001',
      '2,STF-LIB-553,Khamis,,Juma,CoICT,Ignored,Ignored,,w3b_staff_csv@udsm.ac.tz,+255712553002'
    ].join('\n');

    const res = await request
      .post('/api/v1/admin/users/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from(csvContent, 'utf8'), 'users_import.csv')
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.processedCount, 2);

    // Verify student row + synced students table
    const stdUser = await testDb('users').where({ email: 'w3b_student_csv@udsm.ac.tz' }).first();
    assert.ok(stdUser);
    assert.strictEqual(stdUser.role, 'STUDENT');
    assert.strictEqual(Boolean(stdUser.is_active), true);

    const stdProfile = await testDb('students').where({ registration_number: '2026-04-55301' }).first();
    assert.ok(stdProfile);
    assert.strictEqual(stdProfile.user_id, stdUser.id);

    // Verify staff role inferred from STF-LIB-553 -> LIBRARY_OFFICER and central office college/programme trimmed
    const staffUser = await testDb('users').where({ email: 'w3b_staff_csv@udsm.ac.tz' }).first();
    assert.ok(staffUser);
    assert.strictEqual(staffUser.role, 'LIBRARY_OFFICER');
    assert.strictEqual(staffUser.college, null);
    assert.strictEqual(staffUser.programme, null);
  });

  it('POST /api/v1/admin/users/bulk-upload imports Excel (.xlsx) workbooks cleanly', async () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Import');
    sheet.addRow(['Registration', 'First Name', 'Surname', 'Email', 'Role', 'College', 'Department', 'Programme']);
    sheet.addRow(['2026-04-55302', 'Neema', 'Baraka', 'w3b_student_xlsx@udsm.ac.tz', 'STUDENT', 'CoET', 'EE', 'BSc. Electrical Engineering']);
    const xlsxBuffer = Buffer.from(await wb.xlsx.writeBuffer());

    const res = await request
      .post('/api/v1/admin/users/bulk-upload')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', xlsxBuffer, 'users_import.xlsx')
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.processedCount, 1);

    const imported = await testDb('users').where({ email: 'w3b_student_xlsx@udsm.ac.tz' }).first();
    assert.ok(imported);
    assert.strictEqual(imported.full_name, 'Neema Baraka');
    assert.strictEqual(imported.college, 'CoET');
  });

  it('GET /api/v1/admin/export/csv returns valid 22-column UTF-8 CSV with blank passwords', async () => {
    const res = await request
      .get('/api/v1/admin/export/csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.match(res.headers['content-type'], /text\/csv/i);
    assert.match(res.headers['content-disposition'], /udsm_clearance_users\.csv/i);

    const lines = res.text.trim().split(/\r?\n/);
    assert.strictEqual(lines[0], EXPORT_HEADERS.join(','));
    assert.ok(res.text.includes('w3b_student_csv@udsm.ac.tz'));
    assert.ok(res.text.includes('w3b_student_xlsx@udsm.ac.tz'));
  });

  it('GET /api/v1/admin/export/excel returns a parseable styled .xlsx workbook', async () => {
    const res = await request
      .get('/api/v1/admin/export/excel')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((resStream, callback) => {
        const chunks = [];
        resStream.on('data', c => chunks.push(c));
        resStream.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    assert.match(res.headers['content-type'], /spreadsheetml\.sheet/i);
    assert.match(res.headers['content-disposition'], /udsm_clearance_users\.xlsx/i);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body);
    const sheet = wb.getWorksheet('UDSM_Clearance_Data');
    assert.ok(sheet);
    assert.strictEqual(sheet.getRow(1).getCell(1).value, 'SN');
    assert.strictEqual(sheet.getRow(1).getCell(2).value, 'Registration');
    assert.ok(sheet.rowCount >= 4);
  });
});

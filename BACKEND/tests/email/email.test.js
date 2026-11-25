process.env.NODE_ENV = 'test';

const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const env = require('../../src/config/env');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');
const EmailService = require('../../src/services/email.service');

describe('Wave 6: Outbound SMTP Email Service & 8 HTML Templates Suite', () => {
  const request = supertest(app);
  let testDb;

  let dusToken;
  let testStudent;
  const createdUserIds = [];
  const createdStudentIds = [];

  before(async () => {
    testDb = getDb();
    assert.strictEqual(env.NODE_ENV, 'test');
    assert.strictEqual(testDb.client.connectionSettings.database, 'clearance_test_db');

    await testDb('students').where('registration_number', 'like', '2026-W6-%').del();
    await testDb('users').where('email', 'like', 'w6_%@udsm.ac.tz').del();

    const hashedPassword = await hashPassword('Wave6Password123!');
    const dusId = `usr-w6-dus-${Date.now()}`;
    await testDb('users').insert({
      id: dusId,
      username: 'w6_dus@udsm.ac.tz',
      email: 'w6_dus@udsm.ac.tz',
      full_name: 'Wave6 DUS Secretary',
      first_name: 'Wave6',
      last_name: 'Secretary',
      password: hashedPassword,
      role: 'DUS_SECRETARY',
      station_code: 'UDSM-MAIN',
      station_name: 'UDSM Main Campus - Central DUS',
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdUserIds.push(dusId);
    const dusUser = await testDb('users').where({ id: dusId }).first();
    const sessionId = await createUserSession({ userId: dusId, deviceInfo: 'Wave6-Test', ipAddress: '127.0.0.1' });
    dusToken = generateAccessToken(dusUser, sessionId);

    const stdId = `std-w6-${Date.now()}`;
    await testDb('students').insert({
      id: stdId,
      registration_number: '2026-W6-00001',
      full_name: 'Salma Wave6 Juma',
      email: 'w6_student@udsm.ac.tz',
      programme: 'BSc in Software Engineering',
      college: 'CoICT',
      clearance_status: 'COMPLETED',
      is_final_year: 1,
      created_at: new Date(),
      updated_at: new Date()
    });
    createdStudentIds.push(stdId);
    testStudent = await testDb('students').where({ id: stdId }).first();
  });

  afterEach(() => {
    EmailService.resetTransporter();
  });

  after(async () => {
    EmailService.resetTransporter();
    if (createdStudentIds.length > 0) {
      await testDb('notifications').whereIn('student_id', createdStudentIds).del();
      await testDb('students').whereIn('id', createdStudentIds).del();
    }
    if (createdUserIds.length > 0) {
      await testDb('audit_logs').whereIn('user_id', createdUserIds).del();
      await testDb('user_sessions').whereIn('user_id', createdUserIds).del();
      await testDb('refresh_tokens').whereIn('user_id', createdUserIds).del();
      await testDb('users').whereIn('id', createdUserIds).del();
    }
    await testDb.destroy();
  });

  it('Safely no-ops when SMTP is not configured without throwing', async () => {
    EmailService.resetTransporter();
    assert.strictEqual(EmailService.isConfigured(), false);

    const res = await EmailService.sendWelcomeEmail('student@udsm.ac.tz', {
      name: 'Test Student',
      registrationNumber: '2026-04-00001'
    });

    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.skipped, true);
  });

  it('Renders all 8 HTML templates cleanly with XSS escaping and conditional clearance blocks', () => {
    const templates = [
      ['welcome', { name: '<script>alert(1)</script>', email: 'a@udsm.ac.tz', registrationNumber: '2026-04-1' }],
      ['verify-email', { name: 'Amina', verificationLink: 'http://localhost:4200/verify-email?token=abc' }],
      ['account-activated', { name: 'Amina', activationTime: '2026-11-20 01:00:00 UTC' }],
      ['login-notification', { name: 'Amina', loginTime: '2026-11-20', deviceInfo: 'Chrome', location: '127.0.0.1' }],
      ['password-reset', { name: 'Amina', email: 'a@udsm.ac.tz', resetLink: 'http://localhost:4200/reset-password?token=xyz', expiryTime: '1 hour' }],
      ['password-changed', { name: 'Amina', changeTime: '2026-11-20 01:00:00 UTC' }],
      ['profile-updated', { name: 'Amina', updateTime: '2026-11-20', deviceInfo: 'Firefox', clientIp: '10.0.0.1' }],
      ['clearance-update', { name: 'Amina', registrationNumber: '2026-04-1', programme: 'BSc CS', status: 'APPROVED', isOtherStatus: '', department: 'Library', comments: 'Cleared' }]
    ];

    for (const [name, vars] of templates) {
      const html = EmailService.renderTemplate(name, vars);
      assert.ok(html.includes('<!DOCTYPE html>'), `Template ${name} must produce HTML`);
      assert.ok(!html.includes('{{'), `Template ${name} must not leave unresolved placeholders`);
    }

    // Verify HTML escaping on welcome template
    const xssHtml = EmailService.renderTemplate('welcome', {
      name: '<script>alert(1)</script>',
      email: 'a@udsm.ac.tz',
      registrationNumber: '2026-04-1'
    });
    assert.ok(!xssHtml.includes('<script>alert(1)</script>'));
    assert.ok(xssHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));

    // Verify REJECTED vs APPROVED conditional rendering in clearance-update
    const rejectedHtml = EmailService.renderTemplate('clearance-update', {
      name: 'Amina',
      registrationNumber: '2026-04-1',
      programme: 'BSc CS',
      status: 'REJECTED',
      isOtherStatus: '',
      department: 'Finance',
      comments: 'Unpaid tuition balance'
    });
    assert.ok(rejectedHtml.includes('ACTION REQUIRED: REJECTED BY Finance'));
    assert.ok(!rejectedHtml.includes('APPROVED BY Finance'));
    assert.ok(rejectedHtml.includes('Unpaid tuition balance'));
  });

  it('Dispatches all domain emails and PDF attachment via injected Nodemailer transporter', async () => {
    const sentMessages = [];
    EmailService.setTransporter({
      async sendMail(mailOptions) {
        sentMessages.push(mailOptions);
        return { messageId: `<msg-${sentMessages.length}@udsm.ac.tz>` };
      }
    });

    assert.strictEqual(EmailService.isConfigured(), true);

    const r1 = await EmailService.sendWelcomeEmail('u1@udsm.ac.tz', { name: 'User One', registrationNumber: '2026-04-01' });
    const r2 = await EmailService.sendVerificationEmail('u1@udsm.ac.tz', { name: 'User One', verificationLink: 'http://localhost:4200/verify?t=1' });
    const r3 = await EmailService.sendAccountActivatedEmail('u1@udsm.ac.tz', { name: 'User One' });
    const r4 = await EmailService.sendLoginNotificationEmail('u1@udsm.ac.tz', { name: 'User One', deviceInfo: 'Edge', location: '127.0.0.1' });
    const r5 = await EmailService.sendPasswordResetEmail('u1@udsm.ac.tz', { name: 'User One', resetLink: 'http://localhost:4200/reset?t=2' });
    const r6 = await EmailService.sendPasswordChangedEmail('u1@udsm.ac.tz', { name: 'User One' });
    const r7 = await EmailService.sendProfileUpdatedEmail('u1@udsm.ac.tz', { name: 'User One', deviceInfo: 'Safari', clientIp: '127.0.0.1' });
    const r8 = await EmailService.sendClearanceUpdateEmail(testStudent, 'APPROVED', 'Library', 'All books returned');
    const r9 = await EmailService.sendClearanceCertificateEmail(testStudent, Buffer.from('%PDF-1.4 mock'), 'cert-2026.pdf');

    for (const res of [r1, r2, r3, r4, r5, r6, r7, r8, r9]) {
      assert.strictEqual(res.sent, true);
      assert.ok(res.messageId);
    }

    assert.strictEqual(sentMessages.length, 9);
    const certMsg = sentMessages[8];
    assert.strictEqual(certMsg.to, 'w6_student@udsm.ac.tz');
    assert.strictEqual(certMsg.attachments.length, 1);
    assert.strictEqual(certMsg.attachments[0].filename, 'cert-2026.pdf');
    assert.strictEqual(certMsg.attachments[0].contentType, 'application/pdf');
  });

  it('Suppresses SMTP transport failures gracefully without throwing', async () => {
    EmailService.setTransporter({
      async sendMail() {
        throw new Error('SMTP connection timed out');
      }
    });

    const res = await EmailService.sendWelcomeEmail('fail@udsm.ac.tz', { name: 'Fail Test' });
    assert.strictEqual(res.sent, false);
    assert.strictEqual(res.skipped, false);
    assert.ok(res.error.includes('SMTP connection timed out'));
  });

  it('Integrates cleanly with DUS Secretary notify-release endpoint (emailSent reflects actual SMTP dispatch)', async () => {
    const sent = [];
    EmailService.setTransporter({
      async sendMail(mailOptions) {
        sent.push(mailOptions);
        return { messageId: '<dus-release@udsm.ac.tz>' };
      }
    });

    const res = await request
      .post('/api/v1/dus-secretary/notify-release')
      .set('Authorization', `Bearer ${dusToken}`)
      .send({
        studentId: '2026-W6-00001',
        releaseType: 'Degree Certificate',
        instructions: 'Collect from Main Campus Room 102'
      })
      .expect(200);

    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.emailSent, true);
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].to, 'w6_student@udsm.ac.tz');
    assert.ok(sent[0].html.includes('CERTIFICATE_RELEASE'));
    assert.ok(sent[0].html.includes('Collect from Main Campus Room 102'));
  });

  it('Does NOT fire outbound SMTP login-alert emails on POST /api/v1/auth/login', async () => {
    const sent = [];
    EmailService.setTransporter({
      async sendMail(mailOptions) {
        sent.push(mailOptions);
        return { messageId: '<unexpected-login-alert@udsm.ac.tz>' };
      }
    });

    const loginRes = await request
      .post('/api/v1/auth/login')
      .send({
        identifier: 'w6_dus@udsm.ac.tz',
        password: 'Wave6Password123!'
      })
      .expect(200);

    assert.ok(loginRes.body.accessToken);
    // Allow any async microtask tick to settle
    await new Promise(resolve => setImmediate(resolve));
    assert.strictEqual(sent.length, 0, 'Login must not dispatch automatic login-alert emails');
  });
});

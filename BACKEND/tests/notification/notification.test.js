process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const app = require('../../src/app');
const { getDb } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/password');
const { generateAccessToken, createUserSession } = require('../../src/utils/token');
const NotificationService = require('../../src/services/notification.service');

describe('Notification Engine & Multi-Role API Suite', () => {
  let request;
  let testDb;

  let studentUser, studentToken, studentRec;
  let libraryUser, libraryToken;
  const PASSWORD = 'TestPassword123!';
  const REG_STUDENT = '2022-04-88881';

  async function createTestActor(userData) {
    const db = testDb || getDb();
    const hashedPassword = await hashPassword(PASSWORD);
    const userId = `usr-notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await db('users').insert({
      id: userId,
      email: userData.email,
      username: userData.username,
      password: hashedPassword,
      role: userData.role,
      first_name: userData.first_name || 'Test',
      last_name: userData.last_name || 'User',
      full_name: `${userData.first_name || 'Test'} ${userData.last_name || 'User'}`,
      is_active: 1,
      is_locked: 0,
      is_email_verified: 1,
      college: userData.college || null,
      department: userData.department || null,
      created_at: new Date(),
      updated_at: new Date()
    });

    const actor = await db('users').where({ id: userId }).first();
    const sessionId = await createUserSession({
      userId: actor.id,
      deviceInfo: 'Notification-Test-Runner',
      ipAddress: '127.0.0.1'
    });
    const accessToken = generateAccessToken(actor, sessionId);

    return { user: actor, accessToken };
  }

  before(async () => {
    testDb = getDb();
    request = supertest(app);

    // Create student actor
    const stActor = await createTestActor({
      email: `student.notif.${Date.now()}@example.test`,
      username: `st_notif_${Date.now()}`,
      role: 'STUDENT',
      first_name: 'Notification',
      last_name: 'Student',
      college: 'CoET',
      department: 'Electrical Engineering'
    });
    studentUser = stActor.user;
    studentToken = stActor.accessToken;

    const studentId = `std-notif-${Date.now()}`;
    await testDb('students').insert({
      id: studentId,
      user_id: studentUser.id,
      registration_number: REG_STUDENT,
      full_name: studentUser.full_name,
      email: studentUser.email,
      programme: 'BSc in Electrical Engineering',
      college: 'CoET',
      department: 'Electrical Engineering',
      created_at: new Date()
    });
    studentRec = await testDb('students').where({ id: studentId }).first();

    // Create staff actor (Library Officer)
    const libActor = await createTestActor({
      email: `library.notif.${Date.now()}@example.test`,
      username: `lib_notif_${Date.now()}`,
      role: 'LIBRARY_OFFICER',
      first_name: 'Library',
      last_name: 'Officer'
    });
    libraryUser = libActor.user;
    libraryToken = libActor.accessToken;
  });

  after(async () => {
    if (testDb) {
      if (studentUser) {
        await testDb('notifications').where({ user_id: String(studentUser.id) }).del();
        if (studentRec) await testDb('students').where({ id: studentRec.id }).del();
        await testDb('user_sessions').where({ user_id: studentUser.id }).del();
        await testDb('users').where({ id: studentUser.id }).del();
      }
      if (libraryUser) {
        await testDb('notifications').where({ user_id: String(libraryUser.id) }).del();
        await testDb('user_sessions').where({ user_id: libraryUser.id }).del();
        await testDb('users').where({ id: libraryUser.id }).del();
      }
      await testDb.destroy();
    }
  });

  it('Rejects unauthenticated requests to GET /api/v1/notifications with 401', async () => {
    const res = await request.get('/api/v1/notifications');
    assert.strictEqual(res.status, 401);
  });

  it('Student lists notifications successfully and returns array', async () => {
    const res = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('Staff (Library Officer) lists notifications without error', async () => {
    const res = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${libraryToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('Creates a notification and verifies unread count and item structure', async () => {
    const notifId = await NotificationService.sendNotification({
      userId: studentUser.id,
      studentId: studentRec.id,
      title: 'Test Fee Clearance Notice',
      message: 'Please review your fee statement.',
      type: 'CLEARANCE_UPDATE'
    });
    assert.ok(notifId);

    // Check unread count
    const countRes = await request
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(countRes.status, 200);
    assert.ok(countRes.body.unreadCount >= 1);

    // Check notification list
    const listRes = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(listRes.status, 200);
    const item = listRes.body.find(n => n.id === notifId);
    assert.ok(item, 'Inserted notification should be in the list');
    assert.strictEqual(item.title, 'Test Fee Clearance Notice');
    assert.strictEqual(item.read, false);
    assert.strictEqual(item.type, 'CLEARANCE_UPDATE');
    assert.ok(item.createdAt);
  });

  it('Marks a notification as read (PATCH /:id/read)', async () => {
    const notifId = await NotificationService.sendNotification({
      userId: studentUser.id,
      studentId: studentRec.id,
      title: 'Action Item Read Test',
      message: 'This will be marked read.',
      type: 'APPROVAL'
    });

    const patchRes = await request
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.body.id, notifId);
    assert.strictEqual(patchRes.body.read, true);

    const verifyNotice = await testDb('notifications').where({ id: notifId }).first();
    assert.strictEqual(Boolean(verifyNotice.is_read), true);
  });

  it('Marks all notifications as read (POST /read-all)', async () => {
    // Add two unread notices
    await NotificationService.sendNotification({
      userId: studentUser.id,
      title: 'Unread 1',
      message: 'Notice 1'
    });
    await NotificationService.sendNotification({
      userId: studentUser.id,
      title: 'Unread 2',
      message: 'Notice 2'
    });

    const postRes = await request
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(postRes.status, 200);
    assert.strictEqual(postRes.body.unreadCount, 0);

    const countRes = await request
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(countRes.body.unreadCount, 0);
  });

  it('Deletes a notification (DELETE /:id)', async () => {
    const notifId = await NotificationService.sendNotification({
      userId: studentUser.id,
      title: 'Delete Notice',
      message: 'To be deleted'
    });

    const delRes = await request
      .delete(`/api/v1/notifications/${notifId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(delRes.status, 204);

    const check = await testDb('notifications').where({ id: notifId }).first();
    assert.strictEqual(check, undefined);
  });

  it('Clears all notifications (DELETE /clear-all)', async () => {
    await NotificationService.sendNotification({
      userId: studentUser.id,
      title: 'Clear 1',
      message: 'Clear 1'
    });
    await NotificationService.sendNotification({
      userId: studentUser.id,
      title: 'Clear 2',
      message: 'Clear 2'
    });

    const clearRes = await request
      .delete('/api/v1/notifications/clear-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(clearRes.status, 204);

    const listRes = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(listRes.body.length, 0);
  });

  it('Auto-syncs clearance department approval into notification for student', async () => {
    const reqId = 9876543;
    await testDb('clearance_requests').insert({
      id: reqId,
      student_id: studentRec.id,
      status: 'IN_PROGRESS',
      current_stage: 'PARALLEL_OFFICES',
      submitted_at: new Date(),
      updated_at: new Date()
    });

    await testDb('department_approvals').insert({
      id: 9876543,
      clearance_request_id: reqId,
      department: 'Library',
      status: 'APPROVED',
      approved_by: 'Grace Mvungi (Library Officer)',
      approval_date: new Date()
    });

    const listRes = await request
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.strictEqual(listRes.status, 200);
    const approvalNotice = listRes.body.find(n => n.title.includes('Clearance Approved - Library'));
    assert.ok(approvalNotice, 'Auto-synced approval notification must appear in the list');
    assert.strictEqual(approvalNotice.type, 'APPROVAL');
    assert.ok(approvalNotice.message.includes('Library office'));

    await testDb('department_approvals').where({ clearance_request_id: reqId }).del();
    await testDb('clearance_requests').where({ id: reqId }).del();
  });
});

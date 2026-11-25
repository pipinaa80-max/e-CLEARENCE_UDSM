/**
 * UDSM e-Clearance - Verify Authentication & Authorization Across All 21 Accounts
 */

if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: Development account verification script is disabled in production (NODE_ENV=production).');
  process.exit(1);
}

process.env.NODE_ENV = 'development';
process.env.RATE_LIMIT_MAX_ATTEMPTS = '100';
const request = require('supertest');
const app = require('../src/app');

const SHARED_PASSWORD = 'Clearance@2026!';

const ACCOUNTS = [
  { role: 'SUPERUSER', email: 'superuser@example.test', uiRole: 'Administrator', dashboard: '/dashboard/admin' },
  { role: 'ADMINISTRATOR', email: 'administrator@example.test', uiRole: 'Administrator', dashboard: '/dashboard/admin' },
  { role: 'ADMIN', email: 'admin@example.test', uiRole: 'Administrator', dashboard: '/dashboard/admin' },
  { role: 'STUDENT', email: 'student@example.test', uiRole: 'Student', dashboard: '/dashboard' },
  { role: 'CONVOCATION_OFFICER', email: 'convocation@example.test', uiRole: 'Convocation', dashboard: '/convocation/dashboard' },
  { role: 'GAMES_COACH', email: 'games.coach@example.test', uiRole: 'Games Coach', dashboard: '/dashboard/games-coach' },
  { role: 'HALL_WARDEN', email: 'hall.warden@example.test', uiRole: 'Hall Warden', dashboard: '/dashboard/hall-warden' },
  { role: 'USAB_OFFICER', email: 'usab@example.test', uiRole: 'USAB', dashboard: '/dashboard/usab' },
  { role: 'DARUSO_OFFICER', email: 'daruso@example.test', uiRole: 'DARUSO', dashboard: '/dashboard/daruso' },
  { role: 'LIBRARY_OFFICER', email: 'library@example.test', uiRole: 'Library', dashboard: '/dashboard/library' },
  { role: 'DEAN_OF_STUDENTS', email: 'dean.students@example.test', uiRole: 'Dean of Students', dashboard: '/dashboard/dean-of-students' },
  { role: 'SMART_CARD_OFFICER', email: 'smart.card@example.test', uiRole: 'Smart Card', dashboard: '/dashboard/smart-card' },
  { role: 'WORKSHOP_OFFICER', email: 'workshop@example.test', uiRole: 'Workshop', dashboard: '/dashboard/workshop' },
  { role: 'LABORATORY_OFFICER', email: 'laboratory@example.test', uiRole: 'Laboratory', dashboard: '/dashboard/laboratory' },
  { role: 'LECTURER', email: 'lecturer@example.test', uiRole: 'Lecturer', dashboard: '/dashboard/lecturer' },
  { role: 'DEPARTMENT_OFFICER', email: 'department.officer@example.test', uiRole: 'Department', dashboard: '/department/dashboard' },
  { role: 'PRINCIPAL', email: 'principal@example.test', uiRole: 'Principal', dashboard: '/dashboard/principal' },
  { role: 'FINANCE_OFFICER', email: 'finance@example.test', uiRole: 'Finance', dashboard: '/dashboard/finance' },
  { role: 'ACADEMIC_STAFF', email: 'academic.staff@example.test', uiRole: 'Academic Staff', dashboard: '/dashboard/academic' },
  { role: 'DIRECTOR_OF_UNDERGRADUATE_STUDIES', email: 'dus@example.test', uiRole: 'Director of Undergraduate Studies', dashboard: '/dashboard/director-undergraduate-studies' },
  { role: 'DUS_SECRETARY', email: 'dus.secretary@example.test', uiRole: 'DUS Secretary', dashboard: '/dashboard/dus-secretary' }
];

async function runVerification() {
  console.log('========================================================================');
  console.log(' UDSM e-CLEARANCE: 21 ROLES AUTHENTICATION & ACCESS VERIFICATION AUDIT');
  console.log('========================================================================\n');

  let passCount = 0;
  const results = [];

  for (let i = 0; i < ACCOUNTS.length; i++) {
    const acc = ACCOUNTS[i];
    process.stdout.write(`[${i + 1}/21] Verifying ${acc.role.padEnd(34)} (${acc.email}) ... `);

    // 1. Authenticate via POST /api/v1/auth/login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: acc.email,
        password: SHARED_PASSWORD
      });

    if (loginRes.status !== 200) {
      console.log(`FAILED! Status: ${loginRes.status}, Error: ${JSON.stringify(loginRes.body)}`);
      results.push({ ...acc, success: false, error: loginRes.body?.message || 'Login failed' });
      continue;
    }

    const { accessToken, role, fullName } = loginRes.body;
    if (!accessToken || !role) {
      console.log('FAILED! Missing token or role object.');
      results.push({ ...acc, success: false, error: 'Missing token/role' });
      continue;
    }

    if (role !== acc.role) {
      console.log(`FAILED! Role mismatch: expected ${acc.role}, got ${role}`);
      results.push({ ...acc, success: false, error: `Role mismatch: ${role}` });
      continue;
    }

    // 2. Verify Authorized Resource Access
    let authEndpoint = '/api/v1/clearance/office/requests';
    if (acc.role === 'STUDENT') {
      authEndpoint = '/api/v1/clearance/my-request';
    } else if (acc.role === 'SUPERUSER' || acc.role === 'ADMINISTRATOR' || acc.role === 'ADMIN' || acc.role === 'DIRECTOR_OF_UNDERGRADUATE_STUDIES') {
      authEndpoint = '/api/v1/analytics/summary';
    } else if (acc.role === 'LECTURER' || acc.role === 'ACADEMIC_STAFF' || acc.role === 'DUS_SECRETARY') {
      authEndpoint = '/api/v1/auth/profile';
    }

    const authRes = await request(app)
      .get(authEndpoint)
      .set('Authorization', `Bearer ${accessToken}`);

    const isAuthOk = authRes.status >= 200 && authRes.status < 300;

    // 3. Verify Unauthorized Resource Access (Student trying to access admin analytics)
    let unauthCheckPassed = true;
    if (acc.role === 'STUDENT') {
      const forbiddenRes = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${accessToken}`);
      unauthCheckPassed = forbiddenRes.status === 403;
    } else if (acc.role === 'GAMES_COACH' || acc.role === 'LIBRARY_OFFICER') {
      const forbiddenRes = await request(app)
        .get('/api/v1/analytics/summary')
        .set('Authorization', `Bearer ${accessToken}`);
      unauthCheckPassed = forbiddenRes.status === 403;
    }

    // 4. Verify Notifications Endpoint across all roles
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`);
    const unreadRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`);

    const notifOk = notifRes.status === 200 && Array.isArray(notifRes.body) &&
                    unreadRes.status === 200 && typeof unreadRes.body.unreadCount === 'number';

    if (isAuthOk && unauthCheckPassed && notifOk) {
      console.log(`PASS (HTTP 200, JWT Valid, Notifs OK [count: ${unreadRes.body.unreadCount}])`);
      passCount++;
      results.push({ ...acc, success: true, userFullName: fullName, unreadNotifications: unreadRes.body.unreadCount });
    } else {
      console.log(`FAILED! Auth status: ${authRes.status}, unauth: ${unauthCheckPassed}, notifs: ${notifOk}`);
      results.push({ ...acc, success: false, error: 'Scope or notification check failed' });
    }
  }

  console.log('\n========================================================================');
  console.log(` VERIFICATION SUMMARY: ${passCount} / ${ACCOUNTS.length} ACCOUNTS VERIFIED SUCCESSFULLY`);
  console.log('========================================================================\n');

  console.log(JSON.stringify(results, null, 2));

  process.exit(passCount === ACCOUNTS.length ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});

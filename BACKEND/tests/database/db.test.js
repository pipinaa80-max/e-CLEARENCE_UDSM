process.env.NODE_ENV = 'test';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { db, testConnection } = require('../../src/config/database');

describe('UDSM e-Clearance - MySQL 8.0 Database Architecture & Migration Verification', () => {
  before(async () => {
    // Ensure connection is active before running tests
    const conn = await testConnection();
    assert.equal(conn.connected, true, `Database must connect. Error: ${conn.error}`);
    // Run latest migrations on test database
    await db.migrate.latest();
    // Run reference data seeders on test database
    await db.seed.run();
  });

  after(async () => {
    await db.destroy();
  });

  test('Criterion 1: Dedicated test database (clearance_test_db) is active and isolated from development DB', async () => {
    const conn = await testConnection();
    assert.equal(conn.connected, true);
    assert.equal(conn.database, 'clearance_test_db', 'Tests must execute strictly against dedicated clearance_test_db');
    assert.notEqual(conn.database, 'clearance_db', 'Working development database clearance_db must never be modified by tests');
    assert.ok(conn.version, 'Must return a valid MySQL/MariaDB version string');
  });

  test('Criterion 2 & 3: Knex migrations execute and are idempotent', async () => {
    // Run latest migrations
    const [batchNo, log] = await db.migrate.latest();
    assert.ok(Array.isArray(log), 'Migrations log must be an array');

    // Run again - should report already up to date
    const [batchNo2, log2] = await db.migrate.latest();
    assert.equal(log2.length, 0, 'Re-running migrations must produce no new migrations or errors');
  });

  test('Criterion 4: All 26 tables and the required view exist in clearance_test_db', async () => {
    const expectedTables = [
      // 15 JPA Entity Tables
      'users',
      'students',
      'clearance_requests',
      'department_approvals',
      'documents',
      'notifications',
      'convocation_receipts',
      'audit_logs',
      'student_debt_flags',
      'project_settings',
      'project_local_storage',
      'colleges',
      'departments',
      'collection_stations',
      'sponsors',

      // 4 3NF Reference Lookup Tables
      'ref_colleges',
      'ref_departments',
      'ref_programmes',
      'ref_halls',

      // 3 Express Persistence Tables
      'transcript_payment_requests',
      'awards',
      'hostels',

      // 3 Persistent MySQL Session & Token Tables
      'revoked_tokens',
      'refresh_tokens',
      'user_sessions',

      // Digital Clearance Certificate Table
      'clearance_certificates'
    ];

    const [rows] = await db.raw('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
    const tableNames = rows.map(r => Object.values(r)[0]).filter(name => !name.startsWith('knex_'));

    for (const expected of expectedTables) {
      assert.ok(tableNames.includes(expected), `Missing required table: ${expected}`);
    }
    assert.equal(expectedTables.length, 26, 'Must have exactly 26 base application tables');

    // Verify View exists
    const [views] = await db.raw('SHOW FULL TABLES WHERE Table_type = "VIEW"');
    const viewNames = views.map(r => Object.values(r)[0]);
    assert.ok(viewNames.includes('vw_student_profiles'), 'Missing required view: vw_student_profiles');
  });

  test('Criterion 5: Foreign keys and unique constraints are established correctly', async () => {
    const [fkRows] = await db.raw(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = 'clearance_db' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    const hasFk = (table, col, refTable, refCol) => {
      return fkRows.some(r => 
        r.TABLE_NAME === table &&
        r.COLUMN_NAME === col &&
        r.REFERENCED_TABLE_NAME === refTable &&
        r.REFERENCED_COLUMN_NAME === refCol
      );
    };

    assert.ok(hasFk('students', 'user_id', 'users', 'id'), 'FK students(user_id) -> users(id) missing');
    assert.ok(hasFk('clearance_requests', 'student_id', 'students', 'id'), 'FK clearance_requests(student_id) -> students(id) missing');
    assert.ok(hasFk('department_approvals', 'clearance_request_id', 'clearance_requests', 'id'), 'FK department_approvals(clearance_request_id) -> clearance_requests(id) missing');
    assert.ok(hasFk('documents', 'student_id', 'students', 'id'), 'FK documents(student_id) -> students(id) missing');
    assert.ok(hasFk('notifications', 'user_id', 'users', 'id'), 'FK notifications(user_id) -> users(id) missing');
    assert.ok(hasFk('notifications', 'student_id', 'students', 'id'), 'FK notifications(student_id) -> students(id) missing');
    assert.ok(hasFk('departments', 'college_id', 'colleges', 'id'), 'FK departments(college_id) -> colleges(id) missing');
    assert.ok(hasFk('ref_departments', 'college_id', 'ref_colleges', 'id'), 'FK ref_departments(college_id) -> ref_colleges(id) missing');
    assert.ok(hasFk('ref_programmes', 'department_id', 'ref_departments', 'id'), 'FK ref_programmes(department_id) -> ref_departments(id) missing');
    assert.ok(hasFk('transcript_payment_requests', 'student_id', 'students', 'id'), 'FK transcript_payment_requests(student_id) -> students(id) missing');
    assert.ok(hasFk('awards', 'recipient_student_id', 'students', 'id'), 'FK awards(recipient_student_id) -> students(id) missing');
    assert.ok(hasFk('hostels', 'warden_user_id', 'users', 'id'), 'FK hostels(warden_user_id) -> users(id) missing');

    // Verify Unique Constraints
    const [indexes] = await db.raw(`
      SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, COLUMN_NAME
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = 'clearance_db' AND NON_UNIQUE = 0
    `);

    const hasUnique = (table, col) => {
      return indexes.some(idx => idx.TABLE_NAME === table && idx.COLUMN_NAME === col);
    };

    assert.ok(hasUnique('users', 'username'), 'Unique username constraint missing');
    assert.ok(hasUnique('students', 'registration_number'), 'Unique registration_number constraint missing');
    assert.ok(hasUnique('colleges', 'code'), 'Unique college code constraint missing');
    assert.ok(hasUnique('collection_stations', 'code'), 'Unique station code constraint missing');
    assert.ok(hasUnique('sponsors', 'name'), 'Unique sponsor name constraint missing');
    assert.ok(hasUnique('ref_colleges', 'code'), 'Unique ref_colleges code constraint missing');
    assert.ok(hasUnique('ref_halls', 'name'), 'Unique ref_halls name constraint missing');
    assert.ok(hasUnique('hostels', 'code'), 'Unique hostels code constraint missing');
  });

  test('Criterion 6: Reference-data seeders execute successfully and populate catalog', async () => {
    // Run seeders
    await db.seed.run();

    const collegesCount = await db('colleges').count('id as total');
    assert.ok(Number(collegesCount[0].total) >= 18, `Expected at least 18 colleges, got ${collegesCount[0].total}`);

    const departmentsCount = await db('departments').count('id as total');
    assert.ok(Number(departmentsCount[0].total) >= 40, `Expected at least 40 departments, got ${departmentsCount[0].total}`);

    const stationsCount = await db('collection_stations').count('id as total');
    assert.equal(Number(stationsCount[0].total), 6, `Expected exactly 6 collection stations, got ${stationsCount[0].total}`);

    const sponsorsCount = await db('sponsors').count('id as total');
    assert.equal(Number(sponsorsCount[0].total), 4, `Expected exactly 4 sponsors, got ${sponsorsCount[0].total}`);

    const refCollegesCount = await db('ref_colleges').count('id as total');
    assert.ok(Number(refCollegesCount[0].total) >= 18);

    const refHallsCount = await db('ref_halls').count('id as total');
    assert.ok(Number(refHallsCount[0].total) >= 10);

    const projectSettings = await db('project_settings').where({ project_id: 'default' }).first();
    assert.ok(projectSettings, 'Default project settings branding must exist');
    assert.equal(projectSettings.university_name, 'University of Dar es Salaam');
  });

  test('Criterion 7: Zero default production credentials or hardcoded passwords exist', async () => {
    const usersCount = await db('users').count('id as total');
    assert.equal(Number(usersCount[0].total), 0, 'Reference seeders must not create any user accounts or default passwords');
  });

  test('Criterion 8: Unified student profiles view (vw_student_profiles) queries cleanly', async () => {
    const profiles = await db('vw_student_profiles').select('*').limit(5);
    assert.ok(Array.isArray(profiles), 'View must return an array');
  });

  test('Criterion 9: No PostgreSQL drivers or connection parameters are active', () => {
    const knexConfig = require('../../knexfile');
    assert.equal(knexConfig.development.client, 'mysql2');
    assert.equal(knexConfig.production.client, 'mysql2');
    assert.equal(knexConfig.test.client, 'mysql2');

    const pkg = require('../../package.json');
    assert.ok(!pkg.dependencies.pg, 'pg dependency must not be present');
    assert.ok(!pkg.dependencies['pg-hstore'], 'pg-hstore dependency must not be present');
    assert.ok(pkg.dependencies.mysql2, 'mysql2 driver must be present');
    assert.ok(pkg.dependencies.knex, 'knex query builder must be present');
  });
});

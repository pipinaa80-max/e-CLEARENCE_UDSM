/**
 * Knex Migration: Add Postgraduate Clearance, Research Supervisor, DPGS,
 * and Director Transcript Issuance persistence columns.
 * Mirrors & improves GitHub main V36, V37, V38 for MySQL 8.0+.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const ensureColumn = async (tableName, colName, adder) => {
    const exists = await knex.schema.hasColumn(tableName, colName);
    if (!exists) {
      await knex.schema.alterTable(tableName, (table) => {
        adder(table);
      });
    }
  };

  // 1. users table
  await ensureColumn('users', 'award', (t) => t.string('award', 255).nullable());
  await ensureColumn('users', 'is_postgraduate', (t) => t.boolean('is_postgraduate').notNullable().defaultTo(false));

  // 2. students table
  await ensureColumn('students', 'award', (t) => t.string('award', 255).nullable());
  await ensureColumn('students', 'is_postgraduate', (t) => t.boolean('is_postgraduate').notNullable().defaultTo(false));
  await ensureColumn('students', 'undergraduate_certificate_url', (t) => t.specificType('undergraduate_certificate_url', 'LONGTEXT').nullable());

  // 3. clearance_requests table
  await ensureColumn('clearance_requests', 'award', (t) => t.string('award', 255).nullable());
  await ensureColumn('clearance_requests', 'is_postgraduate', (t) => t.boolean('is_postgraduate').notNullable().defaultTo(false));
  await ensureColumn('clearance_requests', 'undergraduate_certificate_url', (t) => t.specificType('undergraduate_certificate_url', 'LONGTEXT').nullable());

  // 4. transcript_payment_requests table (persist Director "Issue & Forward" action)
  await ensureColumn('transcript_payment_requests', 'issued_by_director', (t) => t.boolean('issued_by_director').notNullable().defaultTo(false));
  await ensureColumn('transcript_payment_requests', 'issued_by_director_title', (t) => t.string('issued_by_director_title', 255).nullable());
  await ensureColumn('transcript_payment_requests', 'issued_at', (t) => t.datetime('issued_at', { precision: 6 }).nullable());

  // 5. Refresh vw_student_profiles view to expose postgraduate classification fields
  await knex.raw(`
    CREATE OR REPLACE VIEW vw_student_profiles AS
    SELECT
      u.id AS user_id,
      u.username,
      u.email,
      u.role,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.full_name,
      u.phone_number,
      u.is_active,
      u.is_email_verified,
      u.project_id,
      COALESCE(s.award, u.award) AS award,
      COALESCE(s.is_postgraduate, u.is_postgraduate, 0) AS is_postgraduate,
      s.undergraduate_certificate_url,
      s.id AS student_id,
      s.registration_number,
      s.programme,
      s.college,
      s.department,
      s.academic_year,
      s.graduation_year,
      s.semester,
      s.year_of_study,
      s.hall,
      s.wing,
      s.block,
      s.room_number,
      s.sponsor,
      s.clearance_status
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const dropColumnIfExists = async (tableName, colName) => {
    const exists = await knex.schema.hasColumn(tableName, colName);
    if (exists) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn(colName);
      });
    }
  };

  await knex.raw(`
    CREATE OR REPLACE VIEW vw_student_profiles AS
    SELECT
      u.id AS user_id,
      u.username,
      u.email,
      u.role,
      u.first_name,
      u.middle_name,
      u.last_name,
      u.full_name,
      u.phone_number,
      u.is_active,
      u.is_email_verified,
      u.project_id,
      s.id AS student_id,
      s.registration_number,
      s.programme,
      s.college,
      s.department,
      s.academic_year,
      s.graduation_year,
      s.semester,
      s.year_of_study,
      s.hall,
      s.wing,
      s.block,
      s.room_number,
      s.sponsor,
      s.clearance_status
    FROM users u
    LEFT JOIN students s ON s.user_id = u.id
  `);

  await dropColumnIfExists('transcript_payment_requests', 'issued_at');
  await dropColumnIfExists('transcript_payment_requests', 'issued_by_director_title');
  await dropColumnIfExists('transcript_payment_requests', 'issued_by_director');

  await dropColumnIfExists('clearance_requests', 'undergraduate_certificate_url');
  await dropColumnIfExists('clearance_requests', 'is_postgraduate');
  await dropColumnIfExists('clearance_requests', 'award');

  await dropColumnIfExists('students', 'undergraduate_certificate_url');
  await dropColumnIfExists('students', 'is_postgraduate');
  await dropColumnIfExists('students', 'award');

  await dropColumnIfExists('users', 'is_postgraduate');
  await dropColumnIfExists('users', 'award');
};

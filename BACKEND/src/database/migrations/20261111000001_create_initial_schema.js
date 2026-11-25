/**
 * Migration: 20261111000001_create_initial_schema
 * Canonical MySQL 8.0 schema for UDSM e-Clearance.
 * Creates all 22 tables and the unified student profiles view.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Users table
  await knex.schema.createTable('users', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('username', 255).notNullable().unique();
    table.string('email', 255).notNullable();
    table.string('password', 255).notNullable();
    table.string('full_name', 255).nullable();
    table.string('first_name', 255).notNullable();
    table.string('middle_name', 255).nullable();
    table.string('last_name', 255).notNullable();
    table.string('registration_number', 255).nullable();
    table.string('programme', 255).nullable();
    table.string('college', 255).nullable();
    table.string('department', 255).nullable();
    table.string('academic_year', 255).nullable();
    table.string('graduation_year', 255).nullable();
    table.string('semester', 255).nullable();
    table.string('year_of_study', 255).nullable();
    table.string('phone_number', 255).nullable();
    table.string('hall', 255).nullable();
    table.string('wing', 50).nullable();
    table.string('block', 50).nullable();
    table.string('room_number', 255).nullable();
    table.string('address', 255).nullable();
    table.string('physical_address', 255).nullable();
    table.string('sponsor', 255).nullable();
    table.text('photo', 'longtext').nullable();
    table.string('role', 50).nullable();
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_email_verified').defaultTo(false);
    table.boolean('is_locked').defaultTo(false);
    table.string('lock_reason', 255).nullable();
    table.datetime('lock_time', { precision: 6 }).nullable();
    table.string('reset_token', 255).nullable();
    table.datetime('reset_token_expiry', { precision: 6 }).nullable();
    table.string('verification_token', 255).nullable();
    table.datetime('verification_token_expiry', { precision: 6 }).nullable();
    table.datetime('last_login', { precision: 6 }).nullable();
    table.datetime('created_at', { precision: 6 }).nullable();
    table.datetime('updated_at', { precision: 6 }).nullable();
    table.string('created_by', 255).nullable();
    table.string('updated_by', 255).nullable();
    table.string('project_id', 100).nullable();
    table.string('last_login_ip', 255).nullable();
    table.string('last_login_device', 255).nullable();
    table.string('institutional_domain', 253).nullable();
    table.string('station_code', 50).nullable();
    table.string('station_name', 255).nullable();

    table.index(['username'], 'idx_users_username');
    table.index(['email'], 'idx_users_email');
    table.index(['registration_number'], 'idx_users_registration_number');
    table.index(['project_id'], 'idx_users_project_id');
    table.index(['role'], 'idx_users_role');
    table.index(['station_code'], 'idx_users_station_code');
    table.index(['role', 'is_active'], 'idx_users_role_is_active');
  });

  // 2. Students table
  await knex.schema.createTable('students', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('registration_number', 255).notNullable().unique();
    table.string('full_name', 255).notNullable();
    table.string('email', 255).nullable();
    table.string('phone_number', 255).nullable();
    table.string('programme', 255).nullable();
    table.string('faculty', 255).nullable();
    table.string('college', 255).nullable();
    table.string('department', 255).nullable();
    table.string('year_of_study', 255).nullable();
    table.string('academic_year', 255).nullable();
    table.date('date_of_birth').nullable();
    table.string('nationality', 255).nullable();
    table.string('address', 255).nullable();
    table.string('physical_address', 255).nullable();
    table.string('profile_image_url', 255).nullable();
    table.string('hall', 255).nullable();
    table.string('wing', 50).nullable();
    table.string('block', 50).nullable();
    table.string('room_number', 255).nullable();
    table.string('sponsor', 255).nullable();
    table.text('photo', 'longtext').nullable();
    table.string('graduation_year', 255).nullable();
    table.string('semester', 255).nullable();
    table.boolean('is_final_year').defaultTo(true);
    table.string('clearance_status', 255).nullable();
    table.datetime('created_at', { precision: 6 }).nullable();
    table.datetime('updated_at', { precision: 6 }).nullable();
    table.string('project_id', 100).nullable();
    table.string('user_id', 255).nullable().unique();
    table.boolean('certificate_verified').defaultTo(false);
    table.datetime('certificate_verified_at', { precision: 6 }).nullable();
    table.string('digital_signature_hash', 255).nullable();
    table.string('signed_by', 255).nullable();
    table.datetime('signed_at', { precision: 6 }).nullable();
    table.string('dispatch_status', 50).defaultTo('Pending Dispatch');
    table.datetime('dispatched_at', { precision: 6 }).nullable();
    table.string('station_code', 50).nullable();
    table.string('station_name', 255).nullable();
    table.string('intake_status', 50).defaultTo('Awaiting Intake');
    table.datetime('station_received_at', { precision: 6 }).nullable();
    table.string('station_received_by', 255).nullable();
    table.string('vault_locker_number', 100).nullable();
    table.string('handover_collector_type', 100).nullable();
    table.string('handover_collector_name', 255).nullable();
    table.string('handover_collector_id', 100).nullable();
    table.string('handover_collector_phone', 50).nullable();
    table.datetime('handover_approved_at', { precision: 6 }).nullable();
    table.string('handover_secretary', 255).nullable();
    table.string('handover_receipt_token', 255).nullable();
    table.text('transit_issue_notes').nullable();

    table.foreign('user_id', 'fk_students_user').references('id').inTable('users').onDelete('CASCADE');

    table.index(['registration_number'], 'idx_students_registration_number');
    table.index(['user_id'], 'idx_students_user_id');
    table.index(['project_id'], 'idx_students_project_id');
    table.index(['certificate_verified'], 'idx_students_cert_verified');
    table.index(['dispatch_status'], 'idx_students_dispatch_status');
    table.index(['station_code'], 'idx_students_station_code');
    table.index(['intake_status'], 'idx_students_intake_status');
    table.index(['college', 'department', 'clearance_status'], 'idx_students_college_dept_status');
    table.index(['station_code', 'intake_status'], 'idx_students_station_intake');
  });

  // 3. Clearance requests table
  await knex.schema.createTable('clearance_requests', (table) => {
    table.bigIncrements('id').primary();
    table.string('student_id', 255).notNullable();
    table.string('status', 255).notNullable();
    table.string('current_stage', 255).nullable();
    table.string('current_office', 255).nullable();
    table.datetime('submitted_at', { precision: 6 }).nullable();
    table.datetime('updated_at', { precision: 6 }).nullable();
    table.string('college', 255).nullable();
    table.string('department', 255).nullable();
    table.string('programme', 255).nullable();
    table.string('wing', 50).nullable();
    table.string('block', 50).nullable();
    table.string('address', 255).nullable();
    table.string('physical_address', 255).nullable();
    table.string('project_id', 100).nullable();
    table.boolean('certificate_verified').defaultTo(false);
    table.datetime('certificate_verified_at', { precision: 6 }).nullable();
    table.string('digital_signature_hash', 255).nullable();
    table.string('signed_by', 255).nullable();
    table.datetime('signed_at', { precision: 6 }).nullable();
    table.string('dispatch_status', 50).defaultTo('Pending Dispatch');
    table.datetime('dispatched_at', { precision: 6 }).nullable();

    table.foreign('student_id', 'fk_clearance_requests_student').references('id').inTable('students').onDelete('CASCADE');

    table.index(['student_id'], 'idx_clearance_requests_student_id');
    table.index(['project_id'], 'idx_clearance_requests_project_id');
    table.index(['college', 'department', 'status'], 'idx_clearance_college_dept_status');
    table.index(['student_id', 'status'], 'idx_clearance_student_status');
  });

  // 4. Department approvals table
  await knex.schema.createTable('department_approvals', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('clearance_request_id').unsigned().nullable();
    table.string('department', 255).notNullable();
    table.string('status', 255).notNullable();
    table.string('approved_by', 255).nullable();
    table.datetime('approval_date', { precision: 6 }).nullable();
    table.string('comments', 255).nullable();
    table.integer('order_number').nullable();

    table.foreign('clearance_request_id', 'fk_department_approvals_request').references('id').inTable('clearance_requests').onDelete('CASCADE');

    table.index(['clearance_request_id'], 'idx_department_approvals_request_id');
    table.index(['department', 'status'], 'idx_approvals_dept_status');
    table.index(['clearance_request_id', 'department', 'status'], 'idx_approvals_req_dept_status');
  });

  // 5. Documents table
  await knex.schema.createTable('documents', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('file_name', 255).notNullable();
    table.string('file_type', 255).notNullable();
    table.string('file_url', 255).notNullable();
    table.bigInteger('file_size').nullable();
    table.string('description', 255).nullable();
    table.datetime('upload_date', { precision: 6 }).nullable();
    table.string('document_category', 255).nullable();
    table.boolean('is_verified').defaultTo(false);
    table.string('verified_by', 255).nullable();
    table.datetime('verified_date', { precision: 6 }).nullable();
    table.string('verification_comment', 255).nullable();
    table.string('student_id', 255).notNullable();
    table.string('project_id', 100).nullable();

    table.foreign('student_id', 'fk_documents_student').references('id').inTable('students').onDelete('CASCADE');

    table.index(['student_id'], 'idx_documents_student_id');
    table.index(['project_id'], 'idx_documents_project_id');
  });

  // 6. Notifications table
  await knex.schema.createTable('notifications', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('user_id', 255).nullable();
    table.string('student_id', 255).nullable();
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.string('type', 255).nullable();
    table.boolean('is_read').defaultTo(false);
    table.datetime('read_at', { precision: 6 }).nullable();
    table.datetime('created_at', { precision: 6 }).nullable();
    table.string('link', 255).nullable();
    table.string('project_id', 100).nullable();

    table.foreign('user_id', 'fk_notifications_user').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('student_id', 'fk_notifications_student').references('id').inTable('students').onDelete('CASCADE');

    table.index(['user_id'], 'idx_notifications_user_id');
    table.index(['student_id'], 'idx_notifications_student_id');
    table.index(['project_id'], 'idx_notifications_project_id');
  });

  // 7. Convocation receipts table
  await knex.schema.createTable('convocation_receipts', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('student_id', 255).notNullable();
    table.string('control_number', 255).notNullable();
    table.string('receipt_number', 255).notNullable();
    table.string('payment_date', 255).nullable();
    table.string('file_name', 255).nullable();
    table.string('file_url', 255).nullable();
    table.string('file_type', 255).nullable();
    table.bigInteger('file_size').nullable();
    table.string('status', 255).nullable();
    table.string('approved_by', 255).nullable();
    table.datetime('approved_at', { precision: 6 }).nullable();
    table.string('comments', 255).nullable();
    table.datetime('submitted_at', { precision: 6 }).nullable();
    table.datetime('updated_at', { precision: 6 }).nullable();
    table.string('project_id', 100).nullable();

    table.index(['student_id'], 'idx_convocation_receipts_student_id');
    table.index(['project_id'], 'idx_convocation_receipts_project_id');
  });

  // 8. Audit logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('user_id', 255).nullable();
    table.string('username', 255).nullable();
    table.string('action', 255).notNullable();
    table.text('details').nullable();
    table.string('ip_address', 255).nullable();
    table.string('user_agent', 255).nullable();
    table.string('status', 255).nullable();
    table.datetime('created_at', { precision: 6 }).nullable();
    table.string('project_id', 100).nullable();

    table.index(['user_id'], 'idx_audit_logs_user_id');
    table.index(['project_id'], 'idx_audit_logs_project_id');
  });

  // 9. Student debt flags table
  await knex.schema.createTable('student_debt_flags', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('student_id', 36).notNullable();
    table.string('registration_number', 50).notNullable();
    table.string('student_name', 255).nullable();
    table.string('college', 255).notNullable();
    table.string('department', 255).notNullable();
    table.string('programme', 255).nullable();
    table.decimal('amount', 14, 2).notNullable();
    table.string('item_category', 100).defaultTo('Equipment / Item Rental');
    table.date('due_date').nullable();
    table.text('reason').notNullable();
    table.text('negotiation_notes').nullable();
    table.string('status', 20).notNullable().defaultTo('OPEN');
    table.string('lecturer_id', 36).notNullable();
    table.string('lecturer_name', 255).nullable();
    table.string('lecturer_email', 255).nullable();
    table.string('lecturer_phone', 50).nullable();
    table.text('resolution_note').nullable();
    table.datetime('resolved_at', { precision: 6 }).nullable();
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.string('project_id', 100).nullable();

    table.index(['student_id'], 'idx_student_debt_flags_student_id');
    table.index(['college', 'department', 'status'], 'idx_student_debt_flags_scope_status');
    table.index(['registration_number', 'status'], 'idx_student_debt_flags_registration_status');
    table.index(['lecturer_id'], 'idx_student_debt_flags_lecturer');
  });

  // 10. Project settings table
  await knex.schema.createTable('project_settings', (table) => {
    table.string('project_id', 100).notNullable().primary();
    table.string('university_name', 255).notNullable();
    table.string('short_name', 255).notNullable();
    table.string('logo_url', 1000).nullable();
    table.text('background_url').nullable();
    table.string('primary_color', 20).nullable();
    table.string('font_family', 100).nullable();
    table.text('dashboards_json').notNullable();
    table.text('footer_links_json').nullable();
    table.text('blocked_ips_json').nullable();
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
  });

  // 11. Project local storage table
  await knex.schema.createTable('project_local_storage', (table) => {
    table.bigIncrements('id').primary();
    table.string('project_id', 100).notNullable();
    table.string('storage_key', 150).notNullable();
    table.text('storage_value').notNullable();
    table.datetime('imported_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.index(['project_id', 'storage_key'], 'idx_project_local_storage_project_key');
  });

  // 12. Colleges table
  await knex.schema.createTable('colleges', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.index(['code'], 'idx_colleges_code');
    table.index(['is_active'], 'idx_colleges_is_active');
  });

  // 13. Departments table
  await knex.schema.createTable('departments', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('college_id', 36).nullable();
    table.string('code', 50).notNullable();
    table.string('name', 255).notNullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.foreign('college_id', 'fk_departments_college').references('id').inTable('colleges').onDelete('SET NULL');

    table.unique(['college_id', 'code'], { indexName: 'uq_college_dept_code' });
    table.index(['college_id'], 'idx_departments_college_id');
    table.index(['code'], 'idx_departments_code');
    table.index(['is_active'], 'idx_departments_is_active');
  });

  // 14. Collection stations table
  await knex.schema.createTable('collection_stations', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('region', 100).notNullable();
    table.string('district', 100).nullable();
    table.text('address').notNullable();
    table.string('operating_hours', 255).defaultTo('Mon - Fri: 08:00 - 16:00');
    table.string('contact_phone', 50).nullable();
    table.string('contact_email', 100).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at', { precision: 6 }).defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).defaultTo(knex.fn.now(6));

    table.index(['region'], 'idx_stations_region');
    table.index(['is_active'], 'idx_stations_is_active');
  });

  // 15. Sponsors table
  await knex.schema.createTable('sponsors', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('name', 255).notNullable().unique();
    table.string('code', 50).nullable();
    table.text('description').nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.datetime('created_at', { precision: 6 }).defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).defaultTo(knex.fn.now(6));

    table.index(['is_active'], 'idx_sponsors_is_active');
  });

  // 16. Reference tables: ref_colleges
  await knex.schema.createTable('ref_colleges', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('code', 20).notNullable().unique();
    table.string('name', 255).notNullable();
  });

  // 17. Reference tables: ref_departments
  await knex.schema.createTable('ref_departments', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('college_id', 36).nullable();
    table.string('code', 20).notNullable();
    table.string('name', 255).notNullable();

    table.foreign('college_id', 'fk_ref_dept_college').references('id').inTable('ref_colleges').onDelete('SET NULL');
  });

  // 18. Reference tables: ref_programmes
  await knex.schema.createTable('ref_programmes', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('department_id', 36).nullable();
    table.string('code', 20).notNullable();
    table.string('name', 255).notNullable();

    table.foreign('department_id', 'fk_ref_prog_dept').references('id').inTable('ref_departments').onDelete('SET NULL');
  });

  // 19. Reference tables: ref_halls
  await knex.schema.createTable('ref_halls', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('name', 100).notNullable().unique();
  });

  // 20. New Express table: transcript_payment_requests
  await knex.schema.createTable('transcript_payment_requests', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('student_id', 255).notNullable();
    table.string('registration_number', 100).notNullable();
    table.string('student_name', 255).notNullable();
    table.string('college', 255).nullable();
    table.string('department', 255).nullable();
    table.string('programme', 255).nullable();
    table.string('phone_number', 50).nullable();
    table.string('control_number', 100).notNullable();
    table.string('receipt_number', 100).nullable();
    table.decimal('amount', 14, 2).defaultTo(0.00);
    table.string('receipt_file_name', 255).nullable();
    table.string('receipt_file_url', 500).nullable();
    table.string('receipt_file_type', 100).nullable();
    table.string('status', 30).notNullable().defaultTo('PENDING_FINANCE');
    table.string('verified_by', 255).nullable();
    table.datetime('verified_at', { precision: 6 }).nullable();
    table.text('comments').nullable();
    table.string('project_id', 100).nullable();
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.foreign('student_id', 'fk_transcript_student').references('id').inTable('students').onDelete('CASCADE');

    table.index(['student_id'], 'idx_transcript_student_id');
    table.index(['status'], 'idx_transcript_status');
    table.index(['registration_number'], 'idx_transcript_reg_no');
  });

  // 21. New Express table: awards
  await knex.schema.createTable('awards', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('title', 255).notNullable();
    table.string('category', 100).notNullable();
    table.string('sponsor', 255).nullable();
    table.string('college', 255).nullable();
    table.string('department', 255).nullable();
    table.decimal('prize_amount', 14, 2).defaultTo(0.00);
    table.string('academic_year', 20).nullable();
    table.text('description').nullable();
    table.string('recipient_student_id', 255).nullable();
    table.string('recipient_name', 255).nullable();
    table.string('recipient_reg_no', 100).nullable();
    table.string('recipient_gpa', 20).nullable();
    table.string('status', 30).defaultTo('ACTIVE');
    table.string('project_id', 100).nullable();
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.foreign('recipient_student_id', 'fk_awards_recipient').references('id').inTable('students').onDelete('SET NULL');

    table.index(['category'], 'idx_awards_category');
    table.index(['recipient_student_id'], 'idx_awards_recipient_student_id');
  });

  // 22. New Express table: hostels
  await knex.schema.createTable('hostels', (table) => {
    table.string('id', 36).notNullable().primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 255).notNullable();
    table.string('campus', 150).defaultTo('Main Campus (Mlimani)');
    table.text('blocks_json').nullable();
    table.text('wings_json').nullable();
    table.integer('total_rooms').defaultTo(0);
    table.integer('capacity').defaultTo(0);
    table.string('warden_user_id', 255).nullable();
    table.string('warden_name', 255).nullable();
    table.string('contact_phone', 50).nullable();
    table.boolean('is_active').defaultTo(true);
    table.string('project_id', 100).nullable();
    table.datetime('created_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));
    table.datetime('updated_at', { precision: 6 }).notNullable().defaultTo(knex.fn.now(6));

    table.foreign('warden_user_id', 'fk_hostels_warden').references('id').inTable('users').onDelete('SET NULL');

    table.index(['code'], 'idx_hostels_code');
    table.index(['is_active'], 'idx_hostels_is_active');
  });

  // View: vw_student_profiles
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
    LEFT JOIN students s ON s.user_id = u.id;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw('DROP VIEW IF EXISTS vw_student_profiles');
  await knex.schema.dropTableIfExists('hostels');
  await knex.schema.dropTableIfExists('awards');
  await knex.schema.dropTableIfExists('transcript_payment_requests');
  await knex.schema.dropTableIfExists('ref_halls');
  await knex.schema.dropTableIfExists('ref_programmes');
  await knex.schema.dropTableIfExists('ref_departments');
  await knex.schema.dropTableIfExists('ref_colleges');
  await knex.schema.dropTableIfExists('sponsors');
  await knex.schema.dropTableIfExists('collection_stations');
  await knex.schema.dropTableIfExists('departments');
  await knex.schema.dropTableIfExists('colleges');
  await knex.schema.dropTableIfExists('project_local_storage');
  await knex.schema.dropTableIfExists('project_settings');
  await knex.schema.dropTableIfExists('student_debt_flags');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('convocation_receipts');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('documents');
  await knex.schema.dropTableIfExists('department_approvals');
  await knex.schema.dropTableIfExists('clearance_requests');
  await knex.schema.dropTableIfExists('students');
  await knex.schema.dropTableIfExists('users');
};

/**
 * Migration 5: Create Clearance Certificates Table
 * Manages digital clearance certificates, verification hashes, and public validation codes.
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('clearance_certificates');
  if (!hasTable) {
    await knex.schema.createTable('clearance_certificates', (table) => {
      table.string('id', 255).notNullable().primary();
      table.string('certificate_number', 100).notNullable().unique();
      table.bigInteger('clearance_request_id').unsigned().notNullable();
      table.string('student_id', 255).notNullable();
      table.string('verification_code', 64).notNullable().unique();
      table.string('digital_signature_hash', 255).notNullable();
      table.datetime('issued_at', { precision: 6 }).notNullable();
      table.string('issued_by', 255).notNullable();
      table.boolean('is_revoked').defaultTo(false);
      table.datetime('revoked_at', { precision: 6 }).nullable();
      table.string('revoked_by', 255).nullable();
      table.string('revocation_reason', 255).nullable();
      table.text('certificate_data').nullable(); // JSON metadata snapshot
      table.datetime('created_at', { precision: 6 }).notNullable();
      table.datetime('updated_at', { precision: 6 }).notNullable();

      table.foreign('clearance_request_id', 'fk_cert_clearance_request')
        .references('id')
        .inTable('clearance_requests')
        .onDelete('CASCADE');

      table.foreign('student_id', 'fk_cert_student')
        .references('id')
        .inTable('students')
        .onDelete('CASCADE');

      table.index(['clearance_request_id'], 'idx_cert_request_id');
      table.index(['student_id'], 'idx_cert_student_id');
      table.index(['verification_code'], 'idx_cert_verification_code');
      table.index(['certificate_number'], 'idx_cert_number');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('clearance_certificates');
  if (hasTable) {
    await knex.schema.dropTable('clearance_certificates');
  }
};

/**
 * Knex Migration: Align transcript_payment_requests with GitHub main V36 workflow
 * Adds server-managed transcript payment, review, and collection columns & constraints
 * while preserving the existing fk_transcript_student foreign key to students(id).
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const columnsToAdd = [
    ['user_id', (t) => t.string('user_id', 255).nullable()],
    ['active_student_id', (t) => t.string('active_student_id', 255).nullable()],
    ['copies', (t) => t.integer('copies').notNullable().defaultTo(1)],
    ['amount_tzs', (t) => t.integer('amount_tzs').notNullable().defaultTo(15000)],
    ['rejection_reason', (t) => t.string('rejection_reason', 500).nullable()],
    ['submitted_at', (t) => t.datetime('submitted_at', { precision: 6 }).nullable()],
    ['reviewed_at', (t) => t.datetime('reviewed_at', { precision: 6 }).nullable()],
    ['reviewed_by', (t) => t.string('reviewed_by', 255).nullable()],
    ['collection_method', (t) => t.string('collection_method', 30).nullable()],
    ['collection_address', (t) => t.string('collection_address', 1000).nullable()],
    ['posting_region', (t) => t.string('posting_region', 100).nullable()],
    ['posting_ward', (t) => t.string('posting_ward', 100).nullable()],
    ['posting_po_box', (t) => t.string('posting_po_box', 100).nullable()],
    ['contact_phone', (t) => t.string('contact_phone', 40).nullable()],
    ['contact_email', (t) => t.string('contact_email', 255).nullable()],
    ['version', (t) => t.bigInteger('version').notNullable().defaultTo(0)]
  ];

  for (const [colName, adder] of columnsToAdd) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await knex.schema.hasColumn('transcript_payment_requests', colName);
    if (!exists) {
      // eslint-disable-next-line no-await-in-loop
      await knex.schema.alterTable('transcript_payment_requests', (table) => {
        adder(table);
      });
    }
  }

  // Helper to add index/unique if absent
  const ensureIndex = async (keyName, fn) => {
    const [rows] = await knex.raw(
      'SHOW INDEX FROM transcript_payment_requests WHERE Key_name = ?',
      [keyName]
    );
    if (!rows || rows.length === 0) {
      await knex.schema.alterTable('transcript_payment_requests', fn);
    }
  };

  await ensureIndex('uq_transcript_payment_control', (t) => {
    t.unique(['project_id', 'control_number'], 'uq_transcript_payment_control');
  });
  await ensureIndex('uq_transcript_payment_active_student', (t) => {
    t.unique(['project_id', 'active_student_id'], 'uq_transcript_payment_active_student');
  });
  await ensureIndex('idx_transcript_payment_project_status_submitted', (t) => {
    t.index(['project_id', 'status', 'submitted_at'], 'idx_transcript_payment_project_status_submitted');
  });
  await ensureIndex('idx_transcript_payment_project_student_submitted', (t) => {
    t.index(['project_id', 'user_id', 'submitted_at'], 'idx_transcript_payment_project_student_submitted');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const dropIndexIfExists = async (keyName) => {
    const [rows] = await knex.raw(
      'SHOW INDEX FROM transcript_payment_requests WHERE Key_name = ?',
      [keyName]
    );
    if (rows && rows.length > 0) {
      await knex.raw(`ALTER TABLE transcript_payment_requests DROP INDEX \`${keyName}\``);
    }
  };

  await dropIndexIfExists('uq_transcript_payment_control');
  await dropIndexIfExists('uq_transcript_payment_active_student');
  await dropIndexIfExists('idx_transcript_payment_project_status_submitted');
  await dropIndexIfExists('idx_transcript_payment_project_student_submitted');

  const cols = [
    'user_id', 'active_student_id', 'copies', 'amount_tzs', 'rejection_reason',
    'submitted_at', 'reviewed_at', 'reviewed_by', 'collection_method',
    'collection_address', 'posting_region', 'posting_ward', 'posting_po_box',
    'contact_phone', 'contact_email', 'version'
  ];

  for (const colName of cols) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await knex.schema.hasColumn('transcript_payment_requests', colName);
    if (exists) {
      // eslint-disable-next-line no-await-in-loop
      await knex.schema.alterTable('transcript_payment_requests', (table) => {
        table.dropColumn(colName);
      });
    }
  }
};

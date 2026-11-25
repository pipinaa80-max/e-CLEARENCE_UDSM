/**
 * Migration 6: Add Unique Constraint on clearance_request_id in clearance_certificates
 * Enforces strict 1-to-1 relationship: a clearance request cannot have duplicate certificate records.
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('clearance_certificates');
  if (hasTable) {
    await knex.schema.alterTable('clearance_certificates', (table) => {
      table.unique(['clearance_request_id'], 'clearance_certificates_request_id_unique');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('clearance_certificates');
  if (hasTable) {
    await knex.schema.alterTable('clearance_certificates', (table) => {
      table.dropUnique(['clearance_request_id'], 'clearance_certificates_request_id_unique');
    });
  }
};

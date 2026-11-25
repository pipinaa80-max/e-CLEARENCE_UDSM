/**
 * Migration 4: Add Unique Constraint to Department Approvals
 * Ensures that at the database engine level, no duplicate or conflicting
 * approval records can ever exist for the same clearance request and department.
 */
exports.up = async function(knex) {
  // Check if unique index already exists
  const hasTable = await knex.schema.hasTable('department_approvals');
  if (hasTable) {
    await knex.schema.alterTable('department_approvals', (table) => {
      table.unique(['clearance_request_id', 'department'], 'uq_dept_approvals_request_dept');
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('department_approvals');
  if (hasTable) {
    await knex.schema.alterTable('department_approvals', (table) => {
      table.dropUnique(['clearance_request_id', 'department'], 'uq_dept_approvals_request_dept');
    });
  }
};

/**
 * Knex Migration: Add composite relational index on student_debt_flags
 * Mirrors Spring Boot Flyway V35 query optimization (idx_debt_flags_student_lecturer)
 * while preserving support for pre-registered student flags.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const [indexes] = await knex.raw(
    "SHOW INDEX FROM student_debt_flags WHERE Key_name = 'idx_debt_flags_student_lecturer'"
  );

  if (!indexes || indexes.length === 0) {
    await knex.schema.alterTable('student_debt_flags', (table) => {
      table.index(['student_id', 'lecturer_id', 'status'], 'idx_debt_flags_student_lecturer');
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const [indexes] = await knex.raw(
    "SHOW INDEX FROM student_debt_flags WHERE Key_name = 'idx_debt_flags_student_lecturer'"
  );

  if (indexes && indexes.length > 0) {
    await knex.schema.alterTable('student_debt_flags', (table) => {
      table.dropIndex(['student_id', 'lecturer_id', 'status'], 'idx_debt_flags_student_lecturer');
    });
  }
};

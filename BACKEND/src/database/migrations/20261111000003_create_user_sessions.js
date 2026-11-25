/**
 * Migration: 20261111000003_create_user_sessions
 * Adds persistent user_sessions table for cross-device access token and session tracking.
 * Enables persistent cross-device invalidation on global logout, password change, and password reset.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. User sessions table (tracks every authenticated login session)
  await knex.schema.createTable('user_sessions', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('user_id', 255).notNullable().index();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('device_info', 255).nullable();
    table.string('ip_address', 100).nullable();
    table.boolean('is_revoked').defaultTo(false).index();
    table.datetime('revoked_at', { precision: 6 }).nullable();
    table.string('revocation_reason', 100).nullable();
    table.datetime('expires_at', { precision: 6 }).notNullable().index();
    table.datetime('created_at', { precision: 6 }).defaultTo(knex.fn.now());
    table.datetime('updated_at', { precision: 6 }).defaultTo(knex.fn.now());
  });

  // 2. Correlate refresh_tokens with session_id
  const hasSessionId = await knex.schema.hasColumn('refresh_tokens', 'session_id');
  if (!hasSessionId) {
    await knex.schema.alterTable('refresh_tokens', (table) => {
      table.string('session_id', 255).nullable().index();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasSessionId = await knex.schema.hasColumn('refresh_tokens', 'session_id');
  if (hasSessionId) {
    await knex.schema.alterTable('refresh_tokens', (table) => {
      table.dropColumn('session_id');
    });
  }
  await knex.schema.dropTableIfExists('user_sessions');
};

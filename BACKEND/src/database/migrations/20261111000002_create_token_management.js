/**
 * Migration: 20261111000002_create_token_management
 * Adds persistent MySQL-backed token revocation and refresh token tracking.
 * Complies with strict MySQL 8.0 schema requirements.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Revoked tokens table (stores revoked access and refresh token JTIs)
  await knex.schema.createTable('revoked_tokens', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('jti', 255).notNullable().unique().index();
    table.string('user_id', 255).nullable().index();
    table.string('token_type', 50).notNullable().defaultTo('access');
    table.datetime('expires_at', { precision: 6 }).notNullable().index();
    table.string('reason', 100).nullable();
    table.datetime('created_at', { precision: 6 }).defaultTo(knex.fn.now());
  });

  // 2. Active and rotated refresh tokens table (tracked session records)
  await knex.schema.createTable('refresh_tokens', (table) => {
    table.string('id', 255).notNullable().primary();
    table.string('user_id', 255).notNullable().index();
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('jti', 255).notNullable().unique().index();
    table.string('token_hash', 64).notNullable().unique().index();
    table.string('family_id', 255).notNullable().index();
    table.boolean('is_revoked').defaultTo(false).index();
    table.datetime('revoked_at', { precision: 6 }).nullable();
    table.string('replaced_by_jti', 255).nullable();
    table.datetime('expires_at', { precision: 6 }).notNullable().index();
    table.datetime('created_at', { precision: 6 }).defaultTo(knex.fn.now());
    table.datetime('updated_at', { precision: 6 }).defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('refresh_tokens');
  await knex.schema.dropTableIfExists('revoked_tokens');
};

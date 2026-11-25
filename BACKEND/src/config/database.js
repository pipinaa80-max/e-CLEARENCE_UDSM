const knex = require('knex');
const knexConfig = require('../../knexfile');

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment] || knexConfig.development;

const db = knex(config);

/**
 * Verifies active database connection
 */
async function testConnection() {
  try {
    const [result] = await db.raw('SELECT 1 + 1 AS result, VERSION() AS version, DATABASE() as db');
    return {
      connected: true,
      database: result[0].db,
      version: result[0].version
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message
    };
  }
}

module.exports = {
  db,
  getDb: () => db,
  testConnection
};

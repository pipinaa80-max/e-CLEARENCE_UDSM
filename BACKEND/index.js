/**
 * UDSM e-Clearance Backend — Production Entry Point (DirectAdmin / LiteSpeed / Node.js)
 * Starts the Express server unconditionally when loaded by LiteSpeed lsnode / Passenger
 * or directly via `node index.js` (no top-level await for full LiteSpeed compatibility).
 */

const app = require('./src/app');
const { startServer } = require('./src/server');

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

module.exports = app;

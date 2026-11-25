const app = require('./app');
const env = require('./config/env');
const { db, testConnection } = require('./config/database');

async function startServer() {
  // Test Database Connection
  const conn = await testConnection();
  if (!conn.connected) {
    console.error('Failed to connect to MySQL database:', conn.error);
    process.exit(1);
  }

  if (env.NODE_ENV === 'production' && !env.DB_PASSWORD) {
    console.warn('WARNING: DB_PASSWORD is empty in production environment. Ensure your database uses a strong password.');
  }

  console.log(`Connected to MySQL database [${conn.database}] on ${env.DB_HOST}:${env.DB_PORT} (${conn.version})`);

  const server = app.listen(env.PORT, () => {
    console.log(`UDSM e-Clearance Express server running on port ${env.PORT} [${env.NODE_ENV}]`);
    console.log(`Base API URL: http://localhost:${env.PORT}/api/v1`);
  });

  // Graceful shutdown: stop accepting new connections and cleanly close MySQL pool
  let shuttingDown = false;
  const gracefulShutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}. Stopping server gracefully...`);

    const forceTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out after 10s; forcing exit.');
      process.exit(1);
    }, 10000);
    if (forceTimer.unref) forceTimer.unref();

    server.close(async () => {
      try {
        await db.destroy();
        console.log('MySQL connection pool closed.');
      } catch (err) {
        console.error('Error closing MySQL connection pool:', err.message);
      }
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}

module.exports = { startServer };

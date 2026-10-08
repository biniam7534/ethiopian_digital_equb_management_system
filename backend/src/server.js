/**
 * HTTP server entry point.
 */
const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/db');
const { initFirebase } = require('./config/firebase');

async function start() {
  // Verify DB connectivity before accepting traffic
  await pool.query('SELECT 1');
  console.info('[server] PostgreSQL connected');

  initFirebase();

  app.listen(env.port, () => {
    console.info(`[server] Equb API listening on port ${env.port} (${env.nodeEnv})`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start', err);
  process.exit(1);
});

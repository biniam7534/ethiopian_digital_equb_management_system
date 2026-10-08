/**
 * PostgreSQL connection pool.
 */
const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error', err);
});

/**
 * Run a parameterized query.
 * @param {string} text
 * @param {any[]} [params]
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (!env.isProd && duration > 200) {
    console.warn(`[db] Slow query (${duration}ms):`, text.slice(0, 120));
  }
  return result;
}

/**
 * Obtain a client for transactions.
 */
async function getClient() {
  return pool.connect();
}

module.exports = {
  pool,
  query,
  getClient,
};

/**
 * Apply database/schema.sql against the configured PostgreSQL instance.
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, '../../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.info('[migrate] Applying schema from', schemaPath);
  await pool.query(sql);
  console.info('[migrate] Done.');
  await pool.end();
}

migrate().catch(async (err) => {
  console.error('[migrate] Failed', err);
  await pool.end();
  process.exit(1);
});

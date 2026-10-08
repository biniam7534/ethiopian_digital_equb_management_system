/**
 * Database migration runner.
 *
 * Two modes:
 *   npm run migrate          → Apply database/schema.sql (full idempotent schema)
 *   npm run migrate:versioned → Apply each V00N__.sql file in order (skips already-applied versions)
 *
 * Usage examples:
 *   node src/db/migrate.js
 *   node src/db/migrate.js --versioned
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

const DB_DIR = path.join(__dirname, '../../../database');
const SCHEMA_PATH = path.join(DB_DIR, 'schema.sql');
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');

// ─── Helpers ────────────────────────────────────────────────────────────────

async function applyFullSchema() {
  console.info('[migrate] Mode: full schema');
  console.info('[migrate] Reading', SCHEMA_PATH);
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  await pool.query(sql);
  console.info('[migrate] ✓ Schema applied successfully.');
}

async function applyVersionedMigrations() {
  console.info('[migrate] Mode: versioned migrations');

  // Ensure tracking table exists first
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(10)  PRIMARY KEY,
      description VARCHAR(255) NOT NULL,
      applied_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  // Read already-applied versions
  const { rows } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const applied = new Set(rows.map(r => r.version));
  console.info('[migrate] Already applied:', applied.size ? [...applied].join(', ') : 'none');

  // Collect and sort migration files  (e.g. V001__*, V002__*, …)
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => /^V\d{3}__.*\.sql$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.info('[migrate] No migration files found in', MIGRATIONS_DIR);
    return;
  }

  let appliedCount = 0;

  for (const file of files) {
    const version = file.match(/^(V\d{3})/i)[1].toUpperCase();

    if (applied.has(version)) {
      console.info(`[migrate] ↷ Skipping ${file} (already applied)`);
      continue;
    }

    console.info(`[migrate] → Applying ${file} …`);
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    // Each migration runs in its own transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.info(`[migrate] ✓ ${file} applied.`);
      appliedCount++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] ✗ Failed on ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.info(`[migrate] Done. ${appliedCount} new migration(s) applied.`);
}

// ─── Entry point ────────────────────────────────────────────────────────────

async function main() {
  const versioned = process.argv.includes('--versioned');

  try {
    if (versioned) {
      await applyVersionedMigrations();
    } else {
      await applyFullSchema();
    }
  } finally {
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error('[migrate] Fatal error:', err.message);
  await pool.end();
  process.exit(1);
});

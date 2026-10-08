/**
 * Seed script — inserts demo data for all 7 tables.
 *
 * Reads database/seed.sql and executes it, then overlays bcrypt-hashed
 * passwords so they remain valid regardless of the placeholder hash in the SQL.
 *
 * Usage:
 *   npm run seed
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, query } = require('../config/db');

const SEED_PATH = path.join(__dirname, '../../../database/seed.sql');

// Fixed UUIDs that match seed.sql
const USER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
];

async function seed() {
  console.info('[seed] Starting …');

  // Step 1: Apply seed SQL (inserts everything with placeholder hash)
  console.info('[seed] Applying', SEED_PATH);
  const sql = fs.readFileSync(SEED_PATH, 'utf8');
  await pool.query(sql);
  console.info('[seed] ✓ Base seed data inserted.');

  // Step 2: Overwrite password hashes with a proper bcrypt hash
  console.info('[seed] Hashing passwords …');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await query(
    `UPDATE users
        SET password_hash = $1
      WHERE id = ANY($2::uuid[])`,
    [passwordHash, USER_IDS]
  );
  console.info('[seed] ✓ Passwords updated (bcrypt cost 10).');

  // Step 3: Summary
  const counts = await query(`
    SELECT
      (SELECT COUNT(*) FROM users)         AS users,
      (SELECT COUNT(*) FROM equbs)         AS equbs,
      (SELECT COUNT(*) FROM members)       AS members,
      (SELECT COUNT(*) FROM cycles)        AS cycles,
      (SELECT COUNT(*) FROM contributions) AS contributions,
      (SELECT COUNT(*) FROM payouts)       AS payouts,
      (SELECT COUNT(*) FROM notifications) AS notifications
  `);

  const c = counts.rows[0];
  console.info('[seed] ✓ Database seeded. Row counts:');
  console.table({
    users: +c.users,
    equbs: +c.equbs,
    members: +c.members,
    cycles: +c.cycles,
    contributions: +c.contributions,
    payouts: +c.payouts,
    notifications: +c.notifications,
  });
  console.info('[seed] Password for all demo users: Password123!');
}

seed()
  .catch(async (err) => {
    console.error('[seed] Failed:', err.message);
    await pool.end();
    process.exit(1);
  })
  .finally(() => pool.end());

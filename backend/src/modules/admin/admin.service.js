/**
 * Admin dashboard aggregates and moderation actions.
 */
const { query } = require('../../config/db');
const { NotFoundError } = require('../../utils/errors');
const { sanitizeUser } = require('../auth/auth.service');
const { mapEqub } = require('../equb/equb.service');

async function getDashboardStats() {
  const [users, equbs, contributions, payouts, activeEqubs] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM users`),
    query(`SELECT COUNT(*)::int AS count FROM equbs`),
    query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS total
       FROM contributions WHERE status = 'confirmed'`
    ),
    query(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount),0)::numeric AS total
       FROM payouts WHERE status = 'completed'`
    ),
    query(`SELECT COUNT(*)::int AS count FROM equbs WHERE status = 'active'`),
  ]);

  return {
    totalUsers: users.rows[0].count,
    totalEqubs: equbs.rows[0].count,
    activeEqubs: activeEqubs.rows[0].count,
    confirmedContributions: contributions.rows[0].count,
    contributionVolume: Number(contributions.rows[0].total),
    completedPayouts: payouts.rows[0].count,
    payoutVolume: Number(payouts.rows[0].total),
  };
}

async function listUsers({ search, role, limit = 50, offset = 0 } = {}) {
  const params = [];
  const clauses = [];
  let i = 1;

  if (search) {
    clauses.push(`(full_name ILIKE $${i} OR phone ILIKE $${i} OR email ILIKE $${i})`);
    params.push(`%${search}%`);
    i += 1;
  }
  if (role) {
    clauses.push(`role = $${i}`);
    params.push(role);
    i += 1;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT id, full_name, phone, email, role, language, is_active, created_at
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );
  return rows.map(sanitizeUser);
}

async function updateUser(userId, updates) {
  const fields = [];
  const values = [];
  let i = 1;
  const map = { role: 'role', isActive: 'is_active', language: 'language' };

  Object.entries(map).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(updates[key]);
      i += 1;
    }
  });

  values.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${i}
     RETURNING id, full_name, phone, email, role, language, is_active, created_at`,
    values
  );
  if (!rows.length) throw new NotFoundError('User not found');
  return sanitizeUser(rows[0]);
}

async function listAllEqubs({ status, limit = 50, offset = 0 } = {}) {
  const params = [];
  let where = '';
  let i = 1;

  if (status) {
    where = `WHERE e.status = $${i}`;
    params.push(status);
    i += 1;
  }
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM members m WHERE m.equb_id = e.id AND m.status = 'active') AS member_count
     FROM equbs e
     ${where}
     ORDER BY e.created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    params
  );
  return rows.map(mapEqub);
}

async function updateEqubStatus(equbId, status) {
  const { rows } = await query(
    `UPDATE equbs SET status = $1 WHERE id = $2 RETURNING *`,
    [status, equbId]
  );
  if (!rows.length) throw new NotFoundError('Equb not found');
  return mapEqub(rows[0]);
}

async function listRecentTransactions(limit = 30) {
  const contributions = await query(
    `SELECT c.id, c.amount, c.status, c.paid_at, c.created_at,
            'contribution' AS kind, u.full_name, e.name AS equb_name
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     JOIN users u ON u.id = m.user_id
     JOIN cycles cy ON cy.id = c.cycle_id
     JOIN equbs e ON e.id = cy.equb_id
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [limit]
  );

  const payouts = await query(
    `SELECT p.id, p.amount, p.status, p.paid_at, p.created_at,
            'payout' AS kind, u.full_name, e.name AS equb_name
     FROM payouts p
     JOIN members m ON m.id = p.member_id
     JOIN users u ON u.id = m.user_id
     JOIN cycles cy ON cy.id = p.cycle_id
     JOIN equbs e ON e.id = cy.equb_id
     ORDER BY p.created_at DESC
     LIMIT $1`,
    [limit]
  );

  const merged = [...contributions.rows, ...payouts.rows]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      amount: Number(row.amount),
      status: row.status,
      paidAt: row.paid_at,
      createdAt: row.created_at,
      personName: row.full_name,
      equbName: row.equb_name,
    }));

  return merged;
}

module.exports = {
  getDashboardStats,
  listUsers,
  updateUser,
  listAllEqubs,
  updateEqubStatus,
  listRecentTransactions,
};

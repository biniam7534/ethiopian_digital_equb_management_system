/**
 * Contributions and payouts — the financial core of the equb.
 */
const { query, getClient } = require('../../config/db');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} = require('../../utils/errors');
const notificationService = require('../notification/notification.service');

function mapContribution(row) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    memberId: row.member_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    referenceCode: row.reference_code,
    status: row.status,
    paidAt: row.paid_at,
    confirmedBy: row.confirmed_by,
    notes: row.notes,
    createdAt: row.created_at,
    memberName: row.full_name,
  };
}

function mapPayout(row) {
  return {
    id: row.id,
    cycleId: row.cycle_id,
    memberId: row.member_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    referenceCode: row.reference_code,
    status: row.status,
    paidAt: row.paid_at,
    processedBy: row.processed_by,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

async function getMembership(userId, equbId) {
  const { rows } = await query(
    `SELECT * FROM members WHERE user_id = $1 AND equb_id = $2 AND status = 'active'`,
    [userId, equbId]
  );
  return rows[0] || null;
}

/**
 * Member records a contribution for the active cycle.
 */
async function submitContribution(userId, payload) {
  const cycleRes = await query('SELECT * FROM cycles WHERE id = $1', [payload.cycleId]);
  if (!cycleRes.rows.length) throw new NotFoundError('Cycle not found');

  const cycle = cycleRes.rows[0];
  if (!['collecting', 'overdue'].includes(cycle.status)) {
    throw new ConflictError('This cycle is not accepting contributions');
  }

  const equbRes = await query('SELECT * FROM equbs WHERE id = $1', [cycle.equb_id]);
  const equb = equbRes.rows[0];

  const membership = await getMembership(userId, equb.id);
  if (!membership) throw new ForbiddenError('You are not a member of this equb');

  const amount = payload.amount != null ? payload.amount : Number(equb.contribution_amount);
  if (Number(amount) !== Number(equb.contribution_amount)) {
    throw new ValidationError(
      `Contribution must equal the equb amount (${equb.contribution_amount})`
    );
  }

  const existing = await query(
    'SELECT id, status FROM contributions WHERE cycle_id = $1 AND member_id = $2',
    [cycle.id, membership.id]
  );
  if (existing.rows.length && existing.rows[0].status === 'confirmed') {
    throw new ConflictError('Contribution already confirmed for this cycle');
  }

  let row;
  if (existing.rows.length) {
    const updated = await query(
      `UPDATE contributions
       SET amount = $1, payment_method = $2, reference_code = $3, notes = $4,
           status = 'pending', paid_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        amount,
        payload.paymentMethod,
        payload.referenceCode || null,
        payload.notes || null,
        existing.rows[0].id,
      ]
    );
    row = updated.rows[0];
  } else {
    const inserted = await query(
      `INSERT INTO contributions (
         cycle_id, member_id, amount, payment_method, reference_code, notes, status, paid_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending', NOW())
       RETURNING *`,
      [
        cycle.id,
        membership.id,
        amount,
        payload.paymentMethod,
        payload.referenceCode || null,
        payload.notes || null,
      ]
    );
    row = inserted.rows[0];
  }

  await notificationService.notifyUser({
    userId: equb.organizer_id,
    equbId: equb.id,
    title: 'Contribution submitted',
    body: `A member submitted a contribution for cycle ${cycle.cycle_number} of ${equb.name}.`,
    type: 'contribution_due',
    channel: 'in_app',
  });

  return mapContribution(row);
}

/**
 * Organizer confirms or rejects a contribution.
 */
async function confirmContribution(organizerId, contributionId, { status, notes }) {
  const contribRes = await query(
    `SELECT c.*, cy.equb_id, cy.cycle_number, e.organizer_id, e.name AS equb_name,
            e.contribution_amount, m.user_id AS member_user_id
     FROM contributions c
     JOIN cycles cy ON cy.id = c.cycle_id
     JOIN equbs e ON e.id = cy.equb_id
     JOIN members m ON m.id = c.member_id
     WHERE c.id = $1`,
    [contributionId]
  );
  if (!contribRes.rows.length) throw new NotFoundError('Contribution not found');

  const contrib = contribRes.rows[0];
  const adminCheck = await query('SELECT role FROM users WHERE id = $1', [organizerId]);
  if (contrib.organizer_id !== organizerId && adminCheck.rows[0]?.role !== 'admin') {
    throw new ForbiddenError('Only the organizer can confirm contributions');
  }

  if (contrib.status === 'confirmed' && status === 'confirmed') {
    throw new ConflictError('Already confirmed');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updated = await client.query(
      `UPDATE contributions
       SET status = $1, confirmed_by = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, organizerId, notes || null, contributionId]
    );

    if (status === 'confirmed') {
      await client.query(
        `UPDATE cycles
         SET total_collected = total_collected + $1
         WHERE id = $2`,
        [contrib.amount, contrib.cycle_id]
      );
    }

    await client.query('COMMIT');

    await notificationService.notifyUser({
      userId: contrib.member_user_id,
      equbId: contrib.equb_id,
      title: status === 'confirmed' ? 'Contribution confirmed' : 'Contribution rejected',
      body:
        status === 'confirmed'
          ? `Your contribution for cycle ${contrib.cycle_number} of ${contrib.equb_name} was confirmed.`
          : `Your contribution for cycle ${contrib.cycle_number} was rejected. Contact the organizer.`,
      type: 'contribution_confirmed',
      channel: 'both',
    });

    return mapContribution(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * When all active members have confirmed contributions, process payout and advance cycle.
 */
async function processPayout(organizerId, payload) {
  const cycleRes = await query(
    `SELECT cy.*, e.organizer_id, e.name AS equb_name, e.contribution_amount,
            e.max_members, e.id AS equb_id
     FROM cycles cy
     JOIN equbs e ON e.id = cy.equb_id
     WHERE cy.id = $1`,
    [payload.cycleId]
  );
  if (!cycleRes.rows.length) throw new NotFoundError('Cycle not found');

  const cycle = cycleRes.rows[0];
  const adminCheck = await query('SELECT role FROM users WHERE id = $1', [organizerId]);
  if (cycle.organizer_id !== organizerId && adminCheck.rows[0]?.role !== 'admin') {
    throw new ForbiddenError('Only the organizer can process payouts');
  }

  if (cycle.status === 'completed') {
    throw new ConflictError('Cycle already completed');
  }

  const membersRes = await query(
    `SELECT id, user_id FROM members WHERE equb_id = $1 AND status = 'active'`,
    [cycle.equb_id]
  );
  const confirmedRes = await query(
    `SELECT COUNT(*)::int AS count FROM contributions
     WHERE cycle_id = $1 AND status = 'confirmed'`,
    [cycle.id]
  );

  if (confirmedRes.rows[0].count < membersRes.rows.length) {
    throw new ConflictError(
      `Not all members have confirmed contributions (${confirmedRes.rows[0].count}/${membersRes.rows.length})`
    );
  }

  const payoutAmount = Number(cycle.contribution_amount) * membersRes.rows.length;
  const recipient = await query('SELECT * FROM members WHERE id = $1', [cycle.recipient_id]);
  if (!recipient.rows.length) throw new NotFoundError('Recipient member not found');

  const existingPayout = await query('SELECT id FROM payouts WHERE cycle_id = $1', [cycle.id]);
  if (existingPayout.rows.length) {
    throw new ConflictError('Payout already exists for this cycle');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const payoutRes = await client.query(
      `INSERT INTO payouts (
         cycle_id, member_id, amount, payment_method, reference_code,
         status, paid_at, processed_by, notes
       ) VALUES ($1,$2,$3,$4,$5,'completed', NOW(), $6, $7)
       RETURNING *`,
      [
        cycle.id,
        cycle.recipient_id,
        payoutAmount,
        payload.paymentMethod,
        payload.referenceCode || null,
        organizerId,
        payload.notes || null,
      ]
    );

    await client.query(
      `UPDATE cycles SET status = 'completed', completed_at = NOW(), total_collected = $1
       WHERE id = $2`,
      [payoutAmount, cycle.id]
    );

    await client.query(
      `UPDATE members SET has_received = TRUE WHERE id = $1`,
      [cycle.recipient_id]
    );

    const nextCycleNum = cycle.cycle_number + 1;
    const nextCycle = await client.query(
      `SELECT id FROM cycles WHERE equb_id = $1 AND cycle_number = $2`,
      [cycle.equb_id, nextCycleNum]
    );

    if (nextCycle.rows.length) {
      await client.query(
        `UPDATE cycles SET status = 'collecting', started_at = NOW() WHERE id = $1`,
        [nextCycle.rows[0].id]
      );
      await client.query(
        `UPDATE equbs SET current_cycle = $1 WHERE id = $2`,
        [nextCycleNum, cycle.equb_id]
      );
    } else {
      await client.query(
        `UPDATE equbs SET status = 'completed' WHERE id = $1`,
        [cycle.equb_id]
      );
    }

    await client.query('COMMIT');

    await notificationService.notifyUser({
      userId: recipient.rows[0].user_id,
      equbId: cycle.equb_id,
      title: 'Payout completed',
      body: `You received ETB ${payoutAmount.toFixed(2)} from ${cycle.equb_name} (cycle ${cycle.cycle_number}).`,
      type: 'payout_completed',
      channel: 'both',
    });

    if (nextCycle.rows.length) {
      await notificationService.broadcastToEqub(cycle.equb_id, {
        title: 'New cycle started',
        body: `Cycle ${nextCycleNum} of ${cycle.equb_name} is now collecting contributions.`,
        type: 'cycle_started',
        channel: 'both',
      });
    } else {
      await notificationService.broadcastToEqub(cycle.equb_id, {
        title: 'Equb completed',
        body: `${cycle.equb_name} has completed all cycles. Thank you!`,
        type: 'equb_completed',
        channel: 'both',
      });
    }

    return mapPayout(payoutRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function listContributionsForCycle(cycleId, userId) {
  const cycleRes = await query(
    `SELECT cy.*, e.organizer_id FROM cycles cy
     JOIN equbs e ON e.id = cy.equb_id
     WHERE cy.id = $1`,
    [cycleId]
  );
  if (!cycleRes.rows.length) throw new NotFoundError('Cycle not found');

  const membership = await getMembership(userId, cycleRes.rows[0].equb_id);
  const admin = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (
    !membership &&
    cycleRes.rows[0].organizer_id !== userId &&
    admin.rows[0]?.role !== 'admin'
  ) {
    throw new ForbiddenError('Access denied');
  }

  const { rows } = await query(
    `SELECT c.*, u.full_name
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     JOIN users u ON u.id = m.user_id
     WHERE c.cycle_id = $1
     ORDER BY c.created_at ASC`,
    [cycleId]
  );
  return rows.map(mapContribution);
}

async function listMyContributions(userId, equbId = null) {
  const params = [userId];
  let sql = `
    SELECT c.*, u.full_name
    FROM contributions c
    JOIN members m ON m.id = c.member_id
    JOIN users u ON u.id = m.user_id
    WHERE m.user_id = $1
  `;
  if (equbId) {
    params.push(equbId);
    sql += ` AND m.equb_id = $2`;
  }
  sql += ' ORDER BY c.created_at DESC';

  const { rows } = await query(sql, params);
  return rows.map(mapContribution);
}

async function listPayouts(equbId, userId) {
  const equbRes = await query('SELECT organizer_id FROM equbs WHERE id = $1', [equbId]);
  if (!equbRes.rows.length) throw new NotFoundError('Equb not found');

  const membership = await getMembership(userId, equbId);
  const admin = await query('SELECT role FROM users WHERE id = $1', [userId]);
  if (
    !membership &&
    equbRes.rows[0].organizer_id !== userId &&
    admin.rows[0]?.role !== 'admin'
  ) {
    throw new ForbiddenError('Access denied');
  }

  const { rows } = await query(
    `SELECT p.* FROM payouts p
     JOIN cycles cy ON cy.id = p.cycle_id
     WHERE cy.equb_id = $1
     ORDER BY p.created_at DESC`,
    [equbId]
  );
  return rows.map(mapPayout);
}

module.exports = {
  submitContribution,
  confirmContribution,
  processPayout,
  listContributionsForCycle,
  listMyContributions,
  listPayouts,
};

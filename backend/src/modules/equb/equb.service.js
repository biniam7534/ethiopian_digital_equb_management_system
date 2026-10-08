/**
 * Equb group lifecycle: create, join, start, list, cycles.
 */
const { query, getClient } = require('../../config/db');
const { generateInviteCode } = require('../../utils/inviteCode');
const {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} = require('../../utils/errors');
const notificationService = require('../notification/notification.service');

function mapEqub(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    organizerId: row.organizer_id,
    contributionAmount: Number(row.contribution_amount),
    maxMembers: row.max_members,
    frequency: row.frequency,
    startDate: row.start_date,
    status: row.status,
    currentCycle: row.current_cycle,
    inviteCode: row.invite_code,
    memberCount: row.member_count !== undefined ? Number(row.member_count) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function frequencyToDays(frequency) {
  switch (frequency) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    case 'monthly':
      return 30;
    default:
      return 7;
  }
}

async function createEqub(organizerId, payload) {
  let inviteCode = generateInviteCode();
  // Retry a few times on unlikely collisions
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const clash = await query('SELECT id FROM equbs WHERE invite_code = $1', [inviteCode]);
    if (!clash.rows.length) break;
    inviteCode = generateInviteCode();
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const equbRes = await client.query(
      `INSERT INTO equbs (
         name, description, organizer_id, contribution_amount,
         max_members, frequency, start_date, invite_code, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')
       RETURNING *`,
      [
        payload.name,
        payload.description || null,
        organizerId,
        payload.contributionAmount,
        payload.maxMembers,
        payload.frequency,
        payload.startDate,
        inviteCode,
      ]
    );

    const equb = equbRes.rows[0];

    // Organizer is always member #1
    await client.query(
      `INSERT INTO members (equb_id, user_id, payout_position, status)
       VALUES ($1, $2, 1, 'active')`,
      [equb.id, organizerId]
    );

    // Promote user role to organizer if they were only a member
    await client.query(
      `UPDATE users SET role = 'organizer'
       WHERE id = $1 AND role = 'member'`,
      [organizerId]
    );

    await client.query('COMMIT');
    return mapEqub({ ...equb, member_count: 1 });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function joinEqub(userId, inviteCode) {
  const { rows } = await query('SELECT * FROM equbs WHERE invite_code = $1', [inviteCode]);
  if (!rows.length) throw new NotFoundError('Invalid invite code');

  const equb = rows[0];
  if (equb.status !== 'open') {
    throw new ConflictError('This equb is no longer accepting members');
  }

  const countRes = await query(
    `SELECT COUNT(*)::int AS count FROM members
     WHERE equb_id = $1 AND status = 'active'`,
    [equb.id]
  );
  if (countRes.rows[0].count >= equb.max_members) {
    throw new ConflictError('Equb is full');
  }

  const existing = await query(
    'SELECT id FROM members WHERE equb_id = $1 AND user_id = $2',
    [equb.id, userId]
  );
  if (existing.rows.length) {
    throw new ConflictError('You are already a member of this equb');
  }

  const posRes = await query(
    `SELECT COALESCE(MAX(payout_position), 0) + 1 AS next_pos
     FROM members WHERE equb_id = $1`,
    [equb.id]
  );
  const nextPos = posRes.rows[0].next_pos;

  const memberRes = await query(
    `INSERT INTO members (equb_id, user_id, payout_position, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [equb.id, userId, nextPos]
  );

  await notificationService.notifyUser({
    userId: equb.organizer_id,
    equbId: equb.id,
    title: 'New member joined',
    body: `A new member joined ${equb.name}.`,
    type: 'equb_invite',
    channel: 'in_app',
  });

  return {
    equb: mapEqub(equb),
    membership: {
      id: memberRes.rows[0].id,
      payoutPosition: memberRes.rows[0].payout_position,
      status: memberRes.rows[0].status,
    },
  };
}

async function listMyEqubs(userId) {
  const { rows } = await query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM members m WHERE m.equb_id = e.id AND m.status = 'active') AS member_count,
            mem.payout_position,
            mem.has_received,
            mem.id AS membership_id
     FROM equbs e
     INNER JOIN members mem ON mem.equb_id = e.id AND mem.user_id = $1 AND mem.status = 'active'
     ORDER BY e.created_at DESC`,
    [userId]
  );

  return rows.map((row) => ({
    ...mapEqub(row),
    myMembership: {
      id: row.membership_id,
      payoutPosition: row.payout_position,
      hasReceived: row.has_received,
    },
  }));
}

async function getEqubById(equbId, userId) {
  const { rows } = await query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM members m WHERE m.equb_id = e.id AND m.status = 'active') AS member_count
     FROM equbs e WHERE e.id = $1`,
    [equbId]
  );
  if (!rows.length) throw new NotFoundError('Equb not found');

  const membership = await query(
    `SELECT id, payout_position, has_received, status
     FROM members WHERE equb_id = $1 AND user_id = $2`,
    [equbId, userId]
  );

  // Members, organizers of this equb, or admins may view
  const userRes = await query('SELECT role FROM users WHERE id = $1', [userId]);
  const isAdmin = userRes.rows[0]?.role === 'admin';
  if (!membership.rows.length && rows[0].organizer_id !== userId && !isAdmin) {
    throw new ForbiddenError('You are not a member of this equb');
  }

  const membersRes = await query(
    `SELECT m.id, m.payout_position, m.has_received, m.status, m.joined_at,
            u.id AS user_id, u.full_name, u.phone
     FROM members m
     JOIN users u ON u.id = m.user_id
     WHERE m.equb_id = $1
     ORDER BY m.payout_position ASC`,
    [equbId]
  );

  const cyclesRes = await query(
    `SELECT * FROM cycles WHERE equb_id = $1 ORDER BY cycle_number ASC`,
    [equbId]
  );

  return {
    ...mapEqub(rows[0]),
    members: membersRes.rows.map((m) => ({
      id: m.id,
      userId: m.user_id,
      fullName: m.full_name,
      phone: m.phone,
      payoutPosition: m.payout_position,
      hasReceived: m.has_received,
      status: m.status,
      joinedAt: m.joined_at,
    })),
    cycles: cyclesRes.rows.map((c) => ({
      id: c.id,
      cycleNumber: c.cycle_number,
      recipientId: c.recipient_id,
      dueDate: c.due_date,
      status: c.status,
      totalCollected: Number(c.total_collected),
      startedAt: c.started_at,
      completedAt: c.completed_at,
    })),
    myMembership: membership.rows[0]
      ? {
          id: membership.rows[0].id,
          payoutPosition: membership.rows[0].payout_position,
          hasReceived: membership.rows[0].has_received,
          status: membership.rows[0].status,
        }
      : null,
  };
}

async function assertOrganizer(equbId, userId) {
  const { rows } = await query('SELECT * FROM equbs WHERE id = $1', [equbId]);
  if (!rows.length) throw new NotFoundError('Equb not found');
  if (rows[0].organizer_id !== userId) {
    const admin = await query('SELECT role FROM users WHERE id = $1', [userId]);
    if (admin.rows[0]?.role !== 'admin') {
      throw new ForbiddenError('Only the organizer can perform this action');
    }
  }
  return rows[0];
}

async function updateEqub(equbId, userId, updates) {
  await assertOrganizer(equbId, userId);

  const fields = [];
  const values = [];
  let i = 1;
  const map = { name: 'name', description: 'description', status: 'status' };

  Object.entries(map).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(updates[key]);
      i += 1;
    }
  });

  if (!fields.length) throw new ValidationError('No fields to update');

  values.push(equbId);
  const { rows } = await query(
    `UPDATE equbs SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  return mapEqub(rows[0]);
}

async function setPayoutOrder(equbId, userId, memberIdsInOrder) {
  const equb = await assertOrganizer(equbId, userId);
  if (equb.status !== 'open') {
    throw new ConflictError('Payout order can only be set while the equb is open');
  }

  const members = await query(
    `SELECT id FROM members WHERE equb_id = $1 AND status = 'active'`,
    [equbId]
  );
  const activeIds = new Set(members.rows.map((m) => m.id));

  if (memberIdsInOrder.length !== activeIds.size) {
    throw new ValidationError('memberIdsInOrder must include every active member exactly once');
  }
  memberIdsInOrder.forEach((id) => {
    if (!activeIds.has(id)) {
      throw new ValidationError(`Unknown member id: ${id}`);
    }
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Temporarily shift positions to avoid unique conflicts
    await client.query(
      `UPDATE members SET payout_position = payout_position + 1000 WHERE equb_id = $1`,
      [equbId]
    );
    for (let idx = 0; idx < memberIdsInOrder.length; idx += 1) {
      await client.query(
        `UPDATE members SET payout_position = $1 WHERE id = $2 AND equb_id = $3`,
        [idx + 1, memberIdsInOrder[idx], equbId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getEqubById(equbId, userId);
}

/**
 * Start the equb: create all cycles (one per member) and open cycle 1.
 */
async function startEqub(equbId, userId) {
  const equb = await assertOrganizer(equbId, userId);
  if (equb.status !== 'open') {
    throw new ConflictError('Equb already started or closed');
  }

  const membersRes = await query(
    `SELECT * FROM members WHERE equb_id = $1 AND status = 'active'
     ORDER BY payout_position ASC`,
    [equbId]
  );

  if (membersRes.rows.length < 2) {
    throw new ValidationError('Need at least 2 members to start');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const dayStep = frequencyToDays(equb.frequency);
    let due = equb.start_date;

    for (let i = 0; i < membersRes.rows.length; i += 1) {
      const member = membersRes.rows[i];
      const cycleNumber = i + 1;
      const status = cycleNumber === 1 ? 'collecting' : 'pending';
      const startedAt = cycleNumber === 1 ? new Date() : null;

      await client.query(
        `INSERT INTO cycles (
           equb_id, cycle_number, recipient_id, due_date, status, started_at
         ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [equbId, cycleNumber, member.id, due, status, startedAt]
      );

      due = addDays(due, dayStep);
    }

    await client.query(
      `UPDATE equbs SET status = 'active', current_cycle = 1 WHERE id = $1`,
      [equbId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // Notify all members
  const userIds = membersRes.rows.map((m) => m.user_id);
  await notificationService.notifyMany(userIds, {
    equbId,
    title: 'Equb started',
    body: `${equb.name} has started. Cycle 1 contributions are due.`,
    type: 'equb_started',
    channel: 'both',
  });

  return getEqubById(equbId, userId);
}

async function listOpenEqubs() {
  const { rows } = await query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM members m WHERE m.equb_id = e.id AND m.status = 'active') AS member_count
     FROM equbs e
     WHERE e.status = 'open'
     ORDER BY e.created_at DESC`
  );
  return rows.map(mapEqub);
}

module.exports = {
  createEqub,
  joinEqub,
  listMyEqubs,
  getEqubById,
  updateEqub,
  setPayoutOrder,
  startEqub,
  listOpenEqubs,
  assertOrganizer,
  mapEqub,
  frequencyToDays,
  addDays,
};

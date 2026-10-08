/**
 * Notification service — persists records and delivers via SMS / FCM.
 */
const { query } = require('../../config/db');
const { sendSms } = require('../../utils/sms');
const { getMessaging } = require('../../config/firebase');
const env = require('../../config/env');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

async function deliverPush(fcmToken, title, body, data = {}) {
  if (!env.fcm.enabled) {
    console.info(`[fcm:dry-run] token=${fcmToken?.slice(0, 12)}… title=${title}`);
    return { ok: true, skipped: true };
  }

  const messaging = getMessaging();
  if (!messaging || !fcmToken) {
    return { ok: false, skipped: !fcmToken };
  }

  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
      ),
    });
    return { ok: true };
  } catch (err) {
    console.error('[fcm] send failed', err.message);
    return { ok: false };
  }
}

/**
 * Create + optionally deliver a notification for one user.
 */
async function notifyUser({
  userId,
  equbId = null,
  title,
  body,
  type = 'general',
  channel = 'both',
  metadata = {},
}) {
  const userRes = await query(
    'SELECT phone, fcm_token, language FROM users WHERE id = $1',
    [userId]
  );
  if (!userRes.rows.length) return null;

  const user = userRes.rows[0];
  let smsStatus = 'skipped';
  let pushStatus = 'skipped';

  const { rows } = await query(
    `INSERT INTO notifications (
       user_id, equb_id, title, body, type, channel, metadata, sms_status, push_status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending','pending')
     RETURNING *`,
    [userId, equbId, title, body, type, channel, JSON.stringify(metadata)]
  );

  const notification = rows[0];

  if (channel === 'sms' || channel === 'both') {
    const smsResult = await sendSms(user.phone, `${title}: ${body}`);
    smsStatus = smsResult.skipped ? 'skipped' : smsResult.ok ? 'sent' : 'failed';
  }

  if (channel === 'push' || channel === 'both') {
    const pushResult = await deliverPush(user.fcm_token, title, body, {
      type,
      equbId: equbId || '',
      notificationId: notification.id,
    });
    pushStatus = pushResult.skipped ? 'skipped' : pushResult.ok ? 'sent' : 'failed';
  }

  if (channel === 'in_app') {
    smsStatus = 'skipped';
    pushStatus = 'skipped';
  }

  await query(
    `UPDATE notifications SET sms_status = $1, push_status = $2 WHERE id = $3`,
    [smsStatus, pushStatus, notification.id]
  );

  return {
    id: notification.id,
    userId,
    title,
    body,
    type,
    channel,
    smsStatus,
    pushStatus,
  };
}

async function notifyMany(userIds, payload) {
  const results = [];
  for (const userId of userIds) {
    // Sequential to avoid SMS rate bursts in demos; swap for Promise.all in production scale-out.
    // eslint-disable-next-line no-await-in-loop
    const result = await notifyUser({ ...payload, userId });
    if (result) results.push(result);
  }
  return results;
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    equbId: row.equb_id,
    title: row.title,
    body: row.body,
    type: row.type,
    channel: row.channel,
    isRead: row.is_read,
    smsStatus: row.sms_status,
    pushStatus: row.push_status,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

async function listForUser(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
  const params = [userId, limit, offset];
  let sql = `
    SELECT * FROM notifications
    WHERE user_id = $1
  `;
  if (unreadOnly) {
    sql += ' AND is_read = FALSE';
  }
  sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';

  const { rows } = await query(sql, params);
  return rows.map(mapNotification);
}

async function markRead(notificationId, userId) {
  const { rows } = await query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  if (!rows.length) throw new NotFoundError('Notification not found');
  return mapNotification(rows[0]);
}

async function markAllRead(userId) {
  await query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return { message: 'All notifications marked as read' };
}

async function unreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return { count: rows[0].count };
}

/**
 * Admin / organizer broadcast helper with ownership check left to caller.
 */
async function broadcastToEqub(equbId, { title, body, type = 'general', channel = 'both' }) {
  const { rows } = await query(
    `SELECT user_id FROM members WHERE equb_id = $1 AND status = 'active'`,
    [equbId]
  );
  return notifyMany(
    rows.map((r) => r.user_id),
    { equbId, title, body, type, channel }
  );
}

async function assertOwnsNotification(notificationId, userId) {
  const { rows } = await query('SELECT user_id FROM notifications WHERE id = $1', [
    notificationId,
  ]);
  if (!rows.length) throw new NotFoundError('Notification not found');
  if (rows[0].user_id !== userId) throw new ForbiddenError('Not your notification');
}

module.exports = {
  notifyUser,
  notifyMany,
  listForUser,
  markRead,
  markAllRead,
  unreadCount,
  broadcastToEqub,
  assertOwnsNotification,
  mapNotification,
};

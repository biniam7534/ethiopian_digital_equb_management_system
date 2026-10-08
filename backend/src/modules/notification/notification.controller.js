const notificationService = require('./notification.service');
const equbService = require('../equb/equb.service');
const { success } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const data = await notificationService.listForUser(req.user.id, {
    unreadOnly,
    limit,
    offset,
  });
  return success(res, data);
});

const unread = asyncHandler(async (req, res) => {
  const data = await notificationService.unreadCount(req.user.id);
  return success(res, data);
});

const markRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markRead(req.params.id, req.user.id);
  return success(res, data, 'Marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllRead(req.user.id);
  return success(res, data);
});

const broadcast = asyncHandler(async (req, res) => {
  // Organizer of the equb or admin may broadcast
  await equbService.assertOrganizer(req.body.equbId, req.user.id);
  const data = await notificationService.broadcastToEqub(req.body.equbId, req.body);
  return success(res, data, 'Broadcast sent');
});

module.exports = {
  list,
  unread,
  markRead,
  markAllRead,
  broadcast,
};

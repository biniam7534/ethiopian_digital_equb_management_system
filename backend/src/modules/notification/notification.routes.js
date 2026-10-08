const express = require('express');
const controller = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { broadcastSchema } = require('./notification.validation');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.list);
router.get('/unread-count', controller.unread);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
router.post('/broadcast', validate(broadcastSchema), controller.broadcast);

module.exports = router;

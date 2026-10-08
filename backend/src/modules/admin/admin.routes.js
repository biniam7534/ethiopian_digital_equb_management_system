const express = require('express');
const controller = require('./admin.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roleCheck');
const { validate } = require('../../middleware/validate');
const { updateUserSchema, updateEqubStatusSchema } = require('./admin.validation');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', controller.dashboard);
router.get('/users', controller.listUsers);
router.patch('/users/:id', validate(updateUserSchema), controller.updateUser);
router.get('/equbs', controller.listEqubs);
router.patch(
  '/equbs/:id/status',
  validate(updateEqubStatusSchema),
  controller.updateEqubStatus
);
router.get('/transactions', controller.transactions);

module.exports = router;

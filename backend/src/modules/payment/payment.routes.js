const express = require('express');
const controller = require('./payment.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  contributeSchema,
  confirmContributionSchema,
  processPayoutSchema,
} = require('./payment.validation');

const router = express.Router();

router.use(authenticate);

router.post('/contribute', validate(contributeSchema), controller.contribute);
router.patch(
  '/contributions/:id/confirm',
  validate(confirmContributionSchema),
  controller.confirm
);
router.post('/payout', validate(processPayoutSchema), controller.payout);
router.get('/cycles/:cycleId/contributions', controller.listCycleContributions);
router.get('/contributions/mine', controller.listMine);
router.get('/equbs/:equbId/payouts', controller.listPayouts);

module.exports = router;

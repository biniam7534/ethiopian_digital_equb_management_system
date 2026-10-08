const express = require('express');
const controller = require('./equb.controller');
const { authenticate } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  createEqubSchema,
  joinEqubSchema,
  updateEqubSchema,
  shufflePositionsSchema,
} = require('./equb.validation');

const router = express.Router();

router.use(authenticate);

router.post('/', validate(createEqubSchema), controller.create);
router.post('/join', validate(joinEqubSchema), controller.join);
router.get('/mine', controller.listMine);
router.get('/open', controller.listOpen);
router.get('/:id', controller.getOne);
router.patch('/:id', validate(updateEqubSchema), controller.update);
router.post('/:id/payout-order', validate(shufflePositionsSchema), controller.setOrder);
router.post('/:id/start', controller.start);

module.exports = router;

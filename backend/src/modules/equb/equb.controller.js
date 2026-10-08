const equbService = require('./equb.service');
const { success, created } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const equb = await equbService.createEqub(req.user.id, req.body);
  return created(res, equb, 'Equb created');
});

const join = asyncHandler(async (req, res) => {
  const result = await equbService.joinEqub(req.user.id, req.body.inviteCode);
  return success(res, result, 'Joined equb');
});

const listMine = asyncHandler(async (req, res) => {
  const equbs = await equbService.listMyEqubs(req.user.id);
  return success(res, equbs);
});

const listOpen = asyncHandler(async (req, res) => {
  const equbs = await equbService.listOpenEqubs();
  return success(res, equbs);
});

const getOne = asyncHandler(async (req, res) => {
  const equb = await equbService.getEqubById(req.params.id, req.user.id);
  return success(res, equb);
});

const update = asyncHandler(async (req, res) => {
  const equb = await equbService.updateEqub(req.params.id, req.user.id, req.body);
  return success(res, equb, 'Equb updated');
});

const setOrder = asyncHandler(async (req, res) => {
  const equb = await equbService.setPayoutOrder(
    req.params.id,
    req.user.id,
    req.body.memberIdsInOrder
  );
  return success(res, equb, 'Payout order updated');
});

const start = asyncHandler(async (req, res) => {
  const equb = await equbService.startEqub(req.params.id, req.user.id);
  return success(res, equb, 'Equb started');
});

module.exports = {
  create,
  join,
  listMine,
  listOpen,
  getOne,
  update,
  setOrder,
  start,
};

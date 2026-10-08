const paymentService = require('./payment.service');
const { success, created } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const contribute = asyncHandler(async (req, res) => {
  const data = await paymentService.submitContribution(req.user.id, req.body);
  return created(res, data, 'Contribution submitted');
});

const confirm = asyncHandler(async (req, res) => {
  const data = await paymentService.confirmContribution(
    req.user.id,
    req.params.id,
    req.body
  );
  return success(res, data, 'Contribution updated');
});

const payout = asyncHandler(async (req, res) => {
  const data = await paymentService.processPayout(req.user.id, req.body);
  return success(res, data, 'Payout processed');
});

const listCycleContributions = asyncHandler(async (req, res) => {
  const data = await paymentService.listContributionsForCycle(
    req.params.cycleId,
    req.user.id
  );
  return success(res, data);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await paymentService.listMyContributions(req.user.id, req.query.equbId);
  return success(res, data);
});

const listPayouts = asyncHandler(async (req, res) => {
  const data = await paymentService.listPayouts(req.params.equbId, req.user.id);
  return success(res, data);
});

module.exports = {
  contribute,
  confirm,
  payout,
  listCycleContributions,
  listMine,
  listPayouts,
};

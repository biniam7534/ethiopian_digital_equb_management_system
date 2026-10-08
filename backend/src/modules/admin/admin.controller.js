const adminService = require('./admin.service');
const { success } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const dashboard = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboardStats();
  return success(res, data);
});

const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers({
    search: req.query.search,
    role: req.query.role,
    limit: Math.min(Number(req.query.limit) || 50, 100),
    offset: Number(req.query.offset) || 0,
  });
  return success(res, data);
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await adminService.updateUser(req.params.id, req.body);
  return success(res, data, 'User updated');
});

const listEqubs = asyncHandler(async (req, res) => {
  const data = await adminService.listAllEqubs({
    status: req.query.status,
    limit: Math.min(Number(req.query.limit) || 50, 100),
    offset: Number(req.query.offset) || 0,
  });
  return success(res, data);
});

const updateEqubStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateEqubStatus(req.params.id, req.body.status);
  return success(res, data, 'Equb status updated');
});

const transactions = asyncHandler(async (req, res) => {
  const data = await adminService.listRecentTransactions(
    Math.min(Number(req.query.limit) || 30, 100)
  );
  return success(res, data);
});

module.exports = {
  dashboard,
  listUsers,
  updateUser,
  listEqubs,
  updateEqubStatus,
  transactions,
};

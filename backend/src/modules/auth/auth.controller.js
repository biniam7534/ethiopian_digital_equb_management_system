const authService = require('./auth.service');
const { success, created } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return created(res, result, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return success(res, result, 'Login successful');
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  return success(res, user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.id, req.body);
  return success(res, user, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(
    req.user.id,
    req.body.currentPassword,
    req.body.newPassword
  );
  return success(res, result, 'Password changed');
});

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
};

const Joi = require('joi');

const registerSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150).required(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{9,15}$/)
    .required()
    .messages({ 'string.pattern.base': 'Phone must be 9–15 digits, optional leading +' }),
  email: Joi.string().email().allow(null, '').optional(),
  password: Joi.string().min(8).max(72).required(),
  language: Joi.string().valid('en', 'am', 'om').default('en'),
  role: Joi.string().valid('member', 'organizer').default('member'),
});

const loginSchema = Joi.object({
  phone: Joi.string().trim().required(),
  password: Joi.string().required(),
});

const updateProfileSchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(150),
  email: Joi.string().email().allow(null, ''),
  language: Joi.string().valid('en', 'am', 'om'),
  fcmToken: Joi.string().allow(null, ''),
}).min(1);

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(72).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
};

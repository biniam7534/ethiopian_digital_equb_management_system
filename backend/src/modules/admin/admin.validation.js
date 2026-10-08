const Joi = require('joi');

const updateUserSchema = Joi.object({
  role: Joi.string().valid('member', 'organizer', 'admin'),
  isActive: Joi.boolean(),
  language: Joi.string().valid('en', 'am', 'om'),
}).min(1);

const updateEqubStatusSchema = Joi.object({
  status: Joi.string().valid('open', 'active', 'completed', 'cancelled').required(),
});

module.exports = {
  updateUserSchema,
  updateEqubStatusSchema,
};

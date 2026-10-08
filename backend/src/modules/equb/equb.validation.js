const Joi = require('joi');

const createEqubSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().allow('', null).max(2000),
  contributionAmount: Joi.number().positive().precision(2).required(),
  maxMembers: Joi.number().integer().min(2).max(200).required(),
  frequency: Joi.string().valid('daily', 'weekly', 'biweekly', 'monthly').required(),
  startDate: Joi.date().iso().required(),
});

const joinEqubSchema = Joi.object({
  inviteCode: Joi.string().trim().uppercase().min(4).max(12).required(),
});

const updateEqubSchema = Joi.object({
  name: Joi.string().trim().min(3).max(200),
  description: Joi.string().allow('', null).max(2000),
  status: Joi.string().valid('open', 'active', 'completed', 'cancelled'),
}).min(1);

const shufflePositionsSchema = Joi.object({
  memberIdsInOrder: Joi.array().items(Joi.string().uuid()).min(2).required(),
});

module.exports = {
  createEqubSchema,
  joinEqubSchema,
  updateEqubSchema,
  shufflePositionsSchema,
};

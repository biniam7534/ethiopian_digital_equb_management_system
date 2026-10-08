const Joi = require('joi');

const contributeSchema = Joi.object({
  cycleId: Joi.string().uuid().required(),
  amount: Joi.number().positive().precision(2).optional(),
  paymentMethod: Joi.string()
    .valid('cash', 'bank_transfer', 'mobile_money', 'other')
    .default('mobile_money'),
  referenceCode: Joi.string().trim().max(64).allow('', null),
  notes: Joi.string().trim().max(500).allow('', null),
});

const confirmContributionSchema = Joi.object({
  status: Joi.string().valid('confirmed', 'rejected').required(),
  notes: Joi.string().trim().max(500).allow('', null),
});

const processPayoutSchema = Joi.object({
  cycleId: Joi.string().uuid().required(),
  paymentMethod: Joi.string()
    .valid('cash', 'bank_transfer', 'mobile_money', 'other')
    .default('mobile_money'),
  referenceCode: Joi.string().trim().max(64).allow('', null),
  notes: Joi.string().trim().max(500).allow('', null),
});

module.exports = {
  contributeSchema,
  confirmContributionSchema,
  processPayoutSchema,
};

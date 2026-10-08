const Joi = require('joi');

const broadcastSchema = Joi.object({
  equbId: Joi.string().uuid().required(),
  title: Joi.string().trim().min(2).max(200).required(),
  body: Joi.string().trim().min(2).max(2000).required(),
  type: Joi.string()
    .valid(
      'contribution_due',
      'contribution_confirmed',
      'payout_ready',
      'payout_completed',
      'equb_invite',
      'equb_started',
      'equb_completed',
      'cycle_started',
      'general',
      'admin'
    )
    .default('general'),
  channel: Joi.string().valid('push', 'sms', 'both', 'in_app').default('both'),
});

module.exports = {
  broadcastSchema,
};

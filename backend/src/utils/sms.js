/**
 * SMS gateway client.
 * When SMS_ENABLED=false, messages are logged instead of sent (dev-friendly).
 */
const env = require('../config/env');

/**
 * Send an SMS to a phone number.
 * @param {string} phone E.164 preferred (e.g. +2519...)
 * @param {string} message
 * @returns {Promise<{ ok: boolean, providerResponse?: any, skipped?: boolean }>}
 */
async function sendSms(phone, message) {
  if (!env.sms.enabled) {
    console.info(`[sms:dry-run] To=${phone} Message=${message}`);
    return { ok: true, skipped: true };
  }

  if (!env.sms.apiUrl || !env.sms.apiKey) {
    console.error('[sms] Enabled but API URL/key missing');
    return { ok: false, skipped: false };
  }

  try {
    const response = await fetch(env.sms.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.sms.apiKey}`,
      },
      body: JSON.stringify({
        to: phone,
        from: env.sms.senderId,
        message,
      }),
    });

    const providerResponse = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('[sms] Provider error', response.status, providerResponse);
      return { ok: false, providerResponse };
    }

    return { ok: true, providerResponse };
  } catch (err) {
    console.error('[sms] Send failed', err.message);
    return { ok: false };
  }
}

module.exports = {
  sendSms,
};

/**
 * Firebase Admin initialization for FCM push notifications.
 * Safe no-op when FCM is disabled or credentials are missing.
 */
const env = require('./env');

let admin = null;
let messaging = null;

function initFirebase() {
  if (!env.fcm.enabled) {
    console.info('[firebase] FCM disabled — push notifications will be logged only.');
    return null;
  }

  try {
    // Lazy require so the app starts without firebase-admin native issues in pure SMS mode.
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');

    if (admin.apps.length) {
      messaging = admin.messaging();
      return messaging;
    }

    if (env.fcm.serviceAccountPath) {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const serviceAccount = require(env.fcm.serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      // Uses GOOGLE_APPLICATION_CREDENTIALS if set
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }

    messaging = admin.messaging();
    console.info('[firebase] Initialized for FCM.');
    return messaging;
  } catch (err) {
    console.error('[firebase] Failed to initialize — push will be skipped.', err.message);
    return null;
  }
}

function getMessaging() {
  if (messaging) return messaging;
  return initFirebase();
}

module.exports = {
  initFirebase,
  getMessaging,
};

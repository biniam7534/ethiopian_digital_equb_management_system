/**
 * Centralized environment configuration.
 * Loads .env once and exposes typed accessors used across the API.
 */
require('dotenv').config();

const requiredInProduction = ['JWT_SECRET', 'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

function getEnv(key, fallback = undefined) {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
}

function getBool(key, fallback = false) {
  const raw = getEnv(key);
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', '5000')),
  isProd: getEnv('NODE_ENV', 'development') === 'production',

  db: {
    host: getEnv('DB_HOST', 'localhost'),
    port: Number(getEnv('DB_PORT', '5432')),
    name: getEnv('DB_NAME', 'equb_db'),
    user: getEnv('DB_USER', 'equb_user'),
    password: getEnv('DB_PASSWORD', 'equb_password'),
  },

  jwt: {
    secret: getEnv('JWT_SECRET', 'dev_only_change_me'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
  },

  sms: {
    enabled: getBool('SMS_ENABLED', false),
    apiUrl: getEnv('SMS_API_URL', ''),
    apiKey: getEnv('SMS_API_KEY', ''),
    senderId: getEnv('SMS_SENDER_ID', 'EQUB'),
  },

  fcm: {
    enabled: getBool('FCM_ENABLED', false),
    serviceAccountPath: getEnv('FIREBASE_SERVICE_ACCOUNT_PATH', ''),
  },

  corsOrigin: getEnv('CORS_ORIGIN', '*'),
};

if (env.isProd) {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required env vars in production: ${missing.join(', ')}`);
  }
}

module.exports = env;

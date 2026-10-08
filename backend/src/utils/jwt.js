/**
 * JWT sign / verify helpers.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { UnauthorizedError } = require('./errors');

function signToken(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwt.secret);
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

module.exports = {
  signToken,
  verifyToken,
};

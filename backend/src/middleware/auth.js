/**
 * JWT authentication middleware.
 * Attaches req.user = { id, role, phone, language }.
 */
const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/errors');
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header');
  }

  const token = header.slice(7);
  const decoded = verifyToken(token);

  const { rows } = await query(
    `SELECT id, phone, role, language, is_active, full_name
     FROM users WHERE id = $1`,
    [decoded.sub]
  );

  if (!rows.length || !rows[0].is_active) {
    throw new UnauthorizedError('User not found or inactive');
  }

  req.user = {
    id: rows[0].id,
    phone: rows[0].phone,
    role: rows[0].role,
    language: rows[0].language,
    fullName: rows[0].full_name,
  };

  next();
});

module.exports = {
  authenticate,
};

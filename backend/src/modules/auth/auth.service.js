/**
 * Auth business logic: register, login, profile, password.
 */
const bcrypt = require('bcryptjs');
const { query } = require('../../config/db');
const { signToken } = require('../../utils/jwt');
const {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} = require('../../utils/errors');

const SALT_ROUNDS = 10;

function sanitizeUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    language: row.language,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function register({ fullName, phone, email, password, language, role }) {
  const existing = await query('SELECT id FROM users WHERE phone = $1', [phone]);
  if (existing.rows.length) {
    throw new ConflictError('Phone number already registered');
  }

  if (email) {
    const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length) {
      throw new ConflictError('Email already registered');
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await query(
    `INSERT INTO users (full_name, phone, email, password_hash, role, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, phone, email, role, language, is_active, created_at`,
    [fullName, phone, email || null, passwordHash, role || 'member', language || 'en']
  );

  const user = sanitizeUser(rows[0]);
  const token = signToken({ sub: user.id, role: user.role });

  return { user, token };
}

async function login({ phone, password }) {
  const { rows } = await query(
    `SELECT id, full_name, phone, email, role, language, is_active, created_at, password_hash
     FROM users WHERE phone = $1`,
    [phone]
  );

  if (!rows.length) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const row = rows[0];
  if (!row.is_active) {
    throw new UnauthorizedError('Account is deactivated');
  }

  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    throw new UnauthorizedError('Invalid phone or password');
  }

  const user = sanitizeUser(row);
  const token = signToken({ sub: user.id, role: user.role });
  return { user, token };
}

async function getProfile(userId) {
  const { rows } = await query(
    `SELECT id, full_name, phone, email, role, language, is_active, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows.length) throw new NotFoundError('User not found');
  return sanitizeUser(rows[0]);
}

async function updateProfile(userId, updates) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    fullName: 'full_name',
    email: 'email',
    language: 'language',
    fcmToken: 'fcm_token',
  };

  Object.entries(map).forEach(([key, column]) => {
    if (updates[key] !== undefined) {
      fields.push(`${column} = $${i}`);
      values.push(updates[key] === '' ? null : updates[key]);
      i += 1;
    }
  });

  if (!fields.length) {
    throw new ValidationError('No fields to update');
  }

  values.push(userId);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${i}
     RETURNING id, full_name, phone, email, role, language, is_active, created_at`,
    values
  );

  if (!rows.length) throw new NotFoundError('User not found');
  return sanitizeUser(rows[0]);
}

async function changePassword(userId, currentPassword, newPassword) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows.length) throw new NotFoundError('User not found');

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) throw new UnauthorizedError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  return { message: 'Password updated' };
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  sanitizeUser,
};

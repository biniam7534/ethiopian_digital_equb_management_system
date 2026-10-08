/**
 * Global Express error handler.
 */
const { AppError } = require('../utils/errors');
const env = require('../config/env');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational || statusCode >= 500) {
    console.error('[error]', err);
  }

  const payload = {
    success: false,
    message,
    code,
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (!env.isProd && !err.isOperational) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};

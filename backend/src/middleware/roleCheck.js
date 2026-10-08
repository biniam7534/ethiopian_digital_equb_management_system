/**
 * Role-based access control middleware factory.
 */
const { ForbiddenError } = require('../utils/errors');

/**
 * @param {...string} roles Allowed roles (e.g. 'admin', 'organizer')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    return next();
  };
}

module.exports = {
  requireRole,
};

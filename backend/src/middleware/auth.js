const { verifyToken } = require('../utils/jwt');
const { query } = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return unauthorized(res, 'Invalid or expired token');
    }

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.is_active,
              r.name AS role, r.id AS role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (!result.rows.length) {
      return unauthorized(res, 'User not found');
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return unauthorized(res, 'Account is deactivated');
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return unauthorized(res, 'Authentication failed');
  }
};

// Usage: authorize('admin', 'receptionist')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res);
    }
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required roles: ${roles.join(', ')}`);
    }
    next();
  };
};

module.exports = { authenticate, authorize };

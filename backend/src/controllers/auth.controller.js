const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { generateToken } = require('../utils/jwt');
const { success, unauthorized, badRequest } = require('../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.password_hash, u.is_active, u.phone,
              r.name AS role, r.id AS role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return unauthorized(res, 'Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return unauthorized(res, 'Account deactivated. Contact administrator.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Check if doctor and get doctor_id
    let doctorId = null;
    if (user.role === 'doctor') {
      const docRes = await query(`SELECT id FROM doctors WHERE user_id = $1`, [user.id]);
      if (docRes.rows.length) doctorId = docRes.rows[0].id;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const userData = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
      roleId: user.role_id,
      phone: user.phone,
      doctorId,
    };

    return success(res, { token, user: userData }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
              r.name AS role, r.id AS role_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return unauthorized(res, 'User not found');
    }

    const user = result.rows[0];
    let doctorInfo = null;
    if (user.role === 'doctor') {
      const docRes = await query(`SELECT * FROM doctors WHERE user_id = $1`, [user.id]);
      if (docRes.rows.length) doctorInfo = docRes.rows[0];
    }

    return success(res, {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      roleId: user.role_id,
      isActive: user.is_active,
      createdAt: user.created_at,
      doctor: doctorInfo,
    });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await query(`SELECT password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (!result.rows.length) return unauthorized(res);

    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) return badRequest(res, 'Current password is incorrect');

    const bcrypt2 = require('bcryptjs');
    const { bcryptRounds } = require('../config/app');
    const newHash = await bcrypt2.hash(newPassword, bcryptRounds);

    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, req.user.id]
    );

    return success(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getCurrentUser, changePassword };

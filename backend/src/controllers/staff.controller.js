const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { bcryptRounds } = require('../config/app');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

const listStaff = async (req, res, next) => {
  try {
    const { role, search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
 let where = 'WHERE u.is_active = true';

    if (role) {
      params.push(role);
      where += ` AND r.name = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    const countRes = await query(`SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id ${where}`, params);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, u.created_at,
              r.name AS role,
              d.id AS doctor_id, d.specialty, d.license_number, d.consultation_fee
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN doctors d ON d.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, u.created_at,
              r.name AS role, r.id AS role_id,
              d.id AS doctor_id, d.specialty, d.license_number, d.qualification,
              d.years_experience, d.consultation_fee, d.available_days, d.available_from, d.available_to
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN doctors d ON d.user_id = u.id
       WHERE u.id = $1`,
      [id]
    );
    if (!result.rows.length) return notFound(res, 'Staff not found');
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createStaff = async (req, res, next) => {
  try {
    const {
      firstName, lastName, email, password, phone, roleName,
      specialty, licenseNumber, qualification, yearsExperience,
      consultationFee, availableDays, availableFrom, availableTo,
    } = req.body;

    const roleRes = await query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
    if (!roleRes.rows.length) return badRequest(res, `Role '${roleName}' not found`);
    const roleId = roleRes.rows[0].id;

    const hash = await bcrypt.hash(password, bcryptRounds);

   let passwordHash = null;

if (password && password.trim() !== '') {
  passwordHash = await bcrypt.hash(password, bcryptRounds);
}
    
const userRes = await query(
  `UPDATE users SET
    first_name = COALESCE($1, first_name),
    last_name = COALESCE($2, last_name),
    email = COALESCE($3, email),
    phone = COALESCE($4, phone),
    role_id = COALESCE($5, role_id),
    password_hash = COALESCE($6, password_hash),
    is_active = COALESCE($7, is_active),
    updated_at = NOW()
   WHERE id = $8
   RETURNING *`,
  [
    firstName,
    lastName,
    email,
    phone,
    roleId,
    passwordHash,
    isActive !== undefined ? isActive : null,
    id,
  ]
);    const user = userRes.rows[0];

    let doctor = null;
    if (roleName === 'doctor') {
      if (!specialty) return badRequest(res, 'Specialty required for doctors');
      const docRes = await query(
        `INSERT INTO doctors (user_id, specialty, license_number, qualification, years_experience, consultation_fee, available_days, available_from, available_to)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          user.id,
          specialty,
          licenseNumber || null,
          qualification || null,
          yearsExperience || 0,
          consultationFee || 0,
          availableDays || 'Mon,Tue,Wed,Thu,Fri',
          availableFrom || '08:00',
          availableTo || '17:00',
        ]
      );
      doctor = docRes.rows[0];
    }

    return created(res, { user: { ...user, password_hash: undefined }, doctor }, 'Staff created');
  } catch (err) {
    next(err);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
  firstName,
  lastName,
  email,
  password,
  roleName,
  phone,
  isActive,
      specialty, licenseNumber, qualification, yearsExperience,
      consultationFee, availableDays, availableFrom, availableTo,
    } = req.body;

    const existing = await query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Staff not found');

    const userRes = await query(
      `UPDATE users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [firstName, lastName, phone, id]
    );

    // Update doctor record if provided
    const docExists = await query(`SELECT id FROM doctors WHERE user_id = $1`, [id]);
    if (docExists.rows.length && specialty !== undefined) {
      await query(
        `UPDATE doctors SET
          specialty = COALESCE($1, specialty),
          license_number = COALESCE($2, license_number),
          qualification = COALESCE($3, qualification),
          years_experience = COALESCE($4, years_experience),
          consultation_fee = COALESCE($5, consultation_fee),
          available_days = COALESCE($6, available_days),
          available_from = COALESCE($7, available_from),
          available_to = COALESCE($8, available_to),
          updated_at = NOW()
         WHERE user_id = $9`,
        [specialty, licenseNumber, qualification, yearsExperience, consultationFee, availableDays, availableFrom, availableTo, id]
      );
    }

    return success(res, userRes.rows[0], 'Staff updated');
  } catch (err) {
    next(err);
  }
};

const listDoctors = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active,
              d.id AS doctor_id, d.specialty, d.consultation_fee, d.available_days,
              d.available_from, d.available_to, d.years_experience
       FROM users u
       JOIN doctors d ON d.user_id = u.id
       WHERE u.is_active = true
       ORDER BY u.first_name`
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const getRoles = async (req, res, next) => {
  try {
    const result = await query(`SELECT id, name, description FROM roles ORDER BY name`);
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
};


const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query(`SELECT id FROM users WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Staff not found');

    await query(`DELETE FROM doctors WHERE user_id = $1`, [id]);

    await query(`DELETE FROM users WHERE id = $1`, [id]);

    return success(res, null, 'Staff deleted permanently');
  } catch (err) {
    next(err);
  }
};module.exports = {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  listDoctors,
  getRoles,
  deleteStaff,
};

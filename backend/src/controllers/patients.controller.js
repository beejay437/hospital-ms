const { query } = require('../config/database');
const { generatePatientNumber } = require('../utils/generators');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

/**
 * LIST PATIENTS
 */
const listPatients = async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20, active } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (p.first_name ILIKE $${params.length} OR p.last_name ILIKE $${params.length} OR p.patient_number ILIKE $${params.length} OR p.phone ILIKE $${params.length})`;
    }

    if (active !== undefined) {
      params.push(active === 'true');
      whereClause += ` AND p.is_active = $${params.length}`;
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM patients p ${whereClause}`,
      params
    );

    params.push(limit, offset);

    const dataRes = await query(
      `SELECT p.id, p.patient_number, p.first_name, p.last_name, p.date_of_birth,
              p.gender, p.blood_group, p.phone, p.email, p.is_active, p.created_at,
              EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age
       FROM patients p
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

/**
 * GET SINGLE PATIENT
 */
const getPatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT p.*,
              EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age,
              u.first_name AS registered_by_first, u.last_name AS registered_by_last
       FROM patients p
       LEFT JOIN users u ON p.registered_by = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (!result.rows.length) return notFound(res, 'Patient not found');

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * REGISTER PATIENT
 */
const registerPatient = async (req, res, next) => {
  try {
    const {
      firstName, lastName, dateOfBirth, gender, bloodGroup,
      phone, email, address,
      emergencyContactName, emergencyContactPhone,
      allergies, notes,
    } = req.body;

    const patientNumber = await generatePatientNumber();

    const result = await query(
      `INSERT INTO patients (
        patient_number, first_name, last_name, date_of_birth, gender, blood_group,
        phone, email, address, emergency_contact_name, emergency_contact_phone,
        allergies, notes, registered_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        patientNumber, firstName, lastName, dateOfBirth || null, gender || null, bloodGroup || null,
        phone || null, email || null, address || null,
        emergencyContactName || null, emergencyContactPhone || null,
        allergies || null, notes || null, req.user.id,
      ]
    );

    return created(res, result.rows[0], 'Patient registered successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE PATIENT
 */
const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query(`SELECT id FROM patients WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Patient not found');

    const {
      firstName, lastName, dateOfBirth, gender, bloodGroup,
      phone, email, address,
      emergencyContactName, emergencyContactPhone,
      allergies, notes, isActive,
    } = req.body;

    const result = await query(
      `UPDATE patients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        blood_group = COALESCE($5, blood_group),
        phone = COALESCE($6, phone),
        email = COALESCE($7, email),
        address = COALESCE($8, address),
        emergency_contact_name = COALESCE($9, emergency_contact_name),
        emergency_contact_phone = COALESCE($10, emergency_contact_phone),
        allergies = COALESCE($11, allergies),
        notes = COALESCE($12, notes),
        is_active = COALESCE($13, is_active),
        updated_at = NOW()
      WHERE id = $14
      RETURNING *`,
      [
        firstName, lastName, dateOfBirth, gender, bloodGroup,
        phone, email, address,
        emergencyContactName, emergencyContactPhone,
        allergies, notes,
        isActive !== undefined ? isActive : null,
        id,
      ]
    );

    return success(res, result.rows[0], 'Patient updated');
  } catch (err) {
    next(err);
  }
};

/**
 * PATIENT HISTORY
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exists = await query(`SELECT id FROM patients WHERE id = $1`, [id]);
    if (!exists.rows.length) return notFound(res, 'Patient not found');

    const [appointments, records, admissions, vitals, invoices] = await Promise.all([
      query(`SELECT * FROM appointments WHERE patient_id = $1 ORDER BY appointment_date DESC LIMIT 20`, [id]),
      query(`SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY visit_date DESC LIMIT 20`, [id]),
      query(`SELECT * FROM admissions WHERE patient_id = $1 ORDER BY admission_date DESC`, [id]),
      query(`SELECT * FROM vital_signs WHERE patient_id = $1 ORDER BY recorded_at DESC LIMIT 10`, [id]),
      query(`SELECT * FROM invoices WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
    ]);

    return success(res, {
      appointments: appointments.rows,
      medicalRecords: records.rows,
      admissions: admissions.rows,
      vitalSigns: vitals.rows,
      invoices: invoices.rows,
    });
  } catch (err) {
    next(err);
  }
};
const deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if patient exists
    const existing = await query(
      `SELECT id FROM patients WHERE id = $1`,
      [id]
    );

    if (!existing.rows.length) {
      return notFound(res, 'Patient not found');
    }

    // Soft delete (DO NOT remove from DB)
    await query(`DELETE FROM patients WHERE id = $1`, [id]);

    return success(res, null, 'Patient removed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPatients,
  getPatient,
  registerPatient,
  updatePatient,
  deletePatient,
  getPatientHistory,
};
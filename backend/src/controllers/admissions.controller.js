const { query } = require('../config/database');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

const listAdmissions = async (req, res, next) => {
  try {
    const { status = 'active', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [status, limit, offset];

    const countRes = await query(
      `SELECT COUNT(*) FROM admissions WHERE status = $1`, [status]
    );

    const dataRes = await query(
      `SELECT ad.id, ad.admission_date, ad.expected_discharge_date, ad.actual_discharge_date,
              ad.status, ad.reason,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number,
              w.name AS ward_name, b.bed_number, b.bed_type,
              u.first_name || ' ' || u.last_name AS doctor_name
       FROM admissions ad
       JOIN patients p ON ad.patient_id = p.id
       JOIN beds b ON ad.bed_id = b.id
       JOIN wards w ON b.ward_id = w.id
       LEFT JOIN doctors d ON ad.admitting_doctor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE ad.status = $1
       ORDER BY ad.admission_date DESC
       LIMIT $2 OFFSET $3`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getAdmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT ad.*,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number, p.phone,
              w.name AS ward_name, b.bed_number, b.bed_type,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty,
              adm.first_name || ' ' || adm.last_name AS admitted_by_name
       FROM admissions ad
       JOIN patients p ON ad.patient_id = p.id
       JOIN beds b ON ad.bed_id = b.id
       JOIN wards w ON b.ward_id = w.id
       LEFT JOIN doctors d ON ad.admitting_doctor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN users adm ON ad.admitted_by = adm.id
       WHERE ad.id = $1`,
      [id]
    );
    if (!result.rows.length) return notFound(res, 'Admission not found');
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const admitPatient = async (req, res, next) => {
  try {
    const { patientId, bedId, admittingDoctorId, reason, expectedDischargeDate } = req.body;

    // Verify patient exists
    const patRes = await query(`SELECT id FROM patients WHERE id = $1 AND is_active = true`, [patientId]);
    if (!patRes.rows.length) return notFound(res, 'Patient not found');

    // Check bed availability
    const bedRes = await query(`SELECT id, status FROM beds WHERE id = $1`, [bedId]);
    if (!bedRes.rows.length) return notFound(res, 'Bed not found');
    if (bedRes.rows[0].status !== 'available') {
      return badRequest(res, 'Selected bed is not available');
    }

    // Check patient not already admitted
    const activeAdm = await query(
      `SELECT id FROM admissions WHERE patient_id = $1 AND status = 'active'`,
      [patientId]
    );
    if (activeAdm.rows.length) {
      return badRequest(res, 'Patient is already admitted');
    }

    const result = await query(
      `INSERT INTO admissions (patient_id, bed_id, admitted_by, admitting_doctor_id, reason, expected_discharge_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [patientId, bedId, req.user.id, admittingDoctorId || null, reason, expectedDischargeDate || null]
    );

    // Mark bed as occupied
    await query(`UPDATE beds SET status = 'occupied' WHERE id = $1`, [bedId]);

    return created(res, result.rows[0], 'Patient admitted successfully');
  } catch (err) {
    next(err);
  }
};

const dischargePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dischargeSummary } = req.body;

    const admission = await query(`SELECT * FROM admissions WHERE id = $1`, [id]);
    if (!admission.rows.length) return notFound(res, 'Admission not found');
    if (admission.rows[0].status === 'discharged') {
      return badRequest(res, 'Patient is already discharged');
    }

    const bedId = admission.rows[0].bed_id;

    const result = await query(
      `UPDATE admissions SET
        status = 'discharged',
        actual_discharge_date = NOW(),
        discharge_summary = $1,
        updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [dischargeSummary || null, id]
    );

    // Free the bed
    await query(`UPDATE beds SET status = 'available' WHERE id = $1`, [bedId]);

    return success(res, result.rows[0], 'Patient discharged successfully');
  } catch (err) {
    next(err);
  }
};

const listWards = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.id, w.name, w.description, w.total_beds,
              COUNT(b.id) FILTER (WHERE b.status = 'available') AS available_beds,
              COUNT(b.id) FILTER (WHERE b.status = 'occupied') AS occupied_beds,
              COUNT(b.id) FILTER (WHERE b.status = 'maintenance') AS maintenance_beds
       FROM wards w
       LEFT JOIN beds b ON b.ward_id = w.id
       GROUP BY w.id ORDER BY w.name`
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
};

const listBeds = async (req, res, next) => {
  try {
    const { wardId, status } = req.query;
    const params = [];
    let where = 'WHERE 1=1';

    if (wardId) { params.push(wardId); where += ` AND b.ward_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND b.status = $${params.length}`; }

    const result = await query(
      `SELECT b.id, b.bed_number, b.bed_type, b.status, w.name AS ward_name, w.id AS ward_id
       FROM beds b JOIN wards w ON b.ward_id = w.id
       ${where} ORDER BY w.name, b.bed_number`,
      params
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { listAdmissions, getAdmission, admitPatient, dischargePatient, listWards, listBeds };

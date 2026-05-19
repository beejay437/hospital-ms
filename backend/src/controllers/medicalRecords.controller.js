const { query } = require('../config/database');
const { success, created, notFound, badRequest } = require('../utils/response');

const createRecord = async (req, res, next) => {
  try {
    const {
      patientId, appointmentId, visitDate,
      chiefComplaint, diagnosis, treatmentPlan, consultationNotes, followUpDate,
    } = req.body;

    // Get doctor_id from logged-in user
   let doctorId = null;

const docRes = await query(`SELECT id FROM doctors WHERE user_id = $1`, [req.user.id]);

if (docRes.rows.length) {
  doctorId = docRes.rows[0].id;
} else if (req.user.role === 'admin') {
  const anyDoctor = await query(`SELECT id FROM doctors ORDER BY created_at ASC LIMIT 1`);

  if (!anyDoctor.rows.length) {
    return badRequest(res, 'Please create at least one doctor before creating medical records as admin');
  }

  doctorId = anyDoctor.rows[0].id;
} else {
  return badRequest(res, 'Only doctors can create medical records');
}
    const result = await query(
      `INSERT INTO medical_records (patient_id, appointment_id, doctor_id, visit_date, chief_complaint, diagnosis, treatment_plan, consultation_notes, follow_up_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [patientId, appointmentId || null, doctorId, visitDate || new Date().toISOString().split('T')[0],
       chiefComplaint || null, diagnosis || null, treatmentPlan || null, consultationNotes || null, followUpDate || null]
    );

    // Mark appointment as completed if linked
    if (appointmentId) {
      await query(`UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = $1`, [appointmentId]);
    }

    return created(res, result.rows[0], 'Medical record created');
  } catch (err) {
    next(err);
  }
};

const getRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT mr.*,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN doctors d ON mr.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE mr.id = $1`,
      [id]
    );
    if (!result.rows.length) return notFound(res, 'Medical record not found');

    // Get prescriptions for this record
    const prescriptions = await query(
      `SELECT * FROM prescriptions WHERE medical_record_id = $1 ORDER BY created_at`,
      [id]
    );

    // Get vital signs
    const vitals = await query(
      `SELECT * FROM vital_signs WHERE medical_record_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [id]
    );

    return success(res, {
      ...result.rows[0],
      prescriptions: prescriptions.rows,
      vitalSigns: vitals.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

const updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { chiefComplaint, diagnosis, treatmentPlan, consultationNotes, followUpDate } = req.body;

    const existing = await query(`SELECT id FROM medical_records WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Medical record not found');

    const result = await query(
      `UPDATE medical_records SET
        chief_complaint = COALESCE($1, chief_complaint),
        diagnosis = COALESCE($2, diagnosis),
        treatment_plan = COALESCE($3, treatment_plan),
        consultation_notes = COALESCE($4, consultation_notes),
        follow_up_date = COALESCE($5, follow_up_date),
        updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [chiefComplaint, diagnosis, treatmentPlan, consultationNotes, followUpDate, id]
    );

    return success(res, result.rows[0], 'Record updated');
  } catch (err) {
    next(err);
  }
};

const addPrescription = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { medicineName, dosage, frequency, duration, instructions } = req.body;

    const recRes = await query(`SELECT patient_id, doctor_id FROM medical_records WHERE id = $1`, [recordId]);
    if (!recRes.rows.length) return notFound(res, 'Medical record not found');
    const { patient_id, doctor_id } = recRes.rows[0];

    const result = await query(
      `INSERT INTO prescriptions (medical_record_id, patient_id, doctor_id, medicine_name, dosage, frequency, duration, instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [recordId, patient_id, doctor_id, medicineName, dosage || null, frequency || null, duration || null, instructions || null]
    );

    return created(res, result.rows[0], 'Prescription added');
  } catch (err) {
    next(err);
  }
};

const recordVitals = async (req, res, next) => {
  try {
    const {
      patientId, medicalRecordId,
      temperature, temperatureUnit,
      bloodPressureSystolic, bloodPressureDiastolic,
      pulseRate, respiratoryRate, oxygenSaturation,
      weight, height,
    } = req.body;

    let bmi = null;
    if (weight && height) {
      const heightM = height / 100;
      bmi = (weight / (heightM * heightM)).toFixed(2);
    }

    const result = await query(
      `INSERT INTO vital_signs (patient_id, medical_record_id, recorded_by, temperature, temperature_unit,
        blood_pressure_systolic, blood_pressure_diastolic, pulse_rate, respiratory_rate,
        oxygen_saturation, weight, height, bmi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        patientId, medicalRecordId || null, req.user.id,
        temperature || null, temperatureUnit || 'C',
        bloodPressureSystolic || null, bloodPressureDiastolic || null,
        pulseRate || null, respiratoryRate || null, oxygenSaturation || null,
        weight || null, height || null, bmi,
      ]
    );

    return created(res, result.rows[0], 'Vitals recorded');
  } catch (err) {
    next(err);
  }
};

module.exports = { createRecord, getRecord, updateRecord, addPrescription, recordVitals };

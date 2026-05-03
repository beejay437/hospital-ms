const { query } = require('../config/database');
const { success, created, notFound, badRequest, paginate } = require('../utils/response');

const listAppointments = async (req, res, next) => {
  try {
    const { date, doctorId, patientId, status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let where = 'WHERE 1=1';

    if (date) { params.push(date); where += ` AND a.appointment_date = $${params.length}`; }
    if (doctorId) { params.push(doctorId); where += ` AND a.doctor_id = $${params.length}`; }
    if (patientId) { params.push(patientId); where += ` AND a.patient_id = $${params.length}`; }
    if (status) { params.push(status); where += ` AND a.status = $${params.length}`; }

    // Doctors only see their own appointments
    if (req.user.role === 'doctor') {
      const docRes = await query(`SELECT id FROM doctors WHERE user_id = $1`, [req.user.id]);
      if (docRes.rows.length) {
        params.push(docRes.rows[0].id);
        where += ` AND a.doctor_id = $${params.length}`;
      }
    }

    const countRes = await query(
      `SELECT COUNT(*) FROM appointments a ${where}`,
      params
    );

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT a.*,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       ${where}
       ORDER BY a.appointment_date DESC, a.appointment_time ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return paginate(res, dataRes.rows, parseInt(countRes.rows[0].count), page, limit);
  } catch (err) {
    next(err);
  }
};

const getAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.*,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_number, p.phone AS patient_phone, p.date_of_birth,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );
    if (!result.rows.length) return notFound(res, 'Appointment not found');
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const createAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, appointmentDate, appointmentTime, durationMinutes = 30, reason, notes } = req.body;

    // Check patient exists
    const patRes = await query(`SELECT id FROM patients WHERE id = $1 AND is_active = true`, [patientId]);
    if (!patRes.rows.length) return notFound(res, 'Patient not found');

    // Check doctor exists
    const docRes = await query(`SELECT id FROM doctors WHERE id = $1`, [doctorId]);
    if (!docRes.rows.length) return notFound(res, 'Doctor not found');

    // Double-booking check
    const conflict = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
       AND status NOT IN ('cancelled','no_show')`,
      [doctorId, appointmentDate, appointmentTime]
    );
    if (conflict.rows.length) {
      return badRequest(res, 'This time slot is already booked for the selected doctor');
    }

    const result = await query(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, reason, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [patientId, doctorId, appointmentDate, appointmentTime, durationMinutes, reason || null, notes || null, req.user.id]
    );

    return created(res, result.rows[0], 'Appointment created');
  } catch (err) {
    next(err);
  }
};

const updateAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { appointmentDate, appointmentTime, durationMinutes, status, reason, notes, doctorId } = req.body;

    const existing = await query(`SELECT * FROM appointments WHERE id = $1`, [id]);
    if (!existing.rows.length) return notFound(res, 'Appointment not found');
    const appt = existing.rows[0];

    // If changing time/doctor, re-check double booking
    const newDate = appointmentDate || appt.appointment_date;
    const newTime = appointmentTime || appt.appointment_time;
    const newDoctor = doctorId || appt.doctor_id;

    if (appointmentDate || appointmentTime || doctorId) {
      const conflict = await query(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
         AND status NOT IN ('cancelled','no_show') AND id != $4`,
        [newDoctor, newDate, newTime, id]
      );
      if (conflict.rows.length) {
        return badRequest(res, 'That time slot is already booked for the selected doctor');
      }
    }

    const result = await query(
      `UPDATE appointments SET
        appointment_date = COALESCE($1, appointment_date),
        appointment_time = COALESCE($2, appointment_time),
        duration_minutes = COALESCE($3, duration_minutes),
        status = COALESCE($4, status),
        reason = COALESCE($5, reason),
        notes = COALESCE($6, notes),
        doctor_id = COALESCE($7, doctor_id),
        updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [appointmentDate, appointmentTime, durationMinutes, status, reason, notes, doctorId, id]
    );

    return success(res, result.rows[0], 'Appointment updated');
  } catch (err) {
    next(err);
  }
};

const getDoctorSchedule = async (req, res, next) => {
  try {
    const { doctorId, date } = req.params;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT a.id, a.appointment_time, a.duration_minutes, a.status, a.reason,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.doctor_id = $1 AND a.appointment_date = $2
       ORDER BY a.appointment_time`,
      [doctorId, targetDate]
    );

    const docRes = await query(
      `SELECT u.first_name || ' ' || u.last_name AS name, d.specialty, d.available_from, d.available_to
       FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = $1`,
      [doctorId]
    );

    return success(res, {
      doctor: docRes.rows[0] || null,
      date: targetDate,
      appointments: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAppointments, getAppointment, createAppointment, updateAppointment, getDoctorSchedule };

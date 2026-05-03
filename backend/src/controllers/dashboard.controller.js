const { query } = require('../config/database');
const { success } = require('../utils/response');

const getSummary = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [
      totalPatients,
      todayAppointments,
      activeAdmissions,
      availableBeds,
      lowStockCount,
      monthRevenue,
      recentPatients,
      appointmentsByStatus,
      revenueByDay,
    ] = await Promise.all([
      query(`SELECT COUNT(*) AS count FROM patients WHERE is_active = true`),
      query(`SELECT COUNT(*) AS count FROM appointments WHERE appointment_date = $1 AND status != 'cancelled'`, [today]),
      query(`SELECT COUNT(*) AS count FROM admissions WHERE status = 'active'`),
      query(`SELECT COUNT(*) AS count FROM beds WHERE status = 'available'`),
      query(`SELECT COUNT(*) AS count FROM medicines WHERE current_stock <= reorder_level AND is_active = true`),
      query(`SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE payment_date >= $1`, [thisMonthStart]),
      query(
        `SELECT id, patient_number, first_name, last_name, phone, created_at
         FROM patients ORDER BY created_at DESC LIMIT 5`
      ),
      query(
        `SELECT status, COUNT(*) AS count FROM appointments
         WHERE appointment_date = $1 GROUP BY status`, [today]
      ),
      query(
        `SELECT DATE(payment_date) AS date, SUM(amount) AS total
         FROM payments
         WHERE payment_date >= $1
         GROUP BY DATE(payment_date)
         ORDER BY date`, [thisMonthStart]
      ),
    ]);

    // Today's appointments list
    const todayApptList = await query(
      `SELECT a.id, a.appointment_time, a.status, a.reason,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number,
              u.first_name || ' ' || u.last_name AS doctor_name, d.specialty
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE a.appointment_date = $1 AND a.status != 'cancelled'
       ORDER BY a.appointment_time
       LIMIT 10`,
      [today]
    );

    // Active admissions list
    const admissionsList = await query(
      `SELECT ad.id, ad.admission_date, ad.reason,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_number,
              w.name AS ward_name, b.bed_number
       FROM admissions ad
       JOIN patients p ON ad.patient_id = p.id
       JOIN beds b ON ad.bed_id = b.id
       JOIN wards w ON b.ward_id = w.id
       WHERE ad.status = 'active'
       ORDER BY ad.admission_date DESC
       LIMIT 5`
    );

    // Low stock medicines
    const lowStockList = await query(
      `SELECT id, name, current_stock, reorder_level, unit
       FROM medicines
       WHERE current_stock <= reorder_level AND is_active = true
       ORDER BY current_stock ASC
       LIMIT 10`
    );

    return success(res, {
      stats: {
        totalPatients: parseInt(totalPatients.rows[0].count),
        todayAppointments: parseInt(todayAppointments.rows[0].count),
        activeAdmissions: parseInt(activeAdmissions.rows[0].count),
        availableBeds: parseInt(availableBeds.rows[0].count),
        lowStockMedicines: parseInt(lowStockCount.rows[0].count),
        monthRevenue: parseFloat(monthRevenue.rows[0].total),
      },
      recentPatients: recentPatients.rows,
      todayAppointments: todayApptList.rows,
      activeAdmissions: admissionsList.rows,
      lowStockAlerts: lowStockList.rows,
      appointmentsByStatus: appointmentsByStatus.rows,
      revenueByDay: revenueByDay.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary };

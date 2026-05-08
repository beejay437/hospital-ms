const { query } = require('../config/database');

const generatePatientNumber = async () => {
  try {
    const result = await query(`
      SELECT patient_number
      FROM patients
      WHERE patient_number LIKE 'PAT-%'
      ORDER BY id DESC
      LIMIT 1
    `);

    let nextNumber = 1;

    if (result.rows.length) {
      const last = result.rows[0].patient_number; // PAT-000003
      const lastNum = parseInt(last.replace('PAT-', ''), 10);
      nextNumber = lastNum + 1;
    }

    return `PAT-${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating patient number:', error);
    throw new Error('Failed to generate patient number');
  }
};

module.exports = {
  generatePatientNumber,
};

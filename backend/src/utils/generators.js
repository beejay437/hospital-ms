const pool = require('../config/database');

/**
 * Generates a safe unique patient number.
 * Example: PAT-000001, PAT-000002, PAT-000003
 */
const generatePatientNumber = async () => {
  try {
    const result = await pool.query(`
      SELECT nextval('patient_number_seq') AS number
    `);

    const nextNumber = result.rows[0].number;

    return `PAT-${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating patient number:', error);
    throw new Error('Failed to generate patient number');
  }
};

module.exports = {
  generatePatientNumber,
};
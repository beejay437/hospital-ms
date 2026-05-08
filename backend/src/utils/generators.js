const pool = require('../config/database');

/**
 * Generate Patient Number
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

/**
 * Generate Invoice Number
 */
const generateInvoiceNumber = async () => {
  try {
    const result = await pool.query(`
      SELECT nextval('invoice_number_seq') AS number
    `);

    const nextNumber = result.rows[0].number;

    return `INV-${String(nextNumber).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw new Error('Failed to generate invoice number');
  }
};

module.exports = {
  generatePatientNumber,
  generateInvoiceNumber,
};

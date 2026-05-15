const { query } = require('../config/database');

async function clearPharmacy() {
  try {
    console.log('Clearing pharmacy data...');

    await query('DELETE FROM inventory_transactions');
    await query('DELETE FROM medicines');

    console.log('✅ Pharmacy drugs cleared successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear pharmacy:', err.message);
    process.exit(1);
  }
}

clearPharmacy();
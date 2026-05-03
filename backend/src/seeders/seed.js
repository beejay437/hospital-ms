require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { bcryptRounds } = require('../config/app');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // ── Roles ─────────────────────────────────────────────────────────────────
    console.log('  → Seeding roles...');
    const roles = [
      { name: 'admin', description: 'Full system access' },
      { name: 'receptionist', description: 'Manage patients and appointments' },
      { name: 'doctor', description: 'Access appointments, records and notes' },
      { name: 'nurse', description: 'Manage vitals and admissions' },
      { name: 'pharmacist', description: 'Manage medicines and stock' },
      { name: 'billing_officer', description: 'Manage invoices and payments' },
    ];

    const roleIds = {};
    for (const role of roles) {
      const res = await client.query(
        `INSERT INTO roles (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [role.name, role.description]
      );
      roleIds[res.rows[0].name] = res.rows[0].id;
      console.log(`     ✓ Role: ${role.name}`);
    }

    // ── Admin User ────────────────────────────────────────────────────────────
    console.log('  → Seeding admin user...');
    const adminPassword = await bcrypt.hash('Admin@1234', bcryptRounds);
    const adminResult = await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         password_hash = EXCLUDED.password_hash
       RETURNING id, email`,
      [roleIds['admin'], 'System', 'Admin', 'admin@hospital.com', adminPassword, '+1-000-000-0000', true]
    );
    console.log(`     ✓ Admin: ${adminResult.rows[0].email} / password: Admin@1234`);

    // ── Sample Doctor User ────────────────────────────────────────────────────
    console.log('  → Seeding sample doctor...');
    const doctorPassword = await bcrypt.hash('Doctor@1234', bcryptRounds);
    const doctorUserRes = await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
       RETURNING id`,
      [roleIds['doctor'], 'Sarah', 'Johnson', 'sarah.johnson@hospital.com', doctorPassword, '+1-555-100-2000', true]
    );
    const doctorUserId = doctorUserRes.rows[0].id;

    const doctorRes = await client.query(
      `INSERT INTO doctors (user_id, specialty, license_number, qualification, years_experience, consultation_fee)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE SET specialty = EXCLUDED.specialty
       RETURNING id`,
      [doctorUserId, 'General Medicine', 'LIC-GM-001', 'MBBS, MD', 8, 5000]
    );
    console.log(`     ✓ Doctor: sarah.johnson@hospital.com / password: Doctor@1234`);

    // ── Sample Receptionist ───────────────────────────────────────────────────
    console.log('  → Seeding sample receptionist...');
    const receptionistPassword = await bcrypt.hash('Recept@1234', bcryptRounds);
    await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
       RETURNING id`,
      [roleIds['receptionist'], 'Alice', 'Brown', 'alice.brown@hospital.com', receptionistPassword, '+1-555-100-3000', true]
    );
    console.log(`     ✓ Receptionist: alice.brown@hospital.com / password: Recept@1234`);

    // ── Sample Billing Officer ────────────────────────────────────────────────
    const billingPassword = await bcrypt.hash('Billing@1234', bcryptRounds);
    await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name`,
      [roleIds['billing_officer'], 'Michael', 'Smith', 'michael.smith@hospital.com', billingPassword, '+1-555-100-4000', true]
    );
    console.log(`     ✓ Billing Officer: michael.smith@hospital.com / password: Billing@1234`);

    // ── Sample Pharmacist ─────────────────────────────────────────────────────
    const pharmacistPassword = await bcrypt.hash('Pharma@1234', bcryptRounds);
    await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name`,
      [roleIds['pharmacist'], 'Emma', 'Davis', 'emma.davis@hospital.com', pharmacistPassword, '+1-555-100-5000', true]
    );
    console.log(`     ✓ Pharmacist: emma.davis@hospital.com / password: Pharma@1234`);

    // ── Sample Nurse ──────────────────────────────────────────────────────────
    const nursePassword = await bcrypt.hash('Nurse@1234', bcryptRounds);
    await client.query(
      `INSERT INTO users (role_id, first_name, last_name, email, password_hash, phone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name`,
      [roleIds['nurse'], 'Grace', 'Wilson', 'grace.wilson@hospital.com', nursePassword, '+1-555-100-6000', true]
    );
    console.log(`     ✓ Nurse: grace.wilson@hospital.com / password: Nurse@1234`);

    // ── Wards & Beds ──────────────────────────────────────────────────────────
    console.log('  → Seeding wards and beds...');
    const wards = [
      { name: 'General Ward A', description: 'Standard general ward', total_beds: 10 },
      { name: 'General Ward B', description: 'Standard general ward', total_beds: 10 },
      { name: 'ICU', description: 'Intensive Care Unit', total_beds: 6 },
      { name: 'Maternity Ward', description: 'Maternity and gynecology ward', total_beds: 8 },
      { name: 'Pediatric Ward', description: 'Children ward', total_beds: 8 },
    ];

    for (const ward of wards) {
      const wardRes = await client.query(
        `INSERT INTO wards (name, description, total_beds)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
         RETURNING id, name`,
        [ward.name, ward.description, ward.total_beds]
      );
      const wardId = wardRes.rows[0].id;

      const bedType = ward.name === 'ICU' ? 'icu' : 'general';
      for (let i = 1; i <= ward.total_beds; i++) {
        const bedNumber = `${ward.name.replace(/\s/g, '').substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`;
        await client.query(
          `INSERT INTO beds (ward_id, bed_number, bed_type, status)
           VALUES ($1, $2, $3, 'available')
           ON CONFLICT (ward_id, bed_number) DO NOTHING`,
          [wardId, bedNumber, bedType]
        );
      }
      console.log(`     ✓ Ward: ${ward.name} (${ward.total_beds} beds)`);
    }

    // ── Sample Medicines ──────────────────────────────────────────────────────
    console.log('  → Seeding medicines...');
    const medicines = [
      { name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', category: 'Analgesic', unit: 'tablet', unit_price: 5, reorder_level: 100, current_stock: 500 },
      { name: 'Amoxicillin 250mg', generic_name: 'Amoxicillin', category: 'Antibiotic', unit: 'capsule', unit_price: 15, reorder_level: 50, current_stock: 200 },
      { name: 'Metformin 500mg', generic_name: 'Metformin HCl', category: 'Antidiabetic', unit: 'tablet', unit_price: 8, reorder_level: 50, current_stock: 300 },
      { name: 'Lisinopril 10mg', generic_name: 'Lisinopril', category: 'Antihypertensive', unit: 'tablet', unit_price: 20, reorder_level: 30, current_stock: 8 },
      { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', category: 'NSAID', unit: 'tablet', unit_price: 10, reorder_level: 100, current_stock: 5 },
      { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', category: 'Antacid', unit: 'capsule', unit_price: 25, reorder_level: 40, current_stock: 150 },
      { name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin', category: 'Statin', unit: 'tablet', unit_price: 30, reorder_level: 30, current_stock: 120 },
      { name: 'Normal Saline 500ml', generic_name: 'Sodium Chloride 0.9%', category: 'IV Fluid', unit: 'bag', unit_price: 200, reorder_level: 20, current_stock: 80 },
      { name: 'Dextrose 5% 500ml', generic_name: 'Dextrose 5%', category: 'IV Fluid', unit: 'bag', unit_price: 250, reorder_level: 20, current_stock: 3 },
      { name: 'Cetirizine 10mg', generic_name: 'Cetirizine HCl', category: 'Antihistamine', unit: 'tablet', unit_price: 12, reorder_level: 50, current_stock: 200 },
    ];

    for (const med of medicines) {
      await client.query(
        `INSERT INTO medicines (name, generic_name, category, unit, unit_price, reorder_level, current_stock)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING`,
        [med.name, med.generic_name, med.category, med.unit, med.unit_price, med.reorder_level, med.current_stock]
      );
      console.log(`     ✓ Medicine: ${med.name}`);
    }

    // ── Sample Patients ───────────────────────────────────────────────────────
    console.log('  → Seeding sample patients...');
    const adminId = adminResult.rows[0].id;
    const samplePatients = [
      {
        patient_number: 'PAT-000001',
        first_name: 'John', last_name: 'Doe',
        date_of_birth: '1980-05-15', gender: 'male',
        blood_group: 'O+', phone: '+1-555-200-1001',
        email: 'john.doe@email.com',
        address: '123 Main St, Springfield'
      },
      {
        patient_number: 'PAT-000002',
        first_name: 'Jane', last_name: 'Smith',
        date_of_birth: '1992-08-22', gender: 'female',
        blood_group: 'A+', phone: '+1-555-200-1002',
        email: 'jane.smith@email.com',
        address: '456 Oak Ave, Shelbyville'
      },
      {
        patient_number: 'PAT-000003',
        first_name: 'Robert', last_name: 'Johnson',
        date_of_birth: '1955-12-01', gender: 'male',
        blood_group: 'B-', phone: '+1-555-200-1003',
        email: 'robert.j@email.com',
        address: '789 Pine Rd, Capital City'
      },
    ];

    for (const p of samplePatients) {
      await client.query(
        `INSERT INTO patients (patient_number, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, registered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (patient_number) DO NOTHING`,
        [p.patient_number, p.first_name, p.last_name, p.date_of_birth, p.gender, p.blood_group, p.phone, p.email, p.address, adminId]
      );
      console.log(`     ✓ Patient: ${p.first_name} ${p.last_name}`);
    }

    await client.query('COMMIT');
    console.log('\n✅ Seeding complete!');
    console.log('\n📋 Test Credentials:');
    console.log('   Admin:          admin@hospital.com       / Admin@1234');
    console.log('   Doctor:         sarah.johnson@hospital.com / Doctor@1234');
    console.log('   Receptionist:   alice.brown@hospital.com  / Recept@1234');
    console.log('   Billing:        michael.smith@hospital.com / Billing@1234');
    console.log('   Pharmacist:     emma.davis@hospital.com   / Pharma@1234');
    console.log('   Nurse:          grace.wilson@hospital.com  / Nurse@1234');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();

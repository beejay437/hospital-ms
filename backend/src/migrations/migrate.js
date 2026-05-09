require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/database');

const migrations = [
    `CREATE SEQUENCE IF NOT EXISTS patient_number_seq START 5`,
  `CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1`,
  // ─── Roles ──────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Users ──────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id INTEGER NOT NULL REFERENCES roles(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Doctors (extends users) ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialty VARCHAR(150) NOT NULL,
    license_number VARCHAR(100) UNIQUE,
    qualification TEXT,
    years_experience INTEGER DEFAULT 0,
    consultation_fee NUMERIC(10,2) DEFAULT 0,
    available_days VARCHAR(100) DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    available_from TIME DEFAULT '08:00',
    available_to TIME DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Patients ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20),
    blood_group VARCHAR(10),
    phone VARCHAR(30),
    email VARCHAR(255),
    address TEXT,
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(30),
    allergies TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    registered_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Appointments ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(30) DEFAULT 'scheduled',
    reason TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT appointment_status_check CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show'))
  )`,

  // Prevent double-booking: one doctor per slot
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_book
    ON appointments(doctor_id, appointment_date, appointment_time)
    WHERE status NOT IN ('cancelled','no_show')`,

  // ─── Medical Records ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    consultation_notes TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Vital Signs ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS vital_signs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    medical_record_id UUID REFERENCES medical_records(id),
    recorded_by UUID REFERENCES users(id),
    temperature NUMERIC(5,2),
    temperature_unit VARCHAR(5) DEFAULT 'C',
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    pulse_rate INTEGER,
    respiratory_rate INTEGER,
    oxygen_saturation NUMERIC(5,2),
    weight NUMERIC(6,2),
    height NUMERIC(6,2),
    bmi NUMERIC(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Prescriptions ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_id UUID NOT NULL REFERENCES medical_records(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    doctor_id UUID NOT NULL REFERENCES doctors(id),
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    instructions TEXT,
    is_dispensed BOOLEAN DEFAULT false,
    dispensed_at TIMESTAMPTZ,
    dispensed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Wards & Beds ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    total_beds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id INTEGER NOT NULL REFERENCES wards(id),
    bed_number VARCHAR(20) NOT NULL,
    bed_type VARCHAR(50) DEFAULT 'general',
    status VARCHAR(20) DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT bed_status_check CHECK (status IN ('available','occupied','maintenance')),
    UNIQUE(ward_id, bed_number)
  )`,

  // ─── Admissions ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    bed_id UUID NOT NULL REFERENCES beds(id),
    admitted_by UUID REFERENCES users(id),
    admitting_doctor_id UUID REFERENCES doctors(id),
    admission_date TIMESTAMPTZ DEFAULT NOW(),
    expected_discharge_date DATE,
    actual_discharge_date TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    discharge_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT admission_status_check CHECK (status IN ('active','discharged'))
  )`,

  // ─── Invoices ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    appointment_id UUID REFERENCES appointments(id),
    admission_id UUID REFERENCES admissions(id),
    subtotal NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    tax NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    amount_paid NUMERIC(12,2) DEFAULT 0,
    balance NUMERIC(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT invoice_status_check CHECK (status IN ('unpaid','partial','paid','cancelled'))
  )`,

  `CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity NUMERIC(10,2) DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Payments ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    notes TEXT,
    received_by UUID REFERENCES users(id),
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // ─── Medicines ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'tablet',
    unit_price NUMERIC(10,2) DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    current_stock INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    transaction_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2),
    reference VARCHAR(200),
    notes TEXT,
    performed_by UUID REFERENCES users(id),
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT txn_type_check CHECK (transaction_type IN ('stock_in','stock_out','adjustment','dispensed'))
  )`,

  // ─── Indexes ──────────────────────────────────────────────────────────────────
  `CREATE INDEX IF NOT EXISTS idx_patients_patient_number ON patients(patient_number)`,
  `CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(first_name, last_name)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`,
  `CREATE INDEX IF NOT EXISTS idx_inventory_medicine ON inventory_transactions(medicine_id)`,
];

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');
    await client.query('BEGIN');

    for (const sql of migrations) {
      const preview = sql.trim().substring(0, 60).replace(/\n/g, ' ');
      try {
        await client.query(sql);
        console.log(`  ✓ ${preview}...`);
      } catch (err) {
        console.error(`  ✗ Failed: ${preview}...`);
        console.error(`    Error: ${err.message}`);
        throw err;
      }
    }

    await client.query('COMMIT');
    console.log('✅ All migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const patientRoutes = require('./routes/patients.routes');
const staffRoutes = require('./routes/staff.routes');
const appointmentRoutes = require('./routes/appointments.routes');
const medicalRecordRoutes = require('./routes/medicalRecords.routes');
const admissionRoutes = require('./routes/admissions.routes');
const billingRoutes = require('./routes/billing.routes');
const pharmacyRoutes = require('./routes/pharmacy.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// ─── Security & Middleware ─────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://hospital-ms-zlkw.vercel.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Health Check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── API Routes ────────────────────────────────────────────────
const apiV1 = '/api/v1';

app.use(`${apiV1}/auth`, authRoutes);
app.use(`${apiV1}/patients`, patientRoutes);
app.use(`${apiV1}/staff`, staffRoutes);
app.use(`${apiV1}/appointments`, appointmentRoutes);
app.use(`${apiV1}/medical-records`, medicalRecordRoutes);
app.use(`${apiV1}/admissions`, admissionRoutes);
app.use(`${apiV1}/billing`, billingRoutes);
app.use(`${apiV1}/pharmacy`, pharmacyRoutes);
app.use(`${apiV1}/dashboard`, dashboardRoutes);

// ─── Error Handling ────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;

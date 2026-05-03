# Hospital Management System — Setup Guide

## Project Structure

```
hospital-ms/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── app.js          # JWT, roles config
│   │   │   └── database.js     # PostgreSQL pool
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── patients.controller.js
│   │   │   ├── staff.controller.js
│   │   │   ├── appointments.controller.js
│   │   │   ├── medicalRecords.controller.js
│   │   │   ├── admissions.controller.js
│   │   │   ├── billing.controller.js
│   │   │   ├── pharmacy.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT authenticate + authorize
│   │   │   └── errorHandler.js
│   │   ├── migrations/
│   │   │   └── migrate.js      # All 14 tables
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── patients.routes.js
│   │   │   ├── staff.routes.js
│   │   │   ├── appointments.routes.js
│   │   │   ├── medicalRecords.routes.js
│   │   │   ├── admissions.routes.js
│   │   │   ├── billing.routes.js
│   │   │   ├── pharmacy.routes.js
│   │   │   └── dashboard.routes.js
│   │   ├── seeders/
│   │   │   └── seed.js         # Roles + 6 users + wards + medicines + patients
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   ├── generators.js   # Patient #, Invoice #
│   │   │   └── response.js     # Consistent API responses
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (dashboard)/
    │   │   │   ├── layout.tsx      # Auth guard + sidebar
    │   │   │   ├── dashboard/page.tsx
    │   │   │   ├── patients/page.tsx
    │   │   │   ├── patients/[id]/page.tsx
    │   │   │   ├── appointments/page.tsx
    │   │   │   ├── admissions/page.tsx
    │   │   │   ├── billing/page.tsx
    │   │   │   ├── pharmacy/page.tsx
    │   │   │   ├── staff/page.tsx
    │   │   │   └── medical-records/page.tsx
    │   │   ├── login/page.tsx
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── Topbar.tsx
    │   │   └── ui/index.tsx     # Modal, Badge, StatCard, Table, Pagination...
    │   ├── context/AuthContext.tsx
    │   └── lib/
    │       ├── api.ts           # Axios instance with JWT
    │       └── utils.ts         # formatDate, formatCurrency, statusColor...
    ├── next.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

---

## Step 1 — PostgreSQL Setup

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create the database
CREATE DATABASE hospital_ms;

-- Optional: create dedicated user
CREATE USER hospital_admin WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hospital_ms TO hospital_admin;

-- Enable uuid generation (needed by migrations)
\c hospital_ms
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\q
```

---

## Step 2 — Backend Setup

```bash
cd hospital-ms/backend

# Copy environment config
cp .env.example .env

# Edit .env with your database credentials
nano .env   # or use any text editor
```

Your `.env` should look like:
```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_ms
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=change_this_to_something_long_and_random
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
```

```bash
# Install dependencies
npm install

# Run migrations (creates all 14 tables)
npm run migrate

# Seed initial data (roles, users, wards, medicines, sample patients)
npm run seed

# Start the development server
npm run dev
```

Backend runs at: `http://localhost:5000`
Health check: `http://localhost:5000/health`

---

## Step 3 — Frontend Setup

```bash
cd hospital-ms/frontend

# Copy environment config
cp .env.local.example .env.local

# Edit if your backend is on a different port/host
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Install dependencies
npm install

# Start Next.js dev server
npm run dev
```

Frontend runs at: `http://localhost:3000`

---

## Test Credentials (after seeding)

| Role             | Email                         | Password      |
|-----------------|-------------------------------|---------------|
| Admin           | admin@hospital.com            | Admin@1234    |
| Doctor          | sarah.johnson@hospital.com    | Doctor@1234   |
| Receptionist    | alice.brown@hospital.com      | Recept@1234   |
| Billing Officer | michael.smith@hospital.com    | Billing@1234  |
| Pharmacist      | emma.davis@hospital.com       | Pharma@1234   |
| Nurse           | grace.wilson@hospital.com     | Nurse@1234    |

---

## API Endpoints Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/auth/me | Current user |
| POST | /api/v1/auth/change-password | Change password |

### Patients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/patients | List (search, paginate) |
| POST | /api/v1/patients | Register new patient |
| GET | /api/v1/patients/:id | Get patient |
| PUT | /api/v1/patients/:id | Update patient |
| GET | /api/v1/patients/:id/history | Full visit history |

### Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/appointments | List (filter date/doctor/status) |
| POST | /api/v1/appointments | Create (double-booking prevented) |
| PUT | /api/v1/appointments/:id | Update/reschedule |
| GET | /api/v1/appointments/schedule/:doctorId/:date | Doctor daily schedule |

### Admissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admissions | List active/discharged |
| POST | /api/v1/admissions | Admit patient |
| POST | /api/v1/admissions/:id/discharge | Discharge patient |
| GET | /api/v1/admissions/wards | Ward + bed summary |
| GET | /api/v1/admissions/beds | Available beds |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/billing | List invoices |
| POST | /api/v1/billing | Create invoice |
| GET | /api/v1/billing/:id | Invoice with items + payments |
| POST | /api/v1/billing/:id/items | Add line item |
| POST | /api/v1/billing/:id/payments | Record payment |
| POST | /api/v1/billing/:id/cancel | Cancel invoice |

### Pharmacy
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/pharmacy | List medicines |
| POST | /api/v1/pharmacy | Create medicine |
| PUT | /api/v1/pharmacy/:id | Update medicine |
| POST | /api/v1/pharmacy/transactions | Stock in/out |
| GET | /api/v1/pharmacy/alerts/low-stock | Low stock list |

### Medical Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/medical-records | Create record |
| GET | /api/v1/medical-records/:id | Get record + prescriptions |
| PUT | /api/v1/medical-records/:id | Update record |
| POST | /api/v1/medical-records/:id/prescriptions | Add prescription |
| POST | /api/v1/medical-records/vitals | Record vital signs |

### Staff
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/staff | List staff (admin only) |
| POST | /api/v1/staff | Create staff (admin only) |
| PUT | /api/v1/staff/:id | Update staff |
| GET | /api/v1/staff/doctors | Active doctors list |
| GET | /api/v1/staff/roles | All roles |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/dashboard/summary | Full stats + lists |

---

## Extending the MVP

### Add a new module (e.g. Lab Results)
1. Add table in `backend/src/migrations/migrate.js`
2. Create `backend/src/controllers/lab.controller.js`
3. Create `backend/src/routes/lab.routes.js`
4. Register route in `backend/src/app.js`
5. Add page in `frontend/src/app/(dashboard)/lab/page.tsx`
6. Add nav item in `frontend/src/components/layout/Sidebar.tsx`

### Add email notifications
- Install `nodemailer` in backend
- Create `src/services/email.service.js`
- Call after patient registration, discharge, appointment

### Add file uploads (X-rays, documents)
- Install `multer` + `cloudinary` or `aws-s3`
- Add `patient_documents` table
- Create upload endpoint

### Production deployment
- Set `NODE_ENV=production` in backend
- Use connection pooling (PgBouncer)
- Put backend behind nginx
- Use PM2 for process management
- Next.js: `npm run build && npm start`

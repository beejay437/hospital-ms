const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const ctrl = require('../controllers/medicalRecords.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.post(
  '/',
  authenticate,
  authorize('doctor'),
  [body('patientId').isUUID(), handleValidationErrors],
  ctrl.createRecord
);

router.get(
  '/:id',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  ctrl.getRecord
);

router.put(
  '/:id',
  authenticate,
  authorize('doctor'),
  ctrl.updateRecord
);

router.post(
  '/:recordId/prescriptions',
  authenticate,
  authorize('doctor'),
  [body('medicineName').notEmpty(), handleValidationErrors],
  ctrl.addPrescription
);

router.post(
  '/vitals',
  authenticate,
  authorize('admin', 'doctor', 'nurse'),
  [body('patientId').isUUID(), handleValidationErrors],
  ctrl.recordVitals
);

module.exports = router;

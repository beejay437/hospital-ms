const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/patients.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const canViewPatients = authorize(
  'admin',
  'receptionist',
  'doctor',
  'nurse',
  'billing_officer'
);

const canManagePatients = authorize('admin', 'receptionist');
const canDeletePatients = authorize('admin');

router.get('/', authenticate, canViewPatients, ctrl.listPatients);
router.get('/:id', authenticate, canViewPatients, ctrl.getPatient);
router.get('/:id/history', authenticate, canViewPatients, ctrl.getPatientHistory);

router.post(
  '/',
  authenticate,
  canManagePatients,
  [
    body('firstName').notEmpty().withMessage('First name required'),
    body('lastName').notEmpty().withMessage('Last name required'),
    handleValidationErrors,
  ],
  ctrl.registerPatient
);

router.put('/:id', authenticate, canManagePatients, ctrl.updatePatient);

router.delete('/:id', authenticate, canDeletePatients, ctrl.deletePatient);

module.exports = router;
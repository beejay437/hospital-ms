const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/admissions.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const canViewAdmissions = authorize('admin','receptionist','doctor','nurse');

router.get('/wards', authenticate, canViewAdmissions, ctrl.listWards);
router.get('/beds', authenticate, canViewAdmissions, ctrl.listBeds);
router.get('/', authenticate, canViewAdmissions, ctrl.listAdmissions);
router.get('/:id', authenticate, canViewAdmissions, ctrl.getAdmission);

router.post('/',
  authenticate, authorize('admin','receptionist','nurse'),
  [
    body('patientId').isUUID(),
    body('bedId').isUUID(),
    body('reason').notEmpty(),
    handleValidationErrors,
  ],
  ctrl.admitPatient
);

router.post('/:id/discharge',
  authenticate, authorize('admin','doctor','nurse'),
  ctrl.dischargePatient
);

module.exports = router;

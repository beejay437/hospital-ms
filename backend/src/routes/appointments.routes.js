const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/appointments.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const canViewAppointments = authorize('admin','receptionist','doctor','nurse');

router.get('/', authenticate, canViewAppointments, ctrl.listAppointments);
router.get('/:id', authenticate, canViewAppointments, ctrl.getAppointment);
router.get('/schedule/:doctorId/:date?', authenticate, canViewAppointments, ctrl.getDoctorSchedule);

router.post('/',
  authenticate, authorize('admin','receptionist'),
  [
    body('patientId').isUUID(),
    body('doctorId').isUUID(),
    body('appointmentDate').isDate(),
    body('appointmentTime').notEmpty(),
    handleValidationErrors,
  ],
  ctrl.createAppointment
);

router.put('/:id', authenticate, authorize('admin','receptionist','doctor'), ctrl.updateAppointment);

module.exports = router;

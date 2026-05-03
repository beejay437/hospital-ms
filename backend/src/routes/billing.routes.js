const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/billing.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const canViewBilling = authorize('admin','billing_officer','receptionist');
const canManageBilling = authorize('admin','billing_officer');

router.get('/', authenticate, canViewBilling, ctrl.listInvoices);
router.get('/:id', authenticate, canViewBilling, ctrl.getInvoice);

router.post('/',
  authenticate, canManageBilling,
  [
    body('patientId').isUUID(),
    body('items').isArray({ min: 1 }),
    handleValidationErrors,
  ],
  ctrl.createInvoice
);

router.post('/:id/items', authenticate, canManageBilling,
  [body('description').notEmpty(), body('unitPrice').isNumeric(), handleValidationErrors],
  ctrl.addInvoiceItem
);

router.post('/:id/payments',
  authenticate, canManageBilling,
  [body('amount').isNumeric({ min: 0.01 }), handleValidationErrors],
  ctrl.recordPayment
);

router.post('/:id/cancel', authenticate, canManageBilling, ctrl.cancelInvoice);

module.exports = router;

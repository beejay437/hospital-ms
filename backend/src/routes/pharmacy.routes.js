const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/pharmacy.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

const canViewPharmacy = authorize('admin','pharmacist','doctor','nurse');
const canManagePharmacy = authorize('admin','pharmacist');

router.get('/alerts/low-stock', authenticate, canViewPharmacy, ctrl.getLowStockAlerts);
router.get('/', authenticate, canViewPharmacy, ctrl.listMedicines);
router.get('/:id', authenticate, canViewPharmacy, ctrl.getMedicine);

router.post('/',
  authenticate, canManagePharmacy,
  [body('name').notEmpty(), handleValidationErrors],
  ctrl.createMedicine
);

router.put('/:id', authenticate, canManagePharmacy, ctrl.updateMedicine);

router.post('/transactions',
  authenticate, canManagePharmacy,
  [
    body('medicineId').isUUID(),
    body('transactionType').isIn(['stock_in','stock_out','adjustment','dispensed']),
    body('quantity').isInt({ min: 1 }),
    handleValidationErrors,
  ],
  ctrl.stockTransaction
);

module.exports = router;

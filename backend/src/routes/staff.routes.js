const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/staff.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), ctrl.listStaff);
router.get('/:id', authenticate, authorize('admin'), ctrl.getStaff);
router.post('/', authenticate, authorize('admin'), ctrl.createStaff);
router.put('/:id', authenticate, authorize('admin'), ctrl.updateStaff);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteStaff);
module.exports = router;

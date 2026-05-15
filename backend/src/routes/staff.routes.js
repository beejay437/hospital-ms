const express = require('express');
const router = express.Router();

const {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  listDoctors,
  getRoles,
  deleteStaff,
} = require('../controllers/staff.controller');

const { authenticate, authorize } = require('../middleware/auth');

// IMPORTANT: special routes must come BEFORE /:id
router.get('/roles', authenticate, authorize('admin'), getRoles);
router.get('/doctors', authenticate, listDoctors);

// Staff routes
router.get('/', authenticate, authorize('admin'), listStaff);
router.post('/', authenticate, authorize('admin'), createStaff);

// ID routes must stay LAST
router.get('/:id', authenticate, authorize('admin'), getStaff);
router.put('/:id', authenticate, authorize('admin'), updateStaff);
router.delete('/:id', authenticate, authorize('admin'), deleteStaff);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { login, getCurrentUser, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/errorHandler');

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
    handleValidationErrors,
  ],
  login
);

router.get('/me', authenticate, getCurrentUser);

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    handleValidationErrors,
  ],
  changePassword
);

module.exports = router;

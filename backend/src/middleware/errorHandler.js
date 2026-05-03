const { validationResult } = require('express-validator');
const { badRequest, error } = require('../utils/response');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return badRequest(res, 'Validation failed', errors.array());
  }
  next();
};

// eslint-disable-next-line no-unused-vars
const globalErrorHandler = (err, req, res, next) => {
  console.error('Global error handler caught:', err);

  if (err.code === '23505') {
    return badRequest(res, 'Duplicate entry: ' + (err.detail || 'Record already exists'));
  }
  if (err.code === '23503') {
    return badRequest(res, 'Referenced record not found');
  }
  if (err.code === '22P02') {
    return badRequest(res, 'Invalid UUID format');
  }

  return error(res, err.message || 'Internal server error', err.status || 500);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
};

module.exports = { handleValidationErrors, globalErrorHandler, notFoundHandler };

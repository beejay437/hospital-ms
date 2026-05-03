module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: 12,
  roles: {
    ADMIN: 'admin',
    RECEPTIONIST: 'receptionist',
    DOCTOR: 'doctor',
    NURSE: 'nurse',
    PHARMACIST: 'pharmacist',
    BILLING_OFFICER: 'billing_officer',
  },
};

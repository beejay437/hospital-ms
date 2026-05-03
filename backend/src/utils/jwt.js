const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/app');

const generateToken = (payload) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtSecret);
};

module.exports = { generateToken, verifyToken };

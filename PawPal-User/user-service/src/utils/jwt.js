const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for a user
 * @param {Object} user - User object containing user information
 * @returns {string} JWT token
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'pawpal-user-service',
    audience: 'pawpal-api'
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'pawpal-user-service',
      audience: 'pawpal-api'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value (e.g., "Bearer <token>")
 * @returns {string|null} Extracted token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader
};



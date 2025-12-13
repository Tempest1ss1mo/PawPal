const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Middleware to verify JWT token
 * Adds user information to req.user if token is valid
 */
function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided. Please include a Bearer token in the Authorization header.'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user information to request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: error.message || 'Invalid or expired token'
    });
  }
}

/**
 * Optional authentication middleware
 * Adds user information to req.user if token is present and valid
 * Does not return error if token is missing (useful for optional auth)
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    next();
  } catch (error) {
    // If token is invalid, continue without user info
    next();
  }
}

module.exports = {
  authenticateToken,
  optionalAuth
};



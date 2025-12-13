const { generateToken } = require('../utils/jwt');

/**
 * Handle successful OAuth callback
 * Generate JWT token and redirect to frontend with token
 */
async function handleOAuthCallback(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'User information not available'
      });
    }

    // Generate JWT token for the authenticated user
    const token = generateToken(req.user);

    // Return token in response
    // In production, you might want to redirect to frontend with token in URL fragment or use httpOnly cookies
    res.json({
      success: true,
      message: 'Authentication successful',
      token: token,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to complete authentication'
    });
  }
}

/**
 * Verify token endpoint
 * Allows clients to check if their token is still valid
 */
function verifyToken(req, res) {
  // If middleware passed, token is valid
  res.json({
    valid: true,
    user: req.user
  });
}

/**
 * Get current user information from token
 */
function getCurrentUser(req, res) {
  res.json({
    user: req.user
  });
}

module.exports = {
  handleOAuthCallback,
  verifyToken,
  getCurrentUser
};



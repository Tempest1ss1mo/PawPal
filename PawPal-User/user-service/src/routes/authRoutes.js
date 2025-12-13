const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from OAuth2 login
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *           description: JWT token for API authentication
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             email:
 *               type: string
 *             name:
 *               type: string
 *             role:
 *               type: string
 *     TokenVerification:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *         user:
 *           type: object
 */

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth2 login
 *     description: Redirects user to Google OAuth2 consent screen
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth2 consent screen
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth2 callback
 *     description: Handles Google OAuth2 callback and returns JWT token
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Authentication failed
 *       500:
 *         description: Internal server error
 */
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  authController.handleOAuthCallback
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verify JWT token
 *     description: Check if the provided JWT token is valid
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenVerification'
 *       401:
 *         description: Invalid or missing token
 */
router.get('/verify',
  authenticateToken,
  authController.verifyToken
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information
 *     description: Returns information about the currently authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid or missing token
 */
router.get('/me',
  authenticateToken,
  authController.getCurrentUser
);

module.exports = router;



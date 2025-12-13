const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const {
  validateUserCreate,
  validateUserUpdate,
  validateUserQuery,
  validateUserSearch,
  validateId,
  validatePagination
} = require('../middleware/validation');
const { checkETag, requireETagMatch } = require('../utils/etag');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from OAuth2 login (/api/auth/google)
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - role
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated user ID
 *         name:
 *           type: string
 *           maxLength: 100
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           maxLength: 150
 *           description: User's email address
 *         role:
 *           type: string
 *           enum: [owner, walker]
 *           description: User's role in the platform
 *         phone:
 *           type: string
 *           maxLength: 20
 *           description: User's phone number
 *         location:
 *           type: string
 *           maxLength: 200
 *           description: User's location
 *         profile_image_url:
 *           type: string
 *           format: uri
 *           maxLength: 500
 *           description: URL to user's profile image
 *         bio:
 *           type: string
 *           maxLength: 1000
 *           description: User's biography
 *         rating:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 5
 *           description: User's average rating
 *         total_reviews:
 *           type: integer
 *           minimum: 0
 *           description: Total number of reviews received
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: User creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: User last update timestamp
 *         is_active:
 *           type: boolean
 *           description: Whether the user is active
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users with pagination and filtering
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, walker]
 *         description: Filter by user role
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location
 *       - in: query
 *         name: min_rating
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of users to skip (alternative to page)
 *       - in: header
 *         name: If-None-Match
 *         schema:
 *           type: string
 *         description: ETag for conditional request (returns 304 if unchanged)
 *     responses:
 *       200:
 *         description: List of users with pagination metadata and links
 *         headers:
 *           ETag:
 *             description: ETag for the collection
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   description: Number of items in current page
 *                 total:
 *                   type: integer
 *                   description: Total number of items
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Items per page
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                 data:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/User'
 *                       - type: object
 *                         properties:
 *                           links:
 *                             $ref: '#/components/schemas/Links'
 *                 links:
 *                   $ref: '#/components/schemas/PaginationLinks'
 *       304:
 *         description: Not Modified (resource unchanged)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 150
 *               role:
 *                 type: string
 *                 enum: [owner, walker]
 *               phone:
 *                 type: string
 *                 maxLength: 20
 *               location:
 *                 type: string
 *                 maxLength: 200
 *               profile_image_url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               bio:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: User created successfully
 *         headers:
 *           Location:
 *             description: URI of the created resource
 *             schema:
 *               type: string
 *           ETag:
 *             description: ETag for the created resource
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         links:
 *                           $ref: '#/components/schemas/Links'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */

// GET /api/users - Get all users (with ETag support)
router.get('/', checkETag, validateUserQuery, validatePagination, UserController.getAllUsers);

// POST /api/users - Create new user
router.post('/', validateUserCreate, UserController.createUser);

/**
 * @swagger
 * /api/users/bulk-import:
 *   post:
 *     summary: Bulk import users (asynchronous operation)
 *     description: Accepts bulk user import request and returns 202 Accepted with task ID for status polling
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - email
 *                     - role
 *                   properties:
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     role:
 *                       type: string
 *                       enum: [owner, walker]
 *     responses:
 *       202:
 *         description: Request accepted for processing
 *         headers:
 *           Location:
 *             description: URI to check task status
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 task:
 *                   $ref: '#/components/schemas/AsyncTask'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
// POST /api/users/bulk-import - Bulk import users (202 Accepted)
router.post('/bulk-import', UserController.bulkImportUsers);

// GET /api/users/search - Search users
router.get('/search', validateUserSearch, UserController.searchUsers);

// GET /api/users/walkers - Get all walkers
router.get('/walkers', validateUserQuery, validatePagination, UserController.getWalkers);

// GET /api/users/owners - Get all owners
router.get('/owners', validateUserQuery, validatePagination, UserController.getOwners);

// GET /api/users/top-walkers - Get top-rated walkers
router.get('/top-walkers', validatePagination, UserController.getTopWalkers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: header
 *         name: If-None-Match
 *         schema:
 *           type: string
 *         description: ETag for conditional request (returns 304 if unchanged)
 *     responses:
 *       200:
 *         description: User details with links
 *         headers:
 *           ETag:
 *             description: ETag for the resource
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         links:
 *                           $ref: '#/components/schemas/Links'
 *       304:
 *         description: Not Modified (resource unchanged)
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *   put:
 *     summary: Update user (with conditional update support)
 *     description: Requires JWT authentication. Obtain token from /api/auth/google
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: header
 *         name: If-Match
 *         schema:
 *           type: string
 *         description: ETag for optimistic concurrency control (returns 412 if mismatch)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         headers:
 *           ETag:
 *             description: New ETag for the updated resource
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         links:
 *                           $ref: '#/components/schemas/Links'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       412:
 *         description: Precondition Failed (ETag mismatch)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Precondition Failed: Resource has been modified"
 *                 error:
 *                   type: string
 *                   example: "ETag mismatch"
 *   delete:
 *     summary: Delete user (soft delete)
 *     description: Soft delete a user by setting is_active to false. Requires JWT authentication.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// GET /api/users/:id - Get user by ID (with ETag support)
router.get('/:id', checkETag, validateId, UserController.getUserById);

// GET /api/users/email/:email - Get user by email
router.get('/email/:email', UserController.getUserByEmail);

// PUT /api/users/:id - Update user (with ETag conditional update)
// PUT /api/users/:id - Update user (requires JWT authentication)
router.put('/:id', authenticateToken, requireETagMatch, validateId, validateUserUpdate, UserController.updateUser);

// DELETE /api/users/:id - Delete user (soft delete, requires JWT authentication)
router.delete('/:id', authenticateToken, validateId, UserController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/hard:
 *   delete:
 *     summary: Hard delete user (admin only)
 *     description: Permanently delete a user from the database. This action cannot be undone.
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: User permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User permanently deleted
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// DELETE /api/users/:id/hard - Hard delete user (admin only)
router.delete('/:id/hard', validateId, UserController.hardDeleteUser);

// GET /api/users/:id/dogs - Get user's dogs
router.get('/:id/dogs', validateId, UserController.getUserDogs);

// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats', validateId, UserController.getUserStats);

/**
 * @swagger
 * /api/users/tasks/{taskId}:
 *   get:
 *     summary: Get async task status
 *     description: Poll the status of an asynchronous task (e.g., bulk import)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID returned from async operation
 *     responses:
 *       200:
 *         description: Task status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 task:
 *                   $ref: '#/components/schemas/AsyncTask'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// GET /api/users/tasks/:taskId - Get async task status
router.get('/tasks/:taskId', UserController.getTaskStatus);

/**
 * @swagger
 * /api/users/tasks/{taskId}/result:
 *   get:
 *     summary: Get async task result
 *     description: Retrieve the result of a completed async task
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID returned from async operation
 *     responses:
 *       200:
 *         description: Task result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 task:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [completed, failed]
 *                     type:
 *                       type: string
 *                     completedAt:
 *                       type: string
 *                       format: date-time
 *                 result:
 *                   type: object
 *                   description: Task-specific result data
 *                 links:
 *                   $ref: '#/components/schemas/Links'
 *       400:
 *         description: Task is not completed
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
// GET /api/users/tasks/:taskId/result - Get async task result
router.get('/tasks/:taskId/result', UserController.getTaskResult);

module.exports = router;

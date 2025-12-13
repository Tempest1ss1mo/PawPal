const express = require('express');
const router = express.Router();
const DogController = require('../controllers/dogController');
const {
  validateDogCreate,
  validateDogUpdate,
  validateDogQuery,
  validateDogSearch,
  validateId,
  validatePagination
} = require('../middleware/validation');

/**
 * @swagger
 * components:
 *   schemas:
 *     Dog:
 *       type: object
 *       required:
 *         - owner_id
 *         - name
 *         - size
 *       properties:
 *         id:
 *           type: integer
 *           description: Auto-generated dog ID
 *         owner_id:
 *           type: integer
 *           description: ID of the dog's owner
 *         name:
 *           type: string
 *           maxLength: 50
 *           description: Dog's name
 *         breed:
 *           type: string
 *           maxLength: 50
 *           description: Dog's breed
 *         age:
 *           type: integer
 *           minimum: 0
 *           maximum: 30
 *           description: Dog's age in years
 *         size:
 *           type: string
 *           enum: [small, medium, large, extra_large]
 *           description: Dog's size category
 *         temperament:
 *           type: string
 *           maxLength: 200
 *           description: Dog's temperament description
 *         special_needs:
 *           type: string
 *           maxLength: 1000
 *           description: Special care requirements
 *         medical_notes:
 *           type: string
 *           maxLength: 1000
 *           description: Medical information
 *         profile_image_url:
 *           type: string
 *           format: uri
 *           maxLength: 500
 *           description: URL to dog's profile image
 *         is_friendly_with_other_dogs:
 *           type: boolean
 *           description: Whether dog is friendly with other dogs
 *         is_friendly_with_children:
 *           type: boolean
 *           description: Whether dog is friendly with children
 *         energy_level:
 *           type: string
 *           enum: [low, medium, high]
 *           description: Dog's energy level
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Dog creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Dog last update timestamp
 *         is_active:
 *           type: boolean
 *           description: Whether the dog is active
 */

/**
 * @swagger
 * /api/dogs:
 *   get:
 *     summary: Get all dogs
 *     tags: [Dogs]
 *     parameters:
 *       - in: query
 *         name: owner_id
 *         schema:
 *           type: integer
 *         description: Filter by owner ID
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [small, medium, large, extra_large]
 *         description: Filter by dog size
 *       - in: query
 *         name: breed
 *         schema:
 *           type: string
 *         description: Filter by breed
 *       - in: query
 *         name: energy_level
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by energy level
 *       - in: query
 *         name: is_friendly_with_other_dogs
 *         schema:
 *           type: boolean
 *         description: Filter by friendliness with other dogs
 *       - in: query
 *         name: is_friendly_with_children
 *         schema:
 *           type: boolean
 *         description: Filter by friendliness with children
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of dogs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of dogs to skip
 *     responses:
 *       200:
 *         description: List of dogs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dog'
 *   post:
 *     summary: Create a new dog
 *     tags: [Dogs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - owner_id
 *               - name
 *               - size
 *             properties:
 *               owner_id:
 *                 type: integer
 *               name:
 *                 type: string
 *                 maxLength: 50
 *               breed:
 *                 type: string
 *                 maxLength: 50
 *               age:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 30
 *               size:
 *                 type: string
 *                 enum: [small, medium, large, extra_large]
 *               temperament:
 *                 type: string
 *                 maxLength: 200
 *               special_needs:
 *                 type: string
 *                 maxLength: 1000
 *               medical_notes:
 *                 type: string
 *                 maxLength: 1000
 *               profile_image_url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *               is_friendly_with_other_dogs:
 *                 type: boolean
 *                 default: true
 *               is_friendly_with_children:
 *                 type: boolean
 *                 default: true
 *               energy_level:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Dog created successfully
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
 *                   $ref: '#/components/schemas/Dog'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Owner not found
 */

// GET /api/dogs - Get all dogs
router.get('/', validateDogQuery, validatePagination, DogController.getAllDogs);

// POST /api/dogs - Create new dog
router.post('/', validateDogCreate, DogController.createDog);

// GET /api/dogs/search - Search dogs
router.get('/search', validateDogSearch, DogController.searchDogs);

// GET /api/dogs/friendly - Get friendly dogs
router.get('/friendly', validateDogQuery, validatePagination, DogController.getFriendlyDogs);

// GET /api/dogs/high-energy - Get high energy dogs
router.get('/high-energy', validateDogQuery, validatePagination, DogController.getHighEnergyDogs);

// GET /api/dogs/senior - Get senior dogs (age 7+)
router.get('/senior', validateDogQuery, validatePagination, DogController.getSeniorDogs);

// GET /api/dogs/stats/breeds - Get breed statistics
router.get('/stats/breeds', DogController.getBreedStats);

// GET /api/dogs/stats/sizes - Get size statistics
router.get('/stats/sizes', DogController.getSizeStats);

// GET /api/dogs/size/:size - Get dogs by size
router.get('/size/:size', validateDogQuery, validatePagination, DogController.getDogsBySize);

// GET /api/dogs/energy/:energyLevel - Get dogs by energy level
router.get('/energy/:energyLevel', validateDogQuery, validatePagination, DogController.getDogsByEnergyLevel);

// GET /api/dogs/breed/:breed - Get dogs by breed
router.get('/breed/:breed', validateDogQuery, validatePagination, DogController.getDogsByBreed);

// GET /api/dogs/owner/:ownerId - Get dogs by owner
router.get('/owner/:ownerId', validateId, DogController.getDogsByOwner);

// GET /api/dogs/:id - Get dog by ID
router.get('/:id', validateId, DogController.getDogById);

// PUT /api/dogs/:id - Update dog
router.put('/:id', validateId, validateDogUpdate, DogController.updateDog);

// DELETE /api/dogs/:id - Delete dog (soft delete)
router.delete('/:id', validateId, DogController.deleteDog);

// DELETE /api/dogs/:id/hard - Hard delete dog (admin only)
router.delete('/:id/hard', validateId, DogController.hardDeleteDog);

// GET /api/dogs/:id/owner - Get dog's owner
router.get('/:id/owner', validateId, DogController.getDogOwner);

module.exports = router;

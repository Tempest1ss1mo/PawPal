const express = require('express');
const router = express.Router();
const compositeController = require('../controllers/compositeController');
const foreignKeyValidator = require('../middleware/foreignKeyValidation');

/**
 * Composite Service Routes
 * These routes encapsulate and expose atomic microservice APIs
 * with added functionality like parallel execution and foreign key validation
 */

// GET /api/composite/users/:id/complete - Get user with dogs and stats (parallel execution)
router.get('/users/:id/complete', compositeController.getUserComplete);

// GET /api/composite/users/:id/dogs - Get user with their dogs (parallel execution)
router.get('/users/:id/dogs', compositeController.getUserWithDogs);

// GET /api/composite/users - Get all users with their dogs (aggregated)
router.get('/users', compositeController.getAllUsersWithDogs);

// POST /api/composite/dogs - Create dog with foreign key validation
router.post('/dogs', foreignKeyValidator.validateOwnerExists, compositeController.createDogWithValidation);

// PUT /api/composite/dogs/:id - Update dog with foreign key validation
router.put('/dogs/:id', compositeController.updateDogWithValidation);

// DELETE /api/composite/users/:id - Delete user and all their dogs (cascade)
router.delete('/users/:id', foreignKeyValidator.validateUserExists, compositeController.deleteUserWithDogs);

// GET /api/composite/stats - Get aggregated statistics
router.get('/stats', compositeController.getAggregatedStats);

module.exports = router;


const UserServiceClient = require('../services/userServiceClient');
const DogServiceClient = require('../services/dogServiceClient');
const parallelExecutor = require('../utils/parallelExecutor');

class CompositeController {
  constructor() {
    this.userServiceClient = new UserServiceClient();
    this.dogServiceClient = new DogServiceClient();
  }

  /**
   * Get user with all their dogs (using parallel execution)
   * Demonstrates worker threads for parallel API calls
   */
  async getUserWithDogs(req, res, next) {
    try {
      const { id } = req.params;
      
      // Use parallel executor to fetch user and dogs simultaneously
      const result = await parallelExecutor.fetchUserWithDogs(
        id,
        process.env.USER_SERVICE_URL,
        process.env.DOG_SERVICE_URL
      );

      res.json({
        success: true,
        message: 'User with dogs retrieved successfully',
        data: {
          user: result.user,
          dogs: result.dogs
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get complete user profile (user + dogs + stats) using parallel execution
   */
  async getUserComplete(req, res, next) {
    try {
      const { id } = req.params;
      
      // Use parallel executor to fetch user, dogs, and stats simultaneously
      const result = await parallelExecutor.fetchUserComplete(
        id,
        process.env.USER_SERVICE_URL,
        process.env.DOG_SERVICE_URL
      );

      res.json({
        success: true,
        message: 'Complete user profile retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create dog with foreign key validation
   * Demonstrates logical foreign key constraint enforcement
   */
  async createDogWithValidation(req, res, next) {
    try {
      // Foreign key validation is done in middleware
      // If we reach here, owner_id is valid
      const dogData = req.body;
      
      const result = await this.dogServiceClient.createDog(dogData);

      res.status(201).json({
        success: true,
        message: 'Dog created successfully with foreign key validation',
        data: result.data || result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dog with foreign key validation (if owner_id is being updated)
   */
  async updateDogWithValidation(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // If owner_id is being updated, validate it exists
      if (updateData.owner_id) {
        const userResponse = await this.userServiceClient.getUserById(updateData.owner_id);
        if (!userResponse || !userResponse.data) {
          return res.status(404).json({
            success: false,
            message: `Owner with id ${updateData.owner_id} not found`
          });
        }
      }

      const result = await this.dogServiceClient.updateDog(id, updateData);

      res.json({
        success: true,
        message: 'Dog updated successfully with foreign key validation',
        data: result.data || result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all users with their dogs (aggregated view)
   * Uses parallel execution for multiple users
   */
  async getAllUsersWithDogs(req, res, next) {
    try {
      const filters = req.query;
      
      // Get all users
      const usersResponse = await this.userServiceClient.getAllUsers(filters);
      const users = usersResponse.data || usersResponse;

      // Fetch dogs for each user in parallel (limited to first 10 for performance)
      const usersToProcess = Array.isArray(users) ? users.slice(0, 10) : [];
      
      const userDogPromises = usersToProcess.map(async (user) => {
        try {
          const dogsResponse = await this.dogServiceClient.getDogsByOwner(user.id);
          return {
            ...user,
            dogs: dogsResponse.data || dogsResponse
          };
        } catch (error) {
          return {
            ...user,
            dogs: [],
            error: 'Failed to fetch dogs'
          };
        }
      });

      const usersWithDogs = await Promise.all(userDogPromises);

      res.json({
        success: true,
        message: 'Users with dogs retrieved successfully',
        count: usersWithDogs.length,
        data: usersWithDogs
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user and all their dogs (cascade delete logic)
   * Demonstrates logical foreign key constraint handling
   */
  async deleteUserWithDogs(req, res, next) {
    try {
      const { id } = req.params;

      // First, get all dogs for this user
      const dogsResponse = await this.dogServiceClient.getDogsByOwner(id);
      const dogs = dogsResponse.data || dogsResponse;

      // Delete all dogs in parallel, then delete user
      const deletePromises = [];
      
      if (Array.isArray(dogs) && dogs.length > 0) {
        dogs.forEach(dog => {
          deletePromises.push(this.dogServiceClient.deleteDog(dog.id));
        });
      }

      // Wait for all dog deletions, then delete user
      await Promise.all(deletePromises);
      const userResult = await this.userServiceClient.deleteUser(id);

      res.json({
        success: true,
        message: `User and ${dogs.length} associated dogs deleted successfully`,
        data: {
          user: userResult.data || userResult,
          deletedDogsCount: Array.isArray(dogs) ? dogs.length : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get aggregated statistics (users and dogs)
   * Uses parallel execution
   */
  async getAggregatedStats(req, res, next) {
    try {
      // Fetch users and dogs in parallel
      const [usersResult, dogsResult] = await Promise.all([
        this.userServiceClient.getAllUsers({ limit: 1000 }),
        this.dogServiceClient.getAllDogs({ limit: 1000 })
      ]);

      const users = usersResult.data || usersResult;
      const dogs = dogsResult.data || dogsResult;

      const stats = {
        totalUsers: Array.isArray(users) ? users.length : 0,
        totalDogs: Array.isArray(dogs) ? dogs.length : 0,
        usersByRole: {},
        dogsBySize: {},
        dogsByEnergyLevel: {}
      };

      // Calculate statistics
      if (Array.isArray(users)) {
        users.forEach(user => {
          const role = user.role || 'unknown';
          stats.usersByRole[role] = (stats.usersByRole[role] || 0) + 1;
        });
      }

      if (Array.isArray(dogs)) {
        dogs.forEach(dog => {
          const size = dog.size || 'unknown';
          const energy = dog.energy_level || 'unknown';
          stats.dogsBySize[size] = (stats.dogsBySize[size] || 0) + 1;
          stats.dogsByEnergyLevel[energy] = (stats.dogsByEnergyLevel[energy] || 0) + 1;
        });
      }

      res.json({
        success: true,
        message: 'Aggregated statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CompositeController();


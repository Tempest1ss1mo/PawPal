const UserServiceClient = require('../services/userServiceClient');

/**
 * Middleware to validate foreign key constraints logically
 * Validates that owner_id exists before creating/updating dogs
 */
class ForeignKeyValidator {
  constructor() {
    this.userServiceClient = new UserServiceClient();
  }

  /**
   * Validate that a user (owner) exists before dog operations
   */
  async validateOwnerExists(req, res, next) {
    try {
      const ownerId = req.body.owner_id || req.params.ownerId;
      
      if (!ownerId) {
        return res.status(400).json({
          success: false,
          message: 'owner_id is required'
        });
      }

      // Check if owner exists in user service
      const userResponse = await this.userServiceClient.getUserById(ownerId);
      
      if (!userResponse || !userResponse.data) {
        return res.status(404).json({
          success: false,
          message: `Owner with id ${ownerId} not found`
        });
      }

      // Verify the user is an owner (role check)
      const user = userResponse.data;
      if (user.role && user.role !== 'owner') {
        return res.status(400).json({
          success: false,
          message: `User with id ${ownerId} is not an owner (role: ${user.role})`
        });
      }

      // Attach validated owner to request for use in controller
      req.validatedOwner = user;
      next();
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({
          success: false,
          message: `Owner with id ${req.body.owner_id || req.params.ownerId} not found`
        });
      }
      
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to validate owner',
        error: error.error
      });
    }
  }

  /**
   * Validate that a dog exists before operations
   */
  async validateDogExists(req, res, next) {
    try {
      const dogId = req.params.id || req.params.dogId;
      
      if (!dogId) {
        return res.status(400).json({
          success: false,
          message: 'dog_id is required'
        });
      }

      // This would call dog service, but for now we'll validate in controller
      // since we need dogServiceClient there
      next();
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to validate dog',
        error: error.error
      });
    }
  }

  /**
   * Validate user exists before user operations
   */
  async validateUserExists(req, res, next) {
    try {
      const userId = req.params.id || req.params.userId;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'user_id is required'
        });
      }

      const userResponse = await this.userServiceClient.getUserById(userId);
      
      if (!userResponse || !userResponse.data) {
        return res.status(404).json({
          success: false,
          message: `User with id ${userId} not found`
        });
      }

      req.validatedUser = userResponse.data;
      next();
    } catch (error) {
      if (error.status === 404) {
        return res.status(404).json({
          success: false,
          message: `User with id ${req.params.id || req.params.userId} not found`
        });
      }
      
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to validate user',
        error: error.error
      });
    }
  }
}

module.exports = new ForeignKeyValidator();


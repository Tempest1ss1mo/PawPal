const Dog = require('../models/Dog');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

class DogController {
  // Get all dogs
  static getAllDogs = asyncHandler(async (req, res) => {
    const filters = req.query;
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      data: dogs
    });
  });

  // Get dog by ID
  static getDogById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const dog = await Dog.findById(id);
    
    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: dog.toJSON()
    });
  });

  // Get dogs by owner ID
  static getDogsByOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    
    // Verify owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }
    
    const dogs = await Dog.findByOwnerId(ownerId);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      owner: owner.toJSON(),
      data: dogs
    });
  });

  // Create new dog
  static createDog = asyncHandler(async (req, res) => {
    const dogData = req.body;
    
    // Verify owner exists
    const owner = await User.findById(dogData.owner_id);
    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Owner not found'
      });
    }
    
    // Verify owner is actually an owner
    if (owner.role !== 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Only users with owner role can create dogs'
      });
    }
    
    const dog = await Dog.create(dogData);
    
    res.status(201).json({
      success: true,
      message: 'Dog created successfully',
      data: dog.toJSON()
    });
  });

  // Update dog
  static updateDog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    const dog = await Dog.findById(id);
    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }
    
    const updatedDog = await dog.update(updateData);
    
    res.status(200).json({
      success: true,
      message: 'Dog updated successfully',
      data: updatedDog.toJSON()
    });
  });

  // Delete dog (soft delete)
  static deleteDog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const dog = await Dog.findById(id);
    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }
    
    await dog.delete();
    
    res.status(200).json({
      success: true,
      message: 'Dog deleted successfully'
    });
  });

  // Hard delete dog (admin only)
  static hardDeleteDog = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const dog = await Dog.findById(id);
    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }
    
    await dog.hardDelete();
    
    res.status(200).json({
      success: true,
      message: 'Dog permanently deleted'
    });
  });

  // Get dog's owner
  static getDogOwner = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const dog = await Dog.findById(id);
    if (!dog) {
      return res.status(404).json({
        success: false,
        message: 'Dog not found'
      });
    }
    
    const owner = await dog.getOwner();
    
    res.status(200).json({
      success: true,
      data: {
        dog: dog.toJSON(),
        owner
      }
    });
  });

  // Search dogs
  static searchDogs = asyncHandler(async (req, res) => {
    const { q, ...filters } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const dogs = await Dog.search(q, filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      query: q,
      data: dogs
    });
  });

  // Get dogs by size
  static getDogsBySize = asyncHandler(async (req, res) => {
    const { size } = req.params;
    const filters = { ...req.query, size };
    
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      size,
      data: dogs
    });
  });

  // Get dogs by energy level
  static getDogsByEnergyLevel = asyncHandler(async (req, res) => {
    const { energyLevel } = req.params;
    const filters = { ...req.query, energy_level: energyLevel };
    
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      energy_level: energyLevel,
      data: dogs
    });
  });

  // Get dogs by breed
  static getDogsByBreed = asyncHandler(async (req, res) => {
    const { breed } = req.params;
    const filters = { ...req.query, breed };
    
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      breed,
      data: dogs
    });
  });

  // Get friendly dogs (good with other dogs and children)
  static getFriendlyDogs = asyncHandler(async (req, res) => {
    const filters = {
      ...req.query,
      is_friendly_with_other_dogs: true,
      is_friendly_with_children: true
    };
    
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      data: dogs
    });
  });

  // Get breed statistics
  static getBreedStats = asyncHandler(async (req, res) => {
    const stats = await Dog.getBreedStats();
    
    res.status(200).json({
      success: true,
      count: stats.length,
      data: stats
    });
  });

  // Get size statistics
  static getSizeStats = asyncHandler(async (req, res) => {
    const stats = await Dog.getSizeStats();
    
    res.status(200).json({
      success: true,
      count: stats.length,
      data: stats
    });
  });

  // Get high energy dogs
  static getHighEnergyDogs = asyncHandler(async (req, res) => {
    const filters = { ...req.query, energy_level: 'high' };
    const dogs = await Dog.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      data: dogs
    });
  });

  // Get senior dogs (age 7+)
  static getSeniorDogs = asyncHandler(async (req, res) => {
    const sql = `
      SELECT 
        d.id, d.owner_id, d.name, d.breed, d.age, d.size, d.temperament,
        d.special_needs, d.medical_notes, d.profile_image_url,
        d.is_friendly_with_other_dogs, d.is_friendly_with_children,
        d.energy_level, d.created_at, d.updated_at, d.is_active,
        u.name as owner_name, u.email as owner_email, u.phone as owner_phone
      FROM dogs d
      JOIN users u ON d.owner_id = u.id
      WHERE d.is_active = TRUE AND u.is_active = TRUE AND d.age >= 7
      ORDER BY d.age DESC
    `;
    
    const { executeQuery } = require('../config/database');
    const dogs = await executeQuery(sql);
    
    res.status(200).json({
      success: true,
      count: dogs.length,
      data: dogs
    });
  });
}

module.exports = DogController;

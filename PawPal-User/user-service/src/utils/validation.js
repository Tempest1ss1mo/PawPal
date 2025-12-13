const Joi = require('joi');

// User validation schemas
const userSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(150).required(),
    role: Joi.string().valid('owner', 'walker').required(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    location: Joi.string().max(200).optional(),
    profile_image_url: Joi.string().uri().max(500).optional(),
    bio: Joi.string().max(1000).optional()
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().max(150).optional(),
    role: Joi.string().valid('owner', 'walker').optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    location: Joi.string().max(200).optional(),
    profile_image_url: Joi.string().uri().max(500).optional(),
    bio: Joi.string().max(1000).optional(),
    rating: Joi.number().min(0).max(5).precision(2).optional(),
    total_reviews: Joi.number().integer().min(0).optional()
  }),

  query: Joi.object({
    role: Joi.string().valid('owner', 'walker').optional(),
    location: Joi.string().optional(),
    is_active: Joi.boolean().optional(),
    min_rating: Joi.number().min(0).max(5).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    role: Joi.string().valid('owner', 'walker').optional(),
    limit: Joi.number().integer().min(1).max(50).optional()
  })
};

// Dog validation schemas
const dogSchemas = {
  create: Joi.object({
    owner_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(50).required(),
    breed: Joi.string().max(50).optional(),
    age: Joi.number().integer().min(0).max(30).optional(),
    size: Joi.string().valid('small', 'medium', 'large', 'extra_large').required(),
    temperament: Joi.string().max(200).optional(),
    special_needs: Joi.string().max(1000).optional(),
    medical_notes: Joi.string().max(1000).optional(),
    profile_image_url: Joi.string().uri().max(500).optional(),
    is_friendly_with_other_dogs: Joi.boolean().default(true),
    is_friendly_with_children: Joi.boolean().default(true),
    energy_level: Joi.string().valid('low', 'medium', 'high').default('medium')
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(50).optional(),
    breed: Joi.string().max(50).optional(),
    age: Joi.number().integer().min(0).max(30).optional(),
    size: Joi.string().valid('small', 'medium', 'large', 'extra_large').optional(),
    temperament: Joi.string().max(200).optional(),
    special_needs: Joi.string().max(1000).optional(),
    medical_notes: Joi.string().max(1000).optional(),
    profile_image_url: Joi.string().uri().max(500).optional(),
    is_friendly_with_other_dogs: Joi.boolean().optional(),
    is_friendly_with_children: Joi.boolean().optional(),
    energy_level: Joi.string().valid('low', 'medium', 'high').optional()
  }),

  query: Joi.object({
    owner_id: Joi.number().integer().positive().optional(),
    size: Joi.string().valid('small', 'medium', 'large', 'extra_large').optional(),
    breed: Joi.string().optional(),
    energy_level: Joi.string().valid('low', 'medium', 'high').optional(),
    is_friendly_with_other_dogs: Joi.boolean().optional(),
    is_friendly_with_children: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional()
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100).required(),
    size: Joi.string().valid('small', 'medium', 'large', 'extra_large').optional(),
    energy_level: Joi.string().valid('low', 'medium', 'high').optional(),
    owner_id: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().min(1).max(50).optional()
  })
};

// ID parameter validation
const idSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

module.exports = {
  userSchemas,
  dogSchemas,
  idSchema
};

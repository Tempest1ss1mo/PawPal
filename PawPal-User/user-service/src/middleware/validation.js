const { userSchemas, dogSchemas, idSchema } = require('../utils/validation');

// Generic validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data',
        details: errorDetails
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// User validation middlewares
const validateUserCreate = validate(userSchemas.create);
const validateUserUpdate = validate(userSchemas.update);
const validateUserQuery = validate(userSchemas.query, 'query');
const validateUserSearch = validate(userSchemas.search, 'query');

// Dog validation middlewares
const validateDogCreate = validate(dogSchemas.create);
const validateDogUpdate = validate(dogSchemas.update);
const validateDogQuery = validate(dogSchemas.query, 'query');
const validateDogSearch = validate(dogSchemas.search, 'query');

// ID validation middleware
const validateId = validate(idSchema, 'params');

// Email validation middleware
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid email format'
    });
  }

  next();
};

// Role validation middleware
const validateRole = (req, res, next) => {
  const { role } = req.body;
  
  if (!role) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Role is required'
    });
  }

  if (!['owner', 'walker'].includes(role)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Role must be either "owner" or "walker"'
    });
  }

  next();
};

// Pagination validation middleware
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  
  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Limit must be a number between 1 and 100'
    });
  }

  if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Offset must be a non-negative number'
    });
  }

  next();
};

module.exports = {
  validateUserCreate,
  validateUserUpdate,
  validateUserQuery,
  validateUserSearch,
  validateDogCreate,
  validateDogUpdate,
  validateDogQuery,
  validateDogSearch,
  validateId,
  validateEmail,
  validateRole,
  validatePagination
};

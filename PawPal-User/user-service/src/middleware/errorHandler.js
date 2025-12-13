const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry';
    if (err.sqlMessage.includes('email')) {
      message = 'Email already exists';
    }
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Referenced record not found';
  } else if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    statusCode = 400;
    message = 'Cannot delete record with existing references';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Database connection failed';
  } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 503;
    message = 'Database access denied';
  } else if (err.code === 'ER_BAD_DB_ERROR') {
    statusCode = 503;
    message = 'Database not found';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.message) {
    message = err.message;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
    details = null;
  }

  const errorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  };

  if (details) {
    errorResponse.details = details;
  }

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
    method: req.method
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};

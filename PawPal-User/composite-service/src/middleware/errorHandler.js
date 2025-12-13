/**
 * Error handling middleware for composite service
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Validation error';
    details = err.details;
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format';
  }

  // Send error response
  res.status(status).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };


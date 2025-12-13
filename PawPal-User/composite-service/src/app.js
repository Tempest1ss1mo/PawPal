const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const compositeRoutes = require('./routes/compositeRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'PawPal Composite Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    atomicServices: {
      userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      dogService: process.env.DOG_SERVICE_URL || 'http://localhost:3001'
    }
  });
});

// API routes
app.use('/api/composite', compositeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PawPal Composite Service API',
    version: '1.0.0',
    description: 'Aggregates and encapsulates User and Dog atomic microservices',
    health: '/health',
    endpoints: {
      'GET /api/composite/users/:id/complete': 'Get user with dogs and stats (parallel execution)',
      'GET /api/composite/users/:id/dogs': 'Get user with their dogs (parallel execution)',
      'GET /api/composite/users': 'Get all users with their dogs',
      'POST /api/composite/dogs': 'Create dog with foreign key validation',
      'PUT /api/composite/dogs/:id': 'Update dog with foreign key validation',
      'DELETE /api/composite/users/:id': 'Delete user and all their dogs (cascade)',
      'GET /api/composite/stats': 'Get aggregated statistics'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/composite/users/:id/complete',
      'GET /api/composite/users/:id/dogs',
      'GET /api/composite/users',
      'POST /api/composite/dogs',
      'PUT /api/composite/dogs/:id',
      'DELETE /api/composite/users/:id',
      'GET /api/composite/stats'
    ]
  });
});

// Start server
function startServer() {
  app.listen(PORT, () => {
    console.log(`🚀 PawPal Composite Service running on port ${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 User Service URL: ${process.env.USER_SERVICE_URL || 'http://localhost:3001'}`);
    console.log(`📡 Dog Service URL: ${process.env.DOG_SERVICE_URL || 'http://localhost:3001'}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();

module.exports = app;


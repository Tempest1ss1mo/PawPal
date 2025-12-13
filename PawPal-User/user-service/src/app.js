const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const dogRoutes = require('./routes/dogRoutes');
const swaggerRoutes = require('./routes/swaggerRoutes');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { connectDatabase } = require('./config/database');
const passport = require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy to correctly detect protocol (important for Swagger UI)
// Only trust first proxy (the load balancer/reverse proxy)
app.set('trust proxy', 1);

// Security middleware
// Use default helmet config but disable upgrade-insecure-requests to prevent HTTP->HTTPS upgrade
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      upgradeInsecureRequests: null  // Disable upgrade-insecure-requests to prevent HTTP->HTTPS upgrade
    }
  },
  crossOriginOpenerPolicy: false,  // Disable COOP to avoid warnings
  crossOriginResourcePolicy: false  // Disable CORP to allow resources
}));

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
    service: 'PawPal User Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogRoutes);
app.use('/api-docs', swaggerRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PawPal User Service API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      users: '/api/users',
      dogs: '/api/dogs'
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
      'GET /api-docs',
      'GET /api/users',
      'POST /api/users',
      'GET /api/users/:id',
      'PUT /api/users/:id',
      'DELETE /api/users/:id',
      'GET /api/dogs',
      'POST /api/dogs',
      'GET /api/dogs/:id',
      'PUT /api/dogs/:id',
      'DELETE /api/dogs/:id'
    ]
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database (skip if in demo mode)
    if (process.env.SKIP_DB !== 'true') {
      await connectDatabase();
      console.log('✅ Database connected successfully');
    } else {
      console.log('⚠️  Skipping database connection (demo mode)');
      console.log('⚠️  WARNING: Service will fail if database is required');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 PawPal User Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('❌ Database connection is required. Please check your database configuration.');
    process.exit(1);
  }
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

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    service: 'PawPal User Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'Not connected (demo mode)'
  });
});

// Mock data for demonstration
const mockUsers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@email.com',
    role: 'owner',
    phone: '555-0101',
    location: 'Downtown Seattle, WA',
    bio: 'Dog lover and busy professional looking for reliable walkers',
    rating: 0.00,
    total_reviews: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: 2,
    name: 'Alex Thompson',
    email: 'alex.thompson@email.com',
    role: 'walker',
    phone: '555-0201',
    location: 'Downtown Seattle, WA',
    bio: 'Professional dog walker with 5 years experience. Love all breeds!',
    rating: 4.8,
    total_reviews: 127,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  }
];

const mockDogs = [
  {
    id: 1,
    owner_id: 1,
    name: 'Buddy',
    breed: 'Golden Retriever',
    age: 3,
    size: 'large',
    temperament: 'Friendly, energetic, loves treats',
    special_needs: 'Needs medication twice daily',
    energy_level: 'high',
    is_friendly_with_other_dogs: true,
    is_friendly_with_children: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  },
  {
    id: 2,
    owner_id: 1,
    name: 'Luna',
    breed: 'Border Collie',
    age: 2,
    size: 'medium',
    temperament: 'Intelligent, active, needs mental stimulation',
    special_needs: 'Prefers quiet environments',
    energy_level: 'high',
    is_friendly_with_other_dogs: true,
    is_friendly_with_children: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_active: true
  }
];

// Mock API endpoints
app.get('/api/users', (req, res) => {
  const { role, limit } = req.query;
  let users = mockUsers;
  
  if (role) {
    users = users.filter(user => user.role === role);
  }
  
  if (limit) {
    users = users.slice(0, parseInt(limit));
  }
  
  res.json({
    success: true,
    count: users.length,
    data: users,
    message: 'Demo mode - using mock data'
  });
});

app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const user = mockUsers.find(u => u.id === parseInt(id));
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  res.json({
    success: true,
    data: user,
    message: 'Demo mode - using mock data'
  });
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: mockUsers.length + 1,
    ...req.body,
    rating: 0.00,
    total_reviews: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };
  
  mockUsers.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'User created successfully (demo mode)',
    data: newUser
  });
});

app.get('/api/dogs', (req, res) => {
  const { owner_id, limit } = req.query;
  let dogs = mockDogs;
  
  if (owner_id) {
    dogs = dogs.filter(dog => dog.owner_id === parseInt(owner_id));
  }
  
  if (limit) {
    dogs = dogs.slice(0, parseInt(limit));
  }
  
  res.json({
    success: true,
    count: dogs.length,
    data: dogs,
    message: 'Demo mode - using mock data'
  });
});

app.get('/api/dogs/:id', (req, res) => {
  const { id } = req.params;
  const dog = mockDogs.find(d => d.id === parseInt(id));
  
  if (!dog) {
    return res.status(404).json({
      success: false,
      message: 'Dog not found'
    });
  }
  
  res.json({
    success: true,
    data: dog,
    message: 'Demo mode - using mock data'
  });
});

app.post('/api/dogs', (req, res) => {
  const newDog = {
    id: mockDogs.length + 1,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };
  
  mockDogs.push(newDog);
  
  res.status(201).json({
    success: true,
    message: 'Dog created successfully (demo mode)',
    data: newDog
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PawPal User Service API',
    version: '1.0.0',
    status: 'Demo Mode - No Database Connection',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      users: '/api/users',
      dogs: '/api/dogs'
    },
    note: 'This is a demonstration version using mock data. Connect to a MySQL database for full functionality.'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/users',
      'POST /api/users',
      'GET /api/users/:id',
      'GET /api/dogs',
      'POST /api/dogs',
      'GET /api/dogs/:id'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PawPal User Service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⚠️  Demo Mode: Using mock data (no database connection)`);
});

module.exports = app;

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

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
  origin: ['http://localhost:3000', 'file://'],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data for demo
const mockUsers = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    role: "owner",
    phone: "+1234567890",
    location: "Seattle, WA",
    profile_image_url: "https://example.com/john.jpg",
    bio: "Dog lover and busy professional",
    rating: 4.8,
    total_reviews: 127,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    is_active: true
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    role: "walker",
    phone: "+1234567891",
    location: "Portland, OR",
    profile_image_url: "https://example.com/jane.jpg",
    bio: "Professional dog walker with 5 years experience",
    rating: 4.9,
    total_reviews: 89,
    created_at: "2024-01-02T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
    is_active: true
  }
];

const mockDogs = [
  {
    id: 1,
    owner_id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age: 3,
    size: "large",
    temperament: "Friendly, energetic, loves treats",
    special_needs: "Needs medication twice daily",
    medical_notes: "Allergic to chicken",
    profile_image_url: "https://example.com/buddy.jpg",
    is_friendly_with_other_dogs: true,
    is_friendly_with_children: true,
    energy_level: "high",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    is_active: true
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'PawPal User Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    mode: 'DEMO'
  });
});

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'PawPal User Service API Documentation',
    version: '1.0.0',
    endpoints: {
      users: {
        'GET /api/users': 'Get all users',
        'POST /api/users': 'Create new user',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user',
        'DELETE /api/users/:id': 'Delete user (soft delete)',
        'GET /api/users/search': 'Search users',
        'GET /api/users/walkers': 'Get all walkers',
        'GET /api/users/owners': 'Get all owners',
        'GET /api/users/top-walkers': 'Get top-rated walkers',
        'GET /api/users/:id/dogs': 'Get user\'s dogs',
        'GET /api/users/:id/stats': 'Get user statistics'
      },
      dogs: {
        'GET /api/dogs': 'Get all dogs',
        'POST /api/dogs': 'Create new dog',
        'GET /api/dogs/:id': 'Get dog by ID',
        'PUT /api/dogs/:id': 'Update dog',
        'DELETE /api/dogs/:id': 'Delete dog (soft delete)',
        'GET /api/dogs/search': 'Search dogs',
        'GET /api/dogs/owner/:ownerId': 'Get dogs by owner',
        'GET /api/dogs/size/:size': 'Get dogs by size',
        'GET /api/dogs/energy/:energyLevel': 'Get dogs by energy level',
        'GET /api/dogs/friendly': 'Get friendly dogs',
        'GET /api/dogs/high-energy': 'Get high energy dogs',
        'GET /api/dogs/senior': 'Get senior dogs (age 7+)',
        'GET /api/dogs/stats/breeds': 'Get breed statistics',
        'GET /api/dogs/stats/sizes': 'Get size statistics'
      }
    }
  });
});

// User routes - specific routes first to avoid conflicts
app.get('/api/users/walkers', (req, res) => {
  const walkers = mockUsers.filter(user => user.role === 'walker');
  res.json({
    success: true,
    count: walkers.length,
    data: walkers
  });
});

app.get('/api/users/owners', (req, res) => {
  const owners = mockUsers.filter(user => user.role === 'owner');
  res.json({
    success: true,
    count: owners.length,
    data: owners
  });
});

app.get('/api/users/top-walkers', (req, res) => {
  const topWalkers = mockUsers
    .filter(user => user.role === 'walker' && user.rating >= 4.0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10);
    
  res.json({
    success: true,
    count: topWalkers.length,
    data: topWalkers
  });
});

app.get('/api/users/search', (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }
  
  const searchResults = mockUsers.filter(user => 
    user.name.toLowerCase().includes(q.toLowerCase()) ||
    user.email.toLowerCase().includes(q.toLowerCase()) ||
    user.location.toLowerCase().includes(q.toLowerCase()) ||
    user.bio.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json({
    success: true,
    count: searchResults.length,
    query: q,
    data: searchResults
  });
});

app.get('/api/users', (req, res) => {
  const { role, location, min_rating, limit } = req.query;
  let filteredUsers = [...mockUsers];
  
  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }
  
  if (location) {
    filteredUsers = filteredUsers.filter(user => 
      user.location.toLowerCase().includes(location.toLowerCase())
    );
  }
  
  if (min_rating) {
    filteredUsers = filteredUsers.filter(user => user.rating >= parseFloat(min_rating));
  }
  
  if (limit) {
    filteredUsers = filteredUsers.slice(0, parseInt(limit));
  }
  
  res.json({
    success: true,
    count: filteredUsers.length,
    data: filteredUsers
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
    data: user
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
    message: 'User created successfully',
    data: newUser
  });
});

// Dog routes
app.get('/api/dogs', (req, res) => {
  res.json({
    success: true,
    count: mockDogs.length,
    data: mockDogs
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
    data: dog
  });
});

app.get('/api/users/:id/dogs', (req, res) => {
  const { id } = req.params;
  const userDogs = mockDogs.filter(dog => dog.owner_id === parseInt(id));
  
  res.json({
    success: true,
    count: userDogs.length,
    data: userDogs
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'PawPal User Service API',
    version: '1.0.0',
    mode: 'DEMO',
    documentation: '/api-docs',
    health: '/health',
    endpoints: {
      users: '/api/users',
      dogs: '/api/dogs'
    }
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
      'GET /api-docs',
      'GET /api/users',
      'POST /api/users',
      'GET /api/users/:id',
      'GET /api/users/walkers',
      'GET /api/users/owners',
      'GET /api/users/top-walkers',
      'GET /api/users/search',
      'GET /api/users/:id/dogs',
      'GET /api/dogs',
      'GET /api/dogs/:id'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PawPal User Service DEMO running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌐 Environment: DEMO MODE`);
});

module.exports = app;

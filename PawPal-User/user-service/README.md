# PawPal User Service

A microservice for managing users and dogs in the PawPal dog-walking coordination platform.

## 🚀 Features

### Core Features
- **User Management**: CRUD operations for both dog owners and walkers
- **Dog Management**: CRUD operations for dog profiles linked to owners
- **Advanced Search**: Search users and dogs with various filters
- **Statistics**: Get breed and size statistics for dogs
- **OpenAPI Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Validation**: Comprehensive input validation using Joi
- **Error Handling**: Structured error responses with proper HTTP status codes
- **Rate Limiting**: Built-in rate limiting for API protection
- **Health Checks**: Health monitoring endpoints

### Sprint 2 Features (REST API Best Practices)
- **ETag Support**: Conditional requests with ETag headers for caching and optimistic concurrency
- **Query Parameters**: Full query parameter support for all collection resources
- **Pagination**: Complete pagination with page, limit, total count, and navigation links
- **HATEOAS Links**: Hypermedia links in responses for resource navigation
- **201 Created**: Proper POST responses with Location header
- **202 Accepted**: Asynchronous operations with task status polling
- **Relative Paths**: All links use relative paths for portability

## 📋 Prerequisites

- Node.js 16+ 
- MySQL 8.0+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd user-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up the database**:
   ```bash
   # Make sure MySQL is running
   # Run the database setup from the parent directory
   cd ..
   mysql -u root -p < database/schema.sql
   mysql -u root -p pawpal_db < database/sample_data.sql
   ```

5. **Start the service**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `DB_NAME` | Database name | `pawpal_db` |
| `DB_USERNAME` | Database username | `pawpal_user` |
| `DB_PASSWORD` | Database password | `pawpal_secure_2024!` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## 📚 API Documentation

Once the service is running, visit:
- **Swagger UI**: http://localhost:3001/api-docs
- **OpenAPI JSON**: http://localhost:3001/api-docs/swagger.json
- **Health Check**: http://localhost:3001/health

## 🛣️ API Endpoints

### Users

| Method | Endpoint | Description | Features |
|--------|----------|-------------|----------|
| `GET` | `/api/users` | Get all users | Pagination, Query params, ETag, Links |
| `POST` | `/api/users` | Create new user | 201 Created, Location header |
| `GET` | `/api/users/:id` | Get user by ID | ETag, Links |
| `PUT` | `/api/users/:id` | Update user | ETag conditional update |
| `DELETE` | `/api/users/:id` | Delete user (soft delete) | - |
| `GET` | `/api/users/search` | Search users | Pagination, Links |
| `GET` | `/api/users/walkers` | Get all walkers | Pagination, Query params, Links |
| `GET` | `/api/users/owners` | Get all owners | Pagination, Query params, Links |
| `GET` | `/api/users/top-walkers` | Get top-rated walkers | Pagination, Links |
| `GET` | `/api/users/:id/dogs` | Get user's dogs | Links |
| `GET` | `/api/users/:id/stats` | Get user statistics | Links |
| `POST` | `/api/users/bulk-import` | Bulk import users | 202 Accepted, Async task |
| `GET` | `/api/users/tasks/:taskId` | Get async task status | Polling endpoint |
| `GET` | `/api/users/tasks/:taskId/result` | Get async task result | Result retrieval |

### Dogs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dogs` | Get all dogs |
| `POST` | `/api/dogs` | Create new dog |
| `GET` | `/api/dogs/:id` | Get dog by ID |
| `PUT` | `/api/dogs/:id` | Update dog |
| `DELETE` | `/api/dogs/:id` | Delete dog (soft delete) |
| `GET` | `/api/dogs/search` | Search dogs |
| `GET` | `/api/dogs/owner/:ownerId` | Get dogs by owner |
| `GET` | `/api/dogs/size/:size` | Get dogs by size |
| `GET` | `/api/dogs/energy/:energyLevel` | Get dogs by energy level |
| `GET` | `/api/dogs/friendly` | Get friendly dogs |
| `GET` | `/api/dogs/high-energy` | Get high energy dogs |
| `GET` | `/api/dogs/senior` | Get senior dogs (age 7+) |
| `GET` | `/api/dogs/stats/breeds` | Get breed statistics |
| `GET` | `/api/dogs/stats/sizes` | Get size statistics |

## 📊 Data Models

### User
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "owner",
  "phone": "+1234567890",
  "location": "Seattle, WA",
  "profile_image_url": "https://example.com/image.jpg",
  "bio": "Dog lover and busy professional",
  "rating": 4.8,
  "total_reviews": 127,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

### Dog
```json
{
  "id": 1,
  "owner_id": 1,
  "name": "Buddy",
  "breed": "Golden Retriever",
  "age": 3,
  "size": "large",
  "temperament": "Friendly, energetic, loves treats",
  "special_needs": "Needs medication twice daily",
  "medical_notes": "Allergic to chicken",
  "profile_image_url": "https://example.com/dog.jpg",
  "is_friendly_with_other_dogs": true,
  "is_friendly_with_children": true,
  "energy_level": "high",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z",
  "is_active": true
}
```

## 🔍 Query Parameters

### User Filters
- `role`: Filter by user role (`owner` or `walker`)
- `location`: Filter by location (partial match)
- `min_rating`: Minimum rating filter
- `is_active`: Filter by active status
- `page`: Page number (default: 1) - used with `limit` for pagination
- `limit`: Number of results per page (1-100, default: 10)
- `offset`: Number of results to skip (alternative to `page`)

### Pagination
All collection endpoints support pagination:
- Use `page` and `limit` for page-based pagination
- Response includes: `total`, `page`, `limit`, `totalPages`, and navigation `links`
- Links include: `first`, `prev`, `next`, `last`, `self`, `collection`

### Dog Filters
- `owner_id`: Filter by owner ID
- `size`: Filter by size (`small`, `medium`, `large`, `extra_large`)
- `breed`: Filter by breed (partial match)
- `energy_level`: Filter by energy level (`low`, `medium`, `high`)
- `is_friendly_with_other_dogs`: Filter by friendliness with other dogs
- `is_friendly_with_children`: Filter by friendliness with children
- `limit`: Number of results (1-100)
- `offset`: Number of results to skip

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🐳 Docker Support

The service can be run with Docker using the provided `docker-compose.yml` in the parent directory:

```bash
# From the parent directory
docker-compose up -d
```

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Cloud Compute (VM) Deployment
This service is designed to be deployed on Google Cloud Compute Engine (VM).

**Quick Start:**
```bash
# Run deployment script
./deploy.sh

# Or follow detailed instructions
# See DEPLOYMENT.md for complete guide
```

**Detailed Deployment Guide:**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions on:
- Creating and configuring VM instance
- Installing dependencies
- Setting up MySQL database
- Configuring systemd service
- Setting up Nginx reverse proxy
- Monitoring and maintenance

**Key Requirements:**
- Node.js 16+ installed on VM
- MySQL database (can be on same VM or separate)
- Environment variables configured in `.env` file
- Firewall rules configured for HTTP/HTTPS access

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start the service in production mode |
| `npm run dev` | Start the service in development mode with auto-reload |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run docs` | Generate OpenAPI documentation |

## 🔒 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Comprehensive validation using Joi schemas
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable allowed origins
- **Helmet**: Security headers
- **Error Handling**: No sensitive data exposure in production
- **ETag Validation**: Conditional updates prevent race conditions

## 📡 REST API Best Practices (Sprint 2)

### ETag Support
- **GET requests**: Include `If-None-Match` header to get 304 Not Modified if resource unchanged
- **PUT requests**: Include `If-Match` header for optimistic concurrency control
- Example:
  ```bash
  # Get resource with ETag
  curl -H "If-None-Match: \"abc123\"" http://localhost:3001/api/users/1
  
  # Update with ETag check
  curl -X PUT -H "If-Match: \"abc123\"" -H "Content-Type: application/json" \
    -d '{"name":"Updated Name"}' http://localhost:3001/api/users/1
  ```

### Pagination
- All collection endpoints support pagination with `page` and `limit` parameters
- Response includes navigation links and metadata
- Example:
  ```bash
  curl "http://localhost:3001/api/users?page=1&limit=10"
  ```

### HATEOAS Links
- All responses include `links` object with resource navigation
- Links use relative paths for portability
- Example response:
  ```json
  {
    "success": true,
    "data": {...},
    "links": {
      "self": {"href": "/api/users/1"},
      "collection": {"href": "/api/users"}
    }
  }
  ```

### 201 Created
- POST requests return 201 status code
- `Location` header points to created resource
- Response body includes created resource with links

### 202 Accepted (Async Operations)
- Bulk operations return 202 Accepted with task ID
- Poll task status: `GET /api/users/tasks/:taskId`
- Get result when complete: `GET /api/users/tasks/:taskId/result`
- Example:
  ```bash
  # Start bulk import
  curl -X POST -H "Content-Type: application/json" \
    -d '{"users":[...]}' http://localhost:3001/api/users/bulk-import
  # Returns: {"task": {"id": "task_123", "status": "pending", ...}}
  
  # Poll status
  curl http://localhost:3001/api/users/tasks/task_123
  
  # Get result when completed
  curl http://localhost:3001/api/users/tasks/task_123/result
  ```

## 📈 Monitoring

- **Health Check**: `/health` endpoint for service monitoring
- **Structured Logging**: Morgan for HTTP request logging
- **Error Tracking**: Comprehensive error handling and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the PawPal team at team@pawpal.com

## 🔄 Integration

This service integrates with other PawPal microservices:
- **Walk Service**: For walk scheduling and management
- **Review Service**: For user ratings and reviews
- **Notification Service**: For user notifications

The service exposes RESTful APIs that can be consumed by:
- Web frontend applications
- Mobile applications
- Other microservices
- Third-party integrations

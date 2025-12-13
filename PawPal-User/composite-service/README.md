# PawPal Composite Service

A composite microservice that aggregates and encapsulates the User and Dog atomic microservices, providing enhanced functionality with parallel execution and logical foreign key constraints.

## 🚀 Features

- **API Encapsulation**: Exposes atomic microservice APIs with additional functionality
- **Parallel Execution**: Uses Node.js worker threads for parallel API calls
- **Logical Foreign Key Constraints**: Validates relationships between entities (e.g., owner_id must exist)
- **Aggregated Endpoints**: Combines data from multiple atomic services
- **Cascade Operations**: Handles related entity operations (e.g., delete user and their dogs)

## 📋 Prerequisites

- Node.js 16+
- User Service and Dog Service atomic microservices running
- npm or yarn

## 🛠️ Installation

1. **Install dependencies**:
   ```bash
   cd composite-service
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your atomic service URLs
   ```

3. **Start the service**:
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
| `PORT` | Server port | `3002` |
| `USER_SERVICE_URL` | User atomic service URL | `http://localhost:3001` |
| `DOG_SERVICE_URL` | Dog atomic service URL | `http://localhost:3001` |
| `SERVICE_TIMEOUT` | Request timeout in ms | `5000` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

## 🛣️ API Endpoints

### Composite Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/composite/users/:id/complete` | Get user with dogs and stats (parallel execution) |
| `GET` | `/api/composite/users/:id/dogs` | Get user with their dogs (parallel execution) |
| `GET` | `/api/composite/users` | Get all users with their dogs |
| `POST` | `/api/composite/dogs` | Create dog with foreign key validation |
| `PUT` | `/api/composite/dogs/:id` | Update dog with foreign key validation |
| `DELETE` | `/api/composite/users/:id` | Delete user and all their dogs (cascade) |
| `GET` | `/api/composite/stats` | Get aggregated statistics |

## 🔑 Key Features Implementation

### 1. Parallel Execution with Worker Threads

The service uses Node.js worker threads to fetch data from multiple atomic services in parallel:

```javascript
// Example: Fetch user and dogs simultaneously
GET /api/composite/users/:id/dogs
```

This endpoint uses worker threads to call both the user service and dog service simultaneously, reducing total response time.

### 2. Logical Foreign Key Constraints

The service validates foreign key relationships before operations:

```javascript
// Example: Create dog with owner validation
POST /api/composite/dogs
{
  "owner_id": 1,
  "name": "Buddy",
  ...
}
```

Before creating the dog, the service validates that:
- The owner_id exists in the user service
- The user has the "owner" role
- Returns 404 if owner doesn't exist

### 3. Cascade Operations

The service handles related entity operations:

```javascript
// Example: Delete user and all their dogs
DELETE /api/composite/users/:id
```

This operation:
1. Fetches all dogs for the user
2. Deletes all dogs in parallel
3. Deletes the user
4. Returns summary of deleted entities

## 📊 Architecture

```
┌─────────────────────────────────────┐
│   Composite Service (Port 3002)    │
├─────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │   Composite Controllers       │  │
│  │   - Parallel Execution       │  │
│  │   - Foreign Key Validation   │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   Worker Threads             │  │
│  │   - Parallel API Calls       │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │   Service Clients            │  │
│  │   - UserServiceClient        │  │
│  │   - DogServiceClient         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
           │                    │
           ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  User Service    │  │   Dog Service   │
│  (Port 3001)     │  │   (Port 3001)   │
└──────────────────┘  └──────────────────┘
```

## 🧪 Testing

Test the composite service endpoints:

```bash
# Health check
curl http://localhost:3002/health

# Get user with dogs (parallel execution)
curl http://localhost:3002/api/composite/users/1/dogs

# Create dog with validation
curl -X POST http://localhost:3002/api/composite/dogs \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "name": "Buddy", "size": "large"}'

# Get aggregated stats
curl http://localhost:3002/api/composite/stats
```

## 📝 Notes

- The composite service assumes atomic services are running and accessible
- Worker threads are used for CPU-intensive parallel operations
- Foreign key validation is done logically (not at database level)
- All endpoints return consistent JSON responses with `success`, `message`, and `data` fields


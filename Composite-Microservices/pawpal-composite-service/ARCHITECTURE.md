# Architecture Overview

## Three Atomic Microservices + One Composite Service

This project implements a **composite microservice pattern** with three separate atomic microservices:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Composite Microservice                       │
│                    (Port 8002 - FastAPI)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - Orchestrates all three atomic services                │  │
│  │  - Foreign key constraint validation                    │  │
│  │  - Parallel execution with ThreadPoolExecutor           │  │
│  │  - Aggregated endpoints                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬──────────────────┬──────────────────┬───────────────────┘
        │                  │                  │
        │ HTTP             │ HTTP             │ HTTP
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│ Walk Service │  │ User Service  │  │Review Service│
│  Port 8000   │  │  Port 3001    │  │  Port 8001   │
│  (FastAPI)   │  │  (Express.js) │  │  (FastAPI)   │
│              │  │               │  │              │
│ Atomic       │  │ Atomic        │  │ Atomic       │
│ Microservice │  │ Microservice  │  │ Microservice │
└──────────────┘  └───────────────┘  └──────────────┘
```

## Atomic Microservices

### 1. Walk Service
- **Location**: `../Walk-Service-main/`
- **Technology**: FastAPI (Python)
- **Port**: 8000
- **Purpose**: Manages dog walk requests, assignments, and events
- **Storage**: In-memory (can connect to Cloud SQL)
- **Standalone**: Yes, can run independently

**Key Endpoints:**
- `POST /walks` - Create walk
- `GET /walks` - List walks
- `GET /walks/{id}` - Get walk
- `PATCH /walks/{id}` - Update walk
- `DELETE /walks/{id}` - Delete walk

### 2. User Service
- **Location**: `../Cloud-Computing-Database-xuanming/user-service/`
- **Technology**: Express.js (Node.js)
- **Port**: 3001
- **Purpose**: Manages users (owners and walkers) and dogs
- **Storage**: MySQL database
- **Standalone**: Yes, can run independently

**Key Endpoints:**
- `GET /api/users` - List users
- `GET /api/users/{id}` - Get user
- `GET /api/users/{id}/dogs` - Get user's dogs
- `POST /api/users` - Create user
- `POST /api/dogs` - Create dog

### 3. Review Service
- **Location**: `../PawPal-Review-main/`
- **Technology**: FastAPI (Python)
- **Port**: 8001
- **Purpose**: Manages reviews and ratings for walks
- **Storage**: MySQL database
- **Standalone**: Yes, can run independently

**Key Endpoints:**
- `POST /reviews` - Create review
- `GET /reviews` - List reviews
- `GET /reviews/{id}` - Get review
- `PATCH /reviews/{id}` - Update review
- `DELETE /reviews/{id}` - Delete review

## Composite Microservice

### Purpose
The composite service **encapsulates and orchestrates** all three atomic services, providing:

1. **Unified API** - Single entry point for all operations
2. **Foreign Key Validation** - Ensures data integrity across services
3. **Parallel Execution** - Uses threads for concurrent operations
4. **Aggregated Data** - Combines data from multiple services

### Key Features

#### 1. Delegation
All atomic service APIs are exposed through the composite service:
- Walk endpoints → Delegates to Walk Service
- User endpoints → Delegates to User Service
- Review endpoints → Delegates to Review Service

#### 2. Foreign Key Constraints
Validates relationships across services:
- When creating a review, validates:
  - `walkId` exists in Walk Service
  - `ownerId` exists in User Service
  - `walkerId` exists in User Service

#### 3. Parallel Execution
Uses `ThreadPoolExecutor` for concurrent operations:
- `GET /walks/{id}/complete` - Fetches walk + reviews in parallel
- `GET /users/{id}/complete` - Fetches user, dogs, and reviews using 3 threads
- `GET /reviews/{id}/complete` - Fetches review, walk, owner, walker using 3 threads

#### 4. Aggregated Endpoints
Provides higher-level operations:
- `/walks/{id}/complete` - Walk with all related reviews
- `/users/{id}/complete` - User with dogs and all reviews
- `/reviews/{id}/complete` - Review with walk, owner, and walker details

## Data Flow

### Example: Creating a Review

```
Client Request
    │
    ▼
┌─────────────────────────────────────┐
│ Composite Service (Port 8002)      │
│                                     │
│ 1. Validate Foreign Keys:           │
│    ├─ Check walkId in Walk Service  │
│    ├─ Check ownerId in User Service │
│    └─ Check walkerId in User Service│
│                                     │
│ 2. If valid, delegate to:           │
│    └─ Review Service                │
└─────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┐
    ▼                 ▼                 ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Walk Svc │  │ User Svc │  │Review Svc│
│ (8000)   │  │ (3001)   │  │ (8001)   │
└──────────┘  └──────────┘  └──────────┘
```

### Example: Get Complete User Info (Parallel Execution)

```
Client Request: GET /users/{id}/complete
    │
    ▼
┌─────────────────────────────────────┐
│ Composite Service                   │
│                                     │
│ ThreadPoolExecutor (3 threads):     │
│                                     │
│ Thread 1: Fetch user               │──┐
│ Thread 2: Fetch dogs                │──├─ Parallel
│ Thread 3: Fetch reviews            │──┘
│                                     │
│ Aggregate results and return        │
└─────────────────────────────────────┘
```

## Service Independence

Each atomic microservice:
- ✅ Can run independently
- ✅ Has its own database/storage
- ✅ Can be deployed separately
- ✅ Has its own API documentation
- ✅ Can be tested independently

The composite service:
- ✅ Orchestrates all three
- ✅ Does not store data (stateless)
- ✅ Validates relationships across services
- ✅ Provides unified API

## Deployment

### Development
Run all services locally:
1. Start Walk Service (port 8000)
2. Start User Service (port 3001)
3. Start Review Service (port 8001)
4. Start Composite Service (port 8002)

### Production
Each service can be deployed independently:
- Walk Service → Cloud Run / Docker
- User Service → VM / Docker
- Review Service → Cloud Run / Docker
- Composite Service → Cloud Run / Docker

The composite service only needs network access to the atomic services.


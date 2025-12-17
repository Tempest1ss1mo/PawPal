# PawPal Composite Microservice - Complete Setup Guide

This guide shows how to run all three **atomic microservices** separately, then run the **composite microservice** that orchestrates them all.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│     Composite Microservice (Port 8002)                 │
│     - Orchestrates all three atomic services           │
│     - Foreign key constraint validation                │
│     - Parallel execution with threads                   │
└──────────────┬──────────────┬──────────────┬───────────┘
               │              │              │
       ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
       │ Walk Service │ │User Service│ │Review Svc  │
       │  Port 8000   │ │ Port 3001  │ │ Port 8001  │
       │  (FastAPI)   │ │ (Express)  │ │ (FastAPI)  │
       └──────────────┘ └────────────┘ └────────────┘
```

## Prerequisites

- Python 3.8+
- Node.js 16+
- MySQL 8.0+ (for User and Review services)

## Step 1: Start Atomic Microservices

### Terminal 1: Walk Service (Port 8000)

```bash
cd Walk-Service-main
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Verify:** http://localhost:8000/docs

### Terminal 2: Review Service (Port 8001)

```bash
cd PawPal-Review-main
pip install -r requirements.txt
# Make sure MySQL is running and database is set up
uvicorn main:app --reload --port 8001
```

**Verify:** http://localhost:8001/docs

**Note:** Review service requires MySQL. See `PawPal-Review-main/README.md` for database setup.

### Terminal 3: User Service (Port 3001)

```bash
cd Cloud-Computing-Database-xuanming/user-service
npm install
# Make sure MySQL is running and database is set up
npm start
# Or: npm run dev
```

**Verify:** http://localhost:3001/health

**Note:** User service requires MySQL. See `Cloud-Computing-Database-xuanming/user-service/README.md` for database setup.

## Step 2: Start Composite Microservice

### Terminal 4: Composite Service (Port 8002)

```bash
cd pawpal-composite-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

**Verify:** http://localhost:8002/docs

## Environment Variables (Optional)

You can customize the service URLs:

```bash
export WALK_SERVICE_URL=http://localhost:8000
export REVIEW_SERVICE_URL=http://localhost:8001
export USER_SERVICE_URL=http://localhost:3001
export COMPOSITE_PORT=8002

uvicorn main:app --reload --port 8002
```

## Quick Start Script

Create a `start-all.sh` script to start all services:

```bash
#!/bin/bash

# Start Walk Service
cd Walk-Service-main
uvicorn main:app --reload --port 8000 &
WALK_PID=$!

# Start Review Service  
cd ../PawPal-Review-main
uvicorn main:app --reload --port 8001 &
REVIEW_PID=$!

# Start User Service
cd ../Cloud-Computing-Database-xuanming/user-service
npm start &
USER_PID=$!

# Start Composite Service
cd ../../pawpal-composite-service
uvicorn main:app --reload --port 8002 &
COMPOSITE_PID=$!

echo "All services started!"
echo "Walk Service: http://localhost:8000/docs (PID: $WALK_PID)"
echo "Review Service: http://localhost:8001/docs (PID: $REVIEW_PID)"
echo "User Service: http://localhost:3001/health (PID: $USER_PID)"
echo "Composite Service: http://localhost:8002/docs (PID: $COMPOSITE_PID)"
echo ""
echo "To stop all services: kill $WALK_PID $REVIEW_PID $USER_PID $COMPOSITE_PID"
```

## Testing the Composite Service

### 1. Test Walk Service Delegation

```bash
# Create a walk via composite service
curl -X POST http://localhost:8002/walks \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "11111111-1111-4111-8111-111111111111",
    "pet_id": "550e8400-e29b-41d4-a716-446655440000",
    "location": "123 Main St",
    "city": "New York",
    "scheduled_time": "2025-12-12T10:00:00Z",
    "duration_minutes": 30
  }'
```

### 2. Test User Service Delegation

```bash
# Get users via composite service
curl http://localhost:8002/users

# Get a specific user
curl http://localhost:8002/users/{user_id}
```

### 3. Test Review Service with FK Validation

```bash
# Create a review (validates walkId, ownerId, walkerId exist)
curl -X POST http://localhost:8002/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "walkId": "11111111-1111-4111-8111-111111111111",
    "ownerId": "user-123",
    "walkerId": "user-456",
    "rating": 4.5,
    "comment": "Great walk!"
  }'
```

### 4. Test Parallel Execution

```bash
# Get complete walk info (parallel execution)
curl http://localhost:8002/walks/{walk_id}/complete

# Get complete user info (parallel execution with 3 threads)
curl http://localhost:8002/users/{user_id}/complete

# Get complete review info (parallel execution with 3 threads)
curl http://localhost:8002/reviews/{review_id}/complete
```

## Service URLs Summary

| Service | Type | Port | URL |
|---------|------|------|-----|
| Walk Service | Atomic | 8000 | http://localhost:8000 |
| Review Service | Atomic | 8001 | http://localhost:8001 |
| User Service | Atomic | 3001 | http://localhost:3001 |
| Composite Service | Composite | 8002 | http://localhost:8002 |

## API Documentation

- **Walk Service**: http://localhost:8000/docs
- **Review Service**: http://localhost:8001/docs
- **User Service**: http://localhost:3001/api-docs
- **Composite Service**: http://localhost:8002/docs

## Troubleshooting

### Services not starting

1. **Check ports are available:**
   ```bash
   lsof -i :8000
   lsof -i :8001
   lsof -i :3001
   lsof -i :8002
   ```

2. **Check database connections:**
   - Review and User services need MySQL running
   - Verify database credentials in their respective `.env` files

3. **Check dependencies:**
   - Python services: `pip install -r requirements.txt`
   - User service: `npm install`

### Composite service can't connect to atomic services

1. Verify all atomic services are running
2. Check environment variables match actual service URLs
3. Test atomic services directly (e.g., `curl http://localhost:8000/`)

## Next Steps

- See `README.md` for detailed API documentation
- See `REQUIREMENTS_VERIFICATION.md` for requirements compliance
- Test all endpoints using the OpenAPI documentation at `/docs`


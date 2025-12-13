# Quick Start Guide - Sprint 2 Features

This guide provides quick examples for testing all Sprint 2 features.

## Prerequisites

1. Start the service:
   ```bash
   cd user-service
   npm install
   npm start
   ```

2. Service runs on `http://localhost:3001` (or port specified in `.env`)

## 1. ETag Support

### Test Conditional GET (304 Not Modified)

```bash
# First request - get ETag
RESPONSE=$(curl -i http://localhost:3001/api/users/1)
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')

# Second request with If-None-Match - should return 304
curl -i -H "If-None-Match: $ETAG" http://localhost:3001/api/users/1
```

### Test Conditional PUT (412 Precondition Failed)

```bash
# Get current ETag
RESPONSE=$(curl -i http://localhost:3001/api/users/1)
ETAG=$(echo "$RESPONSE" | grep -i "etag:" | cut -d' ' -f2 | tr -d '\r')

# Try to update with wrong ETag - should return 412
curl -X PUT -H "If-Match: \"wrong-etag\"" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}' \
  http://localhost:3001/api/users/1

# Update with correct ETag - should succeed
curl -X PUT -H "If-Match: $ETAG" \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}' \
  http://localhost:3001/api/users/1
```

## 2. Query Parameters

### Test Filtering

```bash
# Filter by role
curl "http://localhost:3001/api/users?role=walker"

# Filter by location
curl "http://localhost:3001/api/users?location=Seattle"

# Filter by minimum rating
curl "http://localhost:3001/api/users?min_rating=4.0"

# Combine filters
curl "http://localhost:3001/api/users?role=walker&min_rating=4.5&location=Portland"
```

## 3. Pagination

### Test Pagination

```bash
# Page 1
curl "http://localhost:3001/api/users?page=1&limit=5"

# Page 2
curl "http://localhost:3001/api/users?page=2&limit=5"

# Check pagination metadata in response:
# - total: total number of items
# - page: current page
# - limit: items per page
# - totalPages: total number of pages
# - links: navigation links (first, prev, next, last)
```

### Test with Different Collections

```bash
# Paginated walkers
curl "http://localhost:3001/api/users/walkers?page=1&limit=10"

# Paginated owners
curl "http://localhost:3001/api/users/owners?page=1&limit=10"

# Paginated top walkers
curl "http://localhost:3001/api/users/top-walkers?page=1&limit=5"
```

## 4. HATEOAS Links

### Check Links in Response

```bash
# Get user - check links object
curl http://localhost:3001/api/users/1 | jq '.data.links'

# Get collection - check links object
curl "http://localhost:3001/api/users?page=1&limit=5" | jq '.links'

# All responses include:
# - self: link to current resource
# - collection: link to collection (for individual resources)
# - first, prev, next, last: pagination links (for collections)
```

## 5. 201 Created

### Test POST with Location Header

```bash
# Create new user
RESPONSE=$(curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "role": "owner"
  }' \
  http://localhost:3001/api/users)

# Check response:
# - Status: 201 Created
# - Location header: /api/users/{id}
# - Body includes created resource with links
echo "$RESPONSE" | grep -i "location:"
echo "$RESPONSE" | grep -i "HTTP/"
```

## 6. 202 Accepted (Async Operations)

### Test Bulk Import with Polling

```bash
# Step 1: Start bulk import (returns 202 Accepted)
RESPONSE=$(curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "users": [
      {"name": "User 1", "email": "user1@example.com", "role": "owner"},
      {"name": "User 2", "email": "user2@example.com", "role": "walker"}
    ]
  }' \
  http://localhost:3001/api/users/bulk-import)

# Extract task ID from response
TASK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "Task ID: $TASK_ID"

# Step 2: Poll task status
curl "http://localhost:3001/api/users/tasks/$TASK_ID"

# Step 3: Get result when status is "completed"
curl "http://localhost:3001/api/users/tasks/$TASK_ID/result"
```

### Automated Polling Script

```bash
#!/bin/bash
# poll_task.sh - Poll task until completed

TASK_ID=$1
if [ -z "$TASK_ID" ]; then
  echo "Usage: poll_task.sh <task_id>"
  exit 1
fi

while true; do
  STATUS=$(curl -s "http://localhost:3001/api/users/tasks/$TASK_ID" | jq -r '.task.status')
  echo "Task status: $STATUS"
  
  if [ "$STATUS" = "completed" ]; then
    echo "Task completed! Getting result..."
    curl "http://localhost:3001/api/users/tasks/$TASK_ID/result"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "Task failed!"
    break
  fi
  
  sleep 2
done
```

## Complete Test Workflow

```bash
#!/bin/bash
# test_sprint2.sh - Complete Sprint 2 feature test

BASE_URL="http://localhost:3001"

echo "=== Testing Sprint 2 Features ==="

echo ""
echo "1. Testing ETag Support..."
curl -i "$BASE_URL/api/users/1" | grep -i "etag:"

echo ""
echo "2. Testing Query Parameters..."
curl -s "$BASE_URL/api/users?role=walker&limit=5" | jq '.count'

echo ""
echo "3. Testing Pagination..."
curl -s "$BASE_URL/api/users?page=1&limit=5" | jq '{page, limit, total, totalPages}'

echo ""
echo "4. Testing HATEOAS Links..."
curl -s "$BASE_URL/api/users/1" | jq '.data.links'

echo ""
echo "5. Testing 201 Created..."
curl -i -X POST \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","role":"owner"}' \
  "$BASE_URL/api/users" | grep -i "HTTP/"

echo ""
echo "6. Testing 202 Accepted..."
TASK_ID=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"users":[{"name":"Test","email":"test2@example.com","role":"owner"}]}' \
  "$BASE_URL/api/users/bulk-import" | jq -r '.task.id')
echo "Task ID: $TASK_ID"
sleep 3
curl -s "$BASE_URL/api/users/tasks/$TASK_ID" | jq '.task.status'

echo ""
echo "=== All tests completed ==="
```

## Using with jq (JSON processor)

For better output formatting, install `jq`:

```bash
# macOS
brew install jq

# Linux
sudo apt-get install jq

# Then use in commands:
curl -s http://localhost:3001/api/users/1 | jq '.'
```

## Health Check

Always verify service is running:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "service": "PawPal User Service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Troubleshooting

### Service not responding
- Check if service is running: `ps aux | grep node`
- Check logs for errors
- Verify port is not in use: `lsof -i :3001`

### Database connection issues
- Check `.env` file configuration
- Verify MySQL is running
- Test connection: `mysql -h <host> -u <user> -p`

### ETag not working
- Ensure headers are properly formatted (with quotes)
- Check response includes ETag header
- Verify If-None-Match/If-Match headers are sent correctly

### Async task not completing
- Check task status endpoint
- Verify task processing logic in `asyncTasks.js`
- Check service logs for errors


# PawPal Review Service - API Samples

Base URL: `API_ENDPOINT`


## Reviews

### Get All Reviews
```bash
# Basic list
curl API_ENDPOINT/reviews

# With pagination
curl "API_ENDPOINT/reviews?page=1&limit=5"

# Filter by walker (e.g., walker-bob)
curl "API_ENDPOINT/reviews?walkerId=walker-bob"

# Filter by owner (e.g., owner-alice)
curl "API_ENDPOINT/reviews?ownerId=owner-alice"

# Filter by rating range
curl "API_ENDPOINT/reviews?minRating=4.0&maxRating=5.0"
```

### Get Single Review
```bash
# Using sample review ID from database
curl API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001
```

### Create a Review
```bash
curl -X POST API_ENDPOINT/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "walkId": "walk-123",
    "ownerId": "owner-alice",
    "walkerId": "walker-bob",
    "rating": 4.5,
    "comment": "Great walk with my dog!"
  }'
```

### Update a Review
```bash
# Get current ETag first
ETAG=$(curl -s -D - API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001 | grep -i etag | cut -d' ' -f2 | tr -d '\r')

# Update with ETag
curl -X PATCH API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json" \
  -H "If-Match: $ETAG" \
  -d '{"rating": 5.0, "comment": "Updated comment"}'
```

### Delete a Review
```bash
curl -X DELETE API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001
```

## Analytics

### List All Jobs
```bash
# All jobs
curl API_ENDPOINT/analytics/jobs

# Filter by status
curl "API_ENDPOINT/analytics/jobs?status_filter=completed"
```

### Get Job Status
```bash
# Get full job details (using sample job ID)
curl API_ENDPOINT/analytics/jobs/job-550e8400-e29b-41d4-a716-446655440001

# Get status only
curl API_ENDPOINT/analytics/jobs/job-550e8400-e29b-41d4-a716-446655440001/status
```

### Generate Analytics Report (Async)
```bash
# Start new analytics job
curl -X POST API_ENDPOINT/analytics/generate
# Returns: {"jobId": "...", "status": "processing", ...}
```

## ETag Examples

### Conditional GET (304 Not Modified)
```bash
# First request - get ETag
ETAG=$(curl -s -D - API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001 | grep -i etag | cut -d' ' -f2 | tr -d '\r')

# Second request - use If-None-Match
curl -H "If-None-Match: $ETAG" API_ENDPOINT/reviews/550e8400-e29b-41d4-a716-446655440001
# Returns 304 if not modified
```

## Response Codes

- `200` - Success
- `201` - Created (POST /reviews)
- `202` - Accepted (POST /analytics/generate)
- `204` - No Content (DELETE)
- `304` - Not Modified (ETag match)
- `404` - Not Found
- `412` - Precondition Failed (ETag mismatch on update)

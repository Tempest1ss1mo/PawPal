# PawPal User Service - API Integration Guide

This document describes how the User Service microservice will interact with the PawPal database.

## Database Schema Overview

The User Service manages two main entities:

### Users Table
- **Purpose**: Stores both dog owners and walkers
- **Key Fields**: id, name, email, role, phone, location, rating, total_reviews
- **Relationships**: One-to-many with dogs (owners only)

### Dogs Table
- **Purpose**: Stores dog information linked to owners
- **Key Fields**: id, owner_id, name, breed, age, size, temperament, energy_level
- **Relationships**: Many-to-one with users (via owner_id)

## REST API Endpoints

The User Service will expose the following REST endpoints:

### User Management

#### GET /users
**Description**: Retrieve all users or filter by role
**Query Parameters**:
- `role` (optional): Filter by 'owner' or 'walker'
- `location` (optional): Filter by location
- `limit` (optional): Number of results to return
- `offset` (optional): Number of results to skip

**Response Example**:
```json
{
  "users": [
    {
      "id": 1,
      "name": "Sarah Johnson",
      "email": "sarah.johnson@email.com",
      "role": "owner",
      "phone": "555-0101",
      "location": "Downtown Seattle, WA",
      "rating": 0.00,
      "total_reviews": 0,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

#### GET /users/{id}
**Description**: Retrieve a specific user by ID
**Response Example**:
```json
{
  "id": 1,
  "name": "Sarah Johnson",
  "email": "sarah.johnson@email.com",
  "role": "owner",
  "phone": "555-0101",
  "location": "Downtown Seattle, WA",
  "bio": "Dog lover and busy professional",
  "rating": 0.00,
  "total_reviews": 0,
  "created_at": "2024-12-01T10:00:00Z",
  "updated_at": "2024-12-01T10:00:00Z"
}
```

#### POST /users
**Description**: Create a new user
**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john.doe@email.com",
  "role": "walker",
  "phone": "555-0123",
  "location": "Seattle, WA",
  "bio": "Experienced dog walker"
}
```

#### PUT /users/{id}
**Description**: Update an existing user
**Request Body**: Same as POST (partial updates supported)

#### DELETE /users/{id}
**Description**: Soft delete a user (set is_active = false)

### Dog Management

#### GET /dogs
**Description**: Retrieve all dogs or filter by owner
**Query Parameters**:
- `owner_id` (optional): Filter by owner ID
- `size` (optional): Filter by size ('small', 'medium', 'large', 'extra_large')
- `energy_level` (optional): Filter by energy level
- `limit`, `offset` (optional): Pagination

**Response Example**:
```json
{
  "dogs": [
    {
      "id": 1,
      "owner_id": 1,
      "name": "Buddy",
      "breed": "Golden Retriever",
      "age": 3,
      "size": "large",
      "temperament": "Friendly, energetic, loves treats",
      "energy_level": "high",
      "is_friendly_with_other_dogs": true,
      "is_friendly_with_children": true,
      "created_at": "2024-12-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### GET /dogs/{id}
**Description**: Retrieve a specific dog by ID

#### POST /dogs
**Description**: Create a new dog
**Request Body**:
```json
{
  "owner_id": 1,
  "name": "Max",
  "breed": "French Bulldog",
  "age": 2,
  "size": "small",
  "temperament": "Playful and friendly",
  "energy_level": "medium",
  "special_needs": "Needs shorter walks in hot weather"
}
```

#### PUT /dogs/{id}
**Description**: Update an existing dog

#### DELETE /dogs/{id}
**Description**: Soft delete a dog

### Utility Endpoints

#### GET /users/{id}/dogs
**Description**: Get all dogs for a specific owner
**Response**: Array of dog objects

#### GET /walkers/nearby
**Description**: Find walkers near a location
**Query Parameters**:
- `latitude`: Location latitude
- `longitude`: Location longitude
- `radius`: Search radius in miles (default: 10)

#### GET /health
**Description**: Health check endpoint
**Response**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-12-01T10:00:00Z"
}
```

## Database Queries

### Common SQL Queries for API Implementation

#### Get Users with Pagination
```sql
SELECT * FROM users 
WHERE is_active = TRUE 
ORDER BY created_at DESC 
LIMIT ? OFFSET ?;
```

#### Get Users by Role
```sql
SELECT * FROM users 
WHERE role = ? AND is_active = TRUE 
ORDER BY rating DESC;
```

#### Get Dogs with Owner Information
```sql
SELECT d.*, u.name as owner_name, u.email as owner_email
FROM dogs d
JOIN users u ON d.owner_id = u.id
WHERE d.is_active = TRUE AND u.is_active = TRUE;
```

#### Search Walkers by Location
```sql
SELECT *, 
  (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
   cos(radians(longitude) - radians(?)) + 
   sin(radians(?)) * sin(radians(latitude)))) AS distance
FROM users 
WHERE role = 'walker' AND is_active = TRUE
HAVING distance < ?
ORDER BY distance;
```

#### Update User Rating
```sql
UPDATE users 
SET rating = ?, total_reviews = total_reviews + 1, updated_at = CURRENT_TIMESTAMP
WHERE id = ?;
```

## Error Handling

### Standard Error Response Format
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID 123 not found",
    "timestamp": "2024-12-01T10:00:00Z"
  }
}
```

### Common Error Codes
- `USER_NOT_FOUND`: User ID doesn't exist
- `DOG_NOT_FOUND`: Dog ID doesn't exist
- `INVALID_EMAIL`: Email format is invalid
- `EMAIL_EXISTS`: Email already registered
- `INVALID_ROLE`: Role must be 'owner' or 'walker'
- `DATABASE_ERROR`: Internal database error
- `VALIDATION_ERROR`: Request validation failed

## Integration with Other Services

### Walk Service Integration
The Walk Service will need to:
1. Validate user IDs when creating walk requests
2. Check if users are active
3. Retrieve user information for walk assignments

### Review Service Integration
The Review Service will need to:
1. Update user ratings after reviews are created
2. Validate reviewer and reviewee IDs
3. Retrieve user information for review display

## Performance Considerations

### Database Indexes
The schema includes indexes on:
- `users.email` (unique)
- `users.role`
- `users.location`
- `users.rating`
- `dogs.owner_id`
- `dogs.size`
- `dogs.energy_level`

### Caching Strategy
Consider implementing caching for:
- Frequently accessed user profiles
- Walker search results
- Dog breed and size lists

### Connection Pooling
Use connection pooling to manage database connections efficiently.

## Security Considerations

### Input Validation
- Validate all input parameters
- Sanitize SQL queries (use parameterized queries)
- Check email format and uniqueness
- Validate role values

### Authentication & Authorization
- Implement JWT token validation
- Check user permissions for updates/deletes
- Validate ownership of resources (e.g., dog owners can only update their dogs)

### Data Protection
- Hash passwords (if storing passwords)
- Encrypt sensitive data in transit
- Implement rate limiting

## Testing

### Unit Tests
Test individual database operations:
- User CRUD operations
- Dog CRUD operations
- Search and filtering functions

### Integration Tests
Test API endpoints with database:
- End-to-end API calls
- Error handling scenarios
- Performance under load

### Database Tests
- Test with sample data
- Verify foreign key constraints
- Test transaction rollbacks

## Monitoring and Logging

### Key Metrics to Monitor
- Database connection count
- Query execution time
- Error rates by endpoint
- User registration/login rates

### Logging Requirements
- Log all API requests and responses
- Log database errors
- Log performance metrics
- Log security events (failed logins, etc.)

---

This integration guide provides the foundation for implementing the User Service microservice that will interact with the PawPal database.


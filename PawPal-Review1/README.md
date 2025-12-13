# PawPal Review Microservice

Microservice for managing reviews and ratings in PawPal dog-walking coordination system.

## Setup

### Installation

```bash
pip install -r requirements.txt
```

### Running the Server

Start the development server:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`

## API Endpoints

### Reviews

- `GET /reviews` - List all reviews
  - Query parameters: `walkerId`, `ownerId` (optional filters)
  
- `POST /reviews` - Create a new review
  - Body: `ReviewCreate` object (walkId, ownerId, walkerId, rating, comment)
  
- `GET /reviews/{reviewId}` - Get a specific review
  
- `PATCH /reviews/{reviewId}` - Update a review
  - Body: `ReviewUpdate` object (rating, comment)
  
- `DELETE /reviews/{reviewId}` - Delete a review

## Data Models

### Review
- `id`: string - Unique review identifier
- `walkId`: string - ID of the associated walk
- `ownerId`: string - ID of the dog owner who wrote the review
- `walkerId`: string - ID of the walker being reviewed
- `rating`: float - Rating from 1.0 to 5.0
- `comment`: string (optional) - Review comment
- `createdAt`: datetime - Timestamp when review was created
- `updatedAt`: datetime - Timestamp when review was last updated

### ReviewCreate
- `walkId`: string (required)
- `ownerId`: string (required)
- `walkerId`: string (required)
- `rating`: float (required, 1.0-5.0)
- `comment`: string (optional)

### ReviewUpdate
- `rating`: float (optional, 1.0-5.0)
- `comment`: string (optional)

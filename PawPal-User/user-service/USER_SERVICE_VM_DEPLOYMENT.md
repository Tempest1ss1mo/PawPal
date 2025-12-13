User Service:
- Deployed on: GCP Compute Engine VM (Ubuntu + Node.js + MariaDB)
- Port: 3001 (open via firewall)
- DB: local MariaDB on same VM, DB name = pawpal_user_db

user service base URL: http://34.9.57.25:3001

Swagger UI:
http://34.9.57.25:3001/api-docs/

Swagger JSON:
http://34.9.57.25:3001/api-docs/swagger.json


## API Summary – User & Dog Services

### User Endpoints (`/api/users`)

#### 1. Collection Operations

- `GET /api/users`  
  - Description: Get a list of users (supports pagination, filtering, and sorting).  
  - Query params:
    - `page`, `limit`
    - `role` (`owner` / `walker`)
    - `location`
    - `min_rating`
    - `sort`, `order`
  - Features:
    - Pagination metadata (`page`, `limit`, `total`, `totalPages`, etc.)
    - HATEOAS-style links (`links.self`, `links.collection`, pagination links)
    - ETag support on the collection (`ETag` header, `If-None-Match` → `304 Not Modified`)

- `POST /api/users`  
  - Description: Create a new user.  
  - Returns:
    - `201 Created`
    - `Location` header (URI of the created resource)
    - `ETag` header for the new resource

- `POST /api/users/bulk-import`  
  - Description: Bulk import multiple users.  
  - Behavior:
    - Asynchronous operation  
    - Returns `202 Accepted` with a `taskId` for status polling.

#### 2. Search & Filter

- `GET /api/users/search` – Search users by various criteria.  
- `GET /api/users/walkers` – Get all walkers.  
- `GET /api/users/owners` – Get all owners.  
- `GET /api/users/top-walkers` – Get top-rated walkers.

#### 3. Single User Operations

- `GET /api/users/:id`  
  - Description: Get user details by ID.  
  - Features:
    - Supports `If-None-Match` for conditional GET (ETag).

- `GET /api/users/email/:email`  
  - Description: Get a user by email.

- `PUT /api/users/:id`  
  - Description: Update an existing user.  
  - Requirements:
    - Uses `If-Match` header for optimistic concurrency with ETag.  
    - On mismatch, may return `412 Precondition Failed`.

- `DELETE /api/users/:id`  
  - Description: Soft delete (e.g., mark user as inactive).

- `DELETE /api/users/:id/hard`  
  - Description: Hard delete (permanently remove the user).

#### 4. Related Data

- `GET /api/users/:id/dogs` – Get all dogs owned by the user.  
- `GET /api/users/:id/stats` – Get user statistics (e.g., counts, ratings, etc.).

#### 5. Async Tasks

- `GET /api/users/tasks/:taskId`  
  - Description: Check the status of an asynchronous task (e.g., bulk import).

- `GET /api/users/tasks/:taskId/result`  
  - Description: Get the result of a completed async task.

---

### Dog Endpoints (`/api/dogs`)

#### 1. Collection Operations

- `GET /api/dogs`  
  - Description: Get a list of dogs (supports pagination and filtering).

- `POST /api/dogs`  
  - Description: Create a new dog.  
  - Note: `owner_id` should refer to a valid user (for logical FK constraints in the composite service).

#### 2. Search & Filter

- `GET /api/dogs/search` – Search dogs by various criteria.  
- `GET /api/dogs/friendly` – Get dogs marked as friendly.  
- `GET /api/dogs/high-energy` – Get high-energy dogs.  
- `GET /api/dogs/senior` – Get senior (older) dogs.  
- `GET /api/dogs/size/:size` – Get dogs by size.  
- `GET /api/dogs/energy/:energyLevel` – Get dogs by energy level.  
- `GET /api/dogs/breed/:breed` – Get dogs by breed.  
- `GET /api/dogs/owner/:ownerId` – Get all dogs owned by a specific owner.

#### 3. Statistics

- `GET /api/dogs/stats/breeds` – Aggregate statistics by breed.  
- `GET /api/dogs/stats/sizes` – Aggregate statistics by size.

#### 4. Single Dog Operations

- `GET /api/dogs/:id` – Get dog details by ID.  
- `PUT /api/dogs/:id` – Update a dog.  
- `DELETE /api/dogs/:id` – Soft delete a dog.  
- `DELETE /api/dogs/:id/hard` – Hard delete a dog.  
- `GET /api/dogs/:id/owner` – Get the owner of a specific dog (used by the composite service for cross-service aggregation).

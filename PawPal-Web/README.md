# PawPal Web Application

A cloud-native pet care platform that connects dog owners with professional dog walkers. Built with a microservices architecture and deployed on Google Cloud Platform.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Deployment Architecture](#deployment-architecture)
- [Key Features](#key-features)
- [API Endpoints](#api-endpoints)
- [Local Development](#local-development)
- [Cloud Deployment](#cloud-deployment)
- [Technical Highlights](#technical-highlights)
- [Troubleshooting](#troubleshooting)

---

## Overview

PawPal is a full-stack web application that enables:
- **Pet Owners**: Register, add pets, create walk requests, and leave reviews
- **Dog Walkers**: Browse available walks, accept jobs, and manage assignments

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, JavaScript, Google OAuth2 |
| Backend (BFF) | Python Flask, Flask-CORS |
| Composite Service | Python FastAPI, Pydantic v2 |
| Atomic Services | FastAPI (Walk, Review), Node.js Express (User) |
| Cloud Platform | Google Cloud Run, Cloud Storage, Cloud SQL |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │     Static Frontend (Google Cloud Storage)                   │    │
│  │     - Single Page Application (HTML/CSS/JS)                  │    │
│  │     - Google OAuth2 Integration                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST API (CORS enabled)
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND FOR FRONTEND (BFF)                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │     Web Backend - Flask (Cloud Run)                          │    │
│  │     - Session Management (SameSite=None, Secure=True)        │    │
│  │     - Request Routing & Aggregation                          │    │
│  │     - UUID Format Conversion                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────────┐   ┌──────────────────────────────┐
│     COMPOSITE SERVICE            │   │       USER SERVICE           │
│     FastAPI (Cloud Run)          │   │       Express.js             │
│  ┌────────────────────────────┐  │   │  ┌────────────────────────┐  │
│  │ - FK Constraint Validation │  │   │  │ - Google OAuth2        │  │
│  │ - Parallel Execution       │  │   │  │ - User CRUD            │  │
│  │ - Service Orchestration    │  │   │  │ - Dog Management       │  │
│  │ - ThreadPoolExecutor       │  │   │  │ - MySQL Database       │  │
│  └────────────────────────────┘  │   │  └────────────────────────┘  │
└──────────────────────────────────┘   └──────────────────────────────┘
            │
    ┌───────┴───────┐
    ▼               ▼
┌────────────┐  ┌────────────┐
│   WALK     │  │  REVIEW    │
│  SERVICE   │  │  SERVICE   │
│  FastAPI   │  │  FastAPI   │
│ (Cloud Run)│  │ (Cloud Run)│
│            │  │            │
│ In-memory  │  │  MySQL DB  │
│  Storage   │  │            │
└────────────┘  └────────────┘
```

### Data Flow

1. User accesses frontend on Cloud Storage
2. Frontend makes API calls to Web Backend (Cloud Run)
3. Web Backend routes requests to appropriate services:
   - `/walks`, `/reviews` → Composite Service
   - `/assignments` → Walk Atomic Service directly
   - `/users`, `/dogs`, `/auth` → User Service directly
4. Composite Service validates FK constraints and orchestrates atomic services
5. Response flows back through the chain

---

## Project Structure

```
PawPal/
├── PawPal-Web/                      # Web Application Layer
│   ├── app.py                       # Flask BFF backend (main file)
│   ├── requirements.txt             # Python dependencies
│   ├── Procfile                     # Cloud Run entrypoint
│   ├── templates/
│   │   └── index.html               # Server-side template
│   ├── static/
│   │   ├── css/style.css            # Styles
│   │   └── js/
│   │       ├── main.js              # Main application logic
│   │       └── demo.js              # Demo features
│   └── static-deploy/               # Production frontend (Cloud Storage)
│       ├── index.html               # SPA entry point
│       ├── config.js                # API URL configuration
│       ├── css/style.css
│       └── js/main.js
│
├── Composite-Microservices/         # Composite Service Layer
│   ├── pawpal-composite-service/
│   │   ├── main.py                  # FastAPI application
│   │   ├── constraints.py           # FK validation logic
│   │   ├── clients/                 # HTTP clients
│   │   │   ├── walk_client.py       # Walk Service client
│   │   │   ├── review_client.py     # Review Service client
│   │   │   └── user_client.py       # User Service client
│   │   └── services/
│   │       └── orchestration.py     # Parallel execution
│   ├── models/                      # Shared Pydantic models
│   │   ├── walk.py
│   │   ├── review.py
│   │   └── user.py
│   ├── Procfile                     # Cloud Run entrypoint
│   └── requirements.txt
│
├── PawPal-Walk/                     # Walk Atomic Service
│   ├── main.py                      # FastAPI endpoints
│   ├── models/
│   │   ├── walk.py                  # Walk data models
│   │   ├── assignment.py            # Walker assignments
│   │   └── event.py                 # Event logging
│   └── utils/
│       ├── db.py                    # Database connection
│       └── pubsub.py                # Google Pub/Sub (optional)
│
├── PawPal-Review/                   # Review Atomic Service
│   ├── main.py                      # FastAPI endpoints
│   ├── database.py                  # MySQL connection pool
│   └── utils.py                     # Helper functions (ETag)
│
└── PawPal-User/                     # User Atomic Service
    └── user-service/
        ├── src/
        │   ├── app.js               # Express application
        │   ├── routes/              # API routes
        │   ├── controllers/         # Business logic
        │   ├── models/              # Sequelize models
        │   └── config/              # Database, OAuth
        └── package.json
```

---

## Deployment Architecture

### Deployed Services

| Service | Platform | Port | URL Pattern |
|---------|----------|------|-------------|
| Frontend | Cloud Storage | - | `https://storage.googleapis.com/{bucket}/index.html` |
| Web Backend | Cloud Run | 5001 | `https://pawpal-web-backend-xxx.run.app` |
| Composite Service | Cloud Run | 8080 | `https://pawpal-composite-service-xxx.run.app` |
| Walk Service | Cloud Run | 8080 | `https://pawpal-walk-atomic-xxx.run.app` |
| Review Service | Cloud Run | 8080 | `https://pawpal-review-service-xxx.run.app` |
| User Service | Compute Engine | 3001 | `http://xx.xx.xx.xx:3001` |

### Environment Variables

**Web Backend:**
```bash
COMPOSITE_SERVICE_URL=https://pawpal-composite-service-xxx.run.app
WALK_ATOMIC_SERVICE_URL=https://pawpal-walk-atomic-xxx.run.app
USER_SERVICE_URL=http://xx.xx.xx.xx:3001
```

**Composite Service:**
```bash
WALK_SERVICE_URL=https://pawpal-walk-atomic-xxx.run.app
REVIEW_SERVICE_URL=https://pawpal-review-service-xxx.run.app
USER_SERVICE_URL=http://xx.xx.xx.xx:3001
```

---

## Key Features

### 1. Composite Service Pattern

The Composite Service provides:

**Foreign Key Validation:**
```python
async def validate_review_foreign_keys(walk_client, user_client, walk_id, owner_id, walker_id):
    # Validates walk exists in Walk Service
    await validate_walk_exists(walk_client, walk_uuid)
    # Validates owner exists in User Service
    await validate_user_exists(user_client, owner_id)
    # Validates walker exists in User Service
    await validate_user_exists(user_client, walker_id)
```

**Parallel Execution:**
```python
with ThreadPoolExecutor(max_workers=3) as executor:
    user_future = executor.submit(fetch_user)
    dogs_future = executor.submit(fetch_dogs)
    reviews_future = executor.submit(fetch_reviews)

    user = user_future.result()
    dogs = dogs_future.result()
    reviews = reviews_future.result()
```

### 2. Google OAuth2 Integration

- Users can sign in with Google accounts
- Session cookies configured for cross-origin support
- Automatic user creation on first OAuth login

### 3. CORS Configuration

```python
CORS(app,
     supports_credentials=True,
     origins=['*'],
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
     methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
```

### 4. UUID/Numeric ID Conversion

The User Service uses numeric IDs while other services use UUIDs. The Composite Service handles conversion:

```python
def extract_numeric_id(user_id: str) -> str:
    # Converts: 00000000-0000-0000-0000-000000000009 → "9"
    uuid_pattern = r'^0{8}-0{4}-0{4}-0{4}-0*(\d+)$'
    match = re.match(uuid_pattern, user_id)
    if match:
        return match.group(1)
    return user_id
```

---

## API Endpoints

### Web Backend (`/api/*`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Service health check |
| `/api/login` | POST | User login |
| `/api/signup` | POST | User registration |
| `/api/logout` | POST | User logout |
| `/api/pets` | GET/POST | Pet management |
| `/api/pets/<id>` | GET/PUT/DELETE | Single pet operations |
| `/api/walks` | GET/POST | Walk management |
| `/api/walks/<id>` | GET/PATCH/DELETE | Single walk operations |
| `/api/assignments` | GET/POST | Walker assignments |
| `/api/reviews` | GET/POST | Review management |

### Composite Service

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/walks` | GET/POST | Walk CRUD (delegated) |
| `/walks/{id}` | GET/PATCH/DELETE | Single walk |
| `/reviews` | GET/POST | Review CRUD with FK validation |
| `/reviews/{id}` | GET/PATCH/DELETE | Single review |
| `/users/{id}/complete` | GET | User with dogs & reviews (parallel) |
| `/walks/{id}/complete` | GET | Walk with reviews (parallel) |

---

## Local Development

### Prerequisites

- Python 3.9+
- Node.js 16+
- MySQL 8.0

### Setup

```bash
# Clone and enter directory
cd PawPal/PawPal-Web

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export USER_SERVICE_URL=http://localhost:3001
export COMPOSITE_SERVICE_URL=http://localhost:8002
export WALK_ATOMIC_SERVICE_URL=http://localhost:8000

# Run the application
python app.py
```

### Running All Services Locally

```bash
# Terminal 1: User Service
cd PawPal-User/user-service && npm start

# Terminal 2: Walk Service
cd PawPal-Walk && uvicorn main:app --port 8000

# Terminal 3: Review Service
cd PawPal-Review && uvicorn main:app --port 8001

# Terminal 4: Composite Service
cd Composite-Microservices/pawpal-composite-service && uvicorn main:app --port 8002

# Terminal 5: Web Backend
cd PawPal-Web && python app.py
```

---

## Cloud Deployment

### Deploy Walk Atomic Service

```bash
cd PawPal-Walk
gcloud run deploy pawpal-walk-atomic \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

### Deploy Composite Service

```bash
cd Composite-Microservices
gcloud run deploy pawpal-composite-service \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars="WALK_SERVICE_URL=https://pawpal-walk-atomic-xxx.run.app,REVIEW_SERVICE_URL=https://pawpal-review-service-xxx.run.app,USER_SERVICE_URL=http://xx.xx.xx.xx:3001"
```

### Deploy Web Backend

```bash
cd PawPal-Web
gcloud run deploy pawpal-web-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5001 \
  --set-env-vars="COMPOSITE_SERVICE_URL=https://pawpal-composite-service-xxx.run.app,WALK_ATOMIC_SERVICE_URL=https://pawpal-walk-atomic-xxx.run.app,USER_SERVICE_URL=http://xx.xx.xx.xx:3001"
```

### Deploy Frontend to Cloud Storage

```bash
# Create bucket
gsutil mb -l us-central1 gs://pawpal-frontend-xxx

# Set public access
gsutil iam ch allUsers:objectViewer gs://pawpal-frontend-xxx

# Update config.js with backend URL
# Then upload files
cd PawPal-Web/static-deploy
gsutil -m cp -r * gs://pawpal-frontend-xxx/

# Configure as website
gsutil web set -m index.html -e index.html gs://pawpal-frontend-xxx
```

---

## Technical Highlights

| Feature | Implementation |
|---------|---------------|
| API Framework | FastAPI with automatic OpenAPI docs (`/docs`) |
| Data Validation | Pydantic v2 with `model_dump(mode='json')` |
| Authentication | Google OAuth2 + Session-based |
| CORS | Flask-CORS with credentials support |
| Error Handling | Graceful degradation (Pub/Sub optional) |
| Serialization | Proper UUID/datetime JSON serialization |
| Deployment | Source-based with Cloud Run |

### Key Code Patterns

**Pydantic Serialization:**
```python
# Correct way to serialize for JSON requests
json=walk.model_dump(mode='json')
```

**Optional Pub/Sub:**
```python
try:
    from google.cloud import pubsub_v1
    publisher = pubsub_v1.PublisherClient()
except Exception as e:
    print(f"Warning: Pub/Sub not available: {e}")
    publisher = None
```

---

## Troubleshooting

### Common Issues

**"Expecting value: line 1 column 1 (char 0)"**
- JSON parsing error - response is empty or not JSON
- Check if the target service is running and accessible

**"id must be a number"**
- User Service expects numeric IDs, not UUIDs
- Ensure UUID-to-numeric conversion is working

**CORS Errors**
- Check `origins` in CORS configuration
- Verify `SameSite=None` and `Secure=True` for cookies

**Walk/Review not found (FK validation)**
- Walk Service uses in-memory storage - data lost on restart
- Create a new walk before creating a review

### Checking Service Health

```bash
# Test each service
curl https://pawpal-walk-atomic-xxx.run.app/
curl https://pawpal-composite-service-xxx.run.app/
curl https://pawpal-review-service-xxx.run.app/
curl http://xx.xx.xx.xx:3001/api/health
```

### Viewing Cloud Run Logs

```bash
gcloud run services logs read pawpal-composite-service --region us-central1 --limit 20
```

---

## Demo Flow

1. **Sign Up/Login** → User authenticates via Google OAuth2
2. **Add Pet** → Owner adds their dog's information
3. **Create Walk Request** → Owner specifies location, time, duration
4. **Walker Accepts** → Walker sees and accepts the walk
5. **Complete Walk** → Status updated to 'completed'
6. **Leave Review** → Owner reviews the walker (FK validation ensures walk exists)

---

## License

This project is part of the Cloud Computing course at Columbia University.

---

**PawPal - Connecting Pet Owners with Trusted Dog Walkers**

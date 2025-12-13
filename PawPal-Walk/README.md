# Walk Service – Cloud Run Microservice

The **Walk Service** is a standalone FastAPI microservice that models a simple dog-walking backend, providing RESTful endpoints for managing walk requests, walker assignments, and event logs. Designed as a lightweight cloud-native service, it runs inside a Docker container and is deployed on **Google Cloud Run**, which automatically scales the service without requiring manual server management. While the core CRUD logic uses in-memory storage for simplicity, the service also demonstrates real cloud integration by connecting to a **Google Cloud SQL (MySQL)** database through a secure Cloud SQL connector, enabling real-time database queries and supporting production-ready infrastructure.

---

## 🚀 Features

- FastAPI-based microservice  
- In-memory CRUD operations  
- Cloud SQL connection (`/test-db` endpoint)  
- Dockerized & deployable on Cloud Run  
- Auto-generated OpenAPI docs

---

## 📁 Project Structure

```
.
├── Dockerfile
├── main.py                    # Atomic microservice (port 8000)
├── composite-service/         # Composite microservice (port 8001)
│   ├── main.py               # Composite FastAPI app
│   ├── client.py             # HTTP client for atomic service
│   ├── constraints.py        # Foreign key constraint validation
│   └── requirements.txt      # Composite service dependencies
├── models/
├── services/
├── middleware/
├── framework/
├── resources/
├── utils/
│   ├── db.py
│   └── pubsub.py
├── requirements.txt
└── .gcloudignore
```

---

## 🐍 Running Locally

### 1. Create a virtual environment
```
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies
```
pip install -r requirements.txt
```

### 3. Start the service
```
uvicorn main:app --reload --port 8000
```

### 4. API Docs
Open:
```
http://localhost:8000/docs
```

---

## 🗄️ Cloud SQL Connection

Database credentials come from environment variables:

```
DB_USER
DB_PASS
DB_NAME
INSTANCE_CONNECTION_NAME
```

### Test endpoint
```
/test-db
```

If successful, you'll see MySQL server time.

---

## ☁️ Deploy to Cloud Run

### Build & push image
```
gcloud builds submit   --tag us-central1-docker.pkg.dev/PROJECT_ID/repo/walk-service
```

### Deploy
```
gcloud run deploy walk-service   --image us-central1-docker.pkg.dev/PROJECT_ID/repo/walk-service   --region us-central1   --platform managed   --allow-unauthenticated   --add-cloudsql-instances PROJECT_ID:us-central1:INSTANCE_NAME   --set-env-vars INSTANCE_CONNECTION_NAME=PROJECT_ID:us-central1:INSTANCE_NAME   --set-env-vars DB_USER=...   --set-env-vars DB_PASS=...   --set-env-vars DB_NAME=...
```

Service URL example:
```
https://walk-service-XXXX.us-central1.run.app
```

---

## 📘 API Documentation
Open:
```
/docs
```

---

## ⚡ Google Cloud Function & Event Triggering (Pub/Sub Integration)

This project includes a **Google Cloud Function** that is automatically triggered when the Walk Service publishes events to a **Pub/Sub topic**. This satisfies the requirement:  
**“Implement at least one Google Cloud Function and demonstrate triggering it via a microservice event.”**

---

### 1. Cloud Function: `walk-event-handler`

The function listens to the Pub/Sub topic **`walk-events`** and processes messages published by the Walk Service.

```python
def handle_walk_event(event, context):
    import base64
    import json

    if "data" in event:
        message_bytes = base64.b64decode(event["data"])
        message_json = json.loads(message_bytes.decode("utf-8"))
        print("Received walk event:", message_json)
    else:
        print("No event data received.")
```

### Deploy the function

```
gcloud functions deploy walk-event-handler     --region=us-central1     --runtime=python311     --trigger-topic=walk-events     --entry-point=handle_walk_event
```

---

## 2. Walk Service Publishes Events

Creating a walk triggers:

```python
publish_event("walk_created", new_walk_dict)
```

Example message:

```json
{
  "event_type": "walk_created",
  "walk": {
    "id": "uuid-string",
    "owner_id": "uuid-string",
    "walker_id": null,
    "city": "New York",
    "status": "requested",
    "scheduled_time": "2025-12-12T10:00:00Z",
    "duration_minutes": 30
  },
  "timestamp": "2025-12-12T04:34:12Z"
}
```

---

## 3. Triggering the Cloud Function

Send a POST request:

```
POST https://walk-service-XXXX.run.app/walks
Content-Type: application/json
```

Example payload:

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "owner_id": "22222222-2222-2222-2222-222222222222",
  "pet_id": "33333333-3333-3333-3333-333333333333",
  "location": "123 Main St, New York, NY",
  "city": "New York",
  "status": "requested",
  "scheduled_time": "2025-12-12T10:00:00Z",
  "duration_minutes": 30
}
```

View function logs:

```
gcloud functions logs read walk-event-handler --region=us-central1
```

You'll see:

```
Received walk event: {...}
```

---

## 🔗 Composite Microservice

This project implements a **composite microservice** that encapsulates and orchestrates the atomic Walk Service. The composite service adds:

- **Foreign Key Constraint Validation**: Enforces referential integrity (e.g., assignments and events must reference existing walks)
- **Orchestrated Endpoints**: Higher-level operations that coordinate multiple atomic service calls
- **Parallel Execution**: Uses threads for concurrent operations to improve performance

### Architecture

```
┌─────────────────────────────────────┐
│   Composite Service (Port 8001)     │
│   - FK Constraint Validation        │
│   - Orchestrated Operations          │
│   - Parallel Execution               │
└──────────────┬──────────────────────┘
               │ HTTP Calls
               ▼
┌─────────────────────────────────────┐
│   Atomic Service (Port 8000)        │
│   - Direct CRUD Operations           │
│   - In-memory Storage                │
└─────────────────────────────────────┘
```

### Running the Composite Service

#### 1. Start the Atomic Service First

```bash
# Terminal 1: Start atomic service
uvicorn main:app --reload --port 8000
```

#### 2. Start the Composite Service

```bash
# Terminal 2: Start composite service
cd composite-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Or set the atomic service URL:

```bash
ATOMIC_SERVICE_URL=http://localhost:8000 uvicorn main:app --reload --port 8001
```

#### 3. Access Composite Service API Docs

```
http://localhost:8001/docs
```

### Composite Service Features

#### 1. Foreign Key Constraint Validation

The composite service enforces logical foreign key constraints:

- **Assignments** → **Walks**: Cannot create an assignment without a valid `walk_id`
- **Events** → **Walks**: Cannot create an event without a valid `walk_id`

**Example - FK Constraint Violation:**

```bash
# Try to create assignment with non-existent walk_id
curl -X POST http://localhost:8001/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "walk_id": "00000000-0000-0000-0000-000000000000",
    "walker_id": "22222222-2222-2222-2222-222222222222"
  }'

# Response: 400 Bad Request
{
  "error": "Foreign Key Constraint Violation",
  "detail": "Walk 00000000-0000-0000-0000-000000000000 does not exist. Cannot create assignment - foreign key constraint violation."
}
```

#### 2. Orchestrated Endpoints

**Get Complete Walk Information** (with parallel execution):

```bash
GET /walks/{walk_id}/complete
```

Fetches walk, assignments, and events **in parallel using threads**:

```json
{
  "walk": { ... },
  "assignments": [ ... ],
  "events": [ ... ],
  "summary": {
    "assignment_count": 2,
    "event_count": 5
  }
}
```

**Assign Walker to Walk** (with FK validation):

```bash
POST /walks/{walk_id}/assign?walker_id={walker_id}
```

**Create Walk Event** (with FK validation):

```bash
POST /walks/{walk_id}/events?event_type=started&message=Walk%20began
```

**Cascade Delete Walk** (with parallel deletion):

```bash
DELETE /walks/{walk_id}/cascade?force=false
```

Deletes walk and all related assignments/events in parallel. Returns error if dependencies exist (unless `force=true`).

#### 3. Thread-Based Parallel Execution

The composite service uses `ThreadPoolExecutor` for parallel operations:

**Example: `GET /walks/{walk_id}/complete`**

```python
# Fetches assignments and events in parallel
with ThreadPoolExecutor(max_workers=2) as executor:
    assignments_future = executor.submit(fetch_assignments)
    events_future = executor.submit(fetch_events)
    
    assignments = assignments_future.result()
    events = events_future.result()
```

**Example: `DELETE /walks/{walk_id}/cascade`**

```python
# Deletes all assignments and events in parallel
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = []
    for assignment in assignments:
        futures.append(executor.submit(delete_assignment, assignment.id))
    for event in events:
        futures.append(executor.submit(delete_event, event.id))
    
    # Wait for all deletions to complete
    for future in as_completed(futures):
        deleted_count += 1
```

### API Endpoints Comparison

| Operation | Atomic Service | Composite Service |
|-----------|---------------|-------------------|
| Create Walk | `POST /walks` | `POST /walks` (delegated) |
| Create Assignment | `POST /assignments` | `POST /assignments` (with FK validation) |
| Create Event | `POST /events` | `POST /events` (with FK validation) |
| Get Walk Complete | ❌ Not available | `GET /walks/{id}/complete` (parallel) |
| Assign Walker | ❌ Not available | `POST /walks/{id}/assign` (orchestrated) |
| Cascade Delete | ❌ Not available | `DELETE /walks/{id}/cascade` (parallel) |

### Environment Variables

**Composite Service:**

- `ATOMIC_SERVICE_URL`: URL of the atomic service (default: `http://localhost:8000`)
- `COMPOSITE_PORT`: Port for composite service (default: `8001`)

### Example Workflow

1. **Create a walk** (via composite service):
   ```bash
   POST http://localhost:8001/walks
   ```

2. **Assign a walker** (with FK validation):
   ```bash
   POST http://localhost:8001/walks/{walk_id}/assign?walker_id={walker_id}
   ```

3. **Create events during walk** (with FK validation):
   ```bash
   POST http://localhost:8001/walks/{walk_id}/events?event_type=started
   POST http://localhost:8001/walks/{walk_id}/events?event_type=photo_uploaded&message=Photo%20taken
   ```

4. **Get complete walk information** (parallel fetch):
   ```bash
   GET http://localhost:8001/walks/{walk_id}/complete
   ```

5. **Delete walk and all related data** (cascade delete with parallel execution):
   ```bash
   DELETE http://localhost:8001/walks/{walk_id}/cascade?force=true
   ```

---

## 🎯 Requirements Satisfied

✅ **Composite Microservice**: Encapsulates and exposes atomic microservice APIs  
✅ **Delegation**: All operations delegate to the atomic service via HTTP  
✅ **Parallel Execution**: Uses threads for concurrent operations (`ThreadPoolExecutor`)  
✅ **Foreign Key Constraints**: Enforces logical FK constraints at composite layer  
✅ **Orchestration**: Provides higher-level endpoints that coordinate multiple operations
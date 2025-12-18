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
├── main.py
├── models/
├── services/
├── middleware/
├── framework/
├── resources/
├── utils/
│   └── db.py
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
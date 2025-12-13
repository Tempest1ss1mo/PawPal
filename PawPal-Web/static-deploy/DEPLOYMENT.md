# PawPal Static Deployment Guide

This guide explains how to deploy the PawPal web UI to Google Cloud Storage and the backend to Cloud Run.

## Architecture

```
                        ┌─────────────────────┐
                        │   Cloud Storage     │
                        │   (Static Files)    │
                        │  - index.html       │
                        │  - css/style.css    │
                        │  - js/main.js       │
                        │  - config.js        │
                        └─────────┬───────────┘
                                  │
                                  │ HTTP Requests
                                  ▼
┌──────────────┐      ┌─────────────────────┐
│   Browser    │◄────►│     Cloud Run       │
│              │      │   (Flask Backend)   │
└──────────────┘      │   - API Endpoints   │
                      │   - Auth Logic      │
                      └─────────┬───────────┘
                                │
                                ▼
                      ┌─────────────────────┐
                      │   Microservices     │
                      │   - User Service    │
                      │   - Walk Service    │
                      │   - Review Service  │
                      └─────────────────────┘
```

## Step 1: Deploy Backend to Cloud Run

### 1.1 Create Dockerfile for Flask Backend

In `PawPal-Web/` directory, create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates templates/
COPY static static/

ENV PORT=8080
ENV FLASK_DEBUG=False

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 app:app
```

### 1.2 Create requirements.txt

```
flask==3.0.0
flask-cors==4.0.0
requests==2.31.0
python-dotenv==1.0.0
gunicorn==21.2.0
```

### 1.3 Deploy to Cloud Run

```bash
# Build and deploy
gcloud run deploy pawpal-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "USER_SERVICE_URL=http://34.9.57.25:3001,WALK_SERVICE_URL=<YOUR_WALK_SERVICE_URL>,REVIEW_SERVICE_URL=<YOUR_REVIEW_SERVICE_URL>,SECRET_KEY=<YOUR_SECRET_KEY>"
```

After deployment, note the Cloud Run URL (e.g., `https://pawpal-backend-xxxxx-uc.a.run.app`)

## Step 2: Update config.js

Edit `static-deploy/config.js` with your Cloud Run URL:

```javascript
const CONFIG = {
    // Update this to your Cloud Run URL
    API_BASE_URL: 'https://pawpal-backend-xxxxx-uc.a.run.app',

    // Google OAuth Client ID
    GOOGLE_CLIENT_ID: '445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com'
};
```

## Step 3: Deploy Frontend to Cloud Storage

### 3.1 Create a Cloud Storage Bucket

```bash
# Create bucket (bucket name must be globally unique)
gsutil mb -l us-central1 gs://pawpal-web-ui

# Enable website configuration
gsutil web set -m index.html -e index.html gs://pawpal-web-ui
```

### 3.2 Upload Static Files

```bash
# Upload all files from static-deploy folder
gsutil -m cp -r static-deploy/* gs://pawpal-web-ui/

# Set public access
gsutil iam ch allUsers:objectViewer gs://pawpal-web-ui
```

### 3.3 Configure CORS for the Bucket (Optional)

Create `cors.json`:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

Apply CORS configuration:
```bash
gsutil cors set cors.json gs://pawpal-web-ui
```

## Step 4: Update Google OAuth Authorized Origins

In Google Cloud Console:
1. Go to APIs & Services > Credentials
2. Click on your OAuth 2.0 Client ID
3. Add your Cloud Storage URL to "Authorized JavaScript origins":
   - `https://storage.googleapis.com`
   - `https://pawpal-web-ui.storage.googleapis.com` (if using custom domain)
4. Save changes

## Step 5: Access Your Application

Your static site will be available at:
- `https://storage.googleapis.com/pawpal-web-ui/index.html`

Or with website hosting enabled:
- `http://pawpal-web-ui.storage.googleapis.com/index.html`

## File Structure

```
static-deploy/
├── index.html          # Main HTML file (static, no Jinja2)
├── config.js           # Configuration (API URL, Google Client ID)
├── css/
│   └── style.css       # Styles
├── js/
│   └── main.js         # JavaScript (uses CONFIG for API calls)
└── DEPLOYMENT.md       # This file
```

## Environment Variables for Cloud Run

| Variable | Description | Example |
|----------|-------------|---------|
| `USER_SERVICE_URL` | User microservice URL | `http://34.9.57.25:3001` |
| `WALK_SERVICE_URL` | Walk microservice URL | `http://walk-service:8000` |
| `REVIEW_SERVICE_URL` | Review microservice URL | `http://review-service:8001` |
| `SECRET_KEY` | Flask session secret key | (generate a secure random string) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `445201823926-xxx.apps.googleusercontent.com` |

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:
1. Ensure backend has CORS enabled (already configured in app.py)
2. Check that Cloud Run service allows unauthenticated access
3. Verify `credentials: 'include'` is set in fetch calls

### Session/Cookie Issues
Cross-origin cookies require:
1. Backend served over HTTPS (Cloud Run provides this)
2. `SameSite=None` and `Secure=True` for cookies (already configured)
3. Frontend must use `credentials: 'include'` in fetch calls

### Google OAuth Not Working
1. Verify Google Client ID in config.js
2. Add Cloud Storage URL to authorized JavaScript origins in Google Console
3. Check browser console for specific error messages

## Local Development

To test locally before deploying:

1. Start the Flask backend:
```bash
cd PawPal-Web
python app.py
```

2. Open `static-deploy/index.html` in a browser
   - Note: Update `config.js` to use `http://localhost:5001` for local testing

## Notes

- The static frontend uses localStorage to persist user session data
- All API calls include `credentials: 'include'` for cookie-based sessions
- The backend handles all microservice communication

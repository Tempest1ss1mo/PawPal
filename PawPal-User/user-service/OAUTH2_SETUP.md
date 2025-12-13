# OAuth2 / OIDC Setup Guide

This document describes how to set up Google OAuth2/OIDC authentication for the PawPal User Service.

## Features Implemented

1. **Google OAuth2/OIDC Login**: Users can authenticate using their Google account
2. **JWT Token Generation**: After successful OAuth login, a JWT token is generated
3. **JWT Token Verification**: Protected API endpoints verify JWT tokens

## Prerequisites

1. Google Cloud Console project with OAuth2 credentials
2. Google Client ID: `445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com`
3. Google Client Secret (obtain from Google Cloud Console)

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# OAuth2 / Google Authentication
GOOGLE_CLIENT_ID=445201823926-sqscktas1gm0k5ve91mchu5cj96bofcm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

**For Production/VM Deployment:**
- Update `GOOGLE_CALLBACK_URL` to your VM's external IP or domain
- Use a strong, random `JWT_SECRET` (at least 32 characters)
- Example: `GOOGLE_CALLBACK_URL=http://YOUR_VM_IP:3001/api/auth/google/callback`

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** > **Credentials**
3. Find your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - For local development: `http://localhost:3001/api/auth/google/callback`
   - For production: `http://YOUR_VM_IP:3001/api/auth/google/callback`
   - Or use your domain: `https://yourdomain.com/api/auth/google/callback`

### 3. Database Migration

If your database already exists, run the migration to add the `google_id` column:

```bash
mysql -u root -p pawpal_db < database/migration_add_google_id.sql
```

Or manually add the column:

```sql
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE AFTER bio;
CREATE INDEX idx_google_id ON users(google_id);
```

## API Endpoints

### 1. Initiate Google OAuth2 Login

**GET** `/api/auth/google`

Redirects user to Google OAuth2 consent screen.

**Example:**
```
http://localhost:3001/api/auth/google
```

### 2. OAuth2 Callback

**GET** `/api/auth/google/callback`

Handles Google OAuth2 callback and returns JWT token.

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  }
}
```

### 3. Verify Token

**GET** `/api/auth/verify`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  }
}
```

### 4. Get Current User

**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "owner"
  }
}
```

## Protected Endpoints

The following endpoints require JWT authentication:

- **PUT** `/api/users/:id` - Update user
- **DELETE** `/api/users/:id` - Delete user

**Usage:**
Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Testing

### 1. Test OAuth2 Flow

1. Start the service:
   ```bash
   npm start
   ```

2. Open browser and navigate to:
   ```
   http://localhost:3001/api/auth/google
   ```

3. Complete Google OAuth2 login

4. You will be redirected to the callback URL and receive a JWT token

### 2. Test Protected Endpoint

Using curl:

```bash
# First, get your JWT token from OAuth2 login
TOKEN="your-jwt-token-here"

# Test protected endpoint
curl -X PUT http://localhost:3001/api/users/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "If-Match: <etag>" \
  -d '{"name": "Updated Name"}'
```

### 3. Test with Swagger UI

1. Navigate to `http://localhost:3001/api-docs`
2. Click "Authorize" button
3. Enter your JWT token (format: `Bearer <token>` or just `<token>`)
4. Try protected endpoints

## How It Works

1. **User initiates login**: GET `/api/auth/google`
2. **Redirect to Google**: User is redirected to Google OAuth2 consent screen
3. **User authorizes**: User grants permission to the application
4. **Google callback**: Google redirects back to `/api/auth/google/callback` with authorization code
5. **User lookup/creation**: 
   - If user exists (by email), update Google ID if needed
   - If user doesn't exist, create new user with Google account info
6. **JWT generation**: Generate JWT token containing user information
7. **Token returned**: JWT token is returned to the client
8. **API calls**: Client includes JWT token in Authorization header for protected endpoints

## Security Notes

- JWT tokens expire after 24 hours (configurable via `JWT_EXPIRES_IN`)
- Always use HTTPS in production
- Keep `JWT_SECRET` secure and never commit it to version control
- Google Client Secret should be kept secure
- Consider implementing token refresh mechanism for production use



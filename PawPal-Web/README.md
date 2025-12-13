# PawPal Web Application - Sprint 2

This is the web application component for Sprint 2, which integrates with the Composite Microservice to demonstrate all required features.

## 📁 Project Structure

Your complete project should be organized as follows:

```
Sprint2-Project/                    # Main project folder
│
├── Cloud-Computing-Database/       # Team repository (don't modify)
│   ├── database/                   # Database schema and setup
│   ├── user-service/               # Atomic service (port 3001)
│   ├── composite-service/          # Composite service (port 3002)
│   └── [other files...]
│
└── pawpal-webapp/                  # Your web application (this folder)
    ├── app.py                      # Flask backend
    ├── requirements.txt            # Python dependencies
    ├── run.sh                      # Setup and run script
    ├── .env.example                # Environment template
    ├── .env                        # Your configuration (create from .env.example)
    ├── README.md                   # This file
    ├── static/
    │   ├── css/
    │   │   └── style.css
    │   └── js/
    │       ├── main.js             # Main application logic
    │       └── demo.js             # Sprint 2 demo features
    └── templates/
        └── index.html              # Main HTML template

```

## 🚀 Quick Start

### Automatic Setup and Run

The easiest way to get started is using the provided script:

```bash
cd pawpal-webapp
chmod +x run.sh

# Option 1: Setup all dependencies
./run.sh
# Select option 1

# Option 2: Run all services
./run.sh
# Select option 2

# Option 3: Run only web app (if other services are already running)
./run.sh
# Select option 3
```

### Manual Setup

If you prefer manual setup, follow these steps:

#### 1. Prerequisites

- Python 3.7+
- Node.js 14+
- MySQL 8.0
- The Cloud-Computing-Database repository

#### 2. Setup Database

```bash
cd ../Cloud-Computing-Database

# Start MySQL
sudo /usr/local/mysql/support-files/mysql.server start

# Create database and load schema
mysql -u root -p < database/schema.sql
mysql -u root -p pawpal_db < database/sample_data.sql
```

#### 3. Configure User Service

```bash
cd ../Cloud-Computing-Database/user-service

# Create .env file
cat > .env << EOF
DB_HOST=localhost
DB_PORT=3306
DB_NAME=pawpal_db
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
EOF

# Install dependencies and start
npm install
npm start
# Should run on port 3001
```

#### 4. Configure Composite Service

```bash
cd ../Cloud-Computing-Database/composite-service

# Copy environment template
cp .env.example .env

# Install dependencies and start
npm install
npm start
# Should run on port 3002
```

#### 5. Configure and Run Web Application

```bash
cd pawpal-webapp

# Copy environment template
cp .env.example .env

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py
# Should run on port 5000
```

## 🌐 Accessing the Application

Once all services are running:

1. **Main Application**: http://localhost:5000
2. **Sprint 2 Demo**: Click "Sprint 2 Demo" in the navigation (red link)

## ✅ Sprint 2 Features

The application demonstrates all required Sprint 2 features:

### 1. **Composite Microservice Integration**
- All pet operations go through the composite service
- User and dog data is aggregated via composite service

### 2. **Foreign Key Validation**
- Creating dogs validates that the owner exists
- Demo page shows validation with invalid owner IDs

### 3. **Parallel Execution with Threads**
- User profile data fetched using worker threads
- Demo shows timing and parallel data fetching

### 4. **Cascade Delete Operations**
- Deleting a user removes all their dogs
- Demo shows cascade delete in action

### 5. **Aggregated Statistics**
- Combined statistics from multiple services
- Demo displays aggregated data

## 🧪 Testing Sprint 2 Features

### Testing Checklist

1. **Service Health Check**
   - Visit the demo page
   - Check "Service Status" - all should show green

2. **Foreign Key Validation**
   - Go to "Foreign Key Validation" tab
   - Try owner ID 999 (invalid)
   - Should see validation error

3. **Parallel Execution**
   - Go to "Parallel Execution" tab
   - Enter user ID 1
   - Should see data fetched with timing info

4. **Cascade Delete**
   - Go to "Cascade Delete" tab
   - Enter user ID 4
   - Confirm deletion
   - Should see user and dogs deleted

5. **Aggregated Stats**
   - Go to "Aggregated Stats" tab
   - Click "Load Statistics"
   - Should see combined statistics

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
PORT=5000

# Microservice URLs
USER_SERVICE_URL=http://localhost:3001
COMPOSITE_SERVICE_URL=http://localhost:3002

# Optional Services (for future)
WALKING_SERVICE_URL=http://localhost:5002
REVIEW_SERVICE_URL=http://localhost:5003
```

## 📊 API Endpoints

### Web Application Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main application page |
| `/api/health` | GET | Health check with service status |
| `/api/login` | POST | User login |
| `/api/signup` | POST | User registration |
| `/api/pets` | GET/POST | Pet management (via composite) |
| `/api/walkers` | GET | Get available walkers |
| `/api/bookings` | GET/POST | Booking management |
| `/api/demo/composite-stats` | GET | Aggregated statistics demo |
| `/api/demo/user-complete/<id>` | GET | Parallel execution demo |
| `/api/demo/cascade-delete/<id>` | DELETE | Cascade delete demo |

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5000  # Web app
lsof -i :3001  # User service
lsof -i :3002  # Composite service

# Kill the process
kill -9 <PID>
```

#### MySQL Connection Issues
```bash
# Check MySQL is running
mysqladmin -u root -p ping

# Check database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'pawpal_db';"
```

#### Service Not Available
- Ensure all services are running in order:
  1. MySQL
  2. User Service (3001)
  3. Composite Service (3002)
  4. Web App (5000)

#### Python Import Errors
```bash
# Make sure virtual environment is activated
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

## 🚀 Deployment to Google Cloud Storage

For the Sprint 2 requirement to deploy on Cloud Storage:

### 1. Build Static Files

Since Cloud Storage serves static files, you'll need to:
- Deploy the Flask app on Cloud Run or App Engine as a backend API
- Configure CORS for cross-origin requests
- Update the JavaScript to point to the deployed backend

### 2. Upload to Cloud Storage

```bash
# Create a bucket
gsutil mb gs://your-pawpal-webapp

# Upload static files
gsutil -m cp -r static/* gs://your-pawpal-webapp/static/
gsutil cp templates/index.html gs://your-pawpal-webapp/

# Set public access
gsutil iam ch allUsers:objectViewer gs://your-pawpal-webapp

# Configure as website
gsutil web set -m index.html -e 404.html gs://your-pawpal-webapp
```

### 3. Update URLs in JavaScript

Edit `static/js/main.js` and `static/js/demo.js`:
```javascript
// Replace with your deployed backend URL
const API_BASE_URL = 'https://your-backend-url.com/api';
```

## 📝 Notes

- This web application is designed specifically for Sprint 2 requirements
- The composite service must be running for full functionality
- Demo features are highlighted in red in the navigation
- All microservice communication goes through the composite service
- The application can be deployed as static files to Cloud Storage

## 🤝 Support

If you encounter any issues:
1. Check all services are running (`./run.sh` option 2)
2. Verify the database is set up correctly
3. Check the browser console for JavaScript errors
4. Review service logs in the parent directory

## 📋 Submission Checklist

- [ ] All services run locally
- [ ] Foreign key validation works
- [ ] Parallel execution demonstrated
- [ ] Cascade delete functional
- [ ] Statistics aggregation working
- [ ] Deployed to Cloud Storage
- [ ] All demo features accessible

---

**Sprint 2 - Composite Microservice Integration**
*PawPal Web Application*

# PawPal User Service Database

## Project Overview

PawPal is a dog-walking coordination platform that connects busy dog owners with trusted local dog walkers. This repository contains the database schema and configuration for the User Service microservice.

## Database Schema

The User Service manages two main entities:
- **Users**: Both dog owners and walkers
- **Dogs**: Pet information linked to owners

## Quick Start

1. **Setup MySQL Database**:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. **Load Sample Data**:
   ```bash
   mysql -u root -p pawpal_db < database/sample_data.sql
   ```

3. **Test Connection**:
   ```bash
   mysql -u root -p pawpal_db -e "SELECT COUNT(*) FROM users;"
   ```

## Files Structure

```
├── database/
│   ├── schema.sql              # Database schema creation
│   ├── sample_data.sql         # Sample data for testing
│   └── connection_config.sql   # Database user setup
├── config/
│   └── database.env.example    # Environment configuration template
├── scripts/
│   ├── setup_database.sh      # Automated setup script
│   └── test_connection.sh     # Connection test script
└── docs/
    ├── DEPLOYMENT.md           # VM deployment guide
    └── API_INTEGRATION.md      # Service integration guide
```

## Cloud Deployment

See `docs/DEPLOYMENT.md` for detailed instructions on setting up MySQL on a cloud VM (GCP/AWS).

## API Integration

The User Service will expose REST endpoints that interact with this database. See `docs/API_INTEGRATION.md` for endpoint specifications.


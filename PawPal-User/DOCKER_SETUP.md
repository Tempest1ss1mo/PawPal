# PawPal Database - Docker Setup Guide

This guide covers running the PawPal User Service database using Docker for local development.

## Quick Start with Docker

### Prerequisites
- Docker installed on your machine
- Docker Compose installed

### Start the Database

```bash
# Clone or navigate to the project directory
cd /path/to/Cloud-Computing-Database

# Start MySQL and phpMyAdmin
docker-compose up -d

# Check if containers are running
docker-compose ps
```

### Access the Database

#### MySQL Command Line
```bash
# Connect to MySQL
docker exec -it pawpal-mysql mysql -u pawpal_user -p pawpal_db

# Or connect as root
docker exec -it pawpal-mysql mysql -u root -p
```

#### phpMyAdmin Web Interface
- Open your browser and go to: http://localhost:8080
- Username: `pawpal_user`
- Password: `pawpal_secure_2024!`

### Test the Setup

```bash
# Run the connection test script
./scripts/test_connection.sh

# Or test manually
docker exec -it pawpal-mysql mysql -u pawpal_user -p pawpal_db -e "SELECT COUNT(*) FROM users;"
```

## Docker Commands Reference

### Basic Operations
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs mysql

# Restart services
docker-compose restart

# Remove everything (including data)
docker-compose down -v
```

### Database Operations
```bash
# Backup database
docker exec pawpal-mysql mysqldump -u root -p pawpal_db > backup.sql

# Restore database
docker exec -i pawpal-mysql mysql -u root -p pawpal_db < backup.sql

# Access MySQL shell
docker exec -it pawpal-mysql mysql -u pawpal_user -p pawpal_db
```

## Environment Configuration

The Docker setup uses these default values:
- **MySQL Host**: localhost
- **MySQL Port**: 3306
- **Database Name**: pawpal_db
- **Username**: pawpal_user
- **Password**: pawpal_secure_2024!
- **Root Password**: root_password_123

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs mysql

# Check if port 3306 is already in use
lsof -i :3306

# Remove existing containers and restart
docker-compose down -v
docker-compose up -d
```

### Connection Issues
```bash
# Check if MySQL is ready
docker exec pawpal-mysql mysqladmin ping -h localhost

# Check container status
docker-compose ps

# Restart MySQL container
docker-compose restart mysql
```

### Data Persistence
The database data is stored in a Docker volume named `mysql_data`. To reset the database:

```bash
# Stop and remove containers with volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Integration with Microservices

### Connection String Examples

#### Node.js/Express
```javascript
const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'pawpal_user',
  password: 'pawpal_secure_2024!',
  database: 'pawpal_db'
});
```

#### Python/Flask
```python
import mysql.connector

config = {
    'host': 'localhost',
    'port': 3306,
    'user': 'pawpal_user',
    'password': 'pawpal_secure_2024!',
    'database': 'pawpal_db'
}

connection = mysql.connector.connect(**config)
```

#### Java/Spring Boot
```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/pawpal_db
    username: pawpal_user
    password: pawpal_secure_2024!
    driver-class-name: com.mysql.cj.jdbc.Driver
```

## Development Workflow

1. **Start Docker**: `docker-compose up -d`
2. **Verify Setup**: Run test scripts or check phpMyAdmin
3. **Develop**: Build your microservice to connect to localhost:3306
4. **Test**: Use the provided test scripts
5. **Stop**: `docker-compose down` when done

## Production Considerations

This Docker setup is for **local development only**. For production:

- Use proper secrets management
- Configure SSL/TLS
- Set up proper backup strategies
- Use production-grade MySQL configuration
- Implement monitoring and logging

---

The Docker setup provides a quick way to get the PawPal database running locally for development and testing purposes.

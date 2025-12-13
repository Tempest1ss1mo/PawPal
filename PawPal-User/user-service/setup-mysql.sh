#!/bin/bash

# MySQL Setup Script for User Service
# This script sets up MySQL database completely under your control
# Run this script on your VM to set up MySQL from scratch
# Usage: sudo ./setup-mysql.sh

set -e

echo "=========================================="
echo "MySQL Database Complete Setup Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root (needed for MySQL installation)
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}This script requires root privileges to install MySQL${NC}"
   echo "Please run with: sudo ./setup-mysql.sh"
   exit 1
fi

echo -e "${YELLOW}Step 1: Updating system packages...${NC}"
apt-get update

echo -e "${YELLOW}Step 2: Installing MySQL Server...${NC}"
apt-get install -y mysql-server

echo -e "${YELLOW}Step 3: Starting MySQL service...${NC}"
systemctl enable mysql
systemctl start mysql

# Wait for MySQL to be ready
sleep 3

echo -e "${YELLOW}Step 4: Checking MySQL status...${NC}"
if systemctl is-active --quiet mysql; then
    echo -e "${GREEN}✅ MySQL service is running${NC}"
else
    echo -e "${RED}❌ MySQL service failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Setting MySQL root password...${NC}"
echo "Please enter MySQL root password (will be used for configuration):"
read -s MYSQL_ROOT_PASSWORD
echo ""

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  No password set, will use empty password${NC}"
    MYSQL_CMD="mysql -u root"
else
    echo -e "${YELLOW}Setting root password...${NC}"
    mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '${MYSQL_ROOT_PASSWORD}';
FLUSH PRIVILEGES;
EOF
    MYSQL_CMD="mysql -u root -p${MYSQL_ROOT_PASSWORD}"
    echo -e "${GREEN}✅ Root password set successfully${NC}"
fi

echo ""
echo -e "${YELLOW}Step 6: Running security configuration (optional but recommended)...${NC}"
echo "Do you want to run mysql_secure_installation? (y/n)"
read -r RUN_SECURE
if [ "$RUN_SECURE" = "y" ] || [ "$RUN_SECURE" = "Y" ]; then
    mysql_secure_installation
fi

echo ""
echo -e "${YELLOW}Step 7: Setting up database user and database...${NC}"
echo "Please enter your desired database name (default: pawpal_user_db):"
read -r DB_NAME
DB_NAME=${DB_NAME:-pawpal_user_db}

echo "Please enter your desired database username (default: user_service):"
read -r DB_USERNAME
DB_USERNAME=${DB_USERNAME:-user_service}

echo "Please enter password for database user '$DB_USERNAME' (default: huakaifugui):"
read -s DB_USER_PASSWORD
DB_USER_PASSWORD=${DB_USER_PASSWORD:-huakaifugui}
echo ""

echo -e "${YELLOW}Creating database user and granting permissions...${NC}"
$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME};
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'localhost' IDENTIFIED BY '${DB_USER_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USERNAME}'@'localhost';
FLUSH PRIVILEGES;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database user created and permissions granted${NC}"
else
    echo -e "${RED}❌ Failed to create database user${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 8: Creating database and tables...${NC}"

# Find schema.sql file relative to script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/../database/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Schema file not found: $SCHEMA_FILE${NC}"
    echo "Please ensure database/schema.sql file exists"
    exit 1
fi

# Create a temporary schema file with the correct database name
TEMP_SCHEMA="/tmp/schema_${DB_NAME}.sql"
sed "s/pawpal_db/${DB_NAME}/g" "$SCHEMA_FILE" > "$TEMP_SCHEMA"

echo "Using schema file: $SCHEMA_FILE (adapted for database: $DB_NAME)"
$MYSQL_CMD < "$TEMP_SCHEMA" 2>&1

# Clean up temp file
rm -f "$TEMP_SCHEMA"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database and tables created successfully!${NC}"
else
    echo -e "${RED}❌ Database creation failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 9: Loading sample data (optional)...${NC}"
SAMPLE_DATA_FILE="${SCRIPT_DIR}/../database/sample_data.sql"
if [ -f "$SAMPLE_DATA_FILE" ]; then
    echo "Do you want to load sample data? (y/n)"
    read -r LOAD_SAMPLE
    if [ "$LOAD_SAMPLE" = "y" ] || [ "$LOAD_SAMPLE" = "Y" ]; then
        # Update sample data file to use correct database name
        TEMP_SAMPLE="/tmp/sample_${DB_NAME}.sql"
        sed "s/USE pawpal_db/USE ${DB_NAME}/g" "$SAMPLE_DATA_FILE" > "$TEMP_SAMPLE"
        $MYSQL_CMD ${DB_NAME} < "$TEMP_SAMPLE" 2>&1
        rm -f "$TEMP_SAMPLE"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Sample data loaded successfully!${NC}"
        else
            echo -e "${YELLOW}⚠️  Sample data loading failed (may already exist)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Sample data file not found${NC}"
fi

echo ""
echo -e "${YELLOW}Step 10: Verifying database...${NC}"
$MYSQL_CMD ${DB_NAME} -e "SHOW TABLES;" 2>&1
USER_COUNT=$($MYSQL_CMD ${DB_NAME} -e "SELECT COUNT(*) as count FROM users;" 2>&1 | tail -1)
DOG_COUNT=$($MYSQL_CMD ${DB_NAME} -e "SELECT COUNT(*) as count FROM dogs;" 2>&1 | tail -1)

echo ""
echo -e "${GREEN}✅ Database verification complete${NC}"
echo "  - Users table records: $USER_COUNT"
echo "  - Dogs table records: $DOG_COUNT"

echo ""
echo -e "${YELLOW}Step 11: Generating .env configuration...${NC}"
ENV_FILE="${SCRIPT_DIR}/.env"
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "${SCRIPT_DIR}/config/database.env.example" ]; then
        cp "${SCRIPT_DIR}/config/database.env.example" "$ENV_FILE"
    else
        cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=${DB_USERNAME}
DB_PASSWORD=${DB_USER_PASSWORD}
DB_NAME=${DB_NAME}
DB_POOL_MAX=10
ALLOWED_ORIGINS=http://localhost:3000
SKIP_DB=false
EOF
    fi
    echo -e "${GREEN}✅ .env file created${NC}"
    
    # Update database configuration in .env
    sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME}/" "$ENV_FILE"
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_USER_PASSWORD}/" "$ENV_FILE"
    sed -i "s/DB_NAME=.*/DB_NAME=${DB_NAME}/" "$ENV_FILE"
    echo -e "${GREEN}✅ Database configuration written to .env file${NC}"
else
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    echo "Please manually update the following in .env:"
    echo "  DB_USERNAME=${DB_USERNAME}"
    echo "  DB_PASSWORD=${DB_USER_PASSWORD}"
    echo "  DB_NAME=${DB_NAME}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ MySQL database setup complete!${NC}"
echo "=========================================="
echo ""
echo "Database Information:"
echo "  - Database name: ${DB_NAME}"
echo "  - Username: ${DB_USERNAME}"
echo "  - Password: ${DB_USER_PASSWORD}"
echo "  - Host: localhost"
echo "  - Port: 3306"
echo ""
echo "Next steps:"
echo "1. Check .env file configuration is correct"
echo "2. Start User Service: cd user-service && npm start"
echo "3. Test connection: curl http://localhost:3001/health"
echo ""


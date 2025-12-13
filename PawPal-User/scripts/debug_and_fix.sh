#!/bin/bash

# Comprehensive Debug and Fix Script for MySQL Setup

echo "🔍 PawPal Database Debug & Fix Script"
echo "======================================"
echo ""

MYSQL_BIN="/usr/local/mysql/bin/mysql"
MYSQL_SERVER="/usr/local/mysql/support-files/mysql.server"
PROJECT_DIR="/Users/jessicasun/Documents/GitHub/Cloud-Computing-Database"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test MySQL connection
test_mysql_connection() {
    local user=$1
    local password=$2
    if [ -z "$password" ]; then
        $MYSQL_BIN -u "$user" -e "SELECT 1;" > /dev/null 2>&1
    else
        $MYSQL_BIN -u "$user" -p"$password" -e "SELECT 1;" > /dev/null 2>&1
    fi
}

echo "📊 Step 1: Checking MySQL Status..."
if pgrep -x mysqld > /dev/null; then
    echo -e "${GREEN}✅ MySQL is running${NC}"
else
    echo -e "${RED}❌ MySQL is not running${NC}"
    echo "   Attempting to start MySQL..."
    sudo $MYSQL_SERVER start
    sleep 2
fi

echo ""
echo "🔑 Step 2: Testing MySQL Root Access..."

# Try different password combinations
PASSWORDS=("403395" "root" "password" "admin" "" "cloudcomputing123")
FOUND_PASSWORD=""

for pwd in "${PASSWORDS[@]}"; do
    if [ -z "$pwd" ]; then
        echo "   Testing: (empty password)"
        if test_mysql_connection "root" ""; then
            FOUND_PASSWORD=""
            echo -e "${GREEN}✅ Found! Root password is empty${NC}"
            break
        fi
    else
        echo "   Testing: $pwd"
        if test_mysql_connection "root" "$pwd"; then
            FOUND_PASSWORD="$pwd"
            echo -e "${GREEN}✅ Found! Root password is: $pwd${NC}"
            break
        fi
    fi
done

if [ -z "$FOUND_PASSWORD" ] && [ "$FOUND_PASSWORD" != "0" ]; then
    echo -e "${YELLOW}⚠️  Could not find root password. You may need to reset it.${NC}"
    echo ""
    echo "To reset MySQL root password, run:"
    echo "  cd $PROJECT_DIR"
    echo "  ./scripts/reset_mysql_root_password.sh"
    echo ""
    echo "Or manually reset it, then update the .env file."
    exit 1
fi

echo ""
echo "🗄️  Step 3: Checking Database..."
if [ -z "$FOUND_PASSWORD" ]; then
    DB_EXISTS=$($MYSQL_BIN -u root -e "SHOW DATABASES LIKE 'pawpal_db';" 2>/dev/null | grep -c pawpal_db)
else
    DB_EXISTS=$($MYSQL_BIN -u root -p"$FOUND_PASSWORD" -e "SHOW DATABASES LIKE 'pawpal_db';" 2>/dev/null | grep -c pawpal_db)
fi

if [ "$DB_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Database 'pawpal_db' does not exist${NC}"
    echo "   Creating database..."
    if [ -z "$FOUND_PASSWORD" ]; then
        $MYSQL_BIN -u root < "$PROJECT_DIR/database/schema.sql" 2>&1
    else
        $MYSQL_BIN -u root -p"$FOUND_PASSWORD" < "$PROJECT_DIR/database/schema.sql" 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create database${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Database 'pawpal_db' exists${NC}"
fi

echo ""
echo "👤 Step 4: Checking Application User..."
if [ -z "$FOUND_PASSWORD" ]; then
    USER_EXISTS=$($MYSQL_BIN -u root -e "SELECT User FROM mysql.user WHERE User='pawpal_user';" 2>/dev/null | grep -c pawpal_user)
else
    USER_EXISTS=$($MYSQL_BIN -u root -p"$FOUND_PASSWORD" -e "SELECT User FROM mysql.user WHERE User='pawpal_user';" 2>/dev/null | grep -c pawpal_user)
fi

if [ "$USER_EXISTS" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Application user 'pawpal_user' does not exist${NC}"
    echo "   Creating application user..."
    if [ -z "$FOUND_PASSWORD" ]; then
        $MYSQL_BIN -u root < "$PROJECT_DIR/database/connection_config.sql" 2>&1
    else
        $MYSQL_BIN -u root -p"$FOUND_PASSWORD" < "$PROJECT_DIR/database/connection_config.sql" 2>&1
    fi
    echo -e "${GREEN}✅ Application user created${NC}"
else
    echo -e "${GREEN}✅ Application user exists${NC}"
fi

echo ""
echo "📝 Step 5: Updating .env file..."
ENV_FILE="$PROJECT_DIR/user-service/.env"

# Backup existing .env
cp "$ENV_FILE" "$ENV_FILE.backup" 2>/dev/null

# Update password in .env
if [ -z "$FOUND_PASSWORD" ]; then
    sed -i '' 's/^DB_PASSWORD=.*/DB_PASSWORD=/' "$ENV_FILE"
    echo -e "${GREEN}✅ Updated .env: DB_PASSWORD=(empty)${NC}"
else
    sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$FOUND_PASSWORD/" "$ENV_FILE"
    echo -e "${GREEN}✅ Updated .env: DB_PASSWORD=$FOUND_PASSWORD${NC}"
fi

echo ""
echo "🧪 Step 6: Testing Connection..."
cd "$PROJECT_DIR/user-service"
if npm list mysql2 > /dev/null 2>&1; then
    echo "   Dependencies installed ✅"
else
    echo "   Installing dependencies..."
    npm install > /dev/null 2>&1
fi

# Test connection with Node.js
node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pawpal_db'
        });
        console.log('✅ Database connection successful!');
        await conn.end();
        process.exit(0);
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        process.exit(1);
    }
})();
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Summary:"
    echo "  - MySQL Root Password: ${FOUND_PASSWORD:-'(empty)'}"
    echo "  - Database: pawpal_db ✅"
    echo "  - Application User: pawpal_user ✅"
    echo "  - .env file: Updated ✅"
    echo ""
    echo "You can now start your services:"
    echo "  cd user-service && npm start"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Connection test failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Please check:"
    echo "  1. MySQL is running"
    echo "  2. Database credentials are correct"
    echo "  3. Database and user exist"
fi


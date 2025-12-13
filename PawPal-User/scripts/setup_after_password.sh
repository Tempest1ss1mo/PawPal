#!/bin/bash

# Setup script to run AFTER MySQL root password is known
# Usage: ./setup_after_password.sh [root_password]

echo "🚀 PawPal Database Setup Script"
echo "================================"
echo ""

MYSQL_BIN="/usr/local/mysql/bin/mysql"
PROJECT_DIR="/Users/jessicasun/Documents/GitHub/Cloud-Computing-Database"

# Get password from argument or prompt
if [ -z "$1" ]; then
    echo "Enter MySQL root password:"
    read -s ROOT_PASSWORD
else
    ROOT_PASSWORD="$1"
fi

echo ""
echo "📊 Step 1: Testing MySQL connection..."
if $MYSQL_BIN -u root -p"$ROOT_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Please check your password."
    exit 1
fi

echo ""
echo "🗄️  Step 2: Creating database..."
$MYSQL_BIN -u root -p"$ROOT_PASSWORD" < "$PROJECT_DIR/database/schema.sql" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database created successfully"
else
    echo "⚠️  Database may already exist (this is OK)"
fi

echo ""
echo "👤 Step 3: Creating application user..."
$MYSQL_BIN -u root -p"$ROOT_PASSWORD" < "$PROJECT_DIR/database/connection_config.sql" 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Application user created successfully"
else
    echo "⚠️  User may already exist (this is OK)"
fi

echo ""
echo "📝 Step 4: Updating .env file..."
ENV_FILE="$PROJECT_DIR/user-service/.env"

# Backup
cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null

# Update password
sed -i '' "s/^DB_PASSWORD=.*/DB_PASSWORD=$ROOT_PASSWORD/" "$ENV_FILE"
echo "✅ Updated .env file with root password"

echo ""
echo "🧪 Step 5: Testing application connection..."
cd "$PROJECT_DIR/user-service"
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
        console.log('✅ Application connection successful!');
        const [rows] = await conn.execute('SELECT COUNT(*) as count FROM users');
        console.log('   Users in database:', rows[0].count);
        await conn.end();
        process.exit(0);
    } catch (error) {
        console.log('❌ Application connection failed:', error.message);
        process.exit(1);
    }
})();
" 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Setup Complete!"
    echo "=========================================="
    echo ""
    echo "You can now start your services:"
    echo "  cd user-service && npm start"
    echo "  cd composite-service && npm start"
else
    echo ""
    echo "⚠️  Setup completed but connection test failed."
    echo "   Check the error message above."
fi


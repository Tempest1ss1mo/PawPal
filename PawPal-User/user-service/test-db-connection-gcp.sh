#!/bin/bash

# Test GCP Database Connection Script

echo "=== Testing GCP Database Connection ==="
echo ""

# Load environment variables
cd "$(dirname "$0")"
source .env 2>/dev/null || echo "Loading .env..."

DB_HOST=${DB_HOST:-34.9.57.25}
DB_PORT=${DB_PORT:-3306}
DB_USERNAME=${DB_USERNAME:-user_service}
DB_NAME=${DB_NAME:-pawpal_user_db}

echo "Connection Details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Username: $DB_USERNAME"
echo "  Database: $DB_NAME"
echo ""

# Test 1: Check if port is accessible
echo "1. Testing port accessibility..."
if command -v nc &> /dev/null; then
    nc -zv -w 5 $DB_HOST $DB_PORT 2>&1
    PORT_STATUS=$?
    if [ $PORT_STATUS -eq 0 ]; then
        echo "✅ Port $DB_PORT is accessible"
    else
        echo "❌ Port $DB_PORT is NOT accessible"
        echo "   → Check GCP firewall rules"
    fi
else
    echo "⚠️  nc (netcat) not available, skipping port test"
fi
echo ""

# Test 2: Test MySQL connection
echo "2. Testing MySQL connection..."
node -e "
require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || '34.9.57.25',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'user_service',
  password: process.env.DB_PASSWORD || 'huakaifugui',
  database: process.env.DB_NAME || 'pawpal_user_db',
  connectTimeout: 5000
};

mysql.createConnection(config)
  .then(conn => {
    console.log('✅ MySQL connection successful!');
    return conn.query('SELECT COUNT(*) as count FROM users');
  })
  .then(([rows]) => {
    console.log('✅ Database query successful!');
    console.log('   Current users in database:', rows[0].count);
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Connection failed:', err.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check GCP firewall rules (allow TCP:3306)');
    console.log('  2. Check MySQL bind-address (should be 0.0.0.0)');
    console.log('  3. Check MySQL user permissions (user_service@%)');
    console.log('  4. Verify database exists: pawpal_user_db');
    process.exit(1);
  });
"

echo ""
echo "=== Test Complete ==="



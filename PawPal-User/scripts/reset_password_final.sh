#!/bin/bash
# Final MySQL Password Reset - Using socket and proper shutdown

NEW_PASSWORD="cloudcomputing123"
MYSQL_DIR="/usr/local/mysql"
MAC_PASSWORD="$1"

echo "🔐 Final MySQL Password Reset Attempt"
echo "======================================"
echo ""

# Step 1: Properly shutdown MySQL
echo "⏹️  Step 1: Shutting down MySQL..."
echo "$MAC_PASSWORD" | sudo -S $MYSQL_DIR/bin/mysqladmin -u root shutdown 2>/dev/null
echo "$MAC_PASSWORD" | sudo -S pkill -9 mysqld 2>/dev/null
sleep 3

# Step 2: Start in safe mode with explicit socket
echo "🚀 Step 2: Starting MySQL in safe mode..."
cd /tmp
echo "$MAC_PASSWORD" | sudo -S $MYSQL_DIR/bin/mysqld_safe \
    --skip-grant-tables \
    --skip-networking \
    --socket=/tmp/mysql_reset.sock \
    --user=_mysql \
    --datadir=$MYSQL_DIR/data \
    > /dev/null 2>&1 &

sleep 6

# Step 3: Connect using the socket
echo "🔑 Step 3: Resetting password..."
$MYSQL_DIR/bin/mysql --socket=/tmp/mysql_reset.sock -u root << 'MYSQL_SCRIPT'
USE mysql;
FLUSH PRIVILEGES;
SET PASSWORD FOR 'root'@'localhost' = 'cloudcomputing123';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    echo "✅ Password reset command executed"
else
    echo "⚠️  First method failed, trying alternative..."
    $MYSQL_DIR/bin/mysql --socket=/tmp/mysql_reset.sock -u root << 'MYSQL_SCRIPT'
USE mysql;
UPDATE user SET authentication_string='' WHERE User='root';
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'cloudcomputing123';
FLUSH PRIVILEGES;
MYSQL_SCRIPT
fi

# Step 4: Stop safe mode
echo "⏹️  Step 4: Stopping safe mode..."
echo "$MAC_PASSWORD" | sudo -S pkill -9 mysqld_safe 2>/dev/null
echo "$MAC_PASSWORD" | sudo -S pkill -9 mysqld 2>/dev/null
sleep 3

# Step 5: Start normally
echo "🚀 Step 5: Starting MySQL normally..."
echo "$MAC_PASSWORD" | sudo -S $MYSQL_DIR/support-files/mysql.server start
sleep 4

# Step 6: Test
echo "✅ Step 6: Testing new password..."
if $MYSQL_DIR/bin/mysql -u root -p"${NEW_PASSWORD}" -e "SELECT 'SUCCESS' as status;" 2>/dev/null; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! Password reset to: ${NEW_PASSWORD}"
    echo "=========================================="
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  Test failed. Trying manual connection..."
    $MYSQL_DIR/bin/mysql -u root -p"${NEW_PASSWORD}" 2>&1 | head -3
    exit 1
fi


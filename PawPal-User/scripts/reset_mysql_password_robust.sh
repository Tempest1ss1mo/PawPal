#!/bin/bash

# Robust MySQL Root Password Reset Script
NEW_PASSWORD="cloudcomputing123"
MYSQL_DIR="/usr/local/mysql"
MAC_PASSWORD="$1"

if [ -z "$MAC_PASSWORD" ]; then
    echo "Usage: $0 <mac_password>"
    exit 1
fi

echo "🔐 MySQL Root Password Reset (Robust Method)"
echo "============================================"
echo ""

# Function to run sudo with password
sudo_cmd() {
    echo "$MAC_PASSWORD" | sudo -S "$@" 2>&1
}

# Step 1: Kill all MySQL processes
echo "⏹️  Step 1: Stopping all MySQL processes..."
sudo_cmd pkill -9 mysqld_safe 2>/dev/null
sudo_cmd pkill -9 mysqld 2>/dev/null
sleep 2

# Step 2: Start MySQL in safe mode
echo "🚀 Step 2: Starting MySQL in safe mode..."
cd /tmp
sudo_cmd $MYSQL_DIR/bin/mysqld_safe --skip-grant-tables --skip-networking --user=_mysql > /dev/null 2>&1 &
SAFE_PID=$!
sleep 5

# Step 3: Verify safe mode is running
if ! pgrep -f "mysqld.*skip-grant-tables" > /dev/null; then
    echo "❌ Failed to start MySQL in safe mode"
    exit 1
fi

echo "✅ MySQL safe mode started"

# Step 4: Reset password
echo "🔑 Step 3: Resetting root password..."
sleep 2

$MYSQL_DIR/bin/mysql -u root << 'MYSQL_SCRIPT'
USE mysql;
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'cloudcomputing123';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

RESET_STATUS=$?

# Step 5: Stop safe mode
echo "⏹️  Step 4: Stopping safe mode..."
sudo_cmd pkill -9 mysqld_safe 2>/dev/null
sudo_cmd pkill -9 mysqld 2>/dev/null
sleep 3

# Step 6: Start MySQL normally
echo "🚀 Step 5: Starting MySQL normally..."
sudo_cmd $MYSQL_DIR/support-files/mysql.server start
sleep 3

# Step 7: Test new password
echo "✅ Step 6: Testing new password..."
if $MYSQL_DIR/bin/mysql -u root -p"${NEW_PASSWORD}" -e "SELECT 'SUCCESS' as status;" 2>/dev/null; then
    echo ""
    echo "=========================================="
    echo "✅ SUCCESS! Password reset complete!"
    echo "=========================================="
    echo ""
    echo "MySQL Root Credentials:"
    echo "  Username: root"
    echo "  Password: ${NEW_PASSWORD}"
    echo ""
    echo "Next step: Run setup script"
    echo "  ./scripts/setup_after_password.sh ${NEW_PASSWORD}"
    echo ""
    exit 0
else
    echo ""
    echo "⚠️  Password reset may have failed."
    echo "   Trying to connect with new password..."
    $MYSQL_DIR/bin/mysql -u root -p"${NEW_PASSWORD}" 2>&1 | head -3
    exit 1
fi


#!/bin/bash

# MySQL Root Password Reset Script
# This script resets the MySQL root password to: cloudcomputing123

NEW_PASSWORD="cloudcomputing123"
MYSQL_DIR="/usr/local/mysql"
MAC_PASSWORD="$1"  # Accept Mac password as first argument

echo "🔐 MySQL Root Password Reset Script"
echo "===================================="
echo ""

# Check if Mac password was provided
if [ -z "$MAC_PASSWORD" ]; then
    echo "Usage: $0 <mac_password>"
    echo "Example: $0 403395"
    exit 1
fi

# Function to run sudo commands with password
run_sudo() {
    echo "$MAC_PASSWORD" | sudo -S "$@" 2>&1
}

# Check if MySQL is running
if pgrep -x mysqld > /dev/null; then
    echo "⏹️  Stopping MySQL..."
    run_sudo $MYSQL_DIR/support-files/mysql.server stop
    sleep 2
fi

# Start MySQL in safe mode
echo "🚀 Starting MySQL in safe mode (skip grant tables)..."
run_sudo $MYSQL_DIR/bin/mysqld_safe --skip-grant-tables --skip-networking > /dev/null 2>&1 &
sleep 3

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be ready..."
sleep 3

# Reset password
echo "🔑 Resetting root password..."
$MYSQL_DIR/bin/mysql -u root << EOF
USE mysql;
ALTER USER 'root'@'localhost' IDENTIFIED BY '${NEW_PASSWORD}';
FLUSH PRIVILEGES;
EXIT;
EOF

if [ $? -ne 0 ]; then
    echo "❌ Failed to reset password in safe mode"
    echo "   Trying alternative method..."
    $MYSQL_DIR/bin/mysql -u root << EOF
USE mysql;
UPDATE user SET authentication_string='' WHERE User='root' AND Host='localhost';
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '${NEW_PASSWORD}';
FLUSH PRIVILEGES;
EXIT;
EOF
fi

# Stop safe mode MySQL
echo "⏹️  Stopping MySQL safe mode..."
run_sudo pkill -9 mysqld_safe 2>/dev/null
run_sudo pkill -9 mysqld 2>/dev/null
sleep 2

# Start MySQL normally
echo "🚀 Starting MySQL normally..."
run_sudo $MYSQL_DIR/support-files/mysql.server start
sleep 3

# Test the new password
echo "✅ Testing new password..."
if $MYSQL_DIR/bin/mysql -u root -p"${NEW_PASSWORD}" -e "SELECT 'Password reset successful!' as status;" 2>/dev/null; then
    echo ""
    echo "✅ SUCCESS! MySQL root password has been reset!"
    echo "   Username: root"
    echo "   Password: ${NEW_PASSWORD}"
    echo ""
    echo "You can now run:"
    echo "  ./scripts/setup_after_password.sh ${NEW_PASSWORD}"
    echo ""
else
    echo ""
    echo "⚠️  Password reset completed, but test failed."
    echo "   Try connecting manually: mysql -u root -p${NEW_PASSWORD}"
    echo ""
fi

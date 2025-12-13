#!/bin/bash

# PawPal User Service Database Setup Script
# This script automates the database setup process

set -e  # Exit on any error

echo "🐾 Setting up PawPal User Service Database..."

# Configuration
DB_ROOT_USER="root"
DB_NAME="pawpal_db"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$PROJECT_ROOT/database/schema.sql"
SAMPLE_DATA_FILE="$PROJECT_ROOT/database/sample_data.sql"
CONNECTION_CONFIG_FILE="$PROJECT_ROOT/database/connection_config.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if MySQL is installed and running
check_mysql() {
    print_status "Checking MySQL installation..."
    
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client is not installed. Please install MySQL first."
        exit 1
    fi
    
    if ! mysqladmin ping -h localhost --silent; then
        print_error "MySQL server is not running. Please start MySQL server first."
        exit 1
    fi
    
    print_status "MySQL is installed and running ✓"
}

# Prompt for MySQL root password
get_root_password() {
    echo -n "Enter MySQL root password: "
    read -s DB_ROOT_PASSWORD
    echo
}

# Create database and run schema
setup_database() {
    print_status "Creating database and tables..."
    
    mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASSWORD" < "$SCHEMA_FILE"
    
    if [ $? -eq 0 ]; then
        print_status "Database schema created successfully ✓"
    else
        print_error "Failed to create database schema"
        exit 1
    fi
}

# Load sample data
load_sample_data() {
    print_status "Loading sample data..."
    
    mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASSWORD" "$DB_NAME" < "$SAMPLE_DATA_FILE"
    
    if [ $? -eq 0 ]; then
        print_status "Sample data loaded successfully ✓"
    else
        print_error "Failed to load sample data"
        exit 1
    fi
}

# Setup database users and permissions
setup_users() {
    print_status "Setting up database users and permissions..."
    
    mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASSWORD" < "$CONNECTION_CONFIG_FILE"
    
    if [ $? -eq 0 ]; then
        print_status "Database users and permissions configured ✓"
    else
        print_error "Failed to setup database users"
        exit 1
    fi
}

# Test database connection
test_connection() {
    print_status "Testing database connection..."
    
    # Test with the service user
    mysql -u "pawpal_user" -p"pawpal_secure_2024!" -e "USE $DB_NAME; SELECT COUNT(*) as user_count FROM users;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status "Database connection test successful ✓"
        
        # Show some stats
        echo
        print_status "Database Statistics:"
        mysql -u "pawpal_user" -p"pawpal_secure_2024!" -e "
            USE $DB_NAME;
            SELECT 'Users by Role' as info;
            SELECT role, COUNT(*) as count FROM users GROUP BY role;
            SELECT 'Dogs by Size' as info;
            SELECT size, COUNT(*) as count FROM dogs GROUP BY size;
        " 2>/dev/null
    else
        print_error "Database connection test failed"
        exit 1
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "🐾 PawPal User Service Database Setup"
    echo "=========================================="
    echo
    
    # Check prerequisites
    check_mysql
    
    # Get root password
    get_root_password
    
    # Setup database
    setup_database
    load_sample_data
    setup_users
    
    # Test everything
    test_connection
    
    echo
    echo "=========================================="
    print_status "🎉 Database setup completed successfully!"
    echo "=========================================="
    echo
    print_status "Connection Information:"
    echo "  Host: localhost"
    echo "  Database: $DB_NAME"
    echo "  Username: pawpal_user"
    echo "  Password: pawpal_secure_2024!"
    echo "  Port: 3306"
    echo
    print_status "You can now start your User Service microservice!"
    echo
    print_warning "Remember to update the database.env file with your connection details."
}

# Run main function
main "$@"


#!/bin/bash

# PawPal User Service Database Connection Test Script
# This script tests the database connection and displays useful information

set -e

echo "🐾 Testing PawPal User Service Database Connection..."

# Configuration
DB_HOST="localhost"
DB_PORT="3306"
DB_NAME="pawpal_db"
DB_USER="pawpal_user"
DB_PASSWORD="pawpal_secure_2024!"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

# Test basic connection
test_basic_connection() {
    print_header "Testing basic database connection..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &>/dev/null; then
        print_status "✓ Database connection successful"
        return 0
    else
        print_error "✗ Database connection failed"
        return 1
    fi
}

# Test database exists and is accessible
test_database_access() {
    print_header "Testing database access..."
    
    if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT DATABASE();" &>/dev/null; then
        print_status "✓ Database '$DB_NAME' is accessible"
        return 0
    else
        print_error "✗ Cannot access database '$DB_NAME'"
        return 1
    fi
}

# Test table existence
test_tables() {
    print_header "Testing table existence..."
    
    local tables=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in" | wc -l)
    
    if [ "$tables" -ge 2 ]; then
        print_status "✓ Found $tables tables in database"
        
        # Show table names
        echo "  Tables found:"
        mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES;" 2>/dev/null | grep -v "Tables_in" | sed 's/^/    - /'
        return 0
    else
        print_error "✗ Expected at least 2 tables, found $tables"
        return 1
    fi
}

# Test sample data
test_sample_data() {
    print_header "Testing sample data..."
    
    local user_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM users;" 2>/dev/null | tail -1)
    local dog_count=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SELECT COUNT(*) FROM dogs;" 2>/dev/null | tail -1)
    
    if [ "$user_count" -gt 0 ] && [ "$dog_count" -gt 0 ]; then
        print_status "✓ Sample data loaded successfully"
        echo "  Users: $user_count"
        echo "  Dogs: $dog_count"
        return 0
    else
        print_error "✗ Sample data not found or incomplete"
        echo "  Users: $user_count"
        echo "  Dogs: $dog_count"
        return 1
    fi
}

# Test CRUD operations
test_crud_operations() {
    print_header "Testing CRUD operations..."
    
    # Test INSERT
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        INSERT INTO users (name, email, role) VALUES ('Test User', 'test@example.com', 'owner');
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status "✓ INSERT operation successful"
    else
        print_error "✗ INSERT operation failed"
        return 1
    fi
    
    # Test SELECT
    local test_user=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        SELECT name FROM users WHERE email = 'test@example.com';
    " 2>/dev/null | tail -1)
    
    if [ "$test_user" = "Test User" ]; then
        print_status "✓ SELECT operation successful"
    else
        print_error "✗ SELECT operation failed"
        return 1
    fi
    
    # Test UPDATE
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        UPDATE users SET name = 'Updated Test User' WHERE email = 'test@example.com';
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status "✓ UPDATE operation successful"
    else
        print_error "✗ UPDATE operation failed"
        return 1
    fi
    
    # Test DELETE
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        DELETE FROM users WHERE email = 'test@example.com';
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        print_status "✓ DELETE operation successful"
    else
        print_error "✗ DELETE operation failed"
        return 1
    fi
    
    return 0
}

# Display database statistics
show_statistics() {
    print_header "Database Statistics:"
    
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "
        USE $DB_NAME;
        SELECT 'Users by Role:' as info;
        SELECT role, COUNT(*) as count FROM users GROUP BY role;
        SELECT 'Dogs by Size:' as info;
        SELECT size, COUNT(*) as count FROM dogs GROUP BY size;
        SELECT 'Dogs by Energy Level:' as info;
        SELECT energy_level, COUNT(*) as count FROM dogs GROUP BY energy_level;
        SELECT 'Top Rated Walkers:' as info;
        SELECT name, rating, total_reviews FROM users WHERE role = 'walker' ORDER BY rating DESC LIMIT 3;
    " 2>/dev/null
}

# Main test function
main() {
    echo "=========================================="
    echo "🐾 PawPal Database Connection Test"
    echo "=========================================="
    echo
    
    local tests_passed=0
    local total_tests=5
    
    # Run all tests
    test_basic_connection && ((tests_passed++))
    test_database_access && ((tests_passed++))
    test_tables && ((tests_passed++))
    test_sample_data && ((tests_passed++))
    test_crud_operations && ((tests_passed++))
    
    echo
    echo "=========================================="
    
    if [ $tests_passed -eq $total_tests ]; then
        print_status "🎉 All tests passed! ($tests_passed/$total_tests)"
        echo
        show_statistics
    else
        print_error "❌ Some tests failed! ($tests_passed/$total_tests passed)"
        echo
        print_warning "Please check your database setup and try running the setup script again."
    fi
    
    echo "=========================================="
}

# Run main function
main "$@"


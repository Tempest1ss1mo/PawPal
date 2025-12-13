-- PawPal User Service Database Connection Configuration
-- This script sets up database users and permissions for the microservice

USE pawpal_db;

-- Create dedicated user for the User Service microservice
-- Note: Change the password to something secure in production
CREATE USER IF NOT EXISTS 'pawpal_user'@'localhost' IDENTIFIED BY 'pawpal_secure_2024!';
CREATE USER IF NOT EXISTS 'pawpal_user'@'%' IDENTIFIED BY 'pawpal_secure_2024!';

-- Grant necessary permissions to the service user
GRANT SELECT, INSERT, UPDATE, DELETE ON pawpal_db.* TO 'pawpal_user'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON pawpal_db.* TO 'pawpal_user'@'%';

-- Grant permissions for views (if using MySQL version that requires explicit view permissions)
GRANT SELECT ON pawpal_db.active_users_with_dogs TO 'pawpal_user'@'localhost';
GRANT SELECT ON pawpal_db.active_users_with_dogs TO 'pawpal_user'@'%';
GRANT SELECT ON pawpal_db.dogs_with_owners TO 'pawpal_user'@'localhost';
GRANT SELECT ON pawpal_db.dogs_with_owners TO 'pawpal_user'@'%';

-- Create a read-only user for monitoring/reporting
CREATE USER IF NOT EXISTS 'pawpal_readonly'@'localhost' IDENTIFIED BY 'pawpal_readonly_2024!';
CREATE USER IF NOT EXISTS 'pawpal_readonly'@'%' IDENTIFIED BY 'pawpal_readonly_2024!';

GRANT SELECT ON pawpal_db.* TO 'pawpal_readonly'@'localhost';
GRANT SELECT ON pawpal_db.* TO 'pawpal_readonly'@'%';

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- Verify user creation
SELECT User, Host FROM mysql.user WHERE User LIKE 'pawpal%';

-- Show current database
SELECT DATABASE() as current_database;

-- Display connection information for the service
SELECT 
    'Database Connection Info' as info,
    'Host: localhost (or your MySQL server IP)' as host,
    'Database: pawpal_db' as database_name,
    'Username: pawpal_user' as username,
    'Password: pawpal_secure_2024!' as password,
    'Port: 3306 (default)' as port;


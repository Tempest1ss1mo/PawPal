-- PawPal User Service Database Schema
-- This script creates the database and tables for the User Service microservice

-- Create database
CREATE DATABASE IF NOT EXISTS pawpal_db;
USE pawpal_db;

-- Users table: stores both dog owners and walkers
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    role ENUM('owner', 'walker') NOT NULL,
    phone VARCHAR(20),
    location VARCHAR(200),
    profile_image_url VARCHAR(500),
    bio TEXT,
    google_id VARCHAR(255) UNIQUE,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Add indexes for performance
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_location (location),
    INDEX idx_rating (rating),
    INDEX idx_created_at (created_at),
    INDEX idx_google_id (google_id)
);

-- Dogs table: stores dog information linked to owners
CREATE TABLE dogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    breed VARCHAR(50),
    age INT,
    size ENUM('small', 'medium', 'large', 'extra_large') NOT NULL,
    temperament VARCHAR(200),
    special_needs TEXT,
    medical_notes TEXT,
    profile_image_url VARCHAR(500),
    is_friendly_with_other_dogs BOOLEAN DEFAULT TRUE,
    is_friendly_with_children BOOLEAN DEFAULT TRUE,
    energy_level ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign key constraint
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Add indexes for performance
    INDEX idx_owner_id (owner_id),
    INDEX idx_size (size),
    INDEX idx_breed (breed),
    INDEX idx_energy_level (energy_level),
    INDEX idx_created_at (created_at)
);

-- Create a view for active users with their dog counts
CREATE VIEW active_users_with_dogs AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.phone,
    u.location,
    u.rating,
    u.total_reviews,
    COUNT(d.id) as dog_count,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN dogs d ON u.id = d.owner_id AND d.is_active = TRUE
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.email, u.role, u.phone, u.location, u.rating, u.total_reviews, u.created_at, u.updated_at;

-- Create a view for dogs with owner information
CREATE VIEW dogs_with_owners AS
SELECT 
    d.id,
    d.name as dog_name,
    d.breed,
    d.age,
    d.size,
    d.temperament,
    d.special_needs,
    d.energy_level,
    d.is_friendly_with_other_dogs,
    d.is_friendly_with_children,
    u.id as owner_id,
    u.name as owner_name,
    u.email as owner_email,
    u.phone as owner_phone,
    u.location as owner_location,
    d.created_at,
    d.updated_at
FROM dogs d
JOIN users u ON d.owner_id = u.id
WHERE d.is_active = TRUE AND u.is_active = TRUE;

-- Grant permissions (adjust username/password as needed)
-- CREATE USER 'pawpal_user'@'localhost' IDENTIFIED BY 'secure_password_123';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pawpal_db.* TO 'pawpal_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Show created tables
SHOW TABLES;
DESCRIBE users;
DESCRIBE dogs;


-- Migration: Add google_id column to users table
-- Run this if the users table already exists without google_id

USE pawpal_db;

-- Add google_id column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE AFTER bio;

-- Add index for google_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_google_id ON users(google_id);



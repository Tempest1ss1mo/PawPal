-- PawPal User Service Sample Data
-- This script populates the database with sample data for testing

USE pawpal_db;

-- Insert sample users (mix of owners and walkers)
INSERT INTO users (name, email, role, phone, location, bio, rating, total_reviews) VALUES
-- Dog Owners
('Sarah Johnson', 'sarah.johnson@email.com', 'owner', '555-0101', 'Downtown Seattle, WA', 'Dog lover and busy professional looking for reliable walkers', 0.00, 0),
('Mike Chen', 'mike.chen@email.com', 'owner', '555-0102', 'Capitol Hill, Seattle, WA', 'First-time dog owner, need experienced walkers', 0.00, 0),
('Emily Rodriguez', 'emily.rodriguez@email.com', 'owner', '555-0103', 'Ballard, Seattle, WA', 'Active family with two energetic dogs', 0.00, 0),
('David Park', 'david.park@email.com', 'owner', '555-0104', 'Queen Anne, Seattle, WA', 'Senior dog owner, prefer experienced walkers', 0.00, 0),

-- Dog Walkers
('Alex Thompson', 'alex.thompson@email.com', 'walker', '555-0201', 'Downtown Seattle, WA', 'Professional dog walker with 5 years experience. Love all breeds!', 4.8, 127),
('Maria Garcia', 'maria.garcia@email.com', 'walker', '555-0202', 'Capitol Hill, Seattle, WA', 'Certified pet care specialist. Available mornings and evenings.', 4.9, 89),
('James Wilson', 'james.wilson@email.com', 'walker', '555-0203', 'Ballard, Seattle, WA', 'Former vet tech, specializes in senior and special needs dogs', 4.7, 156),
('Lisa Anderson', 'lisa.anderson@email.com', 'walker', '555-0204', 'Queen Anne, Seattle, WA', 'Dog trainer and walker. Great with high-energy dogs!', 4.6, 203),
('Chris Brown', 'chris.brown@email.com', 'walker', '555-0205', 'Fremont, Seattle, WA', 'Weekend warrior and dog enthusiast. Available Saturday/Sunday', 4.5, 67);

-- Insert sample dogs for the owners
INSERT INTO dogs (owner_id, name, breed, age, size, temperament, special_needs, energy_level, is_friendly_with_other_dogs, is_friendly_with_children) VALUES
-- Sarah Johnson's dogs
(1, 'Buddy', 'Golden Retriever', 3, 'large', 'Friendly, energetic, loves treats', 'Needs medication twice daily', 'high', TRUE, TRUE),
(1, 'Luna', 'Border Collie', 2, 'medium', 'Intelligent, active, needs mental stimulation', 'Prefers quiet environments', 'high', TRUE, FALSE),

-- Mike Chen's dog
(2, 'Max', 'French Bulldog', 1, 'small', 'Playful, stubborn, loves attention', 'Sensitive to heat, needs shorter walks', 'medium', TRUE, TRUE),

-- Emily Rodriguez's dogs
(3, 'Rocky', 'Labrador Mix', 4, 'large', 'Gentle giant, loves water', 'Allergic to chicken', 'medium', TRUE, TRUE),
(3, 'Bella', 'Beagle', 5, 'medium', 'Curious, food-motivated, vocal', 'Tends to pull on leash', 'medium', TRUE, TRUE),

-- David Park's dog
(4, 'Charlie', 'Shih Tzu', 8, 'small', 'Calm, affectionate, low energy', 'Arthritis, needs gentle walks', 'low', TRUE, TRUE);

-- Add some additional dogs for testing
INSERT INTO dogs (owner_id, name, breed, age, size, temperament, special_needs, energy_level, is_friendly_with_other_dogs, is_friendly_with_children) VALUES
(1, 'Coco', 'Poodle Mix', 6, 'medium', 'Smart, hypoallergenic, needs grooming', 'Requires regular grooming appointments', 'medium', TRUE, TRUE),
(2, 'Zeus', 'German Shepherd', 2, 'large', 'Protective, loyal, needs training', 'Needs experienced handler', 'high', FALSE, FALSE);

-- Display summary of inserted data
SELECT 'Users Summary' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role;

SELECT 'Dogs Summary' as info;
SELECT size, COUNT(*) as count FROM dogs GROUP BY size;

SELECT 'Dogs by Energy Level' as info;
SELECT energy_level, COUNT(*) as count FROM dogs GROUP BY energy_level;

-- Show some sample queries that the User Service might use
SELECT 'Sample Query: Active Walkers' as info;
SELECT name, email, phone, location, rating, total_reviews 
FROM users 
WHERE role = 'walker' AND is_active = TRUE 
ORDER BY rating DESC;

SELECT 'Sample Query: Dogs by Owner' as info;
SELECT d.name as dog_name, d.breed, d.size, u.name as owner_name, u.email as owner_email
FROM dogs d
JOIN users u ON d.owner_id = u.id
WHERE d.is_active = TRUE
ORDER BY u.name, d.name;

SELECT 'Sample Query: High Energy Dogs' as info;
SELECT d.name, d.breed, d.energy_level, d.temperament, u.name as owner_name
FROM dogs d
JOIN users u ON d.owner_id = u.id
WHERE d.energy_level = 'high' AND d.is_active = TRUE
ORDER BY d.name;


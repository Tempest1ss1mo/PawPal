-- PawPal Review Service Database Schema

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(40) PRIMARY KEY,
    walk_id VARCHAR(255) NOT NULL,
    owner_id VARCHAR(255) NOT NULL,
    walker_id VARCHAR(255) NOT NULL,
    rating DECIMAL(2,1) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT check_rating_range CHECK (rating >= 1.0 AND rating <= 5.0)
);

CREATE TABLE IF NOT EXISTS analytics_jobs (
    id VARCHAR(50) PRIMARY KEY,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    result JSON,
    CONSTRAINT check_job_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Sample data for reviews
INSERT INTO reviews (id, walk_id, owner_id, walker_id, rating, comment, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'walk-001', 'owner-alice', 'walker-bob', 5.0, 'Excellent service! Bob was very professional and my dog Max loved the walk.', '2025-11-20 10:00:00', '2025-11-20 10:00:00'),
('550e8400-e29b-41d4-a716-446655440002', 'walk-002', 'owner-charlie', 'walker-diana', 4.5, 'Great experience. Diana was punctual and very caring with Bella.', '2025-11-20 11:30:00', '2025-11-20 11:30:00'),
('550e8400-e29b-41d4-a716-446655440003', 'walk-003', 'owner-alice', 'walker-eve', 4.0, 'Good walk, though it was a bit shorter than expected.', '2025-11-20 14:15:00', '2025-11-20 14:15:00'),
('550e8400-e29b-41d4-a716-446655440004', 'walk-004', 'owner-frank', 'walker-bob', 5.0, 'Bob is amazing! My dog Charlie had a fantastic time at the park.', '2025-11-21 09:00:00', '2025-11-21 09:00:00'),
('550e8400-e29b-41d4-a716-446655440005', 'walk-005', 'owner-grace', 'walker-diana', 3.5, 'Decent walk, but communication could be better.', '2025-11-21 13:45:00', '2025-11-21 13:45:00'),
('550e8400-e29b-41d4-a716-446655440006', 'walk-006', 'owner-henry', 'walker-eve', 5.0, 'Eve was wonderful! She sent photos during the walk and my dog Lucy was so happy.', '2025-11-21 16:20:00', '2025-11-21 16:20:00'),
('550e8400-e29b-41d4-a716-446655440007', 'walk-007', 'owner-charlie', 'walker-bob', 4.5, 'Another great walk with Bob. Highly recommended!', '2025-11-22 08:30:00', '2025-11-22 08:30:00'),
('550e8400-e29b-41d4-a716-446655440008', 'walk-008', 'owner-alice', 'walker-diana', 4.0, 'Diana did a good job. Max enjoyed his walk.', '2025-11-22 10:00:00', '2025-11-22 10:00:00');

-- Sample data for analytics_jobs
INSERT INTO analytics_jobs (id, status, created_at, completed_at, result) VALUES
('job-550e8400-e29b-41d4-a716-446655440001', 'completed', '2025-11-21 18:00:00', '2025-11-21 18:00:05', '{"totalReviews": 5, "averageRating": 4.4, "completedAt": "2025-11-21T18:00:05"}'),
('job-550e8400-e29b-41d4-a716-446655440002', 'completed', '2025-11-22 12:00:00', '2025-11-22 12:00:07', '{"totalReviews": 8, "averageRating": 4.44, "completedAt": "2025-11-22T12:00:07"}'),
('job-550e8400-e29b-41d4-a716-446655440003', 'processing', '2025-11-22 15:30:00', NULL, NULL),
('job-550e8400-e29b-41d4-a716-446655440004', 'failed', '2025-11-22 16:00:00', '2025-11-22 16:00:02', NULL);

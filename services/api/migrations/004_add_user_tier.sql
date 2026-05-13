-- Migration: Add user_tier column to users table
-- Migration: 004_add_referral_commissions.sql
-- Distinguishes between Founding Members, Early Users, and General Users

ALTER TABLE users
ADD COLUMN user_tier VARCHAR(20) NOT NULL DEFAULT 'general'
CHECK (user_tier IN ('founder', 'early_user', 'general'));

-- Backfill existing users based on their original signup order
WITH ranked_users AS (
    SELECT id,
           CASE
               WHEN ROW_NUMBER() OVER (ORDER BY created_at ASC) <= 100 THEN 'founder'
               WHEN ROW_NUMBER() OVER (ORDER BY created_at ASC) <= 600 THEN 'early_user'
               ELSE 'general'
           END AS new_tier
    FROM users
    WHERE deleted_at IS NULL
)
UPDATE users u
SET user_tier = r.new_tier
FROM ranked_users r
WHERE u.id = r.id;

-- Add index for filtering founders/early users on the /founders page
CREATE INDEX idx_users_user_tier ON users(user_tier);

COMMENT ON COLUMN users.user_tier IS 'User tier: founder (first 100), early_user (101-600), general (601+)';
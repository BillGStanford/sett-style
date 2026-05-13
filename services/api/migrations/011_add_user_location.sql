ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location) WHERE location IS NOT NULL;
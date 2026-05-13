-- migrations/010_add_user_demographics.sql
-- Adds optional demographic fields and onboarding progress tracking

ALTER TABLE users ADD COLUMN IF NOT EXISTS age_range VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender_identity VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discovery_source VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add check constraint for valid age ranges
ALTER TABLE users ADD CONSTRAINT chk_age_range CHECK (
    age_range IS NULL OR age_range IN ('18-24', '25-34', '35-44', '45-54', '55+')
);

-- Add check constraint for valid discovery sources
ALTER TABLE users ADD CONSTRAINT chk_discovery_source CHECK (
    discovery_source IS NULL OR discovery_source IN ('reddit', 'tiktok', 'friend', 'instagram', 'pinterest', 'search', 'other')
);

-- Index for analytics queries (demographic breakdowns)
CREATE INDEX IF NOT EXISTS idx_users_age_range ON users(age_range) WHERE age_range IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_discovery_source ON users(discovery_source) WHERE discovery_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed_at ON users(onboarding_completed_at) WHERE onboarding_completed_at IS NOT NULL;

-- Comment on columns for documentation
COMMENT ON COLUMN users.age_range IS 'Optional self-reported age range for aggregate demographics';
COMMENT ON COLUMN users.gender_identity IS 'Optional self-reported gender identity for inclusive personalization';
COMMENT ON COLUMN users.discovery_source IS 'How user discovered SETT - for channel attribution';
COMMENT ON COLUMN users.onboarding_step IS 'Current onboarding step (1-4) or NULL if not started/completed';
COMMENT ON COLUMN users.onboarding_completed_at IS 'Timestamp when onboarding was completed';
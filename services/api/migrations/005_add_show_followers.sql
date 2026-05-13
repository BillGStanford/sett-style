-- Add privacy setting for followers/following lists
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_followers BOOLEAN DEFAULT TRUE;
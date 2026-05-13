-- Add parent_set_id to track the "Edit this SETT" chain
ALTER TABLE sets ADD COLUMN IF NOT EXISTS parent_set_id UUID REFERENCES sets(id);


-- Migration: 009_add_set_permissions.sql
-- Purpose: Add remix permissions + edit tracking to sets table
-- Run: python scripts/migrate.py

-- Add allow_remixes flag (default: true, creators can opt out)
ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS allow_remixes BOOLEAN DEFAULT TRUE;

-- Add edited_at timestamp for poster edits (nullable, only set on update)
ALTER TABLE sets 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

-- Add index for remix lookups (find all remixes of a set)
CREATE INDEX IF NOT EXISTS idx_sets_remix_of_id ON sets(remix_of_id) 
WHERE remix_of_id IS NOT NULL AND deleted_at IS NULL;

-- Add index for permission checks
CREATE INDEX IF NOT EXISTS idx_sets_user_published ON sets(user_id, is_published, privacy) 
WHERE deleted_at IS NULL;

-- Update remixes table: add cascade delete protection note
-- (Already has ON DELETE CASCADE, this is documentation)
COMMENT ON TABLE remixes IS 'Tracks remix attribution. If original set is deleted, remix remains but revenue share ends.';

-- Create view for quick permission checks (optional optimization)
CREATE OR REPLACE VIEW set_permissions_view AS
SELECT 
    id,
    user_id,
    privacy,
    is_published,
    allow_remixes,
    CASE 
        WHEN privacy = 'private' THEN 'owner_only'
        WHEN NOT is_published THEN 'draft'
        WHEN NOT allow_remixes THEN 'view_only'
        ELSE 'remixable'
    END AS effective_permission
FROM sets
WHERE deleted_at IS NULL;

-- Grant select on view to app role (if using RLS)
-- GRANT SELECT ON set_permissions_view TO sett_app;
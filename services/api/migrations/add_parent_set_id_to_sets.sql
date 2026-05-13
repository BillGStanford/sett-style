-- migration: add_parent_set_id_to_sets.sql
ALTER TABLE sets
ADD COLUMN IF NOT EXISTS parent_set_id UUID REFERENCES sets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sets_parent_set_id
ON sets(parent_set_id)
WHERE parent_set_id IS NOT NULL AND deleted_at IS NULL;
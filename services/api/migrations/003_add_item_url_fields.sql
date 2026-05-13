-- Migration 003: Add linked item fields to items table
--
-- Creators can manually attach a URL + metadata to items they place
-- on their canvas (via the properties panel). These fields persist
-- that data at the DB level in addition to the canvas_json blob.
--
-- The canvas_json still stores these as custom Fabric.js properties
-- (linked_url, linked_title, linked_description, linked_image_url)
-- for the set detail page rendering. These DB columns are for:
--   1. API responses (set_items endpoint includes them)
--   2. Future search/filtering on linked items
--   3. Data integrity if canvas_json is ever re-serialized

ALTER TABLE items
    ADD COLUMN IF NOT EXISTS linked_url VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS linked_title VARCHAR(512),
    ADD COLUMN IF NOT EXISTS linked_description TEXT,
    ADD COLUMN IF NOT EXISTS linked_image_url VARCHAR(1024);

-- Index for future "find all sets that link to this URL" queries
CREATE INDEX IF NOT EXISTS idx_items_linked_url
    ON items (linked_url)
    WHERE linked_url IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN items.linked_url IS 'External URL manually attached by creator in canvas properties panel';
COMMENT ON COLUMN items.linked_title IS 'Display title for the linked item, set by creator';
COMMENT ON COLUMN items.linked_description IS 'Optional description for the linked item, set by creator';
COMMENT ON COLUMN items.linked_image_url IS 'Optional custom image URL for the linked item card, set by creator';
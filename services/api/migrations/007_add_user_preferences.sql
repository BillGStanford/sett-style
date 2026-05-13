-- Add user_preferences table for item-based feed ranking
-- Populated when a user likes a set, then joined against to find similar items

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    score FLOAT NOT NULL DEFAULT 1.0,
    last_interacted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, item_id)
);

-- Index for fast lookups per user
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_item ON user_preferences(item_id);
-- migrations/009_add_set_views_tracking.sql
CREATE TABLE IF NOT EXISTS set_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    viewer_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(set_id, session_id, viewed_date)
);

CREATE INDEX idx_set_views_set_id ON set_views(set_id);
CREATE INDEX idx_set_views_session_id ON set_views(session_id);
CREATE INDEX idx_set_views_viewed_date ON set_views(viewed_date);
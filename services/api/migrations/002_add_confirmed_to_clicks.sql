-- Migration: 002_add_confirmed_to_clicks.sql
-- Adds confirmed flag used by the commission confirmation worker

ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_clicks_unconfirmed ON affiliate_clicks(creator_id) WHERE converted = TRUE AND confirmed IS NOT TRUE;

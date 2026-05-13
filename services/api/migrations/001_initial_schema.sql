-- SETT Database Schema — PostgreSQL 16
-- Migration: 001_initial_schema.sql
--
-- Run: psql -U postgres -d sett-db -f 001_initial_schema.sql
-- Or via: python scripts/migrate.py
--
-- Design principles:
-- - All tables have created_at, updated_at, soft-delete deleted_at
-- - UUIDs for primary keys (globally unique, safe to expose in URLs)
-- - JSONB for flexible/evolving structures (canvas_json, style_prefs)
-- - Arrays for tags (aesthetic_tags[]) — simpler than junction table at launch
-- - pgvector extension for future AI embeddings (installed but not used at launch)
--
-- Tables in dependency order (FK constraints):
--   users → merchants → items → sets → set_items
--   sets → challenges, remixes
--   affiliate_clicks → items, sets, users
--   follows, referrals, notifications

-- ── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- pgvector: install on Supabase via dashboard or:
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Utility function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── USERS ────────────────────────────────────────────────────────────────────
-- Core identity table. Extended by user_profiles for non-auth fields.
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  username        TEXT UNIQUE,                  -- Set during onboarding, not signup
  password_hash   TEXT,                         -- NULL for OAuth-only users
  avatar_url      TEXT,
  bio             TEXT,

  -- Onboarding data
  goal            TEXT CHECK (goal IN ('browse', 'create', 'earn')),
  style_prefs     JSONB DEFAULT '[]',           -- Array of aesthetic names

  -- Commerce
  wallet_balance  NUMERIC(10,2) DEFAULT 0.00,   -- Confirmed, withdrawable balance
  pending_balance NUMERIC(10,2) DEFAULT 0.00,   -- Unconfirmed (within affiliate window)
  total_earned    NUMERIC(10,2) DEFAULT 0.00,   -- Lifetime total

  -- Subscription
  plan            TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  plan_expires_at TIMESTAMPTZ,

  -- Auth
  email_verified  BOOLEAN DEFAULT FALSE,
  oauth_provider  TEXT,                         -- 'google', 'apple', null
  oauth_id        TEXT,

  -- Referral
  referral_code   TEXT UNIQUE,                  -- Creator's outbound referral code
  referred_by     UUID REFERENCES users(id),    -- Who referred this user

  -- Status
  is_active       BOOLEAN DEFAULT TRUE,
  is_banned       BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_referral_code ON users(referral_code);

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── MERCHANTS ────────────────────────────────────────────────────────────────
-- Maps domains to affiliate networks for URL wrapping.
CREATE TABLE merchants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain          TEXT UNIQUE NOT NULL,         -- e.g. 'asos.com'
  name            TEXT NOT NULL,
  network         TEXT NOT NULL CHECK (network IN ('shareasale', 'cj', 'rakuten', 'awin', 'amazon', 'direct')),
  program_id      TEXT,                         -- Network-specific program/advertiser ID
  affiliate_id    TEXT,                         -- Our affiliate ID at this network
  commission_rate NUMERIC(5,2),                 -- e.g. 12.00 for 12%
  cookie_days     INTEGER DEFAULT 30,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_merchants_domain ON merchants(domain) WHERE is_active = TRUE;

-- ── ITEMS ────────────────────────────────────────────────────────────────────
-- User's item library. One row per clipped/uploaded item.
CREATE TABLE items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_id         UUID REFERENCES merchants(id),

  -- Source
  original_url        TEXT,                     -- Original product page URL
  affiliate_url       TEXT,                     -- Wrapped affiliate URL

  -- Processed asset
  original_image_url  TEXT,                     -- Raw OG image from product page
  processed_image_url TEXT,                     -- Background-removed PNG in R2

  -- Metadata (extracted from product page)
  product_name        TEXT,
  price               NUMERIC(10,2),
  currency            TEXT DEFAULT 'USD',
  category            TEXT,                     -- top, bottom, shoe, bag, accessory, etc.
  color               TEXT,
  brand               TEXT,

  -- Processing state
  status              TEXT DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  processing_error    TEXT,

  -- Future: AI embedding for similarity search
  -- embedding        vector(512),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_items_user_id ON items(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_items_status ON items(status) WHERE deleted_at IS NULL;

CREATE TRIGGER items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SETS ─────────────────────────────────────────────────────────────────────
-- A published (or draft) fashion collage.
CREATE TABLE sets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug            TEXT,                         -- URL-safe title slug

  -- Content
  title           TEXT NOT NULL,
  canvas_json     JSONB NOT NULL DEFAULT '{}',  -- Fabric.js serialized canvas
  thumbnail_url   TEXT,                         -- PNG in Cloudflare R2

  -- Metadata
  aesthetic_tags  TEXT[] DEFAULT '{}',
  privacy         TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'private', 'unlisted')),
  is_published    BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,

  -- Social
  like_count      INTEGER DEFAULT 0,
  view_count      INTEGER DEFAULT 0,
  save_count      INTEGER DEFAULT 0,

  -- Remix chain
  remix_of_id     UUID REFERENCES sets(id),     -- If this is a remix, points to original

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_sets_user_slug ON sets(user_id, slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_sets_published ON sets(published_at DESC) WHERE is_published = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_sets_user_id ON sets(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_sets_aesthetic_tags ON sets USING GIN(aesthetic_tags);

CREATE TRIGGER sets_updated_at BEFORE UPDATE ON sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SET_ITEMS ─────────────────────────────────────────────────────────────────
-- Junction: which items are in which set + their canvas position/properties.
CREATE TABLE set_items (
  set_id              UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  item_id             UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  canvas_properties   JSONB DEFAULT '{}',       -- Fabric.js object properties snapshot
  display_order       INTEGER DEFAULT 0,
  PRIMARY KEY (set_id, item_id)
);

CREATE INDEX idx_set_items_set_id ON set_items(set_id);
CREATE INDEX idx_set_items_item_id ON set_items(item_id);

-- ── AFFILIATE_CLICKS ──────────────────────────────────────────────────────────
-- Every click on an affiliate link is recorded here.
-- This table grows fast — partition by month at 10M+ rows.
CREATE TABLE affiliate_clicks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id             UUID NOT NULL REFERENCES items(id),
  set_id              UUID REFERENCES sets(id),
  creator_id          UUID NOT NULL REFERENCES users(id),  -- Set owner, earns commission
  clicker_id          UUID REFERENCES users(id),           -- NULL if anonymous

  -- Network data
  network             TEXT,
  click_ref           TEXT,                     -- Network's click reference ID

  -- Attribution
  click_ts            TIMESTAMPTZ DEFAULT NOW(),
  referrer_url        TEXT,
  user_agent          TEXT,

  -- Conversion (filled in via webhook from affiliate network)
  converted           BOOLEAN DEFAULT FALSE,
  conversion_ts       TIMESTAMPTZ,
  order_value         NUMERIC(10,2),
  commission_gross    NUMERIC(10,2),            -- Full commission from network
  commission_creator  NUMERIC(10,2),            -- 70% → creator
  commission_platform NUMERIC(10,2),            -- 30% → SETT

  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Partition hint: at 10M+ rows, partition by click_ts month
CREATE INDEX idx_clicks_creator_id ON affiliate_clicks(creator_id, click_ts DESC);
CREATE INDEX idx_clicks_set_id ON affiliate_clicks(set_id, click_ts DESC);
CREATE INDEX idx_clicks_item_id ON affiliate_clicks(item_id);
CREATE INDEX idx_clicks_converted ON affiliate_clicks(converted, click_ts DESC);

-- ── FOLLOWS ──────────────────────────────────────────────────────────────────
CREATE TABLE follows (
  follower_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);

-- ── REMIXES ───────────────────────────────────────────────────────────────────
-- Tracks remix attribution chain for revenue sharing.
CREATE TABLE remixes (
  remix_set_id        UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  original_set_id     UUID NOT NULL REFERENCES sets(id),
  revenue_share_pct   NUMERIC(5,2) DEFAULT 10.00,   -- 10% to original creator
  share_expiry_date   TIMESTAMPTZ,                    -- 30 days post-remix
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (remix_set_id)
);

-- ── CHALLENGES ───────────────────────────────────────────────────────────────
CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  theme           TEXT NOT NULL,
  description     TEXT,
  hashtag         TEXT UNIQUE NOT NULL,
  start_date      TIMESTAMPTZ NOT NULL,
  end_date        TIMESTAMPTZ NOT NULL,
  prize_type      TEXT DEFAULT 'featured',
  sponsor_id      UUID REFERENCES users(id),          -- Brand sponsor (future)
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── SET_LIKES ─────────────────────────────────────────────────────────────────
CREATE TABLE set_likes (
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  set_id          UUID NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, set_id)
);

CREATE INDEX idx_set_likes_set ON set_likes(set_id);

-- ── PAYOUTS ───────────────────────────────────────────────────────────────────
-- Creator payout requests and history.
CREATE TABLE payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  amount          NUMERIC(10,2) NOT NULL,
  method          TEXT NOT NULL CHECK (method IN ('paypal', 'bank_transfer')),
  destination     TEXT NOT NULL,                -- Encrypted PayPal email or bank ref
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  reference       TEXT                          -- Payment processor reference
);

CREATE INDEX idx_payouts_user_id ON payouts(user_id);

-- ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,                -- 'follow', 'like', 'remix', 'earnings', etc.
  actor_id        UUID REFERENCES users(id),
  entity_id       UUID,                         -- set_id, item_id, etc.
  entity_type     TEXT,
  message         TEXT,
  is_read         BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

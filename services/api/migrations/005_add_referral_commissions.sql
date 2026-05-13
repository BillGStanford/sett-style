-- Migration: 005_add_referral_commissions.sql
-- Adds referral_commissions table to track bonus earnings from referrals

-- ── REFERRAL COMMISSIONS ─────────────────────────────────────────────────────
-- Tracks the 10% bonus commission that referrers earn from their referred users' activity
CREATE TABLE referral_commissions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id         UUID NOT NULL REFERENCES users(id),
    referred_user_id    UUID NOT NULL REFERENCES users(id),
    affiliate_click_id  UUID REFERENCES affiliate_clicks(id),
    
    -- Commission amounts
    commission_bonus    NUMERIC(10,2) NOT NULL,   -- 10% of the referred user's creator commission
    
    -- Attribution
    earned_at           TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate tracking
    UNIQUE(affiliate_click_id)
);

CREATE INDEX idx_referral_commissions_referrer ON referral_commissions(referrer_id, earned_at DESC);
CREATE INDEX idx_referral_commissions_referred ON referral_commissions(referred_user_id);
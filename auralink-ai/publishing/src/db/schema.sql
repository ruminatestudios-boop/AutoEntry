-- AuraLink Publishing API — Supabase PostgreSQL schema
-- Run in Supabase SQL editor or via migration tool.

-- Users (sync with your auth or create for publishing-only)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_listings INT NOT NULL DEFAULT 0
);

-- Platform OAuth tokens (one row per user per platform)
CREATE TABLE IF NOT EXISTS platform_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('shopify','tiktok','ebay','etsy','amazon')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  shop_id TEXT,
  shop_domain TEXT,
  region TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','revoked')),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_platform_tokens_user_platform ON platform_tokens(user_id, platform);

-- Listings (universal payload + publish outcome)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','failed')),
  universal_data JSONB NOT NULL DEFAULT '{}',
  publish_results JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_listings_user ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

-- Per-platform publish results (normalized for querying)
CREATE TABLE IF NOT EXISTS publish_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  platform_listing_id TEXT,
  platform_listing_url TEXT,
  error_message TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_results_listing ON publish_results(listing_id);

-- Optional: atomic increment for user total_listings
CREATE OR REPLACE FUNCTION increment_total_listings(uid UUID)
RETURNS void AS $$
  UPDATE users SET total_listings = total_listings + 1 WHERE id = uid;
$$ LANGUAGE sql;

-- OAuth token refresh: optional columns for Shopify (and future channels).
-- Shopify offline tokens are long-lived; online/session tokens expire and use token exchange.
-- These columns support future refresh flows and other channels (Amazon, TikTok).
ALTER TABLE shopify_stores
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN shopify_stores.refresh_token IS 'OAuth refresh token when provider supports it (e.g. online token exchange)';
COMMENT ON COLUMN shopify_stores.token_expires_at IS 'When access_token expires; null for offline/long-lived tokens';

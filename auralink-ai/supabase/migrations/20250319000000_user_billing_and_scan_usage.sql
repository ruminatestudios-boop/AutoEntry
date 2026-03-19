-- Stripe-backed billing: tier + subscription state per user (Clerk).
-- Used by POST /api/v1/billing/webhook and get_user_tier().
CREATE TABLE IF NOT EXISTS user_billing (
  clerk_user_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'pro', 'growth', 'scale')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_customer ON user_billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_sub ON user_billing(stripe_subscription_id);

-- Monthly scan usage per user (resets each month by month_key).
-- Used by get_scan_usage() and increment_scan().
CREATE TABLE IF NOT EXISTS user_scan_usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  month_key TEXT NOT NULL,
  scans_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clerk_user_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_user_scan_usage_monthly_lookup ON user_scan_usage_monthly(clerk_user_id, month_key);

COMMENT ON TABLE user_billing IS 'Stripe subscription state per Clerk user; tier drives scan limits.';
COMMENT ON TABLE user_scan_usage_monthly IS 'Scans consumed per user per month (month_key = YYYY-MM).';

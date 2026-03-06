-- Free scan quota per user (Clerk sub). 3 free scans then paywall.
CREATE TABLE IF NOT EXISTS user_scan_quota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  free_scans_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scan_quota_clerk ON user_scan_quota(clerk_user_id);

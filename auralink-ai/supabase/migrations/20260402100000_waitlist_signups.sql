-- Waitlist emails from publishing API POST /auth/waitlist (demo hero, flow-3, etc.)
CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'shopify',
  store_domain TEXT,
  source TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_email ON waitlist_signups(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_created_at ON waitlist_signups(created_at DESC);

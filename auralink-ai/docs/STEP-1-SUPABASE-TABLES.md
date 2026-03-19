# Step 1: Create Supabase tables for Stripe billing

This creates the two tables the backend uses for tier + scan limits:

- **user_billing** — subscription tier and Stripe IDs per user  
- **user_scan_usage_monthly** — scans used per user per month  

---

## Option A: Supabase Dashboard (easiest)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Go to **SQL Editor**.
3. Click **New query**.
4. Copy the contents of **supabase/migrations/20250319000000_user_billing_and_scan_usage.sql** (see below) into the editor.
5. Click **Run** (or press Cmd/Ctrl+Enter).
6. You should see “Success. No rows returned.” The tables and indexes are created.

---

## Option B: Supabase CLI

If you use the Supabase CLI and run migrations from your repo:

```bash
cd /path/to/SyncLyst/auralink-ai
supabase db push
```

Or, to run only this migration against a linked project:

```bash
supabase migration up
```

---

## SQL to run (copy-paste)

If you prefer to paste SQL by hand, use this:

```sql
-- Stripe-backed billing: tier + subscription state per user (Clerk).
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
```

---

## Verify

In the Supabase Dashboard:

1. Go to **Table Editor**.
2. You should see **user_billing** and **user_scan_usage_monthly**.
3. **user_billing** has columns: `clerk_user_id`, `tier`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`, `created_at`, `updated_at`.
4. **user_scan_usage_monthly** has: `id`, `clerk_user_id`, `month_key`, `scans_used`, `created_at`, `updated_at`.

After this, the backend can read/write tier and scan usage. Next: [Step 2 – Stripe env vars and webhook](.env and Stripe Dashboard).

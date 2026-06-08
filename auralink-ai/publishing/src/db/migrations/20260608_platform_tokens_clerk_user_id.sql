-- Clerk user IDs (user_…) for platform_tokens — required for production Shopify OAuth.
ALTER TABLE platform_tokens ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_tokens_clerk_platform
  ON platform_tokens (clerk_user_id, platform)
  WHERE clerk_user_id IS NOT NULL;

ALTER TABLE platform_tokens ALTER COLUMN user_id DROP NOT NULL;

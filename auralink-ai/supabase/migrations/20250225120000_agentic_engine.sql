-- =============================================================================
-- AuraLink AI – Agentic Engine Schema (UCP, Feedback Moat, GEO)
-- Run after 20250224000000_universal_products.sql and 20250224100000_shopify_stores.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extend universal_products for UCP + schema.org/Product
-- -----------------------------------------------------------------------------
ALTER TABLE universal_products
  ADD COLUMN IF NOT EXISTS exact_model TEXT,
  ADD COLUMN IF NOT EXISTS material_composition TEXT,
  ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS condition_score NUMERIC(3, 2) CHECK (condition_score IS NULL OR (condition_score >= 0 AND condition_score <= 1));

COMMENT ON COLUMN universal_products.exact_model IS 'Exact model/SKU from product (UCP + machine-readable)';
COMMENT ON COLUMN universal_products.material_composition IS 'Structured material e.g. 100% Merino Wool, 180gsm';
COMMENT ON COLUMN universal_products.weight_grams IS 'Weight in grams for agents';
COMMENT ON COLUMN universal_products.condition_score IS '0.0–1.0 condition grade (e.g. used goods)';

-- -----------------------------------------------------------------------------
-- 2. AI prompt versions (for Feedback Moat: which prompt generated which copy)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_versions_slug ON ai_prompt_versions(version_slug);

-- -----------------------------------------------------------------------------
-- 3. Description variations per product (SEO vs TikTok-Viral vs Amazon-Bullets)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS description_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES universal_products(id) ON DELETE CASCADE,
  variation_type TEXT NOT NULL CHECK (variation_type IN ('SEO', 'TIKTOK_VIRAL', 'AMAZON_BULLETS', 'SHOPIFY_META')),
  ai_prompt_version_id UUID REFERENCES ai_prompt_versions(id) ON DELETE SET NULL,

  copy_seo_title TEXT NOT NULL,
  copy_description TEXT NOT NULL,
  copy_bullet_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  copy_fact_feel_proof JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, variation_type)
);

COMMENT ON COLUMN description_variations.variation_type IS 'SEO, TIKTOK_VIRAL, AMAZON_BULLETS, SHOPIFY_META';
COMMENT ON COLUMN description_variations.copy_fact_feel_proof IS '{"fact":"...","feel":"...","proof":"..."} for GEO';

CREATE INDEX IF NOT EXISTS idx_description_variations_product_id ON description_variations(product_id);
CREATE INDEX IF NOT EXISTS idx_description_variations_variation_type ON description_variations(variation_type);

-- -----------------------------------------------------------------------------
-- 4. Performance_Logs – Feedback Moat (correlate sales to AI description style)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES universal_products(id) ON DELETE CASCADE,
  variation_type TEXT NOT NULL,
  ai_prompt_version TEXT NOT NULL,

  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  revenue_cents BIGINT NOT NULL DEFAULT 0,

  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (product_id, variation_type, ai_prompt_version, period_start, period_end)
);

COMMENT ON TABLE performance_logs IS 'Weekly aggregates: correlate Shopify (and other) sales to AI-generated description style';
CREATE INDEX IF NOT EXISTS idx_performance_logs_product_id ON performance_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_period ON performance_logs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_performance_logs_variation ON performance_logs(variation_type, ai_prompt_version);

-- -----------------------------------------------------------------------------
-- 5. Channel push snapshot (which variation was pushed to which channel)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_push_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES universal_products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_id TEXT NOT NULL,
  description_variation_id UUID REFERENCES description_variations(id) ON DELETE SET NULL,
  variation_type TEXT NOT NULL,
  ai_prompt_version TEXT NOT NULL,
  pushed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_push_snapshots_product_id ON channel_push_snapshots(product_id);
CREATE INDEX IF NOT EXISTS idx_channel_push_snapshots_channel_external ON channel_push_snapshots(channel, external_id);

-- -----------------------------------------------------------------------------
-- 6. UCP manifest per listing (/.well-known/ucp for agentic discovery)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ucp_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES universal_products(id) ON DELETE CASCADE UNIQUE,
  manifest_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ucp_manifests IS 'Universal Commerce Protocol manifest for each listing (AI shoppers / Gemini 2026)';
CREATE INDEX IF NOT EXISTS idx_ucp_manifests_product_id ON ucp_manifests(product_id);

-- -----------------------------------------------------------------------------
-- 7. Seed default prompt version
-- -----------------------------------------------------------------------------
INSERT INTO ai_prompt_versions (version_slug, name) VALUES
  ('fact_feel_proof_v1', 'Fact-Feel-Proof GEO v1')
ON CONFLICT (version_slug) DO NOTHING;

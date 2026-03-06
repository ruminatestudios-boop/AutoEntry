-- AuraLink AI: Master product profile (headless, channel-agnostic)
CREATE TABLE IF NOT EXISTS universal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Attributes (from vision extraction)
  attributes_material TEXT,
  attributes_color TEXT,
  attributes_weight TEXT,
  attributes_dimensions TEXT,
  attributes_brand TEXT,

  -- Copy
  copy_seo_title TEXT NOT NULL,
  copy_description TEXT NOT NULL,
  copy_bullet_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags_category TEXT,
  tags_search_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Media
  image_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PUBLISHED')),
  source_image_id TEXT
);

-- Channel-specific IDs (Shopify GID, Amazon ASIN, Depop listing id, etc.)
CREATE TABLE IF NOT EXISTS channel_adapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES universal_products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  external_id TEXT NOT NULL,
  synced_at TIMESTAMPTZ,
  UNIQUE (product_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_channel_adapters_product_id ON channel_adapters(product_id);
CREATE INDEX IF NOT EXISTS idx_channel_adapters_channel ON channel_adapters(channel);
CREATE INDEX IF NOT EXISTS idx_universal_products_status ON universal_products(status);
CREATE INDEX IF NOT EXISTS idx_universal_products_created_at ON universal_products(created_at DESC);

-- RLS (optional): enable with Supabase Auth
-- ALTER TABLE universal_products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_adapters ENABLE ROW LEVEL SECURITY;

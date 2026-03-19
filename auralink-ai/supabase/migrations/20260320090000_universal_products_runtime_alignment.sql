-- Runtime alignment for universal_products used by backend save/list endpoints.
-- Safe to run repeatedly.

-- Ensure UUID generation works in fresh Supabase/Postgres instances.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure core table exists (idempotent fallback for incomplete environments).
CREATE TABLE IF NOT EXISTS universal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attributes_material TEXT,
  attributes_color TEXT,
  attributes_weight TEXT,
  attributes_dimensions TEXT,
  attributes_brand TEXT,
  copy_seo_title TEXT NOT NULL,
  copy_description TEXT NOT NULL,
  copy_bullet_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags_category TEXT,
  tags_search_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'PUBLISHED')),
  source_image_id TEXT
);

-- Bring columns in sync with backend payload/schema additions.
ALTER TABLE universal_products
  ADD COLUMN IF NOT EXISTS exact_model TEXT,
  ADD COLUMN IF NOT EXISTS material_composition TEXT,
  ADD COLUMN IF NOT EXISTS weight_grams NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS condition_score NUMERIC(3, 2);

-- Preserve current runtime contract and avoid invalid values.
ALTER TABLE universal_products
  ALTER COLUMN copy_bullet_points SET DEFAULT '[]'::jsonb,
  ALTER COLUMN tags_search_keywords SET DEFAULT '[]'::jsonb,
  ALTER COLUMN image_urls SET DEFAULT '[]'::jsonb,
  ALTER COLUMN status SET DEFAULT 'DRAFT';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'universal_products_condition_score_check'
      AND conrelid = 'universal_products'::regclass
  ) THEN
    ALTER TABLE universal_products
      ADD CONSTRAINT universal_products_condition_score_check
      CHECK (condition_score IS NULL OR (condition_score >= 0 AND condition_score <= 1));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'universal_products_status_check'
      AND conrelid = 'universal_products'::regclass
  ) THEN
    ALTER TABLE universal_products
      ADD CONSTRAINT universal_products_status_check
      CHECK (status IN ('DRAFT', 'ACTIVE', 'PUBLISHED'));
  END IF;
END $$;

-- Keep save/list fast and predictable.
CREATE INDEX IF NOT EXISTS idx_universal_products_created_at ON universal_products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_universal_products_status ON universal_products(status);

-- Ensure adapters table exists for joined product reads.
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

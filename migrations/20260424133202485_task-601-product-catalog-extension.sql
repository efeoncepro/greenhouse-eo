-- Up Migration
--
-- TASK-601 Fase A (Slice 2) — Product Catalog schema extension.
--
-- Agrega 16 columnas nullable a greenhouse_commercial.product_catalog.
-- 4 columnas HS-alineadas llevan prefijo `hubspot_` para evitar colisión
-- con `product_type` (NOT NULL, CHECK service|deliverable|license|infrastructure)
-- y `pricing_model` (nullable, CHECK staff_aug|retainer|project|fixed) que ya
-- existen con semántica GH-interna.
--
-- Las 3 FKs a product_categories / product_units / tax_categories se agregan en
-- la migración siguiente (ref tables) para respetar el orden de creación.

ALTER TABLE greenhouse_commercial.product_catalog
  ADD COLUMN IF NOT EXISTS description_rich_html TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_product_type_code TEXT,
  ADD COLUMN IF NOT EXISTS category_code TEXT,
  ADD COLUMN IF NOT EXISTS unit_code TEXT,
  ADD COLUMN IF NOT EXISTS tax_category_code TEXT,
  ADD COLUMN IF NOT EXISTS hubspot_pricing_model TEXT DEFAULT 'flat',
  ADD COLUMN IF NOT EXISTS hubspot_product_classification TEXT DEFAULT 'standalone',
  ADD COLUMN IF NOT EXISTS hubspot_bundle_type_code TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_billing_period_iso TEXT,
  ADD COLUMN IF NOT EXISTS recurring_billing_frequency_code TEXT,
  ADD COLUMN IF NOT EXISTS commercial_owner_member_id TEXT,
  ADD COLUMN IF NOT EXISTS commercial_owner_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_gh_authoritative BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_url TEXT,
  ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CHECK constraints en enumerations HS para prevenir drift de valores
-- (no usamos ENUM de PostgreSQL porque HS puede agregar options futuras;
-- un CHECK es más fácil de actualizar via ALTER).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_hubspot_product_type_code_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_product_type_code_check
      CHECK (
        hubspot_product_type_code IS NULL
        OR hubspot_product_type_code IN ('service', 'inventory', 'non_inventory')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_hubspot_pricing_model_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_pricing_model_check
      CHECK (
        hubspot_pricing_model IS NULL
        OR hubspot_pricing_model IN ('flat', 'volume', 'stairstep', 'graduated')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_hubspot_product_classification_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_product_classification_check
      CHECK (
        hubspot_product_classification IS NULL
        OR hubspot_product_classification IN ('standalone', 'variant', 'bundle')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_hubspot_bundle_type_code_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_hubspot_bundle_type_code_check
      CHECK (
        hubspot_bundle_type_code IS NULL
        OR hubspot_bundle_type_code IN ('none', 'open')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_recurring_billing_frequency_code_check'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_recurring_billing_frequency_code_check
      CHECK (
        recurring_billing_frequency_code IS NULL
        OR recurring_billing_frequency_code IN (
          'weekly', 'biweekly', 'monthly', 'quarterly',
          'per_six_months', 'annually',
          'per_two_years', 'per_three_years', 'per_four_years', 'per_five_years'
        )
      );
  END IF;
END $$;

-- FK directa a greenhouse_core.members (estable, pre-existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_commercial_owner_member_id_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_commercial_owner_member_id_fkey
      FOREIGN KEY (commercial_owner_member_id)
      REFERENCES greenhouse_core.members(member_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índice partial para lookup por owner (skip rows sin owner)
CREATE INDEX IF NOT EXISTS idx_product_catalog_owner
  ON greenhouse_commercial.product_catalog (commercial_owner_member_id)
  WHERE commercial_owner_member_id IS NOT NULL;

-- Down Migration

ALTER TABLE greenhouse_commercial.product_catalog
  DROP CONSTRAINT IF EXISTS product_catalog_commercial_owner_member_id_fkey;

DROP INDEX IF EXISTS greenhouse_commercial.idx_product_catalog_owner;

ALTER TABLE greenhouse_commercial.product_catalog
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_product_type_code_check,
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_pricing_model_check,
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_product_classification_check,
  DROP CONSTRAINT IF EXISTS product_catalog_hubspot_bundle_type_code_check,
  DROP CONSTRAINT IF EXISTS product_catalog_recurring_billing_frequency_code_check;

ALTER TABLE greenhouse_commercial.product_catalog
  DROP COLUMN IF EXISTS description_rich_html,
  DROP COLUMN IF EXISTS hubspot_product_type_code,
  DROP COLUMN IF EXISTS category_code,
  DROP COLUMN IF EXISTS unit_code,
  DROP COLUMN IF EXISTS tax_category_code,
  DROP COLUMN IF EXISTS hubspot_pricing_model,
  DROP COLUMN IF EXISTS hubspot_product_classification,
  DROP COLUMN IF EXISTS hubspot_bundle_type_code,
  DROP COLUMN IF EXISTS is_recurring,
  DROP COLUMN IF EXISTS recurring_billing_period_iso,
  DROP COLUMN IF EXISTS recurring_billing_frequency_code,
  DROP COLUMN IF EXISTS commercial_owner_member_id,
  DROP COLUMN IF EXISTS commercial_owner_assigned_at,
  DROP COLUMN IF EXISTS owner_gh_authoritative,
  DROP COLUMN IF EXISTS marketing_url,
  DROP COLUMN IF EXISTS image_urls;

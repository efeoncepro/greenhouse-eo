-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_ai, greenhouse_core, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_ai TO greenhouse_app;

CREATE SEQUENCE IF NOT EXISTS greenhouse_ai.tool_sku_seq
  START WITH 27
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_ai.generate_tool_sku()
RETURNS text AS $$
BEGIN
  RETURN 'ETG-' || LPAD(nextval('greenhouse_ai.tool_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE greenhouse_ai.tool_catalog
  ADD COLUMN IF NOT EXISTS tool_sku text,
  ADD COLUMN IF NOT EXISTS prorating_qty numeric(10,2),
  ADD COLUMN IF NOT EXISTS prorating_unit text,
  ADD COLUMN IF NOT EXISTS prorated_cost_usd numeric(12,4),
  ADD COLUMN IF NOT EXISTS prorated_price_usd numeric(12,4),
  ADD COLUMN IF NOT EXISTS applicable_business_lines text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS applicability_tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS includes_in_addon boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes_for_quoting text;

ALTER TABLE greenhouse_ai.tool_catalog
  ALTER COLUMN tool_sku SET DEFAULT greenhouse_ai.generate_tool_sku();

CREATE UNIQUE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_tool_sku_idx
  ON greenhouse_ai.tool_catalog (tool_sku)
  WHERE tool_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_business_lines_idx
  ON greenhouse_ai.tool_catalog
  USING gin (applicable_business_lines);

CREATE INDEX IF NOT EXISTS greenhouse_ai_tool_catalog_applicability_tags_idx
  ON greenhouse_ai.tool_catalog
  USING gin (applicability_tags);

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.overhead_addon_sku_seq
  START WITH 10
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_overhead_addon_sku()
RETURNS text AS $$
BEGIN
  RETURN 'EFO-' || LPAD(nextval('greenhouse_commercial.overhead_addon_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.overhead_addons (
  addon_id text PRIMARY KEY DEFAULT ('oa-' || gen_random_uuid()::text),
  addon_sku text NOT NULL UNIQUE DEFAULT greenhouse_commercial.generate_overhead_addon_sku(),
  category text NOT NULL,
  addon_name text NOT NULL,
  addon_type text NOT NULL CHECK (addon_type = ANY (ARRAY[
    'overhead_fixed'::text,
    'fee_percentage'::text,
    'fee_fixed'::text,
    'resource_month'::text,
    'adjustment_pct'::text
  ])),
  unit text,
  cost_internal_usd numeric(12,2) NOT NULL DEFAULT 0,
  margin_pct numeric(5,4),
  final_price_usd numeric(12,2),
  final_price_pct numeric(5,4),
  pct_min numeric(5,4),
  pct_max numeric(5,4),
  minimum_amount_usd numeric(12,2),
  applicable_to text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text,
  conditions text,
  visible_to_client boolean NOT NULL DEFAULT TRUE,
  active boolean NOT NULL DEFAULT TRUE,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT overhead_addons_cost_internal_non_negative CHECK (cost_internal_usd >= 0),
  CONSTRAINT overhead_addons_margin_non_negative CHECK (margin_pct IS NULL OR margin_pct >= 0),
  CONSTRAINT overhead_addons_final_price_usd_non_negative CHECK (final_price_usd IS NULL OR final_price_usd >= 0),
  CONSTRAINT overhead_addons_pct_bounds CHECK (
    (pct_min IS NULL OR pct_min >= 0)
    AND (pct_max IS NULL OR pct_max >= 0)
    AND (pct_min IS NULL OR pct_max IS NULL OR pct_min <= pct_max)
  ),
  CONSTRAINT overhead_addons_minimum_non_negative CHECK (minimum_amount_usd IS NULL OR minimum_amount_usd >= 0)
);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_overhead_addons_active_idx
  ON greenhouse_commercial.overhead_addons (active, addon_sku);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_overhead_addons_applicable_to_idx
  ON greenhouse_commercial.overhead_addons
  USING gin (applicable_to);

ALTER TABLE greenhouse_commercial.overhead_addons OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.overhead_addon_sku_seq OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_ai.tool_sku_seq OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.overhead_addons TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_ai.tool_catalog TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.overhead_addons TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_ai.tool_catalog TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.overhead_addons TO greenhouse_app;
GRANT SELECT ON greenhouse_ai.tool_catalog TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.overhead_addon_sku_seq TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_ai.tool_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_ai.tool_sku_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_ai.tool_sku_seq TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.overhead_addons;

DROP FUNCTION IF EXISTS greenhouse_commercial.generate_overhead_addon_sku();
DROP SEQUENCE IF EXISTS greenhouse_commercial.overhead_addon_sku_seq;

DROP INDEX IF EXISTS greenhouse_ai_tool_catalog_applicability_tags_idx;
DROP INDEX IF EXISTS greenhouse_ai_tool_catalog_business_lines_idx;
DROP INDEX IF EXISTS greenhouse_ai_tool_catalog_tool_sku_idx;

ALTER TABLE greenhouse_ai.tool_catalog
  DROP COLUMN IF EXISTS notes_for_quoting,
  DROP COLUMN IF EXISTS includes_in_addon,
  DROP COLUMN IF EXISTS applicability_tags,
  DROP COLUMN IF EXISTS applicable_business_lines,
  DROP COLUMN IF EXISTS prorated_price_usd,
  DROP COLUMN IF EXISTS prorated_cost_usd,
  DROP COLUMN IF EXISTS prorating_unit,
  DROP COLUMN IF EXISTS prorating_qty,
  DROP COLUMN IF EXISTS tool_sku;

DROP FUNCTION IF EXISTS greenhouse_ai.generate_tool_sku();
DROP SEQUENCE IF EXISTS greenhouse_ai.tool_sku_seq;

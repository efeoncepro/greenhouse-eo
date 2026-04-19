-- Up Migration

-- TASK-465: Canonical service composition catalog.
--
-- Extends greenhouse_core.service_modules (canonical Servicio 360 identity) with
-- a commercial-only pricing extension + role/tool recipes. Does NOT create a
-- parallel service identity; every row in greenhouse_commercial.service_pricing
-- has a FK to service_modules(module_id) and every recipe row references the
-- canonical module_id. See CLAUDE.md §"Canonical 360 Object Model".
--
-- Also adds module_id / service_sku / service_line_order to quotation_line_items
-- so service-expanded quote lines carry their origin (robust to SKU renames).

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_ai, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;
GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_core TO greenhouse_migrator;

-- SKU generator: seed inserts EFG-001..007 explicitly; admin-created services
-- auto-assign via the sequence (starts at 8 to avoid collision with seed).

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.service_sku_seq
  START WITH 8
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_service_sku()
RETURNS text AS $$
BEGIN
  RETURN 'EFG-' || LPAD(nextval('greenhouse_commercial.service_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Commercial extension of greenhouse_core.service_modules.
-- 1:1 with service_modules (module_id is PK). service_pricing owns the
-- commercial metadata (tier, commercial model, duration, SKU) that is not part
-- of the canonical operational identity.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_pricing (
  module_id text PRIMARY KEY
    REFERENCES greenhouse_core.service_modules (module_id) ON DELETE CASCADE,
  service_sku text NOT NULL UNIQUE
    DEFAULT greenhouse_commercial.generate_service_sku(),
  service_category text,
  display_name text,
  service_unit text NOT NULL DEFAULT 'project'
    CHECK (service_unit = ANY (ARRAY['project'::text, 'monthly'::text])),
  service_type text,
  commercial_model text NOT NULL
    CHECK (commercial_model = ANY (ARRAY[
      'on_going'::text,
      'on_demand'::text,
      'hybrid'::text,
      'license_consulting'::text
    ])),
  tier text NOT NULL
    CHECK (tier = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text])),
  default_duration_months integer,
  default_description text,
  active boolean NOT NULL DEFAULT TRUE,
  business_line_code text,
  created_by_user_id text,
  updated_by_user_id text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_pricing_duration_non_negative
    CHECK (default_duration_months IS NULL OR default_duration_months >= 0)
);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_pricing_active_idx
  ON greenhouse_commercial.service_pricing (active, service_sku);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_pricing_tier_idx
  ON greenhouse_commercial.service_pricing (tier);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_pricing_category_idx
  ON greenhouse_commercial.service_pricing (service_category);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_pricing_business_line_idx
  ON greenhouse_commercial.service_pricing (business_line_code);

-- Role recipe: rows per service, each pointing to sellable_roles as the
-- canonical priced role identity.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_role_recipe (
  module_id text NOT NULL
    REFERENCES greenhouse_core.service_modules (module_id) ON DELETE CASCADE,
  line_order integer NOT NULL,
  role_id text NOT NULL
    REFERENCES greenhouse_commercial.sellable_roles (role_id) ON DELETE RESTRICT,
  hours_per_period numeric(8,2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_optional boolean NOT NULL DEFAULT FALSE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_id, line_order),
  CONSTRAINT service_role_recipe_hours_positive
    CHECK (hours_per_period > 0),
  CONSTRAINT service_role_recipe_quantity_positive
    CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_role_recipe_role_idx
  ON greenhouse_commercial.service_role_recipe (role_id);

-- Tool recipe: rows per service, soft FK to ai.tool_catalog (cross-schema).
-- tool_sku is denormalized for resilience to tool_catalog renames.

CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_tool_recipe (
  module_id text NOT NULL
    REFERENCES greenhouse_core.service_modules (module_id) ON DELETE CASCADE,
  line_order integer NOT NULL,
  tool_id text NOT NULL,
  tool_sku text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  is_optional boolean NOT NULL DEFAULT FALSE,
  pass_through boolean NOT NULL DEFAULT FALSE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (module_id, line_order),
  CONSTRAINT service_tool_recipe_quantity_positive
    CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS greenhouse_commercial_service_tool_recipe_tool_sku_idx
  ON greenhouse_commercial.service_tool_recipe (tool_sku);

-- quotation_line_items: trace every expanded line back to its service origin.

ALTER TABLE greenhouse_commercial.quotation_line_items
  ADD COLUMN IF NOT EXISTS module_id text,
  ADD COLUMN IF NOT EXISTS service_sku text,
  ADD COLUMN IF NOT EXISTS service_line_order integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotation_line_items_module_fkey'
      AND conrelid = 'greenhouse_commercial.quotation_line_items'::regclass
  ) THEN
    ALTER TABLE greenhouse_commercial.quotation_line_items
      ADD CONSTRAINT quotation_line_items_module_fkey
      FOREIGN KEY (module_id)
      REFERENCES greenhouse_core.service_modules (module_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS greenhouse_commercial_quotation_line_items_module_idx
  ON greenhouse_commercial.quotation_line_items (module_id)
  WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS greenhouse_commercial_quotation_line_items_service_sku_idx
  ON greenhouse_commercial.quotation_line_items (service_sku)
  WHERE service_sku IS NOT NULL;

-- Ownership + grants.

ALTER TABLE greenhouse_commercial.service_pricing OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_role_recipe OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_tool_recipe OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.service_sku_seq OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_pricing TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_role_recipe TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_tool_recipe TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.service_pricing TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.service_role_recipe TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON greenhouse_commercial.service_tool_recipe TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.service_pricing TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.service_role_recipe TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.service_tool_recipe TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.service_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.service_sku_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.service_sku_seq TO greenhouse_app;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_commercial_quotation_line_items_service_sku_idx;
DROP INDEX IF EXISTS greenhouse_commercial_quotation_line_items_module_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotation_line_items_module_fkey'
      AND conrelid = 'greenhouse_commercial.quotation_line_items'::regclass
  ) THEN
    ALTER TABLE greenhouse_commercial.quotation_line_items
      DROP CONSTRAINT quotation_line_items_module_fkey;
  END IF;
END $$;

ALTER TABLE greenhouse_commercial.quotation_line_items
  DROP COLUMN IF EXISTS service_line_order,
  DROP COLUMN IF EXISTS service_sku,
  DROP COLUMN IF EXISTS module_id;

DROP TABLE IF EXISTS greenhouse_commercial.service_tool_recipe;
DROP TABLE IF EXISTS greenhouse_commercial.service_role_recipe;
DROP TABLE IF EXISTS greenhouse_commercial.service_pricing;

DROP FUNCTION IF EXISTS greenhouse_commercial.generate_service_sku();
DROP SEQUENCE IF EXISTS greenhouse_commercial.service_sku_seq;

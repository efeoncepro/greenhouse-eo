-- Up Migration
--
-- TASK-601 Fase A (Slice 3) — Reference tables para el catálogo de productos.
--
-- 4 tablas de vocabulario controlado con mapping bidi 1:1 a HubSpot enumerations:
--   * greenhouse_commercial.product_categories  ↔ hs `categoria_de_item`
--   * greenhouse_commercial.product_units       ↔ hs `unidad`
--   * greenhouse_finance.tax_categories         ↔ hs `hs_tax_category` (options vacío hoy)
--   * greenhouse_commercial.product_source_kind_mapping
--       (source_kind interno → hubspot_product_type canónico)
--
-- Seeds poblados con los valores reales observados en el portal HS 48713323
-- durante Phase 1 Discovery de TASK-601.
--
-- Después de crear las tablas, se agregan las 3 FKs desde product_catalog
-- (columnas creadas en la migración previa 20260424133202485).

-- ─────────────────────────────────────────────────────────────
-- 1. product_categories
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_categories (
  code TEXT PRIMARY KEY,
  label_es TEXT NOT NULL,
  label_en TEXT,
  hubspot_option_value TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_hubspot_option_value
  ON greenhouse_commercial.product_categories (hubspot_option_value)
  WHERE hubspot_option_value IS NOT NULL;

INSERT INTO greenhouse_commercial.product_categories
  (code, label_es, label_en, hubspot_option_value, active, display_order)
VALUES
  ('staff_augmentation',          'Staff Augmentation',          'Staff Augmentation',          'Staff augmentation',               TRUE, 10),
  ('proyecto_implementacion',     'Proyecto o Implementación',   'Project or Implementation',   'Proyecto o Implementación',        TRUE, 20),
  ('retainer_ongoing',            'Retainer (On-Going)',         'Retainer (On-Going)',         'Retainer (On-Going)',              TRUE, 30),
  ('consultoria_estrategica_ip',  'Consultoría Estratégica - IP','Strategic Consulting - IP',   'Consultoría Estratégica - IP',     TRUE, 40),
  ('licencia_acceso_tecnologico', 'Licencia / Acceso Tecnológico','License / Technology Access','Licencia / Acceso Tecnológico',    TRUE, 50)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. product_units
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_units (
  code TEXT PRIMARY KEY,
  label_es TEXT NOT NULL,
  label_en TEXT,
  hubspot_option_value TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_units_hubspot_option_value
  ON greenhouse_commercial.product_units (hubspot_option_value)
  WHERE hubspot_option_value IS NOT NULL;

-- 12 filas matching 1:1 con HS enumeration `unidad` del portal
-- (confirmed Discovery 2026-04-24).
INSERT INTO greenhouse_commercial.product_units
  (code, label_es, label_en, hubspot_option_value, active, display_order)
VALUES
  ('hora',      'Hora',      'Hour',      'Hora',      TRUE,  10),
  ('fte',       'FTE',       'FTE',       'FTE',       TRUE,  20),
  ('dia',       'Día',       'Day',       'Día',       TRUE,  30),
  ('mes',       'Mes',       'Month',     'Mes',       TRUE,  40),
  ('trimestre', 'Trimestre', 'Quarter',   'Trimestre', TRUE,  50),
  ('proyecto',  'Proyecto',  'Project',   'Proyecto',  TRUE,  60),
  ('entrega',   'Entrega',   'Delivery',  'Entrega',   TRUE,  70),
  ('ano',       'Año',       'Year',      'Año',       TRUE,  80),
  ('licencia',  'Licencia',  'License',   'Licencia',  TRUE,  90),
  ('bolsa',     'Bolsa',     'Bundle',    'Bolsa',     TRUE, 100),
  ('creditos',  'Créditos',  'Credits',   'Créditos',  TRUE, 110),
  ('addon',     'Addon',     'Addon',     'Addon',     TRUE, 120)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. tax_categories (Chile-first; hs options vacío hoy)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_finance.tax_categories (
  code TEXT PRIMARY KEY,
  label_es TEXT NOT NULL,
  label_en TEXT,
  hubspot_option_value TEXT,
  default_rate_pct NUMERIC(6,4),
  jurisdiction TEXT NOT NULL DEFAULT 'CL',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tax_categories_hubspot_option_value
  ON greenhouse_finance.tax_categories (hubspot_option_value)
  WHERE hubspot_option_value IS NOT NULL;

-- hubspot_option_value queda NULL: el portal HS 48713323 tiene la
-- property hs_tax_category con options array vacío. Follow-up governance:
-- coordinar con HS admin la creación de options para habilitar mapping
-- bidi en TASK-603 (Fase C outbound v2).
INSERT INTO greenhouse_finance.tax_categories
  (code, label_es, label_en, hubspot_option_value, default_rate_pct, jurisdiction, active, display_order)
VALUES
  ('standard_iva_19', 'IVA Chile 19%',  'VAT Chile 19%',  NULL, 0.1900, 'CL', TRUE, 10),
  ('exempt',          'Exento',         'Exempt',         NULL, 0.0000, 'CL', TRUE, 20),
  ('non_taxable',     'No afecto',      'Non-Taxable',    NULL, 0.0000, 'CL', TRUE, 30)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 4. product_source_kind_mapping
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS greenhouse_commercial.product_source_kind_mapping (
  source_kind TEXT PRIMARY KEY,
  hubspot_product_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT product_source_kind_mapping_hubspot_product_type_check
    CHECK (hubspot_product_type IN ('service', 'inventory', 'non_inventory'))
);

INSERT INTO greenhouse_commercial.product_source_kind_mapping
  (source_kind, hubspot_product_type, notes)
VALUES
  ('service',               'service',       'Catálogo de servicios — 1:1 semántico'),
  ('sellable_role',         'service',       'Rol facturable vendido como servicio'),
  ('tool',                  'non_inventory', 'Software / licencia, no inventariable'),
  ('overhead_addon',        'non_inventory', 'Add-on operativo, no inventariable'),
  ('manual',                'service',       'Default — operador puede override en UI admin'),
  ('sellable_role_variant', 'service',       'Variante de rol facturable (TASK-545 source kinds)'),
  ('hubspot_imported',      'service',       'Producto importado desde HubSpot pre-canonical')
ON CONFLICT (source_kind) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. FKs desde product_catalog (columnas existen desde migración previa)
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_category_code_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_category_code_fkey
      FOREIGN KEY (category_code)
      REFERENCES greenhouse_commercial.product_categories(code)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_unit_code_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_unit_code_fkey
      FOREIGN KEY (unit_code)
      REFERENCES greenhouse_commercial.product_units(code)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'product_catalog_tax_category_code_fkey'
  ) THEN
    ALTER TABLE greenhouse_commercial.product_catalog
      ADD CONSTRAINT product_catalog_tax_category_code_fkey
      FOREIGN KEY (tax_category_code)
      REFERENCES greenhouse_finance.tax_categories(code)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Down Migration

ALTER TABLE greenhouse_commercial.product_catalog
  DROP CONSTRAINT IF EXISTS product_catalog_category_code_fkey,
  DROP CONSTRAINT IF EXISTS product_catalog_unit_code_fkey,
  DROP CONSTRAINT IF EXISTS product_catalog_tax_category_code_fkey;

DROP TABLE IF EXISTS greenhouse_commercial.product_source_kind_mapping;
DROP TABLE IF EXISTS greenhouse_finance.tax_categories;
DROP TABLE IF EXISTS greenhouse_commercial.product_units;
DROP TABLE IF EXISTS greenhouse_commercial.product_categories;

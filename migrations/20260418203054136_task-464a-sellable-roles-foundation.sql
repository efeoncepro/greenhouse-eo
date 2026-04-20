-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE SEQUENCE IF NOT EXISTS greenhouse_commercial.sellable_role_sku_seq
  START WITH 33
  INCREMENT BY 1
  MINVALUE 1
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION greenhouse_commercial.generate_sellable_role_sku()
RETURNS text AS $$
BEGIN
  RETURN 'ECG-' || LPAD(nextval('greenhouse_commercial.sellable_role_sku_seq')::text, 3, '0');
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_roles (
  role_id text PRIMARY KEY DEFAULT ('sr-' || gen_random_uuid()::text),
  role_sku text NOT NULL UNIQUE DEFAULT greenhouse_commercial.generate_sellable_role_sku(),
  role_code text NOT NULL UNIQUE,
  role_label_es text NOT NULL,
  role_label_en text,
  category text NOT NULL CHECK (category = ANY (ARRAY[
    'creativo'::text,
    'pr'::text,
    'performance'::text,
    'consultoria'::text,
    'tech'::text
  ])),
  tier text NOT NULL CHECK (tier = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text])),
  tier_label text NOT NULL,
  can_sell_as_staff boolean NOT NULL DEFAULT FALSE,
  can_sell_as_service_component boolean NOT NULL DEFAULT TRUE,
  active boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sellable_roles_category_tier_active
  ON greenhouse_commercial.sellable_roles (category, tier, active);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.employment_types (
  employment_type_code text PRIMARY KEY,
  label_es text NOT NULL,
  label_en text,
  payment_currency text NOT NULL CHECK (payment_currency = ANY (ARRAY[
    'CLP'::text,
    'USD'::text,
    'EUR'::text,
    'GBP'::text
  ])),
  country_code text NOT NULL,
  applies_previsional boolean NOT NULL,
  previsional_pct_default numeric(5,4),
  fee_monthly_usd_default numeric(10,2) NOT NULL DEFAULT 0,
  fee_pct_default numeric(5,4),
  applies_bonuses boolean NOT NULL DEFAULT TRUE,
  source_of_truth text NOT NULL DEFAULT 'catalog_manual' CHECK (source_of_truth = ANY (ARRAY[
    'catalog_manual'::text,
    'greenhouse_payroll_chile_rates'::text,
    'provider_api'::text
  ])),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_role_cost_components (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  employment_type_code text NOT NULL REFERENCES greenhouse_commercial.employment_types(employment_type_code),
  effective_from date NOT NULL,
  base_salary_usd numeric(12,2) NOT NULL,
  bonus_jit_usd numeric(12,2) NOT NULL DEFAULT 0,
  bonus_rpa_usd numeric(12,2) NOT NULL DEFAULT 0,
  bonus_ar_usd numeric(12,2) NOT NULL DEFAULT 0,
  bonus_sobrecumplimiento_usd numeric(12,2) NOT NULL DEFAULT 0,
  gastos_previsionales_usd numeric(12,2) NOT NULL DEFAULT 0,
  fee_deel_usd numeric(12,2) NOT NULL DEFAULT 0,
  fee_eor_usd numeric(12,2) NOT NULL DEFAULT 0,
  hours_per_fte_month integer NOT NULL DEFAULT 180,
  total_monthly_cost_usd numeric(12,2) GENERATED ALWAYS AS (
    base_salary_usd
      + COALESCE(bonus_jit_usd, 0)
      + COALESCE(bonus_rpa_usd, 0)
      + COALESCE(bonus_ar_usd, 0)
      + COALESCE(bonus_sobrecumplimiento_usd, 0)
      + COALESCE(gastos_previsionales_usd, 0)
      + COALESCE(fee_deel_usd, 0)
      + COALESCE(fee_eor_usd, 0)
  ) STORED,
  hourly_cost_usd numeric(12,4) GENERATED ALWAYS AS (
    (
      base_salary_usd
        + COALESCE(bonus_jit_usd, 0)
        + COALESCE(bonus_rpa_usd, 0)
        + COALESCE(bonus_ar_usd, 0)
        + COALESCE(bonus_sobrecumplimiento_usd, 0)
        + COALESCE(gastos_previsionales_usd, 0)
        + COALESCE(fee_deel_usd, 0)
        + COALESCE(fee_eor_usd, 0)
    ) / NULLIF(hours_per_fte_month::numeric, 0)
  ) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, employment_type_code, effective_from),
  CONSTRAINT sellable_role_cost_components_hours_positive CHECK (hours_per_fte_month > 0),
  CONSTRAINT sellable_role_cost_components_base_non_negative CHECK (base_salary_usd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sellable_role_cost_components_lookup
  ON greenhouse_commercial.sellable_role_cost_components (role_id, employment_type_code, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.role_employment_compatibility (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  employment_type_code text NOT NULL REFERENCES greenhouse_commercial.employment_types(employment_type_code),
  is_default boolean NOT NULL DEFAULT FALSE,
  allowed boolean NOT NULL DEFAULT TRUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, employment_type_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_employment_single_default
  ON greenhouse_commercial.role_employment_compatibility (role_id)
  WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.sellable_role_pricing_currency (
  role_id text NOT NULL REFERENCES greenhouse_commercial.sellable_roles(role_id) ON DELETE CASCADE,
  currency_code text NOT NULL CHECK (currency_code = ANY (ARRAY[
    'USD'::text,
    'CLP'::text,
    'CLF'::text,
    'COP'::text,
    'MXN'::text,
    'PEN'::text
  ])),
  effective_from date NOT NULL,
  margin_pct numeric(5,4) NOT NULL,
  hourly_price numeric(18,4) NOT NULL,
  fte_monthly_price numeric(18,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, currency_code, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_sellable_role_pricing_currency_lookup
  ON greenhouse_commercial.sellable_role_pricing_currency (role_id, currency_code, effective_from DESC);

ALTER TABLE greenhouse_commercial.sellable_roles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.employment_types OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.sellable_role_cost_components OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.role_employment_compatibility OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.sellable_role_pricing_currency OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_commercial.sellable_role_sku_seq OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.sellable_roles TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.employment_types TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.sellable_role_cost_components TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.role_employment_compatibility TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.sellable_role_pricing_currency TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.sellable_roles TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.employment_types TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.sellable_role_cost_components TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.role_employment_compatibility TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.sellable_role_pricing_currency TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.sellable_roles TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.employment_types TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.sellable_role_cost_components TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.role_employment_compatibility TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.sellable_role_pricing_currency TO greenhouse_app;

GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_runtime;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_migrator;
GRANT USAGE, SELECT ON SEQUENCE greenhouse_commercial.sellable_role_sku_seq TO greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT SELECT ON TABLES TO greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  GRANT USAGE, SELECT ON SEQUENCES TO greenhouse_app;

-- Down Migration

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE USAGE, SELECT ON SEQUENCES FROM greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE USAGE, SELECT ON SEQUENCES FROM greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE USAGE, SELECT ON SEQUENCES FROM greenhouse_runtime;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE SELECT ON TABLES FROM greenhouse_app;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM greenhouse_migrator;

ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_commercial
  REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM greenhouse_runtime;

DROP TABLE IF EXISTS greenhouse_commercial.sellable_role_pricing_currency;
DROP TABLE IF EXISTS greenhouse_commercial.role_employment_compatibility;
DROP TABLE IF EXISTS greenhouse_commercial.sellable_role_cost_components;
DROP TABLE IF EXISTS greenhouse_commercial.employment_types;
DROP TABLE IF EXISTS greenhouse_commercial.sellable_roles;
DROP FUNCTION IF EXISTS greenhouse_commercial.generate_sellable_role_sku();
DROP SEQUENCE IF EXISTS greenhouse_commercial.sellable_role_sku_seq;

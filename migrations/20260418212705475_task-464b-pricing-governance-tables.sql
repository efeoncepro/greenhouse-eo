-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.role_tier_margins (
  tier text NOT NULL CHECK (tier = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text])),
  tier_label text NOT NULL,
  margin_min numeric(5,4) NOT NULL,
  margin_opt numeric(5,4) NOT NULL,
  margin_max numeric(5,4) NOT NULL,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tier, effective_from),
  CONSTRAINT role_tier_margins_non_negative CHECK (
    margin_min >= 0
    AND margin_opt >= 0
    AND margin_max >= 0
  ),
  CONSTRAINT role_tier_margins_bounds CHECK (margin_min <= margin_opt AND margin_opt <= margin_max)
);

CREATE INDEX IF NOT EXISTS idx_role_tier_margins_lookup
  ON greenhouse_commercial.role_tier_margins (tier, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.service_tier_margins (
  tier text NOT NULL CHECK (tier = ANY (ARRAY['1'::text, '2'::text, '3'::text, '4'::text])),
  tier_label text NOT NULL,
  margin_base numeric(5,4) NOT NULL,
  description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tier, effective_from),
  CONSTRAINT service_tier_margins_non_negative CHECK (margin_base >= 0)
);

CREATE INDEX IF NOT EXISTS idx_service_tier_margins_lookup
  ON greenhouse_commercial.service_tier_margins (tier, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.commercial_model_multipliers (
  model_code text NOT NULL CHECK (model_code = ANY (ARRAY[
    'on_going'::text,
    'on_demand'::text,
    'hybrid'::text,
    'license_consulting'::text
  ])),
  model_label text NOT NULL,
  multiplier_pct numeric(5,4) NOT NULL,
  description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (model_code, effective_from),
  CONSTRAINT commercial_model_multipliers_non_negative CHECK (multiplier_pct >= 0)
);

CREATE INDEX IF NOT EXISTS idx_commercial_model_multipliers_lookup
  ON greenhouse_commercial.commercial_model_multipliers (model_code, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.country_pricing_factors (
  factor_code text NOT NULL CHECK (factor_code = ANY (ARRAY[
    'chile_corporate'::text,
    'chile_pyme'::text,
    'colombia_latam'::text,
    'international_usd'::text,
    'licitacion_publica'::text,
    'cliente_estrategico'::text
  ])),
  factor_label text NOT NULL,
  factor_min numeric(5,4) NOT NULL,
  factor_opt numeric(5,4) NOT NULL,
  factor_max numeric(5,4) NOT NULL,
  applies_when text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (factor_code, effective_from),
  CONSTRAINT country_pricing_factors_positive CHECK (
    factor_min > 0
    AND factor_opt > 0
    AND factor_max > 0
  ),
  CONSTRAINT country_pricing_factors_bounds CHECK (factor_min <= factor_opt AND factor_opt <= factor_max)
);

CREATE INDEX IF NOT EXISTS idx_country_pricing_factors_lookup
  ON greenhouse_commercial.country_pricing_factors (factor_code, effective_from DESC);

CREATE TABLE IF NOT EXISTS greenhouse_commercial.fte_hours_guide (
  fte_fraction numeric(3,2) NOT NULL,
  fte_label text NOT NULL,
  monthly_hours integer NOT NULL,
  recommended_description text,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fte_fraction, effective_from),
  CONSTRAINT fte_hours_guide_fraction_bounds CHECK (fte_fraction > 0 AND fte_fraction <= 1.00),
  CONSTRAINT fte_hours_guide_hours_positive CHECK (monthly_hours > 0)
);

CREATE INDEX IF NOT EXISTS idx_fte_hours_guide_lookup
  ON greenhouse_commercial.fte_hours_guide (fte_fraction, effective_from DESC);

ALTER TABLE greenhouse_commercial.role_tier_margins OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.service_tier_margins OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.commercial_model_multipliers OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.country_pricing_factors OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_commercial.fte_hours_guide OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.role_tier_margins TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.service_tier_margins TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.commercial_model_multipliers TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.country_pricing_factors TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.fte_hours_guide TO greenhouse_runtime;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.role_tier_margins TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.service_tier_margins TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.commercial_model_multipliers TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.country_pricing_factors TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.fte_hours_guide TO greenhouse_migrator;

GRANT SELECT ON greenhouse_commercial.role_tier_margins TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.service_tier_margins TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.commercial_model_multipliers TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.country_pricing_factors TO greenhouse_app;
GRANT SELECT ON greenhouse_commercial.fte_hours_guide TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.fte_hours_guide;
DROP TABLE IF EXISTS greenhouse_commercial.country_pricing_factors;
DROP TABLE IF EXISTS greenhouse_commercial.commercial_model_multipliers;
DROP TABLE IF EXISTS greenhouse_commercial.service_tier_margins;
DROP TABLE IF EXISTS greenhouse_commercial.role_tier_margins;

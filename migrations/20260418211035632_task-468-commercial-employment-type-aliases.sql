-- Up Migration

SET search_path = greenhouse_commercial, greenhouse_core, greenhouse_sync, public;

GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_runtime;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_migrator;
GRANT USAGE ON SCHEMA greenhouse_commercial TO greenhouse_app;

CREATE TABLE IF NOT EXISTS greenhouse_commercial.employment_type_aliases (
  source_system text NOT NULL CHECK (source_system = ANY (ARRAY[
    'greenhouse_payroll.contract_type'::text,
    'legacy_pricing_seed'::text,
    'manual_admin'::text
  ])),
  source_value text NOT NULL,
  source_value_normalized text NOT NULL,
  employment_type_code text REFERENCES greenhouse_commercial.employment_types(employment_type_code),
  resolution_status text NOT NULL DEFAULT 'mapped' CHECK (resolution_status = ANY (ARRAY[
    'mapped'::text,
    'needs_review'::text,
    'deprecated'::text
  ])),
  confidence text NOT NULL DEFAULT 'canonical' CHECK (confidence = ANY (ARRAY[
    'canonical'::text,
    'high'::text,
    'medium'::text,
    'low'::text
  ])),
  notes text,
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (source_system, source_value_normalized),
  CONSTRAINT employment_type_aliases_source_value_not_blank
    CHECK (btrim(source_value) <> ''::text),
  CONSTRAINT employment_type_aliases_source_value_normalized_not_blank
    CHECK (btrim(source_value_normalized) <> ''::text),
  CONSTRAINT employment_type_aliases_status_target_consistency
    CHECK (
      (resolution_status = 'mapped'::text AND employment_type_code IS NOT NULL)
      OR resolution_status = ANY (ARRAY['needs_review'::text, 'deprecated'::text])
    )
);

CREATE INDEX IF NOT EXISTS idx_employment_type_aliases_target
  ON greenhouse_commercial.employment_type_aliases (employment_type_code, active)
  WHERE employment_type_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employment_type_aliases_source_system_active
  ON greenhouse_commercial.employment_type_aliases (source_system, active);

INSERT INTO greenhouse_commercial.employment_type_aliases (
  source_system,
  source_value,
  source_value_normalized,
  employment_type_code,
  resolution_status,
  confidence,
  notes
)
VALUES
  (
    'greenhouse_payroll.contract_type',
    'indefinido',
    'indefinido',
    'indefinido_clp',
    'mapped',
    'canonical',
    'Payroll contract type canonical mapping'
  ),
  (
    'greenhouse_payroll.contract_type',
    'plazo_fijo',
    'plazo_fijo',
    'plazo_fijo_clp',
    'mapped',
    'canonical',
    'Payroll contract type canonical mapping'
  ),
  (
    'greenhouse_payroll.contract_type',
    'honorarios',
    'honorarios',
    'honorarios_clp',
    'mapped',
    'canonical',
    'Payroll contract type canonical mapping'
  ),
  (
    'greenhouse_payroll.contract_type',
    'contractor',
    'contractor',
    'contractor_deel_usd',
    'mapped',
    'high',
    'Default bridge mapping; can be overridden by governance later if needed'
  ),
  (
    'greenhouse_payroll.contract_type',
    'eor',
    'eor',
    'contractor_eor_usd',
    'mapped',
    'canonical',
    'Payroll contract type canonical mapping'
  ),
  (
    'legacy_pricing_seed',
    'contrator',
    'contrator',
    'contractor_deel_usd',
    'mapped',
    'medium',
    'Legacy typo kept explicit to avoid silent fallbacks'
  ),
  (
    'legacy_pricing_seed',
    'part-time',
    'part_time',
    'part_time_clp',
    'mapped',
    'high',
    'Legacy hyphenated alias'
  )
ON CONFLICT (source_system, source_value_normalized) DO UPDATE
SET source_value = EXCLUDED.source_value,
    employment_type_code = EXCLUDED.employment_type_code,
    resolution_status = EXCLUDED.resolution_status,
    confidence = EXCLUDED.confidence,
    notes = EXCLUDED.notes,
    active = TRUE,
    updated_at = CURRENT_TIMESTAMP;

ALTER TABLE greenhouse_commercial.employment_type_aliases OWNER TO greenhouse_ops;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_commercial.employment_type_aliases TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_commercial.employment_type_aliases TO greenhouse_migrator;
GRANT SELECT ON greenhouse_commercial.employment_type_aliases TO greenhouse_app;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_commercial.employment_type_aliases;

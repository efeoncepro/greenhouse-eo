-- Up Migration

-- TASK-812 — Chile payroll compliance export artifact registry.
--
-- Previred and LRE downloads are immutable projections over closed payroll
-- entries. The generated file is returned to the caller, while this table keeps
-- the auditable envelope: source spec, file hash, source snapshot hash, totals,
-- validation result and lifecycle declared by the operator.

CREATE TABLE IF NOT EXISTS greenhouse_payroll.compliance_export_artifacts (
  artifact_id TEXT PRIMARY KEY,
  period_id TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id),
  space_id TEXT,
  export_kind TEXT NOT NULL CHECK (export_kind IN ('previred', 'lre')),
  spec_version TEXT NOT NULL,
  spec_source_url TEXT NOT NULL,
  source_snapshot_hash TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  encoding TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  totals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('passed', 'failed')),
  validation_errors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  declared_status TEXT NOT NULL DEFAULT 'generated' CHECK (
    declared_status IN ('generated', 'uploaded_by_operator', 'replaced', 'voided')
  ),
  asset_id TEXT,
  storage_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_export_artifacts_validation_errors_array CHECK (
    jsonb_typeof(validation_errors_json) = 'array'
  ),
  CONSTRAINT compliance_export_artifacts_totals_object CHECK (
    jsonb_typeof(totals_json) = 'object'
  )
);

CREATE INDEX IF NOT EXISTS compliance_export_artifacts_period_kind_generated_idx
  ON greenhouse_payroll.compliance_export_artifacts(period_id, export_kind, generated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS compliance_export_artifacts_file_hash_unique_idx
  ON greenhouse_payroll.compliance_export_artifacts(export_kind, artifact_sha256);

GRANT SELECT, INSERT, UPDATE ON greenhouse_payroll.compliance_export_artifacts TO greenhouse_runtime;
GRANT SELECT ON greenhouse_payroll.compliance_export_artifacts TO greenhouse_app;

INSERT INTO greenhouse_core.capabilities_registry (capability_key, module, allowed_actions, allowed_scopes, description) VALUES
  (
    'hr.payroll.export_previred',
    'hr',
    ARRAY['export'],
    ARRAY['tenant','all'],
    'TASK-812 — Generate audited Chile Previred payroll compliance export artifacts.'
  ),
  (
    'hr.payroll.export_lre',
    'hr',
    ARRAY['export'],
    ARRAY['tenant','all'],
    'TASK-812 — Generate audited Chile Libro de Remuneraciones Electronico export artifacts.'
  )
ON CONFLICT (capability_key) DO UPDATE SET
  module = EXCLUDED.module,
  allowed_actions = EXCLUDED.allowed_actions,
  allowed_scopes = EXCLUDED.allowed_scopes,
  description = EXCLUDED.description;

-- Down Migration

DELETE FROM greenhouse_core.capabilities_registry
WHERE capability_key IN ('hr.payroll.export_previred', 'hr.payroll.export_lre');

DROP TABLE IF EXISTS greenhouse_payroll.compliance_export_artifacts;

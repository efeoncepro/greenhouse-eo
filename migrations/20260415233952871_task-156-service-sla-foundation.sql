-- Up Migration

SET search_path = greenhouse_core, greenhouse_serving, public;

CREATE TABLE greenhouse_core.service_sla_definitions (
  definition_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  indicator_code TEXT NOT NULL,
  indicator_formula TEXT NOT NULL,
  measurement_source TEXT NOT NULL,
  comparison_mode TEXT NOT NULL,
  unit TEXT NOT NULL,
  sli_label TEXT,
  slo_target_value NUMERIC(14,4) NOT NULL,
  sla_target_value NUMERIC(14,4) NOT NULL,
  breach_threshold NUMERIC(14,4),
  warning_threshold NUMERIC(14,4),
  display_order INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_sla_definitions_indicator_code_check CHECK (
    indicator_code = ANY (ARRAY[
      'otd_pct'::TEXT,
      'rpa_avg'::TEXT,
      'ftr_pct'::TEXT,
      'revision_rounds'::TEXT,
      'ttm_days'::TEXT
    ])
  ),
  CONSTRAINT service_sla_definitions_comparison_mode_check CHECK (
    comparison_mode = ANY (ARRAY['at_least'::TEXT, 'at_most'::TEXT])
  ),
  CONSTRAINT service_sla_definitions_unit_check CHECK (
    unit = ANY (ARRAY['percent'::TEXT, 'ratio'::TEXT, 'rounds'::TEXT, 'days'::TEXT])
  ),
  CONSTRAINT service_sla_definitions_targets_non_negative_check CHECK (
    slo_target_value >= 0 AND sla_target_value >= 0
  ),
  CONSTRAINT service_sla_definitions_thresholds_order_check CHECK (
    breach_threshold IS NULL
    OR warning_threshold IS NULL
    OR (
      comparison_mode = 'at_least'
      AND warning_threshold >= breach_threshold
    )
    OR (
      comparison_mode = 'at_most'
      AND warning_threshold <= breach_threshold
    )
  ),
  CONSTRAINT service_sla_definitions_unique_service_indicator UNIQUE (service_id, indicator_code)
);

CREATE INDEX idx_service_sla_definitions_space_service
  ON greenhouse_core.service_sla_definitions (space_id, service_id);

CREATE INDEX idx_service_sla_definitions_indicator
  ON greenhouse_core.service_sla_definitions (indicator_code, active);

CREATE TABLE greenhouse_serving.service_sla_compliance_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL REFERENCES greenhouse_core.service_sla_definitions(definition_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES greenhouse_core.services(service_id) ON DELETE CASCADE,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  indicator_code TEXT NOT NULL,
  comparison_mode TEXT NOT NULL,
  unit TEXT NOT NULL,
  compliance_status TEXT NOT NULL,
  source_status TEXT NOT NULL,
  trend_status TEXT NOT NULL DEFAULT 'unknown',
  actual_value NUMERIC(14,4),
  slo_target_value NUMERIC(14,4) NOT NULL,
  sla_target_value NUMERIC(14,4) NOT NULL,
  breach_threshold NUMERIC(14,4),
  warning_threshold NUMERIC(14,4),
  delta_to_target NUMERIC(14,4),
  confidence_level TEXT,
  source_period_year INTEGER,
  source_period_month INTEGER,
  evidence_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT service_sla_compliance_snapshots_indicator_code_check CHECK (
    indicator_code = ANY (ARRAY[
      'otd_pct'::TEXT,
      'rpa_avg'::TEXT,
      'ftr_pct'::TEXT,
      'revision_rounds'::TEXT,
      'ttm_days'::TEXT
    ])
  ),
  CONSTRAINT service_sla_compliance_snapshots_comparison_mode_check CHECK (
    comparison_mode = ANY (ARRAY['at_least'::TEXT, 'at_most'::TEXT])
  ),
  CONSTRAINT service_sla_compliance_snapshots_unit_check CHECK (
    unit = ANY (ARRAY['percent'::TEXT, 'ratio'::TEXT, 'rounds'::TEXT, 'days'::TEXT])
  ),
  CONSTRAINT service_sla_compliance_snapshots_status_check CHECK (
    compliance_status = ANY (ARRAY[
      'met'::TEXT,
      'at_risk'::TEXT,
      'breached'::TEXT,
      'source_unavailable'::TEXT,
      'no_sla_defined'::TEXT
    ])
  ),
  CONSTRAINT service_sla_compliance_snapshots_source_status_check CHECK (
    source_status = ANY (ARRAY[
      'ready'::TEXT,
      'source_unavailable'::TEXT,
      'insufficient_linkage'::TEXT,
      'insufficient_sample'::TEXT,
      'not_applicable'::TEXT
    ])
  ),
  CONSTRAINT service_sla_compliance_snapshots_trend_status_check CHECK (
    trend_status = ANY (ARRAY[
      'improving'::TEXT,
      'stable'::TEXT,
      'degrading'::TEXT,
      'unknown'::TEXT
    ])
  ),
  CONSTRAINT service_sla_compliance_snapshots_confidence_level_check CHECK (
    confidence_level IS NULL
    OR confidence_level = ANY (ARRAY['high'::TEXT, 'medium'::TEXT, 'low'::TEXT, 'none'::TEXT])
  ),
  CONSTRAINT service_sla_compliance_snapshots_unique_definition UNIQUE (definition_id)
);

CREATE INDEX idx_service_sla_compliance_snapshots_space_service
  ON greenhouse_serving.service_sla_compliance_snapshots (space_id, service_id);

CREATE INDEX idx_service_sla_compliance_snapshots_status
  ON greenhouse_serving.service_sla_compliance_snapshots (compliance_status, source_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.service_sla_definitions TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_core.service_sla_definitions TO greenhouse_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_serving.service_sla_compliance_snapshots TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON greenhouse_serving.service_sla_compliance_snapshots TO greenhouse_migrator;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_serving.idx_service_sla_compliance_snapshots_status;
DROP INDEX IF EXISTS greenhouse_serving.idx_service_sla_compliance_snapshots_space_service;
DROP TABLE IF EXISTS greenhouse_serving.service_sla_compliance_snapshots;

DROP INDEX IF EXISTS greenhouse_core.idx_service_sla_definitions_indicator;
DROP INDEX IF EXISTS greenhouse_core.idx_service_sla_definitions_space_service;
DROP TABLE IF EXISTS greenhouse_core.service_sla_definitions;

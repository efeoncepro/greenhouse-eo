-- Up Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_sync.integration_data_quality_runs (
  data_quality_run_id TEXT PRIMARY KEY,
  integration_key TEXT NOT NULL REFERENCES greenhouse_sync.integration_registry(integration_key) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  pipeline_key TEXT NOT NULL,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  source_sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  execution_source TEXT NOT NULL DEFAULT 'cron',
  execution_status TEXT NOT NULL DEFAULT 'running',
  quality_status TEXT NOT NULL DEFAULT 'unknown',
  period_field TEXT NOT NULL DEFAULT 'due_date',
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  warning_checks INTEGER NOT NULL DEFAULT 0,
  error_checks INTEGER NOT NULL DEFAULT 0,
  raw_freshness_ready BOOLEAN NOT NULL DEFAULT FALSE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  alert_sent_at TIMESTAMPTZ,
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_data_quality_runs_execution_source_check CHECK (
    execution_source IN ('cron', 'post_sync', 'manual', 'api')
  ),
  CONSTRAINT integration_data_quality_runs_execution_status_check CHECK (
    execution_status IN ('running', 'completed', 'failed', 'cancelled')
  ),
  CONSTRAINT integration_data_quality_runs_quality_status_check CHECK (
    quality_status IN ('healthy', 'degraded', 'broken', 'unknown')
  ),
  CONSTRAINT integration_data_quality_runs_period_field_check CHECK (
    period_field IN ('due_date', 'created_at')
  ),
  CONSTRAINT integration_data_quality_runs_period_month_check CHECK (
    period_month BETWEEN 1 AND 12
  )
);

COMMENT ON TABLE greenhouse_sync.integration_data_quality_runs IS
  'Historical run ledger for integration data quality monitors. Used by TASK-208 to persist recurring Notion Delivery parity and freshness audits.';

CREATE INDEX IF NOT EXISTS idx_integration_data_quality_runs_latest
  ON greenhouse_sync.integration_data_quality_runs (integration_key, monitor_key, space_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_data_quality_runs_status
  ON greenhouse_sync.integration_data_quality_runs (quality_status, execution_status, checked_at DESC);

CREATE TABLE IF NOT EXISTS greenhouse_sync.integration_data_quality_checks (
  data_quality_check_id TEXT PRIMARY KEY,
  data_quality_run_id TEXT NOT NULL REFERENCES greenhouse_sync.integration_data_quality_runs(data_quality_run_id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL REFERENCES greenhouse_sync.integration_registry(integration_key) ON DELETE CASCADE,
  monitor_key TEXT NOT NULL,
  pipeline_key TEXT NOT NULL,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'ok',
  summary TEXT NOT NULL,
  observed_value TEXT,
  expected_value TEXT,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT integration_data_quality_checks_severity_check CHECK (
    severity IN ('ok', 'warning', 'error')
  ),
  CONSTRAINT integration_data_quality_checks_unique_per_run UNIQUE (data_quality_run_id, check_key)
);

COMMENT ON TABLE greenhouse_sync.integration_data_quality_checks IS
  'Check-level results for each historical integration data quality run. Stores severities, values and structured evidence per space.';

CREATE INDEX IF NOT EXISTS idx_integration_data_quality_checks_run
  ON greenhouse_sync.integration_data_quality_checks (data_quality_run_id, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integration_data_quality_checks_space
  ON greenhouse_sync.integration_data_quality_checks (integration_key, monitor_key, space_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.integration_data_quality_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.integration_data_quality_checks TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.integration_data_quality_runs TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.integration_data_quality_checks TO greenhouse_migrator;

-- Down Migration

DROP TABLE IF EXISTS greenhouse_sync.integration_data_quality_checks;
DROP TABLE IF EXISTS greenhouse_sync.integration_data_quality_runs;

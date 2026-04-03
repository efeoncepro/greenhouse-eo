-- Up Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_sync.notion_sync_orchestration_runs (
  orchestration_run_id TEXT PRIMARY KEY,
  integration_key TEXT NOT NULL REFERENCES greenhouse_sync.integration_registry(integration_key) ON DELETE CASCADE,
  pipeline_key TEXT NOT NULL DEFAULT 'notion_delivery_sync',
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  source_sync_run_id TEXT REFERENCES greenhouse_sync.source_sync_runs(sync_run_id) ON DELETE SET NULL,
  orchestration_status TEXT NOT NULL DEFAULT 'waiting_for_raw',
  trigger_source TEXT NOT NULL DEFAULT 'cron_primary',
  retry_attempt INTEGER NOT NULL DEFAULT 0,
  max_retry_attempts INTEGER NOT NULL DEFAULT 8,
  raw_boundary_start_at TIMESTAMPTZ,
  latest_raw_synced_at TIMESTAMPTZ,
  waiting_reason TEXT,
  next_retry_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notion_sync_orchestration_runs_status_check CHECK (
    orchestration_status IN (
      'waiting_for_raw',
      'retry_scheduled',
      'retry_running',
      'sync_completed',
      'sync_failed',
      'cancelled'
    )
  ),
  CONSTRAINT notion_sync_orchestration_runs_trigger_source_check CHECK (
    trigger_source IN (
      'cron_primary',
      'cron_recovery',
      'manual_admin'
    )
  ),
  CONSTRAINT notion_sync_orchestration_runs_retry_bounds_check CHECK (
    retry_attempt >= 0 AND max_retry_attempts >= 1 AND retry_attempt <= max_retry_attempts + 1
  )
);

COMMENT ON TABLE greenhouse_sync.notion_sync_orchestration_runs IS
  'Tenant-scoped control plane for TASK-209. Tracks waiting-for-raw and retry orchestration until the canonical Notion conformed sync converges.';

COMMENT ON COLUMN greenhouse_sync.notion_sync_orchestration_runs.orchestration_status IS
  'Operational lifecycle for each space while raw freshness blocks or retries the canonical sync.';

CREATE INDEX IF NOT EXISTS idx_notion_sync_orchestration_runs_retry
  ON greenhouse_sync.notion_sync_orchestration_runs (
    integration_key,
    pipeline_key,
    orchestration_status,
    next_retry_at,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS idx_notion_sync_orchestration_runs_space
  ON greenhouse_sync.notion_sync_orchestration_runs (
    integration_key,
    pipeline_key,
    space_id,
    created_at DESC
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_notion_sync_orchestration_runs_open_space
  ON greenhouse_sync.notion_sync_orchestration_runs (
    integration_key,
    pipeline_key,
    space_id
  )
  WHERE orchestration_status IN ('waiting_for_raw', 'retry_scheduled', 'retry_running');

GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.notion_sync_orchestration_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.notion_sync_orchestration_runs TO greenhouse_migrator;

UPDATE greenhouse_sync.integration_registry
SET
  sync_cadence = 'daily_windowed_retry',
  updated_at = NOW()
WHERE integration_key = 'notion';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.uq_notion_sync_orchestration_runs_open_space;
DROP INDEX IF EXISTS greenhouse_sync.idx_notion_sync_orchestration_runs_space;
DROP INDEX IF EXISTS greenhouse_sync.idx_notion_sync_orchestration_runs_retry;
DROP TABLE IF EXISTS greenhouse_sync.notion_sync_orchestration_runs;

-- Up Migration

SET search_path = greenhouse_sync, greenhouse_core, public;

CREATE TABLE IF NOT EXISTS greenhouse_core.space_notion_publication_targets (
  target_id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  publication_key TEXT NOT NULL,
  notion_workspace_id TEXT,
  notion_database_id TEXT,
  notion_data_source_id TEXT,
  notion_parent_page_id TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  CONSTRAINT space_notion_publication_targets_target_check CHECK (
    notion_database_id IS NOT NULL OR notion_parent_page_id IS NOT NULL
  ),
  CONSTRAINT space_notion_publication_targets_publication_key_check CHECK (
    publication_key IN ('delivery_performance_reports')
  ),
  CONSTRAINT space_notion_publication_targets_unique UNIQUE (space_id, publication_key)
);

COMMENT ON TABLE greenhouse_core.space_notion_publication_targets IS
  'Outbound Notion publication targets per space and publication lane. Used by TASK-202 to publish Greenhouse-first monthly reports.';

CREATE INDEX IF NOT EXISTS idx_space_notion_publication_targets_active
  ON greenhouse_core.space_notion_publication_targets (publication_key, active, space_id);

CREATE TABLE IF NOT EXISTS greenhouse_sync.notion_publication_runs (
  publication_run_id TEXT PRIMARY KEY,
  integration_key TEXT NOT NULL REFERENCES greenhouse_sync.integration_registry(integration_key) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES greenhouse_core.space_notion_publication_targets(target_id) ON DELETE RESTRICT,
  space_id TEXT NOT NULL REFERENCES greenhouse_core.spaces(space_id) ON DELETE CASCADE,
  publication_key TEXT NOT NULL,
  report_scope TEXT NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  target_page_id TEXT,
  target_database_id TEXT,
  payload_hash TEXT,
  source TEXT NOT NULL DEFAULT 'greenhouse_serving.agency_performance_reports',
  status TEXT NOT NULL DEFAULT 'running',
  result_summary TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT notion_publication_runs_status_check CHECK (
    status IN ('running', 'succeeded', 'failed', 'skipped')
  ),
  CONSTRAINT notion_publication_runs_period_check CHECK (
    period_month BETWEEN 1 AND 12
  )
);

COMMENT ON TABLE greenhouse_sync.notion_publication_runs IS
  'Audit trail for outbound Greenhouse -> Notion publication runs. Tracks monthly report cutover runs and their target pages.';

CREATE INDEX IF NOT EXISTS idx_notion_publication_runs_period
  ON greenhouse_sync.notion_publication_runs (space_id, publication_key, report_scope, period_year DESC, period_month DESC);

CREATE INDEX IF NOT EXISTS idx_notion_publication_runs_status
  ON greenhouse_sync.notion_publication_runs (status, started_at DESC);

INSERT INTO greenhouse_sync.integration_registry (
  integration_key,
  display_name,
  integration_type,
  source_system,
  description,
  owner,
  consumer_domains,
  auth_mode,
  sync_cadence,
  sync_endpoint,
  readiness_status,
  active,
  metadata
)
VALUES (
  'notion_delivery_performance_reports',
  'Notion Delivery Performance Reports',
  'hybrid',
  'notion',
  'Publishes Greenhouse-frozen monthly Delivery performance reports into the canonical Notion Performance Reports database.',
  'platform',
  ARRAY['delivery', 'ico', 'agency'],
  'oauth2',
  'monthly',
  '/api/cron/notion-delivery-performance-publish',
  'ready',
  TRUE,
  jsonb_build_object(
    'publicationKey', 'delivery_performance_reports',
    'reportScope', 'agency',
    'targetKind', 'database_page'
  )
)
ON CONFLICT (integration_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  integration_type = EXCLUDED.integration_type,
  source_system = EXCLUDED.source_system,
  description = EXCLUDED.description,
  owner = EXCLUDED.owner,
  consumer_domains = EXCLUDED.consumer_domains,
  auth_mode = EXCLUDED.auth_mode,
  sync_cadence = EXCLUDED.sync_cadence,
  sync_endpoint = EXCLUDED.sync_endpoint,
  readiness_status = EXCLUDED.readiness_status,
  active = EXCLUDED.active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO greenhouse_core.space_notion_publication_targets (
  target_id,
  space_id,
  publication_key,
  notion_workspace_id,
  notion_database_id,
  notion_data_source_id,
  notion_parent_page_id,
  active,
  metadata,
  created_by
)
SELECT
  'EO-NPT-DELIV-PERF-RPTS',
  s.space_id,
  'delivery_performance_reports',
  sns.notion_workspace_id,
  '935718d8e8ec4a79b0261be1ce300f73',
  'f0d3f82a1fa0497fb7057038761c64b6',
  NULL,
  TRUE,
  jsonb_build_object(
    'label', 'Performance Reports',
    'targetTitleProperty', 'Informe',
    'targetPeriodProperty', 'Periodo',
    'targetSpaceLabel', 'Efeonce Admin'
  ),
  'TASK-202'
FROM greenhouse_core.spaces s
LEFT JOIN greenhouse_core.space_notion_sources sns
  ON sns.space_id = s.space_id
WHERE s.client_id = 'space-efeonce'
ON CONFLICT (target_id) DO UPDATE SET
  space_id = EXCLUDED.space_id,
  publication_key = EXCLUDED.publication_key,
  notion_workspace_id = EXCLUDED.notion_workspace_id,
  notion_database_id = EXCLUDED.notion_database_id,
  notion_data_source_id = EXCLUDED.notion_data_source_id,
  notion_parent_page_id = EXCLUDED.notion_parent_page_id,
  active = EXCLUDED.active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

GRANT SELECT ON greenhouse_core.space_notion_publication_targets TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_core.space_notion_publication_targets TO greenhouse_migrator;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.notion_publication_runs TO greenhouse_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.notion_publication_runs TO greenhouse_migrator;

-- Down Migration

DELETE FROM greenhouse_core.space_notion_publication_targets
WHERE target_id = 'EO-NPT-DELIV-PERF-RPTS';

DELETE FROM greenhouse_sync.integration_registry
WHERE integration_key = 'notion_delivery_performance_reports';

DROP TABLE IF EXISTS greenhouse_sync.notion_publication_runs;
DROP TABLE IF EXISTS greenhouse_core.space_notion_publication_targets;

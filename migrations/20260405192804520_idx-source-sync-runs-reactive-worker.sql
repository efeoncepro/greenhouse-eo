-- Up Migration
-- Index for efficient queries on reactive_worker runs (used by Ops Health dashboard)

CREATE INDEX IF NOT EXISTS idx_source_sync_runs_reactive_worker
  ON greenhouse_sync.source_sync_runs (source_system, finished_at DESC NULLS LAST)
  WHERE source_system = 'reactive_worker';

-- Down Migration
-- DROP INDEX IF EXISTS greenhouse_sync.idx_source_sync_runs_reactive_worker;

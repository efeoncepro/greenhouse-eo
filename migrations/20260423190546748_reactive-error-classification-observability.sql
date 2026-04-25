-- Up Migration
SET search_path = greenhouse_sync, greenhouse_core, public;

ALTER TABLE greenhouse_sync.outbox_reactive_log
  ADD COLUMN IF NOT EXISTS error_class text,
  ADD COLUMN IF NOT EXISTS error_family text,
  ADD COLUMN IF NOT EXISTS is_infrastructure_fault boolean NOT NULL DEFAULT FALSE;

ALTER TABLE greenhouse_sync.projection_refresh_queue
  ADD COLUMN IF NOT EXISTS error_class text,
  ADD COLUMN IF NOT EXISTS error_family text,
  ADD COLUMN IF NOT EXISTS is_infrastructure_fault boolean NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_outbox_reactive_log_error_class
  ON greenhouse_sync.outbox_reactive_log (error_class)
  WHERE result IN ('retry', 'dead-letter') AND error_class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projection_refresh_queue_error_class
  ON greenhouse_sync.projection_refresh_queue (projection_name, error_class)
  WHERE status = 'failed' AND error_class IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_projection_refresh_queue_infra_failed
  ON greenhouse_sync.projection_refresh_queue (projection_name, updated_at DESC)
  WHERE status = 'failed' AND is_infrastructure_fault = TRUE;

-- Down Migration
DROP INDEX IF EXISTS greenhouse_sync.idx_projection_refresh_queue_infra_failed;
DROP INDEX IF EXISTS greenhouse_sync.idx_projection_refresh_queue_error_class;
DROP INDEX IF EXISTS greenhouse_sync.idx_outbox_reactive_log_error_class;

ALTER TABLE greenhouse_sync.projection_refresh_queue
  DROP COLUMN IF EXISTS is_infrastructure_fault,
  DROP COLUMN IF EXISTS error_family,
  DROP COLUMN IF EXISTS error_class;

ALTER TABLE greenhouse_sync.outbox_reactive_log
  DROP COLUMN IF EXISTS is_infrastructure_fault,
  DROP COLUMN IF EXISTS error_family,
  DROP COLUMN IF EXISTS error_class;

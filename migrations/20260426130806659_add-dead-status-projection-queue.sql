-- Up Migration
--
-- DLQ pattern for projection_refresh_queue.
--
-- Adds a `dead` terminal state for projection refresh items that exhausted retries
-- with a non-infrastructure (application) fault. The reliability control plane
-- only treats `dead` items as warnings — transient `failed` items (single attempts
-- that may still recover via projection-recovery cron) no longer poison the
-- Cloud Platform health signal.
--
-- Semantics:
--   pending    → claimed by reactive consumer next sweep
--   processing → claimed atomically; reverts via projection-recovery if process dies
--   completed  → success (purged after 24h by purgeCompletedRefreshItems)
--   failed     → exhausted retries with infrastructure fault → recovery cron will retry
--   dead       → exhausted retries with application fault → requires human/code fix
--
-- `dead_at` records when an item entered the dead state (used for ageing + alerting
-- escalation policy in the dashboard).

ALTER TABLE greenhouse_sync.projection_refresh_queue
  ADD COLUMN IF NOT EXISTS dead_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_projection_refresh_queue_dead
  ON greenhouse_sync.projection_refresh_queue (dead_at DESC NULLS LAST)
  WHERE status = 'dead';

-- Backfill: existing `failed` rows whose classification points to an application
-- fault (NOT infrastructure) belong in the new `dead` bucket. Pre-DLQ runs left
-- them stuck as `failed`, which under the new semantics means "recovery cron
-- will keep retrying" — wrong, since these need a code/data fix. Rows whose
-- fault is infrastructure (or unclassified but recent) stay as `failed`.
UPDATE greenhouse_sync.projection_refresh_queue
   SET status = 'dead',
       dead_at = COALESCE(dead_at, updated_at)
 WHERE status = 'failed'
   AND COALESCE(is_infrastructure_fault, FALSE) = FALSE
   AND retry_count >= max_retries
   AND updated_at < NOW() - INTERVAL '24 hours';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_projection_refresh_queue_dead;

UPDATE greenhouse_sync.projection_refresh_queue
   SET status = 'failed'
 WHERE status = 'dead';

ALTER TABLE greenhouse_sync.projection_refresh_queue
  DROP COLUMN IF EXISTS dead_at;

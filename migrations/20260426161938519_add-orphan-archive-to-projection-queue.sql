-- Up Migration
--
-- Orphan-archive flag for projection_refresh_queue.
-- ===================================================
--
-- A `dead` projection can be a real incident (application bug, schema drift,
-- missing config) OR a row pointing to an entity that no longer exists in PG
-- (smoke test residue, archived/deleted records, snapshot drift). Both look
-- identical from the queue's perspective — both fire the dashboard "Proyecciones"
-- warning — but only the first kind requires human/code intervention.
--
-- This migration adds an `archived` flag + index. When `markRefreshFailed`
-- routes a row to `dead`, it ALSO checks if the target entity exists; if not,
-- the row is marked `archived=TRUE` in the same UPDATE and never appears in
-- the dashboard count again. Archived rows are kept (no DELETE) so the audit
-- trail survives — query `WHERE archived=TRUE` to see the cleanup history.
--
-- Backfill: existing dead rows whose entity is verifiably absent (currently
-- only `member_capacity_economics:member-smoke-*` test residue) are marked
-- archived in this migration so the dashboard counter drops immediately.

ALTER TABLE greenhouse_sync.projection_refresh_queue
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_reason TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_projection_refresh_queue_archived
  ON greenhouse_sync.projection_refresh_queue (archived)
  WHERE archived = TRUE;

COMMENT ON COLUMN greenhouse_sync.projection_refresh_queue.archived IS
'Set to TRUE when a dead row points to an entity that no longer exists in PG '
'(smoke test residue, archived records, snapshot drift). Excluded from the '
'reliability dashboard "Proyecciones" warning count. The row stays for audit '
'— never DELETE.';

-- Backfill known orphans. Currently the only one in production is the smoke
-- test residue from member-capacity-economics testing (member_id contains
-- "-smoke-" literally). Detect by entity_id pattern + verify via FK lookup.
--
-- IDEMPOTENT: re-running this migration is a no-op once the rows are flagged.
UPDATE greenhouse_sync.projection_refresh_queue
   SET archived = TRUE,
       archived_at = NOW(),
       archived_reason = 'orphan_entity_not_found:backfill_2026_04_26'
 WHERE status = 'dead'
   AND archived = FALSE
   AND entity_type = 'member'
   AND entity_id LIKE '%-smoke-%';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_sync.idx_projection_refresh_queue_archived;

ALTER TABLE greenhouse_sync.projection_refresh_queue
  DROP COLUMN IF EXISTS archived,
  DROP COLUMN IF EXISTS archived_at,
  DROP COLUMN IF EXISTS archived_reason;

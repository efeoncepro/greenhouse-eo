-- TASK-715 — Backfill: migrate existing TEST_ARCHIVED notes prefix into the
-- canonical archive_* columns introduced in the previous migration.
--
-- Context: before TASK-715, the only way to flag a test reconciliation
-- period was prepending 'TEST_ARCHIVED' to `notes` (transient signal). Now
-- there are first-class columns; this migration converts those flagged rows
-- to the canonical representation so the reader filter (`archived_at IS NULL`)
-- excludes them automatically.
--
-- Idempotent: only updates rows where notes start with TEST_ARCHIVED AND
-- archived_at IS NULL.

-- Up Migration

UPDATE greenhouse_finance.reconciliation_periods
SET archived_at = COALESCE(updated_at, NOW()),
    archived_by_user_id = COALESCE(reconciled_by_user_id, 'task-715-backfill'),
    archive_reason = SUBSTRING(notes FROM '^TEST_ARCHIVED[^:]*:?\s*(.*)$'),
    archive_kind = 'test_period',
    updated_at = NOW()
WHERE archived_at IS NULL
  AND notes IS NOT NULL
  AND notes LIKE 'TEST_ARCHIVED%';

-- Down Migration

UPDATE greenhouse_finance.reconciliation_periods
SET archived_at = NULL,
    archived_by_user_id = NULL,
    archive_reason = NULL,
    archive_kind = NULL,
    updated_at = NOW()
WHERE archive_kind = 'test_period'
  AND archived_by_user_id = 'task-715-backfill'
  AND notes LIKE 'TEST_ARCHIVED%';

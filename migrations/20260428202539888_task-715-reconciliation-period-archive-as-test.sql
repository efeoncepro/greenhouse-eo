-- TASK-715 — Reconciliation period archive-as-test
--
-- Adds aditive columns to greenhouse_finance.reconciliation_periods so an
-- operator can archive a period that was a test/experimental run without
-- conflating it with `status='reconciled'` (a real accounting closure).
--
-- Why aditive (NOT extending status enum): an archived test period is a
-- DIFFERENT semantic axis from the period's accounting state. A period can
-- legitimately be `status='reconciled'` AND `archive_kind='test_period'` if
-- it was reconciled to dispose of test data (the Santander CLP 2026-03 case).
-- Mixing them into status would lose audit information.
--
-- Idempotent: NOT EXISTS guards on column additions so re-running is safe.

-- Up Migration

ALTER TABLE greenhouse_finance.reconciliation_periods
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS archived_by_user_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS archive_kind TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_schema = 'greenhouse_finance'
      AND constraint_name = 'reconciliation_periods_archive_kind_check'
  ) THEN
    ALTER TABLE greenhouse_finance.reconciliation_periods
      ADD CONSTRAINT reconciliation_periods_archive_kind_check
      CHECK (archive_kind IS NULL OR archive_kind IN ('test_period'));
  END IF;
END $$;

-- Coherence: archive fields must be set together (both NULL or all NOT NULL).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_schema = 'greenhouse_finance'
      AND constraint_name = 'reconciliation_periods_archive_consistency_check'
  ) THEN
    ALTER TABLE greenhouse_finance.reconciliation_periods
      ADD CONSTRAINT reconciliation_periods_archive_consistency_check
      CHECK (
        (archived_at IS NULL AND archived_by_user_id IS NULL AND archive_reason IS NULL AND archive_kind IS NULL)
        OR
        (archived_at IS NOT NULL AND archived_by_user_id IS NOT NULL AND archive_reason IS NOT NULL AND archive_kind IS NOT NULL)
      );
  END IF;
END $$;

-- Partial index for the common operational query: list periods NOT archived.
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_active_only
  ON greenhouse_finance.reconciliation_periods (account_id, year DESC, month DESC)
  WHERE archived_at IS NULL;

-- Partial index for archived periods (audit/history queries).
CREATE INDEX IF NOT EXISTS idx_reconciliation_periods_archived
  ON greenhouse_finance.reconciliation_periods (account_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN greenhouse_finance.reconciliation_periods.archived_at IS
  'TASK-715: timestamp when period was archived (e.g. as test residue). NULL = active. Coordinated with archived_by_user_id, archive_reason, archive_kind via consistency CHECK.';

COMMENT ON COLUMN greenhouse_finance.reconciliation_periods.archive_kind IS
  'TASK-715: archive classification. Currently only ''test_period''. Future kinds (e.g. ''duplicate'', ''mistake'') extend the CHECK constraint.';

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_reconciliation_periods_archived;
DROP INDEX IF EXISTS greenhouse_finance.idx_reconciliation_periods_active_only;

ALTER TABLE greenhouse_finance.reconciliation_periods
  DROP CONSTRAINT IF EXISTS reconciliation_periods_archive_consistency_check,
  DROP CONSTRAINT IF EXISTS reconciliation_periods_archive_kind_check;

ALTER TABLE greenhouse_finance.reconciliation_periods
  DROP COLUMN IF EXISTS archive_kind,
  DROP COLUMN IF EXISTS archive_reason,
  DROP COLUMN IF EXISTS archived_by_user_id,
  DROP COLUMN IF EXISTS archived_at;

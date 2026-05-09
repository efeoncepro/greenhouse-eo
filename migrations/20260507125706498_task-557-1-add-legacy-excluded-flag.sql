-- Up Migration
ALTER TABLE greenhouse_commercial.quotations
  ADD COLUMN IF NOT EXISTS legacy_excluded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_excluded_reason text,
  ADD COLUMN IF NOT EXISTS legacy_excluded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_quotations_legacy_excluded
  ON greenhouse_commercial.quotations (legacy_excluded)
  WHERE legacy_excluded = true;

COMMENT ON COLUMN greenhouse_commercial.quotations.legacy_excluded IS
  'TASK-557.1 operational flag: true when a legacy/limbo quote must be hidden from commercial forecast surfaces while preserved for legacy finance/audit reads.';

COMMENT ON COLUMN greenhouse_commercial.quotations.legacy_excluded_reason IS
  'TASK-557.1 machine-readable reason for legacy exclusion, e.g. missing_organization, missing_current_version_row, missing_current_line_items, finance_only_historical.';

COMMENT ON COLUMN greenhouse_commercial.quotations.legacy_excluded_at IS
  'Timestamp when TASK-557.1 or a follow-up remediation marked the quote as excluded from commercial forecast surfaces.';

-- Down Migration
DROP INDEX IF EXISTS greenhouse_commercial.idx_quotations_legacy_excluded;

ALTER TABLE greenhouse_commercial.quotations
  DROP COLUMN IF EXISTS legacy_excluded_at,
  DROP COLUMN IF EXISTS legacy_excluded_reason,
  DROP COLUMN IF EXISTS legacy_excluded;

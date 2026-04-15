-- Up Migration
--
-- TASK-410 — Payroll Period Reopen Foundation & Entry Versioning.
-- Introduces the `reopened` period status, immutable entry versioning,
-- and the audit table that records every reopen decision with actor + reason.

SET search_path = greenhouse_payroll, public;

-- ============================================================
-- 1. Extend payroll_periods.status with the new 'reopened' state
-- ============================================================

ALTER TABLE greenhouse_payroll.payroll_periods
  DROP CONSTRAINT IF EXISTS payroll_periods_status_check;

ALTER TABLE greenhouse_payroll.payroll_periods
  ADD CONSTRAINT payroll_periods_status_check
  CHECK (status IN ('draft', 'calculated', 'approved', 'exported', 'reopened'));

-- ============================================================
-- 2. payroll_period_reopen_audit — immutable audit of reopen decisions
-- ============================================================

CREATE TABLE IF NOT EXISTS greenhouse_payroll.payroll_period_reopen_audit (
  audit_id                 TEXT PRIMARY KEY,
  period_id                TEXT NOT NULL REFERENCES greenhouse_payroll.payroll_periods(period_id) ON DELETE CASCADE,
  reopened_by_user_id      TEXT NOT NULL,
  reopened_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason                   TEXT NOT NULL CHECK (reason IN ('error_calculo', 'bono_retroactivo', 'correccion_contractual', 'otro')),
  reason_detail            TEXT,
  previred_declared_check  BOOLEAN NOT NULL DEFAULT FALSE,
  operational_month        DATE NOT NULL,
  previous_status          TEXT NOT NULL,
  locked_at                TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payroll_period_reopen_audit_period_idx
  ON greenhouse_payroll.payroll_period_reopen_audit (period_id, reopened_at DESC);

CREATE INDEX IF NOT EXISTS payroll_period_reopen_audit_month_idx
  ON greenhouse_payroll.payroll_period_reopen_audit (operational_month DESC);

COMMENT ON TABLE greenhouse_payroll.payroll_period_reopen_audit IS
  'Immutable audit trail of payroll period reopen decisions. Each row captures actor, reason, operational month snapshot, and Previred declaration status at reopen time. Referenced by payroll_entries.reopen_audit_id and greenhouse_finance.expenses.reopen_audit_id.';

-- ============================================================
-- 3. payroll_entries — add versioning columns
-- ============================================================
--
-- Strategy:
--   - version: increments on each reliquidation (v1 is the original export).
--   - is_active: only one active version per (period, member) at a time.
--   - superseded_by: self-FK pointing to the entry_id that replaces this one.
--   - reopen_audit_id: FK to the audit row that triggered the supersession.
--
-- Existing rows backfill as version=1, is_active=true, superseded_by=NULL,
-- reopen_audit_id=NULL. The partial unique index replaces the previous
-- (period_id, member_id) unique constraint so that v1 and v2 can coexist
-- as long as only one is active.

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD COLUMN IF NOT EXISTS version          SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active        BOOLEAN  NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS superseded_by    TEXT,
  ADD COLUMN IF NOT EXISTS reopen_audit_id  TEXT;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_period_member_unique;

CREATE UNIQUE INDEX IF NOT EXISTS payroll_entries_period_member_active_unique
  ON greenhouse_payroll.payroll_entries (period_id, member_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS payroll_entries_superseded_by_idx
  ON greenhouse_payroll.payroll_entries (superseded_by)
  WHERE superseded_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS payroll_entries_reopen_audit_idx
  ON greenhouse_payroll.payroll_entries (reopen_audit_id)
  WHERE reopen_audit_id IS NOT NULL;

-- Self-FK for supersession chain. Nullable; enforced only for versions >1.
ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_superseded_by_fkey;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_superseded_by_fkey
  FOREIGN KEY (superseded_by)
  REFERENCES greenhouse_payroll.payroll_entries(entry_id)
  ON DELETE SET NULL;

-- FK to the audit row — nullable; set when an entry is created during reopen.
ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_reopen_audit_fkey;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_reopen_audit_fkey
  FOREIGN KEY (reopen_audit_id)
  REFERENCES greenhouse_payroll.payroll_period_reopen_audit(audit_id)
  ON DELETE SET NULL;

-- Sanity: version must be >= 1; active row must have consistent shape.
ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_version_positive;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_version_positive
  CHECK (version >= 1);

-- V1 constraint: reliquidation limited to a single supersession (v1 → v2).
-- Relaxed to v >= 1 later if multi-reliquidation is enabled.
ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_version_v1_cap;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_version_v1_cap
  CHECK (version <= 2);

COMMENT ON COLUMN greenhouse_payroll.payroll_entries.version IS
  'Entry version. 1 = original export. 2 = reliquidated version after reopen. V1 caps at 2 via payroll_entries_version_v1_cap.';
COMMENT ON COLUMN greenhouse_payroll.payroll_entries.is_active IS
  'Only one active version per (period_id, member_id). Enforced via partial unique index payroll_entries_period_member_active_unique.';
COMMENT ON COLUMN greenhouse_payroll.payroll_entries.superseded_by IS
  'Points to the entry_id that replaced this row (NULL for active rows and rows never reliquidated).';
COMMENT ON COLUMN greenhouse_payroll.payroll_entries.reopen_audit_id IS
  'Audit row that justifies this entry version. NULL for original v1 entries; populated for v>=2.';

-- ============================================================
-- 4. Ownership — all new objects belong to greenhouse_ops
-- ============================================================

ALTER TABLE greenhouse_payroll.payroll_period_reopen_audit OWNER TO greenhouse_ops;

-- ============================================================
-- 5. Grants — runtime/migrator access
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON greenhouse_payroll.payroll_period_reopen_audit
  TO greenhouse_runtime, greenhouse_migrator;

-- Down Migration

SET search_path = greenhouse_payroll, public;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_version_v1_cap;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_version_positive;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_reopen_audit_fkey;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_superseded_by_fkey;

DROP INDEX IF EXISTS greenhouse_payroll.payroll_entries_reopen_audit_idx;
DROP INDEX IF EXISTS greenhouse_payroll.payroll_entries_superseded_by_idx;
DROP INDEX IF EXISTS greenhouse_payroll.payroll_entries_period_member_active_unique;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_period_member_unique UNIQUE (period_id, member_id);

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP COLUMN IF EXISTS reopen_audit_id,
  DROP COLUMN IF EXISTS superseded_by,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS version;

DROP INDEX IF EXISTS greenhouse_payroll.payroll_period_reopen_audit_month_idx;
DROP INDEX IF EXISTS greenhouse_payroll.payroll_period_reopen_audit_period_idx;
DROP TABLE IF EXISTS greenhouse_payroll.payroll_period_reopen_audit;

ALTER TABLE greenhouse_payroll.payroll_periods
  DROP CONSTRAINT IF EXISTS payroll_periods_status_check;

ALTER TABLE greenhouse_payroll.payroll_periods
  ADD CONSTRAINT payroll_periods_status_check
  CHECK (status IN ('draft', 'calculated', 'approved', 'exported'));

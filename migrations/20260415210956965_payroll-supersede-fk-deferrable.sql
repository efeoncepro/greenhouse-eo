-- Up Migration
--
-- TASK-409 / hotfix 2026-04-15 — make the supersede self-FK deferrable so
-- callers can insert v2 and point v1 → v2 within the same transaction
-- regardless of statement order.
--
-- Root cause: `payroll_entries_superseded_by_fkey` was created with default
-- (NOT DEFERRABLE) semantics. Each statement that modifies `superseded_by`
-- triggers the FK check immediately, which means any supersede flow that
-- naively sets `v1.superseded_by = v2.entry_id` BEFORE v2 is inserted
-- fails with `23503` and rolls back the whole transaction with a generic
-- "Unable to calculate payroll." error.
--
-- Fixing the order in application code is defensive hygiene, but it
-- couples callers to a mental model of the constraint. Marking the FK
-- DEFERRABLE INITIALLY DEFERRED moves the check to COMMIT time and
-- eliminates the bug class — any valid final state is accepted regardless
-- of the intermediate statement order. Future supersede variants,
-- additional v1 → vN chains, or batch materializations don't need to know
-- about operation ordering.
--
-- The partial unique index `payroll_entries_period_member_active_unique`
-- (enforced immediately) still imposes the "only one active row per
-- (period, member)" invariant, so the v1-inactive → v2-active transition
-- is still sequenced correctly at the application level.
--
-- Postgres constraint re-creation pattern: DROP + ADD because
-- `ALTER CONSTRAINT ... DEFERRABLE` is not supported for foreign keys
-- that were declared non-deferrable.

SET search_path = greenhouse_payroll, public;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_superseded_by_fkey;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_superseded_by_fkey
  FOREIGN KEY (superseded_by)
  REFERENCES greenhouse_payroll.payroll_entries(entry_id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON CONSTRAINT payroll_entries_superseded_by_fkey
  ON greenhouse_payroll.payroll_entries IS
  'Deferred FK — checked at COMMIT so supersede flows can insert v2 and
   point v1 → v2 in either order within the same transaction. Required by
   the payroll reliquidación flow (TASK-409).';

-- Down Migration

SET search_path = greenhouse_payroll, public;

ALTER TABLE greenhouse_payroll.payroll_entries
  DROP CONSTRAINT IF EXISTS payroll_entries_superseded_by_fkey;

ALTER TABLE greenhouse_payroll.payroll_entries
  ADD CONSTRAINT payroll_entries_superseded_by_fkey
  FOREIGN KEY (superseded_by)
  REFERENCES greenhouse_payroll.payroll_entries(entry_id)
  ON DELETE SET NULL;

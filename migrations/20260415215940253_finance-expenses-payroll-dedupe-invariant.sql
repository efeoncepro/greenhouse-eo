-- Up Migration
--
-- TASK-409 / hotfix 2026-04-15 — schema-level dedupe invariant for payroll
-- base expenses. Today's incident: a stale `finance_expense_reactive_intake`
-- handler running on Cloud Run ops-worker re-created 4 base expenses for
-- Marzo 2026 when the period was re-exported after a reliquidación, on top
-- of the original 4 created during the first export. Finance totals got
-- inflated by 2x and the reliquidation delta rows were never created.
--
-- Application-level dedupe is necessary but not sufficient. Any consumer
-- running stale code (deployment drift between Vercel and Cloud Run,
-- forgotten manual scripts, batch backfills) can still insert duplicates
-- without the database rejecting them. This migration adds a hard schema
-- invariant that Postgres enforces regardless of the application version
-- that is writing.
--
-- Contract: for a given (payroll_period_id, member_id, expense_type) there
-- can be at most ONE active base expense row (`source_type = 'payroll_generated'`,
-- `is_annulled = FALSE`). Reliquidation delta rows are exempt because they
-- use `source_type = 'payroll_reliquidation'` — multiple delta rows for the
-- same (period, member) represent sequential supersessions and must coexist.
--
-- Side effects:
--   - Attempting to insert a duplicate active base expense raises Postgres
--     error 23505. The application MUST catch this on the intake handler
--     and treat it as an idempotent no-op. The existing handler already
--     checks for existing rows BEFORE insert, so the constraint only fires
--     on a true race/drift scenario — defense in depth.
--   - Historical duplicates (if any) must be reconciled before this
--     migration is applied, otherwise CREATE INDEX fails. The Marzo 2026
--     reconciliation script `scripts/reconcile-marzo-2026-reliquidation.ts`
--     annuls the bad rows first; this migration runs after.

SET search_path = greenhouse_finance, public;

-- Drop the index if a previous attempt created it (idempotent re-runs).
DROP INDEX IF EXISTS greenhouse_finance.finance_expenses_payroll_generated_unique;

CREATE UNIQUE INDEX finance_expenses_payroll_generated_unique
  ON greenhouse_finance.expenses (payroll_period_id, member_id, expense_type)
  WHERE source_type = 'payroll_generated'
    AND is_annulled = FALSE
    AND payroll_period_id IS NOT NULL
    AND member_id IS NOT NULL;

COMMENT ON INDEX greenhouse_finance.finance_expenses_payroll_generated_unique IS
  'Hard schema invariant: one active base payroll expense per
   (payroll_period_id, member_id, expense_type). Reliquidation deltas
   use source_type = payroll_reliquidation and are exempt. Enforced at
   Postgres level to survive consumer deployment drift (TASK-409).';

-- Down Migration

SET search_path = greenhouse_finance, public;

DROP INDEX IF EXISTS greenhouse_finance.finance_expenses_payroll_generated_unique;

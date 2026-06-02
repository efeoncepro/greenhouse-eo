-- Up Migration
--
-- TASK-977 Slice 1 — Contractor payable anchor on expenses.
--
-- Additive: a FK-anchor column so a contractor's settlement can resolve "its expense"
-- at pay time, mirroring how payroll resolves its expense by (payroll_period_id, member_id).
-- The contractor beneficiary may be a member OR an identity_profile (beneficiary_type='other'),
-- so member_id is NOT a reliable anchor — the payable id is. This is the dedicated anchor.
--
-- The contractor expense is materialized (TASK-977 Slice 2) when the payable reaches
-- `ready_for_finance` (mirror of the payroll expense reactive materializer on `exported`):
--   expense.total_amount = gross, economic_category = 'labor_cost_external',
--   expense_type = 'contractor', source_type = 'contractor_payable', supplier_id = NULL.
-- The SII withholding (gross − net) is a separate liability to remit (F29) — out of scope here.

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS contractor_payable_id TEXT NULL;

-- FK to the contractor payable (mirror of payroll_entry_id → payroll_entries). RESTRICT:
-- a payable that produced an expense cannot be hard-deleted (append-only domain anyway).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'greenhouse_finance'
      AND table_name = 'expenses'
      AND constraint_name = 'expenses_contractor_payable_id_fkey'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_contractor_payable_id_fkey
      FOREIGN KEY (contractor_payable_id)
      REFERENCES greenhouse_hr.contractor_payables(contractor_payable_id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

-- Partial index for the settlement lookup (resolve the expense by payable id).
CREATE INDEX IF NOT EXISTS idx_expenses_contractor_payable_id
  ON greenhouse_finance.expenses (contractor_payable_id)
  WHERE contractor_payable_id IS NOT NULL;

-- Anti pre-up-marker guard: abort if the column/constraint/index were not created.
DO $$
DECLARE col_exists boolean; fk_exists boolean; idx_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'expenses'
      AND column_name = 'contractor_payable_id'
  ) INTO col_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'greenhouse_finance' AND table_name = 'expenses'
      AND constraint_name = 'expenses_contractor_payable_id_fkey'
  ) INTO fk_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'greenhouse_finance' AND indexname = 'idx_expenses_contractor_payable_id'
  ) INTO idx_exists;

  IF NOT (col_exists AND fk_exists AND idx_exists) THEN
    RAISE EXCEPTION 'TASK-977 anti pre-up-marker: contractor_payable_id anchor incomplete (col=%, fk=%, idx=%)',
      col_exists, fk_exists, idx_exists;
  END IF;
END
$$;

-- Down Migration

DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_contractor_payable_id;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_contractor_payable_id_fkey;

ALTER TABLE greenhouse_finance.expenses
  DROP COLUMN IF EXISTS contractor_payable_id;
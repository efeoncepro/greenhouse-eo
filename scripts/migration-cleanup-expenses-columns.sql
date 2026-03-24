-- ══════════════════════════════════════════════════════
-- Fix: expenses table FK gaps + documentation
-- Ref: Module integration audit 2026-03-24
-- ══════════════════════════════════════════════════════

-- 1. Add FK to allocated_client_id (used by intelligence store for direct costs + CAC)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_expenses_allocated_client'
    AND table_schema = 'greenhouse_finance'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT fk_expenses_allocated_client
      FOREIGN KEY (allocated_client_id) REFERENCES greenhouse_core.clients(client_id);
  END IF;
END $$;

-- 2. Add index for allocated_client_id queries (used by computeClientEconomicsSnapshots)
CREATE INDEX IF NOT EXISTS idx_expenses_allocated_client
  ON greenhouse_finance.expenses(allocated_client_id)
  WHERE allocated_client_id IS NOT NULL;

-- 3. Document payroll_entry_id as informational (no FK by design)
COMMENT ON COLUMN greenhouse_finance.expenses.payroll_entry_id IS
  'Informational reference to payroll_entries.entry_id. No FK — snapshot for audit trail, not structural dependency.';

COMMENT ON COLUMN greenhouse_finance.expenses.payroll_period_id IS
  'Informational reference to payroll_periods.period_id. No FK — snapshot for audit trail only.';

COMMENT ON COLUMN greenhouse_finance.expenses.allocated_client_id IS
  'FK to clients. Used by client economics for direct expense attribution and CAC computation.';

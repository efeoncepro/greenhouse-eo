-- Up Migration
--
-- Canonical Anchors + Supersede for Bank Reconciliation (TASK-702)
-- ================================================================
-- Cierra la clase de drift entre `expense.amount_paid` / `income.amount_paid`
-- y la realidad bancaria. Tres movimientos:
--
--   1. FK enforcement en columnas anchor existentes en `expenses` (ya tienen
--      el shape: payroll_entry_id, payroll_period_id) más una nueva
--      columna `tool_catalog_id` para anclar tooling charges al catálogo
--      canónico de herramientas (greenhouse_ai.tool_catalog).
--
--   2. Columnas `superseded_by_payment_id`, `superseded_at`, `superseded_reason`
--      en `income_payments` y `expense_payments`. Patrón canónico anti
--      double-counting: cuando Nubox crea un phantom y después el ledger
--      registra el payment correcto, el phantom NO se borra (preserva audit)
--      sino que se marca superseded. Mismo patrón que `projection_refresh_queue`
--      orphan archive.
--
--   3. El trigger `fn_sync_expense_amount_paid` se actualiza para EXCLUIR
--      payments superseded del SUM, así `expense.amount_paid` refleja la
--      verdad canónica. Lado income tiene una función helper análoga que
--      `recordPayment` puede invocar (no hay trigger en income_payments hoy).
--
-- Reglas duras:
-- - Phantoms NO se eliminan vía DELETE. Usar UPDATE ... SET superseded_by_payment_id.
-- - El supersede solo aplica entre payments del mismo income/expense_id (validado en helper TS).
-- - FK constraints son DEFERRABLE INITIALLY DEFERRED para permitir backfill multi-step.

SET search_path = greenhouse_finance, greenhouse_payroll, greenhouse_ai, greenhouse_core, public;

-- =========================================================================
-- 1. FK enforcement en expenses (columnas anchor ya existen como TEXT)
-- =========================================================================

-- payroll_entry_id → payroll_entries(entry_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_payroll_entry_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_payroll_entry_fk
      FOREIGN KEY (payroll_entry_id)
      REFERENCES greenhouse_payroll.payroll_entries(entry_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

-- payroll_period_id → payroll_periods(period_id) si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_payroll' AND table_name = 'payroll_periods'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_payroll_period_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_payroll_period_fk
      FOREIGN KEY (payroll_period_id)
      REFERENCES greenhouse_payroll.payroll_periods(period_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

-- =========================================================================
-- 2. tool_catalog_id (nueva columna) → greenhouse_ai.tool_catalog(tool_id)
-- =========================================================================

ALTER TABLE greenhouse_finance.expenses
  ADD COLUMN IF NOT EXISTS tool_catalog_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'greenhouse_ai' AND table_name = 'tool_catalog'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expenses_tool_catalog_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expenses
      ADD CONSTRAINT expenses_tool_catalog_fk
      FOREIGN KEY (tool_catalog_id)
      REFERENCES greenhouse_ai.tool_catalog(tool_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_expenses_tool_catalog_id
  ON greenhouse_finance.expenses (tool_catalog_id)
  WHERE tool_catalog_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_payroll_entry_id
  ON greenhouse_finance.expenses (payroll_entry_id)
  WHERE payroll_entry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_payroll_period_id
  ON greenhouse_finance.expenses (payroll_period_id)
  WHERE payroll_period_id IS NOT NULL;

-- =========================================================================
-- 3. Supersede columns en income_payments y expense_payments
-- =========================================================================

ALTER TABLE greenhouse_finance.income_payments
  ADD COLUMN IF NOT EXISTS superseded_by_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'income_payments_superseded_by_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.income_payments
      ADD CONSTRAINT income_payments_superseded_by_fk
      FOREIGN KEY (superseded_by_payment_id)
      REFERENCES greenhouse_finance.income_payments(payment_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

ALTER TABLE greenhouse_finance.expense_payments
  ADD COLUMN IF NOT EXISTS superseded_by_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS superseded_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expense_payments_superseded_by_fk'
  ) THEN
    ALTER TABLE greenhouse_finance.expense_payments
      ADD CONSTRAINT expense_payments_superseded_by_fk
      FOREIGN KEY (superseded_by_payment_id)
      REFERENCES greenhouse_finance.expense_payments(payment_id)
      ON DELETE SET NULL
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_income_payments_superseded
  ON greenhouse_finance.income_payments (superseded_by_payment_id)
  WHERE superseded_by_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expense_payments_superseded
  ON greenhouse_finance.expense_payments (superseded_by_payment_id)
  WHERE superseded_by_payment_id IS NOT NULL;

-- =========================================================================
-- 4. Update trigger fn_sync_expense_amount_paid para excluir superseded
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_expense_id TEXT;
  new_amount_paid NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);

  -- IGNORE superseded payments. The phantom row is preserved for audit but
  -- excluded from the canonical amount_paid calculation.
  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = target_expense_id
    AND superseded_by_payment_id IS NULL;

  SELECT total_amount INTO expense_total
  FROM greenhouse_finance.expenses
  WHERE expense_id = target_expense_id;

  IF expense_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF new_amount_paid >= expense_total THEN
    new_status := 'paid';
  ELSIF new_amount_paid > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;

  UPDATE greenhouse_finance.expenses SET
    amount_paid = new_amount_paid,
    payment_status = new_status,
    updated_at = NOW()
  WHERE expense_id = target_expense_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 5. Helper function fn_recompute_income_amount_paid
-- =========================================================================
-- income_payments no tiene trigger automático; recordPayment() llama esta
-- función explícitamente después de INSERT/UPDATE. Ignora superseded igual
-- que su contraparte de expenses + suma factoring fees + withholding según
-- la ecuación canónica de income_settlement_reconciliation.

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(p_income_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  payments_total NUMERIC(14,2);
  factoring_fee_total NUMERIC(14,2);
  withholding NUMERIC(14,2);
  total_paid NUMERIC(14,2);
  income_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO payments_total
  FROM greenhouse_finance.income_payments
  WHERE income_id = p_income_id
    AND superseded_by_payment_id IS NULL;

  SELECT COALESCE(SUM(fee_amount), 0) INTO factoring_fee_total
  FROM greenhouse_finance.factoring_operations
  WHERE income_id = p_income_id
    AND status = 'active';

  SELECT COALESCE(withholding_amount, 0), total_amount INTO withholding, income_total
  FROM greenhouse_finance.income
  WHERE income_id = p_income_id;

  total_paid := payments_total + factoring_fee_total + withholding;

  IF income_total IS NULL THEN
    RETURN total_paid;
  END IF;

  IF total_paid >= income_total THEN
    new_status := 'paid';
  ELSIF total_paid > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;

  UPDATE greenhouse_finance.income SET
    amount_paid = total_paid,
    payment_status = new_status,
    updated_at = NOW()
  WHERE income_id = p_income_id;

  RETURN total_paid;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(TEXT) TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(TEXT) TO greenhouse_app;

-- =========================================================================
-- 6. Comments
-- =========================================================================

COMMENT ON COLUMN greenhouse_finance.expenses.tool_catalog_id IS
  'Anchor canónico al catálogo de herramientas (greenhouse_ai.tool_catalog.tool_id). Cargos TC tooling se anclan aquí para que cost_attribution + client_economics sumen correctamente per tool/cliente.';

COMMENT ON COLUMN greenhouse_finance.income_payments.superseded_by_payment_id IS
  'Anti double-counting: cuando un phantom Nubox sin payment_account_id co-existe con el payment canónico (ej. factoring_proceeds), se marca aquí en vez de eliminarlo. Audit preservado.';

COMMENT ON COLUMN greenhouse_finance.expense_payments.superseded_by_payment_id IS
  'Idem income_payments. Trigger fn_sync_expense_amount_paid excluye filas con esta columna no-null del SUM(amount).';

COMMENT ON FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(TEXT) IS
  'Recalcula income.amount_paid sumando: cash payments (excl. superseded) + factoring fees activos + withholding. Mirror de la VIEW income_settlement_reconciliation pero como función para llamar desde recordPayment() y desde supersede helpers.';

-- Down Migration

SET search_path = greenhouse_finance, greenhouse_payroll, greenhouse_ai, greenhouse_core, public;

DROP FUNCTION IF EXISTS greenhouse_finance.fn_recompute_income_amount_paid(TEXT);

-- Restore trigger function to pre-supersede behavior (keep recreate friendly)
CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_expense_id TEXT;
  new_amount_paid NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);
  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = target_expense_id;
  SELECT total_amount INTO expense_total
  FROM greenhouse_finance.expenses
  WHERE expense_id = target_expense_id;
  IF expense_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF new_amount_paid >= expense_total THEN
    new_status := 'paid';
  ELSIF new_amount_paid > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;
  UPDATE greenhouse_finance.expenses SET
    amount_paid = new_amount_paid,
    payment_status = new_status,
    updated_at = NOW()
  WHERE expense_id = target_expense_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP INDEX IF EXISTS greenhouse_finance.idx_expense_payments_superseded;
DROP INDEX IF EXISTS greenhouse_finance.idx_income_payments_superseded;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_payroll_period_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_payroll_entry_id;
DROP INDEX IF EXISTS greenhouse_finance.idx_expenses_tool_catalog_id;

ALTER TABLE greenhouse_finance.expense_payments
  DROP CONSTRAINT IF EXISTS expense_payments_superseded_by_fk;

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_superseded_by_fk;

ALTER TABLE greenhouse_finance.expense_payments
  DROP COLUMN IF EXISTS superseded_by_payment_id,
  DROP COLUMN IF EXISTS superseded_at,
  DROP COLUMN IF EXISTS superseded_reason;

ALTER TABLE greenhouse_finance.income_payments
  DROP COLUMN IF EXISTS superseded_by_payment_id,
  DROP COLUMN IF EXISTS superseded_at,
  DROP COLUMN IF EXISTS superseded_reason;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_tool_catalog_fk,
  DROP COLUMN IF EXISTS tool_catalog_id;

ALTER TABLE greenhouse_finance.expenses
  DROP CONSTRAINT IF EXISTS expenses_payroll_period_fk,
  DROP CONSTRAINT IF EXISTS expenses_payroll_entry_fk;

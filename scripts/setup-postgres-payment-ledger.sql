-- ============================================================
-- Payment Ledger Correction Migration
-- TASK-003: Invoice Payment Ledger Correction
-- ============================================================
-- This migration:
--   1. Expands the payment_source CHECK constraint on income_payments
--      to allow 'nubox_bank_sync' (used by Nubox bank movement reconciliation)
--   2. Adds a unique index on (income_id, reference) to enforce deduplication
--      of Nubox bank movement payments
--   3. Creates a trigger to keep income.amount_paid and payment_status
--      in sync with SUM(income_payments.amount) as the single source of truth
--   4. Adds semantic comments documenting the income/income_payments model
-- ============================================================

-- ------------------------------------------------------------
-- 1. Expand payment_source CHECK constraint
--    Old: ('client_direct', 'factoring_proceeds')
--    New: adds 'nubox_bank_sync' for automated Nubox bank reconciliation
-- ------------------------------------------------------------

ALTER TABLE greenhouse_finance.income_payments
  DROP CONSTRAINT IF EXISTS income_payments_payment_source_check;

ALTER TABLE greenhouse_finance.income_payments
  ADD CONSTRAINT income_payments_payment_source_check
  CHECK (payment_source IN ('client_direct', 'factoring_proceeds', 'nubox_bank_sync'));

-- ------------------------------------------------------------
-- 2. Unique index for deduplication of payments by reference per invoice
--    Prevents double-registering the same Nubox bank movement
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS finance_income_payments_dedup_ref_idx
  ON greenhouse_finance.income_payments (income_id, reference)
  WHERE reference IS NOT NULL;

-- ------------------------------------------------------------
-- 3. Trigger: derive income.amount_paid from SUM(income_payments.amount)
--    Fires on INSERT, UPDATE, DELETE on income_payments
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_income_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_income_id TEXT;
  new_amount_paid NUMERIC(14,2);
  income_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  -- Determine which income_id was affected
  target_income_id := COALESCE(NEW.income_id, OLD.income_id);

  -- Derive amount_paid from SUM of all payments
  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.income_payments
  WHERE income_id = target_income_id;

  -- Get total_amount to derive payment_status
  SELECT total_amount INTO income_total
  FROM greenhouse_finance.income
  WHERE income_id = target_income_id;

  -- Derive payment_status
  IF new_amount_paid >= income_total THEN
    new_status := 'paid';
  ELSIF new_amount_paid > 0 THEN
    new_status := 'partial';
  ELSE
    new_status := 'pending';
  END IF;

  -- Update the denormalized fields
  UPDATE greenhouse_finance.income SET
    amount_paid = new_amount_paid,
    payment_status = new_status,
    updated_at = NOW()
  WHERE income_id = target_income_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if present (idempotent)
DROP TRIGGER IF EXISTS trg_sync_income_amount_paid
  ON greenhouse_finance.income_payments;

CREATE TRIGGER trg_sync_income_amount_paid
  AFTER INSERT OR UPDATE OR DELETE ON greenhouse_finance.income_payments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_sync_income_amount_paid();

-- ------------------------------------------------------------
-- 4. Semantic comments on the income model
-- ------------------------------------------------------------

COMMENT ON TABLE greenhouse_finance.income IS
  'Facturas emitidas a clientes (invoices). El nombre "income" es legacy.
   Cada registro es una factura, NO un ingreso reconocido.
   Los cobros individuales viven en income_payments.
   amount_paid es derivado de SUM(income_payments.amount) via trigger.';

COMMENT ON TABLE greenhouse_finance.income_payments IS
  'Cobros individuales contra facturas. Cada fila es un pago recibido.
   income.amount_paid debe ser siempre = SUM(income_payments.amount).
   Fuentes: client_direct (manual), factoring_proceeds, nubox_bank_sync (automatico).';

COMMENT ON COLUMN greenhouse_finance.income.amount_paid IS
  'Denormalized aggregate. Derived from SUM(income_payments.amount) by trigger trg_sync_income_amount_paid.';

COMMENT ON COLUMN greenhouse_finance.income.payment_status IS
  'Derived from amount_paid vs total_amount by trigger. Do not write directly.';

-- ------------------------------------------------------------
-- 5. Grants (same pattern as other finance scripts)
-- ------------------------------------------------------------

GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_sync_income_amount_paid() TO greenhouse_runtime;
GRANT EXECUTE ON FUNCTION greenhouse_finance.fn_sync_income_amount_paid() TO greenhouse_migrator;

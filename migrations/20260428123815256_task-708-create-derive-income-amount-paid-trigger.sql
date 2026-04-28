-- Up Migration
--
-- TASK-708 Slice 0 — D2: trigger fn_sync_income_amount_paid (NEW for income)
-- =========================================================================
-- Hasta hoy, income.amount_paid y income.payment_status se actualizaban
-- explicitamente desde recordPayment() llamando fn_recompute_income_amount_paid().
-- Eso permite drift: si un sync externo escribe payment_status='paid' directo,
-- la base lo acepta hasta que la siguiente llamada del helper lo recompute.
--
-- D2 cierra ese hueco con un trigger AFTER INSERT/UPDATE/DELETE sobre
-- income_payments que SIEMPRE recomputa via fn_recompute_income_amount_paid.
-- Espejo exacto del patron trg_sync_expense_amount_paid existente para expenses.
--
-- Hard rule: ningun sync externo puede mutar income.payment_status. Si lo
-- intenta, el siguiente trigger AFTER en payments lo sobrescribira con la
-- verdad canonica.
--
-- Adicionalmente, fn_recompute_income_amount_paid se actualiza para excluir
-- tambien filas con superseded_by_otb_id IS NOT NULL (TASK-703b cascade pattern),
-- no solo superseded_by_payment_id. Esto cierra el hueco actual donde un OTB
-- supersede no propagaba a la suma derivada.

SET search_path = greenhouse_finance, public;

-- =========================================================================
-- 1. Update fn_recompute_income_amount_paid para excluir superseded_by_otb_id
-- =========================================================================

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
  -- IGNORE both supersede chains (payment chain TASK-702 + OTB chain TASK-703b).
  SELECT COALESCE(SUM(amount), 0) INTO payments_total
  FROM greenhouse_finance.income_payments
  WHERE income_id = p_income_id
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL;

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
-- 2. NEW trigger function fn_sync_income_amount_paid
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_income_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_income_id TEXT;
BEGIN
  target_income_id := COALESCE(NEW.income_id, OLD.income_id);

  IF target_income_id IS NOT NULL THEN
    PERFORM greenhouse_finance.fn_recompute_income_amount_paid(target_income_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =========================================================================
-- 3. Attach trigger AFTER INSERT/UPDATE/DELETE on income_payments
-- =========================================================================

DROP TRIGGER IF EXISTS trg_sync_income_amount_paid
  ON greenhouse_finance.income_payments;

CREATE TRIGGER trg_sync_income_amount_paid
  AFTER INSERT OR UPDATE OR DELETE
  ON greenhouse_finance.income_payments
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_sync_income_amount_paid();

COMMENT ON FUNCTION greenhouse_finance.fn_sync_income_amount_paid() IS
  'TASK-708 D2: recompute income.amount_paid y income.payment_status desde payments canonicos NOT superseded (incluye factoring + withholdings). Espejo de fn_sync_expense_amount_paid. Garantiza que ningun sync externo pueda mutar payment_status — el trigger lo sobrescribe en el siguiente AFTER.';

COMMENT ON FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(TEXT) IS
  'TASK-708 D2: extiende exclusion de TASK-702 (superseded_by_payment_id) para tambien excluir TASK-703b (superseded_by_otb_id). Cualquier supersede chain queda fuera del SUM canonico.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_sync_income_amount_paid
  ON greenhouse_finance.income_payments;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_sync_income_amount_paid();

-- Restaurar fn_recompute_income_amount_paid a su shape pre-708 (solo
-- superseded_by_payment_id). Si es necesario rollback, este recompute deja
-- de ignorar OTB supersede.
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

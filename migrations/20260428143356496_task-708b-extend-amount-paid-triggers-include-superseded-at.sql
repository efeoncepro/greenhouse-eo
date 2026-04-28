-- Up Migration
--
-- TASK-708b — extender triggers amount_paid para incluir superseded_at en exclusion
-- ===================================================================================
-- Hasta TASK-708 D2, los triggers fn_sync_expense_amount_paid y la funcion
-- fn_recompute_income_amount_paid excluyen filas con `superseded_by_payment_id`
-- o `superseded_by_otb_id` (chains TASK-702 + TASK-703b).
--
-- TASK-708b introduce un tercer caso: outcome `dismissed_no_cash` — un phantom
-- que no tiene replacement payment ni OTB chain, pero debe excluirse del SUM
-- canonico. Para no inventar una cuarta columna, la convencion canonica es:
--
--   * cualquier fila con `superseded_at IS NOT NULL` esta fuera del SUM,
--     independiente del motivo (payment chain, OTB chain, dismissal admin).
--
-- Esta migracion extiende AMBOS triggers para agregar `AND superseded_at IS NULL`
-- a la clausula de exclusion. Es aditiva: las filas con superseded_by_*_id NOT NULL
-- ya tienen superseded_at NOT NULL por convencion TASK-702 (mismo trigger setea
-- ambos), asi que el comportamiento existente se preserva.
--
-- Resultado: el helper `dismissPhantomPayment` (TASK-708b) puede marcar
-- `superseded_at = NOW()` + `superseded_reason` SIN replacement, y el SUM
-- canonico lo excluye automaticamente.

SET search_path = greenhouse_finance, public;

-- =========================================================================
-- 1. fn_sync_expense_amount_paid (espejo TASK-708 Slice 0 + superseded_at)
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

  -- IGNORE all supersede chains: payment chain (TASK-702), OTB chain (TASK-703b),
  -- and remediation dismissal (TASK-708b: superseded_at NOT NULL sin replacement).
  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = target_expense_id
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL;

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

COMMENT ON FUNCTION greenhouse_finance.fn_sync_expense_amount_paid() IS
  'TASK-708b: extiende exclusion de TASK-702 (superseded_by_payment_id) y TASK-703b (superseded_by_otb_id) para tambien excluir cualquier fila con superseded_at NOT NULL (dismissals sin replacement). Coherente: cualquier supersede excluye del SUM, independiente del motivo.';

-- =========================================================================
-- 2. fn_recompute_income_amount_paid (espejo)
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
  -- IGNORE all supersede chains (TASK-702 + TASK-703b + TASK-708b dismissals).
  SELECT COALESCE(SUM(amount), 0) INTO payments_total
  FROM greenhouse_finance.income_payments
  WHERE income_id = p_income_id
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL;

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

COMMENT ON FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(TEXT) IS
  'TASK-708b: idem fn_sync_expense_amount_paid — superseded_at NOT NULL excluye del SUM canonico, coherente con cualquier supersede chain.';

-- Down Migration
--
-- Restaurar al shape post-TASK-708 (excluye solo superseded_by_payment_id +
-- superseded_by_otb_id, NO superseded_at). Tras rollback, dismissals sin
-- replacement contribuirian al SUM y romperian payment_status canonico.

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
  WHERE expense_id = target_expense_id
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL;

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

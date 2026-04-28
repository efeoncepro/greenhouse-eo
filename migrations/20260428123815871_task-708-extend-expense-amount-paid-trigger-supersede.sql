-- Up Migration
--
-- TASK-708 Slice 0 — D2: extend fn_sync_expense_amount_paid to also exclude OTB supersede
-- =======================================================================================
-- TASK-702 introdujo fn_sync_expense_amount_paid excluyendo superseded_by_payment_id.
-- TASK-703b agrego superseded_by_otb_id en expense_payments pero NO actualizo el
-- trigger — el SUM puede incluir hoy filas OTB-superseded, lo que dejaria
-- expense.amount_paid drift contra la verdad canonica.
--
-- TASK-708 D2 cierra el hueco: el trigger excluye AMBAS cadenas de supersede.

SET search_path = greenhouse_finance, public;

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_expense_id TEXT;
  new_amount_paid NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  new_status TEXT;
BEGIN
  target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);

  -- IGNORE both supersede chains (payment chain TASK-702 + OTB chain TASK-703b).
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

COMMENT ON FUNCTION greenhouse_finance.fn_sync_expense_amount_paid() IS
  'TASK-708 D2: extiende TASK-702 (superseded_by_payment_id) para tambien excluir TASK-703b (superseded_by_otb_id). Garantiza que expense.amount_paid no driftee cuando un OTB supersede pre-anchor transactions.';

-- Down Migration
--
-- Rollback al shape pre-708 (solo excluye superseded_by_payment_id, no OTB).
-- Tras rollback, expense.amount_paid puede driftear si hay OTB-superseded rows.

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

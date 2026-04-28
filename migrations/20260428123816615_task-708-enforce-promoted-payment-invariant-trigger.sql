-- Up Migration
--
-- TASK-708 Slice 0 — D4: cross-table invariant signal ↔ payment
-- =============================================================
-- Cuando external_cash_signals.promoted_payment_id IS NOT NULL, garantizar:
--   1. existe la fila correspondiente en income_payments (si promoted_payment_kind='income_payment')
--      o expense_payments (si 'expense_payment');
--   2. esa fila tiene payment_account_id IS NOT NULL;
--   3. esa fila NO esta superseded (ni payment ni OTB chain).
--
-- No es un CHECK SQL directo (cruza tablas), se enforza via trigger BEFORE
-- INSERT/UPDATE en external_cash_signals.

SET search_path = greenhouse_finance, public;

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_enforce_promoted_payment_invariant()
RETURNS TRIGGER AS $$
DECLARE
  payment_account TEXT;
  payment_superseded_by TEXT;
  payment_superseded_by_otb TEXT;
BEGIN
  -- Si la senal NO esta promovida, no hay invariante que verificar.
  IF NEW.promoted_payment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Sanity: paired columns ya enforzados por CHECK external_cash_signals_promoted_pair_check.
  IF NEW.promoted_payment_kind IS NULL THEN
    RAISE EXCEPTION 'TASK-708 D4: promoted_payment_id set without promoted_payment_kind for signal %',
      NEW.signal_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.promoted_payment_kind = 'income_payment' THEN
    SELECT payment_account_id, superseded_by_payment_id, superseded_by_otb_id
    INTO payment_account, payment_superseded_by, payment_superseded_by_otb
    FROM greenhouse_finance.income_payments
    WHERE payment_id = NEW.promoted_payment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TASK-708 D4: signal % promoted to income_payment % which does not exist',
        NEW.signal_id, NEW.promoted_payment_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSIF NEW.promoted_payment_kind = 'expense_payment' THEN
    SELECT payment_account_id, superseded_by_payment_id, superseded_by_otb_id
    INTO payment_account, payment_superseded_by, payment_superseded_by_otb
    FROM greenhouse_finance.expense_payments
    WHERE payment_id = NEW.promoted_payment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'TASK-708 D4: signal % promoted to expense_payment % which does not exist',
        NEW.signal_id, NEW.promoted_payment_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  ELSE
    RAISE EXCEPTION 'TASK-708 D4: invalid promoted_payment_kind % for signal %',
      NEW.promoted_payment_kind, NEW.signal_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF payment_account IS NULL THEN
    RAISE EXCEPTION 'TASK-708 D4: signal % promoted to payment % with NULL payment_account_id',
      NEW.signal_id, NEW.promoted_payment_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF payment_superseded_by IS NOT NULL OR payment_superseded_by_otb IS NOT NULL THEN
    RAISE EXCEPTION 'TASK-708 D4: signal % promoted to payment % which is superseded',
      NEW.signal_id, NEW.promoted_payment_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_promoted_payment_invariant
  ON greenhouse_finance.external_cash_signals;

CREATE TRIGGER trg_enforce_promoted_payment_invariant
  BEFORE INSERT OR UPDATE OF promoted_payment_id, promoted_payment_kind
  ON greenhouse_finance.external_cash_signals
  FOR EACH ROW
  EXECUTE FUNCTION greenhouse_finance.fn_enforce_promoted_payment_invariant();

COMMENT ON FUNCTION greenhouse_finance.fn_enforce_promoted_payment_invariant() IS
  'TASK-708 D4: invariante cruzada signal ↔ payment. Si una signal apunta a un promoted_payment, ese payment debe existir, tener payment_account_id NOT NULL y no estar superseded. Cierra la posibilidad de que una signal se marque "promovida" sin un payment canonico real del otro lado.';

-- Down Migration

DROP TRIGGER IF EXISTS trg_enforce_promoted_payment_invariant
  ON greenhouse_finance.external_cash_signals;
DROP FUNCTION IF EXISTS greenhouse_finance.fn_enforce_promoted_payment_invariant();

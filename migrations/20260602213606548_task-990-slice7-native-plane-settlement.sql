-- Up Migration
--
-- TASK-990 Slice 7 — Native-plane settlement for foreign-currency invoices
-- ========================================================================
-- A Nubox export invoice (Berel DTE 110) is stored CLP-functional per the
-- binding plane contract (Slice 5b): `currency='CLP'`, `total_amount` /
-- `total_amount_clp` = the legal CLP equivalent (4.617.647), while the native
-- (foreign) plane lives in `native_amount` (89.960) + `native_currency` ('MXN')
-- + the linked `native_to_functional_fx_snapshot_id` (implied rate 51,33).
--
-- The AR is, in substance, a FOREIGN-CURRENCY MONETARY ITEM (IAS 21 §16): it is
-- settled when the native amount (89.960 MXN) is received; the CLP delta between
-- the booked rate and the settlement rate is REALIZED FX, recognized separately
-- in `account_balances.fx_gain_loss_realized_clp` (via the per-payment
-- `fx_gain_loss_clp`, TASK-699 lane), NEVER as revenue.
--
-- Problem: the canonical amount_paid recompute (TASK-708/708b) derives
-- `payment_status` by comparing the payment sum against `total_amount`. For a
-- native invoice that compares 89.960 (MXN payments) against 4.617.647 (CLP)
-- → the invoice NEVER closes. This migration makes the recompute NATIVE-AWARE:
-- when `native_currency IS NOT NULL`, completion is measured in the NATIVE plane
-- (SUM of native-currency payments vs `native_amount`). Legacy CLP/USD invoices
-- (`native_currency IS NULL`) keep the bit-for-bit total_amount comparison.
--
-- `amount_paid` itself is UNCHANGED: it stays `SUM(active payments) + factoring +
-- withholding` (in the payment currency for native invoices). Only the STATUS
-- derivation changes. This keeps `income_settlement_reconciliation` (TASK-571)
-- reconciling (amount_paid == SUM(active payments) + factoring + withholding,
-- both native) with NO false drift and NO VIEW change.
--
-- EXPAND-AND-CONTRACT SAFETY: this is data-driven on `native_currency IS NOT
-- NULL`. Today ZERO rows carry a native plane (native population is gated behind
-- FINANCE_CORE_MXN_ENABLED, default OFF, and the Berel income row does not yet
-- exist). So this changes behavior for NO existing row → bit-for-bit safe in
-- production. The function cannot read env flags; the flag gates CREATION of
-- native data upstream, this function reacts to its presence.
--
-- ⚠️ Mirror invariant: `fn_recompute_income_amount_paid` (income trigger SSOT)
-- and `fn_sync_expense_amount_paid` (expense trigger) move together. The TS
-- recording paths (record-payment / expense-payment ledger) re-read the
-- trigger-set status after insert instead of recomputing in JS, so the DB
-- function is the single source of truth for closing.

SET search_path = greenhouse_finance, public;

-- =========================================================================
-- 1. fn_recompute_income_amount_paid — native-aware status (income trigger SSOT)
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_recompute_income_amount_paid(p_income_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  payments_total NUMERIC(14,2);
  factoring_fee_total NUMERIC(14,2);
  withholding NUMERIC(14,2);
  total_paid NUMERIC(14,2);
  income_total NUMERIC(14,2);
  income_native_amount NUMERIC;
  income_native_currency TEXT;
  native_paid NUMERIC;
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

  SELECT COALESCE(withholding_amount, 0), total_amount, native_amount, native_currency
    INTO withholding, income_total, income_native_amount, income_native_currency
  FROM greenhouse_finance.income
  WHERE income_id = p_income_id;

  total_paid := payments_total + factoring_fee_total + withholding;

  IF income_total IS NULL THEN
    RETURN total_paid;
  END IF;

  IF income_native_currency IS NOT NULL AND income_native_amount IS NOT NULL THEN
    -- TASK-990 Slice 7: native-plane settlement. Completion is measured in the
    -- native currency (IAS 21 monetary item); CLP delta is realized FX
    -- recognized separately. The native obligation closes when the native-
    -- currency payments cover `native_amount` (tolerance = 0.01 native unit).
    SELECT COALESCE(SUM(amount), 0) INTO native_paid
    FROM greenhouse_finance.income_payments
    WHERE income_id = p_income_id
      AND currency = income_native_currency
      AND superseded_by_payment_id IS NULL
      AND superseded_by_otb_id IS NULL
      AND superseded_at IS NULL;

    IF native_paid >= income_native_amount - 0.01 THEN
      new_status := 'paid';
    ELSIF total_paid > 0 THEN
      new_status := 'partial';
    ELSE
      new_status := 'pending';
    END IF;
  ELSE
    IF total_paid >= income_total THEN
      new_status := 'paid';
    ELSIF total_paid > 0 THEN
      new_status := 'partial';
    ELSE
      new_status := 'pending';
    END IF;
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
  'TASK-990 Slice 7: native-aware payment_status. When income.native_currency IS NOT NULL the AR closes against the native plane (SUM native-currency payments vs native_amount, IAS 21 monetary item); CLP delta is realized FX in account_balances. Legacy CLP/USD (native_currency NULL) keep total_amount comparison bit-for-bit. amount_paid unchanged (SUM active payments + factoring + withholding). Preserves TASK-702/703b/708b supersede exclusions.';

-- =========================================================================
-- 2. fn_sync_expense_amount_paid — native-aware status (expense trigger SSOT)
-- =========================================================================

CREATE OR REPLACE FUNCTION greenhouse_finance.fn_sync_expense_amount_paid()
RETURNS TRIGGER AS $$
DECLARE
  target_expense_id TEXT;
  new_amount_paid NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  expense_native_amount NUMERIC;
  expense_native_currency TEXT;
  native_paid NUMERIC;
  new_status TEXT;
BEGIN
  target_expense_id := COALESCE(NEW.expense_id, OLD.expense_id);

  -- IGNORE all supersede chains (TASK-702 + TASK-703b + TASK-708b dismissals).
  SELECT COALESCE(SUM(amount), 0) INTO new_amount_paid
  FROM greenhouse_finance.expense_payments
  WHERE expense_id = target_expense_id
    AND superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL;

  SELECT total_amount, native_amount, native_currency
    INTO expense_total, expense_native_amount, expense_native_currency
  FROM greenhouse_finance.expenses
  WHERE expense_id = target_expense_id;

  IF expense_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF expense_native_currency IS NOT NULL AND expense_native_amount IS NOT NULL THEN
    -- TASK-990 Slice 7: native-plane settlement (mirror of income).
    SELECT COALESCE(SUM(amount), 0) INTO native_paid
    FROM greenhouse_finance.expense_payments
    WHERE expense_id = target_expense_id
      AND currency = expense_native_currency
      AND superseded_by_payment_id IS NULL
      AND superseded_by_otb_id IS NULL
      AND superseded_at IS NULL;

    IF native_paid >= expense_native_amount - 0.01 THEN
      new_status := 'paid';
    ELSIF new_amount_paid > 0 THEN
      new_status := 'partial';
    ELSE
      new_status := 'pending';
    END IF;
  ELSE
    IF new_amount_paid >= expense_total THEN
      new_status := 'paid';
    ELSIF new_amount_paid > 0 THEN
      new_status := 'partial';
    ELSE
      new_status := 'pending';
    END IF;
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
  'TASK-990 Slice 7: native-aware payment_status mirror of fn_recompute_income_amount_paid. When expenses.native_currency IS NOT NULL the obligation closes against the native plane (SUM native-currency payments vs native_amount). Legacy keeps total_amount comparison. Preserves TASK-702/703b/708b supersede exclusions.';

-- =========================================================================
-- 3. Anti pre-up-marker verification — both functions must carry native logic
-- =========================================================================

DO $$
DECLARE
  income_fn_src TEXT;
  expense_fn_src TEXT;
BEGIN
  SELECT pg_get_functiondef('greenhouse_finance.fn_recompute_income_amount_paid(text)'::regprocedure)
    INTO income_fn_src;
  SELECT pg_get_functiondef('greenhouse_finance.fn_sync_expense_amount_paid()'::regprocedure)
    INTO expense_fn_src;

  IF income_fn_src IS NULL OR position('income_native_currency' IN income_fn_src) = 0 THEN
    RAISE EXCEPTION 'TASK-990 Slice 7 anti pre-up-marker: fn_recompute_income_amount_paid missing native-plane logic.';
  END IF;

  IF expense_fn_src IS NULL OR position('expense_native_currency' IN expense_fn_src) = 0 THEN
    RAISE EXCEPTION 'TASK-990 Slice 7 anti pre-up-marker: fn_sync_expense_amount_paid missing native-plane logic.';
  END IF;
END
$$;

-- Down Migration
--
-- Restore the TASK-708b shapes (no native-plane awareness). After rollback,
-- a native invoice paid in its native currency would NOT close (status stays
-- partial) — acceptable only when no native rows exist (the flag is OFF).

SET search_path = greenhouse_finance, public;

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

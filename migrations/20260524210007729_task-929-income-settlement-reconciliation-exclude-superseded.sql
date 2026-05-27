-- Up Migration
--
-- TASK-929 Slice 1 — Align income_settlement_reconciliation with the canonical
-- settlement equation enforced by fn_recompute_income_amount_paid.
-- =====================================================================
--
-- ROOT CAUSE (verified live 2026-05-24 against greenhouse-pg-dev):
-- The VIEW's `payments_total` subquery summed ALL income_payments rows,
-- INCLUDING superseded ones (payment supersede chains: TASK-702 payment,
-- TASK-703b OTB, TASK-708b dismissals). `fn_recompute_income_amount_paid`
-- ALREADY excludes them (WHERE superseded_by_payment_id IS NULL AND
-- superseded_by_otb_id IS NULL AND superseded_at IS NULL). So the VIEW and the
-- function were two definitions of the SAME equation that disagreed — the
-- function correct, the VIEW double-counting superseded payments.
--
-- Concrete false positives this fixes (factored invoices whose original NUBOX
-- bank-sync payment was correctly superseded by the factoring-proceeds model):
--   INC-NB-25302941: VIEW drift -6.902.000 -> real drift 0
--   INC-NB-26639047: VIEW drift -6.902.000 -> real drift 0
-- amount_paid was ALREADY correct on both; only the VIEW lied.
--
-- This is the canonical fix (single source of truth alignment), NOT a ledger
-- mutation: zero rows in income / income_payments / settlement_legs change.
--
-- The 2 remaining drifts after this fix (INC-NB-26004360, INC-202602-001) are
-- REAL stale amount_paid and are resolved separately by recompute (Slice 2).

CREATE OR REPLACE VIEW greenhouse_finance.income_settlement_reconciliation AS
SELECT
  i.income_id,
  i.invoice_number,
  i.client_id,
  i.total_amount,
  i.amount_paid,
  i.payment_status,
  COALESCE(p.payments_total, 0)::numeric(14, 2) AS payments_total,
  COALESCE(f.factoring_fee_total, 0)::numeric(14, 2) AS factoring_fee_total,
  COALESCE(f.factoring_operation_count, 0)::int AS factoring_operation_count,
  COALESCE(i.withholding_amount, 0)::numeric(14, 2) AS withholding_amount,
  (
    COALESCE(p.payments_total, 0)
    + COALESCE(f.factoring_fee_total, 0)
    + COALESCE(i.withholding_amount, 0)
  )::numeric(14, 2) AS expected_settlement,
  (
    COALESCE(i.amount_paid, 0)
    - (
        COALESCE(p.payments_total, 0)
        + COALESCE(f.factoring_fee_total, 0)
        + COALESCE(i.withholding_amount, 0)
      )
  )::numeric(14, 2) AS drift,
  (
    ABS(
      COALESCE(i.amount_paid, 0)
      - (
          COALESCE(p.payments_total, 0)
          + COALESCE(f.factoring_fee_total, 0)
          + COALESCE(i.withholding_amount, 0)
        )
    ) > 0.01
  ) AS has_drift,
  (COALESCE(f.factoring_operation_count, 0) > 0) AS is_factored
FROM greenhouse_finance.income i
LEFT JOIN (
  SELECT
    income_id,
    SUM(amount)::numeric(14, 2) AS payments_total
  FROM greenhouse_finance.income_payments
  -- TASK-929: mirror fn_recompute_income_amount_paid — exclude ALL supersede
  -- chains so a superseded payment is never double-counted against amount_paid.
  WHERE superseded_by_payment_id IS NULL
    AND superseded_by_otb_id IS NULL
    AND superseded_at IS NULL
  GROUP BY income_id
) p ON p.income_id = i.income_id
LEFT JOIN (
  SELECT
    income_id,
    SUM(COALESCE(fee_amount, 0))::numeric(14, 2) AS factoring_fee_total,
    COUNT(*)::int AS factoring_operation_count
  FROM greenhouse_finance.factoring_operations
  WHERE status = 'active'
  GROUP BY income_id
) f ON f.income_id = i.income_id
WHERE COALESCE(i.is_annulled, FALSE) = FALSE;

COMMENT ON VIEW greenhouse_finance.income_settlement_reconciliation IS
'Canonical reconciliation of income.amount_paid vs cash payments (excluding superseded) + factoring fees + withholdings. Mirrors fn_recompute_income_amount_paid exactly. Single source of truth for ledger drift detection. See src/lib/finance/income-settlement.ts. TASK-929: payments_total excludes superseded payments.';

-- Correctness verification: the two known factoring false positives must now
-- report has_drift = FALSE. If the VIEW still counts superseded payments, this
-- aborts the migration loudly (anti pre-up-marker guard pattern).
DO $$
DECLARE
  still_drifting INTEGER;
BEGIN
  SELECT COUNT(*) INTO still_drifting
  FROM greenhouse_finance.income_settlement_reconciliation
  WHERE income_id IN ('INC-NB-25302941', 'INC-NB-26639047')
    AND has_drift = TRUE;

  IF still_drifting > 0 THEN
    RAISE EXCEPTION 'TASK-929 verification failed: % factoring invoice(s) still flagged has_drift after superseded exclusion. The VIEW payments_total subquery is not excluding superseded payments.', still_drifting;
  END IF;
END
$$;

-- Down Migration
--
-- Restore the pre-TASK-929 definition (payments_total WITHOUT superseded
-- exclusion). Reintroduces the false-positive double-count; only for rollback.

CREATE OR REPLACE VIEW greenhouse_finance.income_settlement_reconciliation AS
SELECT
  i.income_id,
  i.invoice_number,
  i.client_id,
  i.total_amount,
  i.amount_paid,
  i.payment_status,
  COALESCE(p.payments_total, 0)::numeric(14, 2) AS payments_total,
  COALESCE(f.factoring_fee_total, 0)::numeric(14, 2) AS factoring_fee_total,
  COALESCE(f.factoring_operation_count, 0)::int AS factoring_operation_count,
  COALESCE(i.withholding_amount, 0)::numeric(14, 2) AS withholding_amount,
  (
    COALESCE(p.payments_total, 0)
    + COALESCE(f.factoring_fee_total, 0)
    + COALESCE(i.withholding_amount, 0)
  )::numeric(14, 2) AS expected_settlement,
  (
    COALESCE(i.amount_paid, 0)
    - (
        COALESCE(p.payments_total, 0)
        + COALESCE(f.factoring_fee_total, 0)
        + COALESCE(i.withholding_amount, 0)
      )
  )::numeric(14, 2) AS drift,
  (
    ABS(
      COALESCE(i.amount_paid, 0)
      - (
          COALESCE(p.payments_total, 0)
          + COALESCE(f.factoring_fee_total, 0)
          + COALESCE(i.withholding_amount, 0)
        )
    ) > 0.01
  ) AS has_drift,
  (COALESCE(f.factoring_operation_count, 0) > 0) AS is_factored
FROM greenhouse_finance.income i
LEFT JOIN (
  SELECT
    income_id,
    SUM(amount)::numeric(14, 2) AS payments_total
  FROM greenhouse_finance.income_payments
  GROUP BY income_id
) p ON p.income_id = i.income_id
LEFT JOIN (
  SELECT
    income_id,
    SUM(COALESCE(fee_amount, 0))::numeric(14, 2) AS factoring_fee_total,
    COUNT(*)::int AS factoring_operation_count
  FROM greenhouse_finance.factoring_operations
  WHERE status = 'active'
  GROUP BY income_id
) f ON f.income_id = i.income_id
WHERE COALESCE(i.is_annulled, FALSE) = FALSE;

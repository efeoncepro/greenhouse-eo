-- Up Migration
--
-- Canonical income settlement reconciliation
-- ============================================
--
-- This view is the single source of truth for "is this invoice's amount_paid
-- consistent with how it was actually settled?". It accounts for the *three*
-- legitimate ways a customer-facing receivable closes:
--
--   1. Cash payments       → SUM(income_payments.amount)
--   2. Factoring fees      → SUM(factoring_operations.fee_amount)  [active ops]
--                            (interest + advisory; the factoring provider
--                             keeps these out of the cash advance, but the
--                             receivable IS settled because the AR risk
--                             was sold)
--   3. Tax withholdings    → income.withholding_amount
--                            (SII/customer retention paid to tax authority,
--                             not to us, but the receivable IS settled for
--                             that portion)
--
-- The canonical settlement equation:
--
--     expected_settlement
--       = COALESCE(SUM(income_payments.amount), 0)
--       + COALESCE(SUM(factoring_operations.fee_amount WHERE status='active'), 0)
--       + COALESCE(income.withholding_amount, 0)
--
--     drift = amount_paid - expected_settlement
--
-- A row has `has_drift = TRUE` when |drift| > 0.01 (above rounding noise).
--
-- ⚠️ FOR AGENTS / FUTURE DEVS:
-- - DO NOT re-derive this equation in ad-hoc queries. Use this view (or
--   the helper `getIncomeSettlementBreakdown` in `src/lib/finance/income-settlement.ts`).
-- - When adding a NEW way an invoice can settle (e.g. credit notes, partial
--   write-offs), extend this view and the helper — never branch the logic
--   in a consumer.
-- - The Reliability Control Plane's "drift de ledger" warning queries this
--   view (`SELECT COUNT(*) WHERE has_drift = TRUE`) so any consumer that
--   computes drift differently will produce inconsistent dashboards.

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

COMMENT ON VIEW greenhouse_finance.income_settlement_reconciliation IS
'Canonical reconciliation of income.amount_paid vs the composition of cash payments + factoring fees + withholdings. Single source of truth for ledger drift detection. See src/lib/finance/income-settlement.ts for the read API.';

COMMENT ON COLUMN greenhouse_finance.factoring_operations.fee_amount IS
'Total factoring cost (interest + advisory). Counts toward income.amount_paid via greenhouse_finance.income_settlement_reconciliation — the receivable IS settled for this portion because we sold the AR risk to the provider, even though the fee never lands as cash. Do NOT re-derive this in ad-hoc queries.';

COMMENT ON COLUMN greenhouse_finance.income.amount_paid IS
'Total settled portion of the receivable. Composed of: cash payments + factoring fees (when factored) + tax withholdings. Use the canonical view greenhouse_finance.income_settlement_reconciliation (or src/lib/finance/income-settlement.ts) to validate consistency — never sum greenhouse_finance.income_payments alone, that ignores factoring + withholdings.';

-- Down Migration

DROP VIEW IF EXISTS greenhouse_finance.income_settlement_reconciliation;

-- Up Migration

-- TASK-766 Slice 1 — VIEW canónica espejo para income_payments.
-- Mismo template que expense_payments_normalized; cierra el mismo
-- anti-patrón en KPIs de revenue (cash-in, dashboard/pnl, etc).
--
-- Schema confirmado vía `\d greenhouse_finance.income_payments`:
-- columnas idénticas a expense_payments excepto `income_id` (en lugar
-- de `expense_id`) y SIN `payment_order_line_id` (no aplica a income).

CREATE VIEW greenhouse_finance.income_payments_normalized AS
SELECT
  ip.payment_id,
  ip.income_id,
  ip.payment_date,
  ip.amount                     AS payment_amount_native,
  ip.currency                   AS payment_currency,
  COALESCE(
    ip.amount_clp,
    CASE WHEN ip.currency = 'CLP' THEN ip.amount ELSE NULL END
  )                             AS payment_amount_clp,
  ip.exchange_rate_at_payment,
  ip.fx_gain_loss_clp,
  ip.payment_account_id,
  ip.payment_method,
  ip.payment_source,
  ip.is_reconciled,
  ip.reference,
  ip.recorded_by_user_id,
  ip.recorded_at,
  ip.created_at,
  (ip.currency <> 'CLP' AND ip.amount_clp IS NULL) AS has_clp_drift
FROM greenhouse_finance.income_payments ip
WHERE ip.superseded_by_payment_id IS NULL
  AND ip.superseded_by_otb_id IS NULL
  AND ip.superseded_at IS NULL;

COMMENT ON VIEW greenhouse_finance.income_payments_normalized IS
  'TASK-766 canonical reader. NEVER compute payment CLP via ip.amount * exchange_rate_to_clp. amount_clp is the FX-resolved canonical value at payment_date populated by recordIncomePayment (TASK-699 pattern). has_clp_drift flag enables reliability signal income_payments_clp_drift.';


-- Down Migration

DROP VIEW IF EXISTS greenhouse_finance.income_payments_normalized;

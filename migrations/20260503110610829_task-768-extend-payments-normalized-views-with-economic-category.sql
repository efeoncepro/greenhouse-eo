-- Up Migration

-- TASK-768 Slice 7 — Extender VIEWs canonicas (TASK-766) con dimension
-- analitica economic_category via JOIN a expenses / income.
--
-- Backwards-compatible: TODOS los campos legacy de la VIEW se preservan.
-- Solo se AGREGA economic_category. Consumers TASK-766 (sumExpensePaymentsClpForPeriod,
-- listExpensePaymentsNormalized, getExpensePaymentsClpDriftCount) siguen
-- funcionando sin modificacion.
--
-- Patron CREATE OR REPLACE VIEW: atomic, sin downtime, preserva consumers.

CREATE OR REPLACE VIEW greenhouse_finance.expense_payments_normalized AS
SELECT
  ep.payment_id,
  ep.expense_id,
  ep.payment_date,
  ep.amount                     AS payment_amount_native,
  ep.currency                   AS payment_currency,
  COALESCE(
    ep.amount_clp,
    CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END
  )                             AS payment_amount_clp,
  ep.exchange_rate_at_payment,
  ep.fx_gain_loss_clp,
  ep.payment_account_id,
  ep.payment_method,
  ep.payment_source,
  ep.is_reconciled,
  ep.payment_order_line_id,
  ep.reference,
  ep.recorded_by_user_id,
  ep.recorded_at,
  ep.created_at,
  (ep.currency <> 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift,
  e.expense_type,
  e.economic_category
FROM greenhouse_finance.expense_payments ep
LEFT JOIN greenhouse_finance.expenses e ON e.expense_id = ep.expense_id
WHERE ep.superseded_by_payment_id IS NULL
  AND ep.superseded_by_otb_id IS NULL
  AND ep.superseded_at IS NULL;

COMMENT ON VIEW greenhouse_finance.expense_payments_normalized IS
  'TASK-766 + TASK-768 canonical reader. payment_amount_clp es la dimension '
  'CLP canonica (TASK-766). expense_type es la dimension taxonomica fiscal '
  '(legacy SII). economic_category es la dimension analitica/operativa '
  '(TASK-768) para KPIs/ICO/Member Loaded Cost/Budget/Cost Attribution. '
  'NEVER compute CLP via ep.amount * exchange_rate_to_clp. NEVER use '
  'expense_type para analisis economico — usar economic_category.';

CREATE OR REPLACE VIEW greenhouse_finance.income_payments_normalized AS
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
  (ip.currency <> 'CLP' AND ip.amount_clp IS NULL) AS has_clp_drift,
  i.income_type,
  i.economic_category
FROM greenhouse_finance.income_payments ip
LEFT JOIN greenhouse_finance.income i ON i.income_id = ip.income_id
WHERE ip.superseded_by_payment_id IS NULL
  AND ip.superseded_by_otb_id IS NULL
  AND ip.superseded_at IS NULL;

COMMENT ON VIEW greenhouse_finance.income_payments_normalized IS
  'TASK-766 + TASK-768 canonical reader (mirror para income). Mismo patron '
  'que expense_payments_normalized: payment_amount_clp via COALESCE chain, '
  'income_type fiscal preservado, economic_category nueva dimension analitica.';

-- Down Migration: revertir a la version pre-TASK-768 (sin LEFT JOIN a tabla parent).

CREATE OR REPLACE VIEW greenhouse_finance.expense_payments_normalized AS
SELECT
  ep.payment_id,
  ep.expense_id,
  ep.payment_date,
  ep.amount                     AS payment_amount_native,
  ep.currency                   AS payment_currency,
  COALESCE(
    ep.amount_clp,
    CASE WHEN ep.currency = 'CLP' THEN ep.amount ELSE NULL END
  )                             AS payment_amount_clp,
  ep.exchange_rate_at_payment,
  ep.fx_gain_loss_clp,
  ep.payment_account_id,
  ep.payment_method,
  ep.payment_source,
  ep.is_reconciled,
  ep.payment_order_line_id,
  ep.reference,
  ep.recorded_by_user_id,
  ep.recorded_at,
  ep.created_at,
  (ep.currency <> 'CLP' AND ep.amount_clp IS NULL) AS has_clp_drift
FROM greenhouse_finance.expense_payments ep
WHERE ep.superseded_by_payment_id IS NULL
  AND ep.superseded_by_otb_id IS NULL
  AND ep.superseded_at IS NULL;

CREATE OR REPLACE VIEW greenhouse_finance.income_payments_normalized AS
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

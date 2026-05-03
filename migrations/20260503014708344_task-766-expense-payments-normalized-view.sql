-- Up Migration

-- TASK-766 Slice 1 — VIEW canónica para lectura de monto CLP de un
-- expense_payment. Single source of truth para KPIs / dashboards / P&L /
-- reconciliation. CUALQUIER consumer que necesite "monto en CLP" lee
-- desde esta VIEW (o el helper TS sumExpensePaymentsClpForPeriod).
--
-- Anti-patrón que cierra: el bug detectado el 2026-05-02 en /finance/cash-out
-- donde KPIs se inflaban 88× porque el SQL embebido hacía
-- `SUM(ep.amount * COALESCE(e.exchange_rate_to_clp, 1))`. Ese cálculo
-- es válido solo si `ep.currency == e.currency`, lo cual NO es invariante
-- (caso CCA TASK-714c: expense USD pagado en CLP via CCA del accionista,
-- payment_id `exp-pay-sha-46679051-7ba82530`: $1,106,321 CLP × 910.55 =
-- $1,007,363,090 fantasma).
--
-- Reglas de la VIEW:
--   * payment_amount_clp = COALESCE(ep.amount_clp, CASE WHEN currency='CLP' THEN ep.amount END)
--     - Prioriza el valor canónico persistido (FX resolution al momento
--       del pago via recordExpensePayment, TASK-699 pattern).
--     - Fallback solo para CLP nativo (1:1 trivial).
--     - NULL para non-CLP sin amount_clp poblado → drift detectable.
--   * has_clp_drift expone explícitamente el caso roto. Reliability
--     signal `expense_payments_clp_drift` consume este flag.
--   * 3-axis supersede preservado (TASK-702/708b): excluye filas
--     superseded_by_payment_id, superseded_by_otb_id, superseded_at.
--     Ningún consumer canónico debería ver versiones obsoletas.
--
-- Mismo patrón canónico que `fx_pnl_breakdown` (TASK-699) y
-- `income_settlement_reconciliation` (TASK-571).

CREATE VIEW greenhouse_finance.expense_payments_normalized AS
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

COMMENT ON VIEW greenhouse_finance.expense_payments_normalized IS
  'TASK-766 canonical reader. NEVER compute payment CLP via ep.amount * exchange_rate_to_clp. amount_clp is the FX-resolved canonical value at payment_date populated by recordExpensePayment (TASK-699 pattern). has_clp_drift flag enables reliability signal expense_payments_clp_drift.';


-- Down Migration

DROP VIEW IF EXISTS greenhouse_finance.expense_payments_normalized;

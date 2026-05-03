import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-774 Slice 4 — Reliability signal: account_balances con FX drift.
 *
 * Detecta `account_balances` cuyo `closing_balance` persistido diverge del
 * recompute esperado desde las VIEWs canónicas TASK-766
 * (`expense_payments_normalized`, `income_payments_normalized`) +
 * COALESCE(`settlement_legs.amount_clp`, ...). Cada divergencia indica que
 * el materializer corrió antes del fix TASK-774 (Slice 2) o que un nuevo
 * callsite re-introdujo el anti-patrón `SUM(payment.amount)` sin
 * distinguir currency vs amount_clp.
 *
 * **Cómo funciona el detect**:
 *
 *   Para cada (account_id, balance_date), recompute el delta esperado:
 *     expected_delta = SUM(income_payments_normalized.payment_amount_clp)
 *                    + SUM(settlement_legs CLP-resolved IN)
 *                    - SUM(expense_payments_normalized.payment_amount_clp)
 *                    - SUM(settlement_legs CLP-resolved OUT)
 *
 *   Y compara con el persistido:
 *     persisted_delta = period_inflows - period_outflows
 *
 *   Si abs(expected_delta - persisted_delta) > 1 CLP → fila en drift.
 *
 * **Tolerancia**: > 1 CLP (anti FP-rounding noise). Drift real Figma 2026-05-03
 * fue de $83.680.6 (un orden de magnitud por encima del threshold).
 *
 * **Steady state esperado** = 0 post-deploy + cron rematerialización + backfill.
 *
 * **Kind**: `drift`. **Severidad**: `error` cuando count > 0.
 *
 * Pattern reference: TASK-766 Slice 2 (`expense-payments-clp-drift.ts`).
 */
export const ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID =
  'finance.account_balances.fx_drift'

const QUERY_SQL = `
  WITH expected_per_day AS (
    SELECT
      ab.account_id,
      ab.balance_date,
      ab.period_inflows,
      ab.period_outflows,
      COALESCE(SUM(CASE WHEN sl.direction = 'incoming'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_in,
      COALESCE(SUM(CASE WHEN sl.direction = 'outgoing'
        THEN COALESCE(sl.amount_clp, CASE WHEN sl.currency = 'CLP' THEN sl.amount END)
        ELSE 0 END), 0) AS expected_settlement_out
    FROM greenhouse_finance.account_balances ab
    LEFT JOIN greenhouse_finance.settlement_legs sl
      ON sl.instrument_id = ab.account_id
      AND sl.transaction_date = ab.balance_date
      AND sl.superseded_at IS NULL
      AND sl.superseded_by_otb_id IS NULL
    WHERE ab.balance_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY ab.account_id, ab.balance_date, ab.period_inflows, ab.period_outflows
  ),
  expected_payments AS (
    SELECT
      epd.account_id,
      epd.balance_date,
      epd.period_inflows,
      epd.period_outflows,
      epd.expected_settlement_in,
      epd.expected_settlement_out,
      COALESCE((
        SELECT SUM(ipn.payment_amount_clp)
        FROM greenhouse_finance.income_payments_normalized ipn
        WHERE ipn.payment_account_id = epd.account_id
          AND ipn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl2
            WHERE sl2.linked_payment_type = 'income_payment'
              AND sl2.linked_payment_id = ipn.payment_id
              AND sl2.instrument_id = epd.account_id
              AND sl2.superseded_at IS NULL
              AND sl2.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_in,
      COALESCE((
        SELECT SUM(epn.payment_amount_clp)
        FROM greenhouse_finance.expense_payments_normalized epn
        WHERE epn.payment_account_id = epd.account_id
          AND epn.payment_date = epd.balance_date
          AND NOT EXISTS (
            SELECT 1 FROM greenhouse_finance.settlement_legs sl3
            WHERE sl3.linked_payment_type = 'expense_payment'
              AND sl3.linked_payment_id = epn.payment_id
              AND sl3.instrument_id = epd.account_id
              AND sl3.superseded_at IS NULL
              AND sl3.superseded_by_otb_id IS NULL
          )
      ), 0) AS expected_payment_out
    FROM expected_per_day epd
  )
  SELECT COUNT(*)::int AS n
  FROM expected_payments ep
  WHERE ABS(
    (ep.expected_settlement_in + ep.expected_payment_in)
    - (ep.expected_settlement_out + ep.expected_payment_out)
    - (ep.period_inflows - ep.period_outflows)
  ) > 1
`

export const getAccountBalancesFxDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getAccountBalancesFxDriftSignal',
      label: 'Account balances con FX drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin drift FX en account_balances de los ultimos 90 dias.'
          : `${count} account_balance${count === 1 ? '' : 's'} con FX drift detectado en los ultimos 90 dias. Rematerializar con scripts/finance/backfill-account-balances-fx-fix.ts.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'VIEWs canonicas',
          value: 'expense_payments_normalized, income_payments_normalized + COALESCE(sl.amount_clp,...)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'window_days',
          value: '90'
        },
        {
          kind: 'metric',
          label: 'tolerance_clp',
          value: '1'
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-774-account-balance-clp-native-reader-contract.md (slice 4)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_account_balances_fx_drift' }
    })

    return {
      signalId: ACCOUNT_BALANCES_FX_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getAccountBalancesFxDriftSignal',
      label: 'Account balances con FX drift',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}

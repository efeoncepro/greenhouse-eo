import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-766 Slice 2 — Reliability signal: expense_payments con drift CLP.
 *
 * Cuenta `expense_payments` activos (no superseded) cuya `currency != 'CLP'`
 * pero `amount_clp IS NULL`. Estos registros son inválidos a futuro: el CHECK
 * constraint `expense_payments_clp_amount_required_after_cutover` los bloquea
 * post-cutover (2026-05-03), pero las filas legacy (created_at < cutover)
 * pueden persistir hasta que el repair endpoint
 * `POST /api/admin/finance/payments-clp-repair` (Slice 5) las repare invocando
 * `resolveExchangeRateToClp` con el `payment_date` histórico.
 *
 * Cualquier valor > 0 indica:
 *  - Una fila legacy pendiente de repair (acción manual).
 *  - O un break en el helper canónico `recordExpensePayment` (TASK-708/765)
 *    que dejó de poblar `amount_clp` correctamente.
 *
 * Steady state esperado = 0.
 *
 * **Kind**: `drift` (divergencia entre el invariante canónico y el dataset).
 * **Severidad**: `error` cuando count > 0 (Finance Data Quality breakage).
 *
 * Pattern reference: TASK-765 Slice 7 reliability queries
 * (`payment-orders-paid-without-expense-payment.ts`, etc).
 */
export const EXPENSE_PAYMENTS_CLP_DRIFT_SIGNAL_ID =
  'finance.expense_payments.clp_drift'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.expense_payments_normalized
  WHERE has_clp_drift = TRUE
`

export const getExpensePaymentsClpDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: EXPENSE_PAYMENTS_CLP_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getExpensePaymentsClpDriftSignal',
      label: 'Expense payments con drift CLP',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin payments non-CLP sin amount_clp resuelto.'
          : `${count} expense_payment${count === 1 ? '' : 's'} non-CLP sin amount_clp persistido. Repair via POST /api/admin/finance/payments-clp-repair.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'SELECT COUNT(*) FROM greenhouse_finance.expense_payments_normalized WHERE has_clp_drift = TRUE'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-766-finance-clp-currency-reader-contract.md (slice 2)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_expense_payments_clp_drift' }
    })

    return {
      signalId: EXPENSE_PAYMENTS_CLP_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getExpensePaymentsClpDriftSignal',
      label: 'Expense payments con drift CLP',
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

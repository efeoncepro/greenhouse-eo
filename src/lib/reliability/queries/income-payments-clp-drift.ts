import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-766 Slice 2 — Reliability signal: income_payments con drift CLP.
 *
 * Mirror del signal `expense_payments_clp_drift`. Mismo invariante para
 * income_payments: post-cutover 2026-05-03, ningún payment non-CLP debería
 * existir sin `amount_clp` resuelto.
 *
 * Steady state esperado = 0.
 */
export const INCOME_PAYMENTS_CLP_DRIFT_SIGNAL_ID =
  'finance.income_payments.clp_drift'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_finance.income_payments_normalized
  WHERE has_clp_drift = TRUE
`

export const getIncomePaymentsClpDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: INCOME_PAYMENTS_CLP_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getIncomePaymentsClpDriftSignal',
      label: 'Income payments con drift CLP',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Sin payments non-CLP sin amount_clp resuelto.'
          : `${count} income_payment${count === 1 ? '' : 's'} non-CLP sin amount_clp persistido. Repair via POST /api/admin/finance/payments-clp-repair.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'SELECT COUNT(*) FROM greenhouse_finance.income_payments_normalized WHERE has_clp_drift = TRUE'
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
      tags: { source: 'reliability_signal_income_payments_clp_drift' }
    })

    return {
      signalId: INCOME_PAYMENTS_CLP_DRIFT_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getIncomePaymentsClpDriftSignal',
      label: 'Income payments con drift CLP',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-765 Slice 7 — Reliability signal reader.
 *
 * Cuenta períodos payroll exportados hace > 1h que aún no tienen filas
 * materializadas en `greenhouse_finance.expenses` con `expense_type='payroll'
 * AND source_type='payroll_generated'`.
 *
 * Captura la falla del incidente 2026-05-01: el reactor de
 * `finance_expense_reactive_intake` falló silenciosamente al INSERT en
 * `expenses` por drift de columnas, dejando 0 filas para 2026-04 y permitiendo
 * que las payment_orders downstream se aprobaran y cerraran como zombie.
 *
 * **Kind**: `lag`. Steady state esperado = 0.
 * **Severidad**: `warning` (no error). El path es asincrónico — un período
 * recién exportado puede tardar minutos en materializar; sólo después de 1h
 * el lag pasa a ser sospechoso.
 */
export const PAYROLL_EXPENSE_MATERIALIZATION_LAG_SIGNAL_ID =
  'finance.payroll_expense.materialization_lag'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_payroll.payroll_periods pp
  WHERE pp.status = 'exported'
    AND pp.exported_at < NOW() - INTERVAL '1 hour'
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.expenses e
       WHERE e.payroll_period_id = pp.period_id
         AND e.expense_type = 'payroll'
         AND e.source_type = 'payroll_generated'
    )
`

export const getPayrollExpenseMaterializationLagSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: PAYROLL_EXPENSE_MATERIALIZATION_LAG_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getPayrollExpenseMaterializationLagSignal',
      label: 'Lag de materialización payroll → expenses',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin períodos payroll exportados sin materializar.'
          : `${count} período${count === 1 ? '' : 's'} payroll exportado${count === 1 ? '' : 's'} hace > 1h sin filas en expenses.`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value: 'greenhouse_payroll.payroll_periods + greenhouse_finance.expenses (NOT EXISTS)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-765-payment-order-bank-settlement-resilience.md (slice 7)'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_payroll_expense_materialization_lag' }
    })

    return {
      signalId: PAYROLL_EXPENSE_MATERIALIZATION_LAG_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getPayrollExpenseMaterializationLagSignal',
      label: 'Lag de materialización payroll → expenses',
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

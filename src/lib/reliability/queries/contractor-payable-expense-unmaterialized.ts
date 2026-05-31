import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-977 Slice 4 — Data-quality signal: contractor payables committed to Finance
 * (ready_for_finance / obligation_created / payment_order_created) for longer than a
 * grace window WITHOUT a materialized expense (`expenses.contractor_payable_id`).
 *
 * The expense is the precondition of the bank settlement (TASK-977 Slice 3 resolves
 * the expense by `contractor_payable_id`). If the reactive materializer
 * (`contractor_payable_expense_materialize`, Slice 2) dead-lettered, the settlement
 * would be blocked. Steady state = 0; a sustained non-zero value means the materializer
 * is lagging/stuck and those payables cannot be paid until it recovers.
 *
 * **Kind**: `data_quality`. **moduleKey**: `finance`. **Severity**: count=0 → ok;
 * count>0 → warning; query falla → unknown. Aritmética con `NOW() - INTERVAL` sobre
 * TIMESTAMPTZ (sin EXTRACT(EPOCH FROM date), gate TASK-893).
 */
export const CONTRACTOR_PAYABLE_EXPENSE_UNMATERIALIZED_SIGNAL_ID =
  'finance.contractor_payable.expense_unmaterialized'

const GRACE_MINUTES = 30

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_payables cp
  WHERE cp.status IN ('ready_for_finance', 'obligation_created', 'payment_order_created')
    AND cp.updated_at < NOW() - ($1 || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_finance.expenses e
      WHERE e.contractor_payable_id = cp.contractor_payable_id
    )
`

type UnmaterializedRow = {
  n: number
}

export const getContractorPayableExpenseUnmaterializedSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<UnmaterializedRow>(QUERY_SQL, [String(GRACE_MINUTES)])
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Todos los payables comprometidos tienen su expense materializado.'
          : `${count} contractor payable${count === 1 ? '' : 's'} comprometido${count === 1 ? '' : 's'} hace más de ${GRACE_MINUTES} min sin expense materializado (settlement bloqueado).`

      return {
        signalId: CONTRACTOR_PAYABLE_EXPENSE_UNMATERIALIZED_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'data_quality',
        source: 'getContractorPayableExpenseUnmaterializedSignal',
        label: 'Contractor payable sin expense materializado',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_payables WHERE status IN (ready_for_finance,obligation_created,payment_order_created) AND updated_at < NOW()-30min AND NOT EXISTS expense(contractor_payable_id)"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'metric',
            label: 'grace_minutes',
            value: String(GRACE_MINUTES)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/tasks/in-progress/TASK-977-contractor-payable-bank-settlement.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'reliability_signal_contractor_payable_expense_unmaterialized' }
      })

      return {
        signalId: CONTRACTOR_PAYABLE_EXPENSE_UNMATERIALIZED_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'data_quality',
        source: 'getContractorPayableExpenseUnmaterializedSignal',
        label: 'Contractor payable sin expense materializado',
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

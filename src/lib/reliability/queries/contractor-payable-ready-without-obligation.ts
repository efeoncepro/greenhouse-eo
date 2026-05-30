import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-793 Slice 3 — Lag signal: contractor payables that reached
 * `ready_for_finance` but still have no Finance obligation linked after a grace
 * window. Steady state = 0; a sustained non-zero value means the bridge
 * projection (`contractor_payable_finance_obligation`) is lagging or stuck.
 *
 * **Kind**: `lag`. **moduleKey**: `finance`. **Severity**: count=0 → ok;
 * count>0 → warning; query falla → unknown. Aritmética con `NOW() - INTERVAL`
 * sobre TIMESTAMPTZ (sin EXTRACT(EPOCH FROM date), gate TASK-893).
 */
export const CONTRACTOR_PAYABLE_READY_WITHOUT_OBLIGATION_SIGNAL_ID =
  'finance.contractor_payable.ready_without_obligation'

const GRACE_MINUTES = 30

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_payables
  WHERE status = 'ready_for_finance'
    AND finance_obligation_id IS NULL
    AND updated_at < NOW() - ($1 || ' minutes')::interval
`

type ReadyWithoutObligationRow = {
  n: number
}

export const getContractorPayableReadyWithoutObligationSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<ReadyWithoutObligationRow>(QUERY_SQL, [String(GRACE_MINUTES)])
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Todos los payables listos generaron su obligación Finance.'
          : `${count} payable${count === 1 ? '' : 's'} en ready_for_finance hace más de ${GRACE_MINUTES} min sin obligación Finance.`

      return {
        signalId: CONTRACTOR_PAYABLE_READY_WITHOUT_OBLIGATION_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'lag',
        source: 'getContractorPayableReadyWithoutObligationSignal',
        label: 'Contractor payables listos sin obligación Finance',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_payables WHERE status='ready_for_finance' AND finance_obligation_id IS NULL AND updated_at < NOW() - 30min"
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
            value: 'docs/tasks/in-progress/TASK-793-contractor-payables-finance-obligations-bridge.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'finance', {
        tags: { source: 'reliability_signal_contractor_payable_ready_without_obligation' }
      })

      return {
        signalId: CONTRACTOR_PAYABLE_READY_WITHOUT_OBLIGATION_SIGNAL_ID,
        moduleKey: 'finance',
        kind: 'lag',
        source: 'getContractorPayableReadyWithoutObligationSignal',
        label: 'Contractor payables listos sin obligación Finance',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-979 — coverage signal de la corrida mensual de pago a contractors.
 *
 * Mide la BRECHA DE COBERTURA específica de la corrida: obligations
 * `provider_payroll` (source_kind 'contractor_payable') aún batcheables
 * (status 'generated'/'partially_paid'), NO incluidas en ninguna payment order
 * viva, con `due_date` ya vencido. Son justamente las que la corrida mensual
 * debería haber preparado y no preparó.
 *
 * Distinto de:
 *   - `finance.contractor_payable.payment_sla_overdue` (TASK-978, más amplio:
 *     CUALQUIER payable comprometido y vencido — su remediación es aprobar/pagar).
 *   - `finance.contractor_payable.ready_without_obligation` (TASK-793, tramo
 *     anterior: payable ready sin obligación todavía).
 *
 * Remediación canónica cuando alerta: **disparar la corrida mensual**
 * (`POST /api/finance/contractor-payables/monthly-run`).
 *
 * **Kind**: `drift` (cobertura divergente del estado esperado). **moduleKey**:
 * `finance`. **Severity**: count=0 → ok; count>0 & máx atraso ≤10 días →
 * warning; máx atraso >10 días → error; query falla → unknown. Steady state = 0.
 *
 * Arithmetic: `CURRENT_DATE - o.due_date` es integer (ambos DATE) — NO
 * `EXTRACT(EPOCH FROM (date - date))` (SQL Signal Reader Schema Validation Gate,
 * TASK-893).
 */
export const CONTRACTOR_PAYABLE_UNBATCHED_OVERDUE_SIGNAL_ID =
  'finance.contractor_payable.unbatched_overdue'

const ERROR_THRESHOLD_DAYS = 10

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(MAX(CURRENT_DATE - o.due_date), 0)::int AS max_overdue_days
  FROM greenhouse_finance.payment_obligations o
  LEFT JOIN greenhouse_finance.payment_order_lines pol
    ON o.obligation_id = pol.obligation_id
   AND pol.state NOT IN ('cancelled', 'failed')
  WHERE o.source_kind = 'contractor_payable'
    AND o.obligation_kind = 'provider_payroll'
    AND o.status IN ('generated', 'partially_paid')
    AND pol.line_id IS NULL
    AND o.due_date IS NOT NULL
    AND o.due_date < CURRENT_DATE
`

type UnbatchedRow = {
  n: number
  max_overdue_days: number
}

export const getContractorPayableUnbatchedOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<UnbatchedRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const maxOverdueDays = Number(rows[0]?.max_overdue_days ?? 0)

    const severity: 'ok' | 'warning' | 'error' =
      count === 0 ? 'ok' : maxOverdueDays > ERROR_THRESHOLD_DAYS ? 'error' : 'warning'

    const summary =
      count === 0
        ? 'Todas las obligaciones de contractor vencidas están batcheadas en una orden de pago.'
        : `${count} obligación${count === 1 ? '' : 'es'} de contractor vencida${count === 1 ? '' : 's'} sin batchear en ninguna orden (máx ${maxOverdueDays} día${maxOverdueDays === 1 ? '' : 's'}). Disparar la corrida mensual.`

    return {
      signalId: CONTRACTOR_PAYABLE_UNBATCHED_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getContractorPayableUnbatchedOverdueSignal',
      label: 'Obligaciones de contractor vencidas sin batchear (corrida mensual)',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_finance.payment_obligations o LEFT JOIN payment_order_lines pol (live) WHERE source_kind=contractor_payable AND obligation_kind=provider_payroll AND status IN (generated,partially_paid) AND pol.line_id IS NULL AND due_date < CURRENT_DATE"
        },
        {
          kind: 'metric',
          label: 'unbatched_overdue_count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'max_overdue_days',
          value: String(maxOverdueDays)
        },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-979-monthly-contractor-payment-run.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_contractor_payable_unbatched_overdue' }
    })

    return {
      signalId: CONTRACTOR_PAYABLE_UNBATCHED_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getContractorPayableUnbatchedOverdueSignal',
      label: 'Obligaciones de contractor vencidas sin batchear (corrida mensual)',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-795 Fase A — Lag signal: contractor payables stuck in `blocked` by an FX
 * readiness gate (`fx_unresolved` = no reliable rate, or `fx_policy_unresolved`
 * = cross-currency without an explicit FX policy) past a grace window.
 *
 * A sustained non-zero value means cross-currency payables can't settle: either
 * the FX rate source is missing/stale, or the engagement never declared an
 * explicit `fx_policy_code` (D-795-1).
 *
 * **Kind**: `lag`. **moduleKey**: `finance`. **Severity**: count=0 → ok;
 * count>0 → warning; query falla → unknown. Aritmética con `NOW() - INTERVAL`
 * sobre TIMESTAMPTZ (sin EXTRACT(EPOCH FROM date), gate TASK-893).
 */
export const CONTRACTOR_PAYABLE_FX_UNRESOLVED_OVERDUE_SIGNAL_ID =
  'finance.contractor_payable.fx_unresolved_overdue'

const OVERDUE_DAYS = 3

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_payables
  WHERE status = 'blocked'
    AND (
      readiness_json -> 'blockers' @> '[{"code":"fx_unresolved"}]'::jsonb
      OR readiness_json -> 'blockers' @> '[{"code":"fx_policy_unresolved"}]'::jsonb
    )
    AND updated_at < NOW() - ($1 || ' days')::interval
`

type OverdueRow = { n: number }

export const getContractorPayableFxUnresolvedOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<OverdueRow>(QUERY_SQL, [String(OVERDUE_DAYS)])
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Sin payables contractor bloqueados por FX sin resolver.'
        : `${count} payable${count === 1 ? '' : 's'} contractor bloqueado${count === 1 ? '' : 's'} por FX sin resolver (tasa o política) hace más de ${OVERDUE_DAYS} días.`

    return {
      signalId: CONTRACTOR_PAYABLE_FX_UNRESOLVED_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getContractorPayableFxUnresolvedOverdueSignal',
      label: 'Contractor payables bloqueados por FX',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_hr.contractor_payables WHERE status='blocked' AND readiness blockers @> {fx_unresolved | fx_policy_unresolved} AND updated_at < NOW() - 3d"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        { kind: 'metric', label: 'overdue_days', value: String(OVERDUE_DAYS) },
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/tasks/in-progress/TASK-795-international-contractor-provider-boundary-fx-policy.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'finance', {
      tags: { source: 'reliability_signal_contractor_payable_fx_unresolved_overdue' }
    })

    return {
      signalId: CONTRACTOR_PAYABLE_FX_UNRESOLVED_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'lag',
      source: 'getContractorPayableFxUnresolvedOverdueSignal',
      label: 'Contractor payables bloqueados por FX',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}

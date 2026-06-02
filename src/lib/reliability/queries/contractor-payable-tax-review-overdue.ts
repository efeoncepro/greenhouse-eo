import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-795 Fase A — Drift signal: contractor payables stuck in `blocked` by the
 * tax-owner boundary gate (`tax_owner_review_required`) past a review window.
 *
 * These payables need a human tax review or the `international_internal`
 * withholding engine (TASK-905) before they can reach Finance (D-795-4). A
 * sustained non-zero value means international/manual-review payables are piling
 * up without resolution.
 *
 * **Kind**: `drift`. **moduleKey**: `finance`. **Severity**: count=0 → ok;
 * count>0 → warning; query falla → unknown. Aritmética con `NOW() - INTERVAL`
 * sobre TIMESTAMPTZ (sin EXTRACT(EPOCH FROM date), gate TASK-893).
 */
export const CONTRACTOR_PAYABLE_TAX_REVIEW_OVERDUE_SIGNAL_ID =
  'finance.contractor_payable.tax_review_overdue'

const OVERDUE_DAYS = 7

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_payables
  WHERE status = 'blocked'
    AND readiness_json -> 'blockers' @> '[{"code":"tax_owner_review_required"}]'::jsonb
    AND updated_at < NOW() - ($1 || ' days')::interval
`

type OverdueRow = { n: number }

export const getContractorPayableTaxReviewOverdueSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<OverdueRow>(QUERY_SQL, [String(OVERDUE_DAYS)])
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Sin payables contractor bloqueados por revisión tributaria pendiente.'
        : `${count} payable${count === 1 ? '' : 's'} contractor bloqueado${count === 1 ? '' : 's'} por revisión tributaria/withholding engine hace más de ${OVERDUE_DAYS} días.`

    return {
      signalId: CONTRACTOR_PAYABLE_TAX_REVIEW_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getContractorPayableTaxReviewOverdueSignal',
      label: 'Contractor payables bloqueados por revisión tributaria',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_hr.contractor_payables WHERE status='blocked' AND readiness blockers @> tax_owner_review_required AND updated_at < NOW() - 7d"
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
      tags: { source: 'reliability_signal_contractor_payable_tax_review_overdue' }
    })

    return {
      signalId: CONTRACTOR_PAYABLE_TAX_REVIEW_OVERDUE_SIGNAL_ID,
      moduleKey: 'finance',
      kind: 'drift',
      source: 'getContractorPayableTaxReviewOverdueSignal',
      label: 'Contractor payables bloqueados por revisión tributaria',
      severity: 'unknown',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }
      ]
    }
  }
}

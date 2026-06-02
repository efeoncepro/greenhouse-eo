import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-985 — Contractor engagement classification review pending signal.
 *
 * Cuenta engagements NO terminales (status NOT IN ('ended','cancelled')) cuya
 * clasificación es `needs_review` — la señal blanda que NO bloquea la activación
 * (a diferencia de `legal_review_required`/`blocked`, que cubre el signal
 * `hr.contractor_engagement.classification_risk_open`). Es la SALVEDAD de la
 * auto-activación de onboarding (TASK-985): como ahora un engagement con
 * `needs_review` puede quedar `active`, esta señal hace que la revisión de
 * clasificación quede VISIBLE como worklist y no se olvide.
 *
 * **Kind**: `data_quality`. No es steady=0 estricto — puede haber algunos
 * pendientes de revisar legítimamente; tiende a 0 a medida que HR los revisa.
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (worklist de revisión de clasificación pendiente)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal`.
 */
export const CONTRACTOR_ENGAGEMENT_CLASSIFICATION_REVIEW_PENDING_SIGNAL_ID =
  'hr.contractor_engagement.classification_review_pending'

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COUNT(*) FILTER (WHERE status = 'active')::int AS active_n
  FROM greenhouse_hr.contractor_engagements
  WHERE classification_risk_status = 'needs_review'
    AND status NOT IN ('ended', 'cancelled')
`

type ReviewPendingRow = {
  n: number
  active_n: number
}

export const getContractorEngagementClassificationReviewPendingSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<ReviewPendingRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const activeCount = Number(rows[0]?.active_n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin engagements contractor con revisión de clasificación pendiente.'
          : `${count} engagement${count === 1 ? '' : 's'} contractor con clasificación pendiente de revisión (${activeCount} activo${activeCount === 1 ? '' : 's'}).`

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLASSIFICATION_REVIEW_PENDING_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorEngagementClassificationReviewPendingSignal',
        label: 'Revisión de clasificación contractor pendiente',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_engagements WHERE classification_risk_status = 'needs_review' AND status NOT IN ('ended','cancelled')"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'metric',
            label: 'active',
            value: String(activeCount)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/tasks/in-progress/TASK-985-contractor-onboarding-auto-activation.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_engagement_classification_review_pending' }
      })

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLASSIFICATION_REVIEW_PENDING_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorEngagementClassificationReviewPendingSignal',
        label: 'Revisión de clasificación contractor pendiente',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-790 Slice 3 — Contractor engagement classification risk open signal.
 *
 * Cuenta contractor engagements NO terminales (status NOT IN ('ended','cancelled'))
 * cuyo `classification_risk_status` es bloqueante ('legal_review_required' o
 * 'blocked'). Estos engagements no pueden activarse (DB CHECK
 * `contractor_engagements_active_requires_clear_risk` + app guard) y representan
 * riesgo de reclasificacion laboral pendiente de revision legal.
 *
 * **Kind**: `drift`. Steady state esperado: 0 (todo riesgo bloqueante deberia
 * resolverse via `reviewContractorClassification`).
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity), donde viven los
 * signals de lifecycle de relaciones laborales (offboarding completeness, SCIM,
 * person legal profile).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (riesgo de clasificacion abierto, bloquea activacion)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getOffboardingCompletenessPartialSignal` (TASK-892).
 * Spec: docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md
 */
export const CONTRACTOR_ENGAGEMENT_CLASSIFICATION_RISK_OPEN_SIGNAL_ID =
  'hr.contractor_engagement.classification_risk_open'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_engagements
  WHERE classification_risk_status IN ('legal_review_required', 'blocked')
    AND status NOT IN ('ended', 'cancelled')
`

type RiskOpenQueryRow = {
  n: number
}

export const getContractorEngagementClassificationRiskOpenSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<RiskOpenQueryRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin engagements contractor con riesgo de clasificación abierto.'
          : `${count} engagement${count === 1 ? '' : 's'} contractor con riesgo de clasificación bloqueante (revisión legal pendiente).`

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLASSIFICATION_RISK_OPEN_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'drift',
        source: 'getContractorEngagementClassificationRiskOpenSignal',
        label: 'Riesgo de clasificación contractor abierto',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_engagements WHERE classification_risk_status IN ('legal_review_required','blocked') AND status NOT IN ('ended','cancelled')"
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
              'docs/tasks/in-progress/TASK-790-contractor-engagements-runtime-classification-risk.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_engagement_classification_risk_open' }
      })

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLASSIFICATION_RISK_OPEN_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'drift',
        source: 'getContractorEngagementClassificationRiskOpenSignal',
        label: 'Riesgo de clasificación contractor abierto',
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

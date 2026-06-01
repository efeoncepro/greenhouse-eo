import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-797 — Contractor engagement closed with open payables signal.
 *
 * Cuenta engagements en estado terminal (`ended`/`cancelled`) que TODAVÍA tienen
 * ≥1 payable NO terminal (status NOT IN ('paid','cancelled')). En operación
 * normal un cierre liquida o cancela sus payables; este conteo > 0 significa:
 *   - un cierre se ejecutó reconociendo (acknowledge) payables abiertos que aún
 *     deben liquidarse fuera del flujo → follow-up pendiente, o
 *   - un bypass del flujo de cierre (transición genérica a `ended` sin gate).
 *
 * Defense-in-depth del comando de cierre (`executeContractorClosure`). NUNCA es
 * finiquito (boundary TASK-890): solo observabilidad de integridad de payables.
 *
 * **Kind**: `data_quality`. Steady state esperado: 0.
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity), donde viven los
 * signals de lifecycle de relaciones laborales (offboarding, SCIM, contractor).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (cierre con payables abiertos → liquidar/cancelar)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal`.
 */
export const CONTRACTOR_ENGAGEMENT_CLOSED_WITH_OPEN_PAYABLES_SIGNAL_ID =
  'hr.contractor_engagement.closed_with_open_payables'

const QUERY_SQL = `
  SELECT COUNT(DISTINCT e.contractor_engagement_id)::int AS n
  FROM greenhouse_hr.contractor_engagements e
  JOIN greenhouse_hr.contractor_payables p
    ON p.contractor_engagement_id = e.contractor_engagement_id
  WHERE e.status IN ('ended', 'cancelled')
    AND p.status NOT IN ('paid', 'cancelled')
`

type ClosedWithOpenPayablesRow = {
  n: number
}

export const getContractorEngagementClosedWithOpenPayablesSignal =
  async (): Promise<ReliabilitySignal> => {
    const observedAt = new Date().toISOString()

    try {
      const rows = await query<ClosedWithOpenPayablesRow>(QUERY_SQL)
      const count = Number(rows[0]?.n ?? 0)
      const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

      const summary =
        count === 0
          ? 'Sin engagements contractor cerrados con payables abiertos.'
          : `${count} engagement${count === 1 ? '' : 's'} contractor cerrado${
              count === 1 ? '' : 's'
            } con payables abiertos (liquidar o cancelar).`

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLOSED_WITH_OPEN_PAYABLES_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorEngagementClosedWithOpenPayablesSignal',
        label: 'Cierre contractor con payables abiertos',
        severity,
        summary,
        observedAt,
        evidence: [
          {
            kind: 'sql',
            label: 'Query',
            value:
              "greenhouse_hr.contractor_engagements e JOIN contractor_payables p WHERE e.status IN ('ended','cancelled') AND p.status NOT IN ('paid','cancelled')"
          },
          {
            kind: 'metric',
            label: 'count',
            value: String(count)
          },
          {
            kind: 'doc',
            label: 'Spec',
            value: 'docs/tasks/in-progress/TASK-797-contractor-closure-transition-controls.md'
          }
        ]
      }
    } catch (error) {
      captureWithDomain(error, 'identity', {
        tags: { source: 'reliability_signal_contractor_engagement_closed_with_open_payables' }
      })

      return {
        signalId: CONTRACTOR_ENGAGEMENT_CLOSED_WITH_OPEN_PAYABLES_SIGNAL_ID,
        moduleKey: 'identity',
        kind: 'data_quality',
        source: 'getContractorEngagementClosedWithOpenPayablesSignal',
        label: 'Cierre contractor con payables abiertos',
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

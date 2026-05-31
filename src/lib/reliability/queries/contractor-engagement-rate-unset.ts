import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-968 Slice 4 — Contractor engagement agreed-amount unset signal.
 *
 * Cuenta contractor engagements NO terminales (status NOT IN ('ended','cancelled'))
 * sin `rate_amount` (monto acordado por HR aún sin definir). Sin monto acordado el
 * contractor NO puede declarar trabajo con bruto derivado (TASK-968 Slice 2) y el
 * guardrail (Slice 3) no tiene referencia → estos engagements están a medio
 * configurar. SSOT: el monto lo fija HR; este signal es el detector de "falta fijarlo".
 *
 * **Kind**: `data_quality`. Steady state esperado: 0 (todo engagement activo debería
 * tener su monto acordado fijado por HR).
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity), junto a los demás
 * signals del lifecycle de engagements contractor (classification risk, transition orphan).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (engagement sin monto acordado; el contractor no puede cobrar)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal` (TASK-790).
 * Spec: docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md
 */
export const CONTRACTOR_ENGAGEMENT_RATE_UNSET_SIGNAL_ID =
  'hr.contractor_engagement.rate_unset'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_hr.contractor_engagements
  WHERE rate_amount IS NULL
    AND status NOT IN ('ended', 'cancelled')
`

type RateUnsetQueryRow = {
  n: number
}

export const getContractorEngagementRateUnsetSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<RateUnsetQueryRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Todos los engagements contractor activos tienen monto acordado.'
        : `${count} engagement${count === 1 ? '' : 's'} contractor sin monto acordado (HR debe fijarlo para habilitar el cobro).`

    return {
      signalId: CONTRACTOR_ENGAGEMENT_RATE_UNSET_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getContractorEngagementRateUnsetSignal',
      label: 'Engagement contractor sin monto acordado',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "greenhouse_hr.contractor_engagements WHERE rate_amount IS NULL AND status NOT IN ('ended','cancelled')"
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
            'docs/tasks/in-progress/TASK-968-contractor-engagement-compensation-setup-agreed-amount-guardrail.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_contractor_engagement_rate_unset' }
    })

    return {
      signalId: CONTRACTOR_ENGAGEMENT_RATE_UNSET_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'data_quality',
      source: 'getContractorEngagementRateUnsetSignal',
      label: 'Engagement contractor sin monto acordado',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-957 Slice A — Contractor double-rail overlap signal.
 *
 * Detecta el VECTOR REAL del motor de doble-pago/doble-declaración: un member
 * activo que tiene a la vez (a) un `ContractorEngagement` NO terminal (rail
 * contractor-payable, TASK-790→796) y (b) una `compensation_version` vigente
 * (rail legacy de nómina). Si ambos rieles procesan a la misma persona el mismo
 * período → doble-pago + doble declaración F29 retenciones honorarios (Efeonce
 * remesa doble al SII).
 *
 * Más amplia que el GATE de exclusión (TASK-957 Slice A, que solo excluye en
 * estados engaged active/paused/ending): la señal cuenta CUALQUIER engagement
 * no-terminal (incluye draft/pending_review) con comp-version vigente — atrapa
 * también la fase de setup como riesgo a investigar.
 *
 * **Corre regardless del flag** `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED`
 * → detector temprano: alerta incluso antes de que el gate esté activo.
 *
 * **Kind**: `drift`. Steady state esperado: 0 (un contractor con engagement NUNCA
 * debe tener comp-version vigente — su compensación vive en el engagement).
 * **Subsystem rollup**: `Payroll Data Quality` (moduleKey=payroll), junto a las
 * señales de contract taxonomy y participation window.
 * **Severity matrix** (Q3 resuelta — integridad fiscal, sin tier soft en V1):
 *   - count = 0 → ok
 *   - count > 0 → error (riesgo de doble declaración F29)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal`
 * (TASK-790). Schema gate TASK-893: sin `EXTRACT(EPOCH FROM (date - date))` — solo
 * comparación `cv.effective_to >= CURRENT_DATE`.
 * Spec: `docs/tasks/in-progress/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md`.
 */
export const PAYROLL_CONTRACTOR_DOUBLE_RAIL_OVERLAP_SIGNAL_ID = 'payroll.contractor.double_rail_overlap'

const QUERY_SQL = `
  SELECT COUNT(DISTINCT m.member_id)::int AS n
  FROM greenhouse_core.members AS m
  JOIN greenhouse_hr.contractor_engagements AS e
    ON e.profile_id = m.identity_profile_id
  JOIN greenhouse_payroll.compensation_versions AS cv
    ON cv.member_id = m.member_id
  WHERE m.active = TRUE
    AND e.status NOT IN ('ended', 'cancelled')
    AND (cv.effective_to IS NULL OR cv.effective_to >= CURRENT_DATE)
`

type OverlapQueryRow = {
  n: number
}

export const getPayrollContractorDoubleRailOverlapSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<OverlapQueryRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'error' = count === 0 ? 'ok' : 'error'

    const summary =
      count === 0
        ? 'Sin contractors con engagement activo y compensation_version vigente (sin riesgo de doble riel).'
        : `${count} contractor${count === 1 ? '' : 's'} con engagement no-terminal Y compensation_version vigente — riesgo de doble-pago + doble declaración F29.`

    return {
      signalId: PAYROLL_CONTRACTOR_DOUBLE_RAIL_OVERLAP_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getPayrollContractorDoubleRailOverlapSignal',
      label: 'Doble riel contractor ↔ nómina legacy',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "members (active) JOIN contractor_engagements (status NOT IN ended/cancelled) JOIN compensation_versions (effective_to NULL OR >= CURRENT_DATE)"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-957-contractor-payroll-double-rail-exclusion-contract-type-reconciliation.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'payroll', {
      tags: { source: 'reliability_signal_payroll_contractor_double_rail_overlap' }
    })

    return {
      signalId: PAYROLL_CONTRACTOR_DOUBLE_RAIL_OVERLAP_SIGNAL_ID,
      moduleKey: 'payroll',
      kind: 'drift',
      source: 'getPayrollContractorDoubleRailOverlapSignal',
      label: 'Doble riel contractor ↔ nómina legacy',
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

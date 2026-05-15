import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-892 Slice 2 — Closure completeness partial signal.
 *
 * Detecta cases terminales (status IN ('executed', 'cancelled')) cuya
 * `closureCompleteness.closureState` no es `'complete'`. Hoy la imple-
 * mentacion canonical considera "no complete" cuando:
 *
 *   - Layer 3 (Person 360): el member declara contractor/Deel/honorarios
 *     pero la relacion legal activa sigue como 'employee'. Drift Person 360
 *     no reconciliado. (Caso Maria pre-cierre TASK-891.)
 *   - Layer 4 (Payroll scope): el resolver TASK-890
 *     `resolveExitEligibilityForMembers` no clasifica al member como
 *     excluido del periodo proyectado (informativo only).
 *
 * Distinto del signal Layer 3 puro `identity.relationship.member_contract_drift`
 * (TASK-890/891): aquel cuenta drift activo Person 360 a nivel sistema.
 * Este signal cuenta el **case-level closureState='partial'** — es decir,
 * el bug class UX donde el operador ve un caso "cerrado" sin alinear sus
 * 4 capas. La interseccion es relevante: muchas filas Layer 3 con case
 * terminal van a aparecer aqui tambien, y ese es el comportamiento
 * canonical (defense-in-depth, mismo problema observado en surface UX +
 * surface system).
 *
 * **Kind**: `drift`. Steady state esperado tras cleanup: 0.
 * **Subsystem rollup**: `Identity & Access` (module=identity).
 * **Severity matrix**:
 *   - count = 0 → ok
 *   - count > 0 → warning (operador ve UX cerrado vs realidad multicapa)
 *   - query falla → unknown
 *
 * Pattern fuente: mirror exacto de
 * `getIdentityRelationshipMemberContractDriftSignal` (TASK-890 V1.0).
 * Spec: docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md
 */
export const OFFBOARDING_COMPLETENESS_PARTIAL_SIGNAL_ID =
  'hr.offboarding.completeness_partial'

const NON_EMPLOYEE_CONTRACT_TYPES = ['contractor', 'eor', 'honorarios']
const NON_INTERNAL_PAYROLL_VIA = ['deel', 'none']

/**
 * Query: cases terminales con drift Person 360 detectado por el patron
 * canonical (mirror del signal upstream). Layer 4 partial state aplica
 * cuando hay `verify_payroll_exclusion` informational, pero ese caso solo
 * emerge en `closure-completeness.ts` UI-side cuando el resolver
 * TASK-890 retorna `excluded=false` — no lo medimos en SQL bruto porque
 * el resolver TASK-890 corre per-member en el read path (no es columna
 * persistida). V1.0 mide solo Layer 3 partial (drift Person 360); V1.1
 * extendera a Layer 4 cuando se materialice el exit window per case.
 */
const QUERY_SQL = `
  SELECT
    COUNT(DISTINCT c.offboarding_case_id)::int AS n
  FROM greenhouse_hr.work_relationship_offboarding_cases AS c
  JOIN greenhouse_core.members AS m
    ON m.member_id = c.member_id
  JOIN greenhouse_core.person_legal_entity_relationships AS rel
    ON rel.profile_id = m.identity_profile_id
  WHERE c.status IN ('executed', 'cancelled')
    AND m.active = TRUE
    AND m.identity_profile_id IS NOT NULL
    AND (
      m.contract_type = ANY($1::text[])
      OR m.payroll_via = ANY($2::text[])
    )
    AND rel.relationship_type = 'employee'
    AND rel.status = 'active'
    AND (rel.effective_to IS NULL OR rel.effective_to > NOW())
`

type PartialQueryRow = {
  n: number
}

export const getOffboardingCompletenessPartialSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<PartialQueryRow>(QUERY_SQL, [
      NON_EMPLOYEE_CONTRACT_TYPES,
      NON_INTERNAL_PAYROLL_VIA
    ])

    const count = Number(rows[0]?.n ?? 0)

    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Sin cases terminales con cierre parcial (4 capas alineadas).'
        : `${count} case${count === 1 ? '' : 's'} terminal${count === 1 ? '' : 'es'} con cierre parcial — operador ve "Cerrado" pero hay capas Person 360 sin reconciliar.`

    return {
      signalId: OFFBOARDING_COMPLETENESS_PARTIAL_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getOffboardingCompletenessPartialSignal',
      label: 'Cases terminales con cierre parcial',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'greenhouse_hr.work_relationship_offboarding_cases ⨝ members ⨝ person_legal_entity_relationships (terminal + active employee + non-internal contract)'
        },
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'non_employee_contract_types',
          value: NON_EMPLOYEE_CONTRACT_TYPES.join(', ')
        },
        {
          kind: 'metric',
          label: 'non_internal_payroll_via',
          value: NON_INTERNAL_PAYROLL_VIA.join(', ')
        },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-892-offboarding-closure-completeness-aggregate.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_offboarding_completeness_partial' }
    })

    return {
      signalId: OFFBOARDING_COMPLETENESS_PARTIAL_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getOffboardingCompletenessPartialSignal',
      label: 'Cases terminales con cierre parcial',
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

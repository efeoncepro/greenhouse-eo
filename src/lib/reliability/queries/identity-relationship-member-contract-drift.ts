import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-890 Slice 6 — Drift signal Person 360 (read-only V1).
 *
 * Detecta divergencia semantica entre el contrato/regimen del member
 * (runtime laboral) y la relacion legal activa registrada en
 * `greenhouse_core.person_legal_entity_relationships`.
 *
 * Caso fuente: Maria Camila Hoyos (TASK-890 disparador). Su member runtime
 * declara `contract_type='contractor' / pay_regime='international' /
 * payroll_via='deel'` pero la relacion legal activa sigue como
 * `relationship_type='employee'`. Eso genera drift que afecta a:
 *   - Person 360 ficha historica (muestra contrato erroneo)
 *   - Payroll readiness checks
 *   - Reportes legales / payslip distribution
 *
 * **V1 = read-only signal**. Operador HR resuelve via command auditado en
 * V1.1+ (TASK-891 follow-up). NUNCA auto-mutar relationships desde un
 * read path — viola la hard rule canonical CLAUDE.md "NUNCA auto-mutate
 * Person 360 from a read path".
 *
 * Pattern fuente: TASK-877 (workforce.member.complete_intake — signal then
 * command auditado). Lint rule TASK-890 + ADR §7 + §9.
 *
 * **Kind**: `drift`. Steady state esperado tras cleanup: 0.
 * **Severidad**: `warning` si count > 0 (no error — el signal es informativo
 * hasta que TASK-891 ship el write reconciliation path).
 * **Subsystem rollup**: `Identity & Access` (module=identity).
 */
export const IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID =
  'identity.relationship.member_contract_drift'

// Set de contract_type / payroll_via valores que indican "no es employee
// dependiente Chile". Drift cuando el member declara uno de estos pero la
// relacion legal activa sigue como `relationship_type='employee'`.
const NON_EMPLOYEE_CONTRACT_TYPES = ['contractor', 'eor', 'honorarios']
const NON_INTERNAL_PAYROLL_VIA = ['deel', 'none']

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.members AS m
  JOIN greenhouse_core.person_legal_entity_relationships AS rel
    ON rel.profile_id = m.identity_profile_id
  WHERE m.active = TRUE
    AND m.identity_profile_id IS NOT NULL
    AND (
      m.contract_type = ANY($1::text[])
      OR m.payroll_via = ANY($2::text[])
    )
    AND rel.relationship_type = 'employee'
    AND rel.status = 'active'
    AND (rel.effective_to IS NULL OR rel.effective_to > NOW())
`

export const getIdentityRelationshipMemberContractDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<{ n: number }>(QUERY_SQL, [
      NON_EMPLOYEE_CONTRACT_TYPES,
      NON_INTERNAL_PAYROLL_VIA
    ])

    const count = Number(rows[0]?.n ?? 0)

    return {
      signalId: IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityRelationshipMemberContractDriftSignal',
      label: 'Drift contrato member ↔ relación legal',
      severity: count === 0 ? 'ok' : 'warning',
      summary:
        count === 0
          ? 'Sin drift entre contrato de member y relación legal activa.'
          : `${count} colaborador${count === 1 ? '' : 'es'} con contrato contractor/EOR/Deel pero relación legal activa sigue como "employee". Requiere reconciliación auditada (TASK-891).`,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            'greenhouse_core.members ⨝ greenhouse_core.person_legal_entity_relationships (active employee + non-internal contract)'
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
          value: 'docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md §7'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_member_contract_drift' }
    })

    return {
      signalId: IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityRelationshipMemberContractDriftSignal',
      label: 'Drift contrato member ↔ relación legal',
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

import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-890 Slice 6 + TASK-891 Slice 5 — Drift signal Person 360 con
 * auto-escalation severity post 30d.
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
 * **TASK-890 V1.0** ship signal en severity `warning` constante porque NO
 * habia write path — drift sostenido era informativo solamente.
 *
 * **TASK-891 V1.0** ship el write path canonico (`reconcileMemberContractDrift`).
 * Una vez que el operador tiene comando auditado disponible, drift sostenido
 * (>30d sin reconciliar) ES accionable y debe escalar a `error`. La logica
 * de auto-escalation queda lista en V1.0 y se activa data-driven sin
 * intervencion ni redeploy.
 *
 * Severity matrix canonical:
 *   - count = 0                              → `ok` (steady state)
 *   - count > 0 AND oldestDriftAgeDays < 30  → `warning` (reciente, V1.0 OK)
 *   - count > 0 AND oldestDriftAgeDays >= 30 → `error` (sostenido, TASK-891 disponible)
 *   - query falla                            → `unknown`
 *
 * Donde `oldestDriftAgeDays` = días desde el `GREATEST(m.updated_at,
 * rel.updated_at)` más antiguo de las filas en drift. Indica el drift que
 * lleva más tiempo sin tocar (ni operador ni sync update lo cambió).
 *
 * Pattern fuente: TASK-877 (workforce.member.complete_intake — signal then
 * command auditado). Pattern severity escalation: TASK-849 watchdog stale
 * approvals (warning >24h / error >7d).
 *
 * **Kind**: `drift`. Steady state esperado tras cleanup: 0.
 * **Subsystem rollup**: `Identity & Access` (module=identity).
 */
export const IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID =
  'identity.relationship.member_contract_drift'

// Set de contract_type / payroll_via valores que indican "no es employee
// dependiente Chile". Drift cuando el member declara uno de estos pero la
// relacion legal activa sigue como `relationship_type='employee'`.
const NON_EMPLOYEE_CONTRACT_TYPES = ['contractor', 'eor', 'honorarios']
const NON_INTERNAL_PAYROLL_VIA = ['deel', 'none']

// TASK-891 Slice 5 — threshold de auto-escalation severity.
// >= 30 días sin reconciliar drift → severity `error`. Mismo bar canonical
// que TASK-848/849 production release stale_approval thresholds.
const SUSTAINED_DRIFT_THRESHOLD_DAYS = 30

const QUERY_SQL = `
  SELECT
    COUNT(*)::int AS n,
    COALESCE(
      EXTRACT(DAY FROM (NOW() - MIN(GREATEST(m.updated_at, rel.updated_at))))::int,
      0
    ) AS oldest_drift_age_days
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

type DriftQueryRow = {
  n: number
  oldest_drift_age_days: number
}

export const getIdentityRelationshipMemberContractDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<DriftQueryRow>(QUERY_SQL, [
      NON_EMPLOYEE_CONTRACT_TYPES,
      NON_INTERNAL_PAYROLL_VIA
    ])

    const count = Number(rows[0]?.n ?? 0)
    const oldestDriftAgeDays = Number(rows[0]?.oldest_drift_age_days ?? 0)

    // Severity matrix canonical (TASK-891 Slice 5):
    //   count = 0 → ok
    //   count > 0 AND oldestDriftAgeDays < threshold → warning (drift reciente)
    //   count > 0 AND oldestDriftAgeDays >= threshold → error (drift sostenido)
    const severity: 'ok' | 'warning' | 'error' =
      count === 0
        ? 'ok'
        : oldestDriftAgeDays >= SUSTAINED_DRIFT_THRESHOLD_DAYS
          ? 'error'
          : 'warning'

    const summary =
      count === 0
        ? 'Sin drift entre contrato de member y relación legal activa.'
        : severity === 'error'
          ? `${count} colaborador${count === 1 ? '' : 'es'} con drift contractor/EOR/Deel ↔ relación legal "employee" sostenido > ${SUSTAINED_DRIFT_THRESHOLD_DAYS} días. Resuelve via comando auditado TASK-891 desde Admin > Operations.`
          : `${count} colaborador${count === 1 ? '' : 'es'} con contrato contractor/EOR/Deel pero relación legal activa sigue como "employee". Resuelve via comando auditado TASK-891.`

    return {
      signalId: IDENTITY_RELATIONSHIP_MEMBER_CONTRACT_DRIFT_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getIdentityRelationshipMemberContractDriftSignal',
      label: 'Drift contrato member ↔ relación legal',
      severity,
      summary,
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
          label: 'oldest_drift_age_days',
          value: String(oldestDriftAgeDays)
        },
        {
          kind: 'metric',
          label: 'sustained_threshold_days',
          value: String(SUSTAINED_DRIFT_THRESHOLD_DAYS)
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
            'docs/architecture/GREENHOUSE_PERSON_LEGAL_RELATIONSHIP_RECONCILIATION_V1.md §7 (auto-escalation severity)'
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

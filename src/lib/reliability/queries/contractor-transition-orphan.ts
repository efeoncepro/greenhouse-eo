import 'server-only'

import { query } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-956 — Contractor transition orphan signal.
 *
 * Cuenta relaciones `contractor` activas creadas por una transición
 * (`source_of_truth IN ('workforce_relationship_transition','operator_reconciliation')`)
 * que NO tienen un `ContractorEngagement` no-cancelado asociado. Es el estado
 * parcial que el comando atómico `transitionEmployeeToContractorEngagement`
 * (TASK-956) previene — pero que reconcile-drift (TASK-891, que no crea engagement)
 * u otra apertura de relación contractor podría dejar. Defense-in-depth observable:
 * una relación contractor sin engagement no enciende la superficie self-service
 * (TASK-796) ni puede generar payables → la persona queda en limbo.
 *
 * **Kind**: `drift`. Steady state: 0 (toda relación contractor por transición debe
 * tener su engagement; el comando canónico lo garantiza atómicamente).
 * **Subsystem rollup**: `Identity & Access` (moduleKey=identity).
 * **Severity**: count=0 → ok · count>0 → warning · query falla → unknown.
 *
 * Pattern fuente: mirror de `getContractorEngagementClassificationRiskOpenSignal` (TASK-790).
 */
export const CONTRACTOR_TRANSITION_ORPHAN_SIGNAL_ID = 'hr.contractor.transition_orphan'

const QUERY_SQL = `
  SELECT COUNT(*)::int AS n
  FROM greenhouse_core.person_legal_entity_relationships r
  WHERE r.relationship_type = 'contractor'
    AND r.status = 'active'
    AND r.effective_to IS NULL
    AND r.source_of_truth IN ('workforce_relationship_transition', 'operator_reconciliation')
    AND NOT EXISTS (
      SELECT 1 FROM greenhouse_hr.contractor_engagements e
      WHERE e.person_legal_entity_relationship_id = r.relationship_id
        AND e.status <> 'cancelled'
    )
`

type OrphanQueryRow = {
  n: number
}

export const getContractorTransitionOrphanSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<OrphanQueryRow>(QUERY_SQL)
    const count = Number(rows[0]?.n ?? 0)
    const severity: 'ok' | 'warning' = count === 0 ? 'ok' : 'warning'

    const summary =
      count === 0
        ? 'Sin relaciones contractor por transición huérfanas de engagement.'
        : `${count} relación${count === 1 ? '' : 'es'} contractor por transición sin engagement asociado (transición incompleta).`

    return {
      signalId: CONTRACTOR_TRANSITION_ORPHAN_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getContractorTransitionOrphanSignal',
      label: 'Transición contractor huérfana de engagement',
      severity,
      summary,
      observedAt,
      evidence: [
        {
          kind: 'sql',
          label: 'Query',
          value:
            "person_legal_entity_relationships (contractor, active, transition-sourced) NOT EXISTS active contractor_engagements"
        },
        { kind: 'metric', label: 'count', value: String(count) },
        {
          kind: 'doc',
          label: 'Spec',
          value:
            'docs/tasks/in-progress/TASK-956-employee-to-contractor-transition-connected-command.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'identity', {
      tags: { source: 'reliability_signal_contractor_transition_orphan' }
    })

    return {
      signalId: CONTRACTOR_TRANSITION_ORPHAN_SIGNAL_ID,
      moduleKey: 'identity',
      kind: 'drift',
      source: 'getContractorTransitionOrphanSignal',
      label: 'Transición contractor huérfana de engagement',
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

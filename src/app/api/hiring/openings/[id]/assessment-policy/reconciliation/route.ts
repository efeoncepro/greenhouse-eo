import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import {
  resolveActivePolicyForOpening,
  resolveApplicationsAwaitingAssignment,
  resolveApplicationsMissedTriggerAwaitingHuman,
  resolveAssignmentDeadEndsForPolicy,
} from '@/lib/hiring/assessment/assignment-policy'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1719 Slice 4 — `GET /api/hiring/openings/[id]/assessment-policy/reconciliation`.
 *
 * Las dos colas de recuperación de la vacante, derivadas del ESTADO VIGENTE en PostgreSQL:
 *
 * - `awaitingAssignment`: postulaciones que HOY siguen en la etapa trigger y no tienen
 *   resultado terminal en el ledger. Es lo que la automatización perdió (coalescing, worker
 *   caído, dead-letter) y todavía puede recuperarse sola o con un confirm manual.
 * - `missedTriggerAwaitingHuman`: postulaciones que cruzaron la etapa trigger y YA avanzaron.
 *   La reconciliación automática no las toca a propósito — su etapa vigente ya no es la del
 *   trigger — así que la decisión es de una persona.
 * - `deadEnds` (TASK-1771): filas VIGENTES del ledger con resultado recuperable y origen no
 *   manual, que ocupan la clave de idempotencia de esta policy sin haber asignado nada. Las otras
 *   dos colas no pueden mostrarlas —`awaitingAssignment` las excluye justamente porque la fila
 *   existe— así que hasta ahora una clave quemada no aparecía en ninguna superficie.
 *
 * Este endpoint sólo LEE. La recuperación se ejecuta por el camino gobernado de siempre:
 * propose → confirm sobre la postulación. No hay "reintentar todo".
 *
 * Existe porque sin él la señal `hiring.assessment.assignment_health` avisaría de un backlog
 * que nadie puede ver ni drenar: un lector sin superficie es un motor sin llave.
 */
export const dynamic = 'force-dynamic'

const READ_CAPABILITY = 'hiring.assessment.read'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, READ_CAPABILITY, 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: READ_CAPABILITY } })
  }

  try {
    const { id } = await params
    const policy = await resolveActivePolicyForOpening(id)

    if (!policy) {
      return NextResponse.json({
        policy: null,
        awaitingAssignment: [],
        missedTriggerAwaitingHuman: [],
        deadEnds: { deadEnds: [], totalMatching: 0, truncated: false, excludedSynthetic: 0 },
      })
    }

    const [awaitingAssignment, missedTriggerAwaitingHuman, deadEnds] = await Promise.all([
      resolveApplicationsAwaitingAssignment(policy.policyId),
      resolveApplicationsMissedTriggerAwaitingHuman(policy.policyId),
      resolveAssignmentDeadEndsForPolicy(policy.policyId),
    ])

    return NextResponse.json({
      policy: { policyId: policy.policyId, policyVersion: policy.policyVersion, state: policy.state, mode: policy.mode, triggerStage: policy.triggerStage },
      awaitingAssignment,
      missedTriggerAwaitingHuman,
      deadEnds,
    })
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_policy_reconciliation')
  }
}

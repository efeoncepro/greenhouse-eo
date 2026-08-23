import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { toHiringErrorResponse } from '@/lib/hiring'
import { supersedeAssignmentDeadEnd } from '@/lib/hiring/assessment/assignment-policy'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

/**
 * TASK-1771 Slice 3 — `POST /api/hiring/openings/[id]/assessment-policy/reconciliation/supersede`.
 *
 * Libera la clave de idempotencia de UNA fila en callejón del carril automático, para que la
 * postulación vuelva a la cola de asignación.
 *
 * **Es hermano del GET, no una versión suya con verbo distinto.** El GET sólo LEE y su comentario
 * lo declara; convertirlo en ejecutor le habría cambiado la naturaleza. Acá cambian las tres cosas
 * que tienen que cambiar: el método, la capability y el efecto.
 *
 * **Capability de GOBERNANZA, no de autoría.** `hiring.assessment.policy.govern` es el mismo tier
 * con el que se habilita la asignación automática de una vacante — quien puede prender el carril
 * es quien puede desatascarlo. **NUNCA** `hiring.assessment.author`: esa la porta todo tenant
 * interno por routeGroup, así que usarla dejaría que collaborator/designer/people_viewer
 * reabrieran claves de una cohorte de candidatos.
 *
 * Este endpoint **no manda ningún correo**. Devuelve la fila a `awaitingAssignment`; el intento
 * nuevo sale del camino gobernado de siempre (propose → confirm), que es donde vive la decisión de
 * qué se le comunica al candidato.
 */
export const dynamic = 'force-dynamic'

const GOVERN_CAPABILITY = 'hiring.assessment.policy.govern'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, GOVERN_CAPABILITY, 'execute', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: GOVERN_CAPABILITY } })
  }

  try {
    const { id } = await params
    const body = (await request.json().catch(() => ({}))) as { assignmentId?: unknown }

    const result = await supersedeAssignmentDeadEnd({
      assignmentId: typeof body.assignmentId === 'string' ? body.assignmentId : '',
      openingId: id,
      actorUserId: tenant.userId,
    })

    return NextResponse.json(result)
  } catch (error) {
    return toHiringErrorResponse(error, 'assessment_policy_supersede_dead_end')
  }
}

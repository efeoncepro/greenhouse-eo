import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  getHiringApplicationById,
  hiringInvalidBodyResponse,
  hiringNotFoundResponse,
  toHiringErrorResponse,
  updateHiringApplicationStage,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import { HIRING_PIPELINE_STAGES, type HiringPipelineStage } from '@/types/hiring'

/**
 * TASK-353 — `GET/PATCH /api/hiring/applications/[id]` (detail + stage transition).
 * El PATCH mueve el `stage` de la postulación (unidad del pipeline). La DECISIÓN formal
 * (selected/rejected + snapshot de handoff) usa la capability `hiring.application.decide`
 * y su endpoint dedicado llega con el desk interno (TASK-355).
 *
 * TASK-1765 — este PATCH ya NO puede cerrar. `closed` no está en `HIRING_PIPELINE_STAGES`, y cerrar
 * pasa siempre por `POST /api/hiring/applications/[id]/decide`, que declara el desenlace, emite
 * `hiring.application.decided`, dispara el correo y arranca el reloj de retención.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { id } = await params
    const application = await getHiringApplicationById(id)

    if (!application) return hiringNotFoundResponse('La postulación no existe.', 'hiring_application_not_found')
    
return NextResponse.json(application)
  } catch (error) {
    return toHiringErrorResponse(error, 'application_detail')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.write', 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.write' } })
  }

  let body: { stage?: string }

  try {
    body = (await request.json()) as { stage?: string }
  } catch {
    return hiringInvalidBodyResponse()
  }

  if (!body.stage) {
    return NextResponse.json(
      { error: 'Falta el campo stage.', code: 'hiring_invalid_input', actionable: false },
      { status: 400 },
    )
  }

  // TASK-1765 — el cierre se nombra por su nombre y apunta al camino correcto. `actionable: false`
  // porque reintentar el mismo PATCH no lo resuelve: la acción real es decidir el desenlace.
  if (body.stage === 'closed') {
    return NextResponse.json(
      {
        error: 'Cerrar una postulación exige declarar el desenlace: hazlo con la decisión formal, no con un cambio de etapa.',
        code: 'hiring_application_close_requires_outcome',
        actionable: false,
      },
      { status: 422 },
    )
  }

  if (!HIRING_PIPELINE_STAGES.includes(body.stage as HiringPipelineStage)) {
    return NextResponse.json(
      {
        error: 'Esa etapa no se puede escribir con un cambio de etapa.',
        code: 'hiring_invalid_enum',
        actionable: false,
      },
      { status: 400 },
    )
  }

  try {
    const { id } = await params
    const application = await updateHiringApplicationStage(id, body.stage as HiringPipelineStage, tenant.userId)

    
return NextResponse.json(application)
  } catch (error) {
    return toHiringErrorResponse(error, 'application_stage')
  }
}

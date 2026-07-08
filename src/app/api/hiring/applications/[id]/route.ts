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
import type { HiringApplicationStage } from '@/types/hiring'

/**
 * TASK-353 — `GET/PATCH /api/hiring/applications/[id]` (detail + stage transition).
 * El PATCH mueve el `stage` de la postulación (unidad del pipeline). La DECISIÓN formal
 * (selected/rejected + snapshot de handoff) usa la capability `hiring.application.decide`
 * y su endpoint dedicado llega con el desk interno (TASK-355).
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

  let body: { stage?: HiringApplicationStage }

  try {
    body = (await request.json()) as { stage?: HiringApplicationStage }
  } catch {
    return hiringInvalidBodyResponse()
  }

  if (!body.stage) {
    return NextResponse.json(
      { error: 'Falta el campo stage.', code: 'hiring_invalid_input', actionable: false },
      { status: 400 },
    )
  }

  try {
    const { id } = await params
    const application = await updateHiringApplicationStage(id, body.stage, tenant.userId)

    
return NextResponse.json(application)
  } catch (error) {
    return toHiringErrorResponse(error, 'application_stage')
  }
}

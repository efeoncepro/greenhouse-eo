import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  getHiringOpeningById,
  hiringInvalidBodyResponse,
  hiringNotFoundResponse,
  toHiringErrorResponse,
  updateHiringOpening,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { UpdateHiringOpeningInput } from '@/types/hiring'

/**
 * TASK-353 — `GET/PATCH /api/hiring/openings/[id]` (HiringOpening detail + update).
 * El PATCH permite editar la truth interna y el payload público; la publicación en sí
 * (poner el opening visible) se gobierna en POST /openings/[id]/publish (capability publish).
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.read' } })
  }

  try {
    const { id } = await params
    const opening = await getHiringOpeningById(id)

    if (!opening) return hiringNotFoundResponse('El opening no existe.', 'hiring_opening_not_found')
    
return NextResponse.json(opening)
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_detail')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.write', 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.write' } })
  }

  let body: UpdateHiringOpeningInput

  try {
    body = (await request.json()) as UpdateHiringOpeningInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params
    const opening = await updateHiringOpening(id, body, tenant.userId)

    
return NextResponse.json(opening)
  } catch (error) {
    return toHiringErrorResponse(error, 'opening_update')
  }
}

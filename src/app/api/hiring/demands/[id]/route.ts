import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  getTalentDemandById,
  hiringInvalidBodyResponse,
  hiringNotFoundResponse,
  toHiringErrorResponse,
  updateTalentDemand,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type { UpdateTalentDemandInput } from '@/types/hiring'

/**
 * TASK-353 — `GET/PATCH /api/hiring/demands/[id]` (TalentDemand detail + update).
 * Dual-gate interno + capability granular. Errores es-CL sanitizados.
 */
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.demand.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.demand.read' } })
  }

  try {
    const { id } = await params
    const demand = await getTalentDemandById(id)

    if (!demand) return hiringNotFoundResponse('La demanda de talento no existe.', 'talent_demand_not_found')
    
return NextResponse.json(demand)
  } catch (error) {
    return toHiringErrorResponse(error, 'demand_detail')
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.demand.write', 'update', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.demand.write' } })
  }

  let body: UpdateTalentDemandInput

  try {
    body = (await request.json()) as UpdateTalentDemandInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const { id } = await params
    const demand = await updateTalentDemand(id, body, tenant.userId)

    
return NextResponse.json(demand)
  } catch (error) {
    return toHiringErrorResponse(error, 'demand_update')
  }
}

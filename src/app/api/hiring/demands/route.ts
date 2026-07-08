import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { createTalentDemand, hiringInvalidBodyResponse, listTalentDemands, toHiringErrorResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type {
  CreateTalentDemandInput,
  ListTalentDemandFilters,
  TalentDemandStakeholderType,
  TalentDemandStatus,
} from '@/types/hiring'

/**
 * TASK-353 — `GET/POST /api/hiring/demands` (Hiring / ATS domain foundation).
 *
 * Contrato interno base para TalentDemand. Dual-gate (defense in depth):
 * `requireInternalTenantContext` (clientes excluidos) + `can()` capability granular.
 * Los writes delegan en el store de dominio (idempotencia + outbox); la identidad del
 * actor sale SIEMPRE de la sesión, nunca del body. Errores sanitizados es-CL.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.demand.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.demand.read' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters: ListTalentDemandFilters = {}
    const status = searchParams.get('status')

    if (status) filters.status = status as TalentDemandStatus
    const stakeholderType = searchParams.get('stakeholderType')

    if (stakeholderType) filters.stakeholderType = stakeholderType as TalentDemandStakeholderType
    const organizationId = searchParams.get('organizationId')

    if (organizationId) filters.organizationId = organizationId
    const spaceId = searchParams.get('spaceId')

    if (spaceId) filters.spaceId = spaceId
    const limitRaw = Number(searchParams.get('limit'))

    if (Number.isFinite(limitRaw) && limitRaw > 0) filters.limit = limitRaw
    const offsetRaw = Number(searchParams.get('offset'))

    if (Number.isFinite(offsetRaw) && offsetRaw >= 0) filters.offset = offsetRaw

    const items = await listTalentDemands(filters)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'demands_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.demand.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.demand.write' } })
  }

  let body: CreateTalentDemandInput

  try {
    body = (await request.json()) as CreateTalentDemandInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const demand = await createTalentDemand(body, tenant.userId)

    
return NextResponse.json(demand, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'demands_create')
  }
}

import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { createHiringOpening, hiringInvalidBodyResponse, listHiringOpenings, toHiringErrorResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type {
  CreateHiringOpeningInput,
  HiringOpeningPublicationStatus,
  HiringOpeningStatus,
  HiringOpeningVisibility,
  ListHiringOpeningFilters,
} from '@/types/hiring'

/**
 * TASK-353 — `GET/POST /api/hiring/openings` (HiringOpening list + create).
 * Dual-gate interno + capability granular. El opening nace con truth interna; la
 * proyección pública se gobierna aparte (POST /openings/[id]/publish).
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.read' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters: ListHiringOpeningFilters = {}
    const demandId = searchParams.get('demandId')

    if (demandId) filters.demandId = demandId
    const status = searchParams.get('status')

    if (status) filters.status = status as HiringOpeningStatus
    const publicationStatus = searchParams.get('publicationStatus')

    if (publicationStatus) filters.publicationStatus = publicationStatus as HiringOpeningPublicationStatus
    const visibility = searchParams.get('visibility')

    if (visibility) filters.visibility = visibility as HiringOpeningVisibility
    const limitRaw = Number(searchParams.get('limit'))

    if (Number.isFinite(limitRaw) && limitRaw > 0) filters.limit = limitRaw
    const offsetRaw = Number(searchParams.get('offset'))

    if (Number.isFinite(offsetRaw) && offsetRaw >= 0) filters.offset = offsetRaw

    const items = await listHiringOpenings(filters)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'openings_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.opening.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.opening.write' } })
  }

  let body: CreateHiringOpeningInput

  try {
    body = (await request.json()) as CreateHiringOpeningInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const opening = await createHiringOpening(body, tenant.userId)

    
return NextResponse.json(opening, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'openings_create')
  }
}

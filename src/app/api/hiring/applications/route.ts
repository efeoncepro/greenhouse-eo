import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import {
  createHiringApplication,
  hiringInvalidBodyResponse,
  listHiringApplications,
  toHiringErrorResponse,
} from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'
import type {
  CandidateSource,
  CreateHiringApplicationInput,
  HiringApplicationStage,
  ListHiringApplicationFilters,
} from '@/types/hiring'

/**
 * TASK-353 — `GET/POST /api/hiring/applications` (HiringApplication, unidad del pipeline).
 * El POST crea la postulación contra un opening + candidate facet ya existentes (dedupe
 * estructural opening+persona → 409). Dual-gate interno + capability granular.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.read' } })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filters: ListHiringApplicationFilters = {}
    const openingId = searchParams.get('openingId')

    if (openingId) filters.openingId = openingId
    const identityProfileId = searchParams.get('identityProfileId')

    if (identityProfileId) filters.identityProfileId = identityProfileId
    const stage = searchParams.get('stage')

    if (stage) filters.stage = stage as HiringApplicationStage
    const source = searchParams.get('source')

    if (source) filters.source = source as CandidateSource
    const limitRaw = Number(searchParams.get('limit'))

    if (Number.isFinite(limitRaw) && limitRaw > 0) filters.limit = limitRaw
    const offsetRaw = Number(searchParams.get('offset'))

    if (Number.isFinite(offsetRaw) && offsetRaw >= 0) filters.offset = offsetRaw

    const items = await listHiringApplications(filters)

    
return NextResponse.json({ items, total: items.length })
  } catch (error) {
    return toHiringErrorResponse(error, 'applications_list')
  }
}

export async function POST(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.application.write', 'create', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.application.write' } })
  }

  let body: CreateHiringApplicationInput

  try {
    body = (await request.json()) as CreateHiringApplicationInput
  } catch {
    return hiringInvalidBodyResponse()
  }

  try {
    const application = await createHiringApplication(body, tenant.userId)

    
return NextResponse.json(application, { status: 201 })
  } catch (error) {
    return toHiringErrorResponse(error, 'applications_create')
  }
}

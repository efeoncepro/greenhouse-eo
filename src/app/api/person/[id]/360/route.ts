import 'server-only'

import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getPersonComplete360, RESOLVER_VERSION } from '@/lib/person-360/person-complete-360'
import { PERSON_FACET_NAMES, type PersonFacetName } from '@/types/person-complete-360'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Resolve "me" to the requester's identity
  const identifier = id === 'me' ? (tenant.identityProfileId ?? tenant.memberId ?? tenant.userId) : id

  if (!identifier) {
    return NextResponse.json(
      { error: 'Identity not linked. Your account is not associated with an identity profile.' },
      { status: 422 }
    )
  }

  // Parse query params
  const { searchParams } = new URL(request.url)

  const facetsParam = searchParams.get('facets')

  const requestedFacets: PersonFacetName[] = facetsParam
    ? facetsParam.split(',').filter((f): f is PersonFacetName => PERSON_FACET_NAMES.includes(f as PersonFacetName))
    : ['identity']

  const asOf = searchParams.get('asOf') || null
  const cacheBypass = searchParams.get('cache') === 'bypass'
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : null
  const offset = searchParams.get('offset') ? Number(searchParams.get('offset')) : null

  try {
    const result = await getPersonComplete360(identifier, {
      facets: requestedFacets,
      asOf,
      cacheBypass,
      limit,
      offset,
      requesterProfileId: tenant.identityProfileId ?? null,
      requesterRoleCodes: tenant.roleCodes,
      requesterTenantType: tenant.tenantType,
      requesterOrganizationId: tenant.organizationId ?? null
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json(result)

    // Response headers for observability
    response.headers.set('X-Resolver-Version', RESOLVER_VERSION)
    response.headers.set('X-Timing-Ms', String(result._meta.totalMs))
    response.headers.set('X-Cache-Status', summarizeCacheStatus(result._meta.cacheStatus))

    return response
  } catch (error) {
    console.error(`GET /api/person/${id}/360 failed:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

const summarizeCacheStatus = (
  status: Partial<Record<PersonFacetName, string>>
): string => {
  const values = Object.values(status)
  const hits = values.filter(v => v === 'hit' || v === 'stale').length
  const misses = values.filter(v => v === 'miss').length

  return `hits=${hits},misses=${misses}`
}

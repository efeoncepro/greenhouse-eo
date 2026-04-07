import 'server-only'

import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getPersonsComplete360, RESOLVER_VERSION } from '@/lib/person-360/person-complete-360'
import { PERSON_FACET_NAMES, type PersonFacetName } from '@/types/person-complete-360'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const { profileIds, facets: facetsParam } = body as {
      profileIds?: string[]
      facets?: string[]
    }

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return NextResponse.json(
        { error: 'profileIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (profileIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 profileIds per request' },
        { status: 400 }
      )
    }

    const requestedFacets: PersonFacetName[] = Array.isArray(facetsParam)
      ? facetsParam.filter((f): f is PersonFacetName => PERSON_FACET_NAMES.includes(f as PersonFacetName))
      : ['identity']

    const results = await getPersonsComplete360(profileIds, {
      facets: requestedFacets,
      requesterProfileId: tenant.identityProfileId ?? null,
      requesterRoleCodes: tenant.roleCodes,
      requesterTenantType: tenant.tenantType,
      requesterOrganizationId: tenant.organizationId ?? null
    })

    const response = NextResponse.json({
      items: results,
      total: results.filter(r => r !== null).length,
      requested: profileIds.length
    })

    response.headers.set('X-Resolver-Version', RESOLVER_VERSION)

    return response
  } catch (error) {
    console.error('POST /api/persons/360 failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getAccountsComplete360, ACCOUNT_RESOLVER_VERSION } from '@/lib/account-360/account-complete-360'
import { ACCOUNT_FACET_NAMES } from '@/types/account-complete-360'
import type { AccountFacetName } from '@/types/account-complete-360'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const organizationIds = body.organizationIds

  if (!Array.isArray(organizationIds) || organizationIds.length === 0) {
    return NextResponse.json({ error: 'organizationIds must be a non-empty array' }, { status: 400 })
  }

  if (organizationIds.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 organizations per request' }, { status: 400 })
  }

  const facets = Array.isArray(body.facets)
    ? (body.facets.filter((f: unknown) => typeof f === 'string' && (ACCOUNT_FACET_NAMES as readonly string[]).includes(f as string)) as AccountFacetName[])
    : ['identity' as AccountFacetName]

  const results = await getAccountsComplete360(organizationIds, {
    facets,
    asOf: body.asOf ?? null,
    cacheBypass: body.cache === 'bypass',
    limit: body.limit ?? null,
    offset: body.offset ?? null,
    requesterRoleCodes: tenant.roleCodes,
    requesterTenantType: tenant.tenantType,
    requesterOrganizationId: ('organizationId' in tenant ? (tenant as unknown as { organizationId: string | null }).organizationId : null)
  })

  const response = NextResponse.json({
    items: results,
    total: results.filter(Boolean).length,
    requested: organizationIds.length
  })

  response.headers.set('X-Resolver-Version', ACCOUNT_RESOLVER_VERSION)

  return response
}

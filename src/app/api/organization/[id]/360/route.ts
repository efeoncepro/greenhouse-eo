import { NextResponse } from 'next/server'

import { requireTenantContext } from '@/lib/tenant/authorization'
import { getAccountComplete360, ACCOUNT_RESOLVER_VERSION } from '@/lib/account-360/account-complete-360'
import { ACCOUNT_FACET_NAMES } from '@/types/account-complete-360'
import type { AccountFacetName } from '@/types/account-complete-360'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) {
    return unauthorizedResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const url = new URL(_.url)

  // Parse facets
  const facetsParam = url.searchParams.get('facets')

  const requestedFacets = facetsParam
    ? (facetsParam.split(',').map(f => f.trim()).filter(f => (ACCOUNT_FACET_NAMES as readonly string[]).includes(f)) as AccountFacetName[])
    : ['identity' as AccountFacetName]

  // Parse options
  const asOf = url.searchParams.get('asOf') || null
  const cacheBypass = url.searchParams.get('cache') === 'bypass'
  const limit = url.searchParams.get('limit') ? Math.min(100, Math.max(1, Number(url.searchParams.get('limit')))) : null
  const offset = url.searchParams.get('offset') ? Math.max(0, Number(url.searchParams.get('offset'))) : null

  const result = await getAccountComplete360(id, {
    facets: requestedFacets,
    asOf,
    cacheBypass,
    limit,
    offset,
    requesterRoleCodes: tenant.roleCodes,
    requesterTenantType: tenant.tenantType,
    requesterOrganizationId: ('organizationId' in tenant ? (tenant as unknown as { organizationId: string | null }).organizationId : null)
  })

  if (!result) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
  }

  const response = NextResponse.json(result)

  response.headers.set('X-Resolver-Version', ACCOUNT_RESOLVER_VERSION)
  response.headers.set('X-Timing-Ms', String(result._meta.totalMs))

  const hits = Object.values(result._meta.cacheStatus).filter(s => s === 'hit' || s === 'stale').length
  const misses = Object.values(result._meta.cacheStatus).filter(s => s === 'miss').length

  response.headers.set('X-Cache-Status', `hits=${hits},misses=${misses}`)

  return response
}

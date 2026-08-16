import { NextResponse } from 'next/server'

import { canonicalErrorResponse } from '@/lib/api/canonical-error-response'
import { can } from '@/lib/entitlements/runtime'
import { searchTalentPool, talentPoolFlags, toHiringErrorResponse } from '@/lib/hiring'
import { requireInternalTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireInternalTenantContext()

  if (!tenant) return errorResponse ?? canonicalErrorResponse('unauthorized')

  if (!can(tenant, 'hiring.talent_pool.read', 'read', 'tenant')) {
    return canonicalErrorResponse('forbidden', { extra: { requiredCapability: 'hiring.talent_pool.read' } })
  }

  if (!talentPoolFlags().search) {
    return NextResponse.json(
      { error: 'El banco de talento todavía no está habilitado.', code: 'talent_pool_disabled', actionable: false },
      { status: 503 }
    )
  }

  try {
    const query = new URL(request.url).searchParams
    const limit = Number(query.get('limit'))

    const items = await searchTalentPool({
      query: query.get('query') ?? undefined,
      capabilityKeys: query.getAll('capability'),
      seniority: query.get('seniority') ?? undefined,
      languageCode: query.get('language') ?? undefined,
      countryCode: query.get('country') ?? undefined,
      availability: query.get('availability') ?? undefined,
      cursor: query.get('cursor') ?? undefined,
      cursorBinding: tenant.userId,
      limit: Number.isFinite(limit) ? limit : undefined
    })

    return NextResponse.json(items)
  } catch (error) {
    return toHiringErrorResponse(error, 'talent_pool_search')
  }
}

import { NextResponse } from 'next/server'

import { hasEntitlement } from '@/lib/entitlements/runtime'
import { resolveFinanceQuoteTenantOrganizationIds } from '@/lib/finance/quotation-canonical-store'
import {
  buildTenantEntitlementSubject,
  LIFECYCLE_STAGES,
  searchParties,
  type LifecycleStage
} from '@/lib/commercial/party'
import {
  enforcePartyEndpointRateLimit,
  isPartyEndpointRateLimitError,
  recordPartyEndpointRequest
} from '@/lib/commercial/party/party-endpoint-rate-limit'
import { requireFinanceTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

const DEFAULT_INCLUDE_STAGES: LifecycleStage[] = [
  'active_client',
  'opportunity',
  'prospect',
  'inactive'
]

const parseIncludeStages = (rawValue: string | null): LifecycleStage[] | null => {
  if (!rawValue) {
    return DEFAULT_INCLUDE_STAGES
  }

  const values = rawValue
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

  if (values.length === 0) {
    return DEFAULT_INCLUDE_STAGES
  }

  const stageSet = new Set(LIFECYCLE_STAGES)

  if (values.some(value => !stageSet.has(value as LifecycleStage))) {
    return null
  }

  return values as LifecycleStage[]
}

export async function GET(request: Request) {
  const { tenant, errorResponse } = await requireFinanceTenantContext()

  if (!tenant) {
    return errorResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') ?? '').trim()

  if (query.length < 2) {
    return NextResponse.json({ parties: [], hasMore: false })
  }

  const includeStages = parseIncludeStages(searchParams.get('includeStages'))

  if (!includeStages) {
    return NextResponse.json(
      { error: 'includeStages contains unsupported lifecycle stages.' },
      { status: 400 }
    )
  }

  const tenantScope = `${tenant.tenantType}:${tenant.clientId || 'system'}`

  try {
    await enforcePartyEndpointRateLimit({
      endpointKey: 'search',
      userId: tenant.userId
    })
  } catch (error) {
    if (isPartyEndpointRateLimitError(error)) {
      await recordPartyEndpointRequest({
        endpointKey: 'search',
        userId: tenant.userId,
        tenantScope,
        responseStatus: 429,
        queryText: query,
        metadata: { reason: 'rate_limited' }
      })

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds
        },
        {
          status: error.statusCode,
          headers: { 'Retry-After': String(error.retryAfterSeconds) }
        }
      )
    }

    throw error
  }

  const [visibleOrganizationIds, canAdopt] = await Promise.all([
    resolveFinanceQuoteTenantOrganizationIds(tenant),
    Promise.resolve(
      hasEntitlement(
        buildTenantEntitlementSubject(tenant),
        'commercial.party.create',
        'create'
      )
    )
  ])

  const result = await searchParties(query, {
    visibleOrganizationIds,
    includeStages,
    allowHubspotCandidates: tenant.tenantType === 'efeonce_internal'
  })

  const parties = result.parties.map(item =>
    item.kind === 'hubspot_candidate'
      ? { ...item, canAdopt: item.canAdopt && canAdopt }
      : item
  )

  await recordPartyEndpointRequest({
    endpointKey: 'search',
    userId: tenant.userId,
    tenantScope,
    responseStatus: 200,
    queryText: query,
    metadata: {
      includeStages,
      resultCount: parties.length,
      allowHubspotCandidates: tenant.tenantType === 'efeonce_internal'
    }
  })

  return NextResponse.json({
    parties,
    hasMore: result.hasMore
  })
}

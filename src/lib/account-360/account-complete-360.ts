import 'server-only'

import { randomUUID } from 'crypto'

import { resolveOrganizationIdentifier } from '@/lib/account-360/resolve-organization-id'
import { resolveAccountScope } from '@/lib/account-360/resolve-scope'
import { authorizeAccountFacets, applyAccountFieldRedactions } from '@/lib/account-360/facet-authorization'
import { getCachedAccountFacet, setCachedAccountFacet } from '@/lib/account-360/facet-cache'
import { fetchIdentityFacet } from '@/lib/account-360/facets/identity'
import { fetchSpacesFacet } from '@/lib/account-360/facets/spaces'
import { fetchTeamFacet } from '@/lib/account-360/facets/team'
import { fetchEconomicsFacet } from '@/lib/account-360/facets/economics'
import { fetchDeliveryFacet } from '@/lib/account-360/facets/delivery'
import { fetchFinanceFacet } from '@/lib/account-360/facets/finance'
import { fetchCrmFacet } from '@/lib/account-360/facets/crm'
import { fetchServicesFacet } from '@/lib/account-360/facets/services'
import { fetchStaffAugFacet } from '@/lib/account-360/facets/staff-aug'
import type {
  AccountComplete360,
  AccountComplete360Options,
  AccountFacetName,
  AccountFacetDefinition,
  AccountFacetContext,
  AccountResolverMeta
} from '@/types/account-complete-360'

// ── Constants ──

export const ACCOUNT_RESOLVER_VERSION = '1.0.0'

// ── Facet Registry ──

const FACET_REGISTRY: Record<AccountFacetName, AccountFacetDefinition> = {
  identity: {
    fetch: fetchIdentityFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'public'
  },
  spaces: {
    fetch: fetchSpacesFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'internal'
  },
  team: {
    fetch: fetchTeamFacet,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'internal'
  },
  economics: {
    fetch: fetchEconomicsFacet,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'confidential'
  },
  delivery: {
    fetch: fetchDeliveryFacet,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'internal'
  },
  finance: {
    fetch: fetchFinanceFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'confidential'
  },
  crm: {
    fetch: fetchCrmFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'internal'
  },
  services: {
    fetch: fetchServicesFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'internal'
  },
  staffAug: {
    fetch: fetchStaffAugFacet,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'confidential'
  }
}

// ── Resolver Trace (for observability) ──

interface ResolverTrace {
  traceId: string
  organizationId: string
  requestedFacets: AccountFacetName[]
  resolvedFacets: AccountFacetName[]
  deniedFacets: AccountFacetName[]
  timingMs: Partial<Record<AccountFacetName, number>>
  totalMs: number
  cacheHits: number
  cacheMisses: number
  errors: { facet: AccountFacetName; error: string }[]
  requesterInfo: string
  timestamp: string
}

// ── Main Resolver ──

export const getAccountComplete360 = async (
  identifier: string,
  options: AccountComplete360Options = {}
): Promise<AccountComplete360 | null> => {
  const startTime = Date.now()
  const traceId = randomUUID()

  const {
    facets: requestedFacets = ['identity'],
    asOf = null,
    cacheBypass = false,
    limit = null,
    offset = null,
    requesterRoleCodes = [],
    requesterTenantType = 'efeonce_internal',
    requesterOrganizationId = null
  } = options

  // 1. Resolve organization identity
  const resolved = await resolveOrganizationIdentifier(identifier)

  if (!resolved) return null

  // 2. Resolve scope (org → spaces → clients)
  const scope = await resolveAccountScope(resolved.organizationId)

  if (!scope) return null

  // 3. Authorization — determine what's allowed
  const authResult = authorizeAccountFacets({
    requesterRoleCodes,
    requesterTenantType,
    requesterOrganizationId,
    targetOrganizationId: scope.organizationId,
    requestedFacets
  })

  // 4. Build fetch context
  const fetchCtx: AccountFacetContext = { asOf, limit, offset }

  // 5. Warnings for empty scope
  const warnings: string[] = []

  if (scope.spaceIds.length === 0) {
    warnings.push('Organization has no active spaces — delivery, finance, services, and staffAug facets may be empty')
  }

  if (scope.clientIds.length === 0) {
    warnings.push('Organization has no spaces with client_id bridge — economics and finance facets may be empty')
  }

  // 6. Execute allowed facets in parallel
  const timing: Partial<Record<AccountFacetName, number>> = {}
  const cacheStatusMap: Partial<Record<AccountFacetName, 'hit' | 'miss' | 'stale' | 'bypass'>> = {}
  const errors: { facet: AccountFacetName; error: string }[] = []
  const resolvedFacets: AccountFacetName[] = []
  const facetResults: Partial<Record<AccountFacetName, unknown>> = {}

  const facetPromises = authResult.allowedFacets.map(async (facetName) => {
    const definition = FACET_REGISTRY[facetName]
    const facetStart = Date.now()

    try {
      // Check cache (unless bypassed)
      if (!cacheBypass) {
        const cached = getCachedAccountFacet(scope.organizationId, facetName)

        if (cached) {
          facetResults[facetName] = cached.data
          cacheStatusMap[facetName] = cached.status
          timing[facetName] = Date.now() - facetStart
          resolvedFacets.push(facetName)

          return
        }
      }

      cacheStatusMap[facetName] = cacheBypass ? 'bypass' : 'miss'

      // Execute the facet fetch
      const data = await definition.fetch(scope, fetchCtx)

      if (data !== null && data !== undefined) {
        facetResults[facetName] = data
        resolvedFacets.push(facetName)

        // Store in cache
        setCachedAccountFacet(scope.organizationId, facetName, data, definition.cacheTTLSeconds)
      }
    } catch (err) {
      errors.push({
        facet: facetName,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      timing[facetName] = Date.now() - facetStart
    }
  })

  await Promise.all(facetPromises)

  // 7. Apply field redactions
  for (const [facet, fields] of Object.entries(authResult.fieldRedactions)) {
    const data = facetResults[facet as AccountFacetName]

    if (data && typeof data === 'object') {
      applyAccountFieldRedactions(data as Record<string, unknown>, fields)
    }
  }

  // 8. Ensure identity is always resolved
  const identity = facetResults.identity as AccountComplete360['identity'] | undefined

  if (!identity) return null

  // 9. Build _meta
  const totalMs = Date.now() - startTime

  const meta: AccountResolverMeta = {
    resolvedAt: new Date().toISOString(),
    resolverVersion: ACCOUNT_RESOLVER_VERSION,
    facetsRequested: requestedFacets,
    facetsResolved: resolvedFacets,
    timing,
    cacheStatus: cacheStatusMap,
    errors,
    deniedFacets: authResult.deniedFacets,
    redactedFields: authResult.fieldRedactions,
    warnings,
    totalMs
  }

  // 10. Build result
  const result: AccountComplete360 = { _meta: meta, identity }

  if (facetResults.spaces !== undefined) result.spaces = facetResults.spaces as AccountComplete360['spaces']
  if (facetResults.team !== undefined) result.team = facetResults.team as AccountComplete360['team']
  if (facetResults.economics !== undefined) result.economics = facetResults.economics as AccountComplete360['economics']
  if (facetResults.delivery !== undefined) result.delivery = facetResults.delivery as AccountComplete360['delivery']
  if (facetResults.finance !== undefined) result.finance = facetResults.finance as AccountComplete360['finance']
  if (facetResults.crm !== undefined) result.crm = facetResults.crm as AccountComplete360['crm']
  if (facetResults.services !== undefined) result.services = facetResults.services as AccountComplete360['services']
  if (facetResults.staffAug !== undefined) result.staffAug = facetResults.staffAug as AccountComplete360['staffAug']

  // 11. Log trace
  const trace: ResolverTrace = {
    traceId,
    organizationId: scope.organizationId,
    requestedFacets,
    resolvedFacets,
    deniedFacets: authResult.deniedFacets.map(d => d.facet),
    timingMs: timing,
    totalMs,
    cacheHits: Object.values(cacheStatusMap).filter(s => s === 'hit' || s === 'stale').length,
    cacheMisses: Object.values(cacheStatusMap).filter(s => s === 'miss').length,
    errors,
    requesterInfo: requesterOrganizationId ?? 'anonymous',
    timestamp: new Date().toISOString()
  }

  // Warn on slow facets (> 2s)
  for (const [facet, ms] of Object.entries(timing)) {
    if (ms && ms > 2000) {
      console.warn(`[account-360-resolver] slow facet: ${facet} took ${ms}ms`, { traceId })
    }
  }

  console.info('[account-360-resolver]', JSON.stringify(trace))

  return result
}

// ── Bulk Resolver ──

export const getAccountsComplete360 = async (
  organizationIds: string[],
  options: AccountComplete360Options = {}
): Promise<(AccountComplete360 | null)[]> => {
  // Cap at 50 organizations per batch
  const ids = organizationIds.slice(0, 50)

  return Promise.all(
    ids.map(id => getAccountComplete360(id, options))
  )
}

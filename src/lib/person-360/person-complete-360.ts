import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolvePersonIdentifier, isEoIdFormat } from '@/lib/person-360/resolve-eo-id'
import { authorizeFacets, applyFieldRedactions, determineRelation } from '@/lib/person-360/facet-authorization'
import { getCachedFacet, setCachedFacet } from '@/lib/person-360/facet-cache'
import { fetchIdentityFacet } from '@/lib/person-360/facets/identity'
import { fetchAssignmentsFacet } from '@/lib/person-360/facets/assignments'
import { fetchOrganizationFacet } from '@/lib/person-360/facets/organization'
import { fetchLeaveFacet } from '@/lib/person-360/facets/leave'
import { fetchPayrollFacet } from '@/lib/person-360/facets/payroll'
import { fetchDeliveryFacet } from '@/lib/person-360/facets/delivery'
import { fetchCostsFacet } from '@/lib/person-360/facets/costs'
import { fetchStaffAugFacet } from '@/lib/person-360/facets/staff-aug'
import type {
  PersonComplete360,
  PersonFacetName,
  FacetDefinition,
  FacetFetchContext,
  ResolverMeta,
  ResolverTrace
} from '@/types/person-complete-360'

// ── Constants ──

export const RESOLVER_VERSION = '1.0.0'

// ── Facet Registry ──

const FACET_REGISTRY: Record<PersonFacetName, FacetDefinition> = {
  identity: {
    fetch: fetchIdentityFacet,
    requiresMemberId: false,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'public'
  },
  assignments: {
    fetch: fetchAssignmentsFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'internal'
  },
  organization: {
    fetch: fetchOrganizationFacet,
    requiresMemberId: false,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'public'
  },
  leave: {
    fetch: fetchLeaveFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 120,
    sensitivityLevel: 'personal'
  },
  payroll: {
    fetch: fetchPayrollFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 3600,
    sensitivityLevel: 'confidential'
  },
  delivery: {
    fetch: fetchDeliveryFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 300,
    sensitivityLevel: 'internal'
  },
  costs: {
    fetch: fetchCostsFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'confidential'
  },
  staffAug: {
    fetch: fetchStaffAugFacet,
    requiresMemberId: true,
    cacheTTLSeconds: 600,
    sensitivityLevel: 'confidential'
  }
}

// ── Identity Resolution ──

interface ResolvedTarget {
  profileId: string
  memberId: string | null
  userId: string | null
  organizationId: string | null
}

const resolveTarget = async (identifier: string): Promise<ResolvedTarget | null> => {
  // Try the canonical resolve-eo-id chain first
  if (identifier.startsWith('identity-') || isEoIdFormat(identifier)) {
    const resolved = await resolvePersonIdentifier(identifier)

    if (!resolved) return null

    // Lookup organization from membership
    const orgId = await lookupPrimaryOrganization(resolved.identityProfileId)

    return {
      profileId: resolved.identityProfileId,
      memberId: resolved.memberId,
      userId: resolved.userId,
      organizationId: orgId
    }
  }

  // Direct member_id lookup
  if (!identifier.startsWith('user-')) {
    const resolved = await resolvePersonIdentifier(identifier)

    if (resolved) {
      const orgId = await lookupPrimaryOrganization(resolved.identityProfileId)

      
return {
        profileId: resolved.identityProfileId,
        memberId: resolved.memberId,
        userId: resolved.userId,
        organizationId: orgId
      }
    }
  }

  // user_id lookup
  const resolved = await resolvePersonIdentifier(identifier)

  if (!resolved) return null

  const orgId = await lookupPrimaryOrganization(resolved.identityProfileId)

  return {
    profileId: resolved.identityProfileId,
    memberId: resolved.memberId,
    userId: resolved.userId,
    organizationId: orgId
  }
}

const lookupPrimaryOrganization = async (profileId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT organization_id
     FROM greenhouse_core.person_memberships
     WHERE profile_id = $1 AND active = TRUE AND is_primary = TRUE
     LIMIT 1`,
    [profileId]
  ).catch(() => [])

  return rows[0]?.organization_id ?? null
}

// ── Request Options ──

export interface PersonComplete360Options {
  facets?: PersonFacetName[]
  asOf?: string | null
  cacheBypass?: boolean
  limit?: number | null
  offset?: number | null
  requesterProfileId?: string | null
  requesterRoleCodes?: string[]
  requesterTenantType?: string
  requesterOrganizationId?: string | null
}

// ── Main Resolver ──

export const getPersonComplete360 = async (
  identifier: string,
  options: PersonComplete360Options = {}
): Promise<PersonComplete360 | null> => {
  const startTime = Date.now()
  const traceId = randomUUID()

  const {
    facets: requestedFacets = ['identity'],
    asOf = null,
    cacheBypass = false,
    limit = null,
    offset = null,
    requesterProfileId = null,
    requesterRoleCodes = [],
    requesterTenantType = 'efeonce_internal',
    requesterOrganizationId = null
  } = options

  // 1. Resolve target identity
  const target = await resolveTarget(identifier)

  if (!target) return null

  // 2. Authorization — determine what's allowed
  const relation = determineRelation(
    requesterProfileId,
    target.profileId,
    requesterOrganizationId,
    target.organizationId
  )

  const authResult = authorizeFacets({
    requesterProfileId,
    requesterRoleCodes,
    requesterTenantType,
    requesterOrganizationId,
    targetProfileId: target.profileId,
    targetOrganizationId: target.organizationId,
    requestedFacets,
    relation
  })

  // 3. Build fetch context
  const fetchCtx: FacetFetchContext = {
    profileId: target.profileId,
    memberId: target.memberId,
    userId: target.userId,
    organizationId: target.organizationId,
    asOf,
    limit,
    offset
  }

  // 4. Execute allowed facets in parallel
  const timing: Partial<Record<PersonFacetName, number>> = {}
  const cacheStatus: Partial<Record<PersonFacetName, 'hit' | 'miss' | 'stale' | 'bypass'>> = {}
  const errors: { facet: PersonFacetName; error: string }[] = []
  const resolvedFacets: PersonFacetName[] = []

  const facetResults: Partial<Record<PersonFacetName, unknown>> = {}

  const facetPromises = authResult.allowedFacets.map(async (facetName) => {
    const definition = FACET_REGISTRY[facetName]
    const facetStart = Date.now()

    try {
      // Skip if requires memberId and we don't have one
      if (definition.requiresMemberId && !target.memberId) {
        cacheStatus[facetName] = 'miss'
        
return
      }

      // Check cache (unless bypassed)
      if (!cacheBypass) {
        const cached = getCachedFacet(target.profileId, facetName)

        if (cached) {
          facetResults[facetName] = cached.data
          cacheStatus[facetName] = cached.status
          timing[facetName] = Date.now() - facetStart
          resolvedFacets.push(facetName)
          
return
        }
      }

      cacheStatus[facetName] = cacheBypass ? 'bypass' : 'miss'

      // Execute the facet fetch
      const data = await definition.fetch(fetchCtx)

      if (data !== null && data !== undefined) {
        facetResults[facetName] = data
        resolvedFacets.push(facetName)

        // Store in cache
        setCachedFacet(target.profileId, facetName, data, definition.cacheTTLSeconds)
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

  // 5. Apply field redactions
  for (const [facet, fields] of Object.entries(authResult.fieldRedactions)) {
    const data = facetResults[facet as PersonFacetName]

    if (data && typeof data === 'object') {
      applyFieldRedactions(data as Record<string, unknown>, fields)
    }
  }

  // 6. Ensure identity is always resolved (it's mandatory)
  const identity = facetResults.identity as PersonComplete360['identity'] | undefined

  if (!identity) {
    // Identity facet is required — if it's not resolved, the person doesn't exist
    return null
  }

  // 7. Build _meta
  const totalMs = Date.now() - startTime

  const meta: ResolverMeta = {
    resolvedAt: new Date().toISOString(),
    resolverVersion: RESOLVER_VERSION,
    facetsRequested: requestedFacets,
    facetsResolved: resolvedFacets,
    timing,
    cacheStatus,
    errors,
    deniedFacets: authResult.deniedFacets,
    redactedFields: authResult.fieldRedactions,
    totalMs
  }

  // 8. Build result
  const result: PersonComplete360 = {
    _meta: meta,
    identity
  }

  if (facetResults.assignments !== undefined) result.assignments = facetResults.assignments as PersonComplete360['assignments']
  if (facetResults.organization !== undefined) result.organization = facetResults.organization as PersonComplete360['organization']
  if (facetResults.leave !== undefined) result.leave = facetResults.leave as PersonComplete360['leave']
  if (facetResults.payroll !== undefined) result.payroll = facetResults.payroll as PersonComplete360['payroll']
  if (facetResults.delivery !== undefined) result.delivery = facetResults.delivery as PersonComplete360['delivery']
  if (facetResults.costs !== undefined) result.costs = facetResults.costs as PersonComplete360['costs']
  if (facetResults.staffAug !== undefined) result.staffAug = facetResults.staffAug as PersonComplete360['staffAug']

  // 9. Log trace
  const trace: ResolverTrace = {
    traceId,
    profileId: target.profileId,
    requestedFacets,
    resolvedFacets,
    deniedFacets: authResult.deniedFacets.map(d => d.facet),
    timingMs: timing,
    totalMs,
    cacheHits: Object.values(cacheStatus).filter(s => s === 'hit' || s === 'stale').length,
    cacheMisses: Object.values(cacheStatus).filter(s => s === 'miss').length,
    errors,
    requesterUserId: requesterProfileId ?? 'anonymous',
    timestamp: new Date().toISOString()
  }

  console.info('[person-360-resolver]', JSON.stringify(trace))

  return result
}

// ── Bulk Resolver ──

export const getPersonsComplete360 = async (
  profileIds: string[],
  options: PersonComplete360Options = {}
): Promise<(PersonComplete360 | null)[]> => {
  // Cap at 100 persons per batch
  const ids = profileIds.slice(0, 100)

  // Execute in parallel — each call handles its own auth + caching
  return Promise.all(
    ids.map(id => getPersonComplete360(id, options))
  )
}

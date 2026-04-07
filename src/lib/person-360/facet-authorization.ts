import 'server-only'

import type {
  PersonFacetName,
  FacetAuthorizationContext,
  FacetAuthorizationResult
} from '@/types/person-complete-360'

// ── Role predicates ──

const isAdmin = (roleCodes: string[]): boolean =>
  roleCodes.includes('efeonce_admin')

const isHrManager = (roleCodes: string[]): boolean =>
  roleCodes.includes('hr_manager') || roleCodes.includes('efeonce_admin')

const isFinanceRole = (roleCodes: string[]): boolean =>
  roleCodes.includes('finance_manager') || roleCodes.includes('efeonce_admin')

const isClientTenant = (tenantType: string): boolean =>
  tenantType === 'client'

// ── Authorization Engine ──

/**
 * Determines which facets are allowed, denied, and which fields to redact.
 *
 * Rules (from TASK-273 spec):
 * | Relation             | Allowed facets                          | Redacted fields               |
 * |----------------------|-----------------------------------------|-------------------------------|
 * | self                 | ALL                                     | none                          |
 * | same_org + collaborator | identity, assignments, org, delivery  | payroll.baseSalary, costs.*   |
 * | same_org + hr_manager   | ALL except costs                     | payroll: full access          |
 * | same_org + efeonce_admin| ALL                                  | none                          |
 * | different_org + admin   | ALL                                  | none                          |
 * | different_org + other   | identity only                        | phone, email partial          |
 * | client tenant           | identity, assignments, delivery      | all others denied             |
 */
export const authorizeFacets = (ctx: FacetAuthorizationContext): FacetAuthorizationResult => {
  const { relation, requesterRoleCodes, requesterTenantType, requestedFacets } = ctx

  const allowedFacets: PersonFacetName[] = []
  const deniedFacets: { facet: PersonFacetName; reason: string }[] = []
  const fieldRedactions: Partial<Record<PersonFacetName, string[]>> = {}

  // Self can see everything
  if (relation === 'self') {
    return { allowedFacets: [...requestedFacets], deniedFacets: [], fieldRedactions: {} }
  }

  // Admin can see everything regardless of relation
  if (isAdmin(requesterRoleCodes)) {
    return { allowedFacets: [...requestedFacets], deniedFacets: [], fieldRedactions: {} }
  }

  // Client tenant: only identity + assignments + delivery
  if (isClientTenant(requesterTenantType)) {
    const clientAllowed: PersonFacetName[] = ['identity', 'assignments', 'delivery']

    for (const facet of requestedFacets) {
      if (clientAllowed.includes(facet)) {
        allowedFacets.push(facet)
      } else {
        deniedFacets.push({ facet, reason: 'Client tenants can only access identity, assignments, and delivery facets' })
      }
    }

    return { allowedFacets, deniedFacets, fieldRedactions }
  }

  // Internal users — check relation
  if (relation === 'same_org') {
    // HR manager: all except costs
    if (isHrManager(requesterRoleCodes)) {
      for (const facet of requestedFacets) {
        if (facet === 'costs') {
          if (isFinanceRole(requesterRoleCodes)) {
            allowedFacets.push(facet)
          } else {
            deniedFacets.push({ facet, reason: 'HR managers cannot access cost data' })
          }
        } else {
          allowedFacets.push(facet)
        }
      }

      return { allowedFacets, deniedFacets, fieldRedactions }
    }

    // Regular collaborator in same org
    const collaboratorAllowed: PersonFacetName[] = ['identity', 'assignments', 'organization', 'delivery']

    for (const facet of requestedFacets) {
      if (collaboratorAllowed.includes(facet)) {
        allowedFacets.push(facet)
      } else {
        deniedFacets.push({ facet, reason: 'Collaborators can only access identity, assignments, organization, and delivery facets for same-org colleagues' })
      }
    }

    return { allowedFacets, deniedFacets, fieldRedactions }
  }

  // different_org, non-admin
  for (const facet of requestedFacets) {
    if (facet === 'identity') {
      allowedFacets.push(facet)
      fieldRedactions.identity = ['resolvedPhone']
    } else {
      deniedFacets.push({ facet, reason: 'Cross-organization access limited to identity facet' })
    }
  }

  return { allowedFacets, deniedFacets, fieldRedactions }
}

/**
 * Apply field-level redactions to a resolved facet.
 * Replaces redacted fields with null.
 */
export const applyFieldRedactions = (
  facetData: Record<string, unknown>,
  redactedFields: string[]
): void => {
  for (const field of redactedFields) {
    if (field in facetData) {
      facetData[field] = null
    }
  }
}

/**
 * Determine the relationship between requester and target.
 */
export const determineRelation = (
  requesterProfileId: string | null,
  targetProfileId: string,
  requesterOrgId: string | null,
  targetOrgId: string | null
): 'self' | 'same_org' | 'different_org' => {
  if (requesterProfileId && requesterProfileId === targetProfileId) return 'self'
  if (requesterOrgId && targetOrgId && requesterOrgId === targetOrgId) return 'same_org'
  
return 'different_org'
}

import 'server-only'

import type {
  AccountFacetName,
  AccountFacetAuthContext,
  AccountFacetAuthResult
} from '@/types/account-complete-360'

// ── Constants ──

const ALL_FACETS: readonly AccountFacetName[] = [
  'identity',
  'spaces',
  'team',
  'economics',
  'delivery',
  'finance',
  'crm',
  'services',
  'staffAug'
] as const

// ── Role predicates ──

const isAdmin = (roleCodes: string[]): boolean =>
  roleCodes.includes('efeonce_admin')

const isOperations = (roleCodes: string[]): boolean =>
  roleCodes.includes('efeonce_operations')

const isFinanceManager = (roleCodes: string[]): boolean =>
  roleCodes.includes('finance_manager')

const isClientExecutive = (roleCodes: string[]): boolean =>
  roleCodes.includes('client_executive')

const isClientTenant = (tenantType: string): boolean =>
  tenantType === 'client'

const isInternalTenant = (tenantType: string): boolean =>
  tenantType === 'efeonce_internal'

const isSameOrg = (requesterOrgId: string | null, targetOrgId: string): boolean =>
  requesterOrgId !== null && requesterOrgId === targetOrgId

// ── Authorization Engine ──

/**
 * Determines which account facets are allowed, denied, and which fields to redact.
 *
 * Rules (from TASK-274 spec):
 * | Relation                                             | Allowed facets                                     | Redactions              |
 * |------------------------------------------------------|----------------------------------------------------|-------------------------|
 * | efeonce_admin                                        | ALL                                                | none                    |
 * | efeonce_operations                                   | ALL except finance                                 | economics.revenuePerFte |
 * | efeonce_internal + finance_manager                   | ALL except staffAug                                | none                    |
 * | client + client_executive + same org                 | identity, spaces, team, delivery, services         | economics, finance denied|
 * | client + different org                               | identity only                                      |                         |
 * | Default internal (no special role)                   | identity, spaces, team, delivery, crm, services    | economics, finance, staffAug denied |
 */
export const authorizeAccountFacets = (ctx: AccountFacetAuthContext): AccountFacetAuthResult => {
  const {
    requesterRoleCodes,
    requesterTenantType,
    requesterOrganizationId,
    targetOrganizationId,
    requestedFacets
  } = ctx

  // 1. Admin — full access, no redactions
  if (isAdmin(requesterRoleCodes)) {
    return {
      allowedFacets: [...requestedFacets],
      deniedFacets: [],
      fieldRedactions: {}
    }
  }

  // 2. Operations — all except finance, redact economics.revenuePerFte
  if (isOperations(requesterRoleCodes)) {
    return buildResult(
      requestedFacets,
      ALL_FACETS.filter(f => f !== 'finance'),
      'Operations role cannot access finance facet',
      { economics: ['revenuePerFte'] }
    )
  }

  // 3. Internal finance_manager — all except staffAug
  if (isInternalTenant(requesterTenantType) && isFinanceManager(requesterRoleCodes)) {
    return buildResult(
      requestedFacets,
      ALL_FACETS.filter(f => f !== 'staffAug'),
      'Finance managers cannot access staffAug facet',
      {}
    )
  }

  // 4. Client tenant + client_executive + same org
  if (isClientTenant(requesterTenantType) && isClientExecutive(requesterRoleCodes)) {
    if (isSameOrg(requesterOrganizationId, targetOrganizationId)) {
      const clientExecAllowed: AccountFacetName[] = [
        'identity',
        'spaces',
        'team',
        'delivery',
        'services'
      ]

      return buildResult(
        requestedFacets,
        clientExecAllowed,
        'Client executives can only access identity, spaces, team, delivery, and services facets',
        {}
      )
    }
  }

  // 5. Client tenant + different org — identity only
  if (isClientTenant(requesterTenantType) && !isSameOrg(requesterOrganizationId, targetOrganizationId)) {
    return buildResult(
      requestedFacets,
      ['identity'],
      'Cross-organization client access limited to identity facet',
      {}
    )
  }

  // 6. Default internal user (no special role) — identity, spaces, team, delivery, crm, services
  const defaultAllowed: AccountFacetName[] = [
    'identity',
    'spaces',
    'team',
    'delivery',
    'crm',
    'services'
  ]

  return buildResult(
    requestedFacets,
    defaultAllowed,
    'Default internal users cannot access economics, finance, or staffAug facets',
    {}
  )
}

// ── Field Redaction ──

/**
 * Apply field-level redactions to resolved facet data.
 * Replaces redacted fields with null in-place.
 */
export const applyAccountFieldRedactions = (
  facetData: Record<string, unknown>,
  redactedFields: string[]
): void => {
  for (const field of redactedFields) {
    if (field in facetData) {
      facetData[field] = null
    }
  }
}

// ── Helpers ──

/**
 * Build an auth result by filtering requested facets against allowed set.
 */
function buildResult(
  requestedFacets: AccountFacetName[],
  allowedSet: readonly AccountFacetName[],
  denyReason: string,
  redactions: Partial<Record<AccountFacetName, string[]>>
): AccountFacetAuthResult {
  const allowedFacets: AccountFacetName[] = []
  const deniedFacets: { facet: AccountFacetName; reason: string }[] = []

  for (const facet of requestedFacets) {
    if (allowedSet.includes(facet)) {
      allowedFacets.push(facet)
    } else {
      deniedFacets.push({ facet, reason: denyReason })
    }
  }

  // Only include redactions for facets that are actually allowed
  const fieldRedactions: Partial<Record<AccountFacetName, string[]>> = {}

  for (const [facet, fields] of Object.entries(redactions)) {
    if (allowedFacets.includes(facet as AccountFacetName)) {
      fieldRedactions[facet as AccountFacetName] = fields
    }
  }

  return { allowedFacets, deniedFacets, fieldRedactions }
}

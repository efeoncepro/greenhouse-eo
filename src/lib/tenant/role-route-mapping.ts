import { ROLE_CODES } from '@/config/role-codes'

export type RouteGroup = 'internal' | 'admin' | 'client' | 'finance' | 'hr' | 'employee' | 'people' | 'my' | 'ai_tooling'

/**
 * Canonical role → route group mapping. Single source of truth.
 *
 * Both `access.ts` (login-time derivation) and `view-access-store.ts`
 * (governance resolution) MUST import from here — never duplicate.
 */
export const ROLE_ROUTE_GROUPS: Record<string, RouteGroup[]> = {
  [ROLE_CODES.EFEONCE_ADMIN]: ['internal', 'admin', 'client', 'finance', 'hr', 'employee', 'people', 'my', 'ai_tooling'],
  [ROLE_CODES.EFEONCE_OPERATIONS]: ['internal'],
  [ROLE_CODES.EFEONCE_ACCOUNT]: ['internal'],
  [ROLE_CODES.HR_PAYROLL]: ['internal', 'hr'],
  [ROLE_CODES.HR_MANAGER]: ['hr'],
  [ROLE_CODES.FINANCE_MANAGER]: ['internal', 'finance'],
  [ROLE_CODES.FINANCE_ADMIN]: ['finance'],
  [ROLE_CODES.FINANCE_ANALYST]: ['finance'],
  [ROLE_CODES.EMPLOYEE]: ['internal', 'employee'],
  [ROLE_CODES.PEOPLE_VIEWER]: ['people'],
  [ROLE_CODES.AI_TOOLING_ADMIN]: ['ai_tooling'],
  [ROLE_CODES.COLLABORATOR]: ['my'],
  [ROLE_CODES.CLIENT_EXECUTIVE]: ['client'],
  [ROLE_CODES.CLIENT_MANAGER]: ['client'],
  [ROLE_CODES.CLIENT_SPECIALIST]: ['client']
}

/** Derive route groups from a set of role codes (login-time). */
export const deriveRouteGroupsFromRoles = (roleCodes: string[], tenantType: 'client' | 'efeonce_internal'): string[] => {
  const groups = new Set<string>()

  for (const code of roleCodes) {
    for (const group of ROLE_ROUTE_GROUPS[code] ?? []) {
      groups.add(group)
    }
  }

  if (groups.size === 0) {
    groups.add(tenantType === 'efeonce_internal' ? 'internal' : 'client')
  }

  return [...groups]
}

/** Derive route groups for a single role (governance resolution). */
export const deriveRouteGroupsForSingleRole = (roleCode: string, tenantType: 'client' | 'efeonce_internal'): string[] => {
  const groups = ROLE_ROUTE_GROUPS[roleCode]

  if (groups && groups.length > 0) return [...groups]

  return [tenantType === 'efeonce_internal' ? 'internal' : 'client']
}

import { ROLE_CODES } from '@/config/role-codes'
import type { PersonAccessContext, PersonIdentityContext } from '@/types/people'
import type { Person360 } from '@/types/person-360'

const deriveRouteGroupsFromRoleCodes = (roleCodes: string[], tenantType: string) => {
  const routeGroups = new Set<string>()

  for (const roleCode of roleCodes) {
    if (roleCode.startsWith('efeonce_')) {
      routeGroups.add('internal')
    }

    if (roleCode === ROLE_CODES.HR_PAYROLL) {
      routeGroups.add('internal')
      routeGroups.add('hr')
      routeGroups.add('people')
    }

    if (roleCode === ROLE_CODES.EFEONCE_OPERATIONS) {
      routeGroups.add('people')
    }

    if (roleCode === ROLE_CODES.FINANCE_ANALYST || roleCode === ROLE_CODES.FINANCE_ADMIN) {
      routeGroups.add('internal')
      routeGroups.add('finance')
    }

    if (roleCode === ROLE_CODES.EFEONCE_ADMIN) {
      routeGroups.add('admin')
    }

    if (roleCode === ROLE_CODES.COLLABORATOR) {
      routeGroups.add('my')
    }

    if (roleCode === ROLE_CODES.HR_MANAGER) {
      routeGroups.add('hr')
    }

    if (roleCode === ROLE_CODES.PEOPLE_VIEWER) {
      routeGroups.add('people')
    }

    if (roleCode === ROLE_CODES.AI_TOOLING_ADMIN) {
      routeGroups.add('ai_tooling')
    }

    if (roleCode.startsWith('client_')) {
      routeGroups.add('client')
    }
  }

  if (routeGroups.size === 0) {
    routeGroups.add(tenantType === 'efeonce_internal' ? 'internal' : 'client')
  }

  return Array.from(routeGroups).sort((left, right) => left.localeCompare(right))
}

export const buildPersonIdentityContext = (profile: Person360, linkedUserId: string | null): PersonIdentityContext => ({
  eoId: profile.eoId,
  identityProfileId: profile.identityProfileId,
  linkedUserId: linkedUserId ?? profile.userFacet?.userId ?? null,
  canonicalEmail: profile.canonicalEmail,
  primarySourceSystem: profile.primarySourceSystem,
  defaultAuthMode: profile.defaultAuthMode,
  linkedSystems: [...profile.linkedSystems].sort((left, right) => left.localeCompare(right)),
  sourceLinkCount: profile.sourceLinkCount,
  userCount: profile.userCount,
  hasMemberFacet: profile.hasMemberFacet,
  hasUserFacet: profile.hasUserFacet,
  hasCrmFacet: profile.hasCrmFacet,
  crmContactId: profile.crmFacet?.contactRecordId ?? null
})

export const buildPersonAccessContext = (profile: Person360): PersonAccessContext | null => {
  const userFacet = profile.userFacet

  if (!userFacet) {
    return null
  }

  const roleCodes = [...profile.activeRoleCodes].sort((left, right) => left.localeCompare(right))

  return {
    userId: userFacet.userId,
    userPublicId: userFacet.userPublicId,
    email: userFacet.email,
    tenantType: userFacet.tenantType,
    authMode: userFacet.authMode,
    status: userFacet.status,
    active: userFacet.active,
    lastLoginAt: userFacet.lastLoginAt,
    defaultPortalHomePath: userFacet.defaultPortalHomePath,
    roleCodes,
    routeGroups: deriveRouteGroupsFromRoleCodes(roleCodes, userFacet.tenantType),
    canOpenAdminUser: Boolean(userFacet.userId)
  }
}

import 'server-only'

import { getServerAuthSession } from '@/lib/auth'
import { getCachedBusinessLineSummaries } from '@/lib/business-line/metadata'
import type { BusinessLineMetadataSummary } from '@/types/business-line'
import type { SupervisorAccessSummary } from '@/lib/reporting-hierarchy/types'

export interface TenantContext {
  userId: string
  clientId: string
  clientName: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  primaryRoleCode: string
  routeGroups: string[]
  authorizedViews: string[]
  projectScopes: string[]
  campaignScopes: string[]
  businessLines: string[]
  serviceModules: string[]
  role: string
  projectIds: string[]
  featureFlags: string[]
  timezone: string
  portalHomePath: string
  authMode: string

  // Business line enrichment (cached server-side, not stored in JWT)
  businessLineMetadata?: BusinessLineMetadataSummary[]

  // Account 360 — nullable until M1 migration populates data
  spaceId?: string
  organizationId?: string
  organizationName?: string

  // Collaborator identity
  memberId?: string
  identityProfileId?: string

  // Supervisor scope (TASK-727): JWT-safe summary of supervisor authority for menu/UI gating.
  supervisorAccess?: SupervisorAccessSummary | null
}

export const getTenantContext = async (): Promise<TenantContext | null> => {
  const session = await getServerAuthSession()

  if (!session?.user) {
    return null
  }

  // Enrich with cached BL metadata (global, not per-tenant)
  const allSummaries = await getCachedBusinessLineSummaries()
  const userBLSet = new Set(session.user.businessLines)
  const businessLineMetadata = allSummaries.filter(s => userBLSet.has(s.moduleCode))

  return {
    userId: session.user.userId,
    clientId: session.user.clientId,
    clientName: session.user.clientName,
    tenantType: session.user.tenantType,
    roleCodes: session.user.roleCodes,
    primaryRoleCode: session.user.primaryRoleCode,
    routeGroups: session.user.routeGroups,
    authorizedViews: session.user.authorizedViews,
    projectScopes: session.user.projectScopes,
    campaignScopes: session.user.campaignScopes,
    businessLines: session.user.businessLines,
    serviceModules: session.user.serviceModules,
    role: session.user.role,
    projectIds: session.user.projectIds,
    featureFlags: session.user.featureFlags,
    timezone: session.user.timezone,
    portalHomePath: session.user.portalHomePath,
    authMode: session.user.authMode,

    // Business line enrichment
    businessLineMetadata,

    // Account 360
    ...(session.user.spaceId ? { spaceId: session.user.spaceId } : {}),
    ...(session.user.organizationId ? { organizationId: session.user.organizationId } : {}),
    ...(session.user.organizationName ? { organizationName: session.user.organizationName } : {}),

    // Collaborator identity
    ...(session.user.memberId ? { memberId: session.user.memberId } : {}),
    ...(session.user.identityProfileId ? { identityProfileId: session.user.identityProfileId } : {}),

    // Supervisor scope (TASK-727): pasamos el summary tal como viene del JWT.
    supervisorAccess: session.user.supervisorAccess ?? null
  }
}

import 'server-only'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'

export interface TenantContext {
  userId: string
  clientId: string
  clientName: string
  tenantType: 'client' | 'efeonce_internal'
  roleCodes: string[]
  primaryRoleCode: string
  routeGroups: string[]
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
}

export const getTenantContext = async (): Promise<TenantContext | null> => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return null
  }

  return {
    userId: session.user.userId,
    clientId: session.user.clientId,
    clientName: session.user.clientName,
    tenantType: session.user.tenantType,
    roleCodes: session.user.roleCodes,
    primaryRoleCode: session.user.primaryRoleCode,
    routeGroups: session.user.routeGroups,
    projectScopes: session.user.projectScopes,
    campaignScopes: session.user.campaignScopes,
    businessLines: session.user.businessLines,
    serviceModules: session.user.serviceModules,
    role: session.user.role,
    projectIds: session.user.projectIds,
    featureFlags: session.user.featureFlags,
    timezone: session.user.timezone,
    portalHomePath: session.user.portalHomePath,
    authMode: session.user.authMode
  }
}

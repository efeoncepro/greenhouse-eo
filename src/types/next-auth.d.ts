import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    userId: string
    clientId: string
    tenantType: 'client' | 'efeonce_internal'
    roleCodes: string[]
    primaryRoleCode: string
    routeGroups: string[]
    projectScopes: string[]
    campaignScopes: string[]
    businessLines: string[]
    serviceModules: string[]
    projectIds: string[]
    role: string
    featureFlags: string[]
    timezone: string
    portalHomePath: string
    authMode: string
  }

  interface Session {
    user: {
      id: string
      userId: string
      clientId: string
      tenantType: 'client' | 'efeonce_internal'
      roleCodes: string[]
      primaryRoleCode: string
      routeGroups: string[]
      projectScopes: string[]
      campaignScopes: string[]
      businessLines: string[]
      serviceModules: string[]
      projectIds: string[]
      role: string
      featureFlags: string[]
      timezone: string
      portalHomePath: string
      authMode: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    email?: string | null
    name?: string | null
    clientId?: string
    tenantType?: 'client' | 'efeonce_internal'
    roleCodes?: string[]
    primaryRoleCode?: string
    routeGroups?: string[]
    projectScopes?: string[]
    campaignScopes?: string[]
    businessLines?: string[]
    serviceModules?: string[]
    projectIds?: string[]
    role?: string
    featureFlags?: string[]
    timezone?: string
    portalHomePath?: string
    authMode?: string
  }
}

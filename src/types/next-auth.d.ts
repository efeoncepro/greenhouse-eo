import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    userId: string
    clientId: string
    clientName: string
    avatarUrl: string | null
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
    provider: string
    microsoftEmail: string | null
  }

  interface Session {
    user: {
      id: string
      userId: string
      clientId: string
      clientName: string
      avatarUrl: string | null
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
      provider: string
      microsoftEmail: string | null
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    email?: string | null
    name?: string | null
    avatarUrl?: string | null
    clientId?: string
    clientName?: string
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
    provider?: string
    microsoftEmail?: string | null
  }
}

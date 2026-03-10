import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    clientId: string
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
      clientId: string
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
    email?: string | null
    name?: string | null
    clientId?: string
    projectIds?: string[]
    role?: string
    featureFlags?: string[]
    timezone?: string
    portalHomePath?: string
    authMode?: string
  }
}

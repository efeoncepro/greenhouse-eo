import 'server-only'

import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'

export interface TenantContext {
  clientId: string
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
    clientId: session.user.clientId,
    role: session.user.role,
    projectIds: session.user.projectIds,
    featureFlags: session.user.featureFlags,
    timezone: session.user.timezone,
    portalHomePath: session.user.portalHomePath,
    authMode: session.user.authMode
  }
}

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { getTenantAuthRecordByEmail, updateTenantLastLogin, verifyTenantPassword } from '@/lib/tenant/clients'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    CredentialsProvider({
      name: 'Greenhouse Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const tenant = await getTenantAuthRecordByEmail(credentials.email)

        if (!tenant) {
          return null
        }

        const isValidPassword = await verifyTenantPassword(tenant, credentials.password)

        if (!isValidPassword) {
          return null
        }

        await updateTenantLastLogin(tenant.clientId)

        return {
          id: tenant.clientId,
          email: tenant.email,
          name: tenant.clientName,
          clientId: tenant.clientId,
          projectIds: tenant.projectIds,
          role: tenant.role,
          featureFlags: tenant.featureFlags,
          timezone: tenant.timezone,
          portalHomePath: tenant.portalHomePath,
          authMode: tenant.authMode
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
        token.clientId = user.clientId
        token.projectIds = user.projectIds
        token.role = user.role
        token.featureFlags = user.featureFlags
        token.timezone = user.timezone
        token.portalHomePath = user.portalHomePath
        token.authMode = user.authMode
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.email = token.email || ''
        session.user.name = token.name || ''
        session.user.clientId = typeof token.clientId === 'string' ? token.clientId : ''
        session.user.projectIds = Array.isArray(token.projectIds) ? token.projectIds.filter(Boolean) : []
        session.user.role = typeof token.role === 'string' ? token.role : 'client'
        session.user.featureFlags = Array.isArray(token.featureFlags) ? token.featureFlags.filter(Boolean) : []
        session.user.timezone = typeof token.timezone === 'string' ? token.timezone : 'UTC'
        session.user.portalHomePath = typeof token.portalHomePath === 'string' ? token.portalHomePath : '/dashboard'
        session.user.authMode = typeof token.authMode === 'string' ? token.authMode : 'credentials'
      }

      return session
    }
  }
}

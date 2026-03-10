import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

import { getTenantAccessRecordByEmail, updateTenantLastLogin, verifyTenantPassword } from '@/lib/tenant/access'

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

        const normalizedEmail = credentials.email.trim().toLowerCase()

        let tenant = null

        try {
          tenant = await getTenantAccessRecordByEmail(normalizedEmail)
        } catch (error) {
          console.error('Credentials auth lookup failed.', { email: normalizedEmail }, error)

          return null
        }

        if (!tenant) {
          console.warn('Credentials auth rejected: tenant user not found.', { email: normalizedEmail })

          return null
        }

        const isValidPassword = await verifyTenantPassword(tenant, credentials.password)

        if (!isValidPassword) {
          console.warn('Credentials auth rejected: password mismatch or inactive user.', {
            email: normalizedEmail,
            userId: tenant.userId,
            active: tenant.active,
            status: tenant.status
          })

          return null
        }

        try {
          await updateTenantLastLogin(tenant)
        } catch (error) {
          console.warn('Unable to update tenant last_login_at after successful auth.', error)
        }

        return {
          id: tenant.userId,
          email: tenant.email,
          name: tenant.fullName,
          userId: tenant.userId,
          clientId: tenant.clientId,
          tenantType: tenant.tenantType,
          roleCodes: tenant.roleCodes,
          primaryRoleCode: tenant.primaryRoleCode,
          routeGroups: tenant.routeGroups,
          projectScopes: tenant.projectScopes,
          campaignScopes: tenant.campaignScopes,
          businessLines: tenant.businessLines,
          serviceModules: tenant.serviceModules,
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
        token.userId = user.userId
        token.email = user.email
        token.name = user.name
        token.clientId = user.clientId
        token.tenantType = user.tenantType
        token.roleCodes = user.roleCodes
        token.primaryRoleCode = user.primaryRoleCode
        token.routeGroups = user.routeGroups
        token.projectScopes = user.projectScopes
        token.campaignScopes = user.campaignScopes
        token.businessLines = user.businessLines
        token.serviceModules = user.serviceModules
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
        session.user.userId = typeof token.userId === 'string' ? token.userId : token.sub || ''
        session.user.email = token.email || ''
        session.user.name = token.name || ''
        session.user.clientId = typeof token.clientId === 'string' ? token.clientId : ''
        session.user.tenantType = token.tenantType === 'efeonce_internal' ? 'efeonce_internal' : 'client'
        session.user.roleCodes = Array.isArray(token.roleCodes) ? token.roleCodes.filter(Boolean) : []
        session.user.primaryRoleCode =
          typeof token.primaryRoleCode === 'string'
            ? token.primaryRoleCode
            : session.user.tenantType === 'efeonce_internal'
              ? 'efeonce_account'
              : 'client_executive'
        session.user.routeGroups = Array.isArray(token.routeGroups) ? token.routeGroups.filter(Boolean) : []
        session.user.projectScopes = Array.isArray(token.projectScopes) ? token.projectScopes.filter(Boolean) : []
        session.user.campaignScopes = Array.isArray(token.campaignScopes) ? token.campaignScopes.filter(Boolean) : []
        session.user.businessLines = Array.isArray(token.businessLines) ? token.businessLines.filter(Boolean) : []
        session.user.serviceModules = Array.isArray(token.serviceModules) ? token.serviceModules.filter(Boolean) : []
        session.user.projectIds = Array.isArray(token.projectIds) ? token.projectIds.filter(Boolean) : []
        session.user.role =
          typeof token.role === 'string' ? token.role : session.user.primaryRoleCode || 'client_executive'
        session.user.featureFlags = Array.isArray(token.featureFlags) ? token.featureFlags.filter(Boolean) : []
        session.user.timezone = typeof token.timezone === 'string' ? token.timezone : 'UTC'
        session.user.portalHomePath = typeof token.portalHomePath === 'string' ? token.portalHomePath : '/dashboard'
        session.user.authMode = typeof token.authMode === 'string' ? token.authMode : 'credentials'
      }

      return session
    }
  }
}

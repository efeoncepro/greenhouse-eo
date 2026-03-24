import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import {
  getTenantAccessRecordByAllowedEmailDomain,
  getTenantAccessRecordByEmail,
  getTenantAccessRecordByGoogleSub,
  getTenantAccessRecordByInternalMicrosoftAlias,
  getTenantAccessRecordByMicrosoftOid,
  isEligibleForExternalSSOSignIn,
  linkGoogleIdentity,
  linkMicrosoftIdentity,
  updateTenantLastLogin,
  verifyTenantPassword
} from '@/lib/tenant/access'

const microsoftClientId = process.env.AZURE_AD_CLIENT_ID
const microsoftClientSecret = process.env.AZURE_AD_CLIENT_SECRET
const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const hasMicrosoftProvider = Boolean(microsoftClientId && microsoftClientSecret)
const hasGoogleProvider = Boolean(googleClientId && googleClientSecret)

const getMicrosoftProfileIdentity = ({
  profile,
  user
}: {
  profile?: Record<string, unknown> | null
  user?: { email?: string | null; name?: string | null } | null
}) => {
  const normalizedEmail =
    typeof profile?.email === 'string'
      ? profile.email.trim().toLowerCase()
      : typeof user?.email === 'string'
        ? user.email.trim().toLowerCase()
        : ''

  const oid =
    typeof profile?.oid === 'string'
      ? profile.oid
      : typeof profile?.sub === 'string'
        ? profile.sub
        : ''

  const tenantId = typeof profile?.tid === 'string' ? profile.tid : ''

  const displayName =
    typeof profile?.name === 'string'
      ? profile.name.trim()
      : typeof user?.name === 'string'
        ? user.name.trim()
        : ''

  const givenName = typeof profile?.given_name === 'string' ? profile.given_name.trim() : ''
  const familyName = typeof profile?.family_name === 'string' ? profile.family_name.trim() : ''

  return {
    normalizedEmail,
    oid,
    tenantId,
    displayName,
    givenName,
    familyName
  }
}

const getGoogleProfileIdentity = ({
  profile,
  user
}: {
  profile?: Record<string, unknown> | null
  user?: { email?: string | null; name?: string | null } | null
}) => {
  const normalizedEmail =
    typeof profile?.email === 'string'
      ? profile.email.trim().toLowerCase()
      : typeof user?.email === 'string'
        ? user.email.trim().toLowerCase()
        : ''

  const sub = typeof profile?.sub === 'string' ? profile.sub.trim() : ''

  const displayName =
    typeof profile?.name === 'string'
      ? profile.name.trim()
      : typeof user?.name === 'string'
        ? user.name.trim()
        : ''

  const givenName = typeof profile?.given_name === 'string' ? profile.given_name.trim() : ''
  const familyName = typeof profile?.family_name === 'string' ? profile.family_name.trim() : ''

  return {
    normalizedEmail,
    sub,
    displayName,
    givenName,
    familyName
  }
}

const getRejectedTenantMatchRedirect = async ({
  provider,
  normalizedEmail
}: {
  provider: 'Microsoft' | 'Google'
  normalizedEmail: string
}) => {
  const allowedDomain = normalizedEmail.split('@')[1]?.trim().toLowerCase() || ''
  const tenantMatch = allowedDomain ? await getTenantAccessRecordByAllowedEmailDomain(allowedDomain) : null

  if (tenantMatch) {
    console.warn(`${provider} SSO rejected because the domain matched a tenant but no explicit principal exists.`, {
      email: normalizedEmail,
      clientId: tenantMatch.clientId
    })
  }

  return '/auth/access-denied'
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login',
    error: '/auth/access-denied'
  },
  providers: [
    ...(hasMicrosoftProvider
      ? [
          AzureADProvider({
            clientId: microsoftClientId!,
            clientSecret: microsoftClientSecret!,
            tenantId: 'common',
            authorization: {
              params: {
                scope: 'openid profile email'
              }
            }
          })
        ]
      : []),
    ...(hasGoogleProvider
      ? [
          GoogleProvider({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            authorization: {
              params: {
                scope: 'openid email'
              }
            }
          })
        ]
      : []),
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
          await updateTenantLastLogin(tenant, 'credentials')
        } catch (error) {
          console.warn('Unable to update tenant last_login_at after successful auth.', error)
        }

        return {
          id: tenant.userId,
          email: tenant.email,
          name: tenant.fullName,
          avatarUrl: tenant.avatarUrl,
          userId: tenant.userId,
          clientId: tenant.clientId,
          clientName: tenant.clientName,
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
          authMode: tenant.authMode,
          provider: 'credentials',
          microsoftEmail: tenant.microsoftEmail,
          googleEmail: tenant.googleEmail
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'credentials') {
        return true
      }

      if (account?.provider === 'azure-ad') {
        const { normalizedEmail, oid, tenantId, displayName, givenName, familyName } = getMicrosoftProfileIdentity({
          profile: (profile as Record<string, unknown> | null | undefined) || null,
          user
        })

        if (!normalizedEmail || !oid) {
          return '/auth/access-denied'
        }

        let tenant = await getTenantAccessRecordByMicrosoftOid(oid)

        if (!tenant) {
          tenant = await getTenantAccessRecordByEmail(normalizedEmail)
        }

        if (!tenant) {
          tenant = await getTenantAccessRecordByInternalMicrosoftAlias({
            email: normalizedEmail,
            displayName,
            givenName,
            familyName
          })
        }

        if (!tenant) {
          return getRejectedTenantMatchRedirect({
            provider: 'Microsoft',
            normalizedEmail
          })
        }

        if (!isEligibleForExternalSSOSignIn(tenant)) {
          return '/auth/access-denied'
        }

        if (tenant.microsoftOid !== oid || tenant.microsoftEmail !== normalizedEmail || tenant.microsoftTenantId !== tenantId) {
          await linkMicrosoftIdentity({
            tenant,
            oid,
            tenantId,
            microsoftEmail: normalizedEmail
          })
        }

        await updateTenantLastLogin(tenant, 'microsoft_sso')

        return true
      }

      if (account?.provider === 'google') {
        const { normalizedEmail, sub, displayName, givenName, familyName } = getGoogleProfileIdentity({
          profile: (profile as Record<string, unknown> | null | undefined) || null,
          user
        })

        if (!normalizedEmail || !sub) {
          return '/auth/access-denied'
        }

        let tenant = await getTenantAccessRecordByGoogleSub(sub)

        if (!tenant) {
          tenant = await getTenantAccessRecordByEmail(normalizedEmail)
        }

        if (!tenant) {
          tenant = await getTenantAccessRecordByInternalMicrosoftAlias({
            email: normalizedEmail,
            displayName,
            givenName,
            familyName
          })
        }

        if (!tenant) {
          return getRejectedTenantMatchRedirect({
            provider: 'Google',
            normalizedEmail
          })
        }

        if (!isEligibleForExternalSSOSignIn(tenant)) {
          return '/auth/access-denied'
        }

        if (tenant.googleSub !== sub || tenant.googleEmail !== normalizedEmail) {
          await linkGoogleIdentity({
            tenant,
            sub,
            googleEmail: normalizedEmail
          })
        }

        await updateTenantLastLogin(tenant, 'google_sso')

        return true
      }

      return false
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.sub = user.id
        token.userId = user.userId
        token.email = user.email
        token.name = user.name
        token.avatarUrl = user.avatarUrl
        token.clientId = user.clientId
        token.clientName = user.clientName
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
        token.provider = user.provider
        token.microsoftEmail = user.microsoftEmail
        token.googleEmail = user.googleEmail

        // Account 360
        token.spaceId = user.spaceId
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
      }

      if (account?.provider === 'azure-ad') {
        const { normalizedEmail, oid, displayName, givenName, familyName } = getMicrosoftProfileIdentity({
          profile: (profile as Record<string, unknown> | null | undefined) || null,
          user
        })

        let tenant = oid ? await getTenantAccessRecordByMicrosoftOid(oid) : null

        if (!tenant && normalizedEmail) {
          tenant = await getTenantAccessRecordByEmail(normalizedEmail)
        }

        if (!tenant && normalizedEmail) {
          tenant = await getTenantAccessRecordByInternalMicrosoftAlias({
            email: normalizedEmail,
            displayName,
            givenName,
            familyName
          })
        }

        if (tenant) {
          token.sub = tenant.userId
          token.userId = tenant.userId
          token.email = tenant.email
          token.name = tenant.fullName
          token.avatarUrl = tenant.avatarUrl
          token.clientId = tenant.clientId
          token.clientName = tenant.clientName
          token.tenantType = tenant.tenantType
          token.roleCodes = tenant.roleCodes
          token.primaryRoleCode = tenant.primaryRoleCode
          token.routeGroups = tenant.routeGroups
          token.projectScopes = tenant.projectScopes
          token.campaignScopes = tenant.campaignScopes
          token.businessLines = tenant.businessLines
          token.serviceModules = tenant.serviceModules
          token.projectIds = tenant.projectIds
          token.role = tenant.role
          token.featureFlags = tenant.featureFlags
          token.timezone = tenant.timezone
          token.portalHomePath = tenant.portalHomePath
          token.authMode = tenant.authMode
          token.provider = 'microsoft_sso'
          token.microsoftEmail = tenant.microsoftEmail || normalizedEmail

          // Account 360
          token.spaceId = tenant.spaceId ?? undefined
          token.organizationId = tenant.organizationId ?? undefined
          token.organizationName = tenant.organizationName ?? undefined
        }
      }

      if (account?.provider === 'google') {
        const { normalizedEmail, sub, displayName, givenName, familyName } = getGoogleProfileIdentity({
          profile: (profile as Record<string, unknown> | null | undefined) || null,
          user
        })

        let tenant = sub ? await getTenantAccessRecordByGoogleSub(sub) : null

        if (!tenant && normalizedEmail) {
          tenant = await getTenantAccessRecordByEmail(normalizedEmail)
        }

        if (!tenant && normalizedEmail) {
          tenant = await getTenantAccessRecordByInternalMicrosoftAlias({
            email: normalizedEmail,
            displayName,
            givenName,
            familyName
          })
        }

        if (tenant) {
          token.sub = tenant.userId
          token.userId = tenant.userId
          token.email = tenant.email
          token.name = tenant.fullName
          token.avatarUrl = tenant.avatarUrl
          token.clientId = tenant.clientId
          token.clientName = tenant.clientName
          token.tenantType = tenant.tenantType
          token.roleCodes = tenant.roleCodes
          token.primaryRoleCode = tenant.primaryRoleCode
          token.routeGroups = tenant.routeGroups
          token.projectScopes = tenant.projectScopes
          token.campaignScopes = tenant.campaignScopes
          token.businessLines = tenant.businessLines
          token.serviceModules = tenant.serviceModules
          token.projectIds = tenant.projectIds
          token.role = tenant.role
          token.featureFlags = tenant.featureFlags
          token.timezone = tenant.timezone
          token.portalHomePath = tenant.portalHomePath
          token.authMode = tenant.authMode
          token.provider = 'google_sso'
          token.googleEmail = tenant.googleEmail || normalizedEmail

          // Account 360
          token.spaceId = tenant.spaceId ?? undefined
          token.organizationId = tenant.organizationId ?? undefined
          token.organizationName = tenant.organizationName ?? undefined
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || ''
        session.user.userId = typeof token.userId === 'string' ? token.userId : token.sub || ''
        session.user.email = token.email || ''
        session.user.name = token.name || ''
        session.user.avatarUrl = typeof token.avatarUrl === 'string' ? token.avatarUrl : null
        session.user.clientId = typeof token.clientId === 'string' ? token.clientId : ''
        session.user.clientName = typeof token.clientName === 'string' ? token.clientName : 'Greenhouse Client'
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
        session.user.provider = typeof token.provider === 'string' ? token.provider : 'credentials'
        session.user.microsoftEmail = typeof token.microsoftEmail === 'string' ? token.microsoftEmail : null
        session.user.googleEmail = typeof token.googleEmail === 'string' ? token.googleEmail : null

        // Account 360
        session.user.spaceId = typeof token.spaceId === 'string' ? token.spaceId : undefined
        session.user.organizationId = typeof token.organizationId === 'string' ? token.organizationId : undefined
        session.user.organizationName = typeof token.organizationName === 'string' ? token.organizationName : undefined
      }

      return session
    }
  }
}

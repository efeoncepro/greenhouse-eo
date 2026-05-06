import { getServerSession, type NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

import { ROLE_CODES } from '@/config/role-codes'
import { defaultLocale, normalizeLocale } from '@/i18n/locales'
import { recordAuthAttempt } from '@/lib/auth/attempt-tracker'
import {
  getAzureAdClientSecret,
  getGoogleClientSecret,
  getNextAuthSecret,
  hasGoogleAuthProvider,
  hasMicrosoftAuthProvider
} from '@/lib/auth-secrets'
import { captureWithDomain } from '@/lib/observability/capture'
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
import { resolvePortalHomePath } from '@/lib/tenant/resolve-portal-home-path'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { resolveSupervisorAccessSummaryFromMinimalContext } from '@/lib/reporting-hierarchy/access'
import { getUserLocalePreferenceSnapshot } from '@/lib/i18n/locale-preferences'

type LocaleTokenSnapshot = {
  preferredLocale: string | null
  tenantDefaultLocale: string | null
  legacyLocale: string | null
  effectiveLocale: string
}

const applyLocaleToToken = (token: JWT, snapshot: LocaleTokenSnapshot) => {
  token.preferredLocale = normalizeLocale(snapshot.preferredLocale) ?? null
  token.tenantDefaultLocale = normalizeLocale(snapshot.tenantDefaultLocale) ?? null
  token.legacyLocale = normalizeLocale(snapshot.legacyLocale) ?? null
  token.effectiveLocale = normalizeLocale(snapshot.effectiveLocale) ?? defaultLocale
}

const refreshLocaleToken = async (token: JWT) => {
  const userId = typeof token.userId === 'string' ? token.userId : typeof token.sub === 'string' ? token.sub : ''

  if (!userId) {
    token.effectiveLocale = normalizeLocale(token.effectiveLocale) ?? defaultLocale

    return
  }

  try {
    applyLocaleToToken(token, await getUserLocalePreferenceSnapshot(userId))
  } catch (error) {
    console.warn('Unable to refresh locale preference for session token.', { userId }, error)
    token.effectiveLocale = normalizeLocale(token.effectiveLocale) ?? defaultLocale
  }
}

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

export const getAuthOptions = () => createAuthOptions()

export const isMissingNextAuthSecretError = (error: unknown) =>
  error instanceof Error && error.message === 'NEXTAUTH_SECRET is not set'

let hasLoggedMissingNextAuthSecret = false

export const getServerAuthSession = async () => {
  try {
    return await getServerSession(getAuthOptions())
  } catch (error) {
    if (isMissingNextAuthSecretError(error)) {
      if (!hasLoggedMissingNextAuthSecret) {
        console.warn('[auth] NEXTAUTH_SECRET is not set; treating request as unauthenticated in this runtime.')
        hasLoggedMissingNextAuthSecret = true
      }

      return null
    }

    throw error
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

const createAuthOptions = (): NextAuthOptions => {
  const microsoftClientId = process.env.AZURE_AD_CLIENT_ID
  const microsoftClientSecret = getAzureAdClientSecret()
  const googleClientId = process.env.GOOGLE_CLIENT_ID
  const googleClientSecret = getGoogleClientSecret()
  const hasMicrosoftProvider = hasMicrosoftAuthProvider()
  const hasGoogleProvider = hasGoogleAuthProvider()

  return {
    secret: getNextAuthSecret(),
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

            await recordAuthAttempt({
              provider: 'credentials',
              stage: 'authorize',
              outcome: 'rejected',
              reasonCode: 'tenant_not_found',
              email: normalizedEmail
            })

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

            // Audit: emit login.failed (TASK-248)
            publishOutboxEvent({
              aggregateType: AGGREGATE_TYPES.authSession,
              aggregateId: tenant.userId,
              eventType: EVENT_TYPES.loginFailed,
              payload: { email: normalizedEmail, provider: 'credentials', reason: 'invalid_password' }
            }).catch(() => {})

            await recordAuthAttempt({
              provider: 'credentials',
              stage: 'authorize',
              outcome: 'rejected',
              reasonCode: !tenant.active
                ? 'account_disabled'
                : tenant.status !== 'active'
                  ? 'account_status_invalid'
                  : 'invalid_password',
              userIdResolved: tenant.userId,
              email: normalizedEmail
            })

            return null
          }

          try {
            await updateTenantLastLogin(tenant, 'credentials')
          } catch (error) {
            console.warn('Unable to update tenant last_login_at after successful auth.', error)
          }

          await recordAuthAttempt({
            provider: 'credentials',
            stage: 'authorize',
            outcome: 'success',
            reasonCode: 'success',
            userIdResolved: tenant.userId,
            email: normalizedEmail
          })

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
            authorizedViews: tenant.authorizedViews,
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
            googleEmail: tenant.googleEmail,
            preferredLocale: tenant.preferredLocale,
            tenantDefaultLocale: tenant.tenantDefaultLocale,
            legacyLocale: tenant.legacyLocale,
            effectiveLocale: tenant.effectiveLocale,

            // Account 360
            spaceId: tenant.spaceId ?? undefined,
            organizationId: tenant.organizationId ?? undefined,
            organizationName: tenant.organizationName ?? undefined,

            // Collaborator identity
            memberId: tenant.memberId ?? undefined,
            identityProfileId: tenant.identityProfileId ?? undefined
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
        try {
          const { normalizedEmail, oid, tenantId, displayName, givenName, familyName } = getMicrosoftProfileIdentity({
            profile: (profile as Record<string, unknown> | null | undefined) || null,
            user
          })

          if (!normalizedEmail || !oid) {
            await recordAuthAttempt({
              provider: 'azure-ad',
              stage: 'signin_callback',
              outcome: 'rejected',
              reasonCode: 'unknown',
              reasonDetail: 'missing_email_or_oid',
              email: normalizedEmail,
              microsoftOid: oid,
              microsoftTenantId: tenantId
            })

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
            await recordAuthAttempt({
              provider: 'azure-ad',
              stage: 'lookup',
              outcome: 'rejected',
              reasonCode: 'tenant_not_found',
              email: normalizedEmail,
              microsoftOid: oid,
              microsoftTenantId: tenantId
            })

            return getRejectedTenantMatchRedirect({
              provider: 'Microsoft',
              normalizedEmail
            })
          }

          if (!isEligibleForExternalSSOSignIn(tenant)) {
            await recordAuthAttempt({
              provider: 'azure-ad',
              stage: 'signin_callback',
              outcome: 'rejected',
              reasonCode: tenant.active ? 'account_status_invalid' : 'account_disabled',
              userIdResolved: tenant.userId,
              email: normalizedEmail,
              microsoftOid: oid,
              microsoftTenantId: tenantId
            })

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

          await recordAuthAttempt({
            provider: 'azure-ad',
            stage: 'signin_callback',
            outcome: 'success',
            reasonCode: 'success',
            userIdResolved: tenant.userId,
            email: normalizedEmail,
            microsoftOid: oid,
            microsoftTenantId: tenantId
          })

          return true
        } catch (error) {
          captureWithDomain(error, 'identity', {
            extra: { provider: 'azure-ad', stage: 'signin_callback' }
          })

          await recordAuthAttempt({
            provider: 'azure-ad',
            stage: 'signin_callback',
            outcome: 'failure',
            reasonCode: 'callback_exception',
            reasonDetail: error instanceof Error ? error.message : 'unknown_error'
          })

          throw error
        }
      }

      if (account?.provider === 'google') {
        try {
          const { normalizedEmail, sub, displayName, givenName, familyName } = getGoogleProfileIdentity({
            profile: (profile as Record<string, unknown> | null | undefined) || null,
            user
          })

          if (!normalizedEmail || !sub) {
            await recordAuthAttempt({
              provider: 'google',
              stage: 'signin_callback',
              outcome: 'rejected',
              reasonCode: 'unknown',
              reasonDetail: 'missing_email_or_sub',
              email: normalizedEmail
            })

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
            await recordAuthAttempt({
              provider: 'google',
              stage: 'lookup',
              outcome: 'rejected',
              reasonCode: 'tenant_not_found',
              email: normalizedEmail
            })

            return getRejectedTenantMatchRedirect({
              provider: 'Google',
              normalizedEmail
            })
          }

          if (!isEligibleForExternalSSOSignIn(tenant)) {
            await recordAuthAttempt({
              provider: 'google',
              stage: 'signin_callback',
              outcome: 'rejected',
              reasonCode: tenant.active ? 'account_status_invalid' : 'account_disabled',
              userIdResolved: tenant.userId,
              email: normalizedEmail
            })

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

          await recordAuthAttempt({
            provider: 'google',
            stage: 'signin_callback',
            outcome: 'success',
            reasonCode: 'success',
            userIdResolved: tenant.userId,
            email: normalizedEmail
          })

          return true
        } catch (error) {
          captureWithDomain(error, 'identity', {
            extra: { provider: 'google', stage: 'signin_callback' }
          })

          await recordAuthAttempt({
            provider: 'google',
            stage: 'signin_callback',
            outcome: 'failure',
            reasonCode: 'callback_exception',
            reasonDetail: error instanceof Error ? error.message : 'unknown_error'
          })

          throw error
        }
      }

      return false
    },
    async jwt({ token, user, account, profile }) {
      try {
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
        token.authorizedViews = user.authorizedViews
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
        token.preferredLocale = user.preferredLocale
        token.tenantDefaultLocale = user.tenantDefaultLocale
        token.legacyLocale = user.legacyLocale
        token.effectiveLocale = user.effectiveLocale

        // Account 360
        token.spaceId = user.spaceId
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName

        // Collaborator identity
        token.memberId = user.memberId
        token.identityProfileId = user.identityProfileId
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
          token.authorizedViews = tenant.authorizedViews
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

          // Collaborator identity
          token.memberId = tenant.memberId ?? undefined
          token.identityProfileId = tenant.identityProfileId ?? undefined

          applyLocaleToToken(token, tenant)
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
          token.authorizedViews = tenant.authorizedViews
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

          // Collaborator identity
          token.memberId = tenant.memberId ?? undefined
          token.identityProfileId = tenant.identityProfileId ?? undefined

          applyLocaleToToken(token, tenant)
        }
      }

      token.portalHomePath = resolvePortalHomePath({
        portalHomePath: typeof token.portalHomePath === 'string' ? token.portalHomePath : null,
        tenantType: token.tenantType,
        roleCodes: Array.isArray(token.roleCodes) ? token.roleCodes : [],
        routeGroups: Array.isArray(token.routeGroups) ? token.routeGroups : []
      })

      await refreshLocaleToken(token)

      // TASK-727 — Resolve supervisor scope summary una vez por sesión y persistir en JWT.
      // Si la fila ya existe (refresh) y tenemos memberId, solo recomputamos cuando es la
      // primera materialización (ie, viene un user nuevo o cambió member/tenantType).
      const shouldResolveSupervisorAccess =
        Boolean(user) ||
        Boolean(account) ||
        token.supervisorAccess === undefined

      if (shouldResolveSupervisorAccess) {
        token.supervisorAccess = await resolveSupervisorAccessSummaryFromMinimalContext({
          userId: typeof token.userId === 'string' ? token.userId : null,
          tenantType: typeof token.tenantType === 'string' ? token.tenantType : null,
          memberId: typeof token.memberId === 'string' ? token.memberId : null
        })
      }

      return token
      } catch (error) {
        // TASK-742 Capa 3 — JWT callback errors are the primary cause of opaque
        // `error=Callback` redirects. Capture with full context so the failing
        // stage is observable and the operator can fix the upstream cause.
        captureWithDomain(error, 'identity', {
          extra: {
            stage: 'jwt_callback',
            provider: account?.provider ?? token.provider ?? 'unknown',
            userId: typeof token.userId === 'string' ? token.userId : null
          }
        })

        await recordAuthAttempt({
          provider:
            account?.provider === 'azure-ad'
              ? 'azure-ad'
              : account?.provider === 'google'
                ? 'google'
                : 'credentials',
          stage: 'jwt_callback',
          outcome: 'failure',
          reasonCode: 'callback_exception',
          userIdResolved: typeof token.userId === 'string' ? token.userId : null,
          reasonDetail: error instanceof Error ? error.message : 'unknown_error'
        })

        throw error
      }
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
              ? ROLE_CODES.EFEONCE_ACCOUNT
              : ROLE_CODES.CLIENT_EXECUTIVE
        session.user.routeGroups = Array.isArray(token.routeGroups) ? token.routeGroups.filter(Boolean) : []
        session.user.authorizedViews = Array.isArray(token.authorizedViews) ? token.authorizedViews.filter(Boolean) : []
        session.user.projectScopes = Array.isArray(token.projectScopes) ? token.projectScopes.filter(Boolean) : []
        session.user.campaignScopes = Array.isArray(token.campaignScopes) ? token.campaignScopes.filter(Boolean) : []
        session.user.businessLines = Array.isArray(token.businessLines) ? token.businessLines.filter(Boolean) : []
        session.user.serviceModules = Array.isArray(token.serviceModules) ? token.serviceModules.filter(Boolean) : []
        session.user.projectIds = Array.isArray(token.projectIds) ? token.projectIds.filter(Boolean) : []
        session.user.role =
          typeof token.role === 'string' ? token.role : session.user.primaryRoleCode || ROLE_CODES.CLIENT_EXECUTIVE
        session.user.featureFlags = Array.isArray(token.featureFlags) ? token.featureFlags.filter(Boolean) : []
        session.user.timezone = typeof token.timezone === 'string' ? token.timezone : 'UTC'
        session.user.portalHomePath = resolvePortalHomePath({
          portalHomePath: typeof token.portalHomePath === 'string' ? token.portalHomePath : null,
          tenantType: token.tenantType,
          roleCodes: Array.isArray(token.roleCodes) ? token.roleCodes : [],
          routeGroups: Array.isArray(token.routeGroups) ? token.routeGroups : []
        })
        session.user.authMode = typeof token.authMode === 'string' ? token.authMode : 'credentials'
        session.user.provider = typeof token.provider === 'string' ? token.provider : 'credentials'
        session.user.microsoftEmail = typeof token.microsoftEmail === 'string' ? token.microsoftEmail : null
        session.user.googleEmail = typeof token.googleEmail === 'string' ? token.googleEmail : null
        session.user.preferredLocale = normalizeLocale(token.preferredLocale) ?? null
        session.user.tenantDefaultLocale = normalizeLocale(token.tenantDefaultLocale) ?? null
        session.user.legacyLocale = normalizeLocale(token.legacyLocale) ?? null
        session.user.effectiveLocale = normalizeLocale(token.effectiveLocale) ?? defaultLocale

        // Account 360
        session.user.spaceId = typeof token.spaceId === 'string' ? token.spaceId : undefined
        session.user.organizationId = typeof token.organizationId === 'string' ? token.organizationId : undefined
        session.user.organizationName = typeof token.organizationName === 'string' ? token.organizationName : undefined

        // Collaborator identity
        session.user.memberId = typeof token.memberId === 'string' ? token.memberId : undefined
        session.user.identityProfileId = typeof token.identityProfileId === 'string' ? token.identityProfileId : undefined

        // TASK-727 — Supervisor scope summary
        session.user.supervisorAccess = token.supervisorAccess ?? null
      }

      return session
    }
  },
  events: {
    // Audit: emit login.success after successful sign-in (TASK-248)
    async signIn({ user, account }) {
      const userRecord = user as unknown as Record<string, unknown>
      const userId = user?.id || userRecord?.userId
      const email = user?.email

      if (userId && email) {
        publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.authSession,
          aggregateId: String(userId),
          eventType: EVENT_TYPES.loginSuccess,
          payload: {
            userId: String(userId),
            email: String(email),
            provider: account?.provider ?? 'unknown',
            tenantType: String(userRecord?.tenantType ?? 'unknown')
          }
        }).catch(() => {})
      }
    }
  }
}
}

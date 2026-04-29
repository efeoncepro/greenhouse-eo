import 'server-only'

import { encode } from 'next-auth/jwt'

import { getNextAuthSecret } from '@/lib/auth-secrets'
import { getTenantAccessRecordForAgent } from '@/lib/tenant/access'
import { resolvePortalHomePath } from '@/lib/tenant/resolve-portal-home-path'
import { ROLE_CODES } from '@/config/role-codes'
import { resolveSupervisorAccessSummaryFromMinimalContext } from '@/lib/reporting-hierarchy/access'

/**
 * In-process agent session minter.
 *
 * Mints a NextAuth session cookie WITHOUT going through the HTTP endpoint
 * `/api/auth/agent-session`. Used by code paths that already run inside the
 * authenticated server (CRON sweeps, AI Observer, smoke-lane re-runs) and
 * just need a session JWT to invoke their own protected routes — without
 * having to round-trip through the SSO wall + bypass header dance.
 *
 * Why this exists
 *
 *   The synthetic monitor cron used to call `fetch(${baseUrl}/api/auth/agent-session)`
 *   to obtain a cookie. That self-hit had to traverse the Vercel SSO wall
 *   and depended on `VERCEL_AUTOMATION_BYPASS_SECRET` being present and
 *   uncorrupted in runtime. When the bypass header was missing or the
 *   secret was shadowed by manual creation, the cron silently received
 *   the SSO HTML wall in place of JSON, parsed `cookieName/cookieValue`
 *   as undefined, and aborted the entire sweep with `skippedReason:
 *   'AGENT_AUTH_SECRET no configurado o agent-session falló'`. The HTTP
 *   endpoint stays for external clients (Playwright, MCP); this helper
 *   replaces the self-hit for in-process callers.
 *
 * Security
 *
 *   This helper does NOT validate AGENT_AUTH_SECRET. Callers are already
 *   inside the authenticated server (cron via requireCronAuth, server
 *   components via the framework). The secret check exists in the HTTP
 *   endpoint to gate EXTERNAL access; in-process callers bypass it the
 *   same way `getServerAuthSession` does.
 *
 * Spec: docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md (Agent Auth)
 */

export interface SignedAgentSession {
  cookieName: string
  cookieValue: string
  email: string
  userId: string
  portalHomePath: string
}

const DEFAULT_AGENT_EMAIL = process.env.AGENT_AUTH_EMAIL?.trim() || 'agent@greenhouse.efeonce.org'

const resolveCookieName = (): string => {
  const isSecure = process.env.NEXTAUTH_URL?.startsWith('https')

  return isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
}

export const signAgentSessionInProcess = async (
  email: string = DEFAULT_AGENT_EMAIL
): Promise<SignedAgentSession | null> => {
  const normalizedEmail = email.trim().toLowerCase()

  let tenant

  try {
    tenant = await getTenantAccessRecordForAgent(normalizedEmail)
  } catch (error) {
    console.error('[sign-agent-session] tenant lookup failed', { email: normalizedEmail, error })

    return null
  }

  if (!tenant) {
    console.warn('[sign-agent-session] no tenant user found', { email: normalizedEmail })

    return null
  }

  const portalHomePath = resolvePortalHomePath({
    portalHomePath: tenant.portalHomePath || null,
    tenantType: tenant.tenantType,
    roleCodes: tenant.roleCodes ?? [],
    routeGroups: tenant.routeGroups ?? []
  })

  const tokenPayload = {
    sub: tenant.userId,
    userId: tenant.userId,
    email: tenant.email,
    name: tenant.fullName,
    avatarUrl: tenant.avatarUrl,
    clientId: tenant.clientId,
    clientName: tenant.clientName,
    tenantType: tenant.tenantType,
    roleCodes: tenant.roleCodes,
    primaryRoleCode: tenant.primaryRoleCode || ROLE_CODES.CLIENT_EXECUTIVE,
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
    portalHomePath,
    authMode: tenant.authMode || 'agent',
    provider: 'agent',
    microsoftEmail: tenant.microsoftEmail,
    googleEmail: tenant.googleEmail,
    spaceId: tenant.spaceId ?? undefined,
    organizationId: tenant.organizationId ?? undefined,
    organizationName: tenant.organizationName ?? undefined,
    memberId: tenant.memberId ?? undefined,
    identityProfileId: tenant.identityProfileId ?? undefined,
    // TASK-727 — Supervisor scope summary para agentes (Daniela vía agent-auth ve aprobaciones)
    supervisorAccess: await resolveSupervisorAccessSummaryFromMinimalContext({
      userId: tenant.userId,
      tenantType: tenant.tenantType,
      memberId: tenant.memberId
    })
  }

  const nextAuthSecret = getNextAuthSecret()

  const jwt = await encode({
    token: tokenPayload,
    secret: nextAuthSecret
  })

  return {
    cookieName: resolveCookieName(),
    cookieValue: jwt,
    email: tenant.email,
    userId: tenant.userId,
    portalHomePath
  }
}

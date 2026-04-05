/**
 * Agent Session Endpoint
 *
 * Generates a valid NextAuth session cookie for a given email,
 * allowing headless agents (Playwright, MCP browser, CI) to
 * authenticate without going through the interactive login flow.
 *
 * Security:
 * - Requires AGENT_AUTH_SECRET env var to be set (disabled in production by default)
 * - Never enabled when VERCEL_ENV === 'production' unless AGENT_AUTH_ALLOW_PRODUCTION is explicitly 'true'
 * - Validates the shared secret before issuing any token
 * - The target user must exist in the tenant access table
 */

import { timingSafeEqual } from 'crypto'

import { NextResponse } from 'next/server'

import { encode } from 'next-auth/jwt'

import { getNextAuthSecret } from '@/lib/auth-secrets'
import { getTenantAccessRecordForAgent } from '@/lib/tenant/access'
import { resolvePortalHomePath } from '@/lib/tenant/resolve-portal-home-path'
import { ROLE_CODES } from '@/config/role-codes'

const isProductionBlocked = () => {
  const vercelEnv = process.env.VERCEL_ENV
  const allowProd = process.env.AGENT_AUTH_ALLOW_PRODUCTION === 'true'

  return vercelEnv === 'production' && !allowProd
}

export async function POST(request: Request) {
  // ── Guard: feature must be enabled ──────────────────────────────────
  const agentSecret = process.env.AGENT_AUTH_SECRET

  if (!agentSecret) {
    return NextResponse.json({ error: 'Agent auth not configured. Set AGENT_AUTH_SECRET env var.' }, { status: 404 })
  }

  if (isProductionBlocked()) {
    return NextResponse.json({ error: 'Agent auth is disabled in production.' }, { status: 403 })
  }

  // ── Parse and validate request ──────────────────────────────────────
  let body: { secret?: string; email?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { secret, email } = body

  if (!secret || !email) {
    return NextResponse.json({ error: 'Missing required fields: secret, email.' }, { status: 400 })
  }

  // Constant-time comparison to prevent timing attacks
  const secretBuffer = Buffer.from(secret)
  const expectedBuffer = Buffer.from(agentSecret)

  if (secretBuffer.length !== expectedBuffer.length || !timingSafeEqual(secretBuffer, expectedBuffer)) {
    return NextResponse.json({ error: 'Invalid secret.' }, { status: 401 })
  }

  // ── Resolve tenant user ─────────────────────────────────────────────
  const normalizedEmail = email.trim().toLowerCase()
  let tenant

  try {
    tenant = await getTenantAccessRecordForAgent(normalizedEmail)
  } catch (error) {
    console.error('[agent-session] Tenant lookup failed', { email: normalizedEmail }, error)

    return NextResponse.json({ error: 'Tenant lookup failed.' }, { status: 500 })
  }

  if (!tenant) {
    return NextResponse.json({ error: `No tenant user found for: ${normalizedEmail}` }, { status: 404 })
  }

  // ── Build JWT token (same shape as auth.ts callbacks.jwt) ───────────
  const portalHomePath = resolvePortalHomePath({
    portalHomePath: tenant.portalHomePath || null,
    tenantType: tenant.tenantType,
    roleCodes: tenant.roleCodes ?? []
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
    identityProfileId: tenant.identityProfileId ?? undefined
  }

  const nextAuthSecret = getNextAuthSecret()

  const jwt = await encode({
    token: tokenPayload,
    secret: nextAuthSecret
  })

  // ── Return the cookie details so the caller can set them ────────────
  // NextAuth v4 uses the cookie name pattern: next-auth.session-token
  // (or __Secure-next-auth.session-token when useSecureCookies is true)
  const isSecure = process.env.NEXTAUTH_URL?.startsWith('https')

  const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

  return NextResponse.json({
    ok: true,
    cookieName,
    cookieValue: jwt,
    email: tenant.email,
    userId: tenant.userId,
    portalHomePath
  })
}

import { randomUUID } from 'node:crypto'

import { ApiPlatformError, normalizeApiPlatformError } from '@/lib/api-platform/core/errors'
import { buildApiPlatformErrorResponse, buildApiPlatformSuccessResponse } from '@/lib/api-platform/core/responses'
import {
  createFirstPartyAppSession,
  refreshFirstPartyAppSession
} from '@/lib/api-platform/core/app-sessions'
import {
  getApiPlatformIpHash,
  getApiPlatformUserAgentHash,
  recordApiPlatformRequestLog
} from '@/lib/api-platform/core/request-logging'
import { DEFAULT_API_PLATFORM_VERSION, resolveApiPlatformVersion } from '@/lib/api-platform/core/versioning'
import { buildAppContextPayload } from '@/lib/api-platform/resources/app'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

export const dynamic = 'force-dynamic'

const tenantRecordToContext = (tenant: Awaited<ReturnType<typeof createFirstPartyAppSession>>['tenant']): TenantContext => ({
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
  role: tenant.role,
  projectIds: tenant.projectIds,
  featureFlags: tenant.featureFlags,
  timezone: tenant.timezone,
  portalHomePath: tenant.portalHomePath,
  authMode: tenant.authMode,
  ...(tenant.spaceId ? { spaceId: tenant.spaceId } : {}),
  ...(tenant.organizationId ? { organizationId: tenant.organizationId } : {}),
  ...(tenant.organizationName ? { organizationName: tenant.organizationName } : {}),
  ...(tenant.memberId ? { memberId: tenant.memberId } : {}),
  ...(tenant.identityProfileId ? { identityProfileId: tenant.identityProfileId } : {})
})

const parseJson = async (request: Request) => {
  try {
    return await request.json() as Record<string, unknown>
  } catch {
    throw new ApiPlatformError('Invalid JSON body.', {
      statusCode: 400,
      errorCode: 'bad_request'
    })
  }
}

const buildSessionData = (result: Awaited<ReturnType<typeof createFirstPartyAppSession>>) => {
  const tenant = tenantRecordToContext(result.tenant)

  return {
    tokenType: result.tokenType,
    accessToken: result.accessToken,
    accessTokenExpiresAt: result.accessTokenExpiresAt,
    refreshToken: result.refreshToken,
    refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    appSessionId: result.appSessionId,
    context: buildAppContextPayload({
      requestId: 'session-bootstrap',
      routeKey: 'platform.app.sessions',
      version: DEFAULT_API_PLATFORM_VERSION,
      tenant,
      appSessionId: result.appSessionId,
      rateLimit: {
        limitPerMinute: 120,
        limitPerHour: 5000
      }
    })
  }
}

const recordSessionRouteLog = async ({
  request,
  routeKey,
  startedAt,
  responseStatus,
  errorCode,
  userId,
  appSessionId,
  clientId,
  spaceId,
  organizationId
}: {
  request: Request
  routeKey: string
  startedAt: number
  responseStatus: number
  errorCode?: string | null
  userId?: string | null
  appSessionId?: string | null
  clientId?: string | null
  spaceId?: string | null
  organizationId?: string | null
}) => {
  const url = new URL(request.url)

  await recordApiPlatformRequestLog({
    lane: 'app',
    appSessionId,
    userId,
    routeKey,
    requestMethod: request.method.toUpperCase(),
    requestPath: url.pathname,
    responseStatus,
    durationMs: Date.now() - startedAt,
    rateLimited: false,
    errorCode: errorCode ?? null,
    clientId,
    spaceId,
    organizationId,
    ipHash: getApiPlatformIpHash(request),
    userAgentHash: getApiPlatformUserAgentHash(request)
  }).catch(error => {
    console.warn('[api-platform/app] session request log failed:', error instanceof Error ? error.message : error)
  })
}

export async function POST(request: Request) {
  const requestId = randomUUID()
  const startedAt = Date.now()
  let version = DEFAULT_API_PLATFORM_VERSION

  try {
    version = resolveApiPlatformVersion(request)
    const body = await parseJson(request)
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email.trim() || !password) {
      throw new ApiPlatformError('Email and password are required.', {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    const result = await createFirstPartyAppSession({
      email,
      password,
      deviceLabel: typeof body.deviceLabel === 'string' ? body.deviceLabel : null,
      devicePlatform: typeof body.devicePlatform === 'string' ? body.devicePlatform : null,
      appVersion: typeof body.appVersion === 'string' ? body.appVersion : null,
      ipHash: getApiPlatformIpHash(request),
      userAgentHash: getApiPlatformUserAgentHash(request)
    })

    await recordSessionRouteLog({
      request,
      routeKey: 'platform.app.sessions.create',
      startedAt,
      responseStatus: 201,
      userId: result.tenant.userId,
      appSessionId: result.appSessionId,
      clientId: result.tenant.clientId || null,
      spaceId: result.tenant.spaceId,
      organizationId: result.tenant.organizationId
    })

    return buildApiPlatformSuccessResponse({
      requestId,
      version,
      data: buildSessionData(result),
      meta: { lane: 'app' },
      status: 201
    })
  } catch (error) {
    const normalizedError = normalizeApiPlatformError(error)

    await recordSessionRouteLog({
      request,
      routeKey: 'platform.app.sessions.create',
      startedAt,
      responseStatus: normalizedError.statusCode,
      errorCode: normalizedError.errorCode
    })

    return buildApiPlatformErrorResponse({
      requestId,
      version,
      error: normalizedError
    })
  }
}

export async function PATCH(request: Request) {
  const requestId = randomUUID()
  const startedAt = Date.now()
  let version = DEFAULT_API_PLATFORM_VERSION

  try {
    version = resolveApiPlatformVersion(request)
    const body = await parseJson(request)
    const refreshToken = typeof body.refreshToken === 'string' ? body.refreshToken : ''

    if (!refreshToken) {
      throw new ApiPlatformError('Refresh token is required.', {
        statusCode: 400,
        errorCode: 'bad_request'
      })
    }

    const result = await refreshFirstPartyAppSession(refreshToken)

    await recordSessionRouteLog({
      request,
      routeKey: 'platform.app.sessions.refresh',
      startedAt,
      responseStatus: 200,
      userId: result.tenant.userId,
      appSessionId: result.appSessionId,
      clientId: result.tenant.clientId || null,
      spaceId: result.tenant.spaceId,
      organizationId: result.tenant.organizationId
    })

    return buildApiPlatformSuccessResponse({
      requestId,
      version,
      data: buildSessionData(result),
      meta: { lane: 'app' }
    })
  } catch (error) {
    const normalizedError = normalizeApiPlatformError(error)

    await recordSessionRouteLog({
      request,
      routeKey: 'platform.app.sessions.refresh',
      startedAt,
      responseStatus: normalizedError.statusCode,
      errorCode: normalizedError.errorCode
    })

    return buildApiPlatformErrorResponse({
      requestId,
      version,
      error: normalizedError
    })
  }
}

import 'server-only'

import { randomUUID } from 'node:crypto'

import { getTenantContext, type TenantContext } from '@/lib/tenant/get-tenant-context'
import type { TenantAccessRecord } from '@/lib/tenant/access'

import { ApiPlatformError, normalizeApiPlatformError } from './errors'
import { buildApiPlatformErrorResponse, buildApiPlatformSuccessResponse } from './responses'
import { DEFAULT_API_PLATFORM_VERSION, resolveApiPlatformVersion } from './versioning'
import {
  decodeAppAccessToken,
  resolveAppSessionTenant,
  revokeFirstPartyAppSession
} from './app-sessions'
import {
  getApiPlatformIpHash,
  getApiPlatformUserAgentHash,
  recordApiPlatformRequestLog
} from './request-logging'
import { query } from '@/lib/db'
import type { ApiPlatformRateLimit } from './context'

const APP_RATE_LIMIT_PER_MINUTE = 120
const APP_RATE_LIMIT_PER_HOUR = 5000

export type AppPlatformRequestContext = {
  requestId: string
  routeKey: string
  version: string
  tenant: TenantContext
  appSessionId: string | null
  rateLimit: ApiPlatformRateLimit
}

type AppRouteHandler<T> = (context: AppPlatformRequestContext) => Promise<{
  data: T
  meta?: Record<string, unknown>
  status?: number
}>

type AppAuditState = {
  requestId: string
  routeKey: string
  requestMethod: string
  requestPath: string
  ipHash: string | null
  userAgentHash: string | null
  startedAt: number
  tenant: TenantContext | null
  appSessionId: string | null
}

type RateWindowCounts = {
  requests_last_minute: number
  requests_last_hour: number
}

const tenantAccessRecordToContext = (tenant: TenantAccessRecord): TenantContext => ({
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
  preferredLocale: tenant.preferredLocale,
  tenantDefaultLocale: tenant.tenantDefaultLocale,
  legacyLocale: tenant.legacyLocale,
  effectiveLocale: tenant.effectiveLocale,
  ...(tenant.spaceId ? { spaceId: tenant.spaceId } : {}),
  ...(tenant.organizationId ? { organizationId: tenant.organizationId } : {}),
  ...(tenant.organizationName ? { organizationName: tenant.organizationName } : {}),
  ...(tenant.memberId ? { memberId: tenant.memberId } : {}),
  ...(tenant.identityProfileId ? { identityProfileId: tenant.identityProfileId } : {})
})

const extractBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim()

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  return authorization.slice('bearer '.length).trim() || null
}

const resolveAppTenantContext = async (request: Request) => {
  const token = extractBearerToken(request)

  if (token) {
    const payload = await decodeAppAccessToken(token)

    const tenant = await resolveAppSessionTenant({
      sessionId: payload.sid,
      userId: payload.sub
    })

    return {
      tenant: tenantAccessRecordToContext(tenant),
      appSessionId: payload.sid
    }
  }

  const tenant = await getTenantContext()

  if (!tenant) {
    throw new ApiPlatformError('Missing first-party app session.', {
      statusCode: 401,
      errorCode: 'missing_session'
    })
  }

  return {
    tenant,
    appSessionId: null
  }
}

const getRateWindowCounts = async ({ userId, appSessionId }: { userId: string; appSessionId: string | null }) => {
  const rows = await query<RateWindowCounts>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN 1 ELSE 0 END), 0) AS requests_last_minute,
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 ELSE 0 END), 0) AS requests_last_hour
      FROM greenhouse_core.api_platform_request_logs
      WHERE lane = 'app'
        AND user_id = $1
        AND ($2::text IS NULL OR app_session_id = $2)
    `,
    [userId, appSessionId]
  )

  return rows[0] ?? {
    requests_last_minute: 0,
    requests_last_hour: 0
  }
}

const buildRateLimit = (counts: RateWindowCounts): ApiPlatformRateLimit => ({
  limitPerMinute: APP_RATE_LIMIT_PER_MINUTE,
  limitPerHour: APP_RATE_LIMIT_PER_HOUR,
  remainingPerMinute: Math.max(0, APP_RATE_LIMIT_PER_MINUTE - Number(counts.requests_last_minute || 0) - 1),
  remainingPerHour: Math.max(0, APP_RATE_LIMIT_PER_HOUR - Number(counts.requests_last_hour || 0) - 1),
  resetAt: new Date(Date.now() + 60_000).toISOString()
})

const enforceRateLimit = async ({ userId, appSessionId }: { userId: string; appSessionId: string | null }) => {
  const counts = await getRateWindowCounts({ userId, appSessionId })

  if (Number(counts.requests_last_minute || 0) >= APP_RATE_LIMIT_PER_MINUTE) {
    throw new ApiPlatformError('Rate limit exceeded for the current minute window.', {
      statusCode: 429,
      errorCode: 'rate_limited'
    })
  }

  if (Number(counts.requests_last_hour || 0) >= APP_RATE_LIMIT_PER_HOUR) {
    throw new ApiPlatformError('Rate limit exceeded for the current hour window.', {
      statusCode: 429,
      errorCode: 'rate_limited'
    })
  }

  return buildRateLimit(counts)
}

const recordAppLog = async ({
  auditState,
  responseStatus,
  errorCode
}: {
  auditState: AppAuditState
  responseStatus: number
  errorCode: string | null
}) => {
  await recordApiPlatformRequestLog({
    lane: 'app',
    appSessionId: auditState.appSessionId,
    userId: auditState.tenant?.userId ?? null,
    routeKey: auditState.routeKey,
    requestMethod: auditState.requestMethod,
    requestPath: auditState.requestPath,
    responseStatus,
    durationMs: Date.now() - auditState.startedAt,
    rateLimited: responseStatus === 429,
    errorCode,
    clientId: auditState.tenant?.clientId ?? null,
    spaceId: auditState.tenant?.spaceId ?? null,
    organizationId: auditState.tenant?.organizationId ?? null,
    ipHash: auditState.ipHash,
    userAgentHash: auditState.userAgentHash
  }).catch(error => {
    console.warn('[api-platform/app] request log failed:', error instanceof Error ? error.message : error)
  })
}

export const runAppReadRoute = async <T>({
  request,
  routeKey,
  handler
}: {
  request: Request
  routeKey: string
  handler: AppRouteHandler<T>
}) => runAppRoute({ request, routeKey, handler })

export const runAppRoute = async <T>({
  request,
  routeKey,
  handler
}: {
  request: Request
  routeKey: string
  handler: AppRouteHandler<T>
}) => {
  const requestId = randomUUID()
  const url = new URL(request.url)
  let version = DEFAULT_API_PLATFORM_VERSION
  let rateLimit: ApiPlatformRateLimit | undefined

  const auditState: AppAuditState = {
    requestId,
    routeKey,
    requestMethod: request.method.toUpperCase(),
    requestPath: url.pathname,
    ipHash: getApiPlatformIpHash(request),
    userAgentHash: getApiPlatformUserAgentHash(request),
    startedAt: Date.now(),
    tenant: null,
    appSessionId: null
  }

  try {
    version = resolveApiPlatformVersion(request)
    const appContext = await resolveAppTenantContext(request)

    auditState.tenant = appContext.tenant
    auditState.appSessionId = appContext.appSessionId
    rateLimit = await enforceRateLimit({
      userId: appContext.tenant.userId,
      appSessionId: appContext.appSessionId
    })

    const result = await handler({
      requestId,
      routeKey,
      version,
      tenant: appContext.tenant,
      appSessionId: appContext.appSessionId,
      rateLimit
    })

    await recordAppLog({
      auditState,
      responseStatus: result.status ?? 200,
      errorCode: null
    })

    return buildApiPlatformSuccessResponse({
      requestId,
      version,
      data: result.data,
      meta: {
        ...result.meta,
        lane: 'app'
      },
      status: result.status,
      rateLimit
    })
  } catch (error) {
    const normalizedError = normalizeApiPlatformError(error)

    await recordAppLog({
      auditState,
      responseStatus: normalizedError.statusCode,
      errorCode: normalizedError.errorCode
    })

    return buildApiPlatformErrorResponse({
      requestId,
      version,
      error: normalizedError,
      rateLimit
    })
  }
}

export const revokeCurrentAppSession = async (context: AppPlatformRequestContext) => {
  if (!context.appSessionId) {
    throw new ApiPlatformError('Current request is not backed by an app session.', {
      statusCode: 400,
      errorCode: 'missing_session'
    })
  }

  await revokeFirstPartyAppSession({
    sessionId: context.appSessionId,
    userId: context.tenant.userId
  })
}

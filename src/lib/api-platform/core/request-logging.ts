import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import { query } from '@/lib/db'

export type ApiPlatformLane = 'app' | 'ecosystem' | 'internal' | 'public'

export const hashApiPlatformSensitiveValue = (value: string | null) =>
  value ? createHash('sha256').update(value).digest('hex') : null

export const getApiPlatformIpHash = (request: Request) =>
  hashApiPlatformSensitiveValue(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null)

export const getApiPlatformUserAgentHash = (request: Request) =>
  hashApiPlatformSensitiveValue(request.headers.get('user-agent')?.trim() || null)

const buildRequestLogId = () => `EO-APL-${randomUUID().slice(0, 8).toUpperCase()}`

export const recordApiPlatformRequestLog = async ({
  lane,
  appSessionId,
  userId,
  consumerId,
  routeKey,
  requestMethod,
  requestPath,
  responseStatus,
  durationMs,
  rateLimited,
  errorCode,
  clientId,
  spaceId,
  organizationId,
  ipHash,
  userAgentHash
}: {
  lane: ApiPlatformLane
  appSessionId?: string | null
  userId?: string | null
  consumerId?: string | null
  routeKey: string
  requestMethod: string
  requestPath: string
  responseStatus: number
  durationMs: number
  rateLimited?: boolean
  errorCode?: string | null
  clientId?: string | null
  spaceId?: string | null
  organizationId?: string | null
  ipHash?: string | null
  userAgentHash?: string | null
}) => {
  await query(
    `
      INSERT INTO greenhouse_core.api_platform_request_logs (
        api_platform_request_log_id,
        lane,
        app_session_id,
        user_id,
        consumer_id,
        route_key,
        request_method,
        request_path,
        response_status,
        duration_ms,
        rate_limited,
        error_code,
        client_id,
        space_id,
        organization_id,
        ip_hash,
        user_agent_hash,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
      )
    `,
    [
      buildRequestLogId(),
      lane,
      appSessionId ?? null,
      userId ?? null,
      consumerId ?? null,
      routeKey,
      requestMethod,
      requestPath,
      responseStatus,
      Math.max(0, durationMs),
      rateLimited === true,
      errorCode ?? null,
      clientId ?? null,
      spaceId ?? null,
      organizationId ?? null,
      ipHash ?? null,
      userAgentHash ?? null
    ]
  )
}

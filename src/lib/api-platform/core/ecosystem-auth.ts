import 'server-only'

import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import { query } from '@/lib/db'
import { resolveSisterPlatformBinding } from '@/lib/sister-platforms/bindings'
import type {
  SisterPlatformConsumerRecord,
  SisterPlatformConsumerStatus,
  SisterPlatformExternalScopeType,
  SisterPlatformGreenhouseScopeType
} from '@/lib/sister-platforms/types'

import { buildScopeSummary, type ApiPlatformRequestContext, type ApiPlatformSuccessResult } from './context'
import { ApiPlatformError, normalizeApiPlatformError } from './errors'
import { buildApiPlatformErrorResponse, buildApiPlatformSuccessResponse } from './responses'
import { DEFAULT_API_PLATFORM_VERSION, resolveApiPlatformVersion } from './versioning'

type SisterPlatformConsumerRow = {
  consumer_id: string
  public_id: string
  sister_platform_key: string
  consumer_name: string
  consumer_type: SisterPlatformConsumerRecord['consumerType']
  credential_status: SisterPlatformConsumerStatus
  token_prefix: string
  token_hash: string
  hash_algorithm: 'sha256'
  allowed_greenhouse_scope_types: string[] | null
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  expires_at: string | Date | null
  last_used_at: string | Date | null
  notes: string | null
  metadata_json: Record<string, unknown> | null
  created_by_user_id: string | null
  rotated_by_user_id: string | null
  suspended_by_user_id: string | null
  deprecated_by_user_id: string | null
  suspended_at: string | Date | null
  deprecated_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

type ScopeQuery = {
  externalScopeType: SisterPlatformExternalScopeType
  externalScopeId: string
}

type RateWindowCounts = {
  requests_last_minute: number
  requests_last_hour: number
}

type RequestAuditState = {
  requestId: string
  routeKey: string
  requestMethod: string
  requestPath: string
  ipHash: string | null
  userAgentHash: string | null
  startedAt: number
  consumer: SisterPlatformConsumerRecord | null
  externalScopeType: SisterPlatformExternalScopeType | null
  externalScopeId: string | null
  bindingId: string | null
  sisterPlatformKey: string | null
  greenhouseScopeType: SisterPlatformGreenhouseScopeType | null
  organizationId: string | null
  clientId: string | null
  spaceId: string | null
}

type EcosystemRouteHandler<T> = (context: ApiPlatformRequestContext) => Promise<ApiPlatformSuccessResult<T>>

const toIsoString = (value: string | Date | null) => {
  if (!value) return null
  if (typeof value === 'string') return value

  return value.toISOString()
}

const safeEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

const normalizeStringArray = (value: string[] | null | undefined): SisterPlatformGreenhouseScopeType[] => {
  if (!Array.isArray(value)) {
    return ['organization', 'client', 'space', 'internal']
  }

  return value
    .filter((item): item is SisterPlatformGreenhouseScopeType =>
      item === 'organization' || item === 'client' || item === 'space' || item === 'internal'
    )
}

const buildTokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

const buildTokenPrefix = (token: string) => buildTokenHash(token).slice(0, 16)

const hashSensitiveValue = (value: string | null) => (value ? createHash('sha256').update(value).digest('hex') : null)

const extractRequestToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim()

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return request.headers.get('x-greenhouse-sister-platform-key')?.trim() || null
}

const parseScopeQuery = (request: Request): ScopeQuery => {
  const { searchParams } = new URL(request.url)
  const externalScopeType = searchParams.get('externalScopeType')?.trim()
  const externalScopeId = searchParams.get('externalScopeId')?.trim()

  if (!externalScopeType) {
    throw new ApiPlatformError('Missing required query param: externalScopeType', {
      statusCode: 400,
      errorCode: 'missing_external_scope_type'
    })
  }

  if (!externalScopeId) {
    throw new ApiPlatformError('Missing required query param: externalScopeId', {
      statusCode: 400,
      errorCode: 'missing_external_scope_id'
    })
  }

  return {
    externalScopeType: externalScopeType as SisterPlatformExternalScopeType,
    externalScopeId
  }
}

const mapConsumerRow = (row: SisterPlatformConsumerRow): SisterPlatformConsumerRecord => ({
  consumerId: row.consumer_id,
  publicId: row.public_id,
  sisterPlatformKey: row.sister_platform_key,
  consumerName: row.consumer_name,
  consumerType: row.consumer_type,
  credentialStatus: row.credential_status,
  tokenPrefix: row.token_prefix,
  hashAlgorithm: row.hash_algorithm,
  allowedGreenhouseScopeTypes: normalizeStringArray(row.allowed_greenhouse_scope_types),
  rateLimitPerMinute: Number(row.rate_limit_per_minute || 0),
  rateLimitPerHour: Number(row.rate_limit_per_hour || 0),
  expiresAt: toIsoString(row.expires_at),
  lastUsedAt: toIsoString(row.last_used_at),
  notes: row.notes,
  metadata: row.metadata_json ?? {},
  createdByUserId: row.created_by_user_id,
  rotatedByUserId: row.rotated_by_user_id,
  suspendedByUserId: row.suspended_by_user_id,
  deprecatedByUserId: row.deprecated_by_user_id,
  suspendedAt: toIsoString(row.suspended_at),
  deprecatedAt: toIsoString(row.deprecated_at),
  createdAt: toIsoString(row.created_at) || new Date(0).toISOString(),
  updatedAt: toIsoString(row.updated_at) || new Date(0).toISOString()
})

const loadConsumerByToken = async (token: string) => {
  const tokenHash = buildTokenHash(token)
  const tokenPrefix = buildTokenPrefix(token)

  const result = await query<SisterPlatformConsumerRow>(
    `
      SELECT
        sister_platform_consumer_id AS consumer_id,
        public_id,
        sister_platform_key,
        consumer_name,
        consumer_type,
        credential_status,
        token_prefix,
        token_hash,
        hash_algorithm,
        allowed_greenhouse_scope_types,
        rate_limit_per_minute,
        rate_limit_per_hour,
        expires_at,
        last_used_at,
        notes,
        metadata_json,
        created_by_user_id,
        rotated_by_user_id,
        suspended_by_user_id,
        deprecated_by_user_id,
        suspended_at,
        deprecated_at,
        created_at,
        updated_at
      FROM greenhouse_core.sister_platform_consumers
      WHERE token_prefix = $1
    `,
    [tokenPrefix]
  )

  const row = result.find(candidate => safeEquals(candidate.token_hash, tokenHash))

  return row ? mapConsumerRow(row) : null
}

const authenticateConsumer = async (request: Request) => {
  const token = extractRequestToken(request)

  if (!token) {
    throw new ApiPlatformError('Unauthorized', {
      statusCode: 401,
      errorCode: 'missing_token'
    })
  }

  const consumer = await loadConsumerByToken(token)

  if (!consumer) {
    throw new ApiPlatformError('Unauthorized', {
      statusCode: 401,
      errorCode: 'invalid_token'
    })
  }

  if (consumer.credentialStatus !== 'active') {
    throw new ApiPlatformError('Consumer credential is not active.', {
      statusCode: 403,
      errorCode: 'consumer_not_active'
    })
  }

  if (consumer.expiresAt && new Date(consumer.expiresAt).getTime() <= Date.now()) {
    throw new ApiPlatformError('Consumer credential has expired.', {
      statusCode: 403,
      errorCode: 'consumer_expired'
    })
  }

  return consumer
}

const enforceScopeAccess = ({
  consumer,
  greenhouseScopeType
}: {
  consumer: SisterPlatformConsumerRecord
  greenhouseScopeType: SisterPlatformGreenhouseScopeType
}) => {
  if (!consumer.allowedGreenhouseScopeTypes.includes(greenhouseScopeType)) {
    throw new ApiPlatformError('Resolved binding scope is not allowed for this consumer.', {
      statusCode: 403,
      errorCode: 'scope_not_allowed'
    })
  }
}

const getRateWindowCounts = async (consumerId: string) => {
  const result = await query<RateWindowCounts>(
    `
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN 1 ELSE 0 END), 0) AS requests_last_minute,
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour' THEN 1 ELSE 0 END), 0) AS requests_last_hour
      FROM greenhouse_core.sister_platform_request_logs
      WHERE sister_platform_consumer_id = $1
    `,
    [consumerId]
  )

  return result[0] ?? {
    requests_last_minute: 0,
    requests_last_hour: 0
  }
}

const enforceRateLimit = async (consumer: SisterPlatformConsumerRecord) => {
  const counts = await getRateWindowCounts(consumer.consumerId)

  if (Number(counts.requests_last_minute || 0) >= consumer.rateLimitPerMinute) {
    throw new ApiPlatformError('Rate limit exceeded for the current minute window.', {
      statusCode: 429,
      errorCode: 'rate_limited'
    })
  }

  if (Number(counts.requests_last_hour || 0) >= consumer.rateLimitPerHour) {
    throw new ApiPlatformError('Rate limit exceeded for the current hour window.', {
      statusCode: 429,
      errorCode: 'rate_limited'
    })
  }
}

const recordRequestLog = async ({
  auditState,
  responseStatus,
  errorCode
}: {
  auditState: RequestAuditState
  responseStatus: number
  errorCode: string | null
}) => {
  const durationMs = Math.max(0, Date.now() - auditState.startedAt)

  await query(
    `
      INSERT INTO greenhouse_core.sister_platform_request_logs (
        sister_platform_request_log_id,
        sister_platform_consumer_id,
        sister_platform_binding_id,
        sister_platform_key,
        external_scope_type,
        external_scope_id,
        greenhouse_scope_type,
        organization_id,
        client_id,
        space_id,
        request_method,
        request_path,
        route_key,
        response_status,
        duration_ms,
        rate_limited,
        error_code,
        ip_hash,
        user_agent_hash,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
      )
    `,
    [
      auditState.requestId,
      auditState.consumer?.consumerId ?? null,
      auditState.bindingId,
      auditState.sisterPlatformKey,
      auditState.externalScopeType,
      auditState.externalScopeId,
      auditState.greenhouseScopeType,
      auditState.organizationId,
      auditState.clientId,
      auditState.spaceId,
      auditState.requestMethod,
      auditState.requestPath,
      auditState.routeKey,
      responseStatus,
      durationMs,
      responseStatus === 429,
      errorCode,
      auditState.ipHash,
      auditState.userAgentHash
    ]
  )

  if (auditState.consumer?.consumerId) {
    await query(
      `
        UPDATE greenhouse_core.sister_platform_consumers
        SET
          last_used_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE sister_platform_consumer_id = $1
      `,
      [auditState.consumer.consumerId]
    )
  }
}

const resolveBinding = async ({
  consumer,
  scopeQuery
}: {
  consumer: SisterPlatformConsumerRecord
  scopeQuery: ScopeQuery
}) => {
  const binding = await resolveSisterPlatformBinding({
    sisterPlatformKey: consumer.sisterPlatformKey,
    externalScopeType: scopeQuery.externalScopeType,
    externalScopeId: scopeQuery.externalScopeId
  })

  if (!binding) {
    throw new ApiPlatformError('No active sister platform binding found for the provided external scope.', {
      statusCode: 404,
      errorCode: 'binding_not_found'
    })
  }

  if (binding.bindingStatus !== 'active') {
    throw new ApiPlatformError('Resolved sister platform binding is not active.', {
      statusCode: 403,
      errorCode: 'binding_not_active'
    })
  }

  enforceScopeAccess({
    consumer,
    greenhouseScopeType: binding.greenhouseScopeType
  })

  return binding
}

export const runEcosystemReadRoute = async <T>({
  request,
  routeKey,
  handler
}: {
  request: Request
  routeKey: string
  handler: EcosystemRouteHandler<T>
}) => {
  const requestId = randomUUID()
  const url = new URL(request.url)
  let version = DEFAULT_API_PLATFORM_VERSION

  const auditState: RequestAuditState = {
    requestId,
    routeKey,
    requestMethod: request.method.toUpperCase(),
    requestPath: url.pathname,
    ipHash: hashSensitiveValue(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null),
    userAgentHash: hashSensitiveValue(request.headers.get('user-agent')?.trim() || null),
    startedAt: Date.now(),
    consumer: null,
    externalScopeType: null,
    externalScopeId: null,
    bindingId: null,
    sisterPlatformKey: null,
    greenhouseScopeType: null,
    organizationId: null,
    clientId: null,
    spaceId: null
  }

  try {
    version = resolveApiPlatformVersion(request)

    const scopeQuery = parseScopeQuery(request)
    const consumer = await authenticateConsumer(request)

    const binding = await resolveBinding({
      consumer,
      scopeQuery
    })

    auditState.consumer = consumer
    auditState.externalScopeType = scopeQuery.externalScopeType
    auditState.externalScopeId = scopeQuery.externalScopeId
    auditState.bindingId = binding.bindingId
    auditState.sisterPlatformKey = binding.sisterPlatformKey
    auditState.greenhouseScopeType = binding.greenhouseScopeType
    auditState.organizationId = binding.organizationId
    auditState.clientId = binding.clientId
    auditState.spaceId = binding.spaceId

    await enforceRateLimit(consumer)

    const result = await handler({
      requestId,
      routeKey,
      version,
      consumer,
      binding,
      rateLimit: {
        limitPerMinute: consumer.rateLimitPerMinute,
        limitPerHour: consumer.rateLimitPerHour
      }
    })

    await recordRequestLog({
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
        scope: buildScopeSummary(binding)
      },
      status: result.status,
      rateLimit: {
        limitPerMinute: consumer.rateLimitPerMinute,
        limitPerHour: consumer.rateLimitPerHour
      }
    })
  } catch (error) {
    const normalizedError = normalizeApiPlatformError(error)

    await recordRequestLog({
      auditState,
      responseStatus: normalizedError.statusCode,
      errorCode: normalizedError.errorCode
    })

    return buildApiPlatformErrorResponse({
      requestId,
      version,
      error: normalizedError,
      rateLimit: auditState.consumer ? {
        limitPerMinute: auditState.consumer.rateLimitPerMinute,
        limitPerHour: auditState.consumer.rateLimitPerHour
      } : undefined
    })
  }
}

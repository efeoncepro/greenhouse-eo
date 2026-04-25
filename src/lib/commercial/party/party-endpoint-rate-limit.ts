import 'server-only'

import { sql } from 'kysely'

import { getDb } from '@/lib/db'

export type PartyEndpointKey = 'search' | 'adopt'

type PartyEndpointRateLimitConfig = {
  maxRequests: number
  windowSeconds: number
}

const PARTY_ENDPOINT_RATE_LIMITS: Record<PartyEndpointKey, PartyEndpointRateLimitConfig> = {
  search: {
    maxRequests: 60,
    windowSeconds: 60
  },
  adopt: {
    maxRequests: 10,
    windowSeconds: 60
  }
}

export interface PartyEndpointRateLimitInput {
  endpointKey: PartyEndpointKey
  userId: string
}

export interface PartyEndpointRequestLogInput {
  endpointKey: PartyEndpointKey
  userId: string
  tenantScope: string
  responseStatus: number
  hubspotCompanyId?: string | null
  queryText?: string | null
  metadata?: Record<string, unknown>
}

export class PartyEndpointRateLimitError extends Error {
  code = 'PARTY_ENDPOINT_RATE_LIMITED'
  statusCode = 429
  retryAfterSeconds: number

  constructor(endpointKey: PartyEndpointKey, retryAfterSeconds: number) {
    super(`Rate limit exceeded for /api/commercial/parties/${endpointKey}.`)
    this.name = 'PartyEndpointRateLimitError'
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export const isPartyEndpointRateLimitError = (
  error: unknown
): error is PartyEndpointRateLimitError => {
  if (!(error instanceof Error) && (typeof error !== 'object' || error === null)) {
    return false
  }

  const candidate = error as Partial<PartyEndpointRateLimitError>

  return (
    candidate.code === 'PARTY_ENDPOINT_RATE_LIMITED' &&
    candidate.statusCode === 429 &&
    typeof candidate.retryAfterSeconds === 'number'
  )
}

const normalizeQueryFingerprint = (queryText?: string | null) => {
  const normalized = queryText?.trim().toLowerCase() ?? ''

  return normalized.length > 0 ? normalized : null
}

export const enforcePartyEndpointRateLimit = async ({
  endpointKey,
  userId
}: PartyEndpointRateLimitInput): Promise<void> => {
  const config = PARTY_ENDPOINT_RATE_LIMITS[endpointKey]
  const db = await getDb()
  const windowStart = new Date(Date.now() - config.windowSeconds * 1000)

  const row = await db
    .selectFrom('greenhouse_commercial.party_endpoint_requests')
    .select(eb => eb.fn.countAll<string>().as('request_count'))
    .where('endpoint_key', '=', endpointKey)
    .where('actor_user_id', '=', userId)
    .where('created_at', '>', windowStart)
    .executeTakeFirst()

  const requestCount = Number(row?.request_count ?? 0)

  if (requestCount >= config.maxRequests) {
    throw new PartyEndpointRateLimitError(endpointKey, config.windowSeconds)
  }
}

export const recordPartyEndpointRequest = async ({
  endpointKey,
  userId,
  tenantScope,
  responseStatus,
  hubspotCompanyId,
  queryText,
  metadata
}: PartyEndpointRequestLogInput): Promise<void> => {
  const db = await getDb()

  await db
    .insertInto('greenhouse_commercial.party_endpoint_requests')
    .values({
      endpoint_key: endpointKey,
      actor_user_id: userId,
      tenant_scope: tenantScope,
      hubspot_company_id: hubspotCompanyId ?? null,
      query_text: queryText ?? null,
      query_fingerprint: normalizeQueryFingerprint(queryText),
      response_status: responseStatus,
      metadata: sql`${JSON.stringify(metadata ?? {})}::jsonb`
    })
    .execute()
}

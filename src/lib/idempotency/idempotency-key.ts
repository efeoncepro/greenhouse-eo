import 'server-only'

import { query } from '@/lib/db'

/**
 * TASK-631 Fase 4 — Postgres-backed idempotency cache.
 *
 * Stripe-style: caller passes `Idempotency-Key` header (UUID); endpoint
 * checks here first; if hit, returns cached response without re-executing
 * side effects. Default TTL 24h.
 *
 * Why Postgres (not Redis/KV):
 * - No new infra dependency (Vercel KV not provisioned).
 * - INSERT ON CONFLICT DO NOTHING gives lock-free dedup.
 * - Cleanup via partial index + GCS-style age policy is enough for our scale.
 * - Postgres is already on the hot path of every request — zero latency cost.
 */

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000  // 24h

const KEY_FORMAT = /^[a-zA-Z0-9_-]{8,128}$/

export class IdempotencyKeyError extends Error {
  readonly code: 'missing' | 'malformed' | 'mismatch'

  constructor(code: 'missing' | 'malformed' | 'mismatch', message: string) {
    super(message)
    this.name = 'IdempotencyKeyError'
    this.code = code
  }
}

interface CachedResponse {
  responseBody: unknown
  responseStatus: number
}

interface CachedRow extends Record<string, unknown> {
  response_body: unknown
  response_status: number
}

/**
 * Validates the Idempotency-Key header and returns the normalized key.
 * Throws IdempotencyKeyError if missing or malformed.
 */
export const requireIdempotencyKey = (request: Request): string => {
  const raw = request.headers.get('idempotency-key')?.trim()

  if (!raw) {
    throw new IdempotencyKeyError(
      'missing',
      'Missing required Idempotency-Key header. Generate via crypto.randomUUID() on the client.'
    )
  }

  if (!KEY_FORMAT.test(raw)) {
    throw new IdempotencyKeyError(
      'malformed',
      'Idempotency-Key must be 8–128 chars, alphanumeric + `_` + `-` only.'
    )
  }

  return raw
}

/**
 * Returns a cached response for this key, or null if no hit (caller should
 * proceed to execute the side effect and call `persistIdempotencyResponse`).
 */
export const lookupIdempotentResponse = async (
  key: string
): Promise<CachedResponse | null> => {
  const rows = await query<CachedRow>(
    `SELECT response_body, response_status
       FROM greenhouse_notifications.idempotency_keys
       WHERE idempotency_key = $1
         AND expires_at > now()
       LIMIT 1`,
    [key]
  )

  const row = rows[0]

  if (!row) return null

  return {
    responseBody: row.response_body,
    responseStatus: Number(row.response_status)
  }
}

interface PersistInput {
  key: string
  endpoint: string
  actorUserId?: string | null
  responseBody: unknown
  responseStatus: number
  ttlMs?: number
}

/**
 * Persists the response to the idempotency cache. INSERT ON CONFLICT DO
 * NOTHING — if two concurrent requests with the same key both miss the
 * lookup (race), only the first INSERT wins; the second silently no-ops
 * and its caller still returns the same response (since it executed the
 * same side effects).
 *
 * For true mutex (only one execution), wrap the side effect in a
 * `withTransaction` + `SELECT FOR UPDATE` on a sentinel row.
 */
export const persistIdempotencyResponse = async (input: PersistInput): Promise<void> => {
  const ttl = input.ttlMs ?? DEFAULT_TTL_MS
  const expiresAt = new Date(Date.now() + ttl).toISOString()

  await query(
    `INSERT INTO greenhouse_notifications.idempotency_keys
         (idempotency_key, endpoint, actor_user_id, response_body, response_status, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [
      input.key,
      input.endpoint,
      input.actorUserId ?? null,
      JSON.stringify(input.responseBody),
      input.responseStatus,
      expiresAt
    ]
  )
}

/**
 * Convenience wrapper for endpoints. Pattern:
 *
 *   const result = await withIdempotency({ request, endpoint, actorUserId }, async () => {
 *     // side effects
 *     return { body, status }
 *   })
 *   return NextResponse.json(result.body, { status: result.status })
 */
export const withIdempotency = async <T>(
  ctx: { request: Request; endpoint: string; actorUserId?: string | null; ttlMs?: number },
  handler: () => Promise<{ body: T; status: number }>
): Promise<{ body: T; status: number; replayed: boolean }> => {
  const key = requireIdempotencyKey(ctx.request)
  const cached = await lookupIdempotentResponse(key)

  if (cached) {
    return {
      body: cached.responseBody as T,
      status: cached.responseStatus,
      replayed: true
    }
  }

  const result = await handler()

  await persistIdempotencyResponse({
    key,
    endpoint: ctx.endpoint,
    actorUserId: ctx.actorUserId ?? null,
    responseBody: result.body,
    responseStatus: result.status,
    ttlMs: ctx.ttlMs
  })

  return { ...result, replayed: false }
}

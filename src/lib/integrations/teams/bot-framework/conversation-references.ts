import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-671 — persistent + in-memory cache for Bot Framework conversation
 * references. Hot-path optimization for the connector dispatcher: avoids
 * walking the regional candidate list (`/teams → /amer → /emea → /apac`) on
 * every send when we already know which region works for this target.
 *
 * Two-tier cache:
 *   1. In-process Map (TTL 5 min) — survives multiple sends in the same
 *      Vercel/Cloud Run container.
 *   2. Postgres `greenhouse_core.teams_bot_conversation_references` —
 *      survives container restarts and is shared across regions.
 *
 * Failure handling:
 *   - On persistent failure (3+ consecutive errors), the dispatcher should
 *     call `markReferenceFailure()` and the next send will skip the cached
 *     serviceUrl and re-discover from the candidate list.
 *   - We never delete rows; archive-by-counter so postmortems can see what
 *     was tried.
 */

const IN_MEMORY_TTL_MS = 5 * 60 * 1_000
const FAILURE_THRESHOLD = 3
const memoryCache = new Map<string, { entry: ConversationReference; expiresAt: number }>()

export type ConversationReferenceKind = 'channel' | 'chat_1on1' | 'chat_group'

export interface ConversationReference {
  referenceKey: string
  serviceUrl: string
  conversationId: string | null
  failureCount: number
  lastFailureReason: string | null
}

/**
 * Build a stable lookup key for a target. Stable across calls — never include
 * a timestamp or correlation id.
 */
export const buildReferenceKey = (
  kind: ConversationReferenceKind,
  parts: { teamId?: string | null; channelId?: string | null; aadObjectId?: string | null; chatId?: string | null }
): string => {
  if (kind === 'channel') {
    return `channel:${parts.teamId || ''}:${parts.channelId || ''}`
  }

  if (kind === 'chat_1on1') {
    return `user:${parts.aadObjectId || ''}`
  }

  return `chat:${parts.chatId || ''}`
}

interface ResolverRow extends Record<string, unknown> {
  reference_key: string
  service_url: string
  conversation_id: string | null
  failure_count: number
  last_failure_reason: string | null
}

const memoryKey = (botAppId: string, referenceKey: string) => `${botAppId}::${referenceKey}`

/**
 * Resolve the cached serviceUrl + conversation id for a target. Returns null
 * if no row exists OR if the cached row has tripped the circuit breaker
 * (failure_count >= FAILURE_THRESHOLD). The dispatcher should use the result
 * as `cachedServiceUrl` on the connector call; if absent it falls back to
 * the regional candidate list.
 */
export const resolveConversationReference = async (
  botAppId: string,
  referenceKey: string,
  options: { now?: () => number; bypassMemoryCache?: boolean } = {}
): Promise<ConversationReference | null> => {
  const now = options.now || Date.now
  const mKey = memoryKey(botAppId, referenceKey)

  if (!options.bypassMemoryCache) {
    const hit = memoryCache.get(mKey)

    if (hit && hit.expiresAt > now()) {
      return hit.entry
    }
  }

  const rows = await runGreenhousePostgresQuery<ResolverRow>(
    `SELECT reference_key, service_url, conversation_id, failure_count, last_failure_reason
       FROM greenhouse_core.teams_bot_conversation_references
      WHERE bot_app_id = $1 AND reference_key = $2
      LIMIT 1`,
    [botAppId, referenceKey]
  )

  const row = rows[0]

  if (!row) {
    memoryCache.delete(mKey)

    return null
  }

  if (row.failure_count >= FAILURE_THRESHOLD) {
    return null
  }

  const entry: ConversationReference = {
    referenceKey: row.reference_key,
    serviceUrl: row.service_url,
    conversationId: row.conversation_id,
    failureCount: row.failure_count,
    lastFailureReason: row.last_failure_reason
  }

  memoryCache.set(mKey, { entry, expiresAt: now() + IN_MEMORY_TTL_MS })

  return entry
}

/**
 * Persist (or upsert) a successful conversation reference. Resets the
 * failure_count to 0 — a successful send healed the circuit. Atomically
 * updates last_used_at and last_success_at.
 */
export const recordReferenceSuccess = async (params: {
  botAppId: string
  azureTenantId: string
  referenceKey: string
  serviceUrl: string
  conversationId: string
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.teams_bot_conversation_references (
       reference_key, bot_app_id, azure_tenant_id,
       service_url, conversation_id,
       last_used_at, last_success_at,
       failure_count, last_failure_reason
     ) VALUES ($1, $2, $3, $4, $5, now(), now(), 0, NULL)
     ON CONFLICT (bot_app_id, reference_key) DO UPDATE SET
       azure_tenant_id = EXCLUDED.azure_tenant_id,
       service_url     = EXCLUDED.service_url,
       conversation_id = EXCLUDED.conversation_id,
       last_used_at    = now(),
       last_success_at = now(),
       failure_count   = 0,
       last_failure_reason = NULL,
       updated_at      = now()`,
    [
      params.referenceKey,
      params.botAppId,
      params.azureTenantId,
      params.serviceUrl,
      params.conversationId
    ]
  )

  memoryCache.set(memoryKey(params.botAppId, params.referenceKey), {
    entry: {
      referenceKey: params.referenceKey,
      serviceUrl: params.serviceUrl,
      conversationId: params.conversationId,
      failureCount: 0,
      lastFailureReason: null
    },
    expiresAt: Date.now() + IN_MEMORY_TTL_MS
  })
}

/**
 * Mark a failure on the cached reference. After FAILURE_THRESHOLD consecutive
 * failures the row is effectively "tripped" — `resolveConversationReference`
 * returns null so the dispatcher re-discovers via the candidate list. Reason
 * is stored REDACTED (caller's responsibility to scrub tokens/PII).
 */
export const markReferenceFailure = async (params: {
  botAppId: string
  referenceKey: string
  redactedReason: string
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_core.teams_bot_conversation_references
        SET failure_count       = failure_count + 1,
            last_failure_at     = now(),
            last_failure_reason = $3,
            updated_at          = now()
      WHERE bot_app_id = $1 AND reference_key = $2`,
    [params.botAppId, params.referenceKey, params.redactedReason.slice(0, 500)]
  )

  // Drop in-memory cache so the next call refetches the (now potentially-tripped) row.
  memoryCache.delete(memoryKey(params.botAppId, params.referenceKey))
}

/** Test-only: clear the in-memory cache. */
export const __resetConversationReferenceCache = () => {
  memoryCache.clear()
}

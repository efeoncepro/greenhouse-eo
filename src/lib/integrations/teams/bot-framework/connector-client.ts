import 'server-only'

import type { TeamsAdaptiveCard } from '../types'

/**
 * TASK-671 — Bot Framework Connector client for Teams proactive messaging.
 *
 * VERIFIED 2026-04-26 by smoke against the live tenant (efeoncepro.com):
 *   - Token audience MUST be `https://api.botframework.com` (not graph.microsoft.com).
 *   - Endpoint MUST be `{serviceUrl}/v3/conversations` where the canonical
 *     serviceUrl for Microsoft Teams in the public commercial cloud is
 *     `https://smba.trafficmanager.net/teams`. Regional variants
 *     (`/amer`, `/emea`, `/apac`) also work for tenants in those regions.
 *   - Microsoft Graph `POST /v1.0/teams/{}/channels/{}/messages` does NOT work
 *     for general bot proactive sends — even with RSC `ChannelMessage.Send.Group`
 *     consented, Graph rejects with `Teamwork.Migrate.All required` because
 *     that scope is reserved for Teams migration scenarios. We learned this
 *     the hard way; do not "fix" the audience back to graph.microsoft.com.
 *
 * Robustness:
 *   - Exponential backoff with jitter on 5xx and 429 (respects Retry-After).
 *   - Bounded total wait (max 3 attempts, ~5 s worst case).
 *   - Per-request timeout via AbortSignal (8s by default).
 *   - Region failover: if the primary serviceUrl returns 404 "Unknown cloud"
 *     we automatically fall back to /amer (most common alternate).
 *   - All errors are typed (GraphTransportError preserves status + truncated body
 *     for the redaction layer in the inbound endpoint to scrub).
 */

const PRIMARY_SERVICE_URL = 'https://smba.trafficmanager.net/teams'

const FALLBACK_SERVICE_URLS = [
  'https://smba.trafficmanager.net/amer',
  'https://smba.trafficmanager.net/emea',
  'https://smba.trafficmanager.net/apac'
]

const REQUEST_TIMEOUT_MS = 8_000
const MAX_ATTEMPTS = 3
const RETRY_BASE_MS = 250
const MAX_RETRY_AFTER_MS = 30_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const jitter = (ms: number) => ms + Math.floor(Math.random() * Math.min(ms, 250))

/**
 * Transport-level error for Bot Framework Connector calls. Despite the legacy
 * name (kept for backwards compatibility with TASK-669 callers), this is NOT
 * Microsoft Graph related. Status and responseBody are pre-truncated for
 * downstream redaction.
 */
export class GraphTransportError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: string
  ) {
    super(message)
    this.name = 'GraphTransportError'
  }
}

interface ConnectorFetchOptions {
  token: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  fetchImpl?: typeof fetch
}

const connectorFetch = async ({
  token,
  method,
  url,
  body,
  fetchImpl
}: ConnectorFetchOptions): Promise<Response> => {
  const fetchFn = fetchImpl || fetch
  let attempt = 0
  let lastError: Error | null = null

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1

    try {
      const response = await fetchFn(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })

      if (response.status === 429) {
        if (attempt < MAX_ATTEMPTS) {
          const retryAfterRaw = Number(response.headers.get('retry-after') || '0')

          const retryAfter =
            Number.isFinite(retryAfterRaw) && retryAfterRaw > 0
              ? Math.min(retryAfterRaw * 1_000, MAX_RETRY_AFTER_MS)
              : null

          const wait = retryAfter ?? jitter(RETRY_BASE_MS * Math.pow(4, attempt - 1))

          await sleep(wait)
          continue
        }

        const text = await response.text().catch(() => '')

        throw new GraphTransportError(
          `Bot Framework rate limited (429) after ${attempt} attempts at ${url}`,
          429,
          text.slice(0, 500)
        )
      }

      if (response.status >= 500 && response.status < 600 && attempt < MAX_ATTEMPTS) {
        await sleep(jitter(RETRY_BASE_MS * Math.pow(4, attempt - 1)))
        continue
      }

      return response
    } catch (error) {
      if (error instanceof GraphTransportError) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_ATTEMPTS) {
        await sleep(jitter(RETRY_BASE_MS * Math.pow(4, attempt - 1)))
      }
    }
  }

  throw new GraphTransportError(
    `Bot Framework Connector request failed after ${MAX_ATTEMPTS} attempts at ${url}: ${lastError?.message || 'unknown error'}`
  )
}

const buildAttachmentActivity = (card: TeamsAdaptiveCard) => ({
  type: 'message',
  attachments: [
    {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: card
    }
  ]
})

interface PostMessageResult {
  /** Activity id of the posted message (Connector returns it as `activityId`). */
  messageId: string
  /**
   * Conversation reference id returned by the connector. For team channel posts
   * this matches `{channelId};messageid={timestamp}`.
   */
  conversationId: string
  /** ServiceUrl that succeeded. Cache this for faster subsequent sends. */
  serviceUrl: string
}

const RESOURCE_RESPONSE_LIKE = (json: unknown): { id?: string; activityId?: string } => {
  if (json && typeof json === 'object') {
    return json as { id?: string; activityId?: string }
  }

  return {}
}

const dedupeServiceUrls = (preferred: string | null | undefined): string[] =>
  [preferred, PRIMARY_SERVICE_URL, ...FALLBACK_SERVICE_URLS].filter(
    (value, index, arr) => Boolean(value) && arr.indexOf(value) === index
  ) as string[]

interface PostChannelParams {
  token: string
  /** Tenant id (Azure AD) for the team — required by Connector channelData. */
  tenantId: string
  /** Microsoft Teams team id. Used optionally inside channelData; can be empty. */
  teamId?: string | null
  /** Channel thread id (`19:...@thread.tacv2`). */
  channelId: string
  /** The Adaptive Card 1.5 to post. */
  card: TeamsAdaptiveCard
  /** Pre-resolved serviceUrl from a cached conversation reference. Avoids the
   *  region failover loop on hot path. */
  cachedServiceUrl?: string | null
  fetchImpl?: typeof fetch
}

const tryPostChannel = async (
  serviceUrl: string,
  { token, tenantId, teamId, channelId, card, fetchImpl }: PostChannelParams
): Promise<{ ok: true; result: PostMessageResult } | { ok: false; status: number; body: string }> => {
  const url = `${serviceUrl}/v3/conversations`

  const channelData: Record<string, unknown> = {
    channel: { id: channelId },
    tenant: { id: tenantId }
  }

  if (teamId) {
    channelData.team = { id: teamId }
  }

  const body = {
    isGroup: true,
    channelData,
    activity: buildAttachmentActivity(card)
  }

  const response = await connectorFetch({ token, method: 'POST', url, body, fetchImpl })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    return { ok: false, status: response.status, body: text.slice(0, 500) }
  }

  const json = RESOURCE_RESPONSE_LIKE(await response.json().catch(() => ({})))
  const conversationId = json.id || ''
  const activityId = json.activityId || conversationId.split(';messageid=')[1] || ''

  return {
    ok: true,
    result: { messageId: activityId, conversationId, serviceUrl }
  }
}

/**
 * POST `{serviceUrl}/v3/conversations` to create a new conversation in a Teams
 * channel and post the Adaptive Card as the first activity.
 *
 * Robustness:
 *   - If `cachedServiceUrl` is provided we try it first (hot path).
 *   - Otherwise we try PRIMARY_SERVICE_URL (`/teams`) then walk through the
 *     regional fallbacks until one returns 2xx, or we exhaust them and throw.
 *   - "Unknown cloud" 404s are not real errors — they only mean we picked the
 *     wrong region. Other non-2xx responses propagate immediately.
 */
export const postChannelMessage = async (
  params: PostChannelParams
): Promise<PostMessageResult> => {
  const candidates = dedupeServiceUrls(params.cachedServiceUrl)
  let lastFailure: { status: number; body: string; serviceUrl: string } | null = null

  for (const serviceUrl of candidates) {
    const attempt = await tryPostChannel(serviceUrl, params)

    if (attempt.ok) {
      return attempt.result
    }

    lastFailure = { status: attempt.status, body: attempt.body, serviceUrl }

    if (attempt.status === 404 && attempt.body.includes('Unknown cloud')) {
      continue
    }

    throw new GraphTransportError(
      `postChannelMessage ${attempt.status} at ${serviceUrl}`,
      attempt.status,
      attempt.body
    )
  }

  throw new GraphTransportError(
    `postChannelMessage exhausted region candidates without success (last status=${lastFailure?.status ?? 'n/a'})`,
    lastFailure?.status,
    lastFailure?.body
  )
}

interface PostChatParams {
  token: string
  tenantId: string
  /** Existing 1:1 or group chat id. */
  chatId: string
  card: TeamsAdaptiveCard
  cachedServiceUrl?: string | null
  fetchImpl?: typeof fetch
}

/**
 * POST a card into an existing chat (1:1 or group). Connector's chat path is
 * the same `{serviceUrl}/v3/conversations/{chatId}/activities` shape.
 */
export const postChatMessage = async (params: PostChatParams): Promise<PostMessageResult> => {
  const candidates = dedupeServiceUrls(params.cachedServiceUrl)

  for (const serviceUrl of candidates) {
    const url = `${serviceUrl}/v3/conversations/${encodeURIComponent(params.chatId)}/activities`

    const response = await connectorFetch({
      token: params.token,
      method: 'POST',
      url,
      body: buildAttachmentActivity(params.card),
      fetchImpl: params.fetchImpl
    })

    if (response.ok) {
      const json = RESOURCE_RESPONSE_LIKE(await response.json().catch(() => ({})))

      return {
        messageId: json.id || '',
        conversationId: params.chatId,
        serviceUrl
      }
    }

    if (response.status === 404) {
      const text = await response.text().catch(() => '')

      if (text.includes('Unknown cloud')) {
        continue
      }

      throw new GraphTransportError(`postChatMessage 404 at ${serviceUrl}`, 404, text.slice(0, 500))
    }

    const text = await response.text().catch(() => '')

    throw new GraphTransportError(
      `postChatMessage ${response.status} at ${serviceUrl}`,
      response.status,
      text.slice(0, 500)
    )
  }

  throw new GraphTransportError('postChatMessage exhausted region candidates')
}

interface CreateOneOnOneParams {
  token: string
  tenantId: string
  /** Microsoft Graph user id (aadObjectId) of the recipient human. */
  recipientUserId: string
  /** Optional: cached serviceUrl from a prior successful send to this user. */
  cachedServiceUrl?: string | null
  fetchImpl?: typeof fetch
}

/**
 * Create a 1:1 conversation between the bot and the recipient user via the
 * Bot Framework Connector. Returns the chat id which the caller can then use
 * with postChatMessage. The Connector resolves the bot's identity from the
 * token's `appid` claim — we don't need to send our own bot user id.
 *
 * NOTE: the recipient must have Greenhouse installed in their personal scope.
 * If they don't, the Connector returns 403 and we surface
 * `recipient_not_in_tenant` (the dispatcher decides whether to call
 * `installBotForUser` first via Graph).
 */
export const getOrCreateOneOnOneChat = async (
  params: CreateOneOnOneParams
): Promise<{ chatId: string; serviceUrl: string }> => {
  const candidates = dedupeServiceUrls(params.cachedServiceUrl)

  for (const serviceUrl of candidates) {
    const url = `${serviceUrl}/v3/conversations`

    const body = {
      bot: { id: '', name: '' },
      members: [{ id: `29:${params.recipientUserId}` }],
      tenantId: params.tenantId,
      channelData: { tenant: { id: params.tenantId } }
    }

    const response = await connectorFetch({
      token: params.token,
      method: 'POST',
      url,
      body,
      fetchImpl: params.fetchImpl
    })

    if (response.ok) {
      const json = RESOURCE_RESPONSE_LIKE(await response.json().catch(() => ({})))

      if (!json.id) {
        throw new GraphTransportError('getOrCreateOneOnOneChat returned no chat id')
      }

      return { chatId: json.id, serviceUrl }
    }

    if (response.status === 404) {
      const text = await response.text().catch(() => '')

      if (text.includes('Unknown cloud')) {
        continue
      }

      throw new GraphTransportError(
        `getOrCreateOneOnOneChat 404 at ${serviceUrl}`,
        404,
        text.slice(0, 500)
      )
    }

    const text = await response.text().catch(() => '')

    throw new GraphTransportError(
      `getOrCreateOneOnOneChat ${response.status} at ${serviceUrl}`,
      response.status,
      text.slice(0, 500)
    )
  }

  throw new GraphTransportError('getOrCreateOneOnOneChat exhausted region candidates')
}

/**
 * Lookup a Microsoft Graph user by email. Used by the recipient resolver as
 * the LAST fallback when neither members.teams_user_id nor
 * client_users.microsoft_oid is populated.
 *
 * NOTE: This still needs a Microsoft Graph token (audience graph.microsoft.com,
 * scope User.Read.All) — NOT a Bot Framework token. The token-cache exposes
 * `acquireGraphToken` for this purpose. We accept the token as a parameter
 * so this client stays stateless.
 */
export const findUserByEmail = async ({
  graphToken,
  email,
  fetchImpl
}: {
  graphToken: string
  email: string
  fetchImpl?: typeof fetch
}): Promise<{ userId: string; displayName: string | null } | null> => {
  if (!email || typeof email !== 'string') return null

  const safeEmail = email.replace(/'/g, "''")
  const url = `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(`mail eq '${safeEmail}'`)}&$select=id,displayName`

  const response = await connectorFetch({
    token: graphToken,
    method: 'GET',
    url,
    fetchImpl
  })

  if (!response.ok) {
    return null
  }

  const json = (await response.json().catch(() => ({}))) as {
    value?: Array<{ id?: string; displayName?: string | null }>
  }

  const first = json.value?.[0]

  if (!first?.id) return null

  return { userId: first.id, displayName: first.displayName ?? null }
}

/**
 * @deprecated TASK-671 lesson: app installation in a team should be triggered
 * via Microsoft Graph (with delegated AppCatalog scopes), not via Connector.
 * Kept here as a stub so existing imports from the original sender don't
 * break; it always throws if called.
 */
export const installBotForUser = async (): Promise<{ alreadyInstalled: boolean }> => {
  throw new GraphTransportError(
    'installBotForUser requires Microsoft Graph delegated AppCatalog scopes; not supported via Bot Framework Connector. Use Teams Admin Center or per-user Graph install with admin consent.'
  )
}

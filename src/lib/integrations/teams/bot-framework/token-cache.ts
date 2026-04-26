import 'server-only'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-671 — OAuth2 client_credentials token cache for the Greenhouse Teams Bot.
 *
 * The bot mints app-only tokens against `login.microsoftonline.com/{tenantId}`
 * for two distinct audiences:
 *
 *  1. `https://api.botframework.com/.default` (DEFAULT for proactive sends).
 *     Used by the Bot Framework Connector path:
 *       - POST {serviceUrl}/v3/conversations              (create channel/chat conv)
 *       - POST {serviceUrl}/v3/conversations/{id}/activities (post in existing conv)
 *
 *  2. `https://graph.microsoft.com/.default`. Used ONLY for ancillary lookups:
 *       - GET /v1.0/users?$filter=mail eq … (recipient resolver email fallback)
 *       - POST /v1.0/users/{userId}/teamwork/installedApps (auto-install for DM target)
 *     (Channel/chat sends via Graph DO NOT WORK — see connector-client.ts.)
 *
 * Tokens are cached in-process per (tenantId, clientId, audience) tuple with a
 * 60 s safety margin before expiry. The cache is intentionally NOT shared
 * across Vercel function invocations (each cold start mints a fresh pair;
 * warm starts reuse it). On Cloud Run the cache lives for the container
 * lifetime which is long enough to amortize.
 *
 * We deliberately persist NOTHING to disk and never log the token value. The
 * BotFrameworkTokenError class carries response status + a 500-byte truncated
 * body for the redaction layer (see `redactSensitive` in observability/).
 */

const DEFAULT_BOT_AUDIENCE = 'https://api.botframework.com/.default'
const DEFAULT_GRAPH_AUDIENCE = 'https://graph.microsoft.com/.default'
const SAFETY_MARGIN_MS = 60_000
const TOKEN_REQUEST_TIMEOUT_MS = 8_000

const cache = new Map<string, { token: string; expiresAt: number }>()

const cacheKey = (tenantId: string, clientId: string, scope: string) =>
  `${tenantId}::${clientId}::${scope}`

export class BotFrameworkTokenError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: string
  ) {
    super(message)
    this.name = 'BotFrameworkTokenError'
  }
}

export interface BotFrameworkSecretBlob {
  clientId: string
  clientSecret: string
  tenantId: string
}

/**
 * Reads the secret stored in `secret_ref` and parses it as a JSON blob with
 * `{ clientId, clientSecret, tenantId }`. The blob shape lets us rotate
 * clientSecret without touching the channel row, and lets us swap to a
 * federated assertion later without an API change.
 *
 * Returns null if:
 *   - The secret is missing or empty in GCP Secret Manager.
 *   - The blob is not valid JSON.
 *   - Any of the 3 required keys is missing.
 *
 * NEVER returns the secret value to a logger or to the caller — it goes
 * straight to acquireBotFrameworkToken which uses it once.
 */
export const readBotFrameworkSecret = async (
  secretRef: string
): Promise<BotFrameworkSecretBlob | null> => {
  const raw = await resolveSecretByRef(secretRef)

  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<BotFrameworkSecretBlob>

    if (!parsed.clientId || !parsed.clientSecret || !parsed.tenantId) {
      return null
    }

    return {
      clientId: parsed.clientId,
      clientSecret: parsed.clientSecret,
      tenantId: parsed.tenantId
    }
  } catch {
    return null
  }
}

interface MintParams {
  tenantId: string
  clientId: string
  clientSecret: string
  /** Audience scope. Defaults to Bot Framework. */
  scope?: string
  fetchImpl?: typeof fetch
  now?: () => number
}

const mintToken = async (params: MintParams, scope: string): Promise<string> => {
  const { tenantId, clientId, clientSecret } = params
  const fetchImpl = params.fetchImpl || fetch
  const now = params.now || Date.now

  const key = cacheKey(tenantId, clientId, scope)
  const cached = cache.get(key)

  if (cached && cached.expiresAt - SAFETY_MARGIN_MS > now()) {
    return cached.token
  }

  const url = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope,
    grant_type: 'client_credentials'
  })

  let response: Response

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    throw new BotFrameworkTokenError(
      `client_credentials request failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new BotFrameworkTokenError(
      `Token endpoint returned ${response.status} for scope=${scope}`,
      response.status,
      text.slice(0, 500)
    )
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number }

  if (!json.access_token || typeof json.expires_in !== 'number') {
    throw new BotFrameworkTokenError('Token response missing access_token or expires_in')
  }

  const expiresAt = now() + json.expires_in * 1_000

  cache.set(key, { token: json.access_token, expiresAt })

  return json.access_token
}

/**
 * Acquires (or returns cached) Bot Framework Connector token. Use this for
 * all proactive sends to channels and chats via smba.trafficmanager.net.
 *
 * Default scope is `https://api.botframework.com/.default` — callers should
 * NOT override unless they really know what they're doing.
 */
export const acquireBotFrameworkToken = async (params: MintParams): Promise<string> =>
  mintToken(params, params.scope || DEFAULT_BOT_AUDIENCE)

/**
 * Acquires (or returns cached) Microsoft Graph token. Use this ONLY for
 * ancillary lookups (find user by email, install bot for user) — NOT for
 * sending channel/chat messages (Graph rejects those for general bots; see
 * connector-client.ts header comment).
 */
export const acquireGraphToken = async (
  params: Omit<MintParams, 'scope'>
): Promise<string> => mintToken(params, DEFAULT_GRAPH_AUDIENCE)

/** Test-only: clear the in-memory cache. */
export const __resetBotFrameworkTokenCache = () => {
  cache.clear()
}

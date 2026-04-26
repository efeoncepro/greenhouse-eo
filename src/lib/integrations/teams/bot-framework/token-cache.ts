import 'server-only'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

/**
 * TASK-671 — OAuth2 client_credentials token cache for the Greenhouse Teams Bot.
 *
 * The bot mints an app-only token against `login.microsoftonline.com/{tenant}`
 * with scope `https://graph.microsoft.com/.default` and uses it to:
 *  - POST to /teams/{teamId}/channels/{channelId}/messages
 *  - POST to /chats/{chatId}/messages
 *  - POST to /chats (create 1:1)
 *  - POST to /users/{userId}/teamwork/installedApps
 *
 * Tokens are cached in-process per (tenantId, clientId) tuple with a 60s safety margin
 * before expiry. The cache is intentionally NOT shared across function invocations on
 * Vercel (each cold start mints a fresh token; warm starts reuse it).
 */

const SAFETY_MARGIN_MS = 60_000
const cache = new Map<string, { token: string; expiresAt: number }>()

const cacheKey = (tenantId: string, clientId: string) => `${tenantId}::${clientId}`

export class BotFrameworkTokenError extends Error {
  constructor(message: string, public readonly status?: number, public readonly responseBody?: string) {
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
 * `{ clientId, clientSecret, tenantId }`. The blob shape lets us rotate clientSecret
 * without touching the channel row, and lets us federate (e.g. swap clientSecret for
 * a federatedAssertion) later without an API change.
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
  scope?: string
  fetchImpl?: typeof fetch
  now?: () => number
}

/**
 * Acquires (or returns cached) bot framework token. Resolves to a JWT string suitable
 * for the `Authorization: Bearer …` header on Microsoft Graph requests.
 */
export const acquireBotFrameworkToken = async (params: MintParams): Promise<string> => {
  const { tenantId, clientId, clientSecret } = params
  const scope = params.scope || 'https://graph.microsoft.com/.default'
  const fetchImpl = params.fetchImpl || fetch
  const now = params.now || Date.now

  const key = cacheKey(tenantId, clientId)
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
      signal: AbortSignal.timeout(8_000)
    })
  } catch (error) {
    throw new BotFrameworkTokenError(
      `client_credentials request failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new BotFrameworkTokenError(
      `Token endpoint returned ${response.status}`,
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

/** Test-only: clear the in-memory cache. */
export const __resetBotFrameworkTokenCache = () => {
  cache.clear()
}

import 'server-only'

import type { TeamsAdaptiveCard } from '../types'

/**
 * TASK-671 — minimal Microsoft Graph client for Teams Bot operations.
 *
 * We deliberately do NOT depend on `botbuilder` or `@microsoft/microsoft-graph-client`.
 * The endpoints used by the bot (post to channel, post to chat, create 1:1 chat,
 * install bot for a user) are stable and well documented; native fetch + the existing
 * jose-based JWT validation pattern (see `webhooks/signing.ts`, `entra/graph-client.ts`)
 * keeps the bundle size lean for Vercel + Cloud Run runtimes.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'
const REQUEST_TIMEOUT_MS = 10_000
const MAX_ATTEMPTS = 3
const RETRY_BASE_MS = 250

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

interface GraphFetchOptions {
  token: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: unknown
  fetchImpl?: typeof fetch
}

const graphFetch = async ({ token, method, url, body, fetchImpl }: GraphFetchOptions): Promise<Response> => {
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
          const retryAfter = Number(response.headers.get('retry-after') || '0')
          const wait = retryAfter > 0 ? retryAfter * 1_000 : RETRY_BASE_MS * Math.pow(4, attempt - 1)

          await sleep(wait)
          continue
        }

        const text = await response.text().catch(() => '')

        throw new GraphTransportError(
          `Graph API rate limited (429) after ${attempt} attempts at ${url}`,
          429,
          text.slice(0, 500)
        )
      }

      if (response.status >= 500 && response.status < 600 && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * Math.pow(4, attempt - 1))
        continue
      }

      return response
    } catch (error) {
      if (error instanceof GraphTransportError) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * Math.pow(4, attempt - 1))
      }
    }
  }

  throw new GraphTransportError(
    `Graph API request failed after ${MAX_ATTEMPTS} attempts at ${url}: ${lastError?.message || 'unknown error'}`
  )
}

const buildAttachmentBody = (card: TeamsAdaptiveCard) => ({
  body: {
    contentType: 'html',
    content: '<attachment id="1"></attachment>'
  },
  attachments: [
    {
      id: '1',
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: JSON.stringify(card)
    }
  ]
})

interface PostMessageResult {
  messageId: string
}

/**
 * POST /v1.0/teams/{teamId}/channels/{channelId}/messages
 */
export const postChannelMessage = async ({
  token,
  teamId,
  channelId,
  card,
  fetchImpl
}: {
  token: string
  teamId: string
  channelId: string
  card: TeamsAdaptiveCard
  fetchImpl?: typeof fetch
}): Promise<PostMessageResult> => {
  const url = `${GRAPH_BASE}/teams/${encodeURIComponent(teamId)}/channels/${encodeURIComponent(channelId)}/messages`

  const response = await graphFetch({
    token,
    method: 'POST',
    url,
    body: buildAttachmentBody(card),
    fetchImpl
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new GraphTransportError(`postChannelMessage ${response.status}`, response.status, text.slice(0, 500))
  }

  const json = (await response.json()) as { id?: string }

  return { messageId: json.id || '' }
}

/**
 * POST /v1.0/chats/{chatId}/messages
 */
export const postChatMessage = async ({
  token,
  chatId,
  card,
  fetchImpl
}: {
  token: string
  chatId: string
  card: TeamsAdaptiveCard
  fetchImpl?: typeof fetch
}): Promise<PostMessageResult> => {
  const url = `${GRAPH_BASE}/chats/${encodeURIComponent(chatId)}/messages`

  const response = await graphFetch({
    token,
    method: 'POST',
    url,
    body: buildAttachmentBody(card),
    fetchImpl
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new GraphTransportError(`postChatMessage ${response.status}`, response.status, text.slice(0, 500))
  }

  const json = (await response.json()) as { id?: string }

  return { messageId: json.id || '' }
}

/**
 * POST /v1.0/chats
 *
 * Creates (or finds) a 1:1 chat between the bot's app user and the recipient
 * Microsoft Graph user. Idempotent: returns the same chatId for the same pair.
 *
 * `botUserId` here is the Microsoft Graph user that backs the bot's service principal.
 * For a bot deployed via the Bot Service this is typically the bot app's
 * teamsBot app member; for now we accept it as a parameter.
 */
export const getOrCreateOneOnOneChat = async ({
  token,
  botUserId,
  recipientUserId,
  fetchImpl
}: {
  token: string
  botUserId: string
  recipientUserId: string
  fetchImpl?: typeof fetch
}): Promise<{ chatId: string }> => {
  const url = `${GRAPH_BASE}/chats`

  const body = {
    chatType: 'oneOnOne',
    members: [
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `${GRAPH_BASE}/users/${encodeURIComponent(botUserId)}`
      },
      {
        '@odata.type': '#microsoft.graph.aadUserConversationMember',
        roles: ['owner'],
        'user@odata.bind': `${GRAPH_BASE}/users/${encodeURIComponent(recipientUserId)}`
      }
    ]
  }

  const response = await graphFetch({
    token,
    method: 'POST',
    url,
    body,
    fetchImpl
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new GraphTransportError(`getOrCreateOneOnOneChat ${response.status}`, response.status, text.slice(0, 500))
  }

  const json = (await response.json()) as { id?: string }

  if (!json.id) {
    throw new GraphTransportError('getOrCreateOneOnOneChat returned no chat id')
  }

  return { chatId: json.id }
}

/**
 * POST /v1.0/users/{userId}/teamwork/installedApps
 *
 * Installs the Greenhouse bot for a user so we can DM them. Requires
 * `TeamsAppInstallation.ReadWriteForUser.All` admin consent.
 *
 * Idempotent at the API level: 409 means already installed and is treated as success.
 */
export const installBotForUser = async ({
  token,
  recipientUserId,
  teamsAppId,
  fetchImpl
}: {
  token: string
  recipientUserId: string
  teamsAppId: string
  fetchImpl?: typeof fetch
}): Promise<{ alreadyInstalled: boolean }> => {
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(recipientUserId)}/teamwork/installedApps`

  const body = {
    'teamsApp@odata.bind': `${GRAPH_BASE}/appCatalogs/teamsApps/${encodeURIComponent(teamsAppId)}`
  }

  const response = await graphFetch({
    token,
    method: 'POST',
    url,
    body,
    fetchImpl
  })

  if (response.status === 409) {
    return { alreadyInstalled: true }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new GraphTransportError(`installBotForUser ${response.status}`, response.status, text.slice(0, 500))
  }

  return { alreadyInstalled: false }
}

/**
 * GET /v1.0/users?$filter=mail eq '{email}'
 *
 * Used by the recipient resolver as the last fallback when neither
 * `members.teams_user_id` nor `client_users.microsoft_oid` is populated.
 */
export const findUserByEmail = async ({
  token,
  email,
  fetchImpl
}: {
  token: string
  email: string
  fetchImpl?: typeof fetch
}): Promise<{ userId: string; displayName: string | null } | null> => {
  const url = `${GRAPH_BASE}/users?$filter=${encodeURIComponent(`mail eq '${email}'`)}&$select=id,displayName`
  const response = await graphFetch({ token, method: 'GET', url, fetchImpl })

  if (!response.ok) {
    return null
  }

  const json = (await response.json()) as {
    value?: Array<{ id?: string; displayName?: string | null }>
  }

  const first = json.value?.[0]

  if (!first?.id) return null

  return { userId: first.id, displayName: first.displayName ?? null }
}

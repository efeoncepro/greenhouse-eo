import 'server-only'

import type { TeamsAdaptiveCard, TeamsChannelRecord, TeamsSendOptions } from '../types'
import {
  extractMemberIdFromPayload,
  resolveTeamsUserForMember,
  type TeamsRecipientResolution
} from '../recipient-resolver'
import {
  acquireBotFrameworkToken,
  acquireGraphToken,
  BotFrameworkTokenError,
  readBotFrameworkSecret
} from './token-cache'
import {
  findUserByEmail,
  getOrCreateOneOnOneChat,
  GraphTransportError,
  postChannelMessage,
  postChatMessage
} from './connector-client'
import {
  buildReferenceKey,
  markReferenceFailure,
  recordReferenceSuccess,
  resolveConversationReference
} from './conversation-references'

/**
 * TASK-671 — Bot Framework dispatcher for `channel_kind='teams_bot'` rows.
 *
 * Handles the four `recipient_kind` shapes:
 *   - `channel`      → POST {serviceUrl}/v3/conversations  (channelData.channel)
 *   - `chat_1on1`    → 1:1 conversation create + activity post
 *   - `chat_group`   → POST into existing chat id
 *   - `dynamic_user` → resolve memberId from event payload then 1:1
 *
 * Robustness:
 *   - Per-target cached serviceUrl + conversation id in PG (cuts latency on
 *     subsequent sends from ~1.5s to ~250ms by skipping region failover).
 *   - On Bot Framework or Graph error we record the failure on the cached
 *     row; after 3 strikes the dispatcher re-discovers from scratch.
 *   - Token-acquisition failures are typed; the parent sender turns them
 *     into `token_acquisition_failed` outcomes, NOT generic `transport_error`.
 *   - Errors are redacted (the parent sender writes them to source_sync_runs;
 *     redaction is the caller's responsibility because we want to surface
 *     useful context locally).
 */

const MAX_REASON_LEN = 240

const truncate = (text: string) => text.slice(0, MAX_REASON_LEN)

export type BotFrameworkSendResult =
  | {
      ok: true
      attempts: number
      surface: 'channel' | 'chat_1on1' | 'chat_group' | 'dynamic_user'
      messageId: string
      conversationId: string
      serviceUrl: string
      resolutionSource?: TeamsRecipientResolution['source']
    }
  | {
      ok: false
      attempts: number
      reason:
        | 'missing_secret'
        | 'missing_bot_app_config'
        | 'token_acquisition_failed'
        | 'invalid_routing_rule'
        | 'recipient_unresolved'
        | 'recipient_not_in_tenant'
        | 'http_error'
        | 'transport_error'
      detail: string
    }

interface DispatchParams {
  channel: TeamsChannelRecord
  card: TeamsAdaptiveCard
  options: TeamsSendOptions
  /** Optional dependency override for tests. */
  deps?: {
    fetchImpl?: typeof fetch
    resolveMember?: typeof resolveTeamsUserForMember
    findByEmail?: typeof findUserByEmail
  }
}

const ensureBotConfig = (channel: TeamsChannelRecord) => {
  if (!channel.bot_app_id || !channel.azure_tenant_id) {
    return {
      ok: false as const,
      reason: 'missing_bot_app_config' as const,
      detail: `Channel '${channel.channel_code}' is missing bot_app_id or azure_tenant_id`
    }
  }

  return {
    ok: true as const,
    botAppId: channel.bot_app_id,
    tenantId: channel.azure_tenant_id
  }
}

const tryRecordSuccess = async (params: {
  botAppId: string
  azureTenantId: string
  referenceKey: string
  serviceUrl: string
  conversationId: string
}) => {
  try {
    await recordReferenceSuccess(params)
  } catch {
    /* cache write failure is non-fatal */
  }
}

const tryMarkFailure = async (botAppId: string, referenceKey: string, redactedReason: string) => {
  try {
    await markReferenceFailure({ botAppId, referenceKey, redactedReason })
  } catch {
    /* cache write failure is non-fatal */
  }
}

export const sendViaBotFramework = async ({
  channel,
  card,
  options,
  deps
}: DispatchParams): Promise<BotFrameworkSendResult> => {
  const config = ensureBotConfig(channel)

  if (!config.ok) {
    return { ok: false, attempts: 0, reason: config.reason, detail: config.detail }
  }

  const secretBlob = await readBotFrameworkSecret(channel.secret_ref)

  if (!secretBlob) {
    return {
      ok: false,
      attempts: 0,
      reason: 'missing_secret',
      detail: `Secret '${channel.secret_ref}' empty, malformed, or missing required keys (clientId/clientSecret/tenantId)`
    }
  }

  let bfToken: string

  try {
    bfToken = await acquireBotFrameworkToken({
      tenantId: secretBlob.tenantId,
      clientId: secretBlob.clientId,
      clientSecret: secretBlob.clientSecret,
      fetchImpl: deps?.fetchImpl
    })
  } catch (error) {
    return {
      ok: false,
      attempts: 0,
      reason: 'token_acquisition_failed',
      detail:
        error instanceof BotFrameworkTokenError
          ? `${error.message}${error.status ? ` (status=${error.status})` : ''}`
          : error instanceof Error
            ? error.message
            : String(error)
    }
  }

  const surface = channel.recipient_kind

  try {
    if (surface === 'channel') {
      if (!channel.channel_id) {
        return {
          ok: false,
          attempts: 0,
          reason: 'missing_bot_app_config',
          detail: `Channel '${channel.channel_code}' missing channel_id for recipient_kind=channel`
        }
      }

      const referenceKey = buildReferenceKey('channel', {
        teamId: channel.team_id,
        channelId: channel.channel_id
      })

      const cached = await resolveConversationReference(config.botAppId, referenceKey).catch(() => null)

      try {
        const result = await postChannelMessage({
          token: bfToken,
          tenantId: config.tenantId,
          teamId: channel.team_id,
          channelId: channel.channel_id,
          card,
          cachedServiceUrl: cached?.serviceUrl,
          fetchImpl: deps?.fetchImpl
        })

        await tryRecordSuccess({
          botAppId: config.botAppId,
          azureTenantId: config.tenantId,
          referenceKey,
          serviceUrl: result.serviceUrl,
          conversationId: result.conversationId
        })

        return {
          ok: true,
          attempts: 1,
          surface: 'channel',
          messageId: result.messageId,
          conversationId: result.conversationId,
          serviceUrl: result.serviceUrl
        }
      } catch (error) {
        if (cached) {
          const reason = truncate(error instanceof Error ? error.message : String(error))

          await tryMarkFailure(config.botAppId, referenceKey, reason)
        }

        throw error
      }
    }

    if (surface === 'chat_group') {
      if (!channel.recipient_chat_id) {
        return {
          ok: false,
          attempts: 0,
          reason: 'missing_bot_app_config',
          detail: `Channel '${channel.channel_code}' missing recipient_chat_id for recipient_kind=chat_group`
        }
      }

      const referenceKey = buildReferenceKey('chat_group', { chatId: channel.recipient_chat_id })
      const cached = await resolveConversationReference(config.botAppId, referenceKey).catch(() => null)

      try {
        const result = await postChatMessage({
          token: bfToken,
          tenantId: config.tenantId,
          chatId: channel.recipient_chat_id,
          card,
          cachedServiceUrl: cached?.serviceUrl,
          fetchImpl: deps?.fetchImpl
        })

        await tryRecordSuccess({
          botAppId: config.botAppId,
          azureTenantId: config.tenantId,
          referenceKey,
          serviceUrl: result.serviceUrl,
          conversationId: result.conversationId
        })

        return {
          ok: true,
          attempts: 1,
          surface: 'chat_group',
          messageId: result.messageId,
          conversationId: result.conversationId,
          serviceUrl: result.serviceUrl
        }
      } catch (error) {
        if (cached) {
          await tryMarkFailure(
            config.botAppId,
            referenceKey,
            truncate(error instanceof Error ? error.message : String(error))
          )
        }

        throw error
      }
    }

    if (surface === 'chat_1on1' || surface === 'dynamic_user') {
      let aadObjectId: string | null = null
      let resolutionSource: TeamsRecipientResolution['source'] | undefined

      if (surface === 'chat_1on1') {
        if (!channel.recipient_user_id) {
          return {
            ok: false,
            attempts: 0,
            reason: 'missing_bot_app_config',
            detail: `Channel '${channel.channel_code}' missing recipient_user_id for recipient_kind=chat_1on1`
          }
        }

        aadObjectId = channel.recipient_user_id
      } else {
        const rule = channel.recipient_routing_rule_json

        if (!rule || typeof rule !== 'object' || typeof rule.from !== 'string') {
          return {
            ok: false,
            attempts: 0,
            reason: 'invalid_routing_rule',
            detail: `Channel '${channel.channel_code}' has malformed recipient_routing_rule_json`
          }
        }

        const memberId = extractMemberIdFromPayload(options.eventPayload, rule)

        if (!memberId) {
          return {
            ok: false,
            attempts: 0,
            reason: 'recipient_unresolved',
            detail: `routing rule '${rule.from}' did not yield a member_id from event payload`
          }
        }

        const resolveMember = deps?.resolveMember || resolveTeamsUserForMember
        const resolution = await resolveMember(memberId)

        if (!resolution) {
          return {
            ok: false,
            attempts: 0,
            reason: 'recipient_unresolved',
            detail: `member_id='${memberId}' has no identity_profile or client_user record`
          }
        }

        aadObjectId = resolution.aadObjectId
        resolutionSource = resolution.source

        if (!aadObjectId) {
          if (!resolution.email) {
            return {
              ok: false,
              attempts: 0,
              reason: 'recipient_not_in_tenant',
              detail: `member_id='${memberId}' has neither aadObjectId nor email — cannot DM`
            }
          }

          let graphToken: string

          try {
            graphToken = await acquireGraphToken({
              tenantId: secretBlob.tenantId,
              clientId: secretBlob.clientId,
              clientSecret: secretBlob.clientSecret,
              fetchImpl: deps?.fetchImpl
            })
          } catch (error) {
            return {
              ok: false,
              attempts: 0,
              reason: 'token_acquisition_failed',
              detail:
                error instanceof BotFrameworkTokenError
                  ? `${error.message} (graph audience)`
                  : error instanceof Error
                    ? error.message
                    : String(error)
            }
          }

          const findFn = deps?.findByEmail || findUserByEmail

          const found = await findFn({
            graphToken,
            email: resolution.email,
            fetchImpl: deps?.fetchImpl
          })

          if (!found) {
            return {
              ok: false,
              attempts: 0,
              reason: 'recipient_not_in_tenant',
              detail: `email='${resolution.email}' is not a member of the tenant`
            }
          }

          aadObjectId = found.userId
        }
      }

      const referenceKey = buildReferenceKey('chat_1on1', { aadObjectId })
      const cached = await resolveConversationReference(config.botAppId, referenceKey).catch(() => null)

      let chatId = cached?.conversationId || null
      let serviceUrl = cached?.serviceUrl || null

      if (!chatId || !serviceUrl) {
        try {
          const created = await getOrCreateOneOnOneChat({
            token: bfToken,
            tenantId: config.tenantId,
            recipientUserId: aadObjectId!,
            cachedServiceUrl: cached?.serviceUrl,
            fetchImpl: deps?.fetchImpl
          })

          chatId = created.chatId
          serviceUrl = created.serviceUrl
        } catch (error) {
          if (cached) {
            await tryMarkFailure(
              config.botAppId,
              referenceKey,
              truncate(error instanceof Error ? error.message : String(error))
            )
          }

          throw error
        }
      }

      try {
        const result = await postChatMessage({
          token: bfToken,
          tenantId: config.tenantId,
          chatId,
          card,
          cachedServiceUrl: serviceUrl,
          fetchImpl: deps?.fetchImpl
        })

        await tryRecordSuccess({
          botAppId: config.botAppId,
          azureTenantId: config.tenantId,
          referenceKey,
          serviceUrl: result.serviceUrl,
          conversationId: chatId
        })

        return {
          ok: true,
          attempts: 2,
          surface,
          messageId: result.messageId,
          conversationId: chatId,
          serviceUrl: result.serviceUrl,
          resolutionSource
        }
      } catch (error) {
        await tryMarkFailure(
          config.botAppId,
          referenceKey,
          truncate(error instanceof Error ? error.message : String(error))
        )

        throw error
      }
    }

    return {
      ok: false,
      attempts: 0,
      reason: 'invalid_routing_rule',
      detail: `Unknown recipient_kind: ${surface as string}`
    }
  } catch (error) {
    if (error instanceof GraphTransportError) {
      return {
        ok: false,
        attempts: 1,
        reason: 'http_error',
        detail: `${error.message}${error.status ? ` (status=${error.status})` : ''}`
      }
    }

    return {
      ok: false,
      attempts: 1,
      reason: 'transport_error',
      detail: error instanceof Error ? error.message : String(error)
    }
  }
}

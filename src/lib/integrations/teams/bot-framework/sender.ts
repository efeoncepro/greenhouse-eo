import 'server-only'

import type { TeamsAdaptiveCard, TeamsChannelRecord, TeamsSendOptions } from '../types'
import {
  extractMemberIdFromPayload,
  resolveTeamsUserForMember,
  type TeamsRecipientResolution
} from '../recipient-resolver'
import {
  acquireBotFrameworkToken,
  BotFrameworkTokenError,
  readBotFrameworkSecret
} from './token-cache'
import {
  findUserByEmail,
  getOrCreateOneOnOneChat,
  GraphTransportError,
  postChannelMessage,
  postChatMessage
} from './graph-client'

/**
 * TASK-671 — Bot Framework dispatcher for `channel_kind='teams_bot'` rows.
 *
 * Handles the four `recipient_kind` shapes:
 *  - `channel`      → POST /teams/{teamId}/channels/{channelId}/messages
 *  - `chat_1on1`    → POST /chats/{recipient_user_id-derived chatId}/messages
 *  - `chat_group`   → POST /chats/{recipient_chat_id}/messages
 *  - `dynamic_user` → resolve memberId from event payload, then 1:1 the user
 *
 * Returns a discriminated outcome the parent sender turns into a `TeamsSendOutcome`.
 */

export type BotFrameworkSendResult =
  | {
      ok: true
      attempts: number
      surface: 'channel' | 'chat_1on1' | 'chat_group' | 'dynamic_user'
      messageId: string
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
  /**
   * Optional override of the dependency surface for tests. Production code does not
   * pass this; the helpers default to real network calls.
   */
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

  let token: string

  try {
    token = await acquireBotFrameworkToken({
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
      if (!channel.team_id || !channel.channel_id) {
        return {
          ok: false,
          attempts: 0,
          reason: 'missing_bot_app_config',
          detail: `Channel '${channel.channel_code}' missing team_id/channel_id for recipient_kind=channel`
        }
      }

      const result = await postChannelMessage({
        token,
        teamId: channel.team_id,
        channelId: channel.channel_id,
        card,
        fetchImpl: deps?.fetchImpl
      })

      return { ok: true, attempts: 1, surface: 'channel', messageId: result.messageId }
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

      const result = await postChatMessage({
        token,
        chatId: channel.recipient_chat_id,
        card,
        fetchImpl: deps?.fetchImpl
      })

      return { ok: true, attempts: 1, surface: 'chat_group', messageId: result.messageId }
    }

    if (surface === 'chat_1on1') {
      if (!channel.recipient_user_id) {
        return {
          ok: false,
          attempts: 0,
          reason: 'missing_bot_app_config',
          detail: `Channel '${channel.channel_code}' missing recipient_user_id for recipient_kind=chat_1on1`
        }
      }

      const chat = await getOrCreateOneOnOneChat({
        token,
        botUserId: config.botAppId,
        recipientUserId: channel.recipient_user_id,
        fetchImpl: deps?.fetchImpl
      })

      const result = await postChatMessage({
        token,
        chatId: chat.chatId,
        card,
        fetchImpl: deps?.fetchImpl
      })

      return { ok: true, attempts: 2, surface: 'chat_1on1', messageId: result.messageId }
    }

    if (surface === 'dynamic_user') {
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

      let aadObjectId = resolution.aadObjectId

      if (!aadObjectId) {
        if (!resolution.email) {
          return {
            ok: false,
            attempts: 0,
            reason: 'recipient_not_in_tenant',
            detail: `member_id='${memberId}' has neither aadObjectId nor email — cannot DM`
          }
        }

        const findFn = deps?.findByEmail || findUserByEmail
        const found = await findFn({ token, email: resolution.email, fetchImpl: deps?.fetchImpl })

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

      const chat = await getOrCreateOneOnOneChat({
        token,
        botUserId: config.botAppId,
        recipientUserId: aadObjectId,
        fetchImpl: deps?.fetchImpl
      })

      const result = await postChatMessage({
        token,
        chatId: chat.chatId,
        card,
        fetchImpl: deps?.fetchImpl
      })

      return {
        ok: true,
        attempts: 2,
        surface: 'dynamic_user',
        messageId: result.messageId,
        resolutionSource: resolution.source
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

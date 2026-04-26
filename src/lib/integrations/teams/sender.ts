import 'server-only'

import { randomUUID } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import type {
  TeamsAdaptiveCard,
  TeamsChannelRecord,
  TeamsSendOptions,
  TeamsSendOutcome} from './types';
import {
  TeamsCardTooLargeError,
  TeamsTransportError
} from './types'

const MAX_CARD_BYTES = 26_000
const MAX_ATTEMPTS = 3
const RETRY_BASE_MS = 250
const REQUEST_TIMEOUT_MS = 8_000

const buildLogicAppPayload = (card: TeamsAdaptiveCard) => ({
  type: 'message',
  attachments: [
    {
      contentType: 'application/vnd.microsoft.card.adaptive',
      contentUrl: null,
      content: card
    }
  ]
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const writeSendRunStart = async ({
  runId,
  channel,
  syncMode,
  triggeredBy,
  correlationId,
  sourceObjectId
}: {
  runId: string
  channel: TeamsChannelRecord
  syncMode: TeamsSendOptions['syncMode']
  triggeredBy: string
  correlationId?: string
  sourceObjectId?: string
}) => {
  const baseNote = `channel=${channel.channel_code}; kind=${channel.channel_kind}`
  const correlationNote = correlationId ? `correlation=${correlationId}; ` : ''
  const sourceNote = sourceObjectId ? `source_object_id=${sourceObjectId}; ` : ''

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_sync.source_sync_runs (
      sync_run_id, source_system, source_object_type, sync_mode,
      status, records_read, records_written_raw, triggered_by, notes, started_at
    )
    VALUES ($1, 'teams_notification', 'teams_channel', $2, 'running', 0, 0, $3, $4, CURRENT_TIMESTAMP)
    ON CONFLICT (sync_run_id) DO NOTHING`,
    [
      runId,
      syncMode || 'reactive',
      triggeredBy,
      `${correlationNote}${sourceNote}${baseNote}`.slice(0, 2000)
    ]
  )
}

const writeSendRunOutcome = async ({
  runId,
  status,
  notes,
  recordsWritten
}: {
  runId: string
  status: 'succeeded' | 'failed'
  notes: string
  recordsWritten: number
}) => {
  await runGreenhousePostgresQuery(
    `UPDATE greenhouse_sync.source_sync_runs
     SET status = $2,
         records_written_raw = $3,
         notes = $4,
         finished_at = CURRENT_TIMESTAMP
     WHERE sync_run_id = $1`,
    [runId, status, recordsWritten, notes.slice(0, 2000)]
  )
}

type TeamsChannelRow = TeamsChannelRecord & Record<string, unknown>

export const loadTeamsChannel = async (channelCode: string): Promise<TeamsChannelRecord | null> => {
  const rows = await runGreenhousePostgresQuery<TeamsChannelRow>(
    `SELECT channel_code, channel_kind, display_name, description, secret_ref,
            logic_app_resource_id, bot_app_id, team_id, channel_id,
            azure_tenant_id, azure_subscription_id, azure_resource_group, disabled_at
       FROM greenhouse_core.teams_notification_channels
      WHERE channel_code = $1`,
    [channelCode]
  )

  return rows[0] || null
}

export const listActiveTeamsChannels = async (): Promise<TeamsChannelRecord[]> => {
  return runGreenhousePostgresQuery<TeamsChannelRow>(
    `SELECT channel_code, channel_kind, display_name, description, secret_ref,
            logic_app_resource_id, bot_app_id, team_id, channel_id,
            azure_tenant_id, azure_subscription_id, azure_resource_group, disabled_at
       FROM greenhouse_core.teams_notification_channels
      WHERE disabled_at IS NULL
      ORDER BY channel_code`
  )
}

const sendViaLogicApp = async ({
  channel,
  card,
  webhookUrl
}: {
  channel: TeamsChannelRecord
  card: TeamsAdaptiveCard
  webhookUrl: string
}): Promise<{ attempts: number }> => {
  const payload = buildLogicAppPayload(card)
  const body = JSON.stringify(payload)
  const bytes = Buffer.byteLength(body, 'utf8')

  if (bytes > MAX_CARD_BYTES) {
    throw new TeamsCardTooLargeError(bytes, MAX_CARD_BYTES)
  }

  let attempt = 0
  let lastError: Error | null = null

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })

      if (response.status === 429) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(RETRY_BASE_MS * Math.pow(4, attempt - 1))
          continue
        }

        const text = await response.text().catch(() => '')

        throw new TeamsTransportError(`Rate limited (429) by Logic App for channel ${channel.channel_code}`, 429, text.slice(0, 500))
      }

      if (response.status >= 500 && response.status < 600 && attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * Math.pow(4, attempt - 1))
        continue
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '')

        throw new TeamsTransportError(
          `Logic App returned ${response.status} for channel ${channel.channel_code}`,
          response.status,
          text.slice(0, 500)
        )
      }

      return { attempts: attempt }
    } catch (error) {
      if (error instanceof TeamsTransportError) {
        throw error
      }

      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_MS * Math.pow(4, attempt - 1))
      }
    }
  }

  throw new TeamsTransportError(
    `Logic App POST failed after ${MAX_ATTEMPTS} attempts for channel ${channel.channel_code}: ${lastError?.message || 'unknown error'}`
  )
}

export const postTeamsCard = async (
  channelCode: string,
  card: TeamsAdaptiveCard,
  options: TeamsSendOptions = {}
): Promise<TeamsSendOutcome> => {
  const startMs = Date.now()
  const runId = `teams-${randomUUID()}`
  const triggeredBy = options.triggeredBy || 'teams_sender'

  const channel = await loadTeamsChannel(channelCode)

  if (!channel) {
    return {
      ok: false,
      channelCode,
      channelKind: 'azure_logic_app',
      durationMs: Date.now() - startMs,
      attempts: 0,
      reason: 'channel_not_found',
      detail: `No teams_notification_channels row for code='${channelCode}'`
    }
  }

  if (channel.disabled_at) {
    return {
      ok: false,
      channelCode,
      channelKind: channel.channel_kind,
      durationMs: Date.now() - startMs,
      attempts: 0,
      reason: 'channel_disabled',
      detail: `Channel '${channelCode}' disabled at ${channel.disabled_at.toISOString?.() || channel.disabled_at}`
    }
  }

  await writeSendRunStart({
    runId,
    channel,
    syncMode: options.syncMode || 'reactive',
    triggeredBy,
    correlationId: options.correlationId,
    sourceObjectId: options.sourceObjectId
  })

  try {
    let attempts = 0

    if (channel.channel_kind === 'azure_logic_app') {
      const webhookUrl = await resolveSecretByRef(channel.secret_ref)

      if (!webhookUrl) {
        await writeSendRunOutcome({
          runId,
          status: 'failed',
          notes: `missing_secret: secret_ref=${channel.secret_ref}`,
          recordsWritten: 0
        })

        return {
          ok: false,
          channelCode,
          channelKind: channel.channel_kind,
          durationMs: Date.now() - startMs,
          attempts: 0,
          reason: 'missing_secret',
          detail: `Secret '${channel.secret_ref}' empty or unauthorized`
        }
      }

      const result = await sendViaLogicApp({ channel, card, webhookUrl })

      attempts = result.attempts
    } else {
      // teams_bot / graph_rsc dispatchers are reserved for future migration.
      await writeSendRunOutcome({
        runId,
        status: 'failed',
        notes: `unsupported_channel_kind: ${channel.channel_kind}`,
        recordsWritten: 0
      })

      return {
        ok: false,
        channelCode,
        channelKind: channel.channel_kind,
        durationMs: Date.now() - startMs,
        attempts: 0,
        reason: 'unsupported_channel_kind',
        detail: `channel_kind '${channel.channel_kind}' is reserved for future Bot Framework migration`
      }
    }

    await writeSendRunOutcome({
      runId,
      status: 'succeeded',
      notes: `sent via ${channel.channel_kind}; attempts=${attempts}`,
      recordsWritten: 1
    })

    return {
      ok: true,
      channelCode,
      channelKind: channel.channel_kind,
      durationMs: Date.now() - startMs,
      attempts
    }
  } catch (error) {
    if (error instanceof TeamsCardTooLargeError) {
      await writeSendRunOutcome({
        runId,
        status: 'failed',
        notes: `card_too_large: ${error.bytes} bytes (limit ${error.limit})`,
        recordsWritten: 0
      })

      return {
        ok: false,
        channelCode,
        channelKind: channel.channel_kind,
        durationMs: Date.now() - startMs,
        attempts: 0,
        reason: 'card_too_large',
        detail: error.message
      }
    }

    if (error instanceof TeamsTransportError) {
      await writeSendRunOutcome({
        runId,
        status: 'failed',
        notes: `http_error: status=${error.status ?? 'unknown'}; ${error.message}`,
        recordsWritten: 0
      })

      return {
        ok: false,
        channelCode,
        channelKind: channel.channel_kind,
        durationMs: Date.now() - startMs,
        attempts: MAX_ATTEMPTS,
        reason: 'http_error',
        detail: error.message
      }
    }

    const detail = error instanceof Error ? error.message : String(error)

    await writeSendRunOutcome({
      runId,
      status: 'failed',
      notes: `transport_error: ${detail}`,
      recordsWritten: 0
    })

    return {
      ok: false,
      channelCode,
      channelKind: channel.channel_kind,
      durationMs: Date.now() - startMs,
      attempts: MAX_ATTEMPTS,
      reason: 'transport_error',
      detail
    }
  }
}

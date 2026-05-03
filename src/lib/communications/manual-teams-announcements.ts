import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import {
  getManualTeamsAnnouncementDestination,
  MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS,
  type ManualTeamsAnnouncementDestination
} from '@/config/manual-teams-announcements'
import { sendViaBotFramework } from '@/lib/integrations/teams/bot-framework/sender'
import { writeTeamsSendRunOutcome, writeTeamsSendRunStart } from '@/lib/integrations/teams/send-run-log'
import type { TeamsAdaptiveCard, TeamsChannelRecord, TeamsSendOutcome } from '@/lib/integrations/teams/types'

const MAX_TITLE_LENGTH = 120
const MAX_PARAGRAPH_LENGTH = 900
const MAX_PARAGRAPHS = 6
const MAX_CTA_LABEL_LENGTH = 40

export interface ManualTeamsAnnouncementInput {
  destinationKey: string
  title: string
  paragraphs: string[]
  ctaUrl: string
  ctaLabel?: string
  triggeredBy: string
  correlationId?: string
  sourceObjectId?: string
}

export interface ManualTeamsAnnouncementPreview {
  destination: ManualTeamsAnnouncementDestination
  title: string
  paragraphs: string[]
  ctaUrl: string
  ctaLabel: string
  fingerprint: string
  channel: TeamsChannelRecord
  card: TeamsAdaptiveCard
}

const normalizeParagraphs = (paragraphs: string[]) =>
  paragraphs
    .map(paragraph => paragraph.trim())
    .filter(Boolean)

const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value)

    return url.protocol === 'https:'
  } catch {
    return false
  }
}

const buildFingerprint = ({
  destinationKey,
  title,
  paragraphs,
  ctaUrl,
  ctaLabel
}: {
  destinationKey: string
  title: string
  paragraphs: string[]
  ctaUrl: string
  ctaLabel: string
}) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        destinationKey,
        title,
        paragraphs,
        ctaUrl,
        ctaLabel
      })
    )
    .digest('hex')
    .slice(0, 24)

const buildChannelRecord = (destination: ManualTeamsAnnouncementDestination): TeamsChannelRecord => ({
  channel_code: destination.channelCode,
  channel_kind: 'teams_bot',
  display_name: destination.label,
  description: destination.description,
  secret_ref: destination.secretRef,
  logic_app_resource_id: null,
  bot_app_id: destination.botAppId,
  team_id: null,
  channel_id: null,
  azure_tenant_id: destination.azureTenantId,
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null,
  recipient_kind: destination.recipientKind,
  recipient_user_id: null,
  recipient_chat_id: destination.recipientChatId,
  recipient_routing_rule_json: null
})

const buildCard = ({
  title,
  paragraphs,
  ctaUrl,
  ctaLabel
}: {
  title: string
  paragraphs: string[]
  ctaUrl: string
  ctaLabel: string
}): TeamsAdaptiveCard => ({
  type: 'AdaptiveCard',
  version: '1.5',
  body: [
    {
      type: 'TextBlock',
      text: title,
      weight: 'Bolder',
      size: 'Large',
      wrap: true
    },
    ...paragraphs.map((paragraph, index) => {
      const spacing: 'Medium' | 'Small' = index === 0 ? 'Medium' : 'Small'

      return {
        type: 'TextBlock' as const,
        text: paragraph,
        wrap: true,
        spacing
      }
    })
  ],
  actions: [
    {
      type: 'Action.OpenUrl',
      title: ctaLabel,
      url: ctaUrl
    }
  ]
})

export const listManualTeamsAnnouncementDestinations = () =>
  Object.values(MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS)

export const previewManualTeamsAnnouncement = (
  input: Omit<ManualTeamsAnnouncementInput, 'triggeredBy' | 'correlationId' | 'sourceObjectId'>
): ManualTeamsAnnouncementPreview => {
  const destination = getManualTeamsAnnouncementDestination(input.destinationKey)

  if (!destination) {
    throw new Error(`Unknown manual Teams destination '${input.destinationKey}'`)
  }

  const title = input.title.trim()
  const paragraphs = normalizeParagraphs(input.paragraphs)
  const ctaUrl = input.ctaUrl.trim()
  const ctaLabel = (input.ctaLabel || destination.defaultCtaLabel).trim()

  if (!title) {
    throw new Error('Announcement title is required')
  }

  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Announcement title exceeds ${MAX_TITLE_LENGTH} characters`)
  }

  if (paragraphs.length === 0) {
    throw new Error('At least one announcement paragraph is required')
  }

  if (paragraphs.length > MAX_PARAGRAPHS) {
    throw new Error(`Announcement supports up to ${MAX_PARAGRAPHS} paragraphs`)
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_PARAGRAPH_LENGTH) {
      throw new Error(`Announcement paragraph exceeds ${MAX_PARAGRAPH_LENGTH} characters`)
    }
  }

  if (!ctaLabel) {
    throw new Error('CTA label is required')
  }

  if (ctaLabel.length > MAX_CTA_LABEL_LENGTH) {
    throw new Error(`CTA label exceeds ${MAX_CTA_LABEL_LENGTH} characters`)
  }

  if (!isHttpsUrl(ctaUrl)) {
    throw new Error('CTA URL must be a valid https URL')
  }

  const fingerprint = buildFingerprint({
    destinationKey: destination.key,
    title,
    paragraphs,
    ctaUrl,
    ctaLabel
  })

  const channel = buildChannelRecord(destination)

  const card = buildCard({
    title,
    paragraphs,
    ctaUrl,
    ctaLabel
  })

  return {
    destination,
    title,
    paragraphs,
    ctaUrl,
    ctaLabel,
    fingerprint,
    channel,
    card
  }
}

export const sendManualTeamsAnnouncement = async (
  input: ManualTeamsAnnouncementInput
): Promise<
  TeamsSendOutcome & {
    fingerprint: string
    destinationLabel?: string
  }
> => {
  const preview = previewManualTeamsAnnouncement(input)
  const startMs = Date.now()
  const runId = `teams-manual-${randomUUID()}`
  const correlationId = input.correlationId || `manual-announcement-${preview.fingerprint}`
  const sourceObjectId = input.sourceObjectId || `manual-announcement:${preview.fingerprint}`

  await writeTeamsSendRunStart({
    runId,
    channel: preview.channel,
    syncMode: 'manual',
    triggeredBy: input.triggeredBy,
    correlationId,
    sourceObjectId
  })

  const botResult = await sendViaBotFramework({
    channel: preview.channel,
    card: preview.card,
    options: {
      triggeredBy: input.triggeredBy,
      correlationId,
      sourceObjectId,
      syncMode: 'manual'
    }
  })

  if (!botResult.ok) {
    await writeTeamsSendRunOutcome({
      runId,
      status: 'failed',
      notes: `${botResult.reason}: ${botResult.detail}; transport=bot_framework; surface=${preview.channel.recipient_kind}; fingerprint=${preview.fingerprint}`,
      recordsWritten: 0
    })

    return {
      ok: false,
      channelCode: preview.channel.channel_code,
      channelKind: preview.channel.channel_kind,
      durationMs: Date.now() - startMs,
      attempts: botResult.attempts,
      reason: botResult.reason,
      detail: botResult.detail,
      fingerprint: preview.fingerprint,
      destinationLabel: preview.destination.label
    }
  }

  await writeTeamsSendRunOutcome({
    runId,
    status: 'succeeded',
    notes: `manual announcement sent; transport=bot_framework; surface=${botResult.surface}; attempts=${botResult.attempts}; fingerprint=${preview.fingerprint}`,
    recordsWritten: 1
  })

  return {
    ok: true,
    channelCode: preview.channel.channel_code,
    channelKind: preview.channel.channel_kind,
    durationMs: Date.now() - startMs,
    attempts: botResult.attempts,
    fingerprint: preview.fingerprint,
    destinationLabel: preview.destination.label
  }
}

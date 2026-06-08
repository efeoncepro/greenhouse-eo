import 'server-only'

import { createHash, randomUUID } from 'node:crypto'

import {
  getManualTeamsAnnouncementDestination,
  MANUAL_TEAMS_ANNOUNCEMENT_DESTINATIONS,
  type ManualTeamsAnnouncementDestination
} from '@/config/manual-teams-announcements'
import { sendViaBotFramework } from '@/lib/integrations/teams/bot-framework/sender'
import { writeTeamsSendRunOutcome, writeTeamsSendRunStart } from '@/lib/integrations/teams/send-run-log'
import type {
  TeamsAdaptiveCard,
  TeamsAdaptiveCardMentionEntity,
  TeamsChannelRecord,
  TeamsSendOutcome
} from '@/lib/integrations/teams/types'

const MAX_TITLE_LENGTH = 120
const MAX_PARAGRAPH_LENGTH = 900
const MAX_PARAGRAPHS = 6
const MAX_CTA_LABEL_LENGTH = 40
const MAX_MENTIONS = 5
const MAX_MENTION_TEXT_LENGTH = 80
const MAX_MENTION_ID_LENGTH = 200

export interface ManualTeamsAnnouncementInput {
  destinationKey: string
  title: string
  paragraphs: string[]
  ctaUrl?: string
  ctaLabel?: string
  mentions?: ManualTeamsAnnouncementMention[]
  triggeredBy: string
  correlationId?: string
  sourceObjectId?: string
}

export interface ManualTeamsAnnouncementMention {
  /**
   * Exact visible text to replace with `<at>text</at>` in the Adaptive Card.
   * Example: `Maria Fernanda`.
   */
  text: string
  /**
   * Microsoft Entra Object ID or UPN. For Adaptive Card mentions do NOT pass
   * `29:<aadObjectId>`; that rendered as plain text in live Teams smoke.
   */
  id: string
  /**
   * Profile name Teams should attach to the mention. Defaults to `text`.
   */
  name?: string
}

export interface ManualTeamsAnnouncementPreview {
  destination: ManualTeamsAnnouncementDestination
  title: string
  paragraphs: string[]
  ctaUrl: string | null
  ctaLabel: string | null
  mentions: Required<ManualTeamsAnnouncementMention>[]
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

const normalizeMentions = (mentions: ManualTeamsAnnouncementMention[] | undefined) =>
  (mentions || []).map(mention => ({
    text: mention.text.trim(),
    id: mention.id.trim(),
    name: (mention.name || mention.text).trim()
  }))

const validateMentions = (
  mentions: Required<ManualTeamsAnnouncementMention>[],
  searchableText: string
) => {
  if (mentions.length > MAX_MENTIONS) {
    throw new Error(`Announcement supports up to ${MAX_MENTIONS} mentions`)
  }

  const seenTexts = new Set<string>()

  for (const mention of mentions) {
    if (!mention.text) {
      throw new Error('Mention text is required')
    }

    if (mention.text.length > MAX_MENTION_TEXT_LENGTH) {
      throw new Error(`Mention text exceeds ${MAX_MENTION_TEXT_LENGTH} characters`)
    }

    if (!mention.id) {
      throw new Error(`Mention '${mention.text}' is missing an Entra object ID or UPN`)
    }

    if (mention.id.length > MAX_MENTION_ID_LENGTH) {
      throw new Error(`Mention id for '${mention.text}' exceeds ${MAX_MENTION_ID_LENGTH} characters`)
    }

    if (mention.id.startsWith('29:')) {
      throw new Error(
        `Mention id for '${mention.text}' must be an Entra object ID or UPN, not '29:<aadObjectId>'`
      )
    }

    if (seenTexts.has(mention.text)) {
      throw new Error(`Duplicate mention text '${mention.text}'`)
    }

    seenTexts.add(mention.text)

    if (!searchableText.includes(mention.text)) {
      throw new Error(`Mention text '${mention.text}' was not found in the title or body`)
    }
  }
}

const applyMentionsToText = (
  text: string,
  mentions: Required<ManualTeamsAnnouncementMention>[]
) =>
  mentions.reduce((current, mention) => {
    const atTag = `<at>${mention.text}</at>`

    return current.split(mention.text).join(atTag)
  }, text)

const buildMentionEntities = (
  mentions: Required<ManualTeamsAnnouncementMention>[]
): TeamsAdaptiveCardMentionEntity[] =>
  mentions.map(mention => ({
    type: 'mention',
    text: `<at>${mention.text}</at>`,
    mentioned: {
      id: mention.id,
      name: mention.name
    }
  }))

const buildFingerprint = ({
  destinationKey,
  title,
  paragraphs,
  ctaUrl,
  ctaLabel,
  mentions
}: {
  destinationKey: string
  title: string
  paragraphs: string[]
  ctaUrl: string | null
  ctaLabel: string | null
  mentions: Required<ManualTeamsAnnouncementMention>[]
}) =>
  createHash('sha256')
    .update(
      JSON.stringify({
        destinationKey,
        title,
        paragraphs,
        ctaUrl,
        ctaLabel,
        mentions
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
  team_id: destination.recipientKind === 'channel' ? destination.teamId : null,
  channel_id: destination.recipientKind === 'channel' ? destination.channelId : null,
  azure_tenant_id: destination.azureTenantId,
  azure_subscription_id: null,
  azure_resource_group: null,
  disabled_at: null,
  recipient_kind: destination.recipientKind,
  recipient_user_id: null,
  recipient_chat_id: destination.recipientKind === 'chat_group' ? destination.recipientChatId : null,
  recipient_routing_rule_json: null
})

const buildCard = ({
  title,
  paragraphs,
  ctaUrl,
  ctaLabel,
  mentions
}: {
  title: string
  paragraphs: string[]
  ctaUrl: string | null
  ctaLabel: string | null
  mentions: Required<ManualTeamsAnnouncementMention>[]
}): TeamsAdaptiveCard => {
  const mentionEntities = buildMentionEntities(mentions)

  const card: TeamsAdaptiveCard = {
    $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
    type: 'AdaptiveCard',
    version: mentions.length > 0 ? '1.0' : '1.5',
    body: [
      {
        type: 'TextBlock',
        text: applyMentionsToText(title, mentions),
        weight: 'Bolder',
        size: 'Large',
        wrap: true
      },
      ...paragraphs.map((paragraph, index) => {
        const spacing: 'Medium' | 'Small' = index === 0 ? 'Medium' : 'Small'

        return {
          type: 'TextBlock' as const,
          text: applyMentionsToText(paragraph, mentions),
          wrap: true,
          spacing
        }
      })
    ]
  }

  if (ctaUrl && ctaLabel) {
    card.actions = [
      {
        type: 'Action.OpenUrl',
        title: ctaLabel,
        url: ctaUrl
      }
    ]
  }

  if (mentionEntities.length > 0) {
    card.msteams = {
      entities: mentionEntities
    }
  }

  return card
}

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
  const ctaUrl = input.ctaUrl?.trim() || null
  const ctaLabel = ctaUrl ? (input.ctaLabel || destination.defaultCtaLabel).trim() : null
  const mentions = normalizeMentions(input.mentions)

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

  if (ctaUrl && !ctaLabel) {
    throw new Error('CTA label is required')
  }

  if (ctaLabel && ctaLabel.length > MAX_CTA_LABEL_LENGTH) {
    throw new Error(`CTA label exceeds ${MAX_CTA_LABEL_LENGTH} characters`)
  }

  if (input.ctaLabel && !ctaUrl) {
    throw new Error('CTA URL is required when CTA label is provided')
  }

  if (ctaUrl && !isHttpsUrl(ctaUrl)) {
    throw new Error('CTA URL must be a valid https URL')
  }

  validateMentions(mentions, `${title}\n${paragraphs.join('\n')}`)

  const fingerprint = buildFingerprint({
    destinationKey: destination.key,
    title,
    paragraphs,
    ctaUrl,
    ctaLabel,
    mentions
  })

  const channel = buildChannelRecord(destination)

  const card = buildCard({
    title,
    paragraphs,
    ctaUrl,
    ctaLabel,
    mentions
  })

  return {
    destination,
    title,
    paragraphs,
    ctaUrl,
    ctaLabel,
    mentions,
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

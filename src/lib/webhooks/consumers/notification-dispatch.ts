import 'server-only'

import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { WebhookEnvelope } from '@/lib/webhooks/types'
import { findNotificationMapping } from './notification-mapping'
import type { NotificationRecipient } from './notification-recipients'

interface ExistingNotificationRow extends Record<string, unknown> {
  user_id: string
}

export interface NotificationWebhookDispatchResult {
  eventType: string
  mapped: boolean
  recipientsResolved: number
  unresolvedRecipients: number
  deduped: number
  sent: number
  skipped: number
  failed: number
}

const filterDedupedRecipients = async ({
  eventId,
  category,
  recipients
}: {
  eventId: string
  category: string
  recipients: NotificationRecipient[]
}) => {
  if (recipients.length === 0) {
    return { recipients, deduped: 0 }
  }

  const rows = await runGreenhousePostgresQuery<ExistingNotificationRow>(
    `SELECT DISTINCT user_id
     FROM (
       SELECT user_id
       FROM greenhouse_notifications.notifications
       WHERE user_id = ANY($1::text[])
         AND category = $2
         AND metadata->>'eventId' = $3
         AND metadata->>'source' = 'webhook_notifications'

       UNION

       SELECT user_id
       FROM greenhouse_notifications.notification_log
       WHERE user_id = ANY($1::text[])
         AND category = $2
         AND status IN ('sent', 'skipped')
         AND metadata->>'eventId' = $3
         AND metadata->>'source' = 'webhook_notifications'
     ) existing`,
    [recipients.map(recipient => recipient.userId), category, eventId]
  )

  const existingUserIds = new Set(rows.map(row => String(row.user_id ?? '')).filter(Boolean))
  const filtered = recipients.filter(recipient => !existingUserIds.has(recipient.userId))

  return {
    recipients: filtered,
    deduped: recipients.length - filtered.length
  }
}

export const dispatchNotificationWebhook = async (envelope: WebhookEnvelope): Promise<NotificationWebhookDispatchResult> => {
  const mapping = findNotificationMapping(envelope.eventType)

  if (!mapping) {
    console.info(`[webhook-notifications] ignored event=${envelope.eventType} reason=no_mapping`)

    return {
      eventType: envelope.eventType,
      mapped: false,
      recipientsResolved: 0,
      unresolvedRecipients: 0,
      deduped: 0,
      sent: 0,
      skipped: 0,
      failed: 0
    }
  }

  await ensureNotificationSchema()

  const resolution = await mapping.resolveRecipients(envelope)

  const dedupedRecipients = await filterDedupedRecipients({
    eventId: envelope.eventId,
    category: mapping.category,
    recipients: resolution.recipients
  })

  if (dedupedRecipients.recipients.length === 0) {
    console.info(
      `[webhook-notifications] event=${envelope.eventType} mapped=yes recipients=${resolution.recipients.length} unresolved=${resolution.unresolvedRecipients} deduped=${dedupedRecipients.deduped} sent=0`
    )

    return {
      eventType: envelope.eventType,
      mapped: true,
      recipientsResolved: resolution.recipients.length,
      unresolvedRecipients: resolution.unresolvedRecipients,
      deduped: dedupedRecipients.deduped,
      sent: 0,
      skipped: 0,
      failed: 0
    }
  }

  try {
    const result = await NotificationService.dispatch({
      category: mapping.category,
      recipients: dedupedRecipients.recipients,
      title: mapping.title(envelope),
      ...(mapping.body ? { body: mapping.body(envelope) ?? undefined } : {}),
      ...(mapping.actionUrl ? { actionUrl: mapping.actionUrl(envelope) ?? undefined } : {}),
      metadata: mapping.metadata(envelope) as unknown as Record<string, unknown>
    })

    console.info(
      `[webhook-notifications] event=${envelope.eventType} mapped=yes recipients=${resolution.recipients.length} unresolved=${resolution.unresolvedRecipients} deduped=${dedupedRecipients.deduped} sent=${result.sent.length} skipped=${result.skipped.length} failed=${result.failed.length}`
    )

    return {
      eventType: envelope.eventType,
      mapped: true,
      recipientsResolved: resolution.recipients.length,
      unresolvedRecipients: resolution.unresolvedRecipients,
      deduped: dedupedRecipients.deduped,
      sent: result.sent.length,
      skipped: result.skipped.length,
      failed: result.failed.length
    }
  } catch (error) {
    console.warn(
      `[webhook-notifications] event=${envelope.eventType} dispatch_failed=${error instanceof Error ? error.message : 'unknown_error'}`
    )

    return {
      eventType: envelope.eventType,
      mapped: true,
      recipientsResolved: resolution.recipients.length,
      unresolvedRecipients: resolution.unresolvedRecipients,
      deduped: dedupedRecipients.deduped,
      sent: 0,
      skipped: 0,
      failed: dedupedRecipients.recipients.length
    }
  }
}

import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import { sendSlackAlert } from '@/lib/alerts/slack-notify'
import { sendEmail, wasEmailAlreadySent } from '@/lib/email/delivery'
import {
  getRoleCodeNotificationRecipients,
  getUserNotificationRecipient,
  type PersonNotificationRecipient
} from '@/lib/notifications/person-recipient-resolver'
import { buildNotificationRecipientKey, NotificationService } from '@/lib/notifications/notification-service'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { EVENT_TYPES } from '../event-catalog'
import type { ProjectionDefinition } from '../projection-registry'

const APPROVALS_ACTION_URL = '/admin/pricing-catalog/approvals'
const IN_APP_CATEGORY = 'system_event'
const SLACK_CATEGORY = 'pricing_catalog_approval_slack'
const SLACK_RECIPIENT_KEY = 'slack:pricing-catalog-approvals'
const NOTIFICATIONS_FLAG = 'GREENHOUSE_PRICING_APPROVAL_NOTIFICATIONS'

const isNotificationsEnabled = () => {
  const raw = process.env[NOTIFICATIONS_FLAG]?.trim().toLowerCase()

  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on'
}

const toOptionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null

const toOptionalBoolean = (value: unknown) =>
  typeof value === 'boolean' ? value : null

const getProposalMeta = (payload: Record<string, unknown>) => {
  const proposalMeta = payload.proposalMeta

  if (!proposalMeta || typeof proposalMeta !== 'object' || Array.isArray(proposalMeta)) {
    return null
  }

  return proposalMeta as Record<string, unknown>
}

const getProposalActionLabel = (payload: Record<string, unknown>) => {
  const action = toOptionalString(getProposalMeta(payload)?.action)

  if (action === 'create') return 'creación'
  if (action === 'delete') return 'desactivación'

  return 'cambio'
}

const getEntityReferenceLabel = (payload: Record<string, unknown>) => {
  const entityType = toOptionalString(payload.entityType) ?? 'pricing_catalog_item'
  const entitySku = toOptionalString(payload.entitySku)
  const entityId = toOptionalString(payload.entityId) ?? 'sin-id'

  return entitySku ?? `${entityType}:${entityId}`
}

const getCriticalityLabel = (payload: Record<string, unknown>) => {
  const criticality = toOptionalString(payload.criticality)

  if (!criticality) return 'sin criticidad'

  return criticality.toUpperCase()
}

const wasChannelAlreadySent = async ({
  recipientKey,
  category,
  channel,
  eventId
}: {
  recipientKey: string
  category: string
  channel: string
  eventId: string | null
}) => {
  if (!eventId) {
    return false
  }

  const rows = await runGreenhousePostgresQuery<{ exists: boolean } & Record<string, unknown>>(
    `SELECT EXISTS (
       SELECT 1
       FROM greenhouse_notifications.notification_log
       WHERE user_id = $1
         AND category = $2
         AND channel = $3
         AND status = 'sent'
         AND metadata ->> 'eventId' = $4
     ) AS exists`,
    [recipientKey, category, channel, eventId]
  )

  return rows[0]?.exists === true
}

const logChannelDispatch = async ({
  recipientKey,
  category,
  channel,
  status,
  eventId,
  metadata,
  errorMessage
}: {
  recipientKey: string
  category: string
  channel: string
  status: 'sent' | 'failed'
  eventId: string | null
  metadata: Record<string, unknown>
  errorMessage?: string
}) => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_notifications.notification_log
       (notification_id, user_id, category, channel, status, skip_reason, metadata, error_message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())`,
    [
      null,
      recipientKey,
      category,
      channel,
      status,
      null,
      JSON.stringify({
        ...metadata,
        ...(eventId ? { eventId } : {})
      }),
      errorMessage ?? null
    ]
  )
}

const sendDecisionEmails = async ({
  recipients,
  title,
  body,
  eventId,
  sourceEntity
}: {
  recipients: PersonNotificationRecipient[]
  title: string
  body: string
  eventId: string | null
  sourceEntity: string
}) => {
  for (const recipient of recipients) {
    if (!recipient.email || !eventId) {
      continue
    }

    const alreadySent = await wasEmailAlreadySent(eventId, sourceEntity, recipient.email)

    if (alreadySent) {
      continue
    }

    await sendEmail({
      emailType: 'notification',
      domain: 'system',
      recipients: [
        {
          email: recipient.email,
          name: recipient.fullName,
          userId: recipient.userId
        }
      ],
      context: {
        title,
        body,
        actionUrl: APPROVALS_ACTION_URL,
        actionLabel: 'Abrir cola de aprobaciones',
        recipientName: recipient.fullName
      },
      sourceEventId: eventId,
      sourceEntity
    }).catch(error => {
      console.warn(
        `[pricing-catalog-approval-notifier] Failed to send ${sourceEntity} email:`,
        error instanceof Error ? error.message : error
      )
    })
  }
}

const maybeSendSlackNotification = async ({
  eventId,
  payload,
  text
}: {
  eventId: string | null
  payload: Record<string, unknown>
  text: string
}) => {
  const alreadySent = await wasChannelAlreadySent({
    recipientKey: SLACK_RECIPIENT_KEY,
    category: SLACK_CATEGORY,
    channel: 'slack',
    eventId
  })

  if (alreadySent) {
    return false
  }

  const sent = await sendSlackAlert(text)

  await logChannelDispatch({
    recipientKey: SLACK_RECIPIENT_KEY,
    category: SLACK_CATEGORY,
    channel: 'slack',
    status: sent ? 'sent' : 'failed',
    eventId,
    metadata: payload,
    ...(sent ? {} : { errorMessage: 'slack_delivery_failed' })
  })

  return sent
}

export const pricingCatalogApprovalNotifierProjection: ProjectionDefinition = {
  name: 'pricing_catalog_approval_notifier',
  description: 'Dispatches in-app, email, and Slack notifications for pricing catalog approval lifecycle events',
  domain: 'notifications',
  triggerEvents: [
    EVENT_TYPES.pricingCatalogApprovalProposed,
    EVENT_TYPES.pricingCatalogApprovalDecided
  ],
  extractScope: payload => {
    const approvalId = toOptionalString(payload.approvalId)

    if (!approvalId) {
      return null
    }

    return {
      entityType: 'pricing_catalog_approval',
      entityId: approvalId
    }
  },
  refresh: async (_scope, payload) => {
    if (!isNotificationsEnabled()) {
      return `${NOTIFICATIONS_FLAG} disabled`
    }

    const eventType = toOptionalString(payload._eventType)
    const eventId = toOptionalString(payload._eventId)
    const entityReference = getEntityReferenceLabel(payload)
    const criticality = getCriticalityLabel(payload)

    if (eventType === EVENT_TYPES.pricingCatalogApprovalProposed) {
      const proposedByUserId = toOptionalString(payload.proposedByUserId)
      const proposedByName = toOptionalString(payload.proposedByName) ?? 'Greenhouse'
      const justification = toOptionalString(payload.justification)
      const actionLabel = getProposalActionLabel(payload)
      const title = `Aprobación pendiente: ${entityReference}`

      const body = justification
        ? `${proposedByName} propuso una ${actionLabel} (${criticality}). ${justification}`
        : `${proposedByName} propuso una ${actionLabel} (${criticality}).`

      const recipients = (await getRoleCodeNotificationRecipients([ROLE_CODES.EFEONCE_ADMIN])).filter(recipient =>
        buildNotificationRecipientKey(recipient) !== proposedByUserId
      )

      if (recipients.length > 0 && eventId) {
        const inAppRecipients = []

        for (const recipient of recipients) {
          const recipientKey = buildNotificationRecipientKey(recipient)

          if (!recipientKey) {
            continue
          }

          const alreadySent = await wasChannelAlreadySent({
            recipientKey,
            category: IN_APP_CATEGORY,
            channel: 'in_app',
            eventId
          })

          if (!alreadySent) {
            inAppRecipients.push(recipient)
          }
        }

        if (inAppRecipients.length > 0) {
          await NotificationService.dispatch({
            category: IN_APP_CATEGORY,
            title,
            body,
            actionUrl: APPROVALS_ACTION_URL,
            metadata: {
              ...payload,
              eventId
            },
            recipients: inAppRecipients
          })
        }
      }

      await sendDecisionEmails({
        recipients,
        title,
        body,
        eventId,
        sourceEntity: 'pricing_catalog_approval_proposed'
      })

      await maybeSendSlackNotification({
        eventId,
        payload,
        text: [
          ':clipboard: Pricing catalog approval proposed',
          `Item: \`${entityReference}\``,
          `Accion: \`${actionLabel}\``,
          `Criticidad: \`${criticality}\``,
          `Propuesto por: \`${proposedByName}\``,
          justification ? `Justificacion: ${justification}` : null,
          `Ruta: ${APPROVALS_ACTION_URL}`
        ].filter(Boolean).join('\n')
      })

      return `notified ${recipients.length} admin recipient(s) about pricing catalog approval proposal`
    }

    if (eventType === EVENT_TYPES.pricingCatalogApprovalDecided) {
      const proposerUserId = toOptionalString(payload.proposedByUserId)
      const proposer = proposerUserId ? await getUserNotificationRecipient(proposerUserId) : null

      if (!proposer) {
        return null
      }

      const decision = toOptionalString(payload.decision) ?? 'reviewed'
      const decidedByName = toOptionalString(payload.decidedByName) ?? 'Greenhouse'
      const comment = toOptionalString(payload.comment)
      const applied = toOptionalBoolean(payload.applied)
      const title = `Aprobación ${decision}: ${entityReference}`

      const body = [
        `${decidedByName} marcó la propuesta como ${decision}.`,
        applied === true ? 'Los cambios ya fueron aplicados.' : null,
        applied === false && decision === 'approved' ? 'La aprobación quedó registrada, pero no hubo auto-apply.' : null,
        comment ? `Comentario: ${comment}` : null
      ].filter(Boolean).join(' ')

      const proposerKey = buildNotificationRecipientKey(proposer)

      if (proposerKey && eventId) {
        const alreadySent = await wasChannelAlreadySent({
          recipientKey: proposerKey,
          category: IN_APP_CATEGORY,
          channel: 'in_app',
          eventId
        })

        if (!alreadySent) {
          await NotificationService.dispatch({
            category: IN_APP_CATEGORY,
            title,
            body,
            actionUrl: APPROVALS_ACTION_URL,
            metadata: {
              ...payload,
              eventId
            },
            recipients: [proposer]
          })
        }
      }

      await sendDecisionEmails({
        recipients: [proposer],
        title,
        body,
        eventId,
        sourceEntity: 'pricing_catalog_approval_decided'
      })

      await maybeSendSlackNotification({
        eventId,
        payload,
        text: [
          ':white_check_mark: Pricing catalog approval decided',
          `Item: \`${entityReference}\``,
          `Decision: \`${decision}\``,
          `Aplicado: \`${applied === true ? 'yes' : 'no'}\``,
          `Decidido por: \`${decidedByName}\``,
          comment ? `Comentario: ${comment}` : null,
          `Ruta: ${APPROVALS_ACTION_URL}`
        ].filter(Boolean).join('\n')
      })

      return `notified proposer ${proposerKey ?? proposer.userId ?? 'unknown'} about pricing catalog approval decision`
    }

    return null
  },
  maxRetries: 2
}

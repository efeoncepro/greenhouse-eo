import 'server-only'

import { ROLE_CODES } from '@/config/role-codes'
import { ensureNotificationSchema } from '@/lib/notifications/schema'
import { getRoleCodeNotificationRecipients } from '@/lib/notifications/person-recipient-resolver'
import { NotificationService } from '@/lib/notifications/notification-service'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

interface CancelledServiceRow extends Record<string, unknown> {
  service_id: string
  name: string
  organization_id: string | null
  created_by: string | null
}

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed || null
}

const loadService = async (serviceId: string): Promise<CancelledServiceRow | null> => {
  const rows = await runGreenhousePostgresQuery<CancelledServiceRow>(
    `SELECT service_id, name, organization_id, created_by
     FROM greenhouse_core.services
     WHERE service_id = $1
     LIMIT 1`,
    [serviceId]
  )

  return rows[0] ?? null
}

export const engagementCancelledProjection: ProjectionDefinition = {
  name: 'engagement_cancelled_manual_notification',
  description:
    'TASK-808: creates an internal in-app notification when an engagement is cancelled; no client-facing email is sent automatically.',
  domain: 'notifications',
  triggerEvents: [EVENT_TYPES.serviceEngagementCancelled],
  extractScope: payload => {
    const serviceId = asString(payload.serviceId) ?? asString(payload.service_id)

    if (!serviceId) return null

    return {
      entityType: 'service',
      entityId: serviceId
    }
  },
  refresh: async (scope, payload) => {
    await ensureNotificationSchema()

    const service = await loadService(scope.entityId)

    if (!service) {
      throw new Error(`Cancelled engagement service ${scope.entityId} was not found.`)
    }

    const recipients = await getRoleCodeNotificationRecipients([ROLE_CODES.EFEONCE_ADMIN])

    if (recipients.length === 0) {
      return `engagement ${scope.entityId}: no admin recipients for manual cancellation notification`
    }

    const cancellationReason = asString(payload.cancellationReason)
      ?? asString(payload.cancellation_reason)
      ?? 'Cancellation reason is available in the engagement audit log.'

    await NotificationService.dispatch({
      category: 'system_event',
      title: `Engagement cancelled: ${service.name || scope.entityId}`,
      body: `Manual operator follow-up required. ${cancellationReason}`,
      actionUrl: '/admin/ops-health',
      metadata: {
        ...payload,
        serviceId: scope.entityId,
        serviceName: service.name,
        organizationId: service.organization_id,
        automaticClientEmail: false
      },
      recipients
    })

    return `engagement ${scope.entityId}: notified ${recipients.length} admins for manual follow-up`
  },
  maxRetries: 5
}

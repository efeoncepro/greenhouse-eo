import 'server-only'

import type { WebhookEnvelope } from '@/lib/webhooks/types'
import { getHrAdminRecipients, getMemberRecipient, getPayrollPeriodRecipients, getUserRecipient, type RecipientResolutionResult } from './notification-recipients'

export interface NotificationDispatchMetadata {
  eventId: string
  eventType: string
  aggregateType: string
  aggregateId: string
  source: 'webhook_notifications'
}

export interface NotificationMapping {
  eventType: string
  category: string
  title: (envelope: WebhookEnvelope) => string
  body?: (envelope: WebhookEnvelope) => string | null
  actionUrl?: (envelope: WebhookEnvelope) => string | null
  resolveRecipients: (envelope: WebhookEnvelope) => Promise<RecipientResolutionResult>
  metadata: (envelope: WebhookEnvelope) => NotificationDispatchMetadata
}

const toPeriodLabel = (envelope: WebhookEnvelope) => {
  const year = typeof envelope.data.year === 'number' ? envelope.data.year : Number(envelope.data.year)
  const month = typeof envelope.data.month === 'number' ? envelope.data.month : Number(envelope.data.month)

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return 'este período'
  }

  return new Intl.DateTimeFormat('es-CL', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  }).format(new Date(Date.UTC(year, month - 1, 1, 12)))
}

const getMemberId = (envelope: WebhookEnvelope) =>
  typeof envelope.data.memberId === 'string' && envelope.data.memberId.trim() ? envelope.data.memberId : null

const baseMetadata = (envelope: WebhookEnvelope): NotificationDispatchMetadata => ({
  eventId: envelope.eventId,
  eventType: envelope.eventType,
  aggregateType: envelope.aggregateType,
  aggregateId: envelope.aggregateId,
  source: 'webhook_notifications'
})

export const NOTIFICATION_MAPPINGS: NotificationMapping[] = [
  {
    eventType: 'assignment.created',
    category: 'assignment_change',
    title: () => 'Tienes una nueva asignación activa',
    body: () => 'Revisa el detalle de tu asignación en Greenhouse.',
    actionUrl: () => '/my/assignments',
    resolveRecipients: async envelope => {
      const memberId = getMemberId(envelope)

      return memberId ? getMemberRecipient(memberId) : { recipients: [], unresolvedRecipients: 1 }
    },
    metadata: baseMetadata
  },
  {
    eventType: 'assignment.updated',
    category: 'assignment_change',
    title: () => 'Tu asignación fue actualizada',
    body: envelope => {
      const updatedFields = Array.isArray(envelope.data.updatedFields)
        ? envelope.data.updatedFields.filter(value => typeof value === 'string' && value.trim())
        : []

      return updatedFields.length > 0 ? `Campos actualizados: ${updatedFields.join(', ')}` : 'Se actualizaron datos de tu asignación.'
    },
    actionUrl: () => '/my/assignments',
    resolveRecipients: async envelope => {
      const memberId = getMemberId(envelope)

      return memberId ? getMemberRecipient(memberId) : { recipients: [], unresolvedRecipients: 1 }
    },
    metadata: baseMetadata
  },
  {
    eventType: 'assignment.removed',
    category: 'assignment_change',
    title: () => 'Una asignación fue desactivada',
    body: () => 'Tu asignación dejó de estar activa.',
    actionUrl: () => '/my/assignments',
    resolveRecipients: async envelope => {
      const memberId = getMemberId(envelope)

      return memberId ? getMemberRecipient(memberId) : { recipients: [], unresolvedRecipients: 1 }
    },
    metadata: baseMetadata
  },
  {
    eventType: 'compensation_version.created',
    category: 'payroll_ready',
    title: () => 'Tu compensación fue actualizada',
    body: envelope => {
      const effectiveFrom = typeof envelope.data.effectiveFrom === 'string' ? envelope.data.effectiveFrom : null

      return effectiveFrom ? `Vigencia desde ${effectiveFrom}.` : 'Revisa el detalle actualizado en tu perfil.'
    },
    actionUrl: () => '/my/profile',
    resolveRecipients: async envelope => {
      const memberId = getMemberId(envelope)

      return memberId ? getMemberRecipient(memberId) : { recipients: [], unresolvedRecipients: 1 }
    },
    metadata: baseMetadata
  },
  {
    eventType: 'member.created',
    category: 'system_event',
    title: envelope => {
      const displayName = typeof envelope.data.displayName === 'string' && envelope.data.displayName.trim()
        ? envelope.data.displayName
        : 'Nuevo colaborador'

      return `Nuevo colaborador: ${displayName}`
    },
    actionUrl: envelope => {
      const memberId = getMemberId(envelope)

      return memberId ? `/people/${memberId}` : '/people'
    },
    resolveRecipients: getHrAdminRecipients,
    metadata: baseMetadata
  },
  {
    eventType: 'identity.email_verification.completed',
    category: 'system_event',
    title: () => 'Tu correo fue verificado exitosamente',
    body: () => 'Tu identidad quedó confirmada en Greenhouse.',
    actionUrl: () => '/my/profile',
    resolveRecipients: async envelope => {
      const userId = typeof envelope.data.userId === 'string' && envelope.data.userId.trim()
        ? envelope.data.userId
        : null

      return userId ? getUserRecipient(userId) : { recipients: [], unresolvedRecipients: 1 }
    },
    metadata: baseMetadata
  },
  {
    eventType: 'payroll_period.exported',
    category: 'payroll_ready',
    title: envelope => `Tu nómina de ${toPeriodLabel(envelope)} está lista`,
    body: () => 'Ya puedes revisar tu período exportado y los documentos disponibles.',
    actionUrl: () => '/my/payroll',
    resolveRecipients: async envelope => {
      const periodId = typeof envelope.data.periodId === 'string' && envelope.data.periodId.trim() ? envelope.data.periodId : null

      return periodId ? getPayrollPeriodRecipients(periodId) : { recipients: [], unresolvedRecipients: 0 }
    },
    metadata: baseMetadata
  }
]

export const NOTIFICATION_EVENT_TYPES = NOTIFICATION_MAPPINGS.map(mapping => mapping.eventType)

export const findNotificationMapping = (eventType: string): NotificationMapping | null =>
  NOTIFICATION_MAPPINGS.find(mapping => mapping.eventType === eventType) ?? null

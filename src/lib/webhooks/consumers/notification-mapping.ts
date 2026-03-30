import 'server-only'

import type { WebhookEnvelope } from '@/lib/webhooks/types'
import { getFinanceAdminRecipients, getHrAdminRecipients, getMemberRecipient, getPayrollPeriodRecipients, getUserRecipient, type RecipientResolutionResult } from './notification-recipients'

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
  // ── Finance alerts ──

  {
    eventType: 'finance.income_payment.recorded',
    category: 'finance_alert',
    title: envelope => {
      const amount = typeof envelope.data.amount === 'number'
        ? `$${envelope.data.amount.toLocaleString('es-CL')}`
        : 'un pago'

      return `Pago registrado: ${amount}`
    },
    body: envelope => {
      const incomeId = typeof envelope.data.incomeId === 'string' ? envelope.data.incomeId : null

      return incomeId ? `Factura: ${incomeId}` : 'Pago registrado en el sistema.'
    },
    actionUrl: envelope => {
      const incomeId = typeof envelope.data.incomeId === 'string' ? envelope.data.incomeId : null

      return incomeId ? `/finance/income/${incomeId}` : '/finance/income'
    },
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },
  {
    eventType: 'finance.expense.created',
    category: 'finance_alert',
    title: envelope => {
      const description = typeof envelope.data.description === 'string' && envelope.data.description.trim()
        ? envelope.data.description
        : 'Nuevo gasto'

      return description.length > 50 ? `${description.slice(0, 47)}...` : description
    },
    body: envelope => {
      const amount = typeof envelope.data.totalAmountClp === 'number'
        ? `$${envelope.data.totalAmountClp.toLocaleString('es-CL')} CLP`
        : null

      return amount ? `Monto: ${amount}` : 'Gasto registrado en el sistema.'
    },
    actionUrl: envelope => {
      const expenseId = typeof envelope.data.expenseId === 'string' ? envelope.data.expenseId : null

      return expenseId ? `/finance/expenses/${expenseId}` : '/finance/expenses'
    },
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },
  {
    eventType: 'finance.dte.discrepancy_found',
    category: 'finance_alert',
    title: envelope => {
      const orgName = typeof envelope.data.organizationName === 'string' && envelope.data.organizationName.trim()
        ? envelope.data.organizationName
        : 'una organización'

      return `Discrepancia DTE detectada en ${orgName}`
    },
    body: () => 'Se encontró una diferencia entre el monto registrado y el DTE tributario.',
    actionUrl: () => '/finance/reconciliation',
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },
  {
    eventType: 'finance.income.created',
    category: 'finance_alert',
    title: envelope => {
      const clientName = typeof envelope.data.clientName === 'string' && envelope.data.clientName.trim()
        ? envelope.data.clientName
        : null

      return clientName ? `Nuevo ingreso para ${clientName}` : 'Nuevo ingreso registrado'
    },
    body: envelope => {
      const amount = typeof envelope.data.totalAmountClp === 'number'
        ? `$${envelope.data.totalAmountClp.toLocaleString('es-CL')} CLP`
        : null

      return amount ? `Monto: ${amount}` : null
    },
    actionUrl: envelope => {
      const incomeId = typeof envelope.data.incomeId === 'string' ? envelope.data.incomeId : null

      return incomeId ? `/finance/income/${incomeId}` : '/finance/income'
    },
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },
  {
    eventType: 'finance.exchange_rate.upserted',
    category: 'finance_alert',
    title: () => 'Tipo de cambio actualizado',
    body: envelope => {
      const rate = typeof envelope.data.rate === 'number' ? envelope.data.rate : null
      const from = typeof envelope.data.fromCurrency === 'string' ? envelope.data.fromCurrency : 'USD'
      const to = typeof envelope.data.toCurrency === 'string' ? envelope.data.toCurrency : 'CLP'

      return rate ? `${from}/${to}: $${rate.toLocaleString('es-CL')}` : `${from}/${to} actualizado.`
    },
    actionUrl: () => '/finance',
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },

  {
    eventType: 'finance.credit_note.created',
    category: 'finance_alert',
    title: envelope => {
      const clientName = typeof envelope.data.clientName === 'string' && envelope.data.clientName.trim()
        ? envelope.data.clientName
        : null

      return clientName ? `Nota de crédito registrada para ${clientName}` : 'Nota de crédito registrada'
    },
    body: envelope => {
      const amount = typeof envelope.data.totalAmountClp === 'number'
        ? `$${Math.abs(envelope.data.totalAmountClp).toLocaleString('es-CL')} CLP`
        : null

      return amount ? `Monto: ${amount} (resta del ingreso)` : 'Resta del ingreso del período.'
    },
    actionUrl: () => '/finance/income',
    resolveRecipients: getFinanceAdminRecipients,
    metadata: baseMetadata
  },

  // ── Identity ──

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

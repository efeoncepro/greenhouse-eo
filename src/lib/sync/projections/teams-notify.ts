import 'server-only'

import {
  buildDeliveryPulseCard,
  buildFinanceAlertCard,
  buildOpsAlertCard,
  postTeamsCard,
  type FinanceAlertKind
} from '@/lib/integrations/teams'

import type { ProjectionDefinition } from '../projection-registry'

const PORTAL_ORIGIN = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://greenhouse.efeoncepro.com'

const OPS_HEALTH_URL = `${PORTAL_ORIGIN}/admin/ops-health`

const FINANCE_PERIOD_URL = (period: string | null) =>
  period ? `${PORTAL_ORIGIN}/finance/vat?period=${encodeURIComponent(period)}` : `${PORTAL_ORIGIN}/finance`

const PULSE_URL = `${PORTAL_ORIGIN}/agency/pulse`

const FINANCE_KIND_BY_EVENT: Record<string, FinanceAlertKind> = {
  'finance.vat_position.period_materialized': 'vat_period_materialized',
  'finance.balance_divergence.detected': 'balance_divergence',
  'finance.sii_claim.detected': 'sii_claim_detected',
  'finance.fx_sync.all_providers_failed': 'fx_sync_failure',
  'accounting.margin_alert.triggered': 'margin_alert',
  'finance.dte.discrepancy_found': 'dte_discrepancy'
}

const FINANCE_TITLE_BY_KIND: Record<FinanceAlertKind, string> = {
  vat_period_materialized: 'Cierre de IVA materializado',
  balance_divergence: 'Divergencia de balance detectada',
  sii_claim_detected: 'Reclamo SII detectado',
  fx_sync_failure: 'Tipos de cambio sin sincronizar',
  margin_alert: 'Alerta de margen activada',
  dte_discrepancy: 'Discrepancia DTE encontrada',
  generic: 'Aviso financiero'
}

const FINANCE_EVENTS = [
  'finance.vat_position.period_materialized',
  'finance.balance_divergence.detected',
  'finance.sii_claim.detected',
  'finance.fx_sync.all_providers_failed',
  'accounting.margin_alert.triggered',
  'finance.dte.discrepancy_found'
] as const

const DELIVERY_EVENTS = ['delivery.daily_pulse.materialized'] as const

const OPS_EVENTS = ['ops.error.unhandled', 'ops.recovery.executed', 'platform.alert.raised'] as const

const ALL_TRIGGER_EVENTS = [
  ...FINANCE_EVENTS,
  ...DELIVERY_EVENTS,
  ...OPS_EVENTS
] as const

const asString = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number') return String(value)

  return null
}

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

const dispatchOpsAlert = async ({
  eventType,
  eventId,
  payload
}: {
  eventType: string
  eventId: string | null
  payload: Record<string, unknown>
}) => {
  const severity = (asString(payload.severity) as 'critical' | 'warning' | 'info' | null) || 'critical'
  const title = asString(payload.title) || `Evento ${eventType}`

  const message =
    asString(payload.message) ||
    asString(payload.error) ||
    'Se detecto un evento que requiere atencion del equipo.'

  const source = asString(payload.source) || asString(payload.module) || 'greenhouse'
  const environment = asString(payload.environment) || asString(payload.env) || process.env.VERCEL_ENV || process.env.NODE_ENV || undefined
  const occurredAt = asString(payload.occurredAt) || asString(payload.occurred_at) || new Date().toISOString()
  const actionUrl = asString(payload.actionUrl) || OPS_HEALTH_URL
  const actionLabel = asString(payload.actionLabel) || 'Ver Ops Health'

  const card = buildOpsAlertCard({
    title,
    message,
    severity,
    source,
    occurredAt,
    environment,
    actionUrl,
    actionLabel
  })

  return postTeamsCard('ops-alerts', card, {
    correlationId: eventId || undefined,
    triggeredBy: 'projection:teams_notify',
    sourceObjectId: eventType
  })
}

const dispatchFinanceAlert = async ({
  eventType,
  eventId,
  payload
}: {
  eventType: string
  eventId: string | null
  payload: Record<string, unknown>
}) => {
  const kind = FINANCE_KIND_BY_EVENT[eventType] || 'generic'
  const title = asString(payload.title) || FINANCE_TITLE_BY_KIND[kind]

  const summary =
    asString(payload.summary) ||
    asString(payload.message) ||
    'Evento financiero detectado por Greenhouse.'

  const period = asString(payload.period) || asString(payload.month) || asString(payload.fiscalPeriod)
  const entity = asString(payload.entity) || asString(payload.legalEntity) || asString(payload.taxpayer)
  const amountCLP = asNumber(payload.amountCLP) ?? asNumber(payload.amount_clp)
  const amountUSD = asNumber(payload.amountUSD) ?? asNumber(payload.amount_usd)
  const occurredAt = asString(payload.occurredAt) || asString(payload.occurred_at) || new Date().toISOString()
  const detailUrl = asString(payload.detailUrl) || FINANCE_PERIOD_URL(period)

  const card = buildFinanceAlertCard({
    kind,
    title,
    summary,
    period: period || undefined,
    entity: entity || undefined,
    amountCLP,
    amountUSD,
    occurredAt,
    detailUrl,
    detailLabel: 'Ver en Greenhouse'
  })

  return postTeamsCard('finance-alerts', card, {
    correlationId: eventId || undefined,
    triggeredBy: 'projection:teams_notify',
    sourceObjectId: eventType
  })
}

const dispatchDeliveryPulse = async ({
  eventId,
  payload
}: {
  eventType: string
  eventId: string | null
  payload: Record<string, unknown>
}) => {
  const date = asString(payload.date) || new Date().toISOString().slice(0, 10)
  const headline = asString(payload.headline) || 'Pulse diario de delivery'
  const summary = asString(payload.summary) || 'Resumen del estado operativo del portfolio.'
  const dashboardUrl = asString(payload.dashboardUrl) || PULSE_URL

  type PulseKpi = {
    label: string
    value: string
    trend: 'up' | 'down' | 'flat' | null
    comparison?: string
  }
  const rawKpis = Array.isArray(payload.kpis) ? payload.kpis : []

  const kpis: PulseKpi[] = rawKpis.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const candidate = item as Record<string, unknown>
    const label = asString(candidate.label)
    const value = asString(candidate.value)

    if (!label || !value) return []

    const comparison = asString(candidate.comparison)

    const kpi: PulseKpi = {
      label,
      value,
      trend: (asString(candidate.trend) as 'up' | 'down' | 'flat' | null) || null
    }

    if (comparison) kpi.comparison = comparison

    return [kpi]
  })

  const alerts = Array.isArray(payload.alerts)
    ? payload.alerts.map(asString).filter((item): item is string => Boolean(item))
    : undefined

  if (kpis.length === 0) {
    // Skip pulse if upstream did not produce KPIs — return null so the projection consumer
    // can mark the event as processed without firing an empty card.
    return { ok: true, channelCode: 'delivery-pulse', skipped: true } as const
  }

  const card = buildDeliveryPulseCard({
    date,
    headline,
    summary,
    kpis,
    alerts,
    dashboardUrl
  })

  return postTeamsCard('delivery-pulse', card, {
    correlationId: eventId || undefined,
    triggeredBy: 'projection:teams_notify',
    sourceObjectId: 'delivery.daily_pulse.materialized'
  })
}

export const teamsNotifyProjection: ProjectionDefinition = {
  name: 'teams_notify',
  description:
    'Posts Adaptive Card 1.5 messages to Microsoft Teams channels (ops-alerts, finance-alerts, delivery-pulse) ' +
    'in response to outbox events. Implementation routes through Azure Logic Apps Consumption today; the channel_kind ' +
    'discriminator in greenhouse_core.teams_notification_channels lets us swap a row to teams_bot/Bot Framework ' +
    'without touching this projection.',
  domain: 'notifications',
  triggerEvents: [...ALL_TRIGGER_EVENTS],

  extractScope: payload => {
    const eventType = payload._eventType as string | undefined
    const eventId = (payload._eventId as string | undefined) || null

    if (!eventType) return null

    return { entityType: 'teams_channel', entityId: `${eventType}:${eventId || 'noid'}` }
  },

  refresh: async (scope, payload) => {
    const eventType = scope.entityId.split(':')[0]
    const eventId = (payload._eventId as string | undefined) || null

    if (!eventType) return null

    if ((OPS_EVENTS as readonly string[]).includes(eventType)) {
      const result = await dispatchOpsAlert({ eventType, eventId, payload })

      return result.ok ? `ops-alerts:sent` : `ops-alerts:failed:${result.reason}`
    }

    if ((FINANCE_EVENTS as readonly string[]).includes(eventType)) {
      const result = await dispatchFinanceAlert({ eventType, eventId, payload })

      return result.ok ? `finance-alerts:sent` : `finance-alerts:failed:${result.reason}`
    }

    if ((DELIVERY_EVENTS as readonly string[]).includes(eventType)) {
      const result = await dispatchDeliveryPulse({ eventType, eventId, payload })

      if ('skipped' in result && result.skipped) {
        return 'delivery-pulse:skipped:no_kpis'
      }

      if (result.ok) return 'delivery-pulse:sent'

      return `delivery-pulse:failed:${result.reason}`
    }

    return null
  }
}

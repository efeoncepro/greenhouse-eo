import 'server-only'

import { randomUUID } from 'node:crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { REACTIVE_EVENT_TYPES } from './event-catalog'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ensureNotificationSchema } from '@/lib/notifications/schema'

// ── Types ──

export interface ReactiveConsumerResult {
  runId: string
  eventsProcessed: number
  eventsFailed: number
  actions: string[]
  durationMs: number
}

type ReactiveEventRow = {
  event_id: string
  aggregate_type: string
  aggregate_id: string
  event_type: string
  payload_json: unknown
  occurred_at: string | Date
}

// ── Handler registry ──

type EventHandler = (event: ReactiveEventRow, payload: Record<string, unknown>) => Promise<string | null>

const handlers: Record<string, EventHandler> = {
  // Organization 360 invalidation
  'assignment.created': invalidateOrganization360,
  'assignment.updated': invalidateOrganization360,
  'assignment.removed': invalidateOrganization360,
  'membership.created': invalidateOrganization360,
  'membership.updated': invalidateOrganization360,
  'membership.deactivated': invalidateOrganization360,

  // Notification triggers
  'service.created': notifyServiceCreated,
  'identity.reconciliation.approved': notifyReconciliationApproved,
  'finance.dte.discrepancy_found': notifyDteDiscrepancy,
  'identity.profile.linked': notifyProfileLinked
}

// ── Handler implementations ──

async function invalidateOrganization360(
  _event: ReactiveEventRow,
  payload: Record<string, unknown>
): Promise<string | null> {
  // Invalidate the organization_360 materialized view cache
  // by touching the updated_at of the relevant organization.
  // This ensures the next read will recompute the serving view.
  const organizationId = (payload.organizationId as string) || null
  const clientId = (payload.clientId as string) || null

  if (organizationId) {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.organizations SET updated_at = CURRENT_TIMESTAMP WHERE organization_id = $1`,
      [organizationId]
    )

    return `invalidated org ${organizationId}`
  }

  if (clientId) {
    // For assignment events, the clientId maps to the organization's space
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.organizations SET updated_at = CURRENT_TIMESTAMP
       WHERE organization_id IN (
         SELECT DISTINCT organization_id FROM greenhouse_core.person_memberships
         WHERE space_id IN (SELECT space_id FROM greenhouse_core.spaces WHERE tenant_id = $1)
         AND active = TRUE
       )`,
      [clientId]
    )

    return `invalidated orgs for client ${clientId}`
  }

  return null
}

// ── Notification handlers ──

async function notifyServiceCreated(
  _event: ReactiveEventRow,
  payload: Record<string, unknown>
): Promise<string | null> {
  await ensureNotificationSchema()

  const adminUsers = await runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name FROM greenhouse_core.client_users
     WHERE status = 'active' AND role_codes @> ARRAY['efeonce_admin']
     LIMIT 10`
  )

  if (adminUsers.length === 0) return null

  await NotificationService.dispatch({
    category: 'system_event',
    title: `Nuevo servicio: ${(payload.name as string) || 'Sin nombre'}`,
    body: `Línea: ${(payload.lineaDeServicio as string) || '—'} · ${(payload.servicioEspecifico as string) || '—'}`,
    actionUrl: '/agency/services',
    metadata: payload,
    recipients: adminUsers.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
  })

  return `notified ${adminUsers.length} admins about service.created`
}

async function notifyReconciliationApproved(
  _event: ReactiveEventRow,
  payload: Record<string, unknown>
): Promise<string | null> {
  await ensureNotificationSchema()

  const adminUsers = await runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name FROM greenhouse_core.client_users
     WHERE status = 'active' AND role_codes @> ARRAY['efeonce_admin']
     LIMIT 10`
  )

  if (adminUsers.length === 0) return null

  await NotificationService.dispatch({
    category: 'system_event',
    title: 'Reconciliación de identidad aprobada',
    body: `Perfil vinculado correctamente`,
    actionUrl: '/admin/identity',
    metadata: payload,
    recipients: adminUsers.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
  })

  return `notified admins about reconciliation.approved`
}

async function notifyDteDiscrepancy(
  _event: ReactiveEventRow,
  payload: Record<string, unknown>
): Promise<string | null> {
  await ensureNotificationSchema()

  const financeUsers = await runGreenhousePostgresQuery<{ user_id: string; email: string; full_name: string } & Record<string, unknown>>(
    `SELECT user_id, email, full_name FROM greenhouse_core.client_users
     WHERE status = 'active'
       AND (role_codes @> ARRAY['finance_manager'] OR role_codes @> ARRAY['efeonce_admin'])
     LIMIT 10`
  )

  if (financeUsers.length === 0) return null

  await NotificationService.dispatch({
    category: 'ico_alert',
    title: 'Discrepancia DTE detectada',
    body: `Se encontró una discrepancia en la reconciliación de documentos tributarios`,
    actionUrl: '/finance/dte-reconciliation',
    metadata: payload,
    recipients: financeUsers.map(u => ({ userId: u.user_id, email: u.email, fullName: u.full_name }))
  })

  return `notified ${financeUsers.length} finance users about DTE discrepancy`
}

async function notifyProfileLinked(
  _event: ReactiveEventRow,
  payload: Record<string, unknown>
): Promise<string | null> {
  await ensureNotificationSchema()

  const userId = payload.userId as string

  if (!userId) return null

  await NotificationService.dispatch({
    category: 'assignment_change',
    title: 'Perfil vinculado exitosamente',
    body: 'Tu identidad fue verificada y vinculada a tu perfil de equipo',
    actionUrl: '/people/me',
    metadata: payload,
    recipients: [{ userId }]
  })

  return `notified user ${userId} about profile.linked`
}

// ── Main consumer ──

export const processReactiveEvents = async (options?: {
  batchSize?: number
}): Promise<ReactiveConsumerResult> => {
  const startMs = Date.now()
  const runId = `react-${randomUUID()}`
  const batchSize = options?.batchSize ?? 50
  const actions: string[] = []
  let eventsFailed = 0

  // Read published events that haven't been reactively processed yet.
  // We use a dedicated status column 'reacted' to track this separately
  // from the BigQuery publish status. For simplicity, we use a separate
  // tracking table to avoid altering the outbox_events schema.
  const events = await runGreenhousePostgresQuery<ReactiveEventRow>(
    `SELECT event_id, aggregate_type, aggregate_id, event_type, payload_json, occurred_at
     FROM greenhouse_sync.outbox_events
     WHERE status = 'published'
       AND event_type = ANY($1)
       AND occurred_at > NOW() - INTERVAL '1 hour'
       AND event_id NOT IN (
         SELECT event_id FROM greenhouse_sync.outbox_reactive_log
       )
     ORDER BY occurred_at ASC
     LIMIT $2`,
    [REACTIVE_EVENT_TYPES as unknown as string[], batchSize]
  )

  if (events.length === 0) {
    return { runId, eventsProcessed: 0, eventsFailed: 0, actions: [], durationMs: Date.now() - startMs }
  }

  for (const event of events) {
    const handler = handlers[event.event_type]

    if (!handler) continue

    try {
      const payload = typeof event.payload_json === 'string'
        ? JSON.parse(event.payload_json)
        : (event.payload_json as Record<string, unknown>) || {}

      const actionDescription = await handler(event, payload)

      if (actionDescription) {
        actions.push(actionDescription)
      }

      // Mark as reacted
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_sync.outbox_reactive_log (event_id, reacted_at, handler, result)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.event_id, event.event_type, actionDescription || 'no-op']
      )
    } catch (error) {
      eventsFailed++
      console.error(`[reactive-consumer] Failed to process event ${event.event_id}:`, error)

      // Log failure but don't block the batch
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_sync.outbox_reactive_log (event_id, reacted_at, handler, result)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.event_id, event.event_type, `error: ${error instanceof Error ? error.message : String(error)}`]
      ).catch(() => {})
    }
  }

  return {
    runId,
    eventsProcessed: events.length,
    eventsFailed,
    actions,
    durationMs: Date.now() - startMs
  }
}

// ── Schema provisioning for reactive log table ──

let ensureReactiveSchemaPromise: Promise<void> | null = null

export const ensureReactiveSchema = async () => {
  if (ensureReactiveSchemaPromise) return ensureReactiveSchemaPromise

  ensureReactiveSchemaPromise = runGreenhousePostgresQuery(`
    CREATE TABLE IF NOT EXISTS greenhouse_sync.outbox_reactive_log (
      event_id TEXT PRIMARY KEY,
      reacted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      handler TEXT,
      result TEXT
    )
  `).then(() => {}).catch(error => {
    ensureReactiveSchemaPromise = null
    throw error
  })

  return ensureReactiveSchemaPromise
}

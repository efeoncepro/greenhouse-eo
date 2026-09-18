import 'server-only'

/**
 * TASK-1848 — acceso a datos del DeliveryIntent. Escribe sólo `greenhouse_insights.insight_delivery_*`;
 * lee `email_deliveries` (transporte canónico) y `session_360` (destinatarios) sin escribirlos.
 */

import type { InsightActorKind } from '../contracts/states'
import { runInsightsQuery, toIso, type InsightsDbClient } from '../stores/db'

import type {
  InsightDeliveryIntentRecord,
  InsightDeliveryIntentState,
  InsightDeliveryModality,
  InsightDeliveryRecipientKind,
  InsightDeliveryRecipientRecord,
  InsightDeliveryRecipientState,
  InsightDeliverySkipReason,
  InsightDeliveryTransportStatus
} from './contracts'

const INTENT_COLUMNS = `delivery_intent_id, organization_id, edition_id, edition_issued_hash, modality, outputs, subject, message,
  share_ttl_days, attachment_irrevocable_ack, idempotency_key, request_hash, state, authorized_by_actor_kind,
  authorized_by_user_id, cancelled_at, cancel_reason, created_at, updated_at`

const RECIPIENT_COLUMNS = `delivery_recipient_id, delivery_intent_id, organization_id, edition_id, recipient_key, recipient_kind,
  recipient_user_id, state, skip_reason, attempts, email_delivery_id, share_grant_id, last_error_code, claimed_at,
  finished_at, created_at`

const mapIntent = (row: Record<string, unknown>): InsightDeliveryIntentRecord => ({
  deliveryIntentId: row.delivery_intent_id as string,
  organizationId: row.organization_id as string,
  editionId: row.edition_id as string,
  editionIssuedHash: row.edition_issued_hash as string,
  modality: row.modality as InsightDeliveryModality,
  outputs: (row.outputs as string[]) ?? [],
  subject: row.subject as string,
  message: (row.message as string | null) ?? null,
  shareTtlDays: (row.share_ttl_days as number | null) ?? null,
  attachmentIrrevocableAck: Boolean(row.attachment_irrevocable_ack),
  idempotencyKey: row.idempotency_key as string,
  requestHash: row.request_hash as string,
  state: row.state as InsightDeliveryIntentState,
  authorizedByActorKind: row.authorized_by_actor_kind as InsightActorKind,
  authorizedByUserId: (row.authorized_by_user_id as string | null) ?? null,
  cancelledAt: toIso(row.cancelled_at),
  cancelReason: (row.cancel_reason as string | null) ?? null,
  createdAt: toIso(row.created_at) ?? '',
  updatedAt: toIso(row.updated_at) ?? ''
})

const mapRecipient = (row: Record<string, unknown>): InsightDeliveryRecipientRecord => ({
  deliveryRecipientId: row.delivery_recipient_id as string,
  deliveryIntentId: row.delivery_intent_id as string,
  organizationId: row.organization_id as string,
  editionId: row.edition_id as string,
  recipientKey: row.recipient_key as string,
  recipientKind: row.recipient_kind as InsightDeliveryRecipientKind,
  recipientUserId: row.recipient_user_id as string,
  state: row.state as InsightDeliveryRecipientState,
  skipReason: (row.skip_reason as InsightDeliverySkipReason | null) ?? null,
  attempts: Number(row.attempts ?? 0),
  emailDeliveryId: (row.email_delivery_id as string | null) ?? null,
  shareGrantId: (row.share_grant_id as string | null) ?? null,
  lastErrorCode: (row.last_error_code as string | null) ?? null,
  claimedAt: toIso(row.claimed_at),
  finishedAt: toIso(row.finished_at),
  createdAt: toIso(row.created_at) ?? ''
})

// ── Destinatarios ─────────────────────────────────────────────────────────────────────────────

export interface ResolvedInsightDeliveryRecipient {
  userId: string
  email: string
  fullName: string | null
  kind: InsightDeliveryRecipientKind
  locale: string | null
  undeliverable: boolean
}

/**
 * Sólo personas del portal: usuarios cliente ACTIVOS de la organización de la edición, o usuarios
 * internos activos. Nunca una dirección libre (el sender de Efeonce no es un relay abierto).
 */
export const resolveInsightDeliveryRecipients = async (organizationId: string, userIds: string[], client?: InsightsDbClient): Promise<ResolvedInsightDeliveryRecipient[]> => {
  if (userIds.length === 0) return []

  const rows = await runInsightsQuery<{
    user_id: string
    email: string | null
    full_name: string | null
    tenant_type: string
    effective_locale: string | null
    email_undeliverable: boolean | null
  }>(
    client,
    `SELECT s.user_id, s.email, s.full_name, s.tenant_type, s.effective_locale, cu.email_undeliverable
       FROM greenhouse_serving.session_360 s
       LEFT JOIN greenhouse_core.client_users cu ON cu.user_id = s.user_id
      WHERE s.user_id = ANY($2::text[])
        AND s.active = TRUE
        AND s.status = 'active'
        AND s.email IS NOT NULL
        AND ((s.tenant_type = 'client' AND s.organization_id = $1) OR s.tenant_type = 'efeonce_internal')`,
    [organizationId, userIds]
  )

  return rows.map(row => ({
    userId: row.user_id,
    email: (row.email ?? '').trim().toLowerCase(),
    fullName: row.full_name,
    kind: row.tenant_type === 'client' ? 'client_user' : 'internal_user',
    locale: row.effective_locale,
    undeliverable: Boolean(row.email_undeliverable)
  }))
}

// ── Intents ───────────────────────────────────────────────────────────────────────────────────

export interface InsertInsightDeliveryIntentInput {
  organizationId: string
  editionId: string
  editionIssuedHash: string
  modality: InsightDeliveryModality
  outputs: string[]
  subject: string
  message: string | null
  shareTtlDays: number | null
  attachmentIrrevocableAck: boolean
  idempotencyKey: string
  requestHash: string
  authorizedByActorKind: InsightActorKind
  authorizedByUserId: string | null
}

export const insertInsightDeliveryIntent = async (client: InsightsDbClient, input: InsertInsightDeliveryIntentInput): Promise<InsightDeliveryIntentRecord> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `INSERT INTO greenhouse_insights.insight_delivery_intents
       (organization_id, edition_id, edition_issued_hash, modality, outputs, subject, message, share_ttl_days,
        attachment_irrevocable_ack, idempotency_key, request_hash, authorized_by_actor_kind, authorized_by_user_id)
     VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING ${INTENT_COLUMNS}`,
    [
      input.organizationId, input.editionId, input.editionIssuedHash, input.modality, input.outputs, input.subject, input.message,
      input.shareTtlDays, input.attachmentIrrevocableAck, input.idempotencyKey, input.requestHash, input.authorizedByActorKind, input.authorizedByUserId
    ]
  )

  return mapIntent(rows[0]!)
}

export const findInsightDeliveryIntentByKey = async (client: InsightsDbClient | undefined, organizationId: string, idempotencyKey: string): Promise<InsightDeliveryIntentRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT ${INTENT_COLUMNS} FROM greenhouse_insights.insight_delivery_intents WHERE organization_id = $1 AND idempotency_key = $2`,
    [organizationId, idempotencyKey]
  )

  return rows[0] ? mapIntent(rows[0]) : null
}

export const getInsightDeliveryIntent = async (
  client: InsightsDbClient | undefined,
  deliveryIntentId: string,
  options: { organizationId?: string; forUpdate?: boolean } = {}
): Promise<InsightDeliveryIntentRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT ${INTENT_COLUMNS} FROM greenhouse_insights.insight_delivery_intents
      WHERE delivery_intent_id = $1${options.organizationId ? ' AND organization_id = $2' : ''}${options.forUpdate ? ' FOR UPDATE' : ''}`,
    options.organizationId ? [deliveryIntentId, options.organizationId] : [deliveryIntentId]
  )

  return rows[0] ? mapIntent(rows[0]) : null
}

export const listInsightDeliveryIntentsForEdition = async (organizationId: string, editionId: string): Promise<InsightDeliveryIntentRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `SELECT ${INTENT_COLUMNS} FROM greenhouse_insights.insight_delivery_intents
      WHERE organization_id = $1 AND edition_id = $2
      ORDER BY created_at DESC, delivery_intent_id COLLATE "C" DESC
      LIMIT 100`,
    [organizationId, editionId]
  )

  return rows.map(mapIntent)
}

export const setInsightDeliveryIntentState = async (
  client: InsightsDbClient,
  input: { deliveryIntentId: string; state: InsightDeliveryIntentState; cancelReason?: string | null }
): Promise<void> => {
  await runInsightsQuery(
    client,
    `UPDATE greenhouse_insights.insight_delivery_intents
        SET state = $2,
            cancelled_at = CASE WHEN $2 = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END,
            cancel_reason = CASE WHEN $2 = 'cancelled' THEN COALESCE(cancel_reason, $3) ELSE cancel_reason END,
            updated_at = now()
      WHERE delivery_intent_id = $1 AND state <> 'cancelled'`,
    [input.deliveryIntentId, input.state, input.cancelReason ?? null]
  )
}

// ── Destinatarios del intent ──────────────────────────────────────────────────────────────────

export interface InsertInsightDeliveryRecipientInput {
  deliveryIntentId: string
  organizationId: string
  editionId: string
  editionIssuedHash: string
  modality: InsightDeliveryModality
  recipientKey: string
  recipientKind: InsightDeliveryRecipientKind
  recipientUserId: string
}

/**
 * Inserta un destinatario; si la MISMA persona ya tiene vivo o aceptado un envío de esta versión por
 * esta modalidad (índice único parcial), la fila nace `skipped/duplicate_delivery` en vez de
 * duplicar. `NOT EXISTS` evita el conflicto; el índice es la guarda ante la carrera.
 */
export const insertInsightDeliveryRecipient = async (client: InsightsDbClient, input: InsertInsightDeliveryRecipientInput): Promise<InsightDeliveryRecipientRecord> => {
  const params = [
    input.deliveryIntentId, input.organizationId, input.editionId, input.editionIssuedHash, input.modality,
    input.recipientKey, input.recipientKind, input.recipientUserId
  ]

  const inserted = await runInsightsQuery<Record<string, unknown>>(
    client,
    `INSERT INTO greenhouse_insights.insight_delivery_recipients
       (delivery_intent_id, organization_id, edition_id, edition_issued_hash, modality, recipient_key, recipient_kind, recipient_user_id)
     SELECT $1, $2, $3, $4, $5, $6, $7, $8
      WHERE NOT EXISTS (
        SELECT 1 FROM greenhouse_insights.insight_delivery_recipients r
         WHERE r.organization_id = $2 AND r.edition_id = $3 AND r.edition_issued_hash = $4 AND r.modality = $5
           AND r.recipient_key = $6 AND r.state IN ('pending', 'claimed', 'accepted', 'ambiguous')
      )
     ON CONFLICT DO NOTHING
     RETURNING ${RECIPIENT_COLUMNS}`,
    params
  )

  if (inserted[0]) return mapRecipient(inserted[0])

  const skipped = await runInsightsQuery<Record<string, unknown>>(
    client,
    `INSERT INTO greenhouse_insights.insight_delivery_recipients
       (delivery_intent_id, organization_id, edition_id, edition_issued_hash, modality, recipient_key, recipient_kind, recipient_user_id,
        state, skip_reason, finished_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'skipped', 'duplicate_delivery', now())
     ON CONFLICT (delivery_intent_id, recipient_key) DO NOTHING
     RETURNING ${RECIPIENT_COLUMNS}`,
    params
  )

  return mapRecipient(skipped[0]!)
}

export const listInsightDeliveryRecipients = async (client: InsightsDbClient | undefined, deliveryIntentId: string): Promise<InsightDeliveryRecipientRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `SELECT ${RECIPIENT_COLUMNS} FROM greenhouse_insights.insight_delivery_recipients
      WHERE delivery_intent_id = $1 ORDER BY created_at, delivery_recipient_id COLLATE "C"`,
    [deliveryIntentId]
  )

  return rows.map(mapRecipient)
}

/** Claim atómico pending → claimed. Dos dispatchers concurrentes: sólo uno obtiene la fila. */
export const claimInsightDeliveryRecipient = async (deliveryRecipientId: string): Promise<InsightDeliveryRecipientRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `UPDATE greenhouse_insights.insight_delivery_recipients
        SET state = 'claimed', attempts = attempts + 1, claimed_at = now(), updated_at = now()
      WHERE delivery_recipient_id = $1 AND state = 'pending' AND attempts < 5
      RETURNING ${RECIPIENT_COLUMNS}`,
    [deliveryRecipientId]
  )

  return rows[0] ? mapRecipient(rows[0]) : null
}

export const finishInsightDeliveryRecipient = async (
  client: InsightsDbClient | undefined,
  input: {
    deliveryRecipientId: string
    fromStates: InsightDeliveryRecipientState[]
    state: InsightDeliveryRecipientState
    skipReason?: InsightDeliverySkipReason | null
    emailDeliveryId?: string | null
    shareGrantId?: string | null
    lastErrorCode?: string | null
  }
): Promise<InsightDeliveryRecipientRecord | null> => {
  const terminal = ['accepted', 'failed', 'skipped', 'cancelled'].includes(input.state)

  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `UPDATE greenhouse_insights.insight_delivery_recipients
        SET state = $2,
            skip_reason = $3,
            email_delivery_id = COALESCE($4, email_delivery_id),
            share_grant_id = COALESCE($5, share_grant_id),
            last_error_code = $6,
            finished_at = CASE WHEN $7 THEN now() ELSE NULL END,
            updated_at = now()
      WHERE delivery_recipient_id = $1 AND state = ANY($8::text[])
      RETURNING ${RECIPIENT_COLUMNS}`,
    [
      input.deliveryRecipientId, input.state, input.skipReason ?? null, input.emailDeliveryId ?? null, input.shareGrantId ?? null,
      input.lastErrorCode ?? null, terminal, input.fromStates
    ]
  )

  return rows[0] ? mapRecipient(rows[0]) : null
}

/** Retiro de edición / cancelación manual: lo que aún no salió no sale. Lo aceptado se conserva. */
export const cancelPendingInsightDeliveryRecipients = async (
  client: InsightsDbClient,
  input: { organizationId: string; editionId?: string; deliveryIntentId?: string }
): Promise<InsightDeliveryRecipientRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `UPDATE greenhouse_insights.insight_delivery_recipients
        SET state = 'cancelled', finished_at = now(), updated_at = now()
      WHERE organization_id = $1 AND state = 'pending'
        AND ($2::text IS NULL OR edition_id = $2)
        AND ($3::text IS NULL OR delivery_intent_id = $3)
      RETURNING ${RECIPIENT_COLUMNS}`,
    [input.organizationId, input.editionId ?? null, input.deliveryIntentId ?? null]
  )

  return rows.map(mapRecipient)
}

export const insertInsightDeliveryEvent = async (
  client: InsightsDbClient | undefined,
  input: {
    deliveryIntentId: string
    deliveryRecipientId?: string | null
    organizationId: string
    fromState?: string | null
    toState: string
    detail?: Record<string, unknown>
    actorKind: InsightActorKind | 'dispatcher'
  }
): Promise<void> => {
  await runInsightsQuery(
    client,
    `INSERT INTO greenhouse_insights.insight_delivery_events
       (delivery_intent_id, delivery_recipient_id, organization_id, from_state, to_state, detail, actor_kind)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [input.deliveryIntentId, input.deliveryRecipientId ?? null, input.organizationId, input.fromState ?? null, input.toState, JSON.stringify(input.detail ?? {}), input.actorKind]
  )
}

// ── Transporte (lectura de email_deliveries) ──────────────────────────────────────────────────

export interface InsightDeliveryTransportRow {
  deliveryId: string
  status: string
  providerStatus: string | null
  resendId: string | null
  errorClass: string | null
}

/** Último intento de correo por destinatario (`idlr-…` o `idlr-…:aN`), leído del ledger canónico. */
export const readInsightDeliveryTransport = async (
  deliveryRecipientIds: string[],
  client?: InsightsDbClient
): Promise<Map<string, InsightDeliveryTransportRow>> => {
  if (deliveryRecipientIds.length === 0) return new Map()

  const rows = await runInsightsQuery<{ recipient_id: string; delivery_id: string; status: string; provider_status: string | null; resend_id: string | null; error_class: string | null }>(
    client,
    `SELECT DISTINCT ON (split_part(source_event_id, ':', 1))
            split_part(source_event_id, ':', 1) AS recipient_id,
            delivery_id::text AS delivery_id, status, provider_status, resend_id, error_class
       FROM greenhouse_notifications.email_deliveries
      WHERE source_entity = 'insight_delivery_recipients'
        AND split_part(source_event_id, ':', 1) = ANY($1::text[])
      ORDER BY split_part(source_event_id, ':', 1), created_at DESC`,
    [deliveryRecipientIds]
  )

  return new Map(rows.map(row => [row.recipient_id, { deliveryId: row.delivery_id, status: row.status, providerStatus: row.provider_status, resendId: row.resend_id, errorClass: row.error_class }]))
}

/** El correo de UN intento concreto (reconciliación exacta, sin mezclar intentos). */
export const readInsightDeliveryTransportForAttempt = async (sourceEventId: string): Promise<InsightDeliveryTransportRow | null> => {
  const rows = await runInsightsQuery<{ delivery_id: string; status: string; provider_status: string | null; resend_id: string | null; error_class: string | null }>(
    undefined,
    `SELECT delivery_id::text AS delivery_id, status, provider_status, resend_id, error_class
       FROM greenhouse_notifications.email_deliveries
      WHERE source_entity = 'insight_delivery_recipients' AND source_event_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [sourceEventId]
  )

  const row = rows[0]

  return row ? { deliveryId: row.delivery_id, status: row.status, providerStatus: row.provider_status, resendId: row.resend_id, errorClass: row.error_class } : null
}

/** Reintento autorizado: sólo `failed` vuelve a `pending` (con cupo de intentos). */
export const requeueFailedInsightDeliveryRecipients = async (client: InsightsDbClient, deliveryIntentId: string): Promise<InsightDeliveryRecipientRecord[]> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    client,
    `UPDATE greenhouse_insights.insight_delivery_recipients
        SET state = 'pending', finished_at = NULL, last_error_code = NULL, updated_at = now()
      WHERE delivery_intent_id = $1 AND state = 'failed' AND attempts < 5
      RETURNING ${RECIPIENT_COLUMNS}`,
    [deliveryIntentId]
  )

  return rows.map(mapRecipient)
}

export const getInsightDeliveryRecipient = async (organizationId: string, deliveryRecipientId: string): Promise<InsightDeliveryRecipientRecord | null> => {
  const rows = await runInsightsQuery<Record<string, unknown>>(
    undefined,
    `SELECT ${RECIPIENT_COLUMNS} FROM greenhouse_insights.insight_delivery_recipients
      WHERE organization_id = $1 AND delivery_recipient_id = $2`,
    [organizationId, deliveryRecipientId]
  )

  return rows[0] ? mapRecipient(rows[0]) : null
}

export const deriveInsightDeliveryTransportStatus = (row: InsightDeliveryTransportRow | undefined): InsightDeliveryTransportStatus => {
  if (!row) return 'not_sent'

  const provider = row.providerStatus

  if (provider === 'delivered' || provider === 'bounced' || provider === 'complained' || provider === 'suppressed' || provider === 'delivery_delayed' || provider === 'failed') return provider
  if (row.status === 'delivered') return 'delivered'
  if (row.status === 'sent' || provider === 'sent') return 'accepted'
  if (row.status === 'skipped') return 'skipped'
  if (row.status === 'failed' || row.status === 'dead_letter') return 'failed'

  return 'pending'
}

export const countAmbiguousInsightDeliveries = async (): Promise<{ ambiguous: number; stuckClaimed: number }> => {
  const rows = await runInsightsQuery<{ ambiguous: string; stuck: string }>(
    undefined,
    `SELECT count(*) FILTER (WHERE state = 'ambiguous')::text AS ambiguous,
            count(*) FILTER (WHERE state = 'claimed' AND claimed_at < now() - interval '30 minutes')::text AS stuck
       FROM greenhouse_insights.insight_delivery_recipients
      WHERE state IN ('ambiguous', 'claimed')`
  )

  return { ambiguous: Number(rows[0]?.ambiguous ?? 0), stuckClaimed: Number(rows[0]?.stuck ?? 0) }
}

/**
 * TASK-1848 — contratos del DeliveryIntent (browser-safe). Un intent congela QUÉ se envía (edición y
 * su `issued_hash`), CÓMO (modalidad, outputs, asunto), A QUIÉN (destinatarios validados) y QUIÉN lo
 * autorizó. El transporte es `email_deliveries`: acá sólo se correlaciona (arquitectura §9).
 */

import type { InsightActorKind } from '../contracts/states'

export const INSIGHT_DELIVERY_MODALITIES = ['portal_link', 'share_link', 'attachment'] as const
export type InsightDeliveryModality = (typeof INSIGHT_DELIVERY_MODALITIES)[number]

export const isInsightDeliveryModality = (value: unknown): value is InsightDeliveryModality =>
  typeof value === 'string' && (INSIGHT_DELIVERY_MODALITIES as readonly string[]).includes(value)

/**
 * `portal_link` necesita la ruta de la edición dentro del portal, que construye TASK-1849. Mientras
 * no exista, pedirla es `not_ready`: mandar un enlace a una página inexistente sería peor que no
 * mandarlo. Cambiar a `true` exige registrar el deep link `insights_edition` en el mismo PR.
 */
export const INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE = false

export const INSIGHT_DELIVERY_MAX_RECIPIENTS = 50

export type InsightDeliveryIntentState = 'pending' | 'dispatching' | 'completed' | 'partially_failed' | 'failed' | 'cancelled'

export type InsightDeliveryRecipientState = 'pending' | 'claimed' | 'accepted' | 'failed' | 'ambiguous' | 'skipped' | 'cancelled'

export type InsightDeliverySkipReason =
  | 'duplicate_delivery'
  | 'recipient_inactive'
  | 'recipient_undeliverable'
  | 'email_type_paused'
  | 'asset_unavailable'
  | 'edition_unavailable'

export type InsightDeliveryRecipientKind = 'client_user' | 'internal_user'

/**
 * Estado del TRANSPORTE leído de `email_deliveries`: aceptado por el proveedor ≠ entregado ≠ leído.
 * Nunca se deriva lectura de aperturas: no existe un estado "leído".
 */
export type InsightDeliveryTransportStatus = 'not_sent' | 'pending' | 'accepted' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained' | 'failed' | 'suppressed' | 'skipped'

export interface InsightDeliveryIntentRecord {
  deliveryIntentId: string
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
  state: InsightDeliveryIntentState
  authorizedByActorKind: InsightActorKind
  authorizedByUserId: string | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  updatedAt: string
}

export interface InsightDeliveryRecipientRecord {
  deliveryRecipientId: string
  deliveryIntentId: string
  organizationId: string
  editionId: string
  recipientKey: string
  recipientKind: InsightDeliveryRecipientKind
  recipientUserId: string
  state: InsightDeliveryRecipientState
  skipReason: InsightDeliverySkipReason | null
  attempts: number
  emailDeliveryId: string | null
  shareGrantId: string | null
  lastErrorCode: string | null
  claimedAt: string | null
  finishedAt: string | null
  createdAt: string
}

export interface InsightDeliveryRecipientDto {
  deliveryRecipientId: string
  recipientUserId: string
  recipientKind: InsightDeliveryRecipientKind
  /** Correo enmascarado: el DTO de gestión no repite PII completa. */
  recipientEmailMasked: string
  state: InsightDeliveryRecipientState
  skipReason: InsightDeliverySkipReason | null
  transportStatus: InsightDeliveryTransportStatus
  attempts: number
  shareGrantId: string | null
  lastErrorCode: string | null
  finishedAt: string | null
}

export interface InsightDeliveryIntentDto {
  deliveryIntentId: string
  editionId: string
  modality: InsightDeliveryModality
  outputs: string[]
  subject: string
  state: InsightDeliveryIntentState
  shareTtlDays: number | null
  authorizedByActorKind: InsightActorKind
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string
  recipients: InsightDeliveryRecipientDto[]
}

export const maskInsightRecipientEmail = (email: string): string => {
  const [user, domain] = email.split('@')

  if (!user || !domain) return '***'

  return `${user.slice(0, 1)}***@${domain}`
}

/**
 * Rollup honesto del intent: un canal exitoso no convierte los demás en entregados; `ambiguous`
 * mantiene el intent vivo hasta reconciliar (no se declara `completed` ni `failed` a ciegas).
 */
export const rollupInsightDeliveryIntentState = (states: InsightDeliveryRecipientState[], current: InsightDeliveryIntentState): InsightDeliveryIntentState => {
  if (current === 'cancelled') return 'cancelled'
  if (states.length === 0) return current
  if (states.some(state => state === 'pending' || state === 'claimed' || state === 'ambiguous')) return 'dispatching'

  const accepted = states.filter(state => state === 'accepted').length
  const failed = states.filter(state => state === 'failed').length

  if (failed === 0) return 'completed'
  if (accepted === 0) return 'failed'

  return 'partially_failed'
}

/**
 * Correlación del correo con el destinatario POR INTENTO. El índice de intents de la plataforma de
 * correo es único por (tipo, source_event_id): el primer intento usa el id del destinatario y cada
 * reintento autorizado (tras un fallo definitivo) uno propio, así un reintento nunca choca con la
 * fila del intento anterior y nunca se confunde con él al reconciliar.
 */
export const insightDeliverySourceEventId = (deliveryRecipientId: string, attempt: number): string =>
  attempt <= 1 ? deliveryRecipientId : `${deliveryRecipientId}:a${attempt}`

import 'server-only'

/**
 * TASK-1848 — commands del envío por correo de ediciones emitidas (arquitectura §9).
 *
 *   requestInsightDelivery   → congela el intent autorizado + destinatarios validados y publica
 *                              `insights.delivery.requested` en la MISMA transacción. No envía: el
 *                              despacho corre en el ops-worker (projection reactiva).
 *   cancelInsightDelivery    → lo que aún no salió no sale; lo aceptado se conserva.
 *   reconcileInsightDeliveryRecipient → resuelve un `ambiguous` contra el ledger de correo ANTES
 *                              de cualquier reenvío; sin evidencia exige decisión humana explícita.
 *   retryInsightDelivery     → re-encola SÓLO fallidos definitivos (nunca ambiguos).
 *
 * Autoridad: `insights.delivery.send` (interna; un cliente comparte enlaces, no usa el sender de
 * Efeonce). Destinatarios: personas del portal de la organización o internos; jamás correos libres.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import { InsightsDeliveryDisabledError, InsightsIdempotencyConflictError, InsightsInputError, InsightsNotFoundError, InsightsNotReadyError } from '../errors'
import { publishInsightDeliveryRequested, publishInsightShareRevoked } from '../events'
import { isInsightsDeliveryEnabled } from '../flags'
import { hashCanonical } from '../request-hash'
import { findInsightOutputsForEdition } from '../render/store'
import { revokeInsightShareGrant } from '../sharing/store'
import { INSIGHT_SHARE_DEFAULT_TTL_DAYS, INSIGHT_SHARE_MAX_TTL_DAYS, isInsightShareDownloadableOutput } from '../sharing/contracts'
import { getInsightEditionById } from '../stores/edition-store'

import {
  INSIGHT_DELIVERY_MAX_RECIPIENTS,
  INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE,
  insightDeliverySourceEventId,
  isInsightDeliveryModality,
  maskInsightRecipientEmail,
  rollupInsightDeliveryIntentState,
  type InsightDeliveryIntentDto,
  type InsightDeliveryIntentRecord,
  type InsightDeliveryModality,
  type InsightDeliveryRecipientRecord
} from './contracts'
import {
  cancelPendingInsightDeliveryRecipients,
  deriveInsightDeliveryTransportStatus,
  findInsightDeliveryIntentByKey,
  finishInsightDeliveryRecipient,
  getInsightDeliveryIntent,
  getInsightDeliveryRecipient,
  insertInsightDeliveryEvent,
  insertInsightDeliveryIntent,
  insertInsightDeliveryRecipient,
  listInsightDeliveryIntentsForEdition,
  listInsightDeliveryRecipients,
  readInsightDeliveryTransport,
  readInsightDeliveryTransportForAttempt,
  requeueFailedInsightDeliveryRecipients,
  resolveInsightDeliveryRecipients,
  setInsightDeliveryIntentState
} from './store'

interface DeliveryScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  env?: NodeJS.ProcessEnv
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

interface NormalizedDeliveryRequest {
  modality: InsightDeliveryModality
  recipientUserIds: string[]
  outputs: Array<'deck_pdf' | 'report_pdf'>
  subject: string
  message: string | null
  shareTtlDays: number | null
  acknowledgeIrrevocableAttachment: boolean
  idempotencyKey: string
}

export const normalizeInsightDeliveryRequest = (body: unknown): NormalizedDeliveryRequest => {
  const raw = isRecord(body) ? body : {}

  if (!isInsightDeliveryModality(raw.modality)) {
    throw new InsightsInputError('modality debe ser portal_link, share_link o attachment', { field: 'modality' })
  }

  const recipientUserIds = Array.isArray(raw.recipientUserIds)
    ? [...new Set(raw.recipientUserIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map(value => value.trim()))]
    : []

  if (recipientUserIds.length === 0 || recipientUserIds.length > INSIGHT_DELIVERY_MAX_RECIPIENTS) {
    throw new InsightsInputError(`recipientUserIds debe tener entre 1 y ${INSIGHT_DELIVERY_MAX_RECIPIENTS} personas del portal`, { field: 'recipientUserIds' })
  }

  const outputs = Array.isArray(raw.outputs) ? [...new Set(raw.outputs)] : []

  if (!outputs.every(isInsightShareDownloadableOutput)) {
    throw new InsightsInputError('outputs sólo admite deck_pdf y report_pdf', { field: 'outputs' })
  }

  if (typeof raw.subject !== 'string' || raw.subject.trim().length < 3 || raw.subject.trim().length > 200) {
    throw new InsightsInputError('subject debe tener entre 3 y 200 caracteres', { field: 'subject' })
  }

  if (raw.message !== undefined && raw.message !== null && (typeof raw.message !== 'string' || raw.message.length > 2000)) {
    throw new InsightsInputError('message admite hasta 2000 caracteres', { field: 'message' })
  }

  if (typeof raw.idempotencyKey !== 'string' || raw.idempotencyKey.trim().length < 8 || raw.idempotencyKey.trim().length > 200) {
    throw new InsightsInputError('idempotencyKey debe tener entre 8 y 200 caracteres', { field: 'idempotencyKey' })
  }

  const modality = raw.modality
  let shareTtlDays: number | null = null

  if (modality === 'share_link') {
    const ttl = raw.shareTtlDays ?? INSIGHT_SHARE_DEFAULT_TTL_DAYS

    if (typeof ttl !== 'number' || !Number.isInteger(ttl) || ttl < 1 || ttl > INSIGHT_SHARE_MAX_TTL_DAYS) {
      throw new InsightsInputError(`shareTtlDays debe ser un entero entre 1 y ${INSIGHT_SHARE_MAX_TTL_DAYS}`, { field: 'shareTtlDays' })
    }

    shareTtlDays = ttl
  }

  const acknowledgeIrrevocableAttachment = raw.acknowledgeIrrevocableAttachment === true

  if (modality === 'attachment') {
    if (outputs.length === 0) throw new InsightsInputError('attachment exige al menos un output (deck_pdf o report_pdf)', { field: 'outputs' })

    // Un PDF enviado no se puede retirar: la aceptación explícita queda congelada en el intent.
    if (!acknowledgeIrrevocableAttachment) {
      throw new InsightsInputError('Adjuntar es irrevocable: confirma acknowledgeIrrevocableAttachment=true', { field: 'acknowledgeIrrevocableAttachment' })
    }
  }

  return {
    modality,
    recipientUserIds: recipientUserIds.sort(),
    outputs: outputs as Array<'deck_pdf' | 'report_pdf'>,
    subject: raw.subject.trim(),
    message: typeof raw.message === 'string' && raw.message.trim() ? raw.message.trim() : null,
    shareTtlDays,
    acknowledgeIrrevocableAttachment,
    idempotencyKey: raw.idempotencyKey.trim()
  }
}

const projectIntent = async (intent: InsightDeliveryIntentRecord, recipients: InsightDeliveryRecipientRecord[], emails: Map<string, string>): Promise<InsightDeliveryIntentDto> => {
  const transport = await readInsightDeliveryTransport(recipients.map(recipient => recipient.deliveryRecipientId))

  return {
    deliveryIntentId: intent.deliveryIntentId,
    editionId: intent.editionId,
    modality: intent.modality,
    outputs: [...intent.outputs],
    subject: intent.subject,
    state: intent.state,
    shareTtlDays: intent.shareTtlDays,
    authorizedByActorKind: intent.authorizedByActorKind,
    cancelledAt: intent.cancelledAt,
    cancelReason: intent.cancelReason,
    createdAt: intent.createdAt,
    recipients: recipients.map(recipient => ({
      deliveryRecipientId: recipient.deliveryRecipientId,
      recipientUserId: recipient.recipientUserId,
      recipientKind: recipient.recipientKind,
      recipientEmailMasked: maskInsightRecipientEmail(emails.get(recipient.deliveryRecipientId) ?? recipient.recipientKey),
      state: recipient.state,
      skipReason: recipient.skipReason,
      transportStatus: deriveInsightDeliveryTransportStatus(transport.get(recipient.deliveryRecipientId)),
      attempts: recipient.attempts,
      shareGrantId: recipient.shareGrantId,
      lastErrorCode: recipient.lastErrorCode,
      finishedAt: recipient.finishedAt
    }))
  }
}

const loadIntentDto = async (intent: InsightDeliveryIntentRecord) => projectIntent(intent, await listInsightDeliveryRecipients(undefined, intent.deliveryIntentId), new Map())

export interface RequestInsightDeliveryInput extends DeliveryScope {
  editionId: string
  body: unknown
}

export const requestInsightDelivery = async (input: RequestInsightDeliveryInput): Promise<{ delivery: InsightDeliveryIntentDto; idempotent: boolean }> => {
  if (!isInsightsDeliveryEnabled(input.env)) throw new InsightsDeliveryDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'delivery_send' })
  const request = normalizeInsightDeliveryRequest(input.body)
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition) throw new InsightsNotFoundError('edition', input.editionId)
  if (edition.audience !== 'client') throw new InsightsNotReadyError('Sólo una edición de audiencia cliente se envía a la organización', { audience: edition.audience })
  if (edition.state !== 'issued' || !edition.issuedHash) throw new InsightsNotReadyError('Sólo una edición emitida puede enviarse', { state: edition.state })

  if (request.modality === 'portal_link' && !INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE) {
    throw new InsightsNotReadyError('El enlace al portal todavía no está disponible; usa share_link o attachment', { modality: 'portal_link' })
  }

  const notRequested = request.outputs.filter(output => !edition.outputs.includes(output))

  if (notRequested.length > 0) throw new InsightsInputError('outputs incluye salidas que la edición no pidió', { field: 'outputs', notRequested })

  if (request.modality === 'attachment') {
    const rendered = await findInsightOutputsForEdition({ organizationId: grant.organizationId, editionId: edition.editionId, audience: 'client' })
    const missing = request.outputs.filter(output => !rendered.some(row => row.output === output && row.state === 'completed' && row.outputAssetId))

    if (missing.length > 0) throw new InsightsNotReadyError('Faltan PDFs renderizados para adjuntar', { missing })
  }

  // La autorización queda ligada al payload exacto: versión emitida + modalidad + outputs + asunto +
  // destinatarios. La misma key con otro payload es un conflicto, nunca un segundo envío.
  const requestHash = hashCanonical({
    issuedHash: edition.issuedHash,
    modality: request.modality,
    recipientUserIds: request.recipientUserIds,
    outputs: request.outputs,
    subject: request.subject,
    message: request.message,
    shareTtlDays: request.shareTtlDays,
    acknowledgeIrrevocableAttachment: request.acknowledgeIrrevocableAttachment
  })

  const existing = await findInsightDeliveryIntentByKey(undefined, grant.organizationId, request.idempotencyKey)

  if (existing) {
    if (existing.requestHash !== requestHash) throw new InsightsIdempotencyConflictError(request.idempotencyKey, existing.deliveryIntentId)

    return { delivery: await loadIntentDto(existing), idempotent: true }
  }

  const people = await resolveInsightDeliveryRecipients(grant.organizationId, request.recipientUserIds)
  const unknown = request.recipientUserIds.filter(userId => !people.some(person => person.userId === userId))

  // Un destinatario que no es persona activa de la organización (o interna) no se envía: 400 con los
  // ids rechazados, sin revelar por qué (no es un oráculo de usuarios de otras cuentas).
  if (unknown.length > 0) throw new InsightsInputError('Algunos destinatarios no son personas activas de esta organización', { field: 'recipientUserIds', rejected: unknown })

  const emails = new Map<string, string>()

  const { intent, recipients } = await withGreenhousePostgresTransaction(async client => {
    const inserted = await insertInsightDeliveryIntent(client, {
      organizationId: grant.organizationId,
      editionId: edition.editionId,
      editionIssuedHash: edition.issuedHash!,
      modality: request.modality,
      outputs: request.outputs,
      subject: request.subject,
      message: request.message,
      shareTtlDays: request.shareTtlDays,
      attachmentIrrevocableAck: request.acknowledgeIrrevocableAttachment,
      idempotencyKey: request.idempotencyKey,
      requestHash,
      authorizedByActorKind: grant.actor.kind,
      authorizedByUserId: grant.actor.userId ?? null
    })

    const rows: InsightDeliveryRecipientRecord[] = []

    for (const person of people) {
      const row = await insertInsightDeliveryRecipient(client, {
        deliveryIntentId: inserted.deliveryIntentId,
        organizationId: grant.organizationId,
        editionId: edition.editionId,
        editionIssuedHash: edition.issuedHash!,
        modality: request.modality,
        recipientKey: person.email,
        recipientKind: person.kind,
        recipientUserId: person.userId
      })

      emails.set(row.deliveryRecipientId, person.email)
      rows.push(row)
    }

    await insertInsightDeliveryEvent(client, {
      deliveryIntentId: inserted.deliveryIntentId,
      organizationId: grant.organizationId,
      toState: 'pending',
      detail: { recipients: rows.length, duplicates: rows.filter(row => row.state === 'skipped').length, modality: request.modality },
      actorKind: grant.actor.kind
    })

    await publishInsightDeliveryRequested(client, {
      version: 1,
      deliveryIntentId: inserted.deliveryIntentId,
      editionId: edition.editionId,
      organizationId: grant.organizationId,
      modality: request.modality,
      recipientCount: rows.length,
      reason: 'initial',
      actorKind: grant.actor.kind
    })

    return { intent: inserted, recipients: rows }
  })

  return { delivery: await projectIntent(intent, recipients, emails), idempotent: false }
}

interface IntentScope extends DeliveryScope {
  deliveryIntentId: string
}

const loadScopedIntent = async (scope: IntentScope, need: 'delivery_read' | 'delivery_manage') => {
  const grant = await assertInsightsAccess({ ...scope, need })
  const intent = await getInsightDeliveryIntent(undefined, scope.deliveryIntentId, { organizationId: grant.organizationId })

  if (!intent) throw new InsightsNotFoundError('delivery', scope.deliveryIntentId)

  return { grant, intent }
}

export const readInsightDelivery = async (scope: IntentScope): Promise<InsightDeliveryIntentDto> => {
  const { intent } = await loadScopedIntent(scope, 'delivery_read')

  return loadIntentDto(intent)
}

export const readInsightDeliveries = async (scope: DeliveryScope & { editionId: string }): Promise<{ items: InsightDeliveryIntentDto[] }> => {
  const grant = await assertInsightsAccess({ ...scope, need: 'delivery_read' })
  const intents = await listInsightDeliveryIntentsForEdition(grant.organizationId, scope.editionId)

  return { items: await Promise.all(intents.map(loadIntentDto)) }
}

export const cancelInsightDelivery = async (scope: IntentScope): Promise<{ delivery: InsightDeliveryIntentDto; cancelled: number; idempotent: boolean }> => {
  // Cancelar no se apaga con el flag: detener un envío siempre debe ser posible.
  const { grant, intent } = await loadScopedIntent(scope, 'delivery_manage')

  if (intent.state === 'cancelled') return { delivery: await loadIntentDto(intent), cancelled: 0, idempotent: true }

  const cancelled = await withGreenhousePostgresTransaction(async client => {
    await getInsightDeliveryIntent(client, intent.deliveryIntentId, { forUpdate: true })

    const rows = await cancelPendingInsightDeliveryRecipients(client, { organizationId: grant.organizationId, deliveryIntentId: intent.deliveryIntentId })

    await setInsightDeliveryIntentState(client, { deliveryIntentId: intent.deliveryIntentId, state: 'cancelled', cancelReason: 'manual' })
    await insertInsightDeliveryEvent(client, { deliveryIntentId: intent.deliveryIntentId, organizationId: grant.organizationId, fromState: intent.state, toState: 'cancelled', detail: { cancelledRecipients: rows.length }, actorKind: grant.actor.kind })

    return rows.length
  })

  const reloaded = await getInsightDeliveryIntent(undefined, intent.deliveryIntentId)

  return { delivery: await loadIntentDto(reloaded ?? intent), cancelled, idempotent: false }
}

export interface ReconcileInsightDeliveryInput extends DeliveryScope {
  deliveryRecipientId: string
  /** Sólo cuando el ledger no alcanza: decisión humana explícita con motivo (≥10 caracteres). */
  operatorDecision?: unknown
  reason?: unknown
}

export type InsightDeliveryReconcileOutcome = 'accepted' | 'failed' | 'unresolved' | 'not_ambiguous'

/**
 * Un `ambiguous` NUNCA se reenvía a ciegas: primero se mira el ledger de correo del intento exacto.
 *   · fila aceptada por el proveedor (sent/delivered o con `resend_id`) ⇒ `accepted`
 *   · fila fallida sin `resend_id` y sin `dispatch_unknown`, o sin fila ⇒ `failed` (reintentable)
 *   · fila `pending` / `dispatch_unknown` ⇒ `unresolved`, salvo decisión humana explícita
 */
export const reconcileInsightDeliveryRecipient = async (input: ReconcileInsightDeliveryInput): Promise<{ outcome: InsightDeliveryReconcileOutcome; recipientState: string }> => {
  const grant = await assertInsightsAccess({ ...input, need: 'delivery_manage' })
  const recipient = await getInsightDeliveryRecipient(grant.organizationId, input.deliveryRecipientId)

  if (!recipient) throw new InsightsNotFoundError('delivery_recipient', input.deliveryRecipientId)
  if (recipient.state !== 'ambiguous') return { outcome: 'not_ambiguous', recipientState: recipient.state }

  const ledger = await readInsightDeliveryTransportForAttempt(insightDeliverySourceEventId(recipient.deliveryRecipientId, recipient.attempts))

  let outcome: 'accepted' | 'failed' | 'unresolved'

  if (ledger && (ledger.status === 'sent' || ledger.status === 'delivered' || ledger.resendId)) outcome = 'accepted'
  else if (!ledger || (ledger.status === 'failed' && ledger.errorClass !== 'dispatch_unknown') || ledger.status === 'skipped') outcome = 'failed'
  else outcome = 'unresolved'

  if (outcome === 'unresolved' && input.operatorDecision !== undefined) {
    if (input.operatorDecision !== 'accepted' && input.operatorDecision !== 'failed') {
      throw new InsightsInputError('operatorDecision debe ser accepted o failed', { field: 'operatorDecision' })
    }

    if (typeof input.reason !== 'string' || input.reason.trim().length < 10) {
      throw new InsightsInputError('La decisión manual exige un motivo de al menos 10 caracteres', { field: 'reason' })
    }

    outcome = input.operatorDecision
  }

  if (outcome === 'unresolved') return { outcome, recipientState: recipient.state }

  const intent = await getInsightDeliveryIntent(undefined, recipient.deliveryIntentId)

  await withGreenhousePostgresTransaction(async client => {
    await finishInsightDeliveryRecipient(client, {
      deliveryRecipientId: recipient.deliveryRecipientId,
      fromStates: ['ambiguous'],
      state: outcome,
      emailDeliveryId: ledger?.deliveryId ?? null,
      lastErrorCode: outcome === 'failed' ? 'reconciled_failed' : null
    })

    // Si el correo no salió, el enlace que llevaba no está en ningún buzón: se revoca.
    if (outcome === 'failed' && recipient.shareGrantId && intent) {
      const revoked = await revokeInsightShareGrant(client, { organizationId: grant.organizationId, shareGrantId: recipient.shareGrantId, actor: grant.actor, reason: 'delivery_failed' })

      if (revoked) {
        await publishInsightShareRevoked(client, { version: 1, shareGrantId: recipient.shareGrantId, editionId: recipient.editionId, organizationId: grant.organizationId, reason: 'delivery_failed', actorKind: grant.actor.kind })
      }
    }

    await insertInsightDeliveryEvent(client, {
      deliveryIntentId: recipient.deliveryIntentId,
      deliveryRecipientId: recipient.deliveryRecipientId,
      organizationId: grant.organizationId,
      fromState: 'ambiguous',
      toState: outcome,
      detail: { source: input.operatorDecision !== undefined ? 'operator' : 'ledger', ...(typeof input.reason === 'string' ? { reason: input.reason.trim().slice(0, 300) } : {}) },
      actorKind: grant.actor.kind
    })

    if (intent) {
      const states = (await listInsightDeliveryRecipients(client, intent.deliveryIntentId)).map(row => row.state)

      await setInsightDeliveryIntentState(client, { deliveryIntentId: intent.deliveryIntentId, state: rollupInsightDeliveryIntentState(states, intent.state) })
    }
  })

  return { outcome, recipientState: outcome }
}

export const retryInsightDelivery = async (scope: IntentScope): Promise<{ delivery: InsightDeliveryIntentDto; requeued: number; idempotent: boolean }> => {
  if (!isInsightsDeliveryEnabled(scope.env)) throw new InsightsDeliveryDisabledError()

  const { grant, intent } = await loadScopedIntent(scope, 'delivery_manage')

  if (intent.state === 'cancelled') throw new InsightsNotReadyError('Un envío cancelado no se reintenta; crea uno nuevo', { state: intent.state })

  const edition = await getInsightEditionById(undefined, grant.organizationId, intent.editionId)

  if (!edition || edition.state !== 'issued') throw new InsightsNotReadyError('La edición ya no está emitida', { state: edition?.state ?? null })

  const requeued = await withGreenhousePostgresTransaction(async client => {
    await getInsightDeliveryIntent(client, intent.deliveryIntentId, { forUpdate: true })

    const rows = await requeueFailedInsightDeliveryRecipients(client, intent.deliveryIntentId)

    if (rows.length > 0) {
      await setInsightDeliveryIntentState(client, { deliveryIntentId: intent.deliveryIntentId, state: 'dispatching' })
      await insertInsightDeliveryEvent(client, { deliveryIntentId: intent.deliveryIntentId, organizationId: grant.organizationId, fromState: intent.state, toState: 'dispatching', detail: { requeued: rows.length }, actorKind: grant.actor.kind })
      await publishInsightDeliveryRequested(client, {
        version: 1,
        deliveryIntentId: intent.deliveryIntentId,
        editionId: intent.editionId,
        organizationId: grant.organizationId,
        modality: intent.modality,
        recipientCount: rows.length,
        reason: 'retry',
        actorKind: grant.actor.kind
      })
    }

    return rows.length
  })

  const reloaded = await getInsightDeliveryIntent(undefined, intent.deliveryIntentId)

  return { delivery: await loadIntentDto(reloaded ?? intent), requeued, idempotent: requeued === 0 }
}

import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { notImplementedSignatureAdapter, type SignatureProviderAdapter } from './provider-port'
import { applyProviderStatus, assertSignatureOperatorTransition } from './state-machine'
import {
  getSignatureRequestById,
  getSignatureRequestByIdempotencyKey,
  getSignatureRequestByProviderToken
} from './store'
import {
  SignatureValidationError,
  type SignableFormat,
  type SignatureEventKind,
  type SignatureProvider,
  type SignatureRequest,
  type SignatureRequestSignerInput,
  type SignatureRequestStatus,
  type SignatureSignerStatus,
  type SignatureSourceKind
} from './types'

const newRequestId = () => `sig-${randomUUID()}`
const newSignerId = () => `sigr-${randomUUID()}`
const newEventId = () => `sige-${randomUUID()}`

const EVENT_TYPE_FOR_STATUS: Partial<Record<SignatureRequestStatus, string>> = {
  sent: EVENT_TYPES.signatureRequestSent,
  partially_signed: EVENT_TYPES.signatureRequestPartiallySigned,
  completed: EVENT_TYPES.signatureRequestCompleted,
  cancelled: EVENT_TYPES.signatureRequestCancelled,
  failed: EVENT_TYPES.signatureRequestFailed,
  expired: EVENT_TYPES.signatureRequestExpired
}

const insertSignatureEvent = async (
  client: PoolClient,
  input: {
    signatureRequestId: string
    eventKind: SignatureEventKind
    fromStatus: SignatureRequestStatus | null
    toStatus: SignatureRequestStatus | null
    actor: string
    payload?: Record<string, unknown>
  }
) => {
  await client.query(
    `INSERT INTO greenhouse_core.signature_request_events
       (event_id, signature_request_id, event_kind, from_status, to_status, actor, payload_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      newEventId(),
      input.signatureRequestId,
      input.eventKind,
      input.fromStatus,
      input.toStatus,
      input.actor,
      JSON.stringify(input.payload ?? {})
    ]
  )
}

const publishSignatureEvent = async (
  client: PoolClient,
  eventType: string,
  request: SignatureRequest,
  extra: Record<string, unknown> = {}
) =>
  publishOutboxEvent(
    {
      aggregateType: AGGREGATE_TYPES.signatureRequest,
      aggregateId: request.signatureRequestId,
      eventType,
      payload: {
        schemaVersion: 1,
        signatureRequestId: request.signatureRequestId,
        sourceKind: request.sourceKind,
        sourceRef: request.sourceRef,
        status: request.status,
        ...extra
      }
    },
    client
  )

// ── createSignatureRequest ────────────────────────────────────────────────────
export interface CreateSignatureRequestInput {
  provider?: SignatureProvider
  sourceKind: SignatureSourceKind
  sourceRef: string
  documentAssetId: string
  signableFormat?: SignableFormat
  title?: string | null
  signers: SignatureRequestSignerInput[]
  idempotencyKey?: string | null
  createdByUserId: string
}

/**
 * Create a draft signature request (provider-neutral) + its signers + a `created` event + outbox.
 * Idempotent by `idempotencyKey`. The document is NOT sent to the provider yet (that's
 * `sendSignatureRequest`). Atomic + dual-mode.
 */
export const createSignatureRequest = async (
  input: CreateSignatureRequestInput,
  existingClient?: PoolClient
): Promise<SignatureRequest> => {
  if (input.signers.length === 0) {
    throw new SignatureValidationError('signers_required', 'Una solicitud de firma requiere al menos un firmante.')
  }

  const run = async (client: PoolClient): Promise<SignatureRequest> => {
    if (input.idempotencyKey) {
      const existing = await getSignatureRequestByIdempotencyKey(input.idempotencyKey, client)

      if (existing) return existing
    }

    const signatureRequestId = newRequestId()

    await client.query(
      `INSERT INTO greenhouse_core.signature_requests
         (signature_request_id, provider, status, source_kind, source_ref, document_asset_id,
          signable_format, title, idempotency_key, created_by_user_id)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9)`,
      [
        signatureRequestId,
        input.provider ?? 'zapsign',
        input.sourceKind,
        input.sourceRef,
        input.documentAssetId,
        input.signableFormat ?? 'pdf',
        input.title ?? null,
        input.idempotencyKey ?? null,
        input.createdByUserId
      ]
    )

    for (const signer of input.signers) {
      await client.query(
        `INSERT INTO greenhouse_core.signature_request_signers
           (signer_id, signature_request_id, signer_name, signer_email, signer_role, order_group)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newSignerId(), signatureRequestId, signer.name, signer.email ?? null, signer.role, signer.orderGroup ?? 1]
      )
    }

    await insertSignatureEvent(client, {
      signatureRequestId,
      eventKind: 'created',
      fromStatus: null,
      toStatus: 'draft',
      actor: input.createdByUserId
    })

    const request = await getSignatureRequestById(signatureRequestId, client)

    if (!request) throw new SignatureValidationError('create_failed', 'No se pudo crear la solicitud de firma.', 500)

    await publishSignatureEvent(client, EVENT_TYPES.signatureRequestCreated, request)

    return request
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

// ── sendSignatureRequest (uses the provider adapter) ──────────────────────────
export const sendSignatureRequest = async (
  input: { signatureRequestId: string; actorUserId: string },
  adapter: SignatureProviderAdapter = notImplementedSignatureAdapter,
  existingClient?: PoolClient
): Promise<SignatureRequest> => {
  const run = async (client: PoolClient): Promise<SignatureRequest> => {
    const request = await getSignatureRequestById(input.signatureRequestId, client, true)

    if (!request) throw new SignatureValidationError('signature_request_not_found', 'Solicitud de firma no encontrada.', 404)

    assertSignatureOperatorTransition(request.status, 'sent')

    const signersResult = await client.query<{ signer_role: string; signer_email: string | null }>(
      `SELECT signer_role, signer_email FROM greenhouse_core.signature_request_signers WHERE signature_request_id = $1 ORDER BY order_group ASC`,
      [input.signatureRequestId]
    )

    const result = await adapter.createDocument({
      signatureRequestId: request.signatureRequestId,
      title: request.title,
      signableFormat: request.signableFormat,
      documentAssetId: request.documentAssetId,
      signers: signersResult.rows.map(r => ({ name: '', email: r.signer_email, role: r.signer_role as never }))
    })

    // Persist provider signer tokens (match by email when available).
    for (const ps of result.signers) {
      if (ps.providerSignerToken && ps.email) {
        await client.query(
          `UPDATE greenhouse_core.signature_request_signers
           SET provider_signer_token = $1, updated_at = now()
           WHERE signature_request_id = $2 AND signer_email = $3`,
          [ps.providerSignerToken, input.signatureRequestId, ps.email]
        )
      }
    }

    await client.query(
      `UPDATE greenhouse_core.signature_requests
       SET status = 'sent', provider_document_token = $2, provider_payload = $3::jsonb,
           sent_at = now(), last_synced_at = now(), updated_at = now()
       WHERE signature_request_id = $1`,
      [input.signatureRequestId, result.providerDocumentToken, JSON.stringify(result.rawPayload)]
    )

    await insertSignatureEvent(client, {
      signatureRequestId: input.signatureRequestId,
      eventKind: 'sent',
      fromStatus: request.status,
      toStatus: 'sent',
      actor: input.actorUserId,
      payload: { providerDocumentToken: result.providerDocumentToken }
    })

    const updated = await getSignatureRequestById(input.signatureRequestId, client)

    if (!updated) throw new SignatureValidationError('send_failed', 'No se pudo enviar a firma.', 500)

    await publishSignatureEvent(client, EVENT_TYPES.signatureRequestSent, updated)

    return updated
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

// ── cancelSignatureRequest ────────────────────────────────────────────────────
export const cancelSignatureRequest = async (
  input: { signatureRequestId: string; reason: string; actorUserId: string },
  existingClient?: PoolClient
): Promise<SignatureRequest> => {
  if (input.reason.trim().length < 5) {
    throw new SignatureValidationError('cancel_reason_too_short', 'El motivo de cancelación debe tener al menos 5 caracteres.')
  }

  const run = async (client: PoolClient): Promise<SignatureRequest> => {
    const request = await getSignatureRequestById(input.signatureRequestId, client, true)

    if (!request) throw new SignatureValidationError('signature_request_not_found', 'Solicitud de firma no encontrada.', 404)

    if (request.status === 'cancelled') return request

    assertSignatureOperatorTransition(request.status, 'cancelled')

    await client.query(
      `UPDATE greenhouse_core.signature_requests
       SET status = 'cancelled', cancel_reason = $2, cancelled_at = now(), updated_at = now()
       WHERE signature_request_id = $1`,
      [input.signatureRequestId, input.reason.trim()]
    )

    await insertSignatureEvent(client, {
      signatureRequestId: input.signatureRequestId,
      eventKind: 'cancelled',
      fromStatus: request.status,
      toStatus: 'cancelled',
      actor: input.actorUserId,
      payload: { reason: input.reason.trim() }
    })

    const updated = await getSignatureRequestById(input.signatureRequestId, client)

    if (!updated) throw new SignatureValidationError('cancel_failed', 'No se pudo cancelar.', 500)

    await publishSignatureEvent(client, EVENT_TYPES.signatureRequestCancelled, updated)

    return updated
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

// ── applyProviderSignatureUpdate (webhook / reconcile core) ───────────────────
export interface ApplyProviderSignatureUpdateInput {
  signatureRequestId?: string
  providerDocumentToken?: string
  providerStatus: SignatureRequestStatus
  signers?: Array<{ providerSignerToken?: string | null; email?: string | null; status: SignatureSignerStatus; signedAt?: string | null }>
  signedDocumentAssetId?: string | null
  auditReportAssetId?: string | null
  failureReason?: string | null
  providerPayload?: Record<string, unknown>
  actor: string
}

/**
 * Apply a provider-reported update (from the TASK-491 webhook or a reconcile). Monotonic + tolerant
 * of out-of-order callbacks (`applyProviderStatus` never regresses, terminal is immutable). Appends a
 * `webhook_received` event + emits the canonical status event on a real status change. Idempotent.
 */
export const applyProviderSignatureUpdate = async (
  input: ApplyProviderSignatureUpdateInput,
  existingClient?: PoolClient
): Promise<SignatureRequest> => {
  const run = async (client: PoolClient): Promise<SignatureRequest> => {
    const current = input.signatureRequestId
      ? await getSignatureRequestById(input.signatureRequestId, client, true)
      : input.providerDocumentToken
        ? await getSignatureRequestByProviderToken(input.providerDocumentToken, client, true)
        : null

    if (!current) {
      throw new SignatureValidationError('signature_request_not_found', 'Solicitud de firma no encontrada.', 404)
    }

    const nextStatus = applyProviderStatus(current.status, input.providerStatus)
    const changed = nextStatus !== current.status

    // Update signer statuses (match by provider token, else by email).
    for (const s of input.signers ?? []) {
      if (s.providerSignerToken) {
        await client.query(
          `UPDATE greenhouse_core.signature_request_signers
           SET status = $1, signed_at = $2, updated_at = now()
           WHERE signature_request_id = $3 AND provider_signer_token = $4`,
          [s.status, s.signedAt ?? null, current.signatureRequestId, s.providerSignerToken]
        )
      } else if (s.email) {
        await client.query(
          `UPDATE greenhouse_core.signature_request_signers
           SET status = $1, signed_at = $2, updated_at = now()
           WHERE signature_request_id = $3 AND signer_email = $4`,
          [s.status, s.signedAt ?? null, current.signatureRequestId, s.email]
        )
      }
    }

    await client.query(
      `UPDATE greenhouse_core.signature_requests
       SET status = $2,
           signed_document_asset_id = COALESCE($3, signed_document_asset_id),
           audit_report_asset_id = COALESCE($4, audit_report_asset_id),
           failure_reason = COALESCE($5, failure_reason),
           provider_payload = COALESCE($6::jsonb, provider_payload),
           completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END,
           last_synced_at = now(),
           updated_at = now()
       WHERE signature_request_id = $1`,
      [
        current.signatureRequestId,
        nextStatus,
        input.signedDocumentAssetId ?? null,
        input.auditReportAssetId ?? null,
        input.failureReason ?? null,
        input.providerPayload ? JSON.stringify(input.providerPayload) : null
      ]
    )

    await insertSignatureEvent(client, {
      signatureRequestId: current.signatureRequestId,
      eventKind: 'webhook_received',
      fromStatus: current.status,
      toStatus: nextStatus,
      actor: input.actor,
      payload: { providerStatus: input.providerStatus, changed }
    })

    const updated = await getSignatureRequestById(current.signatureRequestId, client)

    if (!updated) throw new SignatureValidationError('update_failed', 'No se pudo actualizar la firma.', 500)

    const eventType = changed ? EVENT_TYPE_FOR_STATUS[nextStatus] : undefined

    if (eventType) {
      await publishSignatureEvent(client, eventType, updated, { signedDocumentAssetId: updated.signedDocumentAssetId })
    }

    return updated
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

// ── reconcileSignatureRequest (recovery — re-reads the provider) ──────────────
export const reconcileSignatureRequest = async (
  input: { signatureRequestId: string; actor?: string },
  adapter: SignatureProviderAdapter = notImplementedSignatureAdapter,
  existingClient?: PoolClient
): Promise<SignatureRequest> => {
  const run = async (client: PoolClient): Promise<SignatureRequest> => {
    const request = await getSignatureRequestById(input.signatureRequestId, client, true)

    if (!request) throw new SignatureValidationError('signature_request_not_found', 'Solicitud de firma no encontrada.', 404)

    if (!request.providerDocumentToken) {
      throw new SignatureValidationError('not_sent', 'La solicitud aún no fue enviada al provider.', 422)
    }

    const state = await adapter.getDocumentState(request.providerDocumentToken)

    await insertSignatureEvent(client, {
      signatureRequestId: request.signatureRequestId,
      eventKind: 'reconciled',
      fromStatus: request.status,
      toStatus: state.status,
      actor: input.actor ?? 'system:reconcile'
    })

    return applyProviderSignatureUpdate(
      {
        signatureRequestId: request.signatureRequestId,
        providerStatus: state.status,
        signers: state.signers,
        providerPayload: state.rawPayload,
        actor: input.actor ?? 'system:reconcile'
      },
      client
    )
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

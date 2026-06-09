import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { getSignatureRequestById } from '@/lib/signatures/store'
import {
  insertCaseEvent,
  publishContractingEvent,
  WORKFORCE_CONTRACTING_EVENT_TYPES
} from '@/lib/workforce/contracting/commands/command-helpers'
import { mapSignatureStatusToContractingTransition } from '@/lib/workforce/contracting/signature/signature-status-map'
import { isCaseTransitionAllowed } from '@/lib/workforce/contracting/state-machine'
import { getCaseById } from '@/lib/workforce/contracting/store'
import type { WorkforceContractingCaseStatus } from '@/lib/workforce/contracting/types'
import { EVENT_TYPES } from '@/lib/sync/event-catalog'

import type { ProjectionDefinition } from '../projection-registry'

const BRIDGE_ACTOR = 'system:contracting-signature-bridge'
const PRE_SIGNATURE: WorkforceContractingCaseStatus = 'ready_for_signature'
const SENT_FOR_SIGNATURE: WorkforceContractingCaseStatus = 'sent_for_signature'

const OUTBOX_EVENT_TYPE: Record<'signature_completed' | 'signature_failed', string> = {
  signature_completed: WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingSignatureCompleted,
  signature_failed: WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingSignatureFailed
}

/**
 * TASK-1024 Slice 2 — Reactive bridge: signature_request status → contracting case status.
 *
 * Consumes `signature.request.{completed,partially_signed,failed,expired}` (emitted by the EPIC-001
 * aggregate when ZapSign callbacks land via the canonical webhook). For contracting-sourced requests
 * only (filtered by `sourceKind`), it advances the case status, links the signed PDF asset into the
 * case (`signed_pdf_asset_id`), and emits a downstream contracting event.
 *
 * Robust + idempotent:
 *  - re-reads BOTH the signature_request and the case from PG (never trusts the event payload)
 *  - skips when the case is already in the target status (re-delivery safe)
 *  - covers the crash window where the producer never advanced the case past `ready_for_signature`
 *    (transitions through `sent_for_signature` first)
 *  - `signed_pdf_asset_id` comes from the request's `signedDocumentAssetId` (set by the webhook
 *    handler — TASK-491), so a `completed` case always has its signed artifact linked.
 */
export const contractingSignatureBridgeProjection: ProjectionDefinition = {
  name: 'contracting_signature_bridge',
  description:
    'Advance a workforce contracting case + link its signed PDF when its signature_request changes (TASK-1024).',
  // Workforce/HR contracting → the `people` partition (processed by the general reactive cron).
  domain: 'people',
  triggerEvents: [
    EVENT_TYPES.signatureRequestCompleted,
    EVENT_TYPES.signatureRequestPartiallySigned,
    EVENT_TYPES.signatureRequestFailed,
    EVENT_TYPES.signatureRequestExpired
  ],
  extractScope: payload => {
    // The EPIC-001 signature event payload carries sourceKind + sourceRef (TASK-490).
    if (payload.sourceKind !== 'contracting_case') return null

    const caseId = typeof payload.sourceRef === 'string' ? payload.sourceRef : null

    if (!caseId) return null

    return { entityType: 'workforce_contracting_case', entityId: caseId }
  },
  refresh: async (scope, payload) => {
    const signatureRequestId =
      typeof payload.signatureRequestId === 'string' ? payload.signatureRequestId : null

    if (!signatureRequestId) {
      return `contracting_signature_bridge: missing signatureRequestId for case ${scope.entityId}; skipped`
    }

    // Re-read the authoritative signature_request (never trust the payload status).
    const request = await getSignatureRequestById(signatureRequestId)

    if (!request) {
      return `signature_request ${signatureRequestId} not found; skipped`
    }

    const transition = mapSignatureStatusToContractingTransition(request.status)

    if (!transition) {
      return `signature_request ${signatureRequestId} status=${request.status}; no contracting transition; skipped`
    }

    return withGreenhousePostgresTransaction(async (client: PoolClient) => {
      const contractingCase = await getCaseById(scope.entityId, client, true)

      if (!contractingCase) {
        return `contracting case ${scope.entityId} not found; skipped`
      }

      // Already at (or past) the target → idempotent no-op.
      if (contractingCase.status === transition.caseStatus) {
        return `case ${scope.entityId} already ${transition.caseStatus}; skipped (idempotent)`
      }

      // Build the transition path. Cover the crash window where the producer never advanced the case
      // past `ready_for_signature` (e.g. process died between ZapSign send + case update).
      const path: WorkforceContractingCaseStatus[] = []

      if (
        contractingCase.status === PRE_SIGNATURE &&
        transition.caseStatus !== SENT_FOR_SIGNATURE &&
        isCaseTransitionAllowed(contractingCase.caseKind, PRE_SIGNATURE, SENT_FOR_SIGNATURE)
      ) {
        path.push(SENT_FOR_SIGNATURE)
      }

      path.push(transition.caseStatus)

      let fromStatus = contractingCase.status

      for (const toStatus of path) {
        if (!isCaseTransitionAllowed(contractingCase.caseKind, fromStatus, toStatus)) {
          // Out-of-order / unexpected state — surface via the desync signal rather than crash-loop.
          return `case ${scope.entityId} cannot transition ${fromStatus} → ${toStatus}; skipped (desync)`
        }

        fromStatus = toStatus
      }

      const signedAssetId = request.signedDocumentAssetId ?? null

      await client.query(
        `UPDATE greenhouse_hr.workforce_contracting_cases
         SET status = $1,
             signature_request_id = $2,
             signed_pdf_asset_id = COALESCE($3, signed_pdf_asset_id),
             updated_at = now()
         WHERE case_id = $4`,
        [transition.caseStatus, signatureRequestId, signedAssetId, scope.entityId]
      )

      await insertCaseEvent(client, {
        caseId: scope.entityId,
        eventKind: `signature_${request.status}`,
        fromStatus: contractingCase.status,
        toStatus: transition.caseStatus,
        actorUserId: BRIDGE_ACTOR,
        payload: { signatureRequestId, signatureStatus: request.status, signedPdfAssetId: signedAssetId }
      })

      if (transition.outboxEvent) {
        await publishContractingEvent(client, OUTBOX_EVENT_TYPE[transition.outboxEvent], scope.entityId, {
          signatureRequestId,
          signatureStatus: request.status,
          signedPdfAssetId: signedAssetId
        })
      }

      return `case ${scope.entityId} ${contractingCase.status} → ${transition.caseStatus} (request ${request.status})`
    })
  },
  maxRetries: 5
}

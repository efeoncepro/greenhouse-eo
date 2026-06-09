import 'server-only'

import type { PoolClient } from 'pg'

import { zapSignSignatureAdapter } from '@/lib/integrations/zapsign/signature-adapter'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { createSignatureRequest, sendSignatureRequest } from '@/lib/signatures/commands'

import { insertCaseEvent, publishContractingEvent, WORKFORCE_CONTRACTING_EVENT_TYPES } from '../commands/command-helpers'
import { assertCaseTransition } from '../state-machine'
import { getCaseById } from '../store'
import { WorkforceContractingValidationError, type WorkforceContractingCaseStatus } from '../types'

import { resolveContractingWorkerSigner } from './signer-resolver'

const READY_FOR_SIGNATURE: WorkforceContractingCaseStatus = 'ready_for_signature'
const SENT_FOR_SIGNATURE: WorkforceContractingCaseStatus = 'sent_for_signature'

export interface SendContractingCaseToSignatureInput {
  caseId: string
  actorUserId: string
}

export interface SendContractingCaseToSignatureResult {
  caseId: string
  status: WorkforceContractingCaseStatus
  signatureRequestId: string
  alreadySent: boolean
}

/**
 * TASK-1024 — Producer: send an approved+rendered contracting case to electronic signature (ZapSign
 * via EPIC-001). Operator-initiated (capability `workforce.contracting.send_signature`).
 *
 * Three phases so the ZapSign HTTP call never runs inside a PG transaction (TASK-771):
 *   1. (tx) validate the case is `ready_for_signature` with a rendered PDF + create the
 *      signature_request (draft, idempotent by `caseId:pdfAssetId` → double-click safe).
 *   2. (no tx) send to ZapSign — only if the request is still `draft`.
 *   3. (tx) advance the case `ready_for_signature → sent_for_signature` + link the request +
 *      emit `workforce.contracting.sent_for_signature`. Idempotent: a case already past
 *      `ready_for_signature` is a no-op (the webhook may have advanced it).
 *
 * The case advances ONLY after ZapSign accepted → a ZapSign failure leaves the case in
 * `ready_for_signature` and the operator retries (idempotent).
 */
export const sendContractingCaseToSignature = async (
  input: SendContractingCaseToSignatureInput
): Promise<SendContractingCaseToSignatureResult> => {
  // ── Phase 1: validate + create the draft signature request (atomic) ──
  const phase1 = await withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const contractingCase = await getCaseById(input.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    if (contractingCase.status !== READY_FOR_SIGNATURE) {
      throw new WorkforceContractingValidationError(
        'invalid_state_for_signature',
        'El caso debe estar listo para firma (ready_for_signature). Genera el PDF aprobado primero.',
        422
      )
    }

    if (!contractingCase.pdfAssetId) {
      throw new WorkforceContractingValidationError(
        'pdf_not_generated',
        'El caso no tiene un PDF generado. Genera el documento antes de enviarlo a firma.',
        422
      )
    }

    const worker = await resolveContractingWorkerSigner(contractingCase.subjectIdentityProfileId, client)

    const isOffer = contractingCase.caseKind === 'offer_letter'
    const title = `${isOffer ? 'Carta oferta' : 'Contrato de trabajo'} · ${worker.name}`

    const request = await createSignatureRequest(
      {
        provider: 'zapsign',
        sourceKind: 'contracting_case',
        sourceRef: input.caseId,
        documentAssetId: contractingCase.pdfAssetId,
        signableFormat: contractingCase.signableFormat,
        title,
        signers: [worker],
        // Idempotent per rendered PDF: double-click → same request; a re-render → a new request.
        idempotencyKey: `${input.caseId}:${contractingCase.pdfAssetId}`,
        createdByUserId: input.actorUserId
      },
      client
    )

    return { signatureRequestId: request.signatureRequestId, requestStatus: request.status }
  })

  // ── Phase 2: send to ZapSign (external HTTP — never inside a tx). Only if still draft. ──
  if (phase1.requestStatus === 'draft') {
    await sendSignatureRequest(
      { signatureRequestId: phase1.signatureRequestId, actorUserId: input.actorUserId },
      zapSignSignatureAdapter
    )
  }

  // ── Phase 3: advance the case (atomic, idempotent) ──
  return withGreenhousePostgresTransaction(async (client: PoolClient) => {
    const contractingCase = await getCaseById(input.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    // Already advanced (re-send / webhook raced ahead) → idempotent no-op.
    if (contractingCase.status !== READY_FOR_SIGNATURE) {
      return {
        caseId: input.caseId,
        status: contractingCase.status,
        signatureRequestId: contractingCase.signatureRequestId ?? phase1.signatureRequestId,
        alreadySent: true
      }
    }

    assertCaseTransition(contractingCase.caseKind, contractingCase.status, SENT_FOR_SIGNATURE)

    await client.query(
      `UPDATE greenhouse_hr.workforce_contracting_cases
       SET status = $1, signature_request_id = $2, updated_at = now()
       WHERE case_id = $3`,
      [SENT_FOR_SIGNATURE, phase1.signatureRequestId, input.caseId]
    )

    await insertCaseEvent(client, {
      caseId: input.caseId,
      eventKind: 'sent_for_signature',
      fromStatus: READY_FOR_SIGNATURE,
      toStatus: SENT_FOR_SIGNATURE,
      actorUserId: input.actorUserId,
      payload: { signatureRequestId: phase1.signatureRequestId }
    })

    await publishContractingEvent(
      client,
      WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingSentForSignature,
      input.caseId,
      { signatureRequestId: phase1.signatureRequestId }
    )

    return {
      caseId: input.caseId,
      status: SENT_FOR_SIGNATURE,
      signatureRequestId: phase1.signatureRequestId,
      alreadySent: false
    }
  })
}

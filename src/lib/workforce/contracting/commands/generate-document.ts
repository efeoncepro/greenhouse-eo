import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { regenerateContractingPdfForStatus } from '../document/contracting-document-store'
import { assertCaseTransition } from '../state-machine'
import { getCaseById } from '../store'
import { WorkforceContractingValidationError, type WorkforceContractingCaseStatus } from '../types'
import { insertCaseEvent, publishContractingEvent, WORKFORCE_CONTRACTING_EVENT_TYPES } from './command-helpers'

export interface GenerateContractingDocumentInput {
  caseId: string
  actorUserId: string
}

export interface GenerateContractingDocumentResult {
  caseId: string
  status: WorkforceContractingCaseStatus
  pdfAssetId: string
  contentHash: string
}

const OFFER_RENDER_STATUS = 'approved'
const CONTRACT_GATE_STATUS = 'ready_for_pdf'
const CONTRACT_RENDER_STATUS = 'ready_for_signature'

/**
 * TASK-1023 — generate the signable PDF for an approved contracting case (operator-initiated).
 * Contract: gated at `ready_for_pdf`; renders at `ready_for_signature` (watermark PROYECTO) then
 * transitions + emits `workforce.contracting.ready_for_signature`. Offer: gated at `approved`,
 * renders + attaches the PDF without a status transition (sending is downstream). Atomic — if the
 * render fails the whole transaction rolls back and the operator gets an actionable error.
 */
export const generateContractingDocument = async (
  input: GenerateContractingDocumentInput,
  existingClient?: PoolClient
): Promise<GenerateContractingDocumentResult> => {
  const run = async (client: PoolClient): Promise<GenerateContractingDocumentResult> => {
    const contractingCase = await getCaseById(input.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    const isOffer = contractingCase.caseKind === 'offer_letter'
    const gateStatus = isOffer ? OFFER_RENDER_STATUS : CONTRACT_GATE_STATUS

    if (contractingCase.status !== gateStatus) {
      throw new WorkforceContractingValidationError(
        'invalid_state_for_pdf',
        isOffer
          ? 'La carta oferta debe estar aprobada para generar el PDF.'
          : 'El contrato debe estar listo para PDF (ready_for_pdf) para generarlo.',
        422
      )
    }

    const renderStatus = isOffer ? OFFER_RENDER_STATUS : CONTRACT_RENDER_STATUS

    const rendered = await regenerateContractingPdfForStatus(client, input.caseId, renderStatus, input.actorUserId)

    if (!rendered) {
      throw new WorkforceContractingValidationError(
        'pdf_render_failed',
        'No se pudo generar el PDF. Reintenta; si persiste, revisa el borrador aprobado.',
        500
      )
    }

    // Contract advances ready_for_pdf → ready_for_signature; offer keeps its status.
    let status: WorkforceContractingCaseStatus = contractingCase.status

    if (!isOffer) {
      assertCaseTransition(contractingCase.caseKind, contractingCase.status, CONTRACT_RENDER_STATUS)

      await client.query(
        `UPDATE greenhouse_hr.workforce_contracting_cases SET status = $1, updated_at = now() WHERE case_id = $2`,
        [CONTRACT_RENDER_STATUS, input.caseId]
      )

      await insertCaseEvent(client, {
        caseId: input.caseId,
        eventKind: 'document_generated',
        fromStatus: contractingCase.status,
        toStatus: CONTRACT_RENDER_STATUS,
        actorUserId: input.actorUserId,
        payload: { pdfAssetId: rendered.pdfAssetId }
      })

      await publishContractingEvent(
        client,
        WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingReadyForSignature,
        input.caseId,
        { pdfAssetId: rendered.pdfAssetId, contentHash: rendered.contentHash }
      )

      status = CONTRACT_RENDER_STATUS
    }

    return { caseId: input.caseId, status, pdfAssetId: rendered.pdfAssetId, contentHash: rendered.contentHash }
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertCaseTransition } from '../state-machine'
import { getCaseById, getDraftById } from '../store'
import {
  APPROVE_STATUS_BY_KIND,
  REQUIRED_LANGUAGES,
  WorkforceContractingValidationError,
  type EmploymentContractCaseStatus,
  type OfferCaseStatus,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus,
  type WorkforceContractingStructuredContent,
  type WorkforceContractingValidationResult
} from '../types'
import {
  insertCaseEvent,
  publishContractingEvent,
  WORKFORCE_CONTRACTING_EVENT_TYPES
} from './command-helpers'

export interface ApproveWorkforceContractingDraftInput {
  draftId: string
  approvedByUserId: string
}

export interface ApproveWorkforceContractingDraftResult {
  draftId: string
  caseId: string
  caseStatus: WorkforceContractingCaseStatus
  idempotent: boolean
}

// Canonical linear path to the approval status, by kind and current status (§3.1/§3.2).
const OFFER_APPROVAL_PATH: Partial<Record<OfferCaseStatus, OfferCaseStatus[]>> = {
  ai_drafted: ['pending_internal_review', 'approved'],
  pending_internal_review: ['approved']
}

const CONTRACT_APPROVAL_PATH: Partial<Record<EmploymentContractCaseStatus, EmploymentContractCaseStatus[]>> = {
  ai_drafted: ['pending_review', 'legal_review', 'internal_approved'],
  pending_review: ['legal_review', 'internal_approved'],
  legal_review: ['internal_approved']
}

const resolveApprovalPath = (
  caseKind: WorkforceContractingCaseKind,
  from: WorkforceContractingCaseStatus
): WorkforceContractingCaseStatus[] | undefined =>
  caseKind === 'offer_letter'
    ? OFFER_APPROVAL_PATH[from as OfferCaseStatus]
    : CONTRACT_APPROVAL_PATH[from as EmploymentContractCaseStatus]

const assertApprovable = (
  structuredContent: WorkforceContractingStructuredContent | Record<string, unknown>,
  snapshot: WorkforceContractingValidationResult | null
) => {
  // Bilingual presence gate (always enforced).
  const localized = (structuredContent as WorkforceContractingStructuredContent)?.localizedDrafts
  const missing = REQUIRED_LANGUAGES.filter(lang => !localized?.[lang]?.sections?.length)

  if (missing.length > 0) {
    throw new WorkforceContractingValidationError(
      'approval_not_bilingual',
      `No se puede aprobar: falta contenido en ${missing.join(', ')}.`,
      422,
      { missingLanguages: missing }
    )
  }

  // Jurisdiction-pack validation gate (when a snapshot exists; Slice 2 populates it).
  if (snapshot) {
    if (snapshot.languageParity?.status === 'fail') {
      throw new WorkforceContractingValidationError(
        'approval_parity_failed',
        'No se puede aprobar: la paridad bilingüe tiene divergencia material.',
        422,
        { notes: snapshot.languageParity.notes }
      )
    }

    if ((snapshot.blockers?.length ?? 0) > 0) {
      throw new WorkforceContractingValidationError(
        'approval_blocked',
        'No se puede aprobar: la validación de jurisdiction pack tiene bloqueantes.',
        422,
        { blockers: snapshot.blockers.map(b => b.code) }
      )
    }
  }
}

/**
 * Approve a draft as the bilingual unit. Walks the case to its approval status
 * (offer → approved; contract → internal_approved) along the canonical path,
 * appending an audit event per transition, then emits draft_approved.
 * Approval is gated on bilingual presence + no blocking parity/validation divergence.
 */
export const approveWorkforceContractingDraft = async (
  input: ApproveWorkforceContractingDraftInput,
  existingClient?: PoolClient
): Promise<ApproveWorkforceContractingDraftResult> => {
  const run = async (client: PoolClient): Promise<ApproveWorkforceContractingDraftResult> => {
    const draft = await getDraftById(input.draftId, client, true)

    if (!draft) {
      throw new WorkforceContractingValidationError('draft_not_found', 'Borrador no encontrado.', 404)
    }

    const contractingCase = await getCaseById(draft.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    const approveStatus = APPROVE_STATUS_BY_KIND[contractingCase.caseKind]

    // Idempotent: already approved + case already at approval status.
    if (draft.status === 'approved_for_pdf' && contractingCase.status === approveStatus) {
      return {
        draftId: draft.draftId,
        caseId: draft.caseId,
        caseStatus: contractingCase.status,
        idempotent: true
      }
    }

    if (draft.status === 'superseded') {
      throw new WorkforceContractingValidationError('draft_superseded', 'El borrador fue reemplazado por una versión más nueva.', 409)
    }

    assertApprovable(draft.structuredContentJson, draft.validationSnapshotJson)

    const path = resolveApprovalPath(contractingCase.caseKind, contractingCase.status)

    if (!path) {
      throw new WorkforceContractingValidationError(
        'case_not_approvable',
        `El caso en estado ${contractingCase.status} no puede aprobarse.`,
        409,
        { caseStatus: contractingCase.status }
      )
    }

    // Mark the draft approved.
    await client.query(
      `UPDATE greenhouse_hr.workforce_contracting_drafts
       SET status = 'approved_for_pdf', approved_at = now(), approved_by_user_id = $2
       WHERE draft_id = $1`,
      [input.draftId, input.approvedByUserId]
    )

    // Walk the case forward along the canonical approval path.
    let fromStatus = contractingCase.status

    for (const toStatus of path) {
      assertCaseTransition(contractingCase.caseKind, fromStatus, toStatus)
      await client.query(
        `UPDATE greenhouse_hr.workforce_contracting_cases SET status = $1 WHERE case_id = $2`,
        [toStatus, draft.caseId]
      )
      await insertCaseEvent(client, {
        caseId: draft.caseId,
        eventKind: toStatus === approveStatus ? 'draft_approved' : 'review_advanced',
        fromStatus,
        toStatus,
        actorUserId: input.approvedByUserId,
        payload: { draftId: input.draftId }
      })
      fromStatus = toStatus
    }

    await publishContractingEvent(
      client,
      WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingDraftApproved,
      draft.caseId,
      {
        draftId: input.draftId,
        draftVersion: draft.draftVersion,
        caseKind: contractingCase.caseKind,
        caseStatus: approveStatus,
        approvedByUserId: input.approvedByUserId
      }
    )

    return { draftId: input.draftId, caseId: draft.caseId, caseStatus: approveStatus, idempotent: false }
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

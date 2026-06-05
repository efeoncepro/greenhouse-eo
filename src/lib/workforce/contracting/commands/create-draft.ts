import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertCaseTransition } from '../state-machine'
import { getCaseById, getMaxDraftVersion } from '../store'
import {
  REQUIRED_LANGUAGES,
  WorkforceContractingValidationError,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus,
  type WorkforceContractingDraftSource,
  type WorkforceContractingStructuredContent,
  type WorkforceContractingValidationResult
} from '../types'
import {
  hashStructuredContent,
  insertCaseEvent,
  newDraftId,
  publishContractingEvent,
  WORKFORCE_CONTRACTING_EVENT_TYPES
} from './command-helpers'

export interface CreateWorkforceContractingDraftInput {
  caseId: string
  structuredContent: WorkforceContractingStructuredContent
  createdByUserId: string
  source?: WorkforceContractingDraftSource
  validationSnapshot?: WorkforceContractingValidationResult | null
  languageParitySnapshot?: Record<string, unknown> | null
  /** Optional AI run to link (set by the Claude adapter, Slice 3). */
  aiRunId?: string | null
}

export interface CreateWorkforceContractingDraftResult {
  draftId: string
  caseId: string
  draftVersion: number
  caseStatus: WorkforceContractingCaseStatus
}

/** "Draft ready for review" state, reached from the initial status of either kind. */
const DRAFTED_STATUS: WorkforceContractingCaseStatus = 'ai_drafted'

const assertBilingual = (content: WorkforceContractingStructuredContent) => {
  const localized = content?.localizedDrafts
  const missing = REQUIRED_LANGUAGES.filter(lang => !localized?.[lang]?.sections?.length)

  if (missing.length > 0) {
    throw new WorkforceContractingValidationError(
      'draft_not_bilingual',
      `El borrador debe incluir ambos idiomas con secciones: falta ${missing.join(', ')}.`,
      422,
      { missingLanguages: missing }
    )
  }
}

const createDraft = async (
  input: CreateWorkforceContractingDraftInput,
  expectedKind: WorkforceContractingCaseKind | null,
  existingClient?: PoolClient
): Promise<CreateWorkforceContractingDraftResult> => {
  assertBilingual(input.structuredContent)

  const run = async (client: PoolClient): Promise<CreateWorkforceContractingDraftResult> => {
    const contractingCase = await getCaseById(input.caseId, client, true)

    if (!contractingCase) {
      throw new WorkforceContractingValidationError('case_not_found', 'Caso de contratación no encontrado.', 404)
    }

    if (expectedKind && contractingCase.caseKind !== expectedKind) {
      throw new WorkforceContractingValidationError(
        'case_kind_mismatch',
        `El caso ${input.caseId} es ${contractingCase.caseKind}, no ${expectedKind}.`,
        409
      )
    }

    if (contractingCase.voidedAt) {
      throw new WorkforceContractingValidationError('case_voided', 'No se puede draftear un caso anulado.', 409)
    }

    const draftId = newDraftId()
    const draftVersion = (await getMaxDraftVersion(input.caseId, client)) + 1
    const source: WorkforceContractingDraftSource = input.source ?? 'manual'
    const contentHash = hashStructuredContent(input.structuredContent)

    // Supersede any prior in-progress draft (only one current draft per case).
    await client.query(
      `UPDATE greenhouse_hr.workforce_contracting_drafts
       SET status = 'superseded'
       WHERE case_id = $1 AND status = 'draft'`,
      [input.caseId]
    )

    await client.query(
      `INSERT INTO greenhouse_hr.workforce_contracting_drafts (
         draft_id, case_id, draft_version, source, status, structured_content_json,
         validation_snapshot_json, language_parity_snapshot_json, content_hash, created_by_user_id
       ) VALUES ($1, $2, $3, $4, 'draft', $5::jsonb, $6::jsonb, $7::jsonb, $8, $9)`,
      [
        draftId,
        input.caseId,
        draftVersion,
        source,
        JSON.stringify(input.structuredContent),
        input.validationSnapshot ? JSON.stringify(input.validationSnapshot) : null,
        input.languageParitySnapshot ? JSON.stringify(input.languageParitySnapshot) : null,
        contentHash,
        input.createdByUserId
      ]
    )

    if (input.aiRunId) {
      await client.query(
        `UPDATE greenhouse_hr.workforce_contracting_ai_runs
         SET draft_id = $1
         WHERE ai_run_id = $2 AND case_id = $3`,
        [draftId, input.aiRunId, input.caseId]
      )
    }

    // Advance the case to the "drafted, ready for review" state when still at intake.
    let caseStatus = contractingCase.status

    if (caseStatus !== DRAFTED_STATUS) {
      assertCaseTransition(contractingCase.caseKind, caseStatus, DRAFTED_STATUS)
      await client.query(
        `UPDATE greenhouse_hr.workforce_contracting_cases SET status = $1 WHERE case_id = $2`,
        [DRAFTED_STATUS, input.caseId]
      )
      await insertCaseEvent(client, {
        caseId: input.caseId,
        eventKind: 'draft_created',
        fromStatus: caseStatus,
        toStatus: DRAFTED_STATUS,
        actorUserId: input.createdByUserId,
        payload: { draftId, draftVersion, source }
      })
      caseStatus = DRAFTED_STATUS
    } else {
      await insertCaseEvent(client, {
        caseId: input.caseId,
        eventKind: 'draft_created',
        actorUserId: input.createdByUserId,
        payload: { draftId, draftVersion, source }
      })
    }

    // AI-sourced drafts emit the canonical ai_draft_created event (Slice 3 consumers).
    if (source === 'claude_ai') {
      await publishContractingEvent(
        client,
        WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingAiDraftCreated,
        input.caseId,
        { draftId, draftVersion, aiRunId: input.aiRunId ?? null, caseStatus }
      )
    }

    return { draftId, caseId: input.caseId, draftVersion, caseStatus }
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

export const createWorkforceContractingDraft = (
  input: CreateWorkforceContractingDraftInput,
  existingClient?: PoolClient
) => createDraft(input, null, existingClient)

export const createOfferDraft = (
  input: CreateWorkforceContractingDraftInput,
  existingClient?: PoolClient
) => createDraft(input, 'offer_letter', existingClient)

export const createEmploymentContractDraft = (
  input: CreateWorkforceContractingDraftInput,
  existingClient?: PoolClient
) => createDraft(input, 'employment_contract', existingClient)

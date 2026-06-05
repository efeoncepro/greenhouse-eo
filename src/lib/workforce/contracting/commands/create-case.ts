import 'server-only'

import type { PoolClient } from 'pg'

import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import {
  INITIAL_STATUS_BY_KIND,
  REQUIRED_LANGUAGES,
  WorkforceContractingValidationError,
  type ContractLanguage,
  type SignableFormat,
  type WorkforceContractingCaseKind,
  type WorkforceContractingCaseStatus
} from '../types'
import {
  insertCaseEvent,
  newCaseId,
  publishContractingEvent,
  WORKFORCE_CONTRACTING_EVENT_TYPES
} from './command-helpers'

export interface CreateWorkforceContractingCaseInput {
  caseKind: WorkforceContractingCaseKind
  subjectIdentityProfileId: string
  operatingEntityOrganizationId: string
  jurisdictionPackCode: string
  createdByUserId: string
  authoritativeLanguage?: ContractLanguage
  signableFormat?: SignableFormat
  targetStartDate?: string | null
  memberId?: string | null
  workRelationshipOnboardingCaseId?: string | null
  sourceOfferCaseId?: string | null
  contractTypeSnapshot?: string | null
  payRegimeSnapshot?: string | null
  payrollViaSnapshot?: string | null
  legalReviewReference?: string | null
  metadata?: Record<string, unknown>
}

export interface CreateWorkforceContractingCaseResult {
  caseId: string
  caseKind: WorkforceContractingCaseKind
  status: WorkforceContractingCaseStatus
  idempotent: boolean
}

const TERMINAL_FILTER = `status NOT IN (
  'accepted','rejected','expired','withdrawn','converted_to_contract',
  'active','voided','superseded'
)`

/**
 * Open a workforce contracting case (offer letter or employment contract).
 *
 * Idempotent: if a non-terminal case of the same kind already exists for the subject,
 * it is returned instead of inserting a duplicate (the DB partial unique index also
 * enforces "one active case per subject + kind"). Atomic: case INSERT + audit event +
 * outbox event succeed or fail together.
 */
export const createWorkforceContractingCase = async (
  input: CreateWorkforceContractingCaseInput,
  existingClient?: PoolClient
): Promise<CreateWorkforceContractingCaseResult> => {
  if (input.legalReviewReference != null && input.legalReviewReference.trim().length < 10) {
    throw new WorkforceContractingValidationError(
      'legal_review_reference_too_short',
      'legalReviewReference debe tener al menos 10 caracteres.',
      422
    )
  }

  const run = async (client: PoolClient): Promise<CreateWorkforceContractingCaseResult> => {
    const existing = await client.query<{ case_id: string; status: WorkforceContractingCaseStatus }>(
      `SELECT case_id, status
       FROM greenhouse_hr.workforce_contracting_cases
       WHERE subject_identity_profile_id = $1 AND case_kind = $2 AND ${TERMINAL_FILTER}
       FOR UPDATE`,
      [input.subjectIdentityProfileId, input.caseKind]
    )

    if (existing.rows[0]) {
      return {
        caseId: existing.rows[0].case_id,
        caseKind: input.caseKind,
        status: existing.rows[0].status,
        idempotent: true
      }
    }

    const caseId = newCaseId()
    const status = INITIAL_STATUS_BY_KIND[input.caseKind]
    const authoritativeLanguage = input.authoritativeLanguage ?? 'es-CL'
    const signableFormat = input.signableFormat ?? 'pdf'

    await client.query(
      `INSERT INTO greenhouse_hr.workforce_contracting_cases (
         case_id, case_kind, subject_identity_profile_id, member_id,
         work_relationship_onboarding_case_id, source_offer_case_id,
         operating_entity_organization_id, jurisdiction_pack_code, required_languages,
         authoritative_language, signable_format, status, target_start_date,
         contract_type_snapshot, pay_regime_snapshot, payroll_via_snapshot,
         legal_review_reference, created_by_user_id, metadata_json
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9::text[], $10, $11, $12, $13,
         $14, $15, $16, $17, $18, $19::jsonb
       )`,
      [
        caseId,
        input.caseKind,
        input.subjectIdentityProfileId,
        input.memberId ?? null,
        input.workRelationshipOnboardingCaseId ?? null,
        input.sourceOfferCaseId ?? null,
        input.operatingEntityOrganizationId,
        input.jurisdictionPackCode,
        REQUIRED_LANGUAGES,
        authoritativeLanguage,
        signableFormat,
        status,
        input.targetStartDate ?? null,
        input.contractTypeSnapshot ?? null,
        input.payRegimeSnapshot ?? null,
        input.payrollViaSnapshot ?? null,
        input.legalReviewReference ?? null,
        input.createdByUserId,
        JSON.stringify(input.metadata ?? {})
      ]
    )

    await insertCaseEvent(client, {
      caseId,
      eventKind: 'case_opened',
      toStatus: status,
      actorUserId: input.createdByUserId,
      payload: {
        caseKind: input.caseKind,
        jurisdictionPackCode: input.jurisdictionPackCode,
        hasLegalReviewReference: input.legalReviewReference != null
      }
    })

    await publishContractingEvent(
      client,
      WORKFORCE_CONTRACTING_EVENT_TYPES.workforceContractingCaseOpened,
      caseId,
      {
        caseKind: input.caseKind,
        subjectIdentityProfileId: input.subjectIdentityProfileId,
        operatingEntityOrganizationId: input.operatingEntityOrganizationId,
        jurisdictionPackCode: input.jurisdictionPackCode,
        status
      }
    )

    return { caseId, caseKind: input.caseKind, status, idempotent: false }
  }

  return existingClient ? run(existingClient) : withGreenhousePostgresTransaction(run)
}

import 'server-only'

import { withGreenhousePostgresTransaction } from '@/lib/db'
import type { ContractorRelationshipSubtype } from '@/lib/person-legal-entity-relationships'
import { transitionEmployeeToContractor } from '@/lib/workforce/relationship-transition/employee-to-contractor'
import type {
  EmployeeToContractorTransitionResult,
  TransitionEmployeeToContractorInput
} from '@/lib/workforce/relationship-transition/employee-to-contractor'

import { ContractorEngagementValidationError } from './errors'
import { createContractorEngagement, getContractorEngagementById } from './store'
import type {
  ContractorEngagement,
  ContractorEngagementPayrollVia,
  ContractorEngagementSubtype,
  ContractorPaymentCadence,
  ContractorPaymentModel,
  ContractorRateType,
  ContractorTaxComplianceOwner
} from './types'

const MIN_REASON_CHARS = 10

/**
 * Maps the RELATIONSHIP coarse subtype (TASK-789 vocabulary: 'contractor' |
 * 'honorarios') to the engagement's FINE subtype (TASK-790 SSOT, 5 values),
 * keeping the family-consistency invariant (D2 — `assertSubtypeConsistency`):
 *
 *   - 'honorarios'                      → 'honorarios_cl'
 *   - 'contractor' + Chile (CL)         → 'freelance'
 *   - 'contractor' + non-CL / unknown   → 'international_contractor'
 *
 * Pure + exported for testability. When the country is unknown we default the
 * contractor lane to `international_contractor` (conservative non-CL) — the
 * Chile-specific honorarios/freelance treatment is never inferred by accident.
 */
export const mapRelationshipSubtypeToEngagementSubtype = (
  relationshipSubtype: ContractorRelationshipSubtype,
  countryCode: string | null | undefined
): ContractorEngagementSubtype => {
  if (relationshipSubtype === 'honorarios') {
    return 'honorarios_cl'
  }

  const normalizedCountry = (countryCode ?? '').trim().toUpperCase()

  return normalizedCountry === 'CL' ? 'freelance' : 'international_contractor'
}

export interface TransitionEmployeeToContractorEngagementInput {
  offboardingCaseId: string
  /** YYYY-MM-DD — must be after the employee last working day. */
  contractorEffectiveFrom: string
  /** RELATIONSHIP subtype (TASK-789 vocabulary). Mapped to the engagement subtype. */
  contractorSubtype: ContractorRelationshipSubtype
  engagement: {
    payrollVia: ContractorEngagementPayrollVia
    paymentModel: ContractorPaymentModel
    paymentCadence: ContractorPaymentCadence
    currency: string
    rateType: ContractorRateType
    rateAmount?: number | null
    requiresInvoice?: boolean
    requiresWorkApproval?: boolean
    taxComplianceOwner?: ContractorTaxComplianceOwner
  }
  actorUserId: string
  /** >= 10 characters. */
  reason: string
}

export type TransitionEmployeeToContractorEngagementResult =
  | {
      status: 'transitioned'
      offboardingCaseId: string
      closedEmployeeRelationship: EmployeeToContractorTransitionResult['closedEmployeeRelationship']
      openedContractorRelationship: EmployeeToContractorTransitionResult['openedContractorRelationship']
      engagement: ContractorEngagement
    }
  | {
      status: 'engagement_created_on_existing_relationship'
      offboardingCaseId: string
      relationshipId: string
      engagement: ContractorEngagement
    }
  | {
      status: 'already_complete'
      offboardingCaseId: string
      relationshipId: string
      engagement: ContractorEngagement
    }

interface OffboardingCaseLite {
  profile_id: string
  legal_entity_organization_id: string | null
  country_code: string | null
}

interface ActiveContractorRelationshipRow {
  relationship_id: string
}

interface ExistingEngagementRow {
  contractor_engagement_id: string
}

/**
 * Connected, ATOMIC command: transition an EXECUTED offboarding case from an
 * employee relationship to a contractor ENGAGEMENT.
 *
 * All work runs inside ONE Postgres transaction:
 *   1. Resolve the offboarding case (profile, legal entity, country).
 *   2. Idempotency / orphan-resume on the active contractor relationship.
 *   3. If no contractor relationship exists → close employee + open contractor
 *      via the TASK-789 primitive (append-only over the offboarding case), then
 *      create the engagement on the freshly-opened relationship.
 *   4. If the relationship exists but has no active engagement → resume orphan
 *      by creating only the engagement.
 *   5. If both exist → no-op (`already_complete`).
 *
 * HARD CONTRACT (operator-mandated, TASK-956): this command is read-only /
 * append-only over finiquito + offboarding. It NEVER:
 *   - touches `final_settlements` / `final_settlement_documents` (no finiquito).
 *   - mutates `members.{contract_type,pay_regime,payroll_via}`.
 *   - changes the offboarding case status / rule_lane / separation_type
 *     (the TASK-789 primitive only APPENDS a case event — preserved here).
 *
 * Atomicity: any failure rolls back the whole tx (employee stays employee, no
 * orphan relationship, no orphan engagement).
 */
export const transitionEmployeeToContractorEngagement = async (
  input: TransitionEmployeeToContractorEngagementInput
): Promise<TransitionEmployeeToContractorEngagementResult> => {
  const reason = (input.reason ?? '').trim()

  if (reason.length < MIN_REASON_CHARS) {
    throw new ContractorEngagementValidationError(
      `Se requiere un motivo de al menos ${MIN_REASON_CHARS} caracteres.`,
      'reason_too_short',
      400
    )
  }

  return withGreenhousePostgresTransaction(async (client) => {
    // 1. Resolve the offboarding case for engagement context. We lock the row so
    //    the case cannot mutate underneath us; the TASK-789 primitive will also
    //    re-lock + re-validate (executed, employee, anchor, last_working_day).
    const caseResult = await client.query<OffboardingCaseLite>(
      `SELECT profile_id, legal_entity_organization_id, country_code
       FROM greenhouse_hr.work_relationship_offboarding_cases
       WHERE offboarding_case_id = $1
       FOR UPDATE`,
      [input.offboardingCaseId]
    )

    const offboardingCase = caseResult.rows[0]

    if (!offboardingCase) {
      throw new ContractorEngagementValidationError(
        'El caso de offboarding no existe.',
        'offboarding_case_not_found',
        404,
        { offboardingCaseId: input.offboardingCaseId }
      )
    }

    if (!offboardingCase.legal_entity_organization_id) {
      throw new ContractorEngagementValidationError(
        'El caso de offboarding no tiene una entidad legal anclada.',
        'offboarding_case_missing_legal_entity',
        409,
        { offboardingCaseId: input.offboardingCaseId }
      )
    }

    const profileId = offboardingCase.profile_id
    const legalEntityOrganizationId = offboardingCase.legal_entity_organization_id
    const countryCode = offboardingCase.country_code

    const engagementSubtype = mapRelationshipSubtypeToEngagementSubtype(
      input.contractorSubtype,
      countryCode
    )

    // 2. Look for an already-active contractor relationship for this person +
    //    legal entity (the same uniqueness key the TASK-789 primitive guards).
    const existingRelationshipResult = await client.query<ActiveContractorRelationshipRow>(
      `SELECT relationship_id
       FROM greenhouse_core.person_legal_entity_relationships
       WHERE profile_id = $1
         AND legal_entity_organization_id = $2
         AND relationship_type = 'contractor'
         AND status = 'active'
         AND effective_to IS NULL
       FOR UPDATE`,
      [profileId, legalEntityOrganizationId]
    )

    const existingRelationshipId = existingRelationshipResult.rows[0]?.relationship_id ?? null

    // Helper: create the engagement on a given (already-active, same-tx-visible)
    // contractor relationship. classificationRiskFactors marks the
    // employee→contractor continuity so the engagement nace `needs_review`
    // (anti-reclassification — never auto-cleared). NO member mutation.
    const createEngagementOnRelationship = (relationshipId: string) =>
      createContractorEngagement(
        {
          profileId,
          personLegalEntityRelationshipId: relationshipId,
          legalEntityOrganizationId,
          countryCode: countryCode ?? '',
          relationshipSubtype: engagementSubtype,
          payrollVia: input.engagement.payrollVia,
          currency: input.engagement.currency,
          paymentModel: input.engagement.paymentModel,
          rateType: input.engagement.rateType,
          rateAmount: input.engagement.rateAmount ?? null,
          paymentCadence: input.engagement.paymentCadence,
          requiresInvoice: input.engagement.requiresInvoice,
          requiresWorkApproval: input.engagement.requiresWorkApproval,
          taxComplianceOwner: input.engagement.taxComplianceOwner,
          classificationRiskFactors: { immediateEmployeeContinuity: true },
          startDate: input.contractorEffectiveFrom,
          actorUserId: input.actorUserId,
          metadata: {
            sourceOffboardingCaseId: input.offboardingCaseId,
            transitionedFrom: 'employee'
          }
        },
        client
      )

    if (existingRelationshipId) {
      // 2a. Relationship exists — is there already an active engagement on it?
      const existingEngagementResult = await client.query<ExistingEngagementRow>(
        `SELECT contractor_engagement_id
         FROM greenhouse_hr.contractor_engagements
         WHERE person_legal_entity_relationship_id = $1
           AND status NOT IN ('ended', 'cancelled')
         ORDER BY created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [existingRelationshipId]
      )

      if (existingEngagementResult.rows[0]) {
        // Idempotent no-op: relationship + engagement already in place.
        const engagement = await getContractorEngagementById(
          existingEngagementResult.rows[0].contractor_engagement_id
        )

        if (!engagement) {
          throw new ContractorEngagementValidationError(
            'El engagement existente no pudo resolverse.',
            'existing_engagement_unresolved',
            409,
            { contractorEngagementId: existingEngagementResult.rows[0].contractor_engagement_id }
          )
        }

        return {
          status: 'already_complete' as const,
          offboardingCaseId: input.offboardingCaseId,
          relationshipId: existingRelationshipId,
          engagement
        }
      }

      // Orphan-resume: relationship exists but has no active engagement.
      const engagement = await createEngagementOnRelationship(existingRelationshipId)

      return {
        status: 'engagement_created_on_existing_relationship' as const,
        offboardingCaseId: input.offboardingCaseId,
        relationshipId: existingRelationshipId,
        engagement
      }
    }

    // 3. No contractor relationship yet — run the full transition (closes the
    //    employee relationship, opens the contractor relationship, appends the
    //    offboarding-case event) inside THIS transaction, then create the
    //    engagement on the freshly-opened (same-tx-visible) relationship.
    const transitionInput: TransitionEmployeeToContractorInput = {
      offboardingCaseId: input.offboardingCaseId,
      contractorEffectiveFrom: input.contractorEffectiveFrom,
      contractorSubtype: input.contractorSubtype,
      actorUserId: input.actorUserId,
      reason
    }

    const transition = await transitionEmployeeToContractor(transitionInput, client)

    const engagement = await createEngagementOnRelationship(
      transition.openedContractorRelationship.relationshipId
    )

    return {
      status: 'transitioned' as const,
      offboardingCaseId: transition.offboardingCaseId,
      closedEmployeeRelationship: transition.closedEmployeeRelationship,
      openedContractorRelationship: transition.openedContractorRelationship,
      engagement
    }
  })
}

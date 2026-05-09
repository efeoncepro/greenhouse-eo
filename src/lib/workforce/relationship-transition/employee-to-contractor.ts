import 'server-only'

import { withTransaction } from '@/lib/db'
import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'
import {
  createContractorLegalEntityRelationship,
  endPersonLegalEntityRelationship
} from '@/lib/person-legal-entity-relationships'
import type {
  ContractorRelationshipSubtype,
  PersonLegalEntityRelationship,
  mapPersonLegalEntityRelationship
} from '@/lib/person-legal-entity-relationships'

type OffboardingTransitionRow = {
  offboarding_case_id: string
  public_id: string
  profile_id: string
  member_id: string | null
  person_legal_entity_relationship_id: string | null
  legal_entity_organization_id: string | null
  space_id: string | null
  relationship_type: string
  contract_type_snapshot: string
  pay_regime_snapshot: string
  payroll_via_snapshot: string
  separation_type: string
  status: string
  rule_lane: string
  effective_date: string | Date | null
  last_working_day: string | Date | null
}

type RelationshipRow = Parameters<typeof mapPersonLegalEntityRelationship>[0]

export interface TransitionEmployeeToContractorInput {
  offboardingCaseId: string
  contractorEffectiveFrom: string
  contractorSubtype: ContractorRelationshipSubtype
  actorUserId: string
  reason: string
  roleLabel?: string | null
  notes?: string | null
  metadata?: Record<string, unknown>
}

export interface EmployeeToContractorTransitionResult {
  offboardingCaseId: string
  closedEmployeeRelationship: PersonLegalEntityRelationship
  openedContractorRelationship: PersonLegalEntityRelationship
}

const toDateString = (value: string | Date | null): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const assertTransitionableCase = (row: OffboardingTransitionRow) => {
  if (row.status !== 'executed') {
    throw new HrCoreValidationError('Employee to contractor transition requires an executed offboarding case.', 409, {
      offboardingCaseId: row.offboarding_case_id,
      status: row.status
    })
  }

  if (row.relationship_type !== 'employee') {
    throw new HrCoreValidationError('Only employee relationships can transition to contractor in TASK-789 V1.', 409, {
      offboardingCaseId: row.offboarding_case_id,
      relationshipType: row.relationship_type
    })
  }

  if (!row.person_legal_entity_relationship_id || !row.legal_entity_organization_id) {
    throw new HrCoreValidationError('Offboarding case is missing its person legal entity relationship anchor.', 409, {
      offboardingCaseId: row.offboarding_case_id
    })
  }

  if (!row.last_working_day) {
    throw new HrCoreValidationError('Executed offboarding case is missing lastWorkingDay.', 409, {
      offboardingCaseId: row.offboarding_case_id
    })
  }
}

export const transitionEmployeeToContractor = async (
  input: TransitionEmployeeToContractorInput
): Promise<EmployeeToContractorTransitionResult> => {
  const contractorEffectiveFrom = assertDateString(input.contractorEffectiveFrom, 'contractorEffectiveFrom')
  const reason = normalizeNullableString(input.reason)

  if (!reason || reason.length < 10) {
    throw new HrCoreValidationError('A transition reason with at least 10 characters is required.', 400)
  }

  return withTransaction(async client => {
    const caseResult = await client.query<OffboardingTransitionRow>(
      `
        SELECT
          offboarding_case_id,
          public_id,
          profile_id,
          member_id,
          person_legal_entity_relationship_id,
          legal_entity_organization_id,
          space_id,
          relationship_type,
          contract_type_snapshot,
          pay_regime_snapshot,
          payroll_via_snapshot,
          separation_type,
          status,
          rule_lane,
          effective_date,
          last_working_day
        FROM greenhouse_hr.work_relationship_offboarding_cases
        WHERE offboarding_case_id = $1
        FOR UPDATE
      `,
      [input.offboardingCaseId]
    )

    const offboardingCase = caseResult.rows[0]

    if (!offboardingCase) {
      throw new HrCoreValidationError('Offboarding case not found.', 404, {
        offboardingCaseId: input.offboardingCaseId
      })
    }

    assertTransitionableCase(offboardingCase)

    const lastWorkingDay = toDateString(offboardingCase.last_working_day)

    if (lastWorkingDay && contractorEffectiveFrom <= lastWorkingDay) {
      throw new HrCoreValidationError('Contractor relationship must start after the employee last working day.', 409, {
        lastWorkingDay,
        contractorEffectiveFrom
      })
    }

    const existingContractor = await client.query<RelationshipRow>(
      `
        SELECT *
        FROM greenhouse_core.person_legal_entity_relationships
        WHERE profile_id = $1
          AND legal_entity_organization_id = $2
          AND relationship_type = 'contractor'
          AND status = 'active'
          AND effective_to IS NULL
        FOR UPDATE
      `,
      [offboardingCase.profile_id, offboardingCase.legal_entity_organization_id]
    )

    if (existingContractor.rows[0]) {
      throw new HrCoreValidationError('An active contractor relationship already exists for this person and legal entity.', 409, {
        existingRelationshipId: existingContractor.rows[0].relationship_id
      })
    }

    const employeeRelationship = await client.query<RelationshipRow>(
      `
        SELECT *
        FROM greenhouse_core.person_legal_entity_relationships
        WHERE relationship_id = $1
        FOR UPDATE
      `,
      [offboardingCase.person_legal_entity_relationship_id]
    )

    const employee = employeeRelationship.rows[0]

    if (!employee || employee.relationship_type !== 'employee') {
      throw new HrCoreValidationError('Employee relationship anchor not found.', 409, {
        relationshipId: offboardingCase.person_legal_entity_relationship_id
      })
    }

    const closedEmployeeRelationship = await endPersonLegalEntityRelationship(client, {
      relationshipId: employee.relationship_id,
      effectiveTo: lastWorkingDay ?? contractorEffectiveFrom,
      actorUserId: input.actorUserId,
      notes: reason,
      metadataPatch: {
        transitionKind: 'employee_to_contractor',
        transitionOffboardingCaseId: offboardingCase.offboarding_case_id
      }
    })

    const openedContractorRelationship = await createContractorLegalEntityRelationship(client, {
      profileId: offboardingCase.profile_id,
      legalEntityOrganizationId: offboardingCase.legal_entity_organization_id ?? employee.legal_entity_organization_id,
      spaceId: offboardingCase.space_id ?? employee.space_id,
      subtype: input.contractorSubtype,
      effectiveFrom: contractorEffectiveFrom,
      sourceOfTruth: 'workforce_relationship_transition',
      sourceRecordType: 'work_relationship_offboarding_case',
      sourceRecordId: offboardingCase.offboarding_case_id,
      roleLabel: input.roleLabel ?? employee.role_label,
      notes: input.notes ?? reason,
      actorUserId: input.actorUserId,
      metadata: {
        ...(input.metadata ?? {}),
        previousRelationshipId: employee.relationship_id,
        offboardingCasePublicId: offboardingCase.public_id,
        employeeContractTypeSnapshot: offboardingCase.contract_type_snapshot,
        employeePayRegimeSnapshot: offboardingCase.pay_regime_snapshot,
        employeePayrollViaSnapshot: offboardingCase.payroll_via_snapshot
      }
    })

    await client.query(
      `
        INSERT INTO greenhouse_hr.work_relationship_offboarding_case_events (
          event_id,
          offboarding_case_id,
          event_type,
          from_status,
          to_status,
          actor_user_id,
          source,
          reason,
          payload
        )
        VALUES (
          'offboarding-case-event-' || gen_random_uuid()::text,
          $1,
          'offboarding_case.relationship_transition_completed',
          $2,
          $2,
          $3,
          'manual_hr',
          $4,
          $5::jsonb
        )
      `,
      [
        offboardingCase.offboarding_case_id,
        offboardingCase.status,
        input.actorUserId,
        reason,
        JSON.stringify({
          closedRelationshipId: closedEmployeeRelationship.relationshipId,
          openedRelationshipId: openedContractorRelationship.relationshipId,
          contractorSubtype: input.contractorSubtype,
          contractorEffectiveFrom
        })
      ]
    )

    return {
      offboardingCaseId: offboardingCase.offboarding_case_id,
      closedEmployeeRelationship,
      openedContractorRelationship
    }
  })
}

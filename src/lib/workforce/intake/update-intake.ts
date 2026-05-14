import 'server-only'

import { withTransaction } from '@/lib/db'
import { buildTenantEntitlementSubject } from '@/lib/commercial/party/route-entitlement-subject'
import { can } from '@/lib/entitlements/runtime'
import { HrCoreValidationError, assertDateString, normalizeNullableString } from '@/lib/hr-core/shared'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { resolveWorkforceActivationReadiness } from '@/lib/workforce/activation/readiness'
import {
  CONTRACT_DERIVATIONS,
  resolveScheduleRequired,
  type ContractType
} from '@/types/hr-contracts'
import type { HrEmploymentType } from '@/types/hr-core'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

const EMPLOYMENT_TYPES = new Set<HrEmploymentType>(['full_time', 'part_time', 'contractor'])
const CONTRACT_TYPES = new Set<ContractType>(['indefinido', 'plazo_fijo', 'honorarios', 'contractor', 'eor'])

export interface UpdateWorkforceMemberIntakeBody {
  readonly hireDate?: string | null
  readonly employmentType?: HrEmploymentType | null
  readonly contractType?: ContractType
  readonly contractEndDate?: string | null
  readonly dailyRequired?: boolean | null
  readonly deelContractId?: string | null
  readonly reason?: string
}

interface MemberIntakeRow extends Record<string, unknown> {
  member_id: string
  display_name: string
  primary_email: string | null
  identity_profile_id: string | null
  workforce_intake_status: 'pending_intake' | 'in_review' | 'completed'
  active: boolean
  hire_date: Date | string | null
  employment_type: string | null
  contract_type: string | null
  contract_end_date: Date | string | null
  daily_required: boolean
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
}

const hasOwn = (input: UpdateWorkforceMemberIntakeBody, key: keyof UpdateWorkforceMemberIntakeBody) =>
  Object.prototype.hasOwnProperty.call(input, key)

const toIsoDate = (value: Date | string | null): string | null => {
  if (!value) return null

  if (typeof value === 'string') return value.slice(0, 10)

  return value.toISOString().slice(0, 10)
}

const assertNullableDateString = (value: unknown, label: string) => {
  if (value === null || value === undefined || value === '') return null

  return assertDateString(value, label)
}

const assertEmploymentType = (value: unknown): HrEmploymentType | null => {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'string' && EMPLOYMENT_TYPES.has(value as HrEmploymentType)) {
    return value as HrEmploymentType
  }

  throw new HrCoreValidationError('employmentType is invalid.', 400, {
    allowed: [...EMPLOYMENT_TYPES]
  })
}

const assertContractType = (value: unknown): ContractType => {
  if (typeof value === 'string' && CONTRACT_TYPES.has(value as ContractType)) {
    return value as ContractType
  }

  throw new HrCoreValidationError('contractType is invalid.', 400, {
    allowed: [...CONTRACT_TYPES]
  })
}

const toSnapshot = (row: MemberIntakeRow) => ({
  hireDate: toIsoDate(row.hire_date),
  employmentType: row.employment_type,
  contractType: row.contract_type,
  contractEndDate: toIsoDate(row.contract_end_date),
  dailyRequired: row.daily_required,
  payRegime: row.pay_regime,
  payrollVia: row.payroll_via,
  deelContractId: row.deel_contract_id,
  workforceIntakeStatus: row.workforce_intake_status
})

export const updateWorkforceMemberIntake = async ({
  memberId,
  tenant,
  body
}: {
  readonly memberId: string
  readonly tenant: TenantContext
  readonly body: UpdateWorkforceMemberIntakeBody
}) => {
  const subject = buildTenantEntitlementSubject(tenant)

  if (!can(subject, 'workforce.member.intake.update', 'update', 'tenant')) {
    throw new HrCoreValidationError('Forbidden — capability workforce.member.intake.update required', 403)
  }

  if (!memberId || typeof memberId !== 'string') {
    throw new HrCoreValidationError('memberId path param is required', 400)
  }

  const updatesRequested = [
    'hireDate',
    'employmentType',
    'contractType',
    'contractEndDate',
    'dailyRequired',
    'deelContractId'
  ].some(key => hasOwn(body, key as keyof UpdateWorkforceMemberIntakeBody))

  if (!updatesRequested) {
    throw new HrCoreValidationError('At least one intake field is required.', 400)
  }

  const result = await withTransaction(async client => {
    const existing = await client.query<MemberIntakeRow>(
      `SELECT
         member_id,
         display_name,
         primary_email,
         identity_profile_id,
         workforce_intake_status,
         active,
         hire_date,
         employment_type,
         contract_type,
         contract_end_date,
         daily_required,
         pay_regime,
         payroll_via,
         deel_contract_id
       FROM greenhouse_core.members
       WHERE member_id = $1
       FOR UPDATE`,
      [memberId]
    )

    const member = existing.rows[0]

    if (!member) {
      throw new HrCoreValidationError('Member not found', 404)
    }

    if (!member.active) {
      throw new HrCoreValidationError('Member is inactive.', 409, { memberId })
    }

    if (member.workforce_intake_status === 'completed') {
      throw new HrCoreValidationError('Workforce intake is already completed.', 409, {
        memberId,
        workforceIntakeStatus: member.workforce_intake_status
      })
    }

    if (member.workforce_intake_status !== 'pending_intake' && member.workforce_intake_status !== 'in_review') {
      throw new HrCoreValidationError(`Invalid intake state: ${member.workforce_intake_status}`, 409, {
        allowed: ['pending_intake', 'in_review']
      })
    }

    const previous = toSnapshot(member)

    const nextContractType = hasOwn(body, 'contractType')
      ? assertContractType(body.contractType)
      : assertContractType(member.contract_type ?? 'indefinido')

    const derivation = CONTRACT_DERIVATIONS[nextContractType]

    const nextContractEndDate = hasOwn(body, 'contractEndDate')
      ? assertNullableDateString(body.contractEndDate, 'contractEndDate')
      : toIsoDate(member.contract_end_date)

    const nextDeelContractId = hasOwn(body, 'deelContractId')
      ? normalizeNullableString(body.deelContractId)
      : member.deel_contract_id

    const nextDailyRequired = resolveScheduleRequired({
      contractType: nextContractType,
      scheduleRequired: hasOwn(body, 'dailyRequired') ? body.dailyRequired : member.daily_required
    })

    if (nextContractType === 'plazo_fijo' && !nextContractEndDate) {
      throw new HrCoreValidationError('contractEndDate is required for plazo_fijo contracts.', 400)
    }

    if ((nextContractType === 'contractor' || nextContractType === 'eor') && !nextDeelContractId) {
      throw new HrCoreValidationError('deelContractId is required for contractor and eor contracts.', 400)
    }

    const nextValues = {
      hireDate: hasOwn(body, 'hireDate') ? assertNullableDateString(body.hireDate, 'hireDate') : previous.hireDate,
      employmentType: hasOwn(body, 'employmentType') ? assertEmploymentType(body.employmentType) : member.employment_type,
      contractType: nextContractType,
      contractEndDate: nextContractEndDate,
      dailyRequired: nextDailyRequired,
      payRegime: derivation.payRegime,
      payrollVia: derivation.payrollVia,
      deelContractId: derivation.payrollVia === 'deel' ? nextDeelContractId : null,
      workforceIntakeStatus: 'in_review' as const
    }

    await client.query(
      `UPDATE greenhouse_core.members
       SET hire_date = $1,
           employment_type = $2,
           contract_type = $3,
           contract_end_date = $4,
           daily_required = $5,
           pay_regime = $6,
           payroll_via = $7,
           deel_contract_id = $8,
           workforce_intake_status = CASE
             WHEN workforce_intake_status = 'pending_intake' THEN 'in_review'
             ELSE workforce_intake_status
           END,
           updated_at = CURRENT_TIMESTAMP
       WHERE member_id = $9`,
      [
        nextValues.hireDate,
        nextValues.employmentType,
        nextValues.contractType,
        nextValues.contractEndDate,
        nextValues.dailyRequired,
        nextValues.payRegime,
        nextValues.payrollVia,
        nextValues.deelContractId,
        memberId
      ]
    )

    const after = {
      ...nextValues,
      workforceIntakeStatus:
        member.workforce_intake_status === 'pending_intake' ? 'in_review' : member.workforce_intake_status
    }

    await publishOutboxEvent(
      {
        aggregateType: AGGREGATE_TYPES.member,
        aggregateId: memberId,
        eventType: EVENT_TYPES.workforceMemberIntakeUpdated,
        payload: {
          schemaVersion: 1,
          memberId,
          displayName: member.display_name,
          primaryEmail: member.primary_email,
          identityProfileId: member.identity_profile_id,
          actorUserId: tenant.userId,
          reason: normalizeNullableString(body.reason),
          previous,
          after,
          updatedAt: new Date().toISOString()
        }
      },
      client
    )

    return {
      memberId,
      displayName: member.display_name,
      previous,
      after,
      actorUserId: tenant.userId
    }
  })

  const readiness = await resolveWorkforceActivationReadiness(memberId)

  return {
    ...result,
    readiness
  }
}

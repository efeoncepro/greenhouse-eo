import 'server-only'

import type { PoolClient } from 'pg'

import { DEFAULT_MAX_FTE } from '@/lib/team-capacity/units'
import { query, withTransaction } from '@/lib/db'
import { assertEngagementServiceEligible, buildEligibleServicePredicate } from './eligibility'
import { getMemberCapacityForPeriodUsingClient, type MemberCapacityForPeriod } from './capacity-checker'
import { isUniqueConstraintError, toDateString, toIsoDateKey, toIsoTimestamp, toTimestampString, trimRequired } from './shared'

export const ENGAGEMENT_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'withdrawn'] as const

export type EngagementApprovalStatus = typeof ENGAGEMENT_APPROVAL_STATUSES[number]

export interface ProposedCapacityMember {
  memberId: string
  proposedFte: number
}

export interface CapacityWarningMemberSnapshot extends MemberCapacityForPeriod {
  proposedFte: number
  projectedFte: number
  exceedsCapacity: boolean
}

export interface CapacityWarningSnapshot {
  checkedAt: string
  fromDate: string
  toDate: string
  hasWarning: boolean
  members: CapacityWarningMemberSnapshot[]
}

export interface EngagementApproval {
  approvalId: string
  serviceId: string
  requestedBy: string | null
  expectedInternalCostClp: number
  expectedDurationDays: number
  decisionDeadline: string
  successCriteria: Record<string, unknown>
  capacityWarning: CapacityWarningSnapshot | null
  capacityOverrideReason: string | null
  status: EngagementApprovalStatus
  approvedBy: string | null
  approvedAt: string | null
  rejectedBy: string | null
  rejectedAt: string | null
  rejectionReason: string | null
  withdrawnBy: string | null
  withdrawnAt: string | null
  withdrawalReason: string | null
  createdAt: string
  updatedAt: string
}

export interface RequestApprovalInput {
  serviceId: string
  requestedBy: string
  expectedInternalCostClp: number
  expectedDurationDays: number
  decisionDeadline: Date | string
  successCriteria: Record<string, unknown>
}

export interface ApprovalLookupInput {
  approvalId?: string
  serviceId?: string
}

export interface ApproveEngagementInput extends ApprovalLookupInput {
  approvedBy: string
  proposedMembers?: ProposedCapacityMember[]
  capacityOverrideReason?: string | null
  approvedAt?: Date | string
}

export interface RejectEngagementInput extends ApprovalLookupInput {
  rejectedBy: string
  rejectionReason: string
  rejectedAt?: Date | string
}

export interface WithdrawApprovalInput extends ApprovalLookupInput {
  withdrawnBy: string
  withdrawalReason?: string | null
  withdrawnAt?: Date | string
}

interface ApprovalRow extends Record<string, unknown> {
  approval_id: string
  service_id: string
  requested_by: string | null
  expected_internal_cost_clp: string | number
  expected_duration_days: number
  decision_deadline: Date | string
  success_criteria_json: Record<string, unknown>
  capacity_warning_json: CapacityWarningSnapshot | null
  capacity_override_reason: string | null
  status: EngagementApprovalStatus
  approved_by: string | null
  approved_at: Date | string | null
  rejected_by: string | null
  rejected_at: Date | string | null
  rejection_reason: string | null
  withdrawn_by: string | null
  withdrawn_at: Date | string | null
  withdrawal_reason: string | null
  created_at: Date | string
  updated_at: Date | string
}

interface ApprovalServiceRow extends Record<string, unknown> {
  service_id: string
  engagement_kind: string
  start_date: Date | string | null
  target_end_date: Date | string | null
}

interface PendingApprovalContext extends ApprovalRow, ApprovalServiceRow {}

export class EngagementApprovalValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementApprovalValidationError'
  }
}

export class EngagementApprovalConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementApprovalConflictError'
  }
}

export class EngagementApprovalNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EngagementApprovalNotFoundError'
  }
}

const toNumber = (value: string | number): number => {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeApproval = (row: ApprovalRow): EngagementApproval => ({
  approvalId: row.approval_id,
  serviceId: row.service_id,
  requestedBy: row.requested_by,
  expectedInternalCostClp: toNumber(row.expected_internal_cost_clp),
  expectedDurationDays: row.expected_duration_days,
  decisionDeadline: toDateString(row.decision_deadline) ?? '',
  successCriteria: row.success_criteria_json,
  capacityWarning: row.capacity_warning_json ?? null,
  capacityOverrideReason: row.capacity_override_reason,
  status: row.status,
  approvedBy: row.approved_by,
  approvedAt: toTimestampString(row.approved_at),
  rejectedBy: row.rejected_by,
  rejectedAt: toTimestampString(row.rejected_at),
  rejectionReason: row.rejection_reason,
  withdrawnBy: row.withdrawn_by,
  withdrawnAt: toTimestampString(row.withdrawn_at),
  withdrawalReason: row.withdrawal_reason,
  createdAt: toTimestampString(row.created_at) ?? '',
  updatedAt: toTimestampString(row.updated_at) ?? ''
})

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const assertNonRegularService = (service: ApprovalServiceRow | undefined, serviceId: string) => {
  if (!service) throw new EngagementApprovalNotFoundError(`Service ${serviceId} does not exist.`)

  if (service.engagement_kind === 'regular') {
    throw new EngagementApprovalValidationError('Regular services do not require engagement approval.')
  }
}

const assertRequestApprovalInput = (input: RequestApprovalInput) => {
  const serviceId = trimRequired(input.serviceId, 'serviceId')
  const requestedBy = trimRequired(input.requestedBy, 'requestedBy')
  const decisionDeadline = toIsoDateKey(input.decisionDeadline, 'decisionDeadline')

  if (!Number.isFinite(input.expectedInternalCostClp) || input.expectedInternalCostClp < 0) {
    throw new EngagementApprovalValidationError('expectedInternalCostClp must be a non-negative number.')
  }

  if (!Number.isInteger(input.expectedDurationDays) || input.expectedDurationDays < 7 || input.expectedDurationDays > 120) {
    throw new EngagementApprovalValidationError('expectedDurationDays must be an integer between 7 and 120.')
  }

  if (!isPlainObject(input.successCriteria) || Object.keys(input.successCriteria).length === 0) {
    throw new EngagementApprovalValidationError('successCriteria must be a non-empty object.')
  }

  return {
    serviceId,
    requestedBy,
    expectedInternalCostClp: input.expectedInternalCostClp,
    expectedDurationDays: input.expectedDurationDays,
    decisionDeadline,
    successCriteria: input.successCriteria
  }
}

const assertLookupInput = (input: ApprovalLookupInput) => {
  const approvalId = input.approvalId?.trim() || null
  const serviceId = input.serviceId?.trim() || null

  if (!approvalId && !serviceId) {
    throw new EngagementApprovalValidationError('approvalId or serviceId is required.')
  }

  return { approvalId, serviceId }
}

const assertProposedMembers = (members: ProposedCapacityMember[] | undefined): ProposedCapacityMember[] => {
  return (members ?? []).map(member => {
    const memberId = trimRequired(member.memberId, 'memberId')

    if (!Number.isFinite(member.proposedFte) || member.proposedFte <= 0 || member.proposedFte > DEFAULT_MAX_FTE) {
      throw new EngagementApprovalValidationError('proposedFte must be greater than 0 and less than or equal to 1.')
    }

    return { memberId, proposedFte: member.proposedFte }
  })
}

const assertApproveInput = (input: ApproveEngagementInput) => {
  const lookup = assertLookupInput(input)
  const approvedBy = trimRequired(input.approvedBy, 'approvedBy')
  const approvedAt = input.approvedAt == null ? new Date().toISOString() : toIsoTimestamp(input.approvedAt, 'approvedAt')
  const proposedMembers = assertProposedMembers(input.proposedMembers)
  const capacityOverrideReason = input.capacityOverrideReason?.trim() || null

  if (capacityOverrideReason != null && capacityOverrideReason.length < 10) {
    throw new EngagementApprovalValidationError('capacityOverrideReason must have at least 10 characters.')
  }

  return { ...lookup, approvedBy, approvedAt, proposedMembers, capacityOverrideReason }
}

const assertRejectInput = (input: RejectEngagementInput) => {
  const lookup = assertLookupInput(input)
  const rejectedBy = trimRequired(input.rejectedBy, 'rejectedBy')
  const rejectionReason = trimRequired(input.rejectionReason, 'rejectionReason')
  const rejectedAt = input.rejectedAt == null ? new Date().toISOString() : toIsoTimestamp(input.rejectedAt, 'rejectedAt')

  if (rejectionReason.length < 10) {
    throw new EngagementApprovalValidationError('rejectionReason must have at least 10 characters.')
  }

  return { ...lookup, rejectedBy, rejectionReason, rejectedAt }
}

const assertWithdrawInput = (input: WithdrawApprovalInput) => {
  const lookup = assertLookupInput(input)
  const withdrawnBy = trimRequired(input.withdrawnBy, 'withdrawnBy')
  const withdrawalReason = input.withdrawalReason?.trim() || null
  const withdrawnAt = input.withdrawnAt == null ? new Date().toISOString() : toIsoTimestamp(input.withdrawnAt, 'withdrawnAt')

  if (withdrawalReason != null && withdrawalReason.length < 10) {
    throw new EngagementApprovalValidationError('withdrawalReason must have at least 10 characters.')
  }

  return { ...lookup, withdrawnBy, withdrawalReason, withdrawnAt }
}

const findPendingApprovalForUpdate = async (
  client: PoolClient,
  lookup: ReturnType<typeof assertLookupInput>
): Promise<PendingApprovalContext> => {
  const result = await client.query<PendingApprovalContext>(
    `SELECT a.*, s.engagement_kind, s.start_date, s.target_end_date
     FROM greenhouse_commercial.engagement_approvals a
     JOIN greenhouse_core.services s ON s.service_id = a.service_id
     WHERE a.status = 'pending'
       AND (($1::text IS NOT NULL AND a.approval_id = $1)
         OR ($2::text IS NOT NULL AND a.service_id = $2))
     LIMIT 1
     FOR UPDATE OF a, s`,
    [lookup.approvalId, lookup.serviceId]
  )

  const approval = result.rows[0]

  if (!approval) throw new EngagementApprovalNotFoundError('Pending engagement approval was not found.')

  return approval
}

const getServiceForUpdate = async (client: PoolClient, serviceId: string): Promise<ApprovalServiceRow> => {
  const result = await client.query<ApprovalServiceRow>(
    `SELECT service_id, engagement_kind, start_date, target_end_date
     FROM greenhouse_core.services
     WHERE service_id = $1
     LIMIT 1
     FOR UPDATE`,
    [serviceId]
  )

  const service = result.rows[0]

  assertNonRegularService(service, serviceId)

  return service
}

const subtractDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)

  date.setUTCDate(date.getUTCDate() - days)

  return date.toISOString().slice(0, 10)
}

const resolveCapacityWindow = (approval: PendingApprovalContext): { fromDate: string; toDate: string } => {
  const deadline = toDateString(approval.decision_deadline) ?? new Date().toISOString().slice(0, 10)
  const fallbackFrom = subtractDays(deadline, Math.max(approval.expected_duration_days - 1, 0))
  const fromDate = toDateString(approval.start_date) ?? fallbackFrom
  const targetEndDate = toDateString(approval.target_end_date)
  const toDate = targetEndDate && targetEndDate >= fromDate ? targetEndDate : deadline

  return { fromDate, toDate: toDate >= fromDate ? toDate : fromDate }
}

const buildCapacityWarningSnapshot = async ({
  client,
  proposedMembers,
  fromDate,
  toDate,
  checkedAt
}: {
  client: PoolClient
  proposedMembers: ProposedCapacityMember[]
  fromDate: string
  toDate: string
  checkedAt: string
}): Promise<CapacityWarningSnapshot> => {
  const members: CapacityWarningMemberSnapshot[] = []

  for (const proposed of proposedMembers) {
    const capacity = await getMemberCapacityForPeriodUsingClient(client, proposed.memberId, fromDate, toDate)
    const projectedFte = capacity.allocatedFte + proposed.proposedFte

    members.push({
      ...capacity,
      proposedFte: proposed.proposedFte,
      projectedFte,
      exceedsCapacity: projectedFte > DEFAULT_MAX_FTE
    })
  }

  return {
    checkedAt,
    fromDate,
    toDate,
    hasWarning: members.some(member => member.exceedsCapacity),
    members
  }
}

export const requestApproval = async (input: RequestApprovalInput): Promise<{ approvalId: string }> => {
  const normalized = assertRequestApprovalInput(input)

  try {
    return await withTransaction(async client => {
      await assertEngagementServiceEligible(client, normalized.serviceId)
      await getServiceForUpdate(client, normalized.serviceId)

      const result = await client.query<{ approval_id: string }>(
        `INSERT INTO greenhouse_commercial.engagement_approvals (
           service_id,
           requested_by,
           expected_internal_cost_clp,
           expected_duration_days,
           decision_deadline,
           success_criteria_json
         ) VALUES (
           $1, $2, $3, $4, $5::date, $6::jsonb
         )
         RETURNING approval_id`,
        [
          normalized.serviceId,
          normalized.requestedBy,
          normalized.expectedInternalCostClp,
          normalized.expectedDurationDays,
          normalized.decisionDeadline,
          JSON.stringify(normalized.successCriteria)
        ]
      )

      const approvalId = result.rows[0]?.approval_id

      if (!approvalId) throw new Error('Failed to request engagement approval.')

      await client.query(
        `UPDATE greenhouse_core.services
         SET status = 'pending_approval',
             updated_at = now()
         WHERE service_id = $1
           AND engagement_kind != 'regular'`,
        [normalized.serviceId]
      )

      return { approvalId }
    })
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new EngagementApprovalConflictError(`Service ${normalized.serviceId} already has an engagement approval.`)
    }

    throw error
  }
}

export const approveEngagement = async (input: ApproveEngagementInput): Promise<EngagementApproval> => {
  const normalized = assertApproveInput(input)

  return withTransaction(async client => {
    const pending = await findPendingApprovalForUpdate(client, normalized)

    await assertEngagementServiceEligible(client, pending.service_id)
    assertNonRegularService(pending, pending.service_id)

    const { fromDate, toDate } = resolveCapacityWindow(pending)

    const capacityWarning = await buildCapacityWarningSnapshot({
      client,
      proposedMembers: normalized.proposedMembers,
      fromDate,
      toDate,
      checkedAt: normalized.approvedAt
    })

    if (capacityWarning.hasWarning && normalized.capacityOverrideReason == null) {
      throw new EngagementApprovalValidationError('capacityOverrideReason is required when proposed capacity exceeds 100%.')
    }

    const result = await client.query<ApprovalRow>(
      `UPDATE greenhouse_commercial.engagement_approvals
       SET status = 'approved',
           approved_by = $2,
           approved_at = $3::timestamptz,
           capacity_warning_json = $4::jsonb,
           capacity_override_reason = $5,
           updated_at = now()
       WHERE approval_id = $1
         AND status = 'pending'
       RETURNING *`,
      [
        pending.approval_id,
        normalized.approvedBy,
        normalized.approvedAt,
        JSON.stringify(capacityWarning),
        normalized.capacityOverrideReason
      ]
    )

    const approval = result.rows[0]

    if (!approval) throw new EngagementApprovalNotFoundError('Pending engagement approval was not found.')

    await client.query(
      `UPDATE greenhouse_core.services
       SET status = 'active',
           updated_at = now()
       WHERE service_id = $1
         AND engagement_kind != 'regular'`,
      [approval.service_id]
    )

    return normalizeApproval(approval)
  })
}

export const rejectEngagement = async (input: RejectEngagementInput): Promise<EngagementApproval> => {
  const normalized = assertRejectInput(input)

  return withTransaction(async client => {
    const pending = await findPendingApprovalForUpdate(client, normalized)

    await assertEngagementServiceEligible(client, pending.service_id)
    assertNonRegularService(pending, pending.service_id)

    const result = await client.query<ApprovalRow>(
      `UPDATE greenhouse_commercial.engagement_approvals
       SET status = 'rejected',
           rejected_by = $2,
           rejected_at = $3::timestamptz,
           rejection_reason = $4,
           updated_at = now()
       WHERE approval_id = $1
         AND status = 'pending'
       RETURNING *`,
      [pending.approval_id, normalized.rejectedBy, normalized.rejectedAt, normalized.rejectionReason]
    )

    const approval = result.rows[0]

    if (!approval) throw new EngagementApprovalNotFoundError('Pending engagement approval was not found.')

    return normalizeApproval(approval)
  })
}

export const withdrawApproval = async (input: WithdrawApprovalInput): Promise<EngagementApproval> => {
  const normalized = assertWithdrawInput(input)

  return withTransaction(async client => {
    const pending = await findPendingApprovalForUpdate(client, normalized)

    await assertEngagementServiceEligible(client, pending.service_id)
    assertNonRegularService(pending, pending.service_id)

    const result = await client.query<ApprovalRow>(
      `UPDATE greenhouse_commercial.engagement_approvals
       SET status = 'withdrawn',
           withdrawn_by = $2,
           withdrawn_at = $3::timestamptz,
           withdrawal_reason = $4,
           updated_at = now()
       WHERE approval_id = $1
         AND status = 'pending'
       RETURNING *`,
      [pending.approval_id, normalized.withdrawnBy, normalized.withdrawnAt, normalized.withdrawalReason]
    )

    const approval = result.rows[0]

    if (!approval) throw new EngagementApprovalNotFoundError('Pending engagement approval was not found.')

    return normalizeApproval(approval)
  })
}

export const getApprovalForService = async (serviceId: string): Promise<EngagementApproval | null> => {
  const normalizedServiceId = trimRequired(serviceId, 'serviceId')

  const rows = await query<ApprovalRow>(
    `SELECT a.*
     FROM greenhouse_commercial.engagement_approvals a
     JOIN greenhouse_core.services s ON s.service_id = a.service_id
     WHERE a.service_id = $1
       AND ${buildEligibleServicePredicate('s')}
     LIMIT 1`,
    [normalizedServiceId]
  )

  return rows[0] ? normalizeApproval(rows[0]) : null
}

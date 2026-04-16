import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  CreateLeaveRequestInput,
  HrCoreMetadata,
  HrLeaveBackfillInput,
  HrLeaveBalanceAdjustmentInput,
  HrLeaveBalanceAdjustmentReverseInput,
  HrLeaveBalanceAdjustmentRecord,
  HrLeaveBalanceAdjustmentsResponse,
  HrLeaveCalendarResponse,
  HrDepartment,
  HrLeaveBalance,
  HrLeaveBalancesResponse,
  HrLeaveCalendarEvent,
  HrLeavePayrollImpactSummary,
  HrLeavePolicy,
  HrLeavePolicyExplain,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveType,
  ReviewLeaveRequestInput
} from '@/types/hr-core'
import type { ContractType, PayRegime, PayrollVia } from '@/types/hr-contracts'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'
import type { WorkflowApprovalSnapshotRecord } from '@/lib/approval-authority/types'

import {
  calculateProgressiveExtraDays,
  classifyLeavePayrollImpact,
  computeLeaveDayBreakdown,
  formatPeriodLabel,
  getCalendarDayDiff,
  getLeaveColorByStatus,
  getLeaveEventEndDate,
  getLeaveTitle,
  getTodayDateKey,
  isPolicyApplicableToMember,
  listPeriodIdsInRange,
  loadHolidayDateSetForRange
} from '@/lib/hr-core/leave-domain'
import type { LeaveDayPeriod, LeavePayrollImpactPeriod, LeavePolicy } from '@/lib/hr-core/leave-domain'
import { canPerformLeaveReviewAction, getLeaveApprovalStageCode } from '@/lib/hr-core/leave-review-policy'
import { getNextApprovalAuthority, resolveInitialApprovalAuthority } from '@/lib/approval-authority/resolver'
import {
  applyWorkflowApprovalOverrideInTransaction,
  getWorkflowApprovalSnapshotForStage,
  listVisibleWorkflowEntityIdsForApprover,
  listWorkflowApprovalSnapshotsForEntities,
  upsertWorkflowApprovalSnapshotInTransaction
} from '@/lib/approval-authority/store'
import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { getSupervisorScopeForTenant } from '@/lib/reporting-hierarchy/access'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import {
  HR_ATTENDANCE_STATUSES,
  HR_BANK_ACCOUNT_TYPES,
  HR_EMPLOYMENT_TYPES,
  HR_HEALTH_SYSTEMS,
  HR_JOB_LEVELS,
  HR_LEAVE_REQUEST_STATUSES,
  HrCoreValidationError,
  assertDateString,
  assertEnum,
  isHrAdminTenant,
  normalizeNullableString,
  normalizeString,
  toInt,
  toNullableNumber
} from '@/lib/hr-core/shared'
import { resolveAvatarUrl } from '@/lib/person-360/resolve-avatar'
import { attachAssetToAggregate, buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'
import { normalizeContractType, normalizePayRegime, normalizePayrollVia } from '@/types/hr-contracts'

type PostgresDepartmentRow = {
  department_id: string
  name: string
  description: string | null
  parent_department_id: string | null
  head_member_id: string | null
  head_member_name: string | null
  business_unit: string | null
  active: boolean
  sort_order: number | null
}

type PostgresLeaveTypeRow = {
  leave_type_code: string
  leave_type_name: string
  description: string | null
  default_annual_allowance_days: number | string | null
  requires_attachment: boolean
  is_paid: boolean
  active: boolean
  color_token: string | null
}

type PostgresLeaveBalanceRow = {
  balance_id: string
  member_id: string
  member_name: string | null
  employment_type: string | null
  hire_date: string | Date | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
  leave_type_code: string
  leave_type_name: string | null
  year: number | string
  allowance_days: number | string | null
  progressive_extra_days: number | string | null
  carried_over_days: number | string | null
  adjustment_days: number | string | null
  accumulated_periods: number | string | null
  used_days: number | string | null
  reserved_days: number | string | null
}

type PostgresLeaveRequestRow = {
  request_id: string
  member_id: string
  member_name: string | null
  member_email: string | null
  member_avatar_url: string | null
  member_linked_user_id: string | null
  leave_type_code: string
  leave_type_name: string | null
  start_date: string | Date
  end_date: string | Date
  start_period: string | null
  end_period: string | null
  requested_days: number | string
  status: string
  reason: string | null
  attachment_asset_id: string | null
  attachment_url: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
  hr_reviewer_user_id: string | null
  decided_at: string | Date | null
  decided_by: string | null
  notes: string | null
  created_at: string | Date | null
  source_kind: 'request' | 'admin_backfill' | null
}

type PostgresMemberResolverRow = {
  member_id: string
  display_name: string
  email: string | null
  avatar_url: string | null
  linked_user_id: string | null
  identity_profile_id: string | null
  reports_to: string | null
  employment_type: string | null
  hire_date: string | Date | null
  prior_work_years: number | string | null
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
}

type PostgresUserRow = {
  user_id: string
  email: string | null
  identity_profile_id: string | null
}

type PostgresLeavePolicyRow = {
  policy_id: string
  leave_type_code: string
  policy_name: string
  accrual_type: string
  annual_days: number | string | null
  max_carry_over_days: number | string | null
  requires_approval: boolean
  min_advance_days: number | string | null
  max_consecutive_days: number | string | null
  min_continuous_days: number | string | null
  max_accumulation_periods: number | string | null
  progressive_enabled: boolean
  progressive_base_years: number | string | null
  progressive_interval_years: number | string | null
  progressive_max_extra_days: number | string | null
  applicable_employment_types: string[] | null
  applicable_pay_regimes: string[] | null
  applicable_contract_types: string[] | null
  applicable_payroll_vias: string[] | null
  allow_negative_balance: boolean
  active: boolean
}

type PostgresLeaveBalanceAdjustmentRow = {
  adjustment_id: string
  member_id: string
  member_name: string | null
  leave_type_code: string
  leave_type_name: string | null
  year: number | string
  days_delta: number | string
  effective_date: string | Date
  source_kind: 'manual_adjustment' | 'manual_adjustment_reversal'
  reason: string
  notes: string | null
  created_by_user_id: string | null
  created_at: string | Date | null
  reversed_at: string | Date | null
  reversed_by_user_id: string | null
  reversal_of_adjustment_id: string | null
}

type PostgresPayrollImpactPeriodRow = {
  period_id: string
  year: number | string
  month: number | string
  status: 'draft' | 'calculated' | 'approved' | 'exported'
}

const HR_CORE_POSTGRES_REQUIRED_TABLES = [
  'greenhouse_core.client_users',
  'greenhouse_core.departments',
  'greenhouse_core.members',
  'greenhouse_hr.leave_types',
  'greenhouse_hr.leave_policies',
  'greenhouse_hr.leave_balances',
  'greenhouse_hr.leave_requests',
  'greenhouse_hr.leave_request_actions'
] as const

let hrCoreLeaveStoreReadyPromise: Promise<void> | null = null
let hrCoreLeaveStoreReadyAt = 0

const HR_CORE_LEAVE_STORE_READY_TTL_MS = 60_000

const toPgDateString = (value: string | Date | null) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return typeof value === 'string' ? value.slice(0, 10) : null
}

const toPgTimestampString = (value: string | Date | null) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  return typeof value === 'string' ? value : null
}

const mapDepartment = (row: PostgresDepartmentRow): HrDepartment => ({
  departmentId: row.department_id,
  name: row.name,
  description: normalizeNullableString(row.description),
  parentDepartmentId: normalizeNullableString(row.parent_department_id),
  headMemberId: normalizeNullableString(row.head_member_id),
  headMemberName: normalizeNullableString(row.head_member_name),
  businessUnit: normalizeNullableString(row.business_unit) || '',
  active: Boolean(row.active),
  sortOrder: toInt(row.sort_order)
})

const mapLeaveType = (row: PostgresLeaveTypeRow): HrLeaveType => ({
  leaveTypeCode: row.leave_type_code,
  leaveTypeName: row.leave_type_name,
  description: normalizeNullableString(row.description),
  defaultAnnualAllowanceDays: toInt(row.default_annual_allowance_days),
  requiresAttachment: Boolean(row.requires_attachment),
  isPaid: Boolean(row.is_paid),
  active: Boolean(row.active),
  colorToken: normalizeNullableString(row.color_token)
})

const mapLeaveBalance = (row: PostgresLeaveBalanceRow): HrLeaveBalance => {
  const allowanceDays = toNullableNumber(row.allowance_days) ?? 0
  const progressiveExtraDays = toNullableNumber(row.progressive_extra_days) ?? 0
  const carriedOverDays = toNullableNumber(row.carried_over_days) ?? 0
  const adjustmentDays = toNullableNumber(row.adjustment_days) ?? 0
  const accumulatedPeriods = toInt(row.accumulated_periods)
  const usedDays = toNullableNumber(row.used_days) ?? 0
  const reservedDays = toNullableNumber(row.reserved_days) ?? 0

  return {
    balanceId: row.balance_id,
    memberId: row.member_id,
    memberName: normalizeNullableString(row.member_name),
    leaveTypeCode: row.leave_type_code,
    leaveTypeName: normalizeNullableString(row.leave_type_name) || row.leave_type_code,
    year: toInt(row.year),
    allowanceDays,
    progressiveExtraDays,
    carriedOverDays,
    adjustmentDays,
    accumulatedPeriods,
    usedDays,
    reservedDays,
    availableDays: allowanceDays + progressiveExtraDays + carriedOverDays + adjustmentDays - usedDays - reservedDays
  }
}

const mapLeavePolicy = (row: PostgresLeavePolicyRow): HrLeavePolicy & LeavePolicy => ({
  policyId: row.policy_id,
  leaveTypeCode: row.leave_type_code,
  policyName: row.policy_name,
  accrualType:
    row.accrual_type === 'monthly_accrual' || row.accrual_type === 'unlimited' || row.accrual_type === 'custom'
      ? row.accrual_type
      : 'annual_fixed',
  annualDays: toNullableNumber(row.annual_days) ?? 0,
  maxCarryOverDays: toNullableNumber(row.max_carry_over_days) ?? 0,
  requiresApproval: Boolean(row.requires_approval),
  minAdvanceDays: toNullableNumber(row.min_advance_days) ?? 0,
  maxConsecutiveDays: toNullableNumber(row.max_consecutive_days),
  minContinuousDays: toNullableNumber(row.min_continuous_days),
  maxAccumulationPeriods: toNullableNumber(row.max_accumulation_periods),
  progressiveEnabled: Boolean(row.progressive_enabled),
  progressiveBaseYears: toInt(row.progressive_base_years),
  progressiveIntervalYears: Math.max(1, toInt(row.progressive_interval_years)),
  progressiveMaxExtraDays: Math.max(0, toInt(row.progressive_max_extra_days)),
  applicableEmploymentTypes: Array.isArray(row.applicable_employment_types)
    ? row.applicable_employment_types.filter(Boolean).map(item => String(item).trim()).filter(Boolean)
    : [],
  applicablePayRegimes: Array.isArray(row.applicable_pay_regimes)
    ? row.applicable_pay_regimes.filter(Boolean).map(item => String(item).trim()).filter(Boolean)
    : [],
  applicableContractTypes: Array.isArray(row.applicable_contract_types)
    ? row.applicable_contract_types.filter(Boolean).map(item => String(item).trim()).filter(Boolean)
    : [],
  applicablePayrollVias: Array.isArray(row.applicable_payroll_vias)
    ? row.applicable_payroll_vias.filter(Boolean).map(item => String(item).trim()).filter(Boolean)
    : [],
  allowNegativeBalance: Boolean(row.allow_negative_balance),
  active: Boolean(row.active)
})

const mapLeaveRequest = (row: PostgresLeaveRequestRow): HrLeaveRequest => ({
  requestId: row.request_id,
  memberId: row.member_id,
  memberName: normalizeNullableString(row.member_name),
  memberAvatarUrl: resolveAvatarUrl(
    normalizeNullableString(row.member_avatar_url),
    normalizeNullableString(row.member_linked_user_id)
  ),
  leaveTypeCode: row.leave_type_code,
  leaveTypeName: normalizeNullableString(row.leave_type_name) || row.leave_type_code,
  startDate: toPgDateString(row.start_date) || '',
  endDate: toPgDateString(row.end_date) || '',
  startPeriod: (row.start_period || 'full_day') as LeaveDayPeriod,
  endPeriod: (row.end_period || 'full_day') as LeaveDayPeriod,
  requestedDays: toNullableNumber(row.requested_days) ?? 0,
  status: (normalizeNullableString(row.status) || 'pending_supervisor') as HrLeaveRequest['status'],
  reason: normalizeNullableString(row.reason),
  attachmentAssetId: normalizeNullableString(row.attachment_asset_id),
  attachmentUrl:
    normalizeNullableString(row.attachment_asset_id)
      ? buildPrivateAssetDownloadUrl(String(row.attachment_asset_id))
      : normalizeNullableString(row.attachment_url),
  supervisorMemberId: normalizeNullableString(row.supervisor_member_id),
  supervisorName: normalizeNullableString(row.supervisor_name),
  approvalStageCode:
    normalizeNullableString(row.status) === 'pending_hr'
      ? 'hr_review'
      : normalizeNullableString(row.status) === 'pending_supervisor'
        ? 'supervisor_review'
        : null,
  approvalSnapshot: null,
  hrReviewerUserId: normalizeNullableString(row.hr_reviewer_user_id),
  decidedAt: toPgTimestampString(row.decided_at),
  decidedBy: normalizeNullableString(row.decided_by),
  notes: normalizeNullableString(row.notes),
  createdAt: toPgTimestampString(row.created_at),
  sourceKind: row.source_kind === 'admin_backfill' ? 'admin_backfill' : 'request'
})

const mapLeaveBalanceAdjustment = (row: PostgresLeaveBalanceAdjustmentRow): HrLeaveBalanceAdjustmentRecord => ({
  adjustmentId: row.adjustment_id,
  memberId: row.member_id,
  memberName: normalizeNullableString(row.member_name),
  leaveTypeCode: row.leave_type_code,
  leaveTypeName: normalizeNullableString(row.leave_type_name) || row.leave_type_code,
  year: toInt(row.year),
  daysDelta: toNullableNumber(row.days_delta) ?? 0,
  effectiveDate: toPgDateString(row.effective_date) || '',
  sourceKind: row.source_kind,
  reason: normalizeString(row.reason),
  notes: normalizeNullableString(row.notes),
  createdByUserId: normalizeNullableString(row.created_by_user_id),
  createdAt: toPgTimestampString(row.created_at),
  reversedAt: toPgTimestampString(row.reversed_at),
  reversedByUserId: normalizeNullableString(row.reversed_by_user_id),
  reversalOfAdjustmentId: normalizeNullableString(row.reversal_of_adjustment_id)
})

type LeavePolicyMemberContext = {
  employmentType: string | null
  hireDate: string | null
  contractType: ContractType
  payRegime: PayRegime
  payrollVia: PayrollVia
}

type ResolvedLeavePolicy = {
  policy: HrLeavePolicy & LeavePolicy
  source: HrLeavePolicyExplain['policySource']
}

const buildMemberPolicyContext = ({
  employmentType,
  hireDate,
  contractType,
  payRegime,
  payrollVia
}: {
  employmentType: string | null
  hireDate: string | Date | null
  contractType: string | null
  payRegime: string | null
  payrollVia: string | null
}): LeavePolicyMemberContext => {
  const normalizedContractType = normalizeContractType(contractType)
  const normalizedPayRegime = normalizePayRegime(payRegime, normalizedContractType)
  const normalizedPayrollVia = normalizePayrollVia(payrollVia, normalizedContractType)

  return {
    employmentType: normalizeNullableString(employmentType),
    hireDate: toPgDateString(hireDate),
    contractType: normalizedContractType,
    payRegime: normalizedPayRegime,
    payrollVia: normalizedPayrollVia
  }
}

const buildDerivedVacationPolicy = ({
  leaveType,
  context,
  source
}: {
  leaveType: HrLeaveType
  context: LeavePolicyMemberContext
  source: HrLeavePolicyExplain['policySource']
}): HrLeavePolicy & LeavePolicy => ({
  policyId: `policy-${leaveType.leaveTypeCode}-${source}-${context.contractType}-${context.payrollVia}`,
  leaveTypeCode: leaveType.leaveTypeCode,
  policyName:
    source === 'external_provider'
      ? 'Vacaciones gestionadas por proveedor externo'
      : 'Vacaciones no habilitadas para este contrato',
  accrualType: 'custom',
  annualDays: 0,
  maxCarryOverDays: 0,
  requiresApproval: true,
  minAdvanceDays: 0,
  maxConsecutiveDays: null,
  minContinuousDays: null,
  maxAccumulationPeriods: null,
  progressiveEnabled: false,
  progressiveBaseYears: 10,
  progressiveIntervalYears: 3,
  progressiveMaxExtraDays: 0,
  applicableEmploymentTypes: context.employmentType ? [context.employmentType] : [],
  applicablePayRegimes: [context.payRegime],
  applicableContractTypes: [context.contractType],
  applicablePayrollVias: [context.payrollVia],
  allowNegativeBalance: false,
  active: true
})

const pickBestApprovalSnapshot = ({
  request,
  snapshots
}: {
  request: HrLeaveRequest
  snapshots: WorkflowApprovalSnapshotRecord[]
}) => {
  const currentStageCode = getLeaveApprovalStageCode(request.status)

  if (currentStageCode) {
    return snapshots.find(snapshot => snapshot.stageCode === currentStageCode) ?? null
  }

  return [...snapshots]
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .at(0) ?? null
}

const attachApprovalSnapshotsToLeaveRequests = async (
  requests: HrLeaveRequest[],
  client?: PoolClient
): Promise<HrLeaveRequest[]> => {
  if (requests.length === 0) {
    return requests
  }

  const snapshots = await listWorkflowApprovalSnapshotsForEntities({
    workflowDomain: 'leave',
    workflowEntityIds: requests.map(request => request.requestId),
    client
  })

  const snapshotsByRequestId = new Map<string, WorkflowApprovalSnapshotRecord[]>()

  for (const snapshot of snapshots) {
    const requestSnapshots = snapshotsByRequestId.get(snapshot.workflowEntityId) ?? []

    requestSnapshots.push(snapshot)
    snapshotsByRequestId.set(snapshot.workflowEntityId, requestSnapshots)
  }

  return requests.map(request => {
    const requestSnapshots = snapshotsByRequestId.get(request.requestId) ?? []
    const approvalSnapshot = pickBestApprovalSnapshot({ request, snapshots: requestSnapshots })

    return {
      ...request,
      approvalStageCode: getLeaveApprovalStageCode(request.status),
      approvalSnapshot
    }
  })
}

const attachApprovalSnapshotToLeaveRequest = async (request: HrLeaveRequest, client?: PoolClient) => {
  const [hydratedRequest] = await attachApprovalSnapshotsToLeaveRequests([request], client)

  return hydratedRequest ?? request
}

const getCurrentLeaveApprovalSnapshot = async (request: HrLeaveRequest, client: PoolClient) => {
  const currentStageCode = getLeaveApprovalStageCode(request.status)

  if (!currentStageCode) {
    return request.approvalSnapshot ?? null
  }

  return getWorkflowApprovalSnapshotForStage({
    workflowDomain: 'leave',
    workflowEntityId: request.requestId,
    stageCode: currentStageCode,
    client
  })
}

const queryRows = async <T extends Record<string, unknown>>(text: string, values: unknown[] = [], client?: PoolClient) => {
  if (client) {
    const result = await client.query<T>(text, values)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(text, values)
}

const getExistingLeaveTables = async () => {
  const rows = await runGreenhousePostgresQuery<{ qualified_name: string }>(
    `
      SELECT schemaname || '.' || tablename AS qualified_name
      FROM pg_tables
      WHERE schemaname = ANY($1::text[])
    `,
    [['greenhouse_core', 'greenhouse_hr']]
  )

  return new Set(rows.map(row => row.qualified_name))
}

export const isHrCoreLeavePostgresEnabled = () => isGreenhousePostgresConfigured()

export const assertHrCoreLeavePostgresReady = async () => {
  if (!isHrCoreLeavePostgresEnabled()) {
    throw new HrCoreValidationError(
      'HR Core Postgres store is not configured in this environment.',
      503,
      { missingConfig: true },
      'HR_CORE_POSTGRES_NOT_CONFIGURED'
    )
  }

  if (Date.now() - hrCoreLeaveStoreReadyAt < HR_CORE_LEAVE_STORE_READY_TTL_MS) {
    return
  }

  if (hrCoreLeaveStoreReadyPromise) {
    return hrCoreLeaveStoreReadyPromise
  }

  hrCoreLeaveStoreReadyPromise = (async () => {
    const existingTables = await getExistingLeaveTables()
    const missingTables = HR_CORE_POSTGRES_REQUIRED_TABLES.filter(tableName => !existingTables.has(tableName))

    if (missingTables.length > 0) {
      throw new HrCoreValidationError(
        'HR Core Postgres leave schema is not ready in this environment. Run the PostgreSQL HR leave bootstrap before using this module.',
        503,
        { missingTables },
        'HR_CORE_POSTGRES_SCHEMA_NOT_READY'
      )
    }

    hrCoreLeaveStoreReadyAt = Date.now()
  })().catch(error => {
    hrCoreLeaveStoreReadyPromise = null
    throw error
  })

  return hrCoreLeaveStoreReadyPromise.finally(() => {
    hrCoreLeaveStoreReadyPromise = null
  })
}

const listDepartmentsInternal = async () => {
  await assertHrCoreLeavePostgresReady()

  const rows = await runGreenhousePostgresQuery<PostgresDepartmentRow>(
    `
      SELECT
        d.department_id,
        d.name,
        d.description,
        d.parent_department_id,
        d.head_member_id,
        head.display_name AS head_member_name,
        d.business_unit,
        d.active,
        d.sort_order
      FROM greenhouse_core.departments AS d
      LEFT JOIN greenhouse_core.members AS head
        ON head.member_id = d.head_member_id
      WHERE d.active = TRUE
      ORDER BY d.sort_order ASC, d.name ASC
    `
  )

  return rows.map(mapDepartment)
}

const listLeaveTypesInternal = async (client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const rows = await queryRows<PostgresLeaveTypeRow>(
    `
      SELECT
        leave_type_code,
        leave_type_name,
        description,
        default_annual_allowance_days,
        requires_attachment,
        is_paid,
        active,
        color_token
      FROM greenhouse_hr.leave_types
      WHERE active = TRUE
      ORDER BY leave_type_name ASC
    `,
    [],
    client
  )

  return rows.map(mapLeaveType)
}

const listLeavePoliciesInternal = async (client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const rows = await queryRows<PostgresLeavePolicyRow>(
    `
      SELECT
        policy_id,
        leave_type_code,
        policy_name,
        accrual_type,
        annual_days,
        max_carry_over_days,
        requires_approval,
        min_advance_days,
        max_consecutive_days,
        min_continuous_days,
        max_accumulation_periods,
        progressive_enabled,
        progressive_base_years,
        progressive_interval_years,
        progressive_max_extra_days,
        applicable_employment_types,
        applicable_pay_regimes,
        applicable_contract_types,
        applicable_payroll_vias,
        allow_negative_balance,
        active
      FROM greenhouse_hr.leave_policies
      WHERE active = TRUE
      ORDER BY leave_type_code ASC, policy_name ASC
    `,
    [],
    client
  )

  return rows.map(mapLeavePolicy)
}

const getMemberById = async (memberId: string, client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const [row] = await queryRows<PostgresMemberResolverRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.primary_email AS email,
        COALESCE(p360.resolved_avatar_url, m.avatar_url) AS avatar_url,
        p360.user_id AS linked_user_id,
        m.identity_profile_id,
        m.reports_to_member_id AS reports_to,
        m.employment_type,
        m.hire_date,
        COALESCE(m.prior_work_years, 0) AS prior_work_years,
        m.contract_type,
        COALESCE(
          m.pay_regime,
          (
            SELECT cv.pay_regime
            FROM greenhouse_payroll.compensation_versions AS cv
            WHERE cv.member_id = m.member_id
            ORDER BY cv.effective_from DESC, cv.version DESC
            LIMIT 1
          )
        ) AS pay_regime,
        m.payroll_via
      FROM greenhouse_core.members AS m
      LEFT JOIN greenhouse_serving.person_360 AS p360
        ON p360.member_id = m.member_id
      WHERE m.member_id = $1
      LIMIT 1
    `,
    [memberId],
    client
  )

  if (!row) {
    throw new HrCoreValidationError('Team member not found.', 404)
  }

  return row
}

const resolveTenantMember = async (tenant: TenantContext, client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const [userRow] = await queryRows<PostgresUserRow>(
    `
      SELECT
        user_id,
        email,
        identity_profile_id
      FROM greenhouse_core.client_users
      WHERE user_id = $1
      LIMIT 1
    `,
    [tenant.userId],
    client
  )

  if (!userRow) {
    throw new HrCoreValidationError('Tenant user not found.', 404)
  }

  const [memberRow] = await queryRows<PostgresMemberResolverRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.primary_email AS email,
        m.identity_profile_id,
        m.reports_to_member_id AS reports_to,
        m.employment_type,
        m.hire_date,
        COALESCE(m.prior_work_years, 0) AS prior_work_years,
        m.contract_type,
        COALESCE(
          m.pay_regime,
          (
            SELECT cv.pay_regime
            FROM greenhouse_payroll.compensation_versions AS cv
            WHERE cv.member_id = m.member_id
            ORDER BY cv.effective_from DESC, cv.version DESC
            LIMIT 1
          )
        ) AS pay_regime,
        m.payroll_via
      FROM greenhouse_core.members AS m
      WHERE (
        $1::text IS NOT NULL
        AND m.identity_profile_id = $1
      )
      OR (
        $2::text IS NOT NULL
        AND LOWER(COALESCE(m.primary_email, '')) = LOWER($2)
      )
      ORDER BY
        CASE WHEN $1::text IS NOT NULL AND m.identity_profile_id = $1 THEN 0 ELSE 1 END,
        m.active DESC,
        m.display_name ASC
      LIMIT 1
    `,
    [userRow.identity_profile_id, userRow.email],
    client
  )

  if (!memberRow) {
    throw new HrCoreValidationError('Unable to resolve current collaborator.', 404, {
      userId: tenant.userId
    })
  }

  return memberRow
}

const assertMemberVisibleToTenant = async (tenant: TenantContext, memberId: string, client?: PoolClient) => {
  if (isHrAdminTenant(tenant)) {
    return
  }

  const currentMember = await resolveTenantMember(tenant, client)

  if (currentMember.member_id === memberId) {
    return
  }

  const supervisorScope = await getSupervisorScopeForTenant(tenant).catch(() => null)

  if (!supervisorScope?.visibleMemberIds.includes(memberId)) {
    throw new HrCoreValidationError('Forbidden', 403)
  }
}

const resolveApplicableLeavePolicy = ({
  leaveType,
  policies,
  member
}: {
  leaveType: HrLeaveType
  policies: LeavePolicy[]
  member: LeavePolicyMemberContext
}): ResolvedLeavePolicy => {
  const exactMatch = policies.find(policy =>
    policy.leaveTypeCode === leaveType.leaveTypeCode &&
    isPolicyApplicableToMember({
      policy,
      employmentType: member.employmentType,
      payRegime: member.payRegime,
      contractType: member.contractType,
      payrollVia: member.payrollVia
    })
  )

  if (exactMatch) {
    return {
      policy: exactMatch,
      source: 'catalog'
    }
  }

  if (leaveType.leaveTypeCode === 'vacation') {
    if (member.payrollVia === 'deel' || member.contractType === 'contractor' || member.contractType === 'eor') {
      return {
        policy: buildDerivedVacationPolicy({
          leaveType,
          context: member,
          source: 'external_provider'
        }),
        source: 'external_provider'
      }
    }

    if (member.contractType === 'honorarios') {
      return {
        policy: buildDerivedVacationPolicy({
          leaveType,
          context: member,
          source: 'not_eligible'
        }),
        source: 'not_eligible'
      }
    }
  }

  return {
    policy: mapLeavePolicy({
      policy_id: `policy-${leaveType.leaveTypeCode}-default-${member.contractType}-${member.payRegime}`,
    leave_type_code: leaveType.leaveTypeCode,
    policy_name: leaveType.leaveTypeName,
    accrual_type: 'annual_fixed',
    annual_days: leaveType.defaultAnnualAllowanceDays,
    max_carry_over_days: 0,
    requires_approval: true,
    min_advance_days: 0,
    max_consecutive_days: null,
    min_continuous_days: null,
    max_accumulation_periods: null,
    progressive_enabled: false,
    progressive_base_years: 10,
    progressive_interval_years: 3,
    progressive_max_extra_days: 10,
    applicable_employment_types: member.employmentType ? [member.employmentType] : [],
    applicable_pay_regimes: member.payRegime ? [member.payRegime] : [],
    applicable_contract_types: member.contractType ? [member.contractType] : [],
    applicable_payroll_vias: member.payrollVia ? [member.payrollVia] : [],
    allow_negative_balance: leaveType.defaultAnnualAllowanceDays <= 0,
    active: leaveType.active
    }),
    source: 'derived_internal'
  }
}

const doesLeaveTrackBalance = (policy: LeavePolicy) =>
  policy.accrualType !== 'unlimited' &&
  (
    policy.annualDays > 0 ||
    policy.maxCarryOverDays > 0 ||
    policy.progressiveEnabled ||
    !policy.allowNegativeBalance
  )

const buildPolicyExplain = ({
  resolution,
  member
}: {
  resolution: ResolvedLeavePolicy
  member: LeavePolicyMemberContext
}): HrLeavePolicyExplain => ({
  policyId: resolution.policy.policyId,
  policyName: resolution.policy.policyName,
  policySource: resolution.source,
  contractType: member.contractType,
  payRegime: member.payRegime,
  payrollVia: member.payrollVia,
  hireDate: member.hireDate,
  annualDays: resolution.policy.annualDays,
  tracksBalance: doesLeaveTrackBalance(resolution.policy),
  progressiveEnabled: resolution.policy.progressiveEnabled,
  allowNegativeBalance: resolution.policy.allowNegativeBalance
})

const computeBalanceSeedForYear = async ({
  member,
  leaveType,
  policy,
  year,
  actorUserId,
  client
}: {
  member: PostgresMemberResolverRow
  leaveType: HrLeaveType
  policy: LeavePolicy
  year: number
  actorUserId: string
  client: PoolClient
}) => {
  const previousBalance = year > 0
    ? await getBalanceByKey({
      memberId: member.member_id,
      leaveTypeCode: leaveType.leaveTypeCode,
      year: year - 1,
      client
    })
    : null

  const previousAccumulatedPeriods = previousBalance?.accumulatedPeriods ?? 0
  const previousAvailable = previousBalance?.availableDays ?? 0
  const carriedOverDays = Math.min(previousAvailable, policy.maxCarryOverDays)
  const accumulatedPeriods = previousAvailable > 0 ? previousAccumulatedPeriods + 1 : 0
  const asOfDate = `${year}-01-01`
  const priorWorkYears = toNullableNumber(member.prior_work_years) ?? 0

  const progressiveExtraDays =
    policy.progressiveEnabled && member.pay_regime === 'chile'
      ? calculateProgressiveExtraDays({
        priorWorkYears,
        hireDate: toPgDateString(member.hire_date),
        asOfDate,
        progressiveBaseYears: policy.progressiveBaseYears,
        progressiveIntervalYears: policy.progressiveIntervalYears,
        progressiveMaxExtraDays: policy.progressiveMaxExtraDays
      })
      : 0

  await client.query(
    `
      INSERT INTO greenhouse_hr.leave_balances (
        balance_id,
        member_id,
        leave_type_code,
        year,
        allowance_days,
        progressive_extra_days,
        carried_over_days,
        adjustment_days,
        accumulated_periods,
        used_days,
        reserved_days,
        updated_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, 0, 0, $9)
      ON CONFLICT (member_id, leave_type_code, year) DO NOTHING
    `,
    [
      `${member.member_id}-${year}-${leaveType.leaveTypeCode}`,
      member.member_id,
      leaveType.leaveTypeCode,
      year,
      policy.annualDays,
      progressiveExtraDays,
      carriedOverDays,
      accumulatedPeriods,
      actorUserId
    ]
  )
}

const ensureYearBalances = async ({
  memberId,
  year,
  actorUserId,
  client
}: {
  memberId: string
  year: number
  actorUserId: string
  client: PoolClient
}) => {
  const member = await getMemberById(memberId, client)

  const [leaveTypes, leavePolicies] = await Promise.all([
    listLeaveTypesInternal(client),
    listLeavePoliciesInternal(client)
  ])

  for (const leaveType of leaveTypes.filter(item => item.active)) {
    const resolution = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      member: buildMemberPolicyContext({
        employmentType: member.employment_type,
        hireDate: member.hire_date,
        contractType: member.contract_type,
        payRegime: member.pay_regime,
        payrollVia: member.payroll_via
      })
    })

    await computeBalanceSeedForYear({
      member,
      leaveType,
      policy: resolution.policy,
      year,
      actorUserId,
      client
    })
  }
}

const getBalanceByKey = async ({
  memberId,
  leaveTypeCode,
  year,
  client
}: {
  memberId: string
  leaveTypeCode: string
  year: number
  client?: PoolClient
}) => {
  const [row] = await queryRows<PostgresLeaveBalanceRow>(
    `
      SELECT
        b.balance_id,
        b.member_id,
        m.display_name AS member_name,
        m.employment_type,
        m.hire_date,
        m.contract_type,
        COALESCE(
          m.pay_regime,
          (
            SELECT cv.pay_regime
            FROM greenhouse_payroll.compensation_versions AS cv
            WHERE cv.member_id = m.member_id
            ORDER BY cv.effective_from DESC, cv.version DESC
            LIMIT 1
          )
        ) AS pay_regime,
        m.payroll_via,
        b.leave_type_code,
        lt.leave_type_name,
        b.year,
        b.allowance_days,
        b.progressive_extra_days,
        b.carried_over_days,
        b.adjustment_days,
        b.accumulated_periods,
        b.used_days,
        b.reserved_days
      FROM greenhouse_hr.leave_balances AS b
      LEFT JOIN greenhouse_core.members AS m
        ON m.member_id = b.member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = b.leave_type_code
      WHERE b.member_id = $1
        AND b.leave_type_code = $2
        AND b.year = $3
      LIMIT 1
    `,
    [memberId, leaveTypeCode, year],
    client
  )

  return row ? mapLeaveBalance(row) : null
}

const adjustBalanceByDelta = async ({
  memberId,
  leaveTypeCode,
  year,
  adjustmentDelta,
  actorUserId,
  client
}: {
  memberId: string
  leaveTypeCode: string
  year: number
  adjustmentDelta: number
  actorUserId: string
  client: PoolClient
}) => {
  await client.query(
    `
      UPDATE greenhouse_hr.leave_balances
      SET
        adjustment_days = COALESCE(adjustment_days, 0) + $4,
        updated_by_user_id = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE member_id = $1
        AND leave_type_code = $2
        AND year = $3
    `,
    [memberId, leaveTypeCode, year, adjustmentDelta, actorUserId]
  )
}

const adjustBalanceForRequest = async ({
  request,
  daysByYear,
  reservedDelta,
  usedDelta,
  actorUserId,
  client
}: {
  request: HrLeaveRequest
  daysByYear: Map<number, number>
  reservedDelta: number
  usedDelta: number
  actorUserId: string
  client: PoolClient
}) => {
  for (const [year, yearDays] of daysByYear.entries()) {
    if (yearDays <= 0) {
      continue
    }

    await client.query(
      `
        UPDATE greenhouse_hr.leave_balances
        SET
          reserved_days = GREATEST(0, COALESCE(reserved_days, 0) + $4),
          used_days = GREATEST(0, COALESCE(used_days, 0) + $5),
          updated_by_user_id = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE member_id = $1
          AND leave_type_code = $2
          AND year = $3
      `,
      [
        request.memberId,
        request.leaveTypeCode,
        year,
        reservedDelta * yearDays,
        usedDelta * yearDays,
        actorUserId
      ]
    )
  }
}

const getLeaveRequestByIdInternal = async (requestId: string, client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const [row] = await queryRows<PostgresLeaveRequestRow>(
    `
      SELECT
        r.request_id,
        r.member_id,
        COALESCE(p360.resolved_display_name, member.display_name) AS member_name,
        COALESCE(p360.resolved_email, member.primary_email) AS member_email,
        COALESCE(p360.resolved_avatar_url, member.avatar_url) AS member_avatar_url,
        COALESCE(p360.user_id, linked_user.user_id) AS member_linked_user_id,
        r.leave_type_code,
        lt.leave_type_name,
        r.start_date,
        r.end_date,
        r.start_period,
        r.end_period,
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_asset_id,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at,
        COALESCE(r.source_kind, 'request') AS source_kind
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
      LEFT JOIN greenhouse_serving.person_360 AS p360
        ON p360.member_id = member.member_id
      LEFT JOIN LATERAL (
        SELECT cu.user_id
        FROM greenhouse_core.client_users AS cu
        WHERE cu.member_id = member.member_id
        ORDER BY cu.active DESC, cu.updated_at DESC NULLS LAST, cu.created_at DESC NULLS LAST
        LIMIT 1
      ) AS linked_user ON TRUE
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE r.request_id = $1
      LIMIT 1
    `,
    [requestId],
    client
  )

  if (!row) {
    return null
  }

  return attachApprovalSnapshotToLeaveRequest(mapLeaveRequest(row), client)
}

const assertNoLeaveOverlap = async ({
  memberId,
  startDate,
  endDate,
  client
}: {
  memberId: string
  startDate: string
  endDate: string
  client: PoolClient
}) => {
  const rows = await queryRows<{ request_id: string }>(
    `
      SELECT request_id
      FROM greenhouse_hr.leave_requests
      WHERE member_id = $1
        AND status NOT IN ('rejected', 'cancelled')
        AND start_date <= $2::date
        AND end_date >= $3::date
      LIMIT 1
    `,
    [memberId, endDate, startDate],
    client
  )

  if (rows.length > 0) {
    throw new HrCoreValidationError('This leave request overlaps an existing active request.', 409, {
      overlappingRequestId: rows[0]?.request_id ?? null
    })
  }
}

const getPayrollImpactForLeave = async ({
  startDate,
  endDate,
  client
}: {
  startDate: string
  endDate: string
  client: PoolClient
}): Promise<HrLeavePayrollImpactSummary> => {
  const periodIds = listPeriodIdsInRange(startDate, endDate)

  if (periodIds.length === 0) {
    return {
      mode: 'none',
      impactedPeriods: []
    }
  }

  const rows = await queryRows<PostgresPayrollImpactPeriodRow>(
    `
      SELECT
        period_id,
        year,
        month,
        status
      FROM greenhouse_payroll.payroll_periods
      WHERE period_id = ANY($1)
        AND status IN ('draft', 'calculated', 'approved', 'exported')
    `,
    [periodIds],
    client
  ).catch(() => [])

  const impactedPeriods: LeavePayrollImpactPeriod[] = rows.map(row => ({
    periodId: row.period_id,
    year: toInt(row.year),
    month: toInt(row.month),
    status: row.status
  }))

  return classifyLeavePayrollImpact(impactedPeriods)
}

const buildLeaveEventPayload = async ({
  request,
  actorUserId,
  actorMemberId,
  actorName,
  daysByYear,
  holidaySource,
  payrollImpact,
  eventStage,
  action,
  approvalSnapshot,
  client
}: {
  request: HrLeaveRequest
  actorUserId: string
  actorMemberId: string | null
  actorName: string
  daysByYear: Map<number, number>
  holidaySource: 'nager' | 'empty-fallback' | 'none'
  payrollImpact: HrLeavePayrollImpactSummary | null
  eventStage: 'requested' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled'
  action: string
  approvalSnapshot?: WorkflowApprovalSnapshotRecord | null
  client: PoolClient
}) => {
  const member = await getMemberById(request.memberId, client)

  return {
    requestId: request.requestId,
    memberId: request.memberId,
    memberName: request.memberName,
    memberEmail: normalizeNullableString(member.email),
    supervisorMemberId: request.supervisorMemberId,
    supervisorName: request.supervisorName,
    leaveTypeCode: request.leaveTypeCode,
    leaveTypeName: request.leaveTypeName,
    startDate: request.startDate,
    endDate: request.endDate,
    requestedDays: request.requestedDays,
    status: request.status,
    sourceKind: request.sourceKind ?? 'request',
    approvalStageCode: approvalSnapshot?.stageCode ?? getLeaveApprovalStageCode(request.status),
    approvalSnapshot: approvalSnapshot ?? request.approvalSnapshot ?? null,
    eventStage,
    action,
    actorUserId,
    actorMemberId,
    actorName,
    notes: normalizeNullableString(request.notes),
    reason: normalizeNullableString(request.reason),
    holidaySource,
    impactedYears: [...daysByYear.entries()].map(([year, days]) => ({ year, days })),
    payrollImpact,
    payrollImpactLabel:
      payrollImpact?.mode === 'deferred_adjustment_required'
        ? 'deferred_adjustment_required'
        : payrollImpact?.mode === 'recalculate_recommended'
          ? 'recalculate_recommended'
          : 'none',
    impactedPeriodLabels: payrollImpact?.impactedPeriods.map(period => formatPeriodLabel(period.periodId)) ?? []
  }
}

export const getHrCoreMetadataFromPostgres = async (): Promise<HrCoreMetadata> => {
  const [departments, leaveTypes] = await Promise.all([listDepartmentsInternal(), listLeaveTypesInternal()])

  return {
    departments,
    leaveTypes,
    jobLevels: [...HR_JOB_LEVELS],
    employmentTypes: [...HR_EMPLOYMENT_TYPES],
    healthSystems: [...HR_HEALTH_SYSTEMS],
    bankAccountTypes: [...HR_BANK_ACCOUNT_TYPES],
    leaveRequestStatuses: [...HR_LEAVE_REQUEST_STATUSES],
    attendanceStatuses: [...HR_ATTENDANCE_STATUSES]
  }
}

export const listLeaveBalancesFromPostgres = async ({
  tenant,
  memberId,
  year
}: {
  tenant: TenantContext
  memberId?: string | null
  year?: number | null
}): Promise<HrLeaveBalancesResponse> => {
  await assertHrCoreLeavePostgresReady()

  const effectiveYear = year || new Date().getUTCFullYear()
  const effectiveMemberId = memberId || (isHrAdminTenant(tenant) ? null : (await resolveTenantMember(tenant)).member_id)
  const [leavePolicies, leaveTypes] = await Promise.all([listLeavePoliciesInternal(), listLeaveTypesInternal()])

  if (effectiveMemberId) {
    await assertMemberVisibleToTenant(tenant, effectiveMemberId)

    await withGreenhousePostgresTransaction(async client => {
      await ensureYearBalances({
        memberId: effectiveMemberId,
        year: effectiveYear,
        actorUserId: tenant.userId,
        client
      })
    })
  } else if (!isHrAdminTenant(tenant)) {
    throw new HrCoreValidationError('Forbidden', 403)
  }

  const values: unknown[] = [effectiveYear]
  const filters = ['b.year = $1']

  if (effectiveMemberId) {
    values.push(effectiveMemberId)
    filters.push(`b.member_id = $${values.length}`)
  }

  const rows = await runGreenhousePostgresQuery<PostgresLeaveBalanceRow>(
    `
      SELECT
        b.balance_id,
        b.member_id,
        member.display_name AS member_name,
        member.employment_type,
        member.hire_date,
        member.contract_type,
        COALESCE(
          member.pay_regime,
          (
            SELECT cv.pay_regime
            FROM greenhouse_payroll.compensation_versions AS cv
            WHERE cv.member_id = member.member_id
            ORDER BY cv.effective_from DESC, cv.version DESC
            LIMIT 1
          )
        ) AS pay_regime,
        member.payroll_via,
        b.leave_type_code,
        lt.leave_type_name,
        b.year,
        b.allowance_days,
        b.progressive_extra_days,
        b.carried_over_days,
        b.adjustment_days,
        b.accumulated_periods,
        b.used_days,
        b.reserved_days
      FROM greenhouse_hr.leave_balances AS b
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = b.member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = b.leave_type_code
      WHERE ${filters.join(' AND ')}
      ORDER BY member.display_name ASC NULLS LAST, lt.leave_type_name ASC
    `,
    values
  )

  const balances = rows.map(row => {
    const leaveType =
      leaveTypes.find(item => item.leaveTypeCode === row.leave_type_code) ??
      ({
        leaveTypeCode: row.leave_type_code,
        leaveTypeName: normalizeNullableString(row.leave_type_name) || row.leave_type_code,
        description: null,
        defaultAnnualAllowanceDays: toNullableNumber(row.allowance_days) ?? 0,
        requiresAttachment: false,
        isPaid: true,
        active: true,
        colorToken: null
      } satisfies HrLeaveType)

    const memberPolicyContext = buildMemberPolicyContext({
      employmentType: row.employment_type,
      hireDate: row.hire_date,
      contractType: row.contract_type,
      payRegime: row.pay_regime,
      payrollVia: row.payroll_via
    })

    const resolution = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      member: memberPolicyContext
    })

    return {
      ...mapLeaveBalance(row),
      policyExplain: buildPolicyExplain({
        resolution,
        member: memberPolicyContext
      })
    }
  })

  return {
    balances,
    policies: leavePolicies,
    summary: {
      memberCount: new Set(balances.map(balance => balance.memberId)).size,
      totalAvailableDays: balances.reduce((sum, balance) => sum + balance.availableDays, 0)
    }
  }
}

export const listLeaveRequestsFromPostgres = async ({
  tenant,
  memberId,
  status,
  year
}: {
  tenant: TenantContext
  memberId?: string | null
  status?: string | null
  year?: number | null
}): Promise<HrLeaveRequestsResponse> => {
  await assertHrCoreLeavePostgresReady()

  const currentMember = isHrAdminTenant(tenant) ? null : await resolveTenantMember(tenant)
  const values: unknown[] = []
  const filters = ['1 = 1']

  const visibleRequestIds = currentMember
    ? await listVisibleWorkflowEntityIdsForApprover({
      workflowDomain: 'leave',
      approverMemberId: currentMember.member_id
    })
    : []

  if (isHrAdminTenant(tenant)) {
    if (memberId) {
      values.push(memberId)
      filters.push(`r.member_id = $${values.length}`)
    }
  } else {
    values.push(currentMember?.member_id || '')
    const actorParamIndex = values.length

    if (visibleRequestIds.length > 0) {
      values.push(visibleRequestIds)
      filters.push(
        `(r.member_id = $${actorParamIndex} OR r.supervisor_member_id = $${actorParamIndex} OR r.request_id = ANY($${values.length}::text[]))`
      )
    } else {
      filters.push(`(r.member_id = $${actorParamIndex} OR r.supervisor_member_id = $${actorParamIndex})`)
    }
  }

  if (status) {
    values.push(status)
    filters.push(`r.status = $${values.length}`)
  }

  if (year) {
    values.push(year)
    filters.push(`EXTRACT(YEAR FROM r.start_date) = $${values.length}`)
  }

  const rows = await runGreenhousePostgresQuery<PostgresLeaveRequestRow>(
    `
      SELECT
        r.request_id,
        r.member_id,
        COALESCE(p360.resolved_display_name, member.display_name) AS member_name,
        COALESCE(p360.resolved_email, member.primary_email) AS member_email,
        COALESCE(p360.resolved_avatar_url, member.avatar_url) AS member_avatar_url,
        COALESCE(p360.user_id, linked_user.user_id) AS member_linked_user_id,
        r.leave_type_code,
        lt.leave_type_name,
        r.start_date,
        r.end_date,
        r.start_period,
        r.end_period,
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_asset_id,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at,
        COALESCE(r.source_kind, 'request') AS source_kind
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
      LEFT JOIN greenhouse_serving.person_360 AS p360
        ON p360.member_id = member.member_id
      LEFT JOIN LATERAL (
        SELECT cu.user_id
        FROM greenhouse_core.client_users AS cu
        WHERE cu.member_id = member.member_id
        ORDER BY cu.active DESC, cu.updated_at DESC NULLS LAST, cu.created_at DESC NULLS LAST
        LIMIT 1
      ) AS linked_user ON TRUE
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE ${filters.join(' AND ')}
      ORDER BY r.created_at DESC
    `,
    values
  )

  const requests = await attachApprovalSnapshotsToLeaveRequests(rows.map(mapLeaveRequest))

  return {
    requests,
    summary: {
      total: requests.length,
      pendingSupervisor: requests.filter(item => item.status === 'pending_supervisor').length,
      pendingHr: requests.filter(item => item.status === 'pending_hr').length,
      approved: requests.filter(item => item.status === 'approved').length
    }
  }
}

export const getLeaveRequestByIdFromPostgres = async ({
  tenant,
  requestId
}: {
  tenant: TenantContext
  requestId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const request = await getLeaveRequestByIdInternal(requestId)

  if (!request) {
    throw new HrCoreValidationError('Leave request not found.', 404)
  }

  if (isHrAdminTenant(tenant)) {
    return request
  }

  const currentMember = await resolveTenantMember(tenant)

  if (
    request.memberId !== currentMember.member_id &&
    request.supervisorMemberId !== currentMember.member_id &&
    request.approvalSnapshot?.effectiveApproverMemberId !== currentMember.member_id
  ) {
    throw new HrCoreValidationError('Forbidden', 403)
  }

  return request
}

export const listLeaveCalendarFromPostgres = async ({
  tenant,
  from,
  to,
  memberId
}: {
  tenant: TenantContext
  from: string
  to: string
  memberId?: string | null
}): Promise<HrLeaveCalendarResponse> => {
  await assertHrCoreLeavePostgresReady()

  const normalizedFrom = assertDateString(from, 'from')
  const normalizedTo = assertDateString(to, 'to')

  if (normalizedTo < normalizedFrom) {
    throw new HrCoreValidationError('to must be greater than or equal to from.')
  }

  const currentMember = isHrAdminTenant(tenant) ? null : await resolveTenantMember(tenant)
  const effectiveMemberId = memberId || (isHrAdminTenant(tenant) ? null : currentMember?.member_id ?? null)

  const visibleRequestIds = currentMember
    ? await listVisibleWorkflowEntityIdsForApprover({
      workflowDomain: 'leave',
      approverMemberId: currentMember.member_id
    })
    : []

  if (effectiveMemberId) {
    await assertMemberVisibleToTenant(tenant, effectiveMemberId)
  }

  const values: unknown[] = [normalizedTo, normalizedFrom, effectiveMemberId]

  const filters = [
    'r.start_date <= $1::date',
    'r.end_date >= $2::date',
    '($3::text IS NULL OR r.member_id = $3)'
  ]

  if (!isHrAdminTenant(tenant)) {
    values.push(currentMember?.member_id ?? '')
    const actorParamIndex = values.length

    if (visibleRequestIds.length > 0) {
      values.push(visibleRequestIds)
      filters.push(
        `(r.member_id = $${actorParamIndex} OR r.supervisor_member_id = $${actorParamIndex} OR r.request_id = ANY($${values.length}::text[]))`
      )
    } else {
      filters.push(`(r.member_id = $${actorParamIndex} OR r.supervisor_member_id = $${actorParamIndex})`)
    }
  }

  const rows = await runGreenhousePostgresQuery<PostgresLeaveRequestRow>(
    `
      SELECT
        r.request_id,
        r.member_id,
        member.display_name AS member_name,
        member.primary_email AS member_email,
        r.leave_type_code,
        lt.leave_type_name,
        r.start_date,
        r.end_date,
        r.start_period,
        r.end_period,
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_asset_id,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at,
        COALESCE(r.source_kind, 'request') AS source_kind
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE ${filters.join(' AND ')}
      ORDER BY r.start_date ASC, member.display_name ASC NULLS LAST
    `,
    values
  )

  const leaveEvents: HrLeaveCalendarEvent[] = rows.map(row => {
    const request = mapLeaveRequest(row)

    return {
      id: request.requestId,
      title: getLeaveTitle({
        leaveTypeName: request.leaveTypeName,
        memberName: request.memberName,
        startPeriod: request.startPeriod,
        endPeriod: request.endPeriod,
        isSingleDay: request.startDate === request.endDate
      }),
      start: request.startDate,
      end: getLeaveEventEndDate(request.endDate),
      allDay: true,
      color: getLeaveColorByStatus(request.status),
      extendedProps: {
        source: 'leave_request',
        status: request.status,
        memberId: request.memberId,
        memberName: request.memberName,
        leaveTypeCode: request.leaveTypeCode,
        leaveTypeName: request.leaveTypeName,
        requestedDays: request.requestedDays,
        startPeriod: request.startPeriod,
        endPeriod: request.endPeriod
      }
    }
  })

  const { holidayDates, source } = await loadHolidayDateSetForRange({
    startDate: normalizedFrom,
    endDate: normalizedTo,
    countryCode: 'CL'
  })

  const holidayEvents: HrLeaveCalendarEvent[] = [...holidayDates]
    .filter(dateKey => dateKey >= normalizedFrom && dateKey <= normalizedTo)
    .sort()
    .map(dateKey => ({
      id: `holiday-${dateKey}`,
      title: 'Feriado',
      start: dateKey,
      allDay: true,
      color: '#64748b',
      extendedProps: {
        source: 'holiday'
      }
    }))

  return {
    from: normalizedFrom,
    to: normalizedTo,
    holidaySource: source,
    events: [...holidayEvents, ...leaveEvents]
  }
}

export const createLeaveRequestInPostgres = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: CreateLeaveRequestInput
  actorUserId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const currentMember = await resolveTenantMember(tenant)
  const effectiveMemberId = isHrAdminTenant(tenant) ? normalizeString(input.memberId || currentMember.member_id) : String(currentMember.member_id || '')
  const leaveTypeCode = normalizeString(input.leaveTypeCode)
  const startDate = assertDateString(input.startDate, 'startDate')
  const endDate = assertDateString(input.endDate, 'endDate')

  if (endDate < startDate) {
    throw new HrCoreValidationError('endDate must be greater than or equal to startDate.')
  }

  const VALID_PERIODS = ['full_day', 'morning', 'afternoon'] as const

  const startPeriod: LeaveDayPeriod = VALID_PERIODS.includes(input.startPeriod as typeof VALID_PERIODS[number])
    ? (input.startPeriod as LeaveDayPeriod)
    : 'full_day'

  const endPeriod: LeaveDayPeriod = VALID_PERIODS.includes(input.endPeriod as typeof VALID_PERIODS[number])
    ? (input.endPeriod as LeaveDayPeriod)
    : 'full_day'

  if (startDate === endDate && startPeriod !== endPeriod) {
    throw new HrCoreValidationError('For single-day requests, startPeriod and endPeriod must match.', 409)
  }

  if (startDate === endDate && startPeriod === 'afternoon' && endPeriod === 'morning') {
    throw new HrCoreValidationError('Invalid period combination: afternoon start with morning end on the same day.', 409)
  }

  return withGreenhousePostgresTransaction(async client => {
    const member = await getMemberById(effectiveMemberId, client)

    const [leaveTypes, leavePolicies] = await Promise.all([
      listLeaveTypesInternal(client),
      listLeavePoliciesInternal(client)
    ])

    const leaveType = leaveTypes.find(item => item.leaveTypeCode === leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const resolution = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      member: buildMemberPolicyContext({
        employmentType: member.employment_type,
        hireDate: member.hire_date,
        contractType: member.contract_type,
        payRegime: member.pay_regime,
        payrollVia: member.payroll_via
      })
    })

    const policy = resolution.policy

    const dayBreakdown = await computeLeaveDayBreakdown({
      startDate,
      endDate,
      countryCode: 'CL',
      startPeriod,
      endPeriod
    })

    const requestedDays = dayBreakdown.totalDays
    const tracksBalance = doesLeaveTrackBalance(policy)

    if (requestedDays <= 0) {
      throw new HrCoreValidationError('The selected dates do not contain payable working days.', 409, {
        holidaySource: dayBreakdown.holidaySource
      })
    }

    const attachmentAssetId = normalizeNullableString(input.attachmentAssetId)
    const attachmentUrlFallback = normalizeNullableString(input.attachmentUrl)

    if (leaveType.requiresAttachment && !attachmentAssetId && !attachmentUrlFallback) {
      throw new HrCoreValidationError('This leave type requires an attachment.', 409)
    }

    const advanceDays = getCalendarDayDiff(getTodayDateKey(), startDate)

    if (policy.minAdvanceDays > 0 && advanceDays < policy.minAdvanceDays) {
      throw new HrCoreValidationError(
        `This leave type requires at least ${policy.minAdvanceDays} advance days.`,
        409,
        { minAdvanceDays: policy.minAdvanceDays, advanceDays }
      )
    }

    if (policy.minContinuousDays != null && requestedDays < policy.minContinuousDays) {
      throw new HrCoreValidationError(
        `This leave type requires at least ${policy.minContinuousDays} working days.`,
        409,
        { minContinuousDays: policy.minContinuousDays, requestedDays }
      )
    }

    if (policy.maxConsecutiveDays != null && requestedDays > policy.maxConsecutiveDays) {
      throw new HrCoreValidationError(
        `This leave type allows up to ${policy.maxConsecutiveDays} working days.`,
        409,
        { maxConsecutiveDays: policy.maxConsecutiveDays, requestedDays }
      )
    }

    await assertNoLeaveOverlap({
      memberId: effectiveMemberId,
      startDate,
      endDate,
      client
    })

    for (const year of dayBreakdown.daysByYear.keys()) {
      await ensureYearBalances({
        memberId: effectiveMemberId,
        year,
        actorUserId,
        client
      })
    }

    if (tracksBalance && !policy.allowNegativeBalance) {
      for (const [year, yearDays] of dayBreakdown.daysByYear.entries()) {
        const balance = await getBalanceByKey({
          memberId: effectiveMemberId,
          leaveTypeCode,
          year,
          client
        })

        if (!balance || balance.availableDays < yearDays) {
          throw new HrCoreValidationError('Insufficient leave balance.', 409, {
            year,
            requestedDays: yearDays,
            availableDays: balance?.availableDays ?? 0
          })
        }
      }
    }

    const requestId = `leave-${randomUUID()}`

    const initialApprovalAuthority = await resolveInitialApprovalAuthority({
      workflowDomain: 'leave',
      subjectMemberId: effectiveMemberId
    })

    const supervisorMemberId = initialApprovalAuthority.formalApproverMemberId

    const status: HrLeaveRequest['status'] =
      initialApprovalAuthority.stageCode === 'supervisor_review'
        ? 'pending_supervisor'
        : 'pending_hr'

    const reason = normalizeNullableString(input.reason)
    const attachmentUrl = attachmentAssetId ? buildPrivateAssetDownloadUrl(attachmentAssetId) : attachmentUrlFallback
    const notes = normalizeNullableString(input.notes)

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_requests (
          request_id,
          member_id,
          leave_type_code,
          start_date,
          end_date,
          start_period,
          end_period,
          requested_days,
          status,
          reason,
          attachment_asset_id,
          attachment_url,
          supervisor_member_id,
          notes,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        requestId,
        effectiveMemberId,
        leaveTypeCode,
        startDate,
        endDate,
        startPeriod,
        endPeriod,
        requestedDays,
        status,
        reason,
        attachmentAssetId,
        attachmentUrl,
        supervisorMemberId,
        notes,
        actorUserId
      ]
    )

    if (attachmentAssetId) {
      try {
        await attachAssetToAggregate({
          assetId: attachmentAssetId,
          ownerAggregateType: 'leave_request',
          ownerAggregateId: requestId,
          actorUserId,
          ownerClientId: tenant.clientId,
          ownerSpaceId: tenant.spaceId ?? null,
          ownerMemberId: effectiveMemberId,
          metadata: {
            leaveTypeCode,
            startDate,
            endDate
          },
          client
        })
      } catch (error) {
        throw new HrCoreValidationError(
          error instanceof Error && error.message === 'asset_not_found'
            ? 'Attachment asset not found.'
            : 'Unable to attach the supporting document.',
          409
        )
      }
    }

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_request_actions (
          action_id,
          request_id,
          action,
          actor_user_id,
          actor_member_id,
          actor_name,
          notes
        )
        VALUES ($1, $2, 'submit', $3, $4, $5, $6)
      `,
      [`leave-action-${randomUUID()}`, requestId, actorUserId, currentMember.member_id, currentMember.display_name, notes]
    )

    const approvalSnapshot = await upsertWorkflowApprovalSnapshotInTransaction({
      workflowDomain: 'leave',
      workflowEntityId: requestId,
      subjectMemberId: effectiveMemberId,
      resolution: initialApprovalAuthority,
      createdByUserId: actorUserId,
      client
    })

    const created: HrLeaveRequest = {
      requestId,
      memberId: effectiveMemberId,
      memberName: normalizeNullableString(member.display_name),
      memberAvatarUrl: resolveAvatarUrl(normalizeNullableString(member.avatar_url), normalizeNullableString(member.linked_user_id)),
      leaveTypeCode,
      leaveTypeName: leaveType.leaveTypeName,
      startDate,
      endDate,
      startPeriod,
      endPeriod,
      requestedDays,
      status,
      reason,
      attachmentAssetId,
      attachmentUrl,
      supervisorMemberId,
      supervisorName: approvalSnapshot.formalApproverName,
      approvalStageCode: approvalSnapshot.stageCode,
      approvalSnapshot,
      hrReviewerUserId: null,
      decidedAt: null,
      decidedBy: null,
      notes,
      createdAt: null,
      holidaySource: dayBreakdown.holidaySource,
      payrollImpact: null
    }

    if (tracksBalance) {
      await adjustBalanceForRequest({
        request: created,
        daysByYear: dayBreakdown.daysByYear,
        reservedDelta: 1,
        usedDelta: 0,
        actorUserId,
        client
      })
    }

    const createdPayload = await buildLeaveEventPayload({
      request: created,
      actorUserId,
      actorMemberId: currentMember.member_id,
      actorName: currentMember.display_name,
      daysByYear: dayBreakdown.daysByYear,
      holidaySource: dayBreakdown.holidaySource,
      payrollImpact: null,
      eventStage: status === 'pending_hr' ? 'pending_hr' : 'requested',
      action: 'submit',
      approvalSnapshot,
      client
    })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.leaveRequest,
      aggregateId: requestId,
      eventType: EVENT_TYPES.leaveRequestCreated,
      payload: createdPayload
    }, client)

    if (status === 'pending_hr') {
      await publishOutboxEvent({
        aggregateType: AGGREGATE_TYPES.leaveRequest,
        aggregateId: requestId,
        eventType: EVENT_TYPES.leaveRequestEscalatedToHr,
        payload: createdPayload
      }, client)
    }

    const reloaded = await getLeaveRequestByIdInternal(requestId, client)

    if (!reloaded) {
      throw new HrCoreValidationError('Created leave request could not be reloaded.', 500)
    }

    return reloaded
  })
}

export const reviewLeaveRequestInPostgres = async ({
  tenant,
  requestId,
  input,
  actorUserId
}: {
  tenant: TenantContext
  requestId: string
  input: ReviewLeaveRequestInput
  actorUserId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const action = assertEnum(input.action, ['approve', 'reject', 'cancel'] as const, 'action')
  const notes = normalizeNullableString(input.notes)

  return withGreenhousePostgresTransaction(async client => {
    const request = await getLeaveRequestByIdInternal(requestId, client)

    if (!request) {
      throw new HrCoreValidationError('Leave request not found.', 404)
    }

    const actorMember = await resolveTenantMember(tenant, client).catch(() => null)
    const actorMemberId = actorMember?.member_id || null
    const actorName = actorMember?.display_name || tenant.userId
    const hasHrAdminAccess = isHrAdminTenant(tenant)
    const member = await getMemberById(request.memberId, client)

    const [leaveTypes, leavePolicies] = await Promise.all([
      listLeaveTypesInternal(client),
      listLeavePoliciesInternal(client)
    ])

    const leaveType = leaveTypes.find(item => item.leaveTypeCode === request.leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const resolution = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      member: buildMemberPolicyContext({
        employmentType: member.employment_type,
        hireDate: member.hire_date,
        contractType: member.contract_type,
        payRegime: member.pay_regime,
        payrollVia: member.payroll_via
      })
    })

    const policy = resolution.policy

    const dayBreakdown = await computeLeaveDayBreakdown({
      startDate: request.startDate,
      endDate: request.endDate,
      countryCode: 'CL',
      startPeriod: request.startPeriod,
      endPeriod: request.endPeriod
    })

    const tracksBalance = doesLeaveTrackBalance(policy)
    let nextStatus: HrLeaveRequest['status'] = request.status
    let payrollImpact: HrLeavePayrollImpactSummary | null = null
    let eventType: string = EVENT_TYPES.leaveRequestRejected
    let eventStage: 'requested' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled' = 'rejected'
    let approvalSnapshot = await getCurrentLeaveApprovalSnapshot(request, client)
    const currentApprovalStageCode = getLeaveApprovalStageCode(request.status)

    const requestForReview: HrLeaveRequest = {
      ...request,
      approvalStageCode: currentApprovalStageCode,
      approvalSnapshot
    }

    if (!['pending_supervisor', 'pending_hr'].includes(request.status)) {
      throw new HrCoreValidationError(
        action === 'cancel'
          ? 'Only pending requests can be cancelled.'
          : 'This request is no longer pending HR review.',
        409
      )
    }

    if (!canPerformLeaveReviewAction({
      request: requestForReview,
      actor: {
        currentMemberId: actorMemberId,
        hasHrAdminAccess
      },
      action
    })) {
      throw new HrCoreValidationError('Forbidden', 403)
    }

    if (action === 'cancel') {
      await client.query(
        `
          UPDATE greenhouse_hr.leave_requests
          SET
            status = 'cancelled',
            decided_at = CURRENT_TIMESTAMP,
            decided_by = $2,
            notes = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE request_id = $1
        `,
        [requestId, actorName, notes]
      )

      nextStatus = 'cancelled'
      eventType = EVENT_TYPES.leaveRequestCancelled
      eventStage = 'cancelled'

      if (tracksBalance) {
        await adjustBalanceForRequest({
          request,
          daysByYear: dayBreakdown.daysByYear,
          reservedDelta: -1,
          usedDelta: 0,
          actorUserId,
          client
        })
      }
    } else if (!hasHrAdminAccess) {
      await client.query(
        `
          UPDATE greenhouse_hr.leave_requests
          SET
            status = $2,
            decided_at = CASE WHEN $2 = 'rejected' THEN CURRENT_TIMESTAMP ELSE decided_at END,
            decided_by = CASE WHEN $2 = 'rejected' THEN $3 ELSE decided_by END,
            notes = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE request_id = $1
        `,
        [requestId, action === 'approve' ? 'pending_hr' : 'rejected', actorName, notes]
      )

      nextStatus = action === 'approve' ? 'pending_hr' : 'rejected'
      eventType = action === 'approve' ? EVENT_TYPES.leaveRequestEscalatedToHr : EVENT_TYPES.leaveRequestRejected
      eventStage = action === 'approve' ? 'pending_hr' : 'rejected'

      if (action === 'approve') {
        const nextApprovalAuthority = await getNextApprovalAuthority({
          workflowDomain: 'leave',
          subjectMemberId: request.memberId,
          stageCode: 'supervisor_review'
        })

        if (nextApprovalAuthority) {
          approvalSnapshot = await upsertWorkflowApprovalSnapshotInTransaction({
            workflowDomain: 'leave',
            workflowEntityId: requestId,
            subjectMemberId: request.memberId,
            resolution: nextApprovalAuthority,
            createdByUserId: actorUserId,
            client
          })
        } else {
          approvalSnapshot = null
        }
      }

      if (action === 'reject' && tracksBalance) {
        await adjustBalanceForRequest({
          request,
          daysByYear: dayBreakdown.daysByYear,
          reservedDelta: -1,
          usedDelta: 0,
          actorUserId,
          client
        })
      }
    } else {
      if (request.status === 'pending_supervisor' && currentApprovalStageCode === 'supervisor_review') {
        approvalSnapshot = await applyWorkflowApprovalOverrideInTransaction({
          workflowDomain: 'leave',
          workflowEntityId: requestId,
          stageCode: 'supervisor_review',
          overrideActorUserId: actorUserId,
          overrideReason: notes ?? 'hr_override',
          client
        })
      } else if (currentApprovalStageCode === 'hr_review') {
        approvalSnapshot = await getWorkflowApprovalSnapshotForStage({
          workflowDomain: 'leave',
          workflowEntityId: requestId,
          stageCode: 'hr_review',
          client
        })
      }

      await client.query(
        `
          UPDATE greenhouse_hr.leave_requests
          SET
            status = $2,
            hr_reviewer_user_id = $3,
            decided_at = CURRENT_TIMESTAMP,
            decided_by = $4,
            notes = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE request_id = $1
        `,
        [requestId, action === 'approve' ? 'approved' : 'rejected', tenant.userId, actorName, notes]
      )

      nextStatus = action === 'approve' ? 'approved' : 'rejected'
      eventType = action === 'approve' ? EVENT_TYPES.leaveRequestApproved : EVENT_TYPES.leaveRequestRejected
      eventStage = action === 'approve' ? 'approved' : 'rejected'

      if (tracksBalance) {
        await adjustBalanceForRequest({
          request,
          daysByYear: dayBreakdown.daysByYear,
          reservedDelta: -1,
          usedDelta: action === 'approve' ? 1 : 0,
          actorUserId,
          client
        })
      }

      if (action === 'approve') {
        payrollImpact = await getPayrollImpactForLeave({
          startDate: request.startDate,
          endDate: request.endDate,
          client
        })
      }
    }

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_request_actions (
          action_id,
          request_id,
          action,
          actor_user_id,
          actor_member_id,
          actor_name,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [`leave-action-${randomUUID()}`, requestId, action, actorUserId, actorMemberId, actorName, notes]
    )

    const updated = await getLeaveRequestByIdInternal(requestId, client)

    if (!updated) {
      throw new HrCoreValidationError('Updated leave request could not be reloaded.', 500)
    }

    updated.holidaySource = dayBreakdown.holidaySource
    updated.payrollImpact = payrollImpact
    updated.approvalStageCode = getLeaveApprovalStageCode(updated.status)
    updated.approvalSnapshot = approvalSnapshot

    const eventPayload = await buildLeaveEventPayload({
      request: updated,
      actorUserId,
      actorMemberId,
      actorName,
      daysByYear: dayBreakdown.daysByYear,
      holidaySource: dayBreakdown.holidaySource,
      payrollImpact,
      eventStage,
      action,
      approvalSnapshot,
      client
    })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.leaveRequest,
      aggregateId: requestId,
      eventType,
      payload: eventPayload
    }, client)

    if (nextStatus === 'approved' && payrollImpact) {
      for (const period of payrollImpact.impactedPeriods) {
        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.payrollPeriod,
          aggregateId: period.periodId,
          eventType: EVENT_TYPES.leaveRequestPayrollImpactDetected,
          payload: {
            ...eventPayload,
            payrollImpactMode: payrollImpact.mode,
            periodId: period.periodId,
            periodYear: period.year,
            periodMonth: period.month,
            periodStatus: period.status
          }
        }, client)
      }
    }

    return updated
  })
}

const getLeaveBalanceAdjustmentById = async ({
  adjustmentId,
  client
}: {
  adjustmentId: string
  client?: PoolClient
}) => {
  const [row] = await queryRows<PostgresLeaveBalanceAdjustmentRow>(
    `
      SELECT
        a.adjustment_id,
        a.member_id,
        member.display_name AS member_name,
        a.leave_type_code,
        lt.leave_type_name,
        a.year,
        a.days_delta,
        a.effective_date,
        a.source_kind,
        a.reason,
        a.notes,
        a.created_by_user_id,
        a.created_at,
        a.reversed_at,
        a.reversed_by_user_id,
        a.reversal_of_adjustment_id
      FROM greenhouse_hr.leave_balance_adjustments AS a
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = a.member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = a.leave_type_code
      WHERE a.adjustment_id = $1
      LIMIT 1
    `,
    [adjustmentId],
    client
  )

  return row ? mapLeaveBalanceAdjustment(row) : null
}

export const listLeaveBalanceAdjustmentsFromPostgres = async ({
  tenant,
  memberId,
  year
}: {
  tenant: TenantContext
  memberId?: string | null
  year?: number | null
}): Promise<HrLeaveBalanceAdjustmentsResponse> => {
  await assertHrCoreLeavePostgresReady()

  const values: unknown[] = []
  const filters = ['1 = 1']

  if (memberId) {
    await assertMemberVisibleToTenant(tenant, memberId)
    values.push(memberId)
    filters.push(`a.member_id = $${values.length}`)
  }

  if (year != null) {
    values.push(year)
    filters.push(`a.year = $${values.length}`)
  }

  const rows = await runGreenhousePostgresQuery<PostgresLeaveBalanceAdjustmentRow>(
    `
      SELECT
        a.adjustment_id,
        a.member_id,
        member.display_name AS member_name,
        a.leave_type_code,
        lt.leave_type_name,
        a.year,
        a.days_delta,
        a.effective_date,
        a.source_kind,
        a.reason,
        a.notes,
        a.created_by_user_id,
        a.created_at,
        a.reversed_at,
        a.reversed_by_user_id,
        a.reversal_of_adjustment_id
      FROM greenhouse_hr.leave_balance_adjustments AS a
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = a.member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = a.leave_type_code
      WHERE ${filters.join(' AND ')}
      ORDER BY a.created_at DESC, a.adjustment_id DESC
    `,
    values
  )

  const adjustments = rows.map(mapLeaveBalanceAdjustment)

  return {
    adjustments,
    summary: {
      total: adjustments.length,
      totalDaysDelta: adjustments.reduce((sum, adjustment) => sum + adjustment.daysDelta, 0)
    }
  }
}

export const createLeaveBackfillInPostgres = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: HrLeaveBackfillInput
  actorUserId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const effectiveMemberId = normalizeString(input.memberId)
  const leaveTypeCode = normalizeString(input.leaveTypeCode)
  const startDate = assertDateString(input.startDate, 'startDate')
  const endDate = assertDateString(input.endDate, 'endDate')

  if (endDate < startDate) {
    throw new HrCoreValidationError('endDate must be greater than or equal to startDate.')
  }

  const VALID_PERIODS = ['full_day', 'morning', 'afternoon'] as const

  const startPeriod: LeaveDayPeriod = VALID_PERIODS.includes(input.startPeriod as typeof VALID_PERIODS[number])
    ? (input.startPeriod as LeaveDayPeriod)
    : 'full_day'

  const endPeriod: LeaveDayPeriod = VALID_PERIODS.includes(input.endPeriod as typeof VALID_PERIODS[number])
    ? (input.endPeriod as LeaveDayPeriod)
    : 'full_day'

  if (startDate === endDate && startPeriod !== endPeriod) {
    throw new HrCoreValidationError('For single-day requests, startPeriod and endPeriod must match.', 409)
  }

  if (startDate === endDate && startPeriod === 'afternoon' && endPeriod === 'morning') {
    throw new HrCoreValidationError('Invalid period combination: afternoon start with morning end on the same day.', 409)
  }

  return withGreenhousePostgresTransaction(async client => {
    await assertMemberVisibleToTenant(tenant, effectiveMemberId, client)

    const [actorMember, member, leaveTypes, leavePolicies] = await Promise.all([
      resolveTenantMember(tenant, client).catch(() => null),
      getMemberById(effectiveMemberId, client),
      listLeaveTypesInternal(client),
      listLeavePoliciesInternal(client)
    ])

    const leaveType = leaveTypes.find(item => item.leaveTypeCode === leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const resolution = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      member: buildMemberPolicyContext({
        employmentType: member.employment_type,
        hireDate: member.hire_date,
        contractType: member.contract_type,
        payRegime: member.pay_regime,
        payrollVia: member.payroll_via
      })
    })

    const policy = resolution.policy

    const tracksBalance = doesLeaveTrackBalance(policy)

    const dayBreakdown = await computeLeaveDayBreakdown({
      startDate,
      endDate,
      countryCode: 'CL',
      startPeriod,
      endPeriod
    })

    const requestedDays = dayBreakdown.totalDays

    if (requestedDays <= 0) {
      throw new HrCoreValidationError('The selected dates do not contain payable working days.', 409, {
        holidaySource: dayBreakdown.holidaySource
      })
    }

    const attachmentAssetId = normalizeNullableString(input.attachmentAssetId)
    const attachmentUrlFallback = normalizeNullableString(input.attachmentUrl)

    if (leaveType.requiresAttachment && !attachmentAssetId && !attachmentUrlFallback) {
      throw new HrCoreValidationError('This leave type requires an attachment.', 409)
    }

    await assertNoLeaveOverlap({
      memberId: effectiveMemberId,
      startDate,
      endDate,
      client
    })

    for (const year of dayBreakdown.daysByYear.keys()) {
      await ensureYearBalances({
        memberId: effectiveMemberId,
        year,
        actorUserId,
        client
      })
    }

    if (tracksBalance && !policy.allowNegativeBalance) {
      for (const [requestYear, yearDays] of dayBreakdown.daysByYear.entries()) {
        const balance = await getBalanceByKey({
          memberId: effectiveMemberId,
          leaveTypeCode,
          year: requestYear,
          client
        })

        if (!balance || balance.availableDays < yearDays) {
          throw new HrCoreValidationError('Insufficient leave balance.', 409, {
            year: requestYear,
            requestedDays: yearDays,
            availableDays: balance?.availableDays ?? 0
          })
        }
      }
    }

    const reason = normalizeString(input.reason)
    const notes = normalizeNullableString(input.notes)
    const attachmentUrl = attachmentAssetId ? buildPrivateAssetDownloadUrl(attachmentAssetId) : attachmentUrlFallback
    const requestId = `leave-${randomUUID()}`
    const actorName = actorMember?.display_name ?? tenant.userId
    const actorMemberId = actorMember?.member_id ?? null

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_requests (
          request_id,
          member_id,
          leave_type_code,
          start_date,
          end_date,
          start_period,
          end_period,
          requested_days,
          status,
          reason,
          attachment_asset_id,
          attachment_url,
          supervisor_member_id,
          hr_reviewer_user_id,
          decided_at,
          decided_by,
          notes,
          created_by_user_id,
          source_kind
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::date,
          $5::date,
          $6,
          $7,
          $8,
          'approved',
          $9,
          $10,
          $11,
          $12,
          $13,
          CURRENT_TIMESTAMP,
          $14,
          $15,
          $16,
          'admin_backfill'
        )
      `,
      [
        requestId,
        effectiveMemberId,
        leaveTypeCode,
        startDate,
        endDate,
        startPeriod,
        endPeriod,
        requestedDays,
        reason,
        attachmentAssetId,
        attachmentUrl,
        normalizeNullableString(member.reports_to),
        tenant.userId,
        actorName,
        notes,
        actorUserId
      ]
    )

    if (attachmentAssetId) {
      try {
        await attachAssetToAggregate({
          assetId: attachmentAssetId,
          ownerAggregateType: 'leave_request',
          ownerAggregateId: requestId,
          actorUserId,
          ownerClientId: tenant.clientId,
          ownerSpaceId: tenant.spaceId ?? null,
          ownerMemberId: effectiveMemberId,
          metadata: {
            leaveTypeCode,
            startDate,
            endDate,
            sourceKind: 'admin_backfill'
          },
          client
        })
      } catch (error) {
        throw new HrCoreValidationError(
          error instanceof Error && error.message === 'asset_not_found'
            ? 'Attachment asset not found.'
            : 'Unable to attach the supporting document.',
          409
        )
      }
    }

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_request_actions (
          action_id,
          request_id,
          action,
          actor_user_id,
          actor_member_id,
          actor_name,
          notes
        )
        VALUES
          ($1, $2, 'submit', $3, $4, $5, $6),
          ($7, $2, 'approve', $3, $4, $5, $6)
      `,
      [
        `leave-action-${randomUUID()}`,
        requestId,
        actorUserId,
        actorMemberId,
        actorName,
        notes,
        `leave-action-${randomUUID()}`
      ]
    )

    const created: HrLeaveRequest = {
      requestId,
      memberId: effectiveMemberId,
      memberName: normalizeNullableString(member.display_name),
      memberAvatarUrl: resolveAvatarUrl(normalizeNullableString(member.avatar_url), normalizeNullableString(member.linked_user_id)),
      leaveTypeCode,
      leaveTypeName: leaveType.leaveTypeName,
      startDate,
      endDate,
      startPeriod,
      endPeriod,
      requestedDays,
      status: 'approved',
      reason,
      attachmentAssetId,
      attachmentUrl,
      supervisorMemberId: normalizeNullableString(member.reports_to),
      supervisorName: null,
      approvalStageCode: null,
      approvalSnapshot: null,
      hrReviewerUserId: tenant.userId,
      decidedAt: new Date().toISOString(),
      decidedBy: actorName,
      notes,
      createdAt: null,
      sourceKind: 'admin_backfill',
      holidaySource: dayBreakdown.holidaySource
    }

    if (tracksBalance) {
      await adjustBalanceForRequest({
        request: created,
        daysByYear: dayBreakdown.daysByYear,
        reservedDelta: 0,
        usedDelta: 1,
        actorUserId,
        client
      })
    }

    const payrollImpact = await getPayrollImpactForLeave({
      startDate,
      endDate,
      client
    })

    created.payrollImpact = payrollImpact

    const eventPayload = await buildLeaveEventPayload({
      request: created,
      actorUserId,
      actorMemberId,
      actorName,
      daysByYear: dayBreakdown.daysByYear,
      holidaySource: dayBreakdown.holidaySource,
      payrollImpact,
      eventStage: 'approved',
      action: 'admin_backfill',
      approvalSnapshot: null,
      client
    })

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.leaveRequest,
      aggregateId: requestId,
      eventType: EVENT_TYPES.leaveRequestCreated,
      payload: eventPayload
    }, client)

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.leaveRequest,
      aggregateId: requestId,
      eventType: EVENT_TYPES.leaveRequestApproved,
      payload: eventPayload
    }, client)

    if (payrollImpact.mode !== 'none') {
      for (const period of payrollImpact.impactedPeriods) {
        await publishOutboxEvent({
          aggregateType: AGGREGATE_TYPES.payrollPeriod,
          aggregateId: period.periodId,
          eventType: EVENT_TYPES.leaveRequestPayrollImpactDetected,
          payload: {
            ...eventPayload,
            payrollImpactMode: payrollImpact.mode,
            periodId: period.periodId,
            periodYear: period.year,
            periodMonth: period.month,
            periodStatus: period.status
          }
        }, client)
      }
    }

    const reloaded = await getLeaveRequestByIdInternal(requestId, client)

    if (!reloaded) {
      throw new HrCoreValidationError('Created leave request could not be reloaded.', 500)
    }

    return reloaded
  })
}

export const createLeaveBalanceAdjustmentInPostgres = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: HrLeaveBalanceAdjustmentInput
  actorUserId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const memberId = normalizeString(input.memberId)
  const leaveTypeCode = normalizeString(input.leaveTypeCode)
  const effectiveDate = assertDateString(input.effectiveDate, 'effectiveDate')
  const year = Math.trunc(Number(input.year))
  const daysDelta = Number(input.daysDelta)
  const reason = normalizeString(input.reason)
  const notes = normalizeNullableString(input.notes)

  if (!Number.isFinite(year) || year <= 0) {
    throw new HrCoreValidationError('year must be a positive integer.')
  }

  if (!Number.isFinite(daysDelta) || daysDelta === 0) {
    throw new HrCoreValidationError('daysDelta must be different from zero.')
  }

  return withGreenhousePostgresTransaction(async client => {
    await assertMemberVisibleToTenant(tenant, memberId, client)
    await getMemberById(memberId, client)

    const leaveTypes = await listLeaveTypesInternal(client)
    const leaveType = leaveTypes.find(item => item.leaveTypeCode === leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    await ensureYearBalances({
      memberId,
      year,
      actorUserId,
      client
    })

    const adjustmentId = `leave-adjustment-${randomUUID()}`

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_balance_adjustments (
          adjustment_id,
          member_id,
          leave_type_code,
          year,
          days_delta,
          reason,
          effective_date,
          source_kind,
          notes,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, 'manual_adjustment', $8, $9)
      `,
      [adjustmentId, memberId, leaveTypeCode, year, daysDelta, reason, effectiveDate, notes, actorUserId]
    )

    await adjustBalanceByDelta({
      memberId,
      leaveTypeCode,
      year,
      adjustmentDelta: daysDelta,
      actorUserId,
      client
    })

    const created = await getLeaveBalanceAdjustmentById({
      adjustmentId,
      client
    })

    if (!created) {
      throw new HrCoreValidationError('Created leave adjustment could not be reloaded.', 500)
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.member,
      aggregateId: memberId,
      eventType: EVENT_TYPES.leaveBalanceAdjusted,
      payload: {
        adjustmentId,
        memberId,
        leaveTypeCode,
        year,
        daysDelta,
        effectiveDate,
        sourceKind: 'manual_adjustment',
        reason,
        notes,
        actorUserId
      }
    }, client)

    return created
  })
}

export const reverseLeaveBalanceAdjustmentInPostgres = async ({
  tenant,
  adjustmentId,
  input,
  actorUserId
}: {
  tenant: TenantContext
  adjustmentId: string
  input: HrLeaveBalanceAdjustmentReverseInput
  actorUserId: string
}) => {
  await assertHrCoreLeavePostgresReady()

  const reason = normalizeString(input.reason)
  const notes = normalizeNullableString(input.notes)

  return withGreenhousePostgresTransaction(async client => {
    const original = await getLeaveBalanceAdjustmentById({ adjustmentId, client })

    if (!original) {
      throw new HrCoreValidationError('Leave adjustment not found.', 404)
    }

    await assertMemberVisibleToTenant(tenant, original.memberId, client)

    if (original.reversedAt || original.reversalOfAdjustmentId) {
      throw new HrCoreValidationError('This leave adjustment has already been reversed.', 409)
    }

    await ensureYearBalances({
      memberId: original.memberId,
      year: original.year,
      actorUserId,
      client
    })

    const reversalId = `leave-adjustment-${randomUUID()}`
    const reversalDaysDelta = original.daysDelta * -1

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_balance_adjustments (
          adjustment_id,
          member_id,
          leave_type_code,
          year,
          days_delta,
          reason,
          effective_date,
          source_kind,
          notes,
          created_by_user_id,
          reversal_of_adjustment_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::date, 'manual_adjustment_reversal', $8, $9, $10)
      `,
      [
        reversalId,
        original.memberId,
        original.leaveTypeCode,
        original.year,
        reversalDaysDelta,
        reason,
        original.effectiveDate,
        notes,
        actorUserId,
        original.adjustmentId
      ]
    )

    await client.query(
      `
        UPDATE greenhouse_hr.leave_balance_adjustments
        SET
          reversed_at = CURRENT_TIMESTAMP,
          reversed_by_user_id = $2
        WHERE adjustment_id = $1
      `,
      [original.adjustmentId, actorUserId]
    )

    await adjustBalanceByDelta({
      memberId: original.memberId,
      leaveTypeCode: original.leaveTypeCode,
      year: original.year,
      adjustmentDelta: reversalDaysDelta,
      actorUserId,
      client
    })

    const reversal = await getLeaveBalanceAdjustmentById({
      adjustmentId: reversalId,
      client
    })

    if (!reversal) {
      throw new HrCoreValidationError('Reversed leave adjustment could not be reloaded.', 500)
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.member,
      aggregateId: original.memberId,
      eventType: EVENT_TYPES.leaveBalanceAdjustmentReversed,
      payload: {
        adjustmentId: original.adjustmentId,
        reversalAdjustmentId: reversalId,
        memberId: original.memberId,
        leaveTypeCode: original.leaveTypeCode,
        year: original.year,
        daysDelta: reversalDaysDelta,
        effectiveDate: original.effectiveDate,
        sourceKind: 'manual_adjustment_reversal',
        reason,
        notes,
        actorUserId
      }
    }, client)

    return reversal
  })
}

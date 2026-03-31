import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  CreateLeaveRequestInput,
  HrCoreMetadata,
  HrLeaveCalendarResponse,
  HrDepartment,
  HrLeaveBalance,
  HrLeaveBalancesResponse,
  HrLeaveCalendarEvent,
  HrLeavePayrollImpactSummary,
  HrLeavePolicy,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveType,
  ReviewLeaveRequestInput
} from '@/types/hr-core'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

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
import type { LeavePayrollImpactPeriod, LeavePolicy } from '@/lib/hr-core/leave-domain'
import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
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
import { resolveAvatarPath } from '@/lib/people/resolve-avatar-path'

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
  leave_type_code: string
  leave_type_name: string | null
  start_date: string | Date
  end_date: string | Date
  requested_days: number | string
  status: string
  reason: string | null
  attachment_url: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
  hr_reviewer_user_id: string | null
  decided_at: string | Date | null
  decided_by: string | null
  notes: string | null
  created_at: string | Date | null
}

type PostgresMemberResolverRow = {
  member_id: string
  display_name: string
  email: string | null
  identity_profile_id: string | null
  reports_to: string | null
  employment_type: string | null
  hire_date: string | Date | null
  prior_work_years: number | string | null
  pay_regime: string | null
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
  allow_negative_balance: boolean
  active: boolean
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
  minAdvanceDays: toInt(row.min_advance_days),
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
  allowNegativeBalance: Boolean(row.allow_negative_balance),
  active: Boolean(row.active)
})

const mapLeaveRequest = (row: PostgresLeaveRequestRow): HrLeaveRequest => ({
  requestId: row.request_id,
  memberId: row.member_id,
  memberName: normalizeNullableString(row.member_name),
  memberAvatarUrl: resolveAvatarPath({
    name: normalizeNullableString(row.member_name),
    email: normalizeNullableString(row.member_email)
  }),
  leaveTypeCode: row.leave_type_code,
  leaveTypeName: normalizeNullableString(row.leave_type_name) || row.leave_type_code,
  startDate: toPgDateString(row.start_date) || '',
  endDate: toPgDateString(row.end_date) || '',
  requestedDays: toNullableNumber(row.requested_days) ?? 0,
  status: (normalizeNullableString(row.status) || 'pending_supervisor') as HrLeaveRequest['status'],
  reason: normalizeNullableString(row.reason),
  attachmentUrl: normalizeNullableString(row.attachment_url),
  supervisorMemberId: normalizeNullableString(row.supervisor_member_id),
  supervisorName: normalizeNullableString(row.supervisor_name),
  hrReviewerUserId: normalizeNullableString(row.hr_reviewer_user_id),
  decidedAt: toPgTimestampString(row.decided_at),
  decidedBy: normalizeNullableString(row.decided_by),
  notes: normalizeNullableString(row.notes),
  createdAt: toPgTimestampString(row.created_at)
})

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
        member_id,
        display_name,
        primary_email AS email,
        identity_profile_id,
        reports_to_member_id AS reports_to,
        employment_type,
        hire_date,
        COALESCE(prior_work_years, 0) AS prior_work_years,
        (
          SELECT cv.pay_regime
          FROM greenhouse_payroll.compensation_versions AS cv
          WHERE cv.member_id = greenhouse_core.members.member_id
          ORDER BY cv.effective_from DESC, cv.version DESC
          LIMIT 1
        ) AS pay_regime
      FROM greenhouse_core.members
      WHERE member_id = $1
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
        (
          SELECT cv.pay_regime
          FROM greenhouse_payroll.compensation_versions AS cv
          WHERE cv.member_id = m.member_id
          ORDER BY cv.effective_from DESC, cv.version DESC
          LIMIT 1
        ) AS pay_regime
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

  if (currentMember.member_id !== memberId) {
    throw new HrCoreValidationError('Forbidden', 403)
  }
}

const resolveApplicableLeavePolicy = ({
  leaveType,
  policies,
  employmentType,
  payRegime
}: {
  leaveType: HrLeaveType
  policies: LeavePolicy[]
  employmentType: string | null
  payRegime: string | null
}) => {
  const exactMatch = policies.find(policy =>
    policy.leaveTypeCode === leaveType.leaveTypeCode &&
    isPolicyApplicableToMember({
      policy,
      employmentType,
      payRegime
    })
  )

  if (exactMatch) {
    return exactMatch
  }

  return mapLeavePolicy({
    policy_id: `policy-${leaveType.leaveTypeCode}-default`,
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
    applicable_employment_types: employmentType ? [employmentType] : [],
    applicable_pay_regimes: payRegime ? [payRegime] : [],
    allow_negative_balance: leaveType.defaultAnnualAllowanceDays <= 0,
    active: leaveType.active
  })
}

const doesLeaveTrackBalance = (policy: LeavePolicy) =>
  policy.accrualType !== 'unlimited' &&
  (
    policy.annualDays > 0 ||
    policy.maxCarryOverDays > 0 ||
    policy.progressiveEnabled ||
    !policy.allowNegativeBalance
  )

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
    const policy = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      employmentType: normalizeNullableString(member.employment_type),
      payRegime: normalizeNullableString(member.pay_regime)
    })

    await computeBalanceSeedForYear({
      member,
      leaveType,
      policy,
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
        member.display_name AS member_name,
        member.primary_email AS member_email,
        r.leave_type_code,
        lt.leave_type_name,
        r.start_date,
        r.end_date,
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
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

  return row ? mapLeaveRequest(row) : null
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
    eventStage,
    action,
    actorUserId,
    actorMemberId,
    actorName,
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
  const leavePolicies = await listLeavePoliciesInternal()

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

  const balances = rows.map(mapLeaveBalance)

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

  if (isHrAdminTenant(tenant)) {
    if (memberId) {
      values.push(memberId)
      filters.push(`r.member_id = $${values.length}`)
    }
  } else {
    values.push(currentMember?.member_id || '')
    filters.push(`(r.member_id = $${values.length} OR r.supervisor_member_id = $${values.length})`)
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
        member.display_name AS member_name,
        member.primary_email AS member_email,
        r.leave_type_code,
        lt.leave_type_name,
        r.start_date,
        r.end_date,
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE ${filters.join(' AND ')}
      ORDER BY r.created_at DESC
    `,
    values
  )

  const requests = rows.map(mapLeaveRequest)

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

  if (request.memberId !== currentMember.member_id && request.supervisorMemberId !== currentMember.member_id) {
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

  if (effectiveMemberId) {
    await assertMemberVisibleToTenant(tenant, effectiveMemberId)
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
        r.requested_days,
        r.status,
        r.reason,
        r.attachment_url,
        r.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        r.hr_reviewer_user_id,
        r.decided_at,
        r.decided_by,
        r.notes,
        r.created_at
      FROM greenhouse_hr.leave_requests AS r
      LEFT JOIN greenhouse_core.members AS member
        ON member.member_id = r.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN greenhouse_hr.leave_types AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE r.start_date <= $1::date
        AND r.end_date >= $2::date
        AND (
          $3::text IS NULL
          OR r.member_id = $3
        )
        AND (
          $4::boolean = TRUE
          OR r.member_id = $5
          OR r.supervisor_member_id = $5
        )
      ORDER BY r.start_date ASC, member.display_name ASC NULLS LAST
    `,
    [normalizedTo, normalizedFrom, effectiveMemberId, isHrAdminTenant(tenant), currentMember?.member_id ?? null]
  )

  const leaveEvents: HrLeaveCalendarEvent[] = rows.map(row => {
    const request = mapLeaveRequest(row)

    return {
      id: request.requestId,
      title: getLeaveTitle({
        leaveTypeName: request.leaveTypeName,
        memberName: request.memberName
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
        requestedDays: request.requestedDays
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

    const policy = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      employmentType: normalizeNullableString(member.employment_type),
      payRegime: normalizeNullableString(member.pay_regime)
    })

    const dayBreakdown = await computeLeaveDayBreakdown({
      startDate,
      endDate,
      countryCode: 'CL'
    })

    const requestedDays = dayBreakdown.totalDays
    const tracksBalance = doesLeaveTrackBalance(policy)

    if (requestedDays <= 0) {
      throw new HrCoreValidationError('The selected dates do not contain payable working days.', 409, {
        holidaySource: dayBreakdown.holidaySource
      })
    }

    if (leaveType.requiresAttachment && !normalizeNullableString(input.attachmentUrl)) {
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
    const supervisorMemberId = normalizeNullableString(member.reports_to)
    const status = supervisorMemberId ? 'pending_supervisor' : 'pending_hr'
    const reason = normalizeNullableString(input.reason)
    const attachmentUrl = normalizeNullableString(input.attachmentUrl)
    const notes = normalizeNullableString(input.notes)

    await client.query(
      `
        INSERT INTO greenhouse_hr.leave_requests (
          request_id,
          member_id,
          leave_type_code,
          start_date,
          end_date,
          requested_days,
          status,
          reason,
          attachment_url,
          supervisor_member_id,
          notes,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4::date, $5::date, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        requestId,
        effectiveMemberId,
        leaveTypeCode,
        startDate,
        endDate,
        requestedDays,
        status,
        reason,
        attachmentUrl,
        supervisorMemberId,
        notes,
        actorUserId
      ]
    )

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

    const created: HrLeaveRequest = {
      requestId,
      memberId: effectiveMemberId,
      memberName: normalizeNullableString(member.display_name),
      memberAvatarUrl: resolveAvatarPath({
        name: normalizeNullableString(member.display_name),
        email: normalizeNullableString(member.email)
      }),
      leaveTypeCode,
      leaveTypeName: leaveType.leaveTypeName,
      startDate,
      endDate,
      requestedDays,
      status,
      reason,
      attachmentUrl,
      supervisorMemberId,
      supervisorName: null,
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
        reservedDelta: requestedDays,
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
    const member = await getMemberById(request.memberId, client)

    const [leaveTypes, leavePolicies] = await Promise.all([
      listLeaveTypesInternal(client),
      listLeavePoliciesInternal(client)
    ])

    const leaveType = leaveTypes.find(item => item.leaveTypeCode === request.leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const policy = resolveApplicableLeavePolicy({
      leaveType,
      policies: leavePolicies,
      employmentType: normalizeNullableString(member.employment_type),
      payRegime: normalizeNullableString(member.pay_regime)
    })

    const dayBreakdown = await computeLeaveDayBreakdown({
      startDate: request.startDate,
      endDate: request.endDate,
      countryCode: 'CL'
    })

    const tracksBalance = doesLeaveTrackBalance(policy)
    let nextStatus: HrLeaveRequest['status'] = request.status
    let payrollImpact: HrLeavePayrollImpactSummary | null = null
    let eventType: string = EVENT_TYPES.leaveRequestRejected
    let eventStage: 'requested' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled' = 'rejected'

    if (action === 'cancel') {
      if (!isHrAdminTenant(tenant) && actorMemberId !== request.memberId) {
        throw new HrCoreValidationError('Forbidden', 403)
      }

      if (!['pending_supervisor', 'pending_hr'].includes(request.status)) {
        throw new HrCoreValidationError('Only pending requests can be cancelled.', 409)
      }

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
          reservedDelta: -request.requestedDays,
          usedDelta: 0,
          actorUserId,
          client
        })
      }
    } else if (!isHrAdminTenant(tenant)) {
      if (request.supervisorMemberId !== actorMemberId || request.status !== 'pending_supervisor') {
        throw new HrCoreValidationError('Forbidden', 403)
      }

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

      if (action === 'reject' && tracksBalance) {
        await adjustBalanceForRequest({
          request,
          daysByYear: dayBreakdown.daysByYear,
          reservedDelta: -request.requestedDays,
          usedDelta: 0,
          actorUserId,
          client
        })
      }
    } else {
      if (!['pending_hr', 'pending_supervisor'].includes(request.status)) {
        throw new HrCoreValidationError('This request is no longer pending HR review.', 409)
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
          reservedDelta: -request.requestedDays,
          usedDelta: action === 'approve' ? request.requestedDays : 0,
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

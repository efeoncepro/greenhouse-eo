import 'server-only'

import { randomUUID } from 'node:crypto'

import type {
  CreateDepartmentInput,
  CreateLeaveRequestInput,
  HrAttendanceRecord,
  HrAttendanceResponse,
  HrCoreMetadata,
  HrLeaveBackfillInput,
  HrLeaveBalanceAdjustmentInput,
  HrLeaveBalanceAdjustmentReverseInput,
  HrLeaveBalanceAdjustmentsResponse,
  HrLeaveCalendarResponse,
  HrDepartmentsResponse,
  HrLeaveBalance,
  HrLeaveBalancesResponse,
  HrMemberOption,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveType,
  HrMemberProfile,
  RecordAttendanceInput,
  ReviewLeaveRequestInput,
  UpdateDepartmentInput,
  UpdateHrMemberProfileInput
} from '@/types/hr-core'
import type { PayRegime, PayrollVia } from '@/types/hr-contracts'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import { assertHrCoreInfrastructureReady } from '@/lib/hr-core/schema'
import {
  createLeaveBackfillInPostgres,
  createLeaveBalanceAdjustmentInPostgres,
  createLeaveRequestInPostgres,
  getHrCoreMetadataFromPostgres,
  getLeaveRequestByIdFromPostgres,
  isHrCoreLeavePostgresEnabled,
  listLeaveBalanceAdjustmentsFromPostgres,
  listLeaveCalendarFromPostgres,
  listLeaveBalancesFromPostgres,
  listLeaveRequestsFromPostgres,
  reverseLeaveBalanceAdjustmentInPostgres,
  reviewLeaveRequestInPostgres
} from '@/lib/hr-core/postgres-leave-store'
import { canPerformLeaveReviewAction, getLeaveApprovalStageCode } from '@/lib/hr-core/leave-review-policy'
import {
  createDepartmentInPostgres,
  getDepartmentByIdFromPostgres,
  getMemberDepartmentContextFromPostgres,
  listDepartmentHeadOptionsFromPostgres,
  listDepartmentsFromPostgres,
  updateDepartmentInPostgres,
  updateMemberDepartmentContextInPostgres
} from '@/lib/hr-core/postgres-departments-store'
import {
  HR_ATTENDANCE_STATUSES,
  HR_BANK_ACCOUNT_TYPES,
  HR_CONTRACT_TYPES,
  HR_EMPLOYMENT_TYPES,
  HR_HEALTH_SYSTEMS,
  HR_JOB_LEVELS,
  HR_LEAVE_REQUEST_STATUSES,
  HrCoreValidationError,
  assertDateString,
  assertEnum,
  assertNonNegativeNumber,
  assertPositiveInteger,
  getHrCoreProjectId,
  isHrAdminTenant,
  maskSensitiveValue,
  normalizeNullableString,
  normalizeString,
  runHrCoreQuery,
  toDateString,
  toInt,
  toNullableNumber,
  toStringArray,
  toTimestampString
} from '@/lib/hr-core/shared'
import { getPeopleTableColumns } from '@/lib/people/shared'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getSupervisorScopeForTenant } from '@/lib/reporting-hierarchy/access'
import { assertReportingLineChangeAllowed, upsertReportingLine } from '@/lib/reporting-hierarchy/store'
import { buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'
import { AGGREGATE_TYPES, EVENT_TYPES } from '@/lib/sync/event-catalog'
import { publishOutboxEvent } from '@/lib/sync/publish-event'
import { CONTRACT_DERIVATIONS, normalizeContractType, resolveScheduleRequired, SCHEDULE_DEFAULTS } from '@/types/hr-contracts'
import { getCurrentReportingLine } from '@/lib/reporting-hierarchy/readers'

type MemberUserRow = {
  user_id: string | null
  email: string | null
  microsoft_email: string | null
  google_email: string | null
  identity_profile_id: string | null
}

type MemberResolverRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  identity_profile_id: string | null
  reports_to: string | null
}

type MemberProfileRow = {
  member_id: string | null
  display_name: string | null
  email: string | null
  department_id: string | null
  department_name: string | null
  reports_to: string | null
  reports_to_name: string | null
  job_level: string | null
  hire_date: { value?: string } | string | null
  contract_end_date: { value?: string } | string | null
  employment_type: string | null
  daily_required: boolean | null
  identity_document_type: string | null
  identity_document_number: string | null
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  health_system: string | null
  isapre_name: string | null
  bank_name: string | null
  bank_account_type: string | null
  bank_account_number: string | null
  cv_url: string | null
  linkedin_url: string | null
  portfolio_url: string | null
  skills: string[] | null
  tools: string[] | null
  ai_suites: string[] | null
  strengths: string[] | null
  improvement_areas: string[] | null
  piece_types: string[] | null
  avg_monthly_volume: number | string | null
  throughput_avg_30d: number | string | null
  rpa_avg_30d: number | string | null
  otd_percent_30d: number | string | null
  notes: string | null
  updated_at: { value?: string } | string | null
}

type MemberContractRow = {
  contract_type: string | null
  pay_regime: string | null
  payroll_via: string | null
  deel_contract_id: string | null
  daily_required: boolean | null
  contract_end_date: string | Date | null
}

type LeaveTypeRow = {
  leave_type_code: string | null
  leave_type_name: string | null
  description: string | null
  default_annual_allowance_days: number | string | null
  requires_attachment: boolean | null
  is_paid: boolean | null
  active: boolean | null
  color_token: string | null
}

type LeaveBalanceRow = {
  balance_id: string | null
  member_id: string | null
  member_name: string | null
  leave_type_code: string | null
  leave_type_name: string | null
  year: number | string | null
  allowance_days: number | string | null
  carried_over_days: number | string | null
  used_days: number | string | null
  reserved_days: number | string | null
}

type LeaveRequestRow = {
  request_id: string | null
  member_id: string | null
  member_name: string | null
  member_email: string | null
  member_avatar_url: string | null
  leave_type_code: string | null
  leave_type_name: string | null
  start_date: { value?: string } | string | null
  end_date: { value?: string } | string | null
  start_period: string | null
  end_period: string | null
  requested_days: number | string | null
  status: string | null
  reason: string | null
  attachment_asset_id: string | null
  attachment_url: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
  hr_reviewer_user_id: string | null
  decided_at: { value?: string } | string | null
  decided_by: string | null
  notes: string | null
  created_at: { value?: string } | string | null
}

type AttendanceRow = {
  attendance_id: string | null
  member_id: string | null
  member_name: string | null
  attendance_date: { value?: string } | string | null
  attendance_status: string | null
  source_system: string | null
  source_reference: string | null
  check_in_at: { value?: string } | string | null
  meeting_joined_at: { value?: string } | string | null
  meeting_left_at: { value?: string } | string | null
  minutes_present: number | string | null
  notes: string | null
  recorded_by: string | null
  updated_at: { value?: string } | string | null
}

const getProjectId = () => getHrCoreProjectId()

const getCurrentYear = () => new Date().getUTCFullYear()

const toDateStringFromAny = (value: string | Date | { value?: string } | null | undefined) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  return toDateString(value)
}

export const isHrLeavePostgresFallbackError = (error: unknown) => {
  if (error instanceof HrCoreValidationError) {
    return error.code === 'HR_CORE_POSTGRES_NOT_CONFIGURED' || error.code === 'HR_CORE_POSTGRES_SCHEMA_NOT_READY'
  }

  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { code?: unknown; status?: unknown; message?: unknown }
  const message = typeof maybeError.message === 'string' ? maybeError.message : ''
  const normalizedMessage = message.toLowerCase()
  const rawCode = typeof maybeError.code === 'string' ? maybeError.code.trim().toUpperCase() : null
  const code = typeof maybeError.code === 'number' ? maybeError.code : Number(maybeError.code)
  const status = typeof maybeError.status === 'number' ? maybeError.status : Number(maybeError.status)

  return (
    code === 403 ||
    code === 42703 ||
    status === 403 ||
    rawCode === '42P01' ||
    normalizedMessage.includes('boss::not_authorized') ||
    normalizedMessage.includes('cloudsql.instances.get') ||
    normalizedMessage.includes('cloud sql') ||
    normalizedMessage.includes('econnrefused') ||
    normalizedMessage.includes('connect etimedout') ||
    (normalizedMessage.includes('column') && normalizedMessage.includes('does not exist')) ||
    (normalizedMessage.includes('relation') && normalizedMessage.includes('does not exist'))
  )
}

const withHrLeavePostgresFallback = async <T>({
  operation,
  postgres,
  fallback
}: {
  operation: string
  postgres: () => Promise<T>
  fallback: () => Promise<T>
}) => {
  if (!isHrCoreLeavePostgresEnabled()) {
    return fallback()
  }

  try {
    return await postgres()
  } catch (error) {
    if (!isHrLeavePostgresFallbackError(error)) {
      throw error
    }

    console.warn(`[hr-core] Falling back to BigQuery for ${operation}`, error)

    return fallback()
  }
}

const mapLeaveType = (row: LeaveTypeRow): HrLeaveType => ({
  leaveTypeCode: String(row.leave_type_code || ''),
  leaveTypeName: String(row.leave_type_name || ''),
  description: normalizeNullableString(row.description),
  defaultAnnualAllowanceDays: toInt(row.default_annual_allowance_days),
  requiresAttachment: Boolean(row.requires_attachment),
  isPaid: Boolean(row.is_paid),
  active: Boolean(row.active),
  colorToken: normalizeNullableString(row.color_token)
})

const mapLeaveBalance = (row: LeaveBalanceRow): HrLeaveBalance => {
  const allowanceDays = toNullableNumber(row.allowance_days) ?? 0
  const carriedOverDays = toNullableNumber(row.carried_over_days) ?? 0
  const usedDays = toNullableNumber(row.used_days) ?? 0
  const reservedDays = toNullableNumber(row.reserved_days) ?? 0

  return {
    balanceId: String(row.balance_id || ''),
    memberId: String(row.member_id || ''),
    memberName: normalizeNullableString(row.member_name),
    leaveTypeCode: String(row.leave_type_code || ''),
    leaveTypeName: String(row.leave_type_name || row.leave_type_code || ''),
    year: toInt(row.year),
    allowanceDays,
    carriedOverDays,
    usedDays,
    reservedDays,
    availableDays: allowanceDays + carriedOverDays - usedDays - reservedDays
  }
}

const mapLeaveRequest = (row: LeaveRequestRow): HrLeaveRequest => ({
  requestId: String(row.request_id || ''),
  memberId: String(row.member_id || ''),
  memberName: normalizeNullableString(row.member_name),
  memberAvatarUrl: normalizeNullableString(row.member_avatar_url),
  leaveTypeCode: String(row.leave_type_code || ''),
  leaveTypeName: String(row.leave_type_name || row.leave_type_code || ''),
  startDate: toDateString(row.start_date) || '',
  endDate: toDateString(row.end_date) || '',
  startPeriod: (row.start_period || 'full_day') as 'full_day' | 'morning' | 'afternoon',
  endPeriod: (row.end_period || 'full_day') as 'full_day' | 'morning' | 'afternoon',
  requestedDays: toNullableNumber(row.requested_days) ?? 0,
  status: (row.status || 'pending_supervisor') as HrLeaveRequest['status'],
  reason: normalizeNullableString(row.reason),
  attachmentAssetId: normalizeNullableString(row.attachment_asset_id),
  attachmentUrl:
    normalizeNullableString(row.attachment_asset_id)
      ? buildPrivateAssetDownloadUrl(String(row.attachment_asset_id))
      : normalizeNullableString(row.attachment_url),
  supervisorMemberId: normalizeNullableString(row.supervisor_member_id),
  supervisorName: normalizeNullableString(row.supervisor_name),
  hrReviewerUserId: normalizeNullableString(row.hr_reviewer_user_id),
  decidedAt: toTimestampString(row.decided_at),
  decidedBy: normalizeNullableString(row.decided_by),
  notes: normalizeNullableString(row.notes),
  createdAt: toTimestampString(row.created_at)
})

const mapAttendance = (row: AttendanceRow): HrAttendanceRecord => ({
  attendanceId: String(row.attendance_id || ''),
  memberId: String(row.member_id || ''),
  memberName: normalizeNullableString(row.member_name),
  attendanceDate: toDateString(row.attendance_date) || '',
  attendanceStatus: (row.attendance_status || 'present') as HrAttendanceRecord['attendanceStatus'],
  sourceSystem: String(row.source_system || 'manual'),
  sourceReference: normalizeNullableString(row.source_reference),
  checkInAt: toTimestampString(row.check_in_at),
  meetingJoinedAt: toTimestampString(row.meeting_joined_at),
  meetingLeftAt: toTimestampString(row.meeting_left_at),
  minutesPresent: toNullableNumber(row.minutes_present),
  notes: normalizeNullableString(row.notes),
  recordedBy: normalizeNullableString(row.recorded_by),
  updatedAt: toTimestampString(row.updated_at)
})

const mapMemberProfile = (
  row: MemberProfileRow,
  contract: MemberContractRow | null,
  { includeSensitive }: { includeSensitive: boolean }
): HrMemberProfile => ({
  memberId: String(row.member_id || ''),
  displayName: String(row.display_name || ''),
  email: String(row.email || ''),
  departmentId: normalizeNullableString(row.department_id),
  departmentName: normalizeNullableString(row.department_name),
  reportsTo: normalizeNullableString(row.reports_to),
  reportsToName: normalizeNullableString(row.reports_to_name),
  jobLevel: normalizeNullableString(row.job_level) as HrMemberProfile['jobLevel'],
  hireDate: toDateString(row.hire_date),
  contractEndDate: toDateStringFromAny(contract?.contract_end_date ?? row.contract_end_date),
  employmentType: normalizeNullableString(row.employment_type) as HrMemberProfile['employmentType'],
  dailyRequired: contract?.daily_required ?? row.daily_required !== false,
  contractType: normalizeContractType(contract?.contract_type),
  payRegime: (contract?.pay_regime === 'international' ? 'international' : 'chile') as PayRegime,
  payrollVia: (contract?.payroll_via === 'deel' ? 'deel' : 'internal') as PayrollVia,
  deelContractId: normalizeNullableString(contract?.deel_contract_id),
  identityDocumentType: includeSensitive ? normalizeNullableString(row.identity_document_type) : null,
  identityDocumentNumberMasked: includeSensitive ? maskSensitiveValue(normalizeNullableString(row.identity_document_number)) : null,
  phone: includeSensitive ? normalizeNullableString(row.phone) : null,
  emergencyContactName: includeSensitive ? normalizeNullableString(row.emergency_contact_name) : null,
  emergencyContactPhone: includeSensitive ? normalizeNullableString(row.emergency_contact_phone) : null,
  healthSystem: normalizeNullableString(row.health_system) as HrMemberProfile['healthSystem'],
  isapreName: normalizeNullableString(row.isapre_name),
  bankName: includeSensitive ? normalizeNullableString(row.bank_name) : null,
  bankAccountType: includeSensitive ? (normalizeNullableString(row.bank_account_type) as HrMemberProfile['bankAccountType']) : null,
  bankAccountNumberMasked: includeSensitive ? maskSensitiveValue(normalizeNullableString(row.bank_account_number)) : null,
  cvUrl: normalizeNullableString(row.cv_url),
  linkedinUrl: normalizeNullableString(row.linkedin_url),
  portfolioUrl: normalizeNullableString(row.portfolio_url),
  skills: toStringArray(row.skills),
  tools: toStringArray(row.tools),
  aiSuites: toStringArray(row.ai_suites),
  strengths: toStringArray(row.strengths),
  improvementAreas: toStringArray(row.improvement_areas),
  pieceTypes: toStringArray(row.piece_types),
  avgMonthlyVolume: toNullableNumber(row.avg_monthly_volume),
  throughputAvg30d: toNullableNumber(row.throughput_avg_30d),
  rpaAvg30d: toNullableNumber(row.rpa_avg_30d),
  otdPercent30d: toNullableNumber(row.otd_percent_30d),
  notes: normalizeNullableString(row.notes),
  updatedAt: toTimestampString(row.updated_at)
})

const getMemberContractFromPostgres = async (memberId: string): Promise<MemberContractRow | null> => {
  const rows = await runGreenhousePostgresQuery<MemberContractRow>(
    `
      SELECT
        contract_type,
        pay_regime,
        payroll_via,
        deel_contract_id,
        daily_required,
        contract_end_date
      FROM greenhouse_core.members
      WHERE member_id = $1
      LIMIT 1
    `,
    [memberId]
  ).catch(() => [])

  return rows[0] ?? null
}

const getLeaveTypesInternal = async () => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()

  const rows = await runHrCoreQuery<LeaveTypeRow>(
    `
      SELECT *
      FROM \`${projectId}.greenhouse.leave_types\`
      WHERE active = TRUE
      ORDER BY leave_type_name ASC
    `
  )

  return rows.map(mapLeaveType)
}

const getMemberResolverById = async (memberId: string) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')
  const reportsToSelect = memberColumns.has('reports_to') ? 'reports_to' : 'CAST(NULL AS STRING) AS reports_to'

  const identityProfileSelect = memberColumns.has('identity_profile_id')
    ? 'identity_profile_id'
    : 'CAST(NULL AS STRING) AS identity_profile_id'

  const [row] = await runHrCoreQuery<MemberResolverRow>(
    `
      SELECT
        member_id,
        display_name,
        email,
        ${identityProfileSelect},
        ${reportsToSelect}
      FROM \`${projectId}.greenhouse.team_members\`
      WHERE member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  if (!row) {
    throw new HrCoreValidationError('Team member not found.', 404)
  }

  return row
}

const resolveMemberByEmail = async (email: string) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')

  const emailAliasesSelect = memberColumns.has('email_aliases')
    ? 'EXISTS (SELECT 1 FROM UNNEST(COALESCE(m.email_aliases, ARRAY<STRING>[])) AS alias WHERE LOWER(alias) = @email)'
    : 'FALSE'

  const [row] = await runHrCoreQuery<MemberResolverRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        ${memberColumns.has('identity_profile_id') ? 'm.identity_profile_id,' : 'CAST(NULL AS STRING) AS identity_profile_id,'}
        ${memberColumns.has('reports_to') ? 'm.reports_to' : 'CAST(NULL AS STRING) AS reports_to'}
      FROM \`${projectId}.greenhouse.team_members\` AS m
      WHERE LOWER(COALESCE(m.email, '')) = @email
        OR ${emailAliasesSelect}
      LIMIT 1
    `,
    { email: email.toLowerCase() }
  )

  return row || null
}

const resolveTenantMember = async (tenant: TenantContext) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')
  const userColumns = await getPeopleTableColumns('greenhouse', 'client_users')

  const [userRow] = await runHrCoreQuery<MemberUserRow>(
    `
      SELECT
        user_id,
        email,
        microsoft_email,
        google_email,
        ${userColumns.has('identity_profile_id') ? 'identity_profile_id' : 'CAST(NULL AS STRING) AS identity_profile_id'}
      FROM \`${projectId}.greenhouse.client_users\`
      WHERE user_id = @userId
      LIMIT 1
    `,
    { userId: tenant.userId }
  )

  if (!userRow) {
    throw new HrCoreValidationError('Tenant user not found.', 404)
  }

  const emails = Array.from(
    new Set(
      [userRow.email, userRow.microsoft_email, userRow.google_email]
        .map(value => normalizeNullableString(value)?.toLowerCase() || null)
        .filter(Boolean) as string[]
    )
  )

  const profileMatchQuery =
    userRow.identity_profile_id && memberColumns.has('identity_profile_id')
      ? `
          SELECT
            m.member_id,
            m.display_name,
            m.email,
            ${memberColumns.has('identity_profile_id') ? 'm.identity_profile_id,' : 'CAST(NULL AS STRING) AS identity_profile_id,'}
            ${memberColumns.has('reports_to') ? 'm.reports_to' : 'CAST(NULL AS STRING) AS reports_to'}
          FROM \`${projectId}.greenhouse.team_members\` AS m
          WHERE m.identity_profile_id = @identityProfileId
          LIMIT 1
        `
      : ''

  if (profileMatchQuery) {
    const [profileRow] = await runHrCoreQuery<MemberResolverRow>(profileMatchQuery, {
      identityProfileId: userRow.identity_profile_id
    })

    if (profileRow) {
      return profileRow
    }
  }

  if (emails.length === 0) {
    throw new HrCoreValidationError('Unable to resolve current collaborator.', 404)
  }

  const emailAliasesClause = memberColumns.has('email_aliases')
    ? 'EXISTS (SELECT 1 FROM UNNEST(COALESCE(m.email_aliases, ARRAY<STRING>[])) AS alias WHERE LOWER(alias) IN UNNEST(@emails))'
    : 'FALSE'

  const [row] = await runHrCoreQuery<MemberResolverRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        ${memberColumns.has('identity_profile_id') ? 'm.identity_profile_id,' : 'CAST(NULL AS STRING) AS identity_profile_id,'}
        ${memberColumns.has('reports_to') ? 'm.reports_to' : 'CAST(NULL AS STRING) AS reports_to'}
      FROM \`${projectId}.greenhouse.team_members\` AS m
      WHERE LOWER(COALESCE(m.email, '')) IN UNNEST(@emails)
        OR ${emailAliasesClause}
      LIMIT 1
    `,
    { emails }
  )

  if (!row) {
    throw new HrCoreValidationError('Unable to resolve current collaborator.', 404, {
      userId: tenant.userId
    })
  }

  return row
}

export const resolveCurrentHrMemberId = async (tenant: TenantContext) => {
  if (tenant.memberId) {
    return tenant.memberId
  }

  const member = await resolveTenantMember(tenant)

  return member.member_id
}

const assertMemberVisibleToTenant = async (tenant: TenantContext, memberId: string) => {
  if (isHrAdminTenant(tenant)) {
    return
  }

  const currentMember = await resolveTenantMember(tenant)

  if (currentMember.member_id === memberId) {
    return
  }

  const supervisorScope = await getSupervisorScopeForTenant(tenant).catch(() => null)

  if (!supervisorScope?.visibleMemberIds.includes(memberId)) {
    throw new HrCoreValidationError('Forbidden', 403)
  }
}

const ensureYearBalances = async ({ memberId, year, actorUserId }: { memberId: string; year: number; actorUserId: string }) => {
  const projectId = getProjectId()

  await runHrCoreQuery(
    `
      MERGE \`${projectId}.greenhouse.leave_balances\` AS target
      USING (
        SELECT
          CONCAT(@memberId, '-', CAST(@year AS STRING), '-', lt.leave_type_code) AS balance_id,
          @memberId AS member_id,
          lt.leave_type_code,
          @year AS year,
          CAST(lt.default_annual_allowance_days AS FLOAT64) AS allowance_days,
          0.0 AS carried_over_days,
          0.0 AS used_days,
          0.0 AS reserved_days
        FROM \`${projectId}.greenhouse.leave_types\` AS lt
        WHERE lt.active = TRUE
      ) AS source
      ON target.balance_id = source.balance_id
      WHEN NOT MATCHED THEN
        INSERT (
          balance_id,
          member_id,
          leave_type_code,
          year,
          allowance_days,
          carried_over_days,
          used_days,
          reserved_days,
          updated_by,
          created_at,
          updated_at
        )
        VALUES (
          source.balance_id,
          source.member_id,
          source.leave_type_code,
          source.year,
          source.allowance_days,
          source.carried_over_days,
          source.used_days,
          source.reserved_days,
          @actorUserId,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
    `,
    { memberId, year, actorUserId }
  )
}

const listActiveMemberIdsForBalanceSeeding = async () => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()

  const rows = await runHrCoreQuery<{ member_id: string }>(
    `
      SELECT
        m.member_id
      FROM \`${projectId}.greenhouse.team_members\` AS m
      WHERE COALESCE(m.active, TRUE) = TRUE
      ORDER BY m.display_name ASC, m.member_id ASC
    `,
    {}
  )

  return rows.map(row => row.member_id).filter(Boolean)
}

const ensureYearBalancesForAllActiveMembers = async ({
  year,
  actorUserId
}: {
  year: number
  actorUserId: string
}) => {
  const memberIds = await listActiveMemberIdsForBalanceSeeding()

  for (const memberId of memberIds) {
    await ensureYearBalances({
      memberId,
      year,
      actorUserId
    })
  }
}

const getBalanceRow = async ({ memberId, leaveTypeCode, year }: { memberId: string; leaveTypeCode: string; year: number }) => {
  const projectId = getProjectId()

  const [row] = await runHrCoreQuery<LeaveBalanceRow>(
    `
      SELECT
        b.balance_id,
        b.member_id,
        m.display_name AS member_name,
        b.leave_type_code,
        lt.leave_type_name,
        b.year,
        b.allowance_days,
        b.carried_over_days,
        b.used_days,
        b.reserved_days
      FROM \`${projectId}.greenhouse.leave_balances\` AS b
      LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = b.member_id
      LEFT JOIN \`${projectId}.greenhouse.leave_types\` AS lt
        ON lt.leave_type_code = b.leave_type_code
      WHERE b.member_id = @memberId
        AND b.leave_type_code = @leaveTypeCode
        AND b.year = @year
      LIMIT 1
    `,
    { memberId, leaveTypeCode, year }
  )

  return row ? mapLeaveBalance(row) : null
}

const adjustBalanceForRequest = async ({
  request,
  reservedDelta,
  usedDelta,
  actorUserId
}: {
  request: HrLeaveRequest
  reservedDelta: number
  usedDelta: number
  actorUserId: string
}) => {
  const projectId = getProjectId()
  const year = Number(request.startDate.slice(0, 4))

  await runHrCoreQuery(
    `
      UPDATE \`${projectId}.greenhouse.leave_balances\`
      SET
        reserved_days = GREATEST(0, COALESCE(reserved_days, 0) + @reservedDelta),
        used_days = GREATEST(0, COALESCE(used_days, 0) + @usedDelta),
        updated_by = @actorUserId,
        updated_at = CURRENT_TIMESTAMP()
      WHERE member_id = @memberId
        AND leave_type_code = @leaveTypeCode
        AND year = @year
    `,
    {
      memberId: request.memberId,
      leaveTypeCode: request.leaveTypeCode,
      year,
      reservedDelta,
      usedDelta,
      actorUserId
    }
  )
}

const getLeaveRequestByIdInternal = async (requestId: string) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()

  const [row] = await runHrCoreQuery<LeaveRequestRow>(
    `
      SELECT
        r.request_id,
        r.member_id,
        m.display_name AS member_name,
        m.email AS member_email,
        m.avatar_url AS member_avatar_url,
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
      FROM \`${projectId}.greenhouse.leave_requests\` AS r
      LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = r.member_id
      LEFT JOIN \`${projectId}.greenhouse.team_members\` AS supervisor
        ON supervisor.member_id = r.supervisor_member_id
      LEFT JOIN \`${projectId}.greenhouse.leave_types\` AS lt
        ON lt.leave_type_code = r.leave_type_code
      WHERE r.request_id = @requestId
      LIMIT 1
    `,
    { requestId }
  )

  return row ? mapLeaveRequest(row) : null
}

export const getHrCoreMetadata = async (): Promise<HrCoreMetadata> => {
  const departments = await listDepartmentsFromPostgres({ activeOnly: true })

  const metadata = await withHrLeavePostgresFallback({
    operation: 'getHrCoreMetadata',
    postgres: () => getHrCoreMetadataFromPostgres(),
    fallback: async () => ({
      departments: [],
      leaveTypes: await getLeaveTypesInternal(),
      jobLevels: [...HR_JOB_LEVELS],
      employmentTypes: [...HR_EMPLOYMENT_TYPES],
      healthSystems: [...HR_HEALTH_SYSTEMS],
      bankAccountTypes: [...HR_BANK_ACCOUNT_TYPES],
      leaveRequestStatuses: [...HR_LEAVE_REQUEST_STATUSES],
      attendanceStatuses: [...HR_ATTENDANCE_STATUSES]
    })
  })

  return {
    ...metadata,
    departments
  }
}

export const listDepartments = async (): Promise<HrDepartmentsResponse> => {
  const departments = await listDepartmentsFromPostgres()

  return {
    departments,
    summary: {
      total: departments.length,
      active: departments.filter(department => department.active).length
    }
  }
}

export const listDepartmentHeadOptions = async (): Promise<HrMemberOption[]> => {
  return listDepartmentHeadOptionsFromPostgres()
}

export const getDepartmentById = async (departmentId: string) => {
  return getDepartmentByIdFromPostgres(departmentId)
}

export const createDepartment = async (input: CreateDepartmentInput) => {
  return createDepartmentInPostgres(input)
}

export const updateDepartment = async (departmentId: string, input: UpdateDepartmentInput) => {
  return updateDepartmentInPostgres(departmentId, input)
}

export const getMemberHrProfile = async ({
  tenant,
  memberId
}: {
  tenant: TenantContext
  memberId: string
}) => {
  await assertMemberVisibleToTenant(tenant, memberId)
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()
  const memberColumns = await getPeopleTableColumns('greenhouse', 'team_members')

  const [row] = await runHrCoreQuery<MemberProfileRow>(
    `
      SELECT
        m.member_id,
        m.display_name,
        m.email,
        ${memberColumns.has('department_id') ? 'm.department_id,' : 'CAST(NULL AS STRING) AS department_id,'}
        d.name AS department_name,
        ${memberColumns.has('reports_to') ? 'm.reports_to,' : 'CAST(NULL AS STRING) AS reports_to,'}
        supervisor.display_name AS reports_to_name,
        ${memberColumns.has('job_level') ? 'm.job_level,' : 'CAST(NULL AS STRING) AS job_level,'}
        ${memberColumns.has('hire_date') ? 'm.hire_date,' : 'CAST(NULL AS DATE) AS hire_date,'}
        ${memberColumns.has('contract_end_date') ? 'm.contract_end_date,' : 'CAST(NULL AS DATE) AS contract_end_date,'}
        ${memberColumns.has('employment_type') ? 'm.employment_type,' : 'CAST(NULL AS STRING) AS employment_type,'}
        ${memberColumns.has('daily_required') ? 'COALESCE(m.daily_required, TRUE) AS daily_required,' : 'TRUE AS daily_required,'}
        p.identity_document_type,
        p.identity_document_number,
        m.phone,
        p.emergency_contact_name,
        p.emergency_contact_phone,
        p.health_system,
        p.isapre_name,
        p.bank_name,
        p.bank_account_type,
        p.bank_account_number,
        p.cv_url,
        p.linkedin_url,
        p.portfolio_url,
        COALESCE(p.skills, ARRAY<STRING>[]) AS skills,
        COALESCE(p.tools, ARRAY<STRING>[]) AS tools,
        COALESCE(p.ai_suites, ARRAY<STRING>[]) AS ai_suites,
        COALESCE(p.strengths, ARRAY<STRING>[]) AS strengths,
        COALESCE(p.improvement_areas, ARRAY<STRING>[]) AS improvement_areas,
        COALESCE(p.piece_types, ARRAY<STRING>[]) AS piece_types,
        p.avg_monthly_volume,
        p.throughput_avg_30d,
        p.rpa_avg_30d,
        p.otd_percent_30d,
        p.notes,
        p.updated_at
      FROM \`${projectId}.greenhouse.team_members\` AS m
      LEFT JOIN \`${projectId}.greenhouse.departments\` AS d
        ON d.department_id = m.department_id
      LEFT JOIN \`${projectId}.greenhouse.team_members\` AS supervisor
        ON supervisor.member_id = m.reports_to
      LEFT JOIN \`${projectId}.greenhouse.member_profiles\` AS p
        ON p.member_id = m.member_id
      WHERE m.member_id = @memberId
      LIMIT 1
    `,
    { memberId }
  )

  if (!row) {
    throw new HrCoreValidationError('Team member not found.', 404)
  }

  const departmentContext = await getMemberDepartmentContextFromPostgres(memberId)
  const contract = await getMemberContractFromPostgres(memberId)
  const currentReportingLine = await getCurrentReportingLine(memberId)
  const profile = mapMemberProfile(row, contract, { includeSensitive: isHrAdminTenant(tenant) })

  return {
    ...profile,
    reportsTo: currentReportingLine ? currentReportingLine.supervisorMemberId : profile.reportsTo,
    reportsToName: currentReportingLine ? currentReportingLine.supervisorName : profile.reportsToName,
    departmentId: departmentContext.departmentId,
    departmentName: departmentContext.departmentName
  }
}

export const updateMemberHrProfile = async ({
  memberId,
  input,
  actorUserId
}: {
  memberId: string
  input: UpdateHrMemberProfileInput
  actorUserId: string
}) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()

  await getMemberResolverById(memberId)
  const existingContract = await getMemberContractFromPostgres(memberId)

  const teamMemberUpdates: string[] = []
  const teamMemberParams: Record<string, unknown> = { memberId }
  const profileUpdates: string[] = []
  const profileSelects: string[] = []
  const profileInsertColumns: string[] = []
  const profileInsertValues: string[] = []
  const postgresMemberUpdates: string[] = []
  const postgresMemberValues: unknown[] = []
  const updatedFields = new Set<string>()

  const profileParams: Record<string, unknown> = {
    memberId,
    updatedBy: actorUserId
  }

  const departmentIdInput =
    input.departmentId !== undefined ? normalizeNullableString(input.departmentId) : undefined

  const reportsToInput =
    input.reportsTo !== undefined ? normalizeNullableString(input.reportsTo) : undefined

  if (departmentIdInput !== undefined) {
    await getMemberDepartmentContextFromPostgres(memberId)

    if (departmentIdInput) {
      const department = await getDepartmentByIdFromPostgres(departmentIdInput)

      if (!department) {
        throw new HrCoreValidationError('Department not found.', 404, { departmentId: departmentIdInput })
      }
    }
  }

  if (reportsToInput !== undefined) {
    try {
      await assertReportingLineChangeAllowed({
        memberId,
        supervisorMemberId: reportsToInput
      })
    } catch (error) {
      throw new HrCoreValidationError(error instanceof Error ? error.message : 'Invalid reporting line.', 409)
    }
  }

  const setTeamField = (column: string, paramKey: string, value: unknown) => {
    teamMemberUpdates.push(`${column} = @${paramKey}`)
    teamMemberParams[paramKey] = value
    updatedFields.add(paramKey)
  }

  const setProfileField = (column: string, paramKey: string, value: unknown) => {
    profileSelects.push(`@${paramKey} AS ${column}`)
    profileUpdates.push(`${column} = source.${column}`)
    profileInsertColumns.push(column)
    profileInsertValues.push(`source.${column}`)
    profileParams[paramKey] = value
  }

  const setPostgresField = (column: string, value: unknown) => {
    postgresMemberUpdates.push(`${column} = $${postgresMemberValues.length + 1}`)
    postgresMemberValues.push(value)
  }

  if (reportsToInput !== undefined) setTeamField('reports_to', 'reportsTo', reportsToInput)
  if (input.jobLevel !== undefined)
    setTeamField('job_level', 'jobLevel', input.jobLevel ? assertEnum(input.jobLevel, HR_JOB_LEVELS, 'jobLevel') : null)
  if (input.hireDate !== undefined) setTeamField('hire_date', 'hireDate', input.hireDate ? assertDateString(input.hireDate, 'hireDate') : null)
  if (input.contractEndDate !== undefined)
    setTeamField('contract_end_date', 'contractEndDate', input.contractEndDate ? assertDateString(input.contractEndDate, 'contractEndDate') : null)
  if (input.employmentType !== undefined)
    setTeamField(
      'employment_type',
      'employmentType',
      input.employmentType ? assertEnum(input.employmentType, HR_EMPLOYMENT_TYPES, 'employmentType') : null
    )
  if (input.dailyRequired !== undefined) setTeamField('daily_required', 'dailyRequired', Boolean(input.dailyRequired))
  if (input.phone !== undefined) setTeamField('phone', 'phone', normalizeNullableString(input.phone))
  if (input.identityDocumentType !== undefined) setProfileField('identity_document_type', 'identityDocumentType', normalizeNullableString(input.identityDocumentType))
  if (input.identityDocumentNumber !== undefined)
    setProfileField('identity_document_number', 'identityDocumentNumber', normalizeNullableString(input.identityDocumentNumber))
  if (input.emergencyContactName !== undefined)
    setProfileField('emergency_contact_name', 'emergencyContactName', normalizeNullableString(input.emergencyContactName))
  if (input.emergencyContactPhone !== undefined)
    setProfileField('emergency_contact_phone', 'emergencyContactPhone', normalizeNullableString(input.emergencyContactPhone))
  if (input.healthSystem !== undefined)
    setProfileField('health_system', 'healthSystem', input.healthSystem ? assertEnum(input.healthSystem, HR_HEALTH_SYSTEMS, 'healthSystem') : null)
  if (input.isapreName !== undefined) setProfileField('isapre_name', 'isapreName', normalizeNullableString(input.isapreName))
  if (input.bankName !== undefined) setProfileField('bank_name', 'bankName', normalizeNullableString(input.bankName))
  if (input.bankAccountType !== undefined)
    setProfileField('bank_account_type', 'bankAccountType', input.bankAccountType ? assertEnum(input.bankAccountType, HR_BANK_ACCOUNT_TYPES, 'bankAccountType') : null)
  if (input.bankAccountNumber !== undefined) setProfileField('bank_account_number', 'bankAccountNumber', normalizeNullableString(input.bankAccountNumber))
  if (input.cvUrl !== undefined) setProfileField('cv_url', 'cvUrl', normalizeNullableString(input.cvUrl))
  if (input.linkedinUrl !== undefined) setProfileField('linkedin_url', 'linkedinUrl', normalizeNullableString(input.linkedinUrl))
  if (input.portfolioUrl !== undefined) setProfileField('portfolio_url', 'portfolioUrl', normalizeNullableString(input.portfolioUrl))
  if (input.skills !== undefined) setProfileField('skills', 'skills', input.skills)
  if (input.tools !== undefined) setProfileField('tools', 'tools', input.tools)
  if (input.aiSuites !== undefined) setProfileField('ai_suites', 'aiSuites', input.aiSuites)
  if (input.strengths !== undefined) setProfileField('strengths', 'strengths', input.strengths)
  if (input.improvementAreas !== undefined) setProfileField('improvement_areas', 'improvementAreas', input.improvementAreas)
  if (input.pieceTypes !== undefined) setProfileField('piece_types', 'pieceTypes', input.pieceTypes)
  if (input.avgMonthlyVolume !== undefined)
    setProfileField(
      'avg_monthly_volume',
      'avgMonthlyVolume',
      input.avgMonthlyVolume === null ? null : assertNonNegativeNumber(input.avgMonthlyVolume, 'avgMonthlyVolume')
    )
  if (input.throughputAvg30d !== undefined)
    setProfileField(
      'throughput_avg_30d',
      'throughputAvg30d',
      input.throughputAvg30d === null ? null : assertNonNegativeNumber(input.throughputAvg30d, 'throughputAvg30d')
    )
  if (input.rpaAvg30d !== undefined)
    setProfileField('rpa_avg_30d', 'rpaAvg30d', input.rpaAvg30d === null ? null : assertNonNegativeNumber(input.rpaAvg30d, 'rpaAvg30d'))
  if (input.otdPercent30d !== undefined)
    setProfileField(
      'otd_percent_30d',
      'otdPercent30d',
      input.otdPercent30d === null ? null : assertNonNegativeNumber(input.otdPercent30d, 'otdPercent30d')
    )
  if (input.notes !== undefined) setProfileField('notes', 'notes', normalizeNullableString(input.notes))

  const nextContractType =
    input.contractType !== undefined
      ? assertEnum(input.contractType, HR_CONTRACT_TYPES, 'contractType')
      : normalizeContractType(existingContract?.contract_type)

  const scheduleConfig = SCHEDULE_DEFAULTS[nextContractType]

  if (
    input.dailyRequired !== undefined &&
    !scheduleConfig.overridable &&
    input.dailyRequired !== scheduleConfig.defaultValue
  ) {
    throw new HrCoreValidationError('schedule_required cannot be overridden for this contract type.', 400, {
      contractType: nextContractType
    })
  }

  const nextContractEndDate =
    input.contractEndDate !== undefined
      ? (input.contractEndDate ? assertDateString(input.contractEndDate, 'contractEndDate') : null)
      : toDateStringFromAny(existingContract?.contract_end_date)

  if (nextContractType === 'plazo_fijo' && !nextContractEndDate) {
    throw new HrCoreValidationError('contractEndDate is required for plazo_fijo contracts.', 400)
  }

  const nextDeelContractId =
    input.deelContractId !== undefined
      ? normalizeNullableString(input.deelContractId)
      : normalizeNullableString(existingContract?.deel_contract_id)

  if ((nextContractType === 'contractor' || nextContractType === 'eor') && !nextDeelContractId) {
    throw new HrCoreValidationError('deelContractId is required for contractor and eor contracts.', 400)
  }

  if (input.contractType !== undefined || input.deelContractId !== undefined || input.dailyRequired !== undefined) {
    const derivation = CONTRACT_DERIVATIONS[nextContractType]

    const nextDailyRequired = resolveScheduleRequired({
      contractType: nextContractType,
      scheduleRequired: input.dailyRequired
    })

    setPostgresField('contract_type', nextContractType)
    setPostgresField('pay_regime', derivation.payRegime)
    setPostgresField('payroll_via', derivation.payrollVia)
    setPostgresField('daily_required', nextDailyRequired)
    setPostgresField('deel_contract_id', derivation.payrollVia === 'deel' ? nextDeelContractId : null)
    updatedFields.add('contract')
  }

  if (input.contractEndDate !== undefined) setPostgresField('contract_end_date', nextContractEndDate)
  if (input.hireDate !== undefined) setPostgresField('hire_date', input.hireDate ? assertDateString(input.hireDate, 'hireDate') : null)
  if (input.jobLevel !== undefined)
    setPostgresField('job_level', input.jobLevel ? assertEnum(input.jobLevel, HR_JOB_LEVELS, 'jobLevel') : null)
  if (input.employmentType !== undefined)
    setPostgresField(
      'employment_type',
      input.employmentType ? assertEnum(input.employmentType, HR_EMPLOYMENT_TYPES, 'employmentType') : null
    )
  if (input.phone !== undefined) setPostgresField('phone', normalizeNullableString(input.phone))

  if (teamMemberUpdates.length > 0) {
    await runHrCoreQuery(
      `
        UPDATE \`${projectId}.greenhouse.team_members\`
        SET ${teamMemberUpdates.join(', ')}
        WHERE member_id = @memberId
      `,
      teamMemberParams
    )
  }

  if (profileUpdates.length > 0) {
    await runHrCoreQuery(
      `
        MERGE \`${projectId}.greenhouse.member_profiles\` AS target
        USING (
          SELECT
            @memberId AS member_id,
            ${profileSelects.join(',\n            ')},
            @updatedBy AS updated_by
        ) AS source
        ON target.member_id = source.member_id
        WHEN MATCHED THEN
          UPDATE SET
            ${profileUpdates.join(',\n            ')},
            updated_by = source.updated_by,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            member_id,
            ${profileInsertColumns.join(',\n            ')},
            updated_by,
            created_at,
            updated_at
          )
          VALUES (
            source.member_id,
            ${profileInsertValues.join(',\n            ')},
            source.updated_by,
            CURRENT_TIMESTAMP(),
            CURRENT_TIMESTAMP()
          )
      `,
      profileParams
    )
  }

  if (postgresMemberUpdates.length > 0) {
    postgresMemberValues.push(memberId)

    await runGreenhousePostgresQuery(
      `
        UPDATE greenhouse_core.members
        SET ${postgresMemberUpdates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE member_id = $${postgresMemberValues.length}
      `,
      postgresMemberValues
    )
  }

  if (reportsToInput !== undefined) {
    await upsertReportingLine({
      memberId,
      supervisorMemberId: reportsToInput,
      actorUserId,
      reason: 'hr_core_profile_update',
      sourceSystem: 'hr_core_profile_update',
      sourceMetadata: {
        actor: 'updateMemberHrProfile'
      }
    })
  }

  if (departmentIdInput !== undefined) {
    await updateMemberDepartmentContextInPostgres({
      memberId,
      departmentId: departmentIdInput
    })
  }

  if (updatedFields.size > 0 || postgresMemberUpdates.length > 0 || departmentIdInput !== undefined) {
    if (departmentIdInput !== undefined) {
      updatedFields.add('departmentId')
    }

    await publishOutboxEvent({
      aggregateType: AGGREGATE_TYPES.member,
      aggregateId: memberId,
      eventType: EVENT_TYPES.memberUpdated,
      payload: {
        memberId,
        updatedFields: Array.from(updatedFields)
      }
    })
  }
}

export const listLeaveBalances = async ({
  tenant,
  memberId,
  year
}: {
  tenant: TenantContext
  memberId?: string | null
  year?: number | null
}): Promise<HrLeaveBalancesResponse> => {
  const fallback = async (): Promise<HrLeaveBalancesResponse> => {
    await assertHrCoreInfrastructureReady()
    const effectiveYear = year || getCurrentYear()
    const effectiveMemberId = memberId || (isHrAdminTenant(tenant) ? null : (await resolveTenantMember(tenant)).member_id)

    if (effectiveMemberId) {
      await assertMemberVisibleToTenant(tenant, effectiveMemberId)
      await ensureYearBalances({
        memberId: effectiveMemberId,
        year: effectiveYear,
        actorUserId: tenant.userId
      })
    } else if (isHrAdminTenant(tenant)) {
      await ensureYearBalancesForAllActiveMembers({
        year: effectiveYear,
        actorUserId: tenant.userId
      })
    }

    const projectId = getProjectId()
    const filters = ['b.year = @year']
    const params: Record<string, unknown> = { year: effectiveYear }

    if (effectiveMemberId) {
      filters.push('b.member_id = @memberId')
      params.memberId = effectiveMemberId
    } else if (!isHrAdminTenant(tenant)) {
      throw new HrCoreValidationError('Forbidden', 403)
    }

    const rows = await runHrCoreQuery<LeaveBalanceRow>(
      `
        SELECT
          b.balance_id,
          b.member_id,
          m.display_name AS member_name,
          b.leave_type_code,
          lt.leave_type_name,
          b.year,
          b.allowance_days,
          b.carried_over_days,
          b.used_days,
          b.reserved_days
        FROM \`${projectId}.greenhouse.leave_balances\` AS b
        LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
          ON m.member_id = b.member_id
        LEFT JOIN \`${projectId}.greenhouse.leave_types\` AS lt
          ON lt.leave_type_code = b.leave_type_code
        WHERE ${filters.join(' AND ')}
        ORDER BY m.display_name ASC, lt.leave_type_name ASC
      `,
      params
    )

    const balances = rows.map(mapLeaveBalance)

    return {
      balances,
      summary: {
        memberCount: new Set(balances.map(balance => balance.memberId)).size,
        totalAvailableDays: balances.reduce((sum, balance) => sum + balance.availableDays, 0)
      }
    }
  }

  return withHrLeavePostgresFallback({
    operation: 'listLeaveBalances',
    postgres: () => listLeaveBalancesFromPostgres({ tenant, memberId, year }),
    fallback
  })
}

export const listLeaveRequests = async ({
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
  const fallback = async (): Promise<HrLeaveRequestsResponse> => {
    await assertHrCoreInfrastructureReady()
    const currentMember = isHrAdminTenant(tenant) ? null : await resolveTenantMember(tenant)
    const effectiveYear = year || null
    const projectId = getProjectId()
    const filters = ['1 = 1']
    const params: Record<string, unknown> = {}

    if (isHrAdminTenant(tenant)) {
      if (memberId) {
        filters.push('r.member_id = @memberId')
        params.memberId = memberId
      }
    } else {
      filters.push('(r.member_id = @currentMemberId OR r.supervisor_member_id = @currentMemberId)')
      params.currentMemberId = currentMember?.member_id || ''
    }

    if (status) {
      filters.push('r.status = @status')
      params.status = status
    }

    if (effectiveYear) {
      filters.push('EXTRACT(YEAR FROM r.start_date) = @year')
      params.year = effectiveYear
    }

    const rows = await runHrCoreQuery<LeaveRequestRow>(
      `
        SELECT
          r.request_id,
          r.member_id,
          m.display_name AS member_name,
          m.email AS member_email,
          m.avatar_url AS member_avatar_url,
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
        FROM \`${projectId}.greenhouse.leave_requests\` AS r
        LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
          ON m.member_id = r.member_id
        LEFT JOIN \`${projectId}.greenhouse.team_members\` AS supervisor
          ON supervisor.member_id = r.supervisor_member_id
        LEFT JOIN \`${projectId}.greenhouse.leave_types\` AS lt
          ON lt.leave_type_code = r.leave_type_code
        WHERE ${filters.join(' AND ')}
        ORDER BY r.created_at DESC
      `,
      params
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

  return withHrLeavePostgresFallback({
    operation: 'listLeaveRequests',
    postgres: () => listLeaveRequestsFromPostgres({ tenant, memberId, status, year }),
    fallback
  })
}

export const getLeaveRequestById = async ({
  tenant,
  requestId
}: {
  tenant: TenantContext
  requestId: string
}) => {
  const fallback = async () => {
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

  return withHrLeavePostgresFallback({
    operation: 'getLeaveRequestById',
    postgres: () => getLeaveRequestByIdFromPostgres({ tenant, requestId }),
    fallback
  })
}

export const listLeaveCalendar = async ({
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
  return listLeaveCalendarFromPostgres({ tenant, from, to, memberId })
}

export const createLeaveRequest = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: CreateLeaveRequestInput
  actorUserId: string
}) => {
  const fallback = async () => {
    await assertHrCoreInfrastructureReady()
    const projectId = getProjectId()
    const currentMember = await resolveTenantMember(tenant)
    const effectiveMemberId = isHrAdminTenant(tenant) ? normalizeString(input.memberId || currentMember.member_id) : String(currentMember.member_id || '')
    const member = await getMemberResolverById(effectiveMemberId)
    const leaveTypeCode = normalizeString(input.leaveTypeCode)
    const leaveTypes = await getLeaveTypesInternal()
    const leaveType = leaveTypes.find(item => item.leaveTypeCode === leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const startDate = assertDateString(input.startDate, 'startDate')
    const endDate = assertDateString(input.endDate, 'endDate')
    const requestedDays = assertNonNegativeNumber(input.requestedDays, 'requestedDays')

    if (endDate < startDate) {
      throw new HrCoreValidationError('endDate must be greater than or equal to startDate.')
    }

    const year = Number(startDate.slice(0, 4))

    await ensureYearBalances({ memberId: effectiveMemberId, year, actorUserId })

    if (leaveType.defaultAnnualAllowanceDays > 0) {
      const balance = await getBalanceRow({ memberId: effectiveMemberId, leaveTypeCode, year })

      if (!balance || balance.availableDays < requestedDays) {
        throw new HrCoreValidationError('Insufficient leave balance.', 409, {
          availableDays: balance?.availableDays ?? 0
        })
      }
    }

    const requestId = `leave-${randomUUID()}`
    const supervisorMemberId = normalizeNullableString(member.reports_to)
    const status = supervisorMemberId ? 'pending_supervisor' : 'pending_hr'

    await runHrCoreQuery(
      `
        INSERT INTO \`${projectId}.greenhouse.leave_requests\` (
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
          created_by,
          created_at,
          updated_at
        )
        VALUES (
          @requestId,
          @memberId,
          @leaveTypeCode,
          DATE(@startDate),
          DATE(@endDate),
          @requestedDays,
          @status,
          @reason,
          @attachmentUrl,
          @supervisorMemberId,
          @notes,
          @createdBy,
          CURRENT_TIMESTAMP(),
          CURRENT_TIMESTAMP()
        )
      `,
      {
        requestId,
        memberId: effectiveMemberId,
        leaveTypeCode,
        startDate,
        endDate,
        requestedDays,
        status,
        reason: normalizeNullableString(input.reason),
        attachmentUrl: normalizeNullableString(input.attachmentUrl),
        supervisorMemberId,
        notes: normalizeNullableString(input.notes),
        createdBy: actorUserId
      }
    )

    await runHrCoreQuery(
      `
        INSERT INTO \`${projectId}.greenhouse.leave_request_actions\` (
          action_id,
          request_id,
          action,
          actor_user_id,
          actor_member_id,
          actor_name,
          notes,
          created_at
        )
        VALUES (
          @actionId,
          @requestId,
          'submit',
          @actorUserId,
          @actorMemberId,
          @actorName,
          @notes,
          CURRENT_TIMESTAMP()
        )
      `,
      {
        actionId: `leave-action-${randomUUID()}`,
        requestId,
        actorUserId,
        actorMemberId: currentMember.member_id,
        actorName: currentMember.display_name,
        notes: normalizeNullableString(input.notes)
      }
    )

    if (leaveType.defaultAnnualAllowanceDays > 0 && requestedDays > 0) {
      await adjustBalanceForRequest({
        request: {
          requestId,
          memberId: effectiveMemberId,
          memberName: normalizeNullableString(member.display_name),
          memberAvatarUrl: null,
          leaveTypeCode,
          leaveTypeName: leaveType.leaveTypeName,
          startDate,
          endDate,
          startPeriod: 'full_day' as const,
          endPeriod: 'full_day' as const,
          requestedDays,
          status,
          reason: normalizeNullableString(input.reason),
          attachmentUrl: normalizeNullableString(input.attachmentUrl),
          supervisorMemberId,
          supervisorName: null,
          hrReviewerUserId: null,
          decidedAt: null,
          decidedBy: null,
          notes: normalizeNullableString(input.notes),
          createdAt: null
        },
        reservedDelta: 1,
        usedDelta: 0,
        actorUserId
      })
    }

    const created = await getLeaveRequestByIdInternal(requestId)

    if (!created) {
      throw new HrCoreValidationError('Created leave request could not be reloaded.', 500)
    }

    return created
  }

  return withHrLeavePostgresFallback({
    operation: 'createLeaveRequest',
    postgres: () => createLeaveRequestInPostgres({ tenant, input, actorUserId }),
    fallback
  })
}

export const reviewLeaveRequest = async ({
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
  const fallback = async () => {
    await assertHrCoreInfrastructureReady()
    const projectId = getProjectId()
    const request = await getLeaveRequestByIdInternal(requestId)

    if (!request) {
      throw new HrCoreValidationError('Leave request not found.', 404)
    }

    const action = assertEnum(input.action, ['approve', 'reject', 'cancel'] as const, 'action')
    const notes = normalizeNullableString(input.notes)
    const actorMember = await resolveTenantMember(tenant).catch(() => null)
    const actorMemberId = actorMember?.member_id || null
    const actorName = actorMember?.display_name || tenant.userId
    const hasHrAdminAccess = isHrAdminTenant(tenant)

    const requestForReview: HrLeaveRequest = {
      ...request,
      approvalStageCode: getLeaveApprovalStageCode(request.status)
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
      await runHrCoreQuery(
        `
          UPDATE \`${projectId}.greenhouse.leave_requests\`
          SET
            status = 'cancelled',
            decided_at = CURRENT_TIMESTAMP(),
            decided_by = @decidedBy,
            notes = @notes,
            updated_at = CURRENT_TIMESTAMP()
          WHERE request_id = @requestId
        `,
        {
          requestId,
          decidedBy: actorName,
          notes
        }
      )

      if (request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
          reservedDelta: -1,
          usedDelta: 0,
          actorUserId
        })
      }
    } else if (!hasHrAdminAccess) {
      await runHrCoreQuery(
        `
          UPDATE \`${projectId}.greenhouse.leave_requests\`
          SET
            status = @status,
            decided_at = CASE WHEN @status = 'rejected' THEN CURRENT_TIMESTAMP() ELSE decided_at END,
            decided_by = CASE WHEN @status = 'rejected' THEN @decidedBy ELSE decided_by END,
            notes = @notes,
            updated_at = CURRENT_TIMESTAMP()
          WHERE request_id = @requestId
        `,
        {
          requestId,
          status: action === 'approve' ? 'pending_hr' : 'rejected',
          decidedBy: actorName,
          notes
        }
      )

      if (action === 'reject' && request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
          reservedDelta: -1,
          usedDelta: 0,
          actorUserId
        })
      }
    } else {
      await runHrCoreQuery(
        `
          UPDATE \`${projectId}.greenhouse.leave_requests\`
          SET
            status = @status,
            hr_reviewer_user_id = @hrReviewerUserId,
            decided_at = CURRENT_TIMESTAMP(),
            decided_by = @decidedBy,
            notes = @notes,
            updated_at = CURRENT_TIMESTAMP()
          WHERE request_id = @requestId
        `,
        {
          requestId,
          status: action === 'approve' ? 'approved' : 'rejected',
          hrReviewerUserId: tenant.userId,
          decidedBy: actorName,
          notes
        }
      )

      if (request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
          reservedDelta: -1,
          usedDelta: action === 'approve' ? 1 : 0,
          actorUserId
        })
      }
    }

    await runHrCoreQuery(
      `
        INSERT INTO \`${projectId}.greenhouse.leave_request_actions\` (
          action_id,
          request_id,
          action,
          actor_user_id,
          actor_member_id,
          actor_name,
          notes,
          created_at
        )
        VALUES (
          @actionId,
          @requestId,
          @action,
          @actorUserId,
          @actorMemberId,
          @actorName,
          @notes,
          CURRENT_TIMESTAMP()
        )
      `,
      {
        actionId: `leave-action-${randomUUID()}`,
        requestId,
        action,
        actorUserId,
        actorMemberId,
        actorName,
        notes
      }
    )

    const updated = await getLeaveRequestByIdInternal(requestId)

    if (!updated) {
      throw new HrCoreValidationError('Updated leave request could not be reloaded.', 500)
    }

    return updated
  }

  return withHrLeavePostgresFallback({
    operation: 'reviewLeaveRequest',
    postgres: () => reviewLeaveRequestInPostgres({ tenant, requestId, input, actorUserId }),
    fallback
  })
}

export const createLeaveBackfill = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: HrLeaveBackfillInput
  actorUserId: string
}) => {
  if (!isHrCoreLeavePostgresEnabled()) {
    throw new HrCoreValidationError('Leave backfills require the PostgreSQL HR leave runtime.', 503)
  }

  return createLeaveBackfillInPostgres({ tenant, input, actorUserId })
}

export const listLeaveBalanceAdjustments = async ({
  tenant,
  memberId,
  year
}: {
  tenant: TenantContext
  memberId?: string | null
  year?: number | null
}): Promise<HrLeaveBalanceAdjustmentsResponse> => {
  if (!isHrCoreLeavePostgresEnabled()) {
    throw new HrCoreValidationError('Leave adjustments require the PostgreSQL HR leave runtime.', 503)
  }

  return listLeaveBalanceAdjustmentsFromPostgres({ tenant, memberId, year })
}

export const createLeaveBalanceAdjustment = async ({
  tenant,
  input,
  actorUserId
}: {
  tenant: TenantContext
  input: HrLeaveBalanceAdjustmentInput
  actorUserId: string
}) => {
  if (!isHrCoreLeavePostgresEnabled()) {
    throw new HrCoreValidationError('Leave adjustments require the PostgreSQL HR leave runtime.', 503)
  }

  return createLeaveBalanceAdjustmentInPostgres({ tenant, input, actorUserId })
}

export const reverseLeaveBalanceAdjustment = async ({
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
  if (!isHrCoreLeavePostgresEnabled()) {
    throw new HrCoreValidationError('Leave adjustments require the PostgreSQL HR leave runtime.', 503)
  }

  return reverseLeaveBalanceAdjustmentInPostgres({
    tenant,
    adjustmentId,
    input,
    actorUserId
  })
}

export const listAttendance = async ({
  tenant,
  memberId,
  dateFrom,
  dateTo,
  status
}: {
  tenant: TenantContext
  memberId?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  status?: string | null
}): Promise<HrAttendanceResponse> => {
  await assertHrCoreInfrastructureReady()
  const currentMember = isHrAdminTenant(tenant) ? null : await resolveTenantMember(tenant)
  const projectId = getProjectId()
  const filters = ['1 = 1']
  const params: Record<string, unknown> = {}

  if (isHrAdminTenant(tenant)) {
    if (memberId) {
      filters.push('a.member_id = @memberId')
      params.memberId = memberId
    }
  } else {
    filters.push('a.member_id = @currentMemberId')
    params.currentMemberId = currentMember?.member_id || ''
  }

  if (dateFrom) {
    filters.push('a.attendance_date >= DATE(@dateFrom)')
    params.dateFrom = assertDateString(dateFrom, 'dateFrom')
  }

  if (dateTo) {
    filters.push('a.attendance_date <= DATE(@dateTo)')
    params.dateTo = assertDateString(dateTo, 'dateTo')
  }

  if (status) {
    filters.push('a.attendance_status = @status')
    params.status = status
  }

  const rows = await runHrCoreQuery<AttendanceRow>(
    `
      SELECT
        a.attendance_id,
        a.member_id,
        m.display_name AS member_name,
        a.attendance_date,
        a.attendance_status,
        a.source_system,
        a.source_reference,
        a.check_in_at,
        a.meeting_joined_at,
        a.meeting_left_at,
        a.minutes_present,
        a.notes,
        a.recorded_by,
        a.updated_at
      FROM \`${projectId}.greenhouse.attendance_daily\` AS a
      LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
        ON m.member_id = a.member_id
      WHERE ${filters.join(' AND ')}
      ORDER BY a.attendance_date DESC, m.display_name ASC
    `,
    params
  )

  const records = rows.map(mapAttendance)

  return {
    records,
    summary: {
      total: records.length,
      present: records.filter(record => record.attendanceStatus === 'present').length,
      late: records.filter(record => record.attendanceStatus === 'late').length,
      absent: records.filter(record => record.attendanceStatus === 'absent').length,
      excused: records.filter(record => record.attendanceStatus === 'excused').length
    }
  }
}

export const ingestAttendanceRecords = async ({
  entries,
  recordedBy
}: {
  entries: RecordAttendanceInput[]
  recordedBy: string
}) => {
  await assertHrCoreInfrastructureReady()
  const projectId = getProjectId()
  const results: HrAttendanceRecord[] = []

  for (const entry of entries) {
    const memberId = normalizeNullableString(entry.memberId)
    const participantEmail = normalizeNullableString(entry.participantEmail)?.toLowerCase() || null
    const member = memberId ? await getMemberResolverById(memberId) : participantEmail ? await resolveMemberByEmail(participantEmail) : null

    if (!member?.member_id) {
      throw new HrCoreValidationError('Unable to resolve attendance member.', 404, {
        memberId,
        participantEmail
      })
    }

    const attendanceDate = assertDateString(entry.attendanceDate, 'attendanceDate')
    const attendanceStatus = assertEnum(entry.attendanceStatus, HR_ATTENDANCE_STATUSES, 'attendanceStatus')
    const sourceSystem = normalizeString(entry.sourceSystem) || 'teams'
    const sourceReference = normalizeNullableString(entry.sourceReference)
    const attendanceId = `${member.member_id}-${attendanceDate}-${sourceSystem}`

    await runHrCoreQuery(
      `
        MERGE \`${projectId}.greenhouse.attendance_daily\` AS target
        USING (
          SELECT
            @attendanceId AS attendance_id,
            @memberId AS member_id,
            DATE(@attendanceDate) AS attendance_date,
            @attendanceStatus AS attendance_status,
            @sourceSystem AS source_system,
            @sourceReference AS source_reference,
            @checkInAt AS check_in_at,
            @meetingJoinedAt AS meeting_joined_at,
            @meetingLeftAt AS meeting_left_at,
            @minutesPresent AS minutes_present,
            @notes AS notes,
            @recordedBy AS recorded_by
        ) AS source
        ON target.attendance_id = source.attendance_id
        WHEN MATCHED THEN
          UPDATE SET
            attendance_status = source.attendance_status,
            source_reference = source.source_reference,
            check_in_at = source.check_in_at,
            meeting_joined_at = source.meeting_joined_at,
            meeting_left_at = source.meeting_left_at,
            minutes_present = source.minutes_present,
            notes = source.notes,
            recorded_by = source.recorded_by,
            updated_at = CURRENT_TIMESTAMP()
        WHEN NOT MATCHED THEN
          INSERT (
            attendance_id,
            member_id,
            attendance_date,
            attendance_status,
            source_system,
            source_reference,
            check_in_at,
            meeting_joined_at,
            meeting_left_at,
            minutes_present,
            notes,
            recorded_by,
            created_at,
            updated_at
          )
          VALUES (
            source.attendance_id,
            source.member_id,
            source.attendance_date,
            source.attendance_status,
            source.source_system,
            source.source_reference,
            source.check_in_at,
            source.meeting_joined_at,
            source.meeting_left_at,
            source.minutes_present,
            source.notes,
            source.recorded_by,
            CURRENT_TIMESTAMP(),
            CURRENT_TIMESTAMP()
          )
      `,
      {
        attendanceId,
        memberId: member.member_id,
        attendanceDate,
        attendanceStatus,
        sourceSystem,
        sourceReference,
        checkInAt: normalizeNullableString(entry.checkInAt),
        meetingJoinedAt: normalizeNullableString(entry.meetingJoinedAt),
        meetingLeftAt: normalizeNullableString(entry.meetingLeftAt),
        minutesPresent:
          entry.minutesPresent === undefined || entry.minutesPresent === null
            ? null
            : assertPositiveInteger(entry.minutesPresent, 'minutesPresent', { min: 0 }),
        notes: normalizeNullableString(entry.notes),
        recordedBy
      }
    )

    const [row] = await runHrCoreQuery<AttendanceRow>(
      `
        SELECT
          a.attendance_id,
          a.member_id,
          m.display_name AS member_name,
          a.attendance_date,
          a.attendance_status,
          a.source_system,
          a.source_reference,
          a.check_in_at,
          a.meeting_joined_at,
          a.meeting_left_at,
          a.minutes_present,
          a.notes,
          a.recorded_by,
          a.updated_at
        FROM \`${projectId}.greenhouse.attendance_daily\` AS a
        LEFT JOIN \`${projectId}.greenhouse.team_members\` AS m
          ON m.member_id = a.member_id
        WHERE a.attendance_id = @attendanceId
        LIMIT 1
      `,
      { attendanceId }
    )

    if (row) {
      results.push(mapAttendance(row))
    }
  }

  return {
    records: results,
    summary: {
      total: results.length,
      present: results.filter(record => record.attendanceStatus === 'present').length,
      late: results.filter(record => record.attendanceStatus === 'late').length,
      absent: results.filter(record => record.attendanceStatus === 'absent').length,
      excused: results.filter(record => record.attendanceStatus === 'excused').length
    }
  }
}

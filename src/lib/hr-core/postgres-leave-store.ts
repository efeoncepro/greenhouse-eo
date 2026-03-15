import 'server-only'

import { randomUUID } from 'node:crypto'

import type { PoolClient } from 'pg'

import type {
  CreateLeaveRequestInput,
  HrCoreMetadata,
  HrDepartment,
  HrLeaveBalance,
  HrLeaveBalancesResponse,
  HrLeaveRequest,
  HrLeaveRequestsResponse,
  HrLeaveType,
  ReviewLeaveRequestInput
} from '@/types/hr-core'
import type { TenantContext } from '@/lib/tenant/get-tenant-context'

import {
  isGreenhousePostgresConfigured,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
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
  assertNonNegativeNumber,
  isHrAdminTenant,
  normalizeNullableString,
  normalizeString,
  toInt,
  toNullableNumber
} from '@/lib/hr-core/shared'

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
  carried_over_days: number | string | null
  used_days: number | string | null
  reserved_days: number | string | null
}

type PostgresLeaveRequestRow = {
  request_id: string
  member_id: string
  member_name: string | null
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
}

type PostgresUserRow = {
  user_id: string
  email: string | null
  identity_profile_id: string | null
}

const HR_CORE_POSTGRES_REQUIRED_TABLES = [
  'greenhouse_core.client_users',
  'greenhouse_core.departments',
  'greenhouse_core.members',
  'greenhouse_hr.leave_types',
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
  const carriedOverDays = toNullableNumber(row.carried_over_days) ?? 0
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
    carriedOverDays,
    usedDays,
    reservedDays,
    availableDays: allowanceDays + carriedOverDays - usedDays - reservedDays
  }
}

const mapLeaveRequest = (row: PostgresLeaveRequestRow): HrLeaveRequest => ({
  requestId: row.request_id,
  memberId: row.member_id,
  memberName: normalizeNullableString(row.member_name),
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

const getMemberById = async (memberId: string, client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const [row] = await queryRows<PostgresMemberResolverRow>(
    `
      SELECT
        member_id,
        display_name,
        primary_email AS email,
        identity_profile_id,
        reports_to_member_id AS reports_to
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
        m.reports_to_member_id AS reports_to
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
  await client.query(
    `
      INSERT INTO greenhouse_hr.leave_balances (
        balance_id,
        member_id,
        leave_type_code,
        year,
        allowance_days,
        carried_over_days,
        used_days,
        reserved_days,
        updated_by_user_id
      )
      SELECT
        $1 || '-' || $2::text || '-' || lt.leave_type_code,
        $1,
        lt.leave_type_code,
        $2,
        COALESCE(lt.default_annual_allowance_days, 0),
        0,
        0,
        0,
        $3
      FROM greenhouse_hr.leave_types AS lt
      WHERE lt.active = TRUE
      ON CONFLICT (member_id, leave_type_code, year) DO NOTHING
    `,
    [memberId, year, actorUserId]
  )
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
        b.carried_over_days,
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
  reservedDelta,
  usedDelta,
  actorUserId,
  client
}: {
  request: HrLeaveRequest
  reservedDelta: number
  usedDelta: number
  actorUserId: string
  client: PoolClient
}) => {
  const year = Number(request.startDate.slice(0, 4))

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
    [request.memberId, request.leaveTypeCode, year, reservedDelta, usedDelta, actorUserId]
  )
}

const publishLeaveOutboxEvent = async ({
  eventType,
  aggregateId,
  payload,
  client
}: {
  eventType: string
  aggregateId: string
  payload: Record<string, unknown>
  client: PoolClient
}) => {
  await client.query(
    `
      INSERT INTO greenhouse_sync.outbox_events (
        event_id,
        aggregate_type,
        aggregate_id,
        event_type,
        payload_json
      )
      VALUES ($1, 'hr_leave_request', $2, $3, $4::jsonb)
    `,
    [`outbox-${randomUUID()}`, aggregateId, eventType, JSON.stringify(payload)]
  )
}

const getLeaveRequestByIdInternal = async (requestId: string, client?: PoolClient) => {
  await assertHrCoreLeavePostgresReady()

  const [row] = await queryRows<PostgresLeaveRequestRow>(
    `
      SELECT
        r.request_id,
        r.member_id,
        member.display_name AS member_name,
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
        b.carried_over_days,
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
  const requestedDays = assertNonNegativeNumber(input.requestedDays, 'requestedDays')

  if (endDate < startDate) {
    throw new HrCoreValidationError('endDate must be greater than or equal to startDate.')
  }

  return withGreenhousePostgresTransaction(async client => {
    const member = await getMemberById(effectiveMemberId, client)
    const leaveTypes = await listLeaveTypesInternal(client)
    const leaveType = leaveTypes.find(item => item.leaveTypeCode === leaveTypeCode)

    if (!leaveType) {
      throw new HrCoreValidationError('Leave type not found.', 404)
    }

    const year = Number(startDate.slice(0, 4))

    await ensureYearBalances({
      memberId: effectiveMemberId,
      year,
      actorUserId,
      client
    })

    if (leaveType.defaultAnnualAllowanceDays > 0) {
      const balance = await getBalanceByKey({
        memberId: effectiveMemberId,
        leaveTypeCode,
        year,
        client
      })

      if (!balance || balance.availableDays < requestedDays) {
        throw new HrCoreValidationError('Insufficient leave balance.', 409, {
          availableDays: balance?.availableDays ?? 0
        })
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
      createdAt: null
    }

    if (leaveType.defaultAnnualAllowanceDays > 0 && requestedDays > 0) {
      await adjustBalanceForRequest({
        request: created,
        reservedDelta: requestedDays,
        usedDelta: 0,
        actorUserId,
        client
      })
    }

    await publishLeaveOutboxEvent({
      eventType: 'leave_request.created',
      aggregateId: requestId,
      payload: {
        requestId,
        memberId: effectiveMemberId,
        leaveTypeCode,
        status,
        startDate,
        endDate,
        requestedDays
      },
      client
    })

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

      if (request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
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

      if (action === 'reject' && request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
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

      if (request.requestedDays > 0) {
        await adjustBalanceForRequest({
          request,
          reservedDelta: -request.requestedDays,
          usedDelta: action === 'approve' ? request.requestedDays : 0,
          actorUserId,
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

    await publishLeaveOutboxEvent({
      eventType: 'leave_request.reviewed',
      aggregateId: requestId,
      payload: {
        requestId,
        action,
        actorUserId,
        actorMemberId,
        reviewedBy: actorName
      },
      client
    })

    const updated = await getLeaveRequestByIdInternal(requestId, client)

    if (!updated) {
      throw new HrCoreValidationError('Updated leave request could not be reloaded.', 500)
    }

    return updated
  })
}

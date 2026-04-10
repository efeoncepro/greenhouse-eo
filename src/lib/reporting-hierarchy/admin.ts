import 'server-only'

import { sql } from 'kysely'

import { getDb, withTransaction } from '@/lib/db'
import { listDirectReports } from '@/lib/reporting-hierarchy/readers'
import { upsertReportingLine, upsertReportingLineInTransaction } from '@/lib/reporting-hierarchy/store'
import {
  createResponsibilityInTransaction,
  revokeResponsibility,
  revokeResponsibilityInTransaction
} from '@/lib/operational-responsibility/store'
import { HrCoreValidationError, normalizeNullableString, normalizeString } from '@/lib/hr-core/shared'

import type {
  HrHierarchyDelegationRecord,
  HrHierarchyHistoryRecord,
  HrHierarchyRecord
} from '@/types/hr-core'

type HierarchyListFilters = {
  memberId?: string | null
  supervisorMemberId?: string | null
  departmentId?: string | null
  search?: string | null
  includeInactive?: boolean
  withoutSupervisor?: boolean
}

type HierarchyHistoryFilters = {
  memberId?: string | null
  supervisorMemberId?: string | null
  limit?: number
}

type HierarchyListRow = {
  reporting_line_id: string
  member_id: string
  member_name: string | null
  member_active: boolean
  role_title: string | null
  department_id: string | null
  department_name: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
  supervisor_active: boolean | null
  effective_from: string
  source_system: string
  change_reason: string
  changed_by_user_id: string | null
  direct_reports_count: number | string | null
  subtree_size: number | string | null
  depth: number | string | null
  delegation_responsibility_id: string | null
  delegation_delegate_member_id: string | null
  delegation_delegate_member_name: string | null
  delegation_effective_from: string | null
  delegation_effective_to: string | null
}

type HierarchyHistoryRow = {
  reporting_line_id: string
  member_id: string
  member_name: string | null
  supervisor_member_id: string | null
  supervisor_name: string | null
  previous_supervisor_member_id: string | null
  previous_supervisor_name: string | null
  effective_from: string | Date
  effective_to: string | Date | null
  source_system: string
  change_reason: string
  changed_by_user_id: string | null
  changed_by_name: string | null
  created_at: string | Date
}

type DelegationRow = {
  responsibility_id: string
  supervisor_member_id: string
  supervisor_name: string | null
  delegate_member_id: string
  delegate_member_name: string | null
  effective_from: string | Date
  effective_to: string | Date | null
  active: boolean
  is_primary: boolean
  created_at: string | Date
  updated_at: string | Date
}

type AssignApprovalDelegationInput = {
  supervisorMemberId: string
  delegateMemberId: string
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

type ChangeSupervisorInput = {
  memberId: string
  supervisorMemberId: string | null
  actorUserId: string
  reason: string
  effectiveFrom?: string | null
}

type BulkReassignDirectReportsInput = {
  currentSupervisorMemberId: string
  nextSupervisorMemberId: string | null
  actorUserId: string
  reason: string
  effectiveFrom?: string | null
}

const toNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number') {
    return value
  }

  const parsed = Number(value ?? 0)

  return Number.isFinite(parsed) ? parsed : 0
}

const assertRequired = (value: unknown, label: string) => {
  const normalized = normalizeString(value)

  if (!normalized) {
    throw new HrCoreValidationError(`${label} is required.`)
  }

  return normalized
}

const sanitizeEffectiveFrom = (value: unknown) => {
  const normalized = normalizeNullableString(value)

  return normalized || new Date().toISOString()
}

const sanitizeEffectiveTo = (value: unknown) => normalizeNullableString(value)

export const formatTimestampLike = (value: string | Date | null | undefined) => {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString()
}

const mapHierarchyRow = (row: HierarchyListRow): HrHierarchyRecord => ({
  reportingLineId: row.reporting_line_id,
  memberId: row.member_id,
  memberName: row.member_name || row.member_id,
  memberActive: Boolean(row.member_active),
  roleTitle: normalizeNullableString(row.role_title),
  departmentId: normalizeNullableString(row.department_id),
  departmentName: normalizeNullableString(row.department_name),
  supervisorMemberId: normalizeNullableString(row.supervisor_member_id),
  supervisorName: normalizeNullableString(row.supervisor_name),
  supervisorActive: row.supervisor_active == null ? null : Boolean(row.supervisor_active),
  effectiveFrom: row.effective_from,
  sourceSystem: row.source_system,
  changeReason: row.change_reason,
  changedByUserId: normalizeNullableString(row.changed_by_user_id),
  directReportsCount: toNumber(row.direct_reports_count),
  subtreeSize: toNumber(row.subtree_size),
  depth: toNumber(row.depth),
  isRoot: !row.supervisor_member_id,
  delegation: row.delegation_responsibility_id
    ? {
        responsibilityId: row.delegation_responsibility_id,
        delegateMemberId: row.delegation_delegate_member_id || '',
        delegateMemberName: normalizeNullableString(row.delegation_delegate_member_name),
        effectiveFrom: row.delegation_effective_from || '',
        effectiveTo: normalizeNullableString(row.delegation_effective_to)
      }
    : null
})

const mapDelegationRow = (row: DelegationRow): HrHierarchyDelegationRecord => ({
  responsibilityId: row.responsibility_id,
  supervisorMemberId: row.supervisor_member_id,
  supervisorName: normalizeNullableString(row.supervisor_name),
  delegateMemberId: row.delegate_member_id,
  delegateMemberName: normalizeNullableString(row.delegate_member_name),
  effectiveFrom: formatTimestampLike(row.effective_from) || new Date(row.effective_from).toISOString(),
  effectiveTo: formatTimestampLike(row.effective_to),
  active: Boolean(row.active),
  isPrimary: Boolean(row.is_primary),
  createdAt: formatTimestampLike(row.created_at) || new Date(row.created_at).toISOString(),
  updatedAt: formatTimestampLike(row.updated_at) || new Date(row.updated_at).toISOString()
})

export const mapHierarchyHistoryRow = (row: HierarchyHistoryRow): HrHierarchyHistoryRecord => ({
  reportingLineId: row.reporting_line_id,
  memberId: row.member_id,
  memberName: row.member_name || row.member_id,
  supervisorMemberId: normalizeNullableString(row.supervisor_member_id),
  supervisorName: normalizeNullableString(row.supervisor_name),
  previousSupervisorMemberId: normalizeNullableString(row.previous_supervisor_member_id),
  previousSupervisorName: normalizeNullableString(row.previous_supervisor_name),
  effectiveFrom: formatTimestampLike(row.effective_from) || new Date(row.effective_from).toISOString(),
  effectiveTo: formatTimestampLike(row.effective_to),
  sourceSystem: row.source_system,
  changeReason: row.change_reason,
  changedByUserId: normalizeNullableString(row.changed_by_user_id),
  changedByName: normalizeNullableString(row.changed_by_name),
  createdAt: formatTimestampLike(row.created_at) || new Date(row.created_at).toISOString()
})

export const listHierarchy = async (filters?: HierarchyListFilters): Promise<HrHierarchyRecord[]> => {
  const db = await getDb()
  const conditions = [sql<boolean>`TRUE`]
  const normalizedSearch = normalizeNullableString(filters?.search)?.toLowerCase()

  if (filters?.memberId) {
    conditions.push(sql<boolean>`m.member_id = ${filters.memberId}`)
  }

  if (filters?.supervisorMemberId) {
    conditions.push(sql<boolean>`cl.supervisor_member_id = ${filters.supervisorMemberId}`)
  }

  if (filters?.departmentId) {
    conditions.push(sql<boolean>`COALESCE(m.department_id, headed_dept.department_id) = ${filters.departmentId}`)
  }

  if (filters?.withoutSupervisor) {
    conditions.push(sql<boolean>`cl.supervisor_member_id IS NULL`)
  }

  if (filters?.includeInactive !== true) {
    conditions.push(sql<boolean>`m.active = TRUE`)
  }

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`

    conditions.push(
      sql<boolean>`(
        LOWER(COALESCE(m.display_name, '')) LIKE ${pattern}
        OR LOWER(COALESCE(supervisor.display_name, '')) LIKE ${pattern}
        OR LOWER(COALESCE(dept.name, headed_dept.name, '')) LIKE ${pattern}
        OR LOWER(COALESCE(m.role_title, '')) LIKE ${pattern}
      )`
    )
  }

  const result = await sql<HierarchyListRow>`
    WITH RECURSIVE current_lines AS (
      SELECT DISTINCT ON (rl.member_id)
        rl.reporting_line_id,
        rl.member_id,
        rl.supervisor_member_id,
        rl.effective_from,
        rl.source_system,
        rl.change_reason,
        rl.changed_by_user_id
      FROM greenhouse_core.reporting_lines AS rl
      WHERE rl.effective_from <= CURRENT_TIMESTAMP
        AND (rl.effective_to IS NULL OR rl.effective_to > CURRENT_TIMESTAMP)
      ORDER BY rl.member_id, rl.effective_from DESC, rl.created_at DESC
    ),
    descendants AS (
      SELECT
        cl.member_id AS ancestor_id,
        cl.member_id AS descendant_id,
        0 AS depth
      FROM current_lines AS cl

      UNION ALL

      SELECT
        descendants.ancestor_id,
        child.member_id AS descendant_id,
        descendants.depth + 1 AS depth
      FROM descendants
      INNER JOIN current_lines AS child
        ON child.supervisor_member_id = descendants.descendant_id
    ),
    subtree_stats AS (
      SELECT
        ancestor_id AS member_id,
        COUNT(*) FILTER (WHERE depth = 1) AS direct_reports_count,
        COUNT(*) FILTER (WHERE depth > 0) AS subtree_size
      FROM descendants
      GROUP BY ancestor_id
    ),
    hierarchy_depth AS (
      WITH RECURSIVE hierarchy AS (
        SELECT
          cl.member_id,
          cl.supervisor_member_id,
          0 AS depth
        FROM current_lines AS cl
        WHERE cl.supervisor_member_id IS NULL

        UNION ALL

        SELECT
          child.member_id,
          child.supervisor_member_id,
          hierarchy.depth + 1 AS depth
        FROM current_lines AS child
        INNER JOIN hierarchy
          ON child.supervisor_member_id = hierarchy.member_id
      )
      SELECT member_id, depth
      FROM hierarchy
    )
    SELECT
      cl.reporting_line_id,
      m.member_id,
      m.display_name AS member_name,
      m.active AS member_active,
      m.role_title,
      COALESCE(m.department_id, headed_dept.department_id) AS department_id,
      COALESCE(dept.name, headed_dept.name) AS department_name,
      cl.supervisor_member_id,
      supervisor.display_name AS supervisor_name,
      supervisor.active AS supervisor_active,
      cl.effective_from,
      cl.source_system,
      cl.change_reason,
      cl.changed_by_user_id,
      COALESCE(stats.direct_reports_count, 0) AS direct_reports_count,
      COALESCE(stats.subtree_size, 0) AS subtree_size,
      COALESCE(depth.depth, 0) AS depth,
      delegation.responsibility_id AS delegation_responsibility_id,
      delegation.delegate_member_id AS delegation_delegate_member_id,
      delegation.delegate_member_name AS delegation_delegate_member_name,
      delegation.effective_from AS delegation_effective_from,
      delegation.effective_to AS delegation_effective_to
    FROM current_lines AS cl
    INNER JOIN greenhouse_core.members AS m
      ON m.member_id = cl.member_id
    LEFT JOIN greenhouse_core.members AS supervisor
      ON supervisor.member_id = cl.supervisor_member_id
    LEFT JOIN greenhouse_core.departments AS dept
      ON dept.department_id = m.department_id
    LEFT JOIN LATERAL (
      SELECT
        hd.department_id,
        hd.name
      FROM greenhouse_core.departments AS hd
      WHERE hd.head_member_id = m.member_id
      ORDER BY hd.sort_order ASC, hd.name ASC
      LIMIT 1
    ) AS headed_dept ON TRUE
    LEFT JOIN subtree_stats AS stats
      ON stats.member_id = cl.member_id
    LEFT JOIN hierarchy_depth AS depth
      ON depth.member_id = cl.member_id
    LEFT JOIN LATERAL (
      SELECT
        r.responsibility_id,
        r.member_id AS delegate_member_id,
        delegate.display_name AS delegate_member_name,
        r.effective_from,
        r.effective_to
      FROM greenhouse_core.operational_responsibilities AS r
      INNER JOIN greenhouse_core.members AS delegate
        ON delegate.member_id = r.member_id
      WHERE r.scope_type = 'member'
        AND r.scope_id = cl.member_id
        AND r.responsibility_type = 'approval_delegate'
        AND r.active = TRUE
        AND r.effective_from <= CURRENT_TIMESTAMP
        AND (r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)
      ORDER BY r.is_primary DESC, r.effective_from DESC, r.created_at DESC
      LIMIT 1
    ) AS delegation ON TRUE
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY
      COALESCE(depth.depth, 0) ASC,
      COALESCE(supervisor.display_name, '') ASC,
      m.display_name ASC,
      m.member_id ASC
  `.execute(db)

  return result.rows.map(mapHierarchyRow)
}

export const listHierarchyHistory = async (filters?: HierarchyHistoryFilters): Promise<HrHierarchyHistoryRecord[]> => {
  const db = await getDb()
  const conditions = [sql<boolean>`TRUE`]
  const limit = Math.min(250, Math.max(10, Number(filters?.limit ?? 80)))

  if (filters?.memberId) {
    conditions.push(sql<boolean>`line_history.member_id = ${filters.memberId}`)
  }

  if (filters?.supervisorMemberId) {
    conditions.push(
      sql<boolean>`(
        line_history.supervisor_member_id = ${filters.supervisorMemberId}
        OR line_history.previous_supervisor_member_id = ${filters.supervisorMemberId}
      )`
    )
  }

  const result = await sql<HierarchyHistoryRow>`
    WITH line_history AS (
      SELECT
        rl.reporting_line_id,
        rl.member_id,
        rl.supervisor_member_id,
        LAG(rl.supervisor_member_id) OVER (
          PARTITION BY rl.member_id
          ORDER BY rl.effective_from ASC, rl.created_at ASC, rl.reporting_line_id ASC
        ) AS previous_supervisor_member_id,
        rl.effective_from,
        rl.effective_to,
        rl.source_system,
        rl.change_reason,
        rl.changed_by_user_id,
        rl.created_at
      FROM greenhouse_core.reporting_lines AS rl
    )
    SELECT
      line_history.reporting_line_id,
      line_history.member_id,
      member_ref.display_name AS member_name,
      line_history.supervisor_member_id,
      supervisor_ref.display_name AS supervisor_name,
      line_history.previous_supervisor_member_id,
      previous_supervisor_ref.display_name AS previous_supervisor_name,
      line_history.effective_from,
      line_history.effective_to,
      line_history.source_system,
      line_history.change_reason,
      line_history.changed_by_user_id,
      COALESCE(actor.full_name, actor.email) AS changed_by_name,
      line_history.created_at
    FROM line_history
    INNER JOIN greenhouse_core.members AS member_ref
      ON member_ref.member_id = line_history.member_id
    LEFT JOIN greenhouse_core.members AS supervisor_ref
      ON supervisor_ref.member_id = line_history.supervisor_member_id
    LEFT JOIN greenhouse_core.members AS previous_supervisor_ref
      ON previous_supervisor_ref.member_id = line_history.previous_supervisor_member_id
    LEFT JOIN greenhouse_core.client_users AS actor
      ON actor.user_id = line_history.changed_by_user_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY line_history.effective_from DESC, line_history.created_at DESC
    LIMIT ${limit}
  `.execute(db)

  return result.rows.map(mapHierarchyHistoryRow)
}

export const listApprovalDelegations = async (opts?: {
  supervisorMemberId?: string | null
  delegateMemberId?: string | null
  includeInactive?: boolean
}): Promise<HrHierarchyDelegationRecord[]> => {
  const db = await getDb()

  const conditions = [
    sql<boolean>`r.scope_type = 'member'`,
    sql<boolean>`r.responsibility_type = 'approval_delegate'`
  ]

  if (opts?.supervisorMemberId) {
    conditions.push(sql<boolean>`r.scope_id = ${opts.supervisorMemberId}`)
  }

  if (opts?.delegateMemberId) {
    conditions.push(sql<boolean>`r.member_id = ${opts.delegateMemberId}`)
  }

  if (opts?.includeInactive !== true) {
    conditions.push(sql<boolean>`r.active = TRUE`)
    conditions.push(sql<boolean>`r.effective_from <= CURRENT_TIMESTAMP`)
    conditions.push(sql<boolean>`(r.effective_to IS NULL OR r.effective_to > CURRENT_TIMESTAMP)`)
  }

  const result = await sql<DelegationRow>`
    SELECT
      r.responsibility_id,
      r.scope_id AS supervisor_member_id,
      supervisor.display_name AS supervisor_name,
      r.member_id AS delegate_member_id,
      delegate.display_name AS delegate_member_name,
      r.effective_from,
      r.effective_to,
      r.active,
      r.is_primary,
      r.created_at,
      r.updated_at
    FROM greenhouse_core.operational_responsibilities AS r
    INNER JOIN greenhouse_core.members AS supervisor
      ON supervisor.member_id = r.scope_id
    INNER JOIN greenhouse_core.members AS delegate
      ON delegate.member_id = r.member_id
    WHERE ${sql.join(conditions, sql` AND `)}
    ORDER BY r.active DESC, r.updated_at DESC, r.created_at DESC
  `.execute(db)

  return result.rows.map(mapDelegationRow)
}

export const changeHierarchySupervisor = async (input: ChangeSupervisorInput) => {
  const memberId = assertRequired(input.memberId, 'memberId')
  const actorUserId = assertRequired(input.actorUserId, 'actorUserId')
  const reason = assertRequired(input.reason, 'reason')

  return upsertReportingLine({
    memberId,
    supervisorMemberId: normalizeNullableString(input.supervisorMemberId),
    actorUserId,
    reason,
    sourceSystem: 'greenhouse_manual',
    sourceMetadata: {
      surface: 'hr_hierarchy_admin',
      mode: 'single_change'
    },
    effectiveFrom: sanitizeEffectiveFrom(input.effectiveFrom)
  })
}

export const bulkReassignDirectReports = async (input: BulkReassignDirectReportsInput) => {
  const currentSupervisorMemberId = assertRequired(input.currentSupervisorMemberId, 'currentSupervisorMemberId')
  const actorUserId = assertRequired(input.actorUserId, 'actorUserId')
  const reason = assertRequired(input.reason, 'reason')
  const nextSupervisorMemberId = normalizeNullableString(input.nextSupervisorMemberId)
  const effectiveFrom = sanitizeEffectiveFrom(input.effectiveFrom)
  const effectiveAt = effectiveFrom

  if (nextSupervisorMemberId && currentSupervisorMemberId === nextSupervisorMemberId) {
    throw new HrCoreValidationError('The replacement supervisor must be different from the current supervisor.')
  }

  const directReports = await listDirectReports(currentSupervisorMemberId, {
    effectiveAt: effectiveFrom
  })

  if (directReports.length === 0) {
    return {
      updatedCount: 0,
      memberIds: [] as string[]
    }
  }

  const updatedRows = await withTransaction(async client => {
    const rows = []

    for (const report of directReports) {
      const updated = await upsertReportingLineInTransaction(
        {
          memberId: report.memberId,
          supervisorMemberId: nextSupervisorMemberId,
          actorUserId,
          reason,
          sourceSystem: 'greenhouse_manual',
          sourceMetadata: {
            surface: 'hr_hierarchy_admin',
            mode: 'bulk_direct_reports',
            previousSupervisorMemberId: currentSupervisorMemberId
          },
          effectiveFrom
        },
        client
      )

      rows.push(updated)
    }

    return rows
  })

  return {
    updatedCount: updatedRows.length,
    memberIds: updatedRows.map(row => row.memberId)
  }
}

export const assignApprovalDelegation = async (input: AssignApprovalDelegationInput) => {
  const loadApprovalDelegations: AssignApprovalDelegationDependencies['loadApprovalDelegations'] = opts =>
    listApprovalDelegations(opts)

  return assignApprovalDelegationWithDependencies(input, {
    loadApprovalDelegations
  })
}

type AssignApprovalDelegationDependencies = {
  loadApprovalDelegations: (
    opts?: {
      supervisorMemberId?: string | null
      delegateMemberId?: string | null
      includeInactive?: boolean
    }
  ) => Promise<HrHierarchyDelegationRecord[]>
}

export const assignApprovalDelegationWithDependencies = async (
  input: AssignApprovalDelegationInput,
  dependencies: AssignApprovalDelegationDependencies
) => {
  const supervisorMemberId = assertRequired(input.supervisorMemberId, 'supervisorMemberId')
  const delegateMemberId = assertRequired(input.delegateMemberId, 'delegateMemberId')
  const effectiveFrom = sanitizeEffectiveFrom(input.effectiveFrom)
  const effectiveTo = sanitizeEffectiveTo(input.effectiveTo)

  if (supervisorMemberId === delegateMemberId) {
    throw new HrCoreValidationError('A supervisor cannot delegate approvals to the same member.')
  }

  const activeDelegations = await dependencies.loadApprovalDelegations({
    supervisorMemberId,
    includeInactive: false
  })

  await withTransaction(async client => {
    for (const existing of activeDelegations) {
      await revokeResponsibilityInTransaction(existing.responsibilityId, client)
    }

    await createResponsibilityInTransaction(
      {
        memberId: delegateMemberId,
        scopeType: 'member',
        scopeId: supervisorMemberId,
        responsibilityType: 'approval_delegate',
        isPrimary: true,
        effectiveFrom,
        effectiveTo
      },
      client
    )
  })

  const [delegation] = await dependencies.loadApprovalDelegations({
    supervisorMemberId,
    includeInactive: true
  })

  return delegation ?? null
}

export const revokeApprovalDelegationById = async (responsibilityId: string) => {
  await revokeResponsibility(assertRequired(responsibilityId, 'responsibilityId'))
}

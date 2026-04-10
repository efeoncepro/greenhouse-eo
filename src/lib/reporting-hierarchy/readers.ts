import 'server-only'

import { query } from '@/lib/db'

import type { EffectiveSupervisorRecord, ReportingLineRecord, ReportingSubtreeNode } from '@/lib/reporting-hierarchy/types'

type ReportingLineRow = {
  reporting_line_id: string
  member_id: string
  member_name: string | null
  member_active: boolean
  supervisor_member_id: string | null
  supervisor_name: string | null
  supervisor_active: boolean | null
  effective_from: string
  effective_to: string | null
  source_system: string
  source_metadata: Record<string, unknown> | null
  change_reason: string
  changed_by_user_id: string | null
}

type DelegateRow = {
  responsibility_id: string
  delegate_member_id: string
  delegate_member_name: string | null
  scope_type: 'member'
  scope_id: string
  effective_from: string
  effective_to: string | null
}

type ReportingSubtreeRow = Record<string, unknown> & {
  memberId: string
  memberName: string | null
  supervisorMemberId: string | null
  depth: number
}

const ACTIVE_AT_SQL = `
  rl.effective_from <= $2::timestamptz
  AND (rl.effective_to IS NULL OR rl.effective_to > $2::timestamptz)
`

const mapReportingLine = (row: ReportingLineRow): ReportingLineRecord => ({
  reportingLineId: row.reporting_line_id,
  memberId: row.member_id,
  memberName: row.member_name,
  memberActive: Boolean(row.member_active),
  supervisorMemberId: row.supervisor_member_id,
  supervisorName: row.supervisor_name,
  supervisorActive: row.supervisor_active == null ? null : Boolean(row.supervisor_active),
  effectiveFrom: row.effective_from,
  effectiveTo: row.effective_to,
  sourceSystem: row.source_system,
  sourceMetadata: row.source_metadata ?? {},
  changeReason: row.change_reason,
  changedByUserId: row.changed_by_user_id
})

export const getCurrentReportingLine = async (
  memberId: string,
  opts?: { effectiveAt?: string }
): Promise<ReportingLineRecord | null> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()

  const rows = await query<ReportingLineRow>(
    `
      SELECT
        rl.reporting_line_id,
        rl.member_id,
        m.display_name AS member_name,
        m.active AS member_active,
        rl.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        supervisor.active AS supervisor_active,
        rl.effective_from,
        rl.effective_to,
        rl.source_system,
        rl.source_metadata,
        rl.change_reason,
        rl.changed_by_user_id
      FROM greenhouse_core.reporting_lines AS rl
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = rl.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = rl.supervisor_member_id
      WHERE rl.member_id = $1
        AND ${ACTIVE_AT_SQL}
      ORDER BY rl.effective_from DESC
      LIMIT 1
    `,
    [memberId, effectiveAt]
  )

  return rows[0] ? mapReportingLine(rows[0]) : null
}

export const listDirectReports = async (
  supervisorMemberId: string,
  opts?: { effectiveAt?: string }
): Promise<ReportingLineRecord[]> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()

  const rows = await query<ReportingLineRow>(
    `
      SELECT
        rl.reporting_line_id,
        rl.member_id,
        m.display_name AS member_name,
        m.active AS member_active,
        rl.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        supervisor.active AS supervisor_active,
        rl.effective_from,
        rl.effective_to,
        rl.source_system,
        rl.source_metadata,
        rl.change_reason,
        rl.changed_by_user_id
      FROM greenhouse_core.reporting_lines AS rl
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = rl.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = rl.supervisor_member_id
      WHERE rl.supervisor_member_id = $1
        AND ${ACTIVE_AT_SQL}
      ORDER BY m.display_name ASC NULLS LAST, rl.member_id ASC
    `,
    [supervisorMemberId, effectiveAt]
  )

  return rows.map(mapReportingLine)
}

export const listReportingSubtree = async (
  supervisorMemberId: string,
  opts?: { effectiveAt?: string }
): Promise<ReportingSubtreeNode[]> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()

  const rows = await query<ReportingSubtreeRow>(
    `
      WITH RECURSIVE subtree AS (
        SELECT
          rl.member_id,
          rl.supervisor_member_id,
          1 AS depth
        FROM greenhouse_core.reporting_lines AS rl
        WHERE rl.supervisor_member_id = $1
          AND rl.effective_from <= $2::timestamptz
          AND (rl.effective_to IS NULL OR rl.effective_to > $2::timestamptz)

        UNION ALL

        SELECT
          child.member_id,
          child.supervisor_member_id,
          subtree.depth + 1 AS depth
        FROM greenhouse_core.reporting_lines AS child
        INNER JOIN subtree
          ON child.supervisor_member_id = subtree.member_id
        WHERE child.effective_from <= $2::timestamptz
          AND (child.effective_to IS NULL OR child.effective_to > $2::timestamptz)
      )
      SELECT
        subtree.member_id AS "memberId",
        m.display_name AS "memberName",
        subtree.supervisor_member_id AS "supervisorMemberId",
        subtree.depth
      FROM subtree
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = subtree.member_id
      ORDER BY subtree.depth ASC, m.display_name ASC NULLS LAST, subtree.member_id ASC
    `,
    [supervisorMemberId, effectiveAt]
  )

  return rows.map(row => ({
    memberId: row.memberId,
    memberName: row.memberName,
    supervisorMemberId: row.supervisorMemberId,
    depth: Number(row.depth)
  }))
}

export const listReportingChain = async (
  memberId: string,
  opts?: { effectiveAt?: string }
): Promise<ReportingLineRecord[]> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()

  const rows = await query<ReportingLineRow>(
    `
      WITH RECURSIVE chain AS (
        SELECT
          rl.reporting_line_id,
          rl.member_id,
          m.display_name AS member_name,
          m.active AS member_active,
          rl.supervisor_member_id,
          supervisor.display_name AS supervisor_name,
          supervisor.active AS supervisor_active,
          rl.effective_from,
          rl.effective_to,
          rl.source_system,
          rl.source_metadata,
          rl.change_reason,
          rl.changed_by_user_id
        FROM greenhouse_core.reporting_lines AS rl
        INNER JOIN greenhouse_core.members AS m
          ON m.member_id = rl.member_id
        LEFT JOIN greenhouse_core.members AS supervisor
          ON supervisor.member_id = rl.supervisor_member_id
        WHERE rl.member_id = $1
          AND ${ACTIVE_AT_SQL}

        UNION ALL

        SELECT
          parent.reporting_line_id,
          parent.member_id,
          member_ref.display_name AS member_name,
          member_ref.active AS member_active,
          parent.supervisor_member_id,
          supervisor_ref.display_name AS supervisor_name,
          supervisor_ref.active AS supervisor_active,
          parent.effective_from,
          parent.effective_to,
          parent.source_system,
          parent.source_metadata,
          parent.change_reason,
          parent.changed_by_user_id
        FROM greenhouse_core.reporting_lines AS parent
        INNER JOIN chain
          ON parent.member_id = chain.supervisor_member_id
        INNER JOIN greenhouse_core.members AS member_ref
          ON member_ref.member_id = parent.member_id
        LEFT JOIN greenhouse_core.members AS supervisor_ref
          ON supervisor_ref.member_id = parent.supervisor_member_id
        WHERE parent.effective_from <= $2::timestamptz
          AND (parent.effective_to IS NULL OR parent.effective_to > $2::timestamptz)
      )
      SELECT *
      FROM chain
      WHERE member_id <> $1
    `,
    [memberId, effectiveAt]
  )

  return rows.map(mapReportingLine)
}

export const listMembersWithoutSupervisor = async (
  opts?: { effectiveAt?: string }
): Promise<ReportingLineRecord[]> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()

  const rows = await query<ReportingLineRow>(
    `
      SELECT
        rl.reporting_line_id,
        rl.member_id,
        m.display_name AS member_name,
        m.active AS member_active,
        rl.supervisor_member_id,
        supervisor.display_name AS supervisor_name,
        supervisor.active AS supervisor_active,
        rl.effective_from,
        rl.effective_to,
        rl.source_system,
        rl.source_metadata,
        rl.change_reason,
        rl.changed_by_user_id
      FROM greenhouse_core.reporting_lines AS rl
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = rl.member_id
      LEFT JOIN greenhouse_core.members AS supervisor
        ON supervisor.member_id = rl.supervisor_member_id
      WHERE rl.effective_from <= $1::timestamptz
        AND (rl.effective_to IS NULL OR rl.effective_to > $1::timestamptz)
        AND rl.supervisor_member_id IS NULL
      ORDER BY m.display_name ASC NULLS LAST, rl.member_id ASC
    `,
    [effectiveAt]
  )

  return rows.map(mapReportingLine)
}

export const getEffectiveSupervisor = async (
  memberId: string,
  opts?: { effectiveAt?: string }
): Promise<EffectiveSupervisorRecord | null> => {
  const effectiveAt = opts?.effectiveAt ?? new Date().toISOString()
  const currentLine = await getCurrentReportingLine(memberId, { effectiveAt })

  if (!currentLine) {
    return null
  }

  if (!currentLine.supervisorMemberId) {
    return {
      memberId: currentLine.memberId,
      memberName: currentLine.memberName,
      supervisorMemberId: null,
      supervisorName: null,
      effectiveSupervisorMemberId: null,
      effectiveSupervisorName: null,
      delegated: false,
      delegation: null
    }
  }

  const delegateRows = await query<DelegateRow>(
    `
      SELECT
        r.responsibility_id,
        r.member_id AS delegate_member_id,
        m.display_name AS delegate_member_name,
        r.scope_type,
        r.scope_id,
        r.effective_from,
        r.effective_to
      FROM greenhouse_core.operational_responsibilities AS r
      INNER JOIN greenhouse_core.members AS m
        ON m.member_id = r.member_id
      WHERE r.responsibility_type = 'approval_delegate'
        AND r.scope_type = 'member'
        AND r.scope_id = $1
        AND r.active = TRUE
        AND r.effective_from <= $2::timestamptz
        AND (r.effective_to IS NULL OR r.effective_to > $2::timestamptz)
      ORDER BY r.is_primary DESC, r.effective_from DESC, r.created_at DESC
      LIMIT 1
    `,
    [currentLine.supervisorMemberId, effectiveAt]
  )

  const delegate = delegateRows[0]

  if (!delegate) {
    return {
      memberId: currentLine.memberId,
      memberName: currentLine.memberName,
      supervisorMemberId: currentLine.supervisorMemberId,
      supervisorName: currentLine.supervisorName,
      effectiveSupervisorMemberId: currentLine.supervisorMemberId,
      effectiveSupervisorName: currentLine.supervisorName,
      delegated: false,
      delegation: null
    }
  }

  return {
    memberId: currentLine.memberId,
    memberName: currentLine.memberName,
    supervisorMemberId: currentLine.supervisorMemberId,
    supervisorName: currentLine.supervisorName,
    effectiveSupervisorMemberId: delegate.delegate_member_id,
    effectiveSupervisorName: delegate.delegate_member_name,
    delegated: true,
    delegation: {
      responsibilityId: delegate.responsibility_id,
      delegateMemberId: delegate.delegate_member_id,
      delegateMemberName: delegate.delegate_member_name,
      scopeType: delegate.scope_type,
      scopeId: delegate.scope_id,
      effectiveFrom: delegate.effective_from,
      effectiveTo: delegate.effective_to
    }
  }
}

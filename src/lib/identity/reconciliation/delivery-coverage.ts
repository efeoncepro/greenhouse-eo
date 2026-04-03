import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

export interface DeliveryCoverageAuditInput {
  spaceId: string
  year: number
  month: number
}

export interface DeliveryCoverageUnresolvedSource {
  sourceId: string
  taskCount: number
  occurrenceCount: number
}

export interface DeliveryCoverageAuditResult {
  spaceId: string
  period: {
    year: number
    month: number
    startDate: string
    endDate: string
  }
  totalTaskCount: number
  tasksWithAssigneeSourceId: number
  tasksWithAssigneeMemberId: number
  tasksWithAssigneeMemberIds: number
  tasksWithoutAssigneeSourceId: number
  tasksWithoutAssigneeMemberId: number
  coveragePct: number | null
  coveragePctWithMemberIds: number | null
  unresolvedSourceIds: DeliveryCoverageUnresolvedSource[]
}

interface DeliveryCoverageRow {
  task_source_id: string
  assignee_source_id: string | null
  assignee_member_id: string | null
  assignee_member_ids: string[] | null
}

const toMonthWindow = (year: number, month: number) => {
  if (!Number.isInteger(year) || year < 2000 || year > 3000) {
    throw new Error(`Invalid year '${year}'`)
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month '${month}'`)
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0))

  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  }
}

const isNonEmpty = (value: string | null | undefined) => Boolean(value && value.trim())

export const auditDeliveryIdentityCoverage = async (
  input: DeliveryCoverageAuditInput
): Promise<DeliveryCoverageAuditResult> => {
  const { startDate, endDate } = toMonthWindow(input.year, input.month)
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      SELECT
        task_source_id,
        assignee_source_id,
        assignee_member_id,
        assignee_member_ids
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE space_id = @spaceId
        AND due_date BETWEEN @startDate AND @endDate
        AND NOT is_deleted
    `,
    params: {
      spaceId: input.spaceId,
      startDate,
      endDate
    }
  }) as [DeliveryCoverageRow[], unknown]

  const unresolvedBySource = new Map<string, { taskCount: number; occurrenceCount: number }>()
  let tasksWithAssigneeSourceId = 0
  let tasksWithAssigneeMemberId = 0
  let tasksWithAssigneeMemberIds = 0

  for (const row of rows) {
    const assigneeSourceId = isNonEmpty(row.assignee_source_id) ? row.assignee_source_id!.trim() : null
    const assigneeMemberId = isNonEmpty(row.assignee_member_id) ? row.assignee_member_id!.trim() : null

    const assigneeMemberIds = Array.isArray(row.assignee_member_ids)
      ? row.assignee_member_ids.filter(isNonEmpty)
      : []

    if (assigneeSourceId) {
      tasksWithAssigneeSourceId++
    }

    if (assigneeMemberId) {
      tasksWithAssigneeMemberId++
    }

    if (assigneeMemberIds.length > 0) {
      tasksWithAssigneeMemberIds++
    }

    if (assigneeSourceId && !assigneeMemberId) {
      const current = unresolvedBySource.get(assigneeSourceId) || { taskCount: 0, occurrenceCount: 0 }

      current.taskCount += 1
      current.occurrenceCount += 1

      unresolvedBySource.set(assigneeSourceId, current)
    }
  }

  const unresolvedSourceIds = [...unresolvedBySource.entries()]
    .map(([sourceId, counts]) => ({
      sourceId,
      taskCount: counts.taskCount,
      occurrenceCount: counts.occurrenceCount
    }))
    .sort((a, b) => b.taskCount - a.taskCount || a.sourceId.localeCompare(b.sourceId))

  const denominator = tasksWithAssigneeSourceId

  const coveragePct = denominator > 0
    ? Number(((tasksWithAssigneeMemberId / denominator) * 100).toFixed(1))
    : null

  const coveragePctWithMemberIds = denominator > 0
    ? Number(((tasksWithAssigneeMemberIds / denominator) * 100).toFixed(1))
    : null

  return {
    spaceId: input.spaceId,
    period: {
      year: input.year,
      month: input.month,
      startDate,
      endDate
    },
    totalTaskCount: rows.length,
    tasksWithAssigneeSourceId,
    tasksWithAssigneeMemberId,
    tasksWithAssigneeMemberIds,
    tasksWithoutAssigneeSourceId: rows.length - tasksWithAssigneeSourceId,
    tasksWithoutAssigneeMemberId: rows.length - tasksWithAssigneeMemberId,
    coveragePct,
    coveragePctWithMemberIds,
    unresolvedSourceIds
  }
}

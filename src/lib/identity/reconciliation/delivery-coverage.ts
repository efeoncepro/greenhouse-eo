import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { isGreenhousePostgresConfigured, runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface DeliveryCoverageAuditInput {
  spaceId: string
  year: number
  month: number
}

export type DeliveryCoverageSourceClassification =
  | 'member'
  | 'client_user'
  | 'external_contact'
  | 'linked_profile_only'
  | 'unclassified'

export interface DeliveryCoverageUnresolvedSource {
  sourceId: string
  taskCount: number
  occurrenceCount: number
  classification: DeliveryCoverageSourceClassification
  identityProfileId: string | null
  userId: string | null
  memberId: string | null
  displayName: string | null
  email: string | null
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
  collaboratorScopedTaskCount: number
  collaboratorResolvedTaskCount: number
  collaboratorCoveragePct: number | null
  classifiedExternalTaskCount: number
  unresolvedSourceIds: DeliveryCoverageUnresolvedSource[]
}

interface DeliveryCoverageRow {
  task_source_id: string
  assignee_source_id: string | null
  assignee_member_id: string | null
  assignee_member_ids: string[] | null
}

interface LinkedIdentityRow extends Record<string, unknown> {
  source_object_id: string
  identity_profile_id: string | null
  user_id: string | null
  member_id: string | null
  display_name: string | null
  email: string | null
  tenant_type: string | null
  profile_type: string | null
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

const classifyLinkedIdentity = (row: LinkedIdentityRow | undefined): DeliveryCoverageSourceClassification => {
  if (!row) return 'unclassified'
  if (isNonEmpty(row.member_id)) return 'member'
  if ((row.tenant_type || '').trim() === 'client' && isNonEmpty(row.user_id)) return 'client_user'
  if ((row.profile_type || '').trim() === 'external_contact') return 'external_contact'
  if (isNonEmpty(row.identity_profile_id)) return 'linked_profile_only'

  return 'unclassified'
}

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

  const denominator = tasksWithAssigneeSourceId

  const coveragePct = denominator > 0
    ? Number(((tasksWithAssigneeMemberId / denominator) * 100).toFixed(1))
    : null

  const coveragePctWithMemberIds = denominator > 0
    ? Number(((tasksWithAssigneeMemberIds / denominator) * 100).toFixed(1))
    : null

  let linkedIdentityRowsBySource = new Map<string, LinkedIdentityRow>()

  if (unresolvedSourceIds.length > 0 && isGreenhousePostgresConfigured()) {
    try {
      const linkedRows = await runGreenhousePostgresQuery<LinkedIdentityRow>(
        `SELECT
           sl.source_object_id,
           sl.profile_id AS identity_profile_id,
           cu.user_id,
           cu.member_id,
           COALESCE(cu.full_name, ip.full_name, sl.source_display_name) AS display_name,
           COALESCE(cu.email, ip.canonical_email, sl.source_email) AS email,
           cu.tenant_type,
           ip.profile_type
         FROM greenhouse_core.identity_profile_source_links sl
         LEFT JOIN greenhouse_core.identity_profiles ip
           ON ip.profile_id = sl.profile_id
         LEFT JOIN greenhouse_core.client_users cu
           ON cu.identity_profile_id = sl.profile_id
         WHERE sl.active = TRUE
           AND sl.source_system = 'notion'
           AND sl.source_object_id = ANY($1)`,
        [unresolvedSourceIds.map(item => item.sourceId)]
      )

      linkedIdentityRowsBySource = new Map(
        linkedRows
          .filter(row => isNonEmpty(row.source_object_id))
          .map(row => [row.source_object_id.trim(), row] as const)
      )
    } catch {
      // Coverage audit can still run in raw mode when PostgreSQL is unavailable.
    }
  }

  const classifiedUnresolved = unresolvedSourceIds
    .map(item => {
      const linked = linkedIdentityRowsBySource.get(item.sourceId)

      return {
        ...item,
        classification: classifyLinkedIdentity(linked),
        identityProfileId: linked?.identity_profile_id?.trim() || null,
        userId: linked?.user_id?.trim() || null,
        memberId: linked?.member_id?.trim() || null,
        displayName: linked?.display_name?.trim() || null,
        email: linked?.email?.trim() || null
      }
    })
    .sort((a, b) => b.taskCount - a.taskCount || a.sourceId.localeCompare(b.sourceId))

  const classifiedExternalTaskCount = classifiedUnresolved
    .filter(item => item.classification === 'client_user' || item.classification === 'external_contact' || item.classification === 'linked_profile_only')
    .reduce((sum, item) => sum + item.taskCount, 0)

  const collaboratorScopedTaskCount = Math.max(tasksWithAssigneeSourceId - classifiedExternalTaskCount, 0)
  const collaboratorResolvedTaskCount = tasksWithAssigneeMemberId

  const collaboratorCoveragePct = collaboratorScopedTaskCount > 0
    ? Number(((collaboratorResolvedTaskCount / collaboratorScopedTaskCount) * 100).toFixed(1))
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
    collaboratorScopedTaskCount,
    collaboratorResolvedTaskCount,
    collaboratorCoveragePct,
    classifiedExternalTaskCount,
    unresolvedSourceIds: classifiedUnresolved
  }
}

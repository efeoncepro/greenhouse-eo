import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { TASK_STATUS_GROUPS, allVariantsForGroup } from '@/lib/delivery/task-status-canonical'
import { displayProjectName } from '@/lib/delivery/task-display'
import { buildOtdBucketPostgresSql } from '@/lib/notion-metrics/classify-otd-bucket'

interface SpaceRow extends Record<string, unknown> {
  space_id: string
  space_name: string
  client_id: string
  status: string
}

interface ProjectRow extends Record<string, unknown> {
  project_record_id: string
  notion_project_id: string | null
  project_name: string | null
  project_status: string | null
  project_phase: string | null
  active: boolean | null
  space_id: string
  page_url: string | null
  end_date: string | Date | null
  owner_member_id: string | null
  owner_display_name: string | null
  on_time_pct_source: string | number | null
  computed_otd_pct: string | number | null
  avg_rpa_source: string | number | null
  total_tasks: string | number | null
  active_tasks: string | number | null
  completed_tasks: string | number | null
  avg_rpa: string | number | null
  open_review_items: string | number | null
}

interface ProjectSummary {
  notionPageId: string
  projectName: string
  status: string
  phase: string | null
  active: boolean
  onTimePct: number | null
  avgRpaSource: number | null
  dueDate: string | null
  ownerName: string | null
  totalTasks: number
  activeTasks: number
  completedTasks: number
  avgRpa: number
  openReviewItems: number
  pageUrl: string | null
}

interface SpaceProjectGroup {
  spaceId: string
  spaceName: string
  clientId: string
  hasNotionSource: boolean
  projects: ProjectSummary[]
  healthScore: number
}

export interface OrganizationProjectsSummary {
  organizationId: string
  spaces: SpaceProjectGroup[]
  totals: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    activeTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  }
}

const computeHealthScore = (projects: ProjectSummary[]): number => {
  if (projects.length === 0) return 0

  const avgRpa = projects.reduce((s, p) => s + p.avgRpa, 0) / projects.length
  const completionRate = projects.reduce((s, p) => s + (p.totalTasks > 0 ? p.completedTasks / p.totalTasks : 0), 0) / projects.length

  return Math.round(avgRpa * 0.6 + completionRate * 100 * 0.4)
}

const overallHealthFromScore = (score: number): 'green' | 'yellow' | 'red' => {
  if (score >= 70) return 'green'
  if (score >= 40) return 'yellow'

  return 'red'
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string') return Number(value) || 0

  return 0
}

const toOptionalNumber = (value: unknown): number | null => {
  if (value == null) return null

  const numeric = toNumber(value)

  return Number.isFinite(numeric) ? numeric : null
}

const toIsoDate = (value: unknown): string | null => {
  if (!value) return null

  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return null
}

const getProjectsForSpaces = async (spaceIds: string[]): Promise<ProjectRow[]> => {
  if (spaceIds.length === 0) return []

  const activeTaskStatuses = allVariantsForGroup(TASK_STATUS_GROUPS.ACTIVE)
  const completedTaskStatuses = allVariantsForGroup(TASK_STATUS_GROUPS.COMPLETED)

  const canonicalOtdBucketSql = `COALESCE(
          CASE
            WHEN t.performance_indicator_code IN ('on_time', 'late_drop', 'overdue', 'carry_over')
              THEN t.performance_indicator_code
            ELSE NULL
          END,
          ${buildOtdBucketPostgresSql(
            { taskStatus: 't.task_status', dueDate: 't.due_date', completedAt: 't.completed_at' },
            '0',
            false
          )}
        )`

  return runGreenhousePostgresQuery<ProjectRow>(
    `
      SELECT
        p.project_record_id,
        p.notion_project_id,
        p.project_name,
        p.project_status,
        p.project_phase,
        p.active,
        p.space_id,
        p.page_url,
        p.end_date,
        p.owner_member_id,
        COALESCE(m.display_name, ip.full_name) AS owner_display_name,
        p.on_time_pct_source,
        p.avg_rpa_source,
        ROUND(
          (
            100.0 * COUNT(t.task_record_id) FILTER (
              WHERE COALESCE(t.is_deleted, FALSE) = FALSE
                AND (${canonicalOtdBucketSql}) = 'on_time'
            )
          ) / NULLIF(
            COUNT(t.task_record_id) FILTER (
              WHERE COALESCE(t.is_deleted, FALSE) = FALSE
                AND (${canonicalOtdBucketSql}) IN ('on_time', 'late_drop', 'overdue')
            ),
            0
          ),
          2
        ) AS computed_otd_pct,
        COUNT(t.task_record_id) FILTER (WHERE COALESCE(t.is_deleted, FALSE) = FALSE) AS total_tasks,
        COUNT(t.task_record_id) FILTER (
          WHERE COALESCE(t.is_deleted, FALSE) = FALSE
            AND t.task_status = ANY($2)
        ) AS active_tasks,
        COUNT(t.task_record_id) FILTER (
          WHERE COALESCE(t.is_deleted, FALSE) = FALSE
            AND t.task_status = ANY($3)
        ) AS completed_tasks,
        COALESCE(ROUND(AVG(t.rpa_value) FILTER (WHERE COALESCE(t.is_deleted, FALSE) = FALSE), 2), 0) AS avg_rpa,
        COUNT(t.task_record_id) FILTER (
          WHERE COALESCE(t.is_deleted, FALSE) = FALSE
            AND (
              COALESCE(t.client_review_open, FALSE)
              OR COALESCE(t.workflow_review_open, FALSE)
              OR COALESCE(t.open_frame_comments, 0) > 0
            )
        ) AS open_review_items
      FROM greenhouse_delivery.projects p
      LEFT JOIN greenhouse_delivery.tasks t
        ON t.project_record_id = p.project_record_id
      LEFT JOIN greenhouse_core.members m
        ON m.member_id = p.owner_member_id
      LEFT JOIN greenhouse_core.identity_profiles ip
        ON ip.profile_id = m.identity_profile_id
      WHERE p.space_id = ANY($1)
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      GROUP BY
        p.project_record_id,
        p.notion_project_id,
        p.project_name,
        p.project_status,
        p.project_phase,
        p.active,
        p.space_id,
        p.page_url,
        p.end_date,
        p.owner_member_id,
        m.display_name,
        ip.full_name,
        p.on_time_pct_source,
        p.avg_rpa_source,
        p.created_at,
        p.updated_at
      ORDER BY
        COALESCE(p.active, FALSE) DESC,
        active_tasks DESC,
        total_tasks DESC,
        p.updated_at DESC NULLS LAST,
        p.created_at DESC NULLS LAST
    `,
    [spaceIds, activeTaskStatuses, completedTaskStatuses]
  )
}

export const getOrganizationProjects = async (
  organizationId: string
): Promise<OrganizationProjectsSummary> => {
  // 1. Get org spaces
  const spaces = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT space_id, space_name, client_id, status
     FROM greenhouse_core.spaces
     WHERE organization_id = $1 AND active = TRUE
     ORDER BY space_name`,
    [organizationId]
  )

  const projectRows = await getProjectsForSpaces(spaces.map(space => space.space_id))
  const projectsBySpace = new Map<string, ProjectSummary[]>()

  for (const project of projectRows) {
    const projectName = displayProjectName({
      projectName: project.project_name,
      projectSourceId: project.notion_project_id ?? project.project_record_id,
      pageUrl: project.page_url
    })

    const entry: ProjectSummary = {
      notionPageId: project.notion_project_id ?? project.project_record_id,
      projectName: projectName.text,
      status: project.project_status ?? (project.active ? 'active' : 'unknown'),
      phase: project.project_phase,
      active: Boolean(project.active),
      onTimePct: toOptionalNumber(project.computed_otd_pct) ?? toOptionalNumber(project.on_time_pct_source),
      avgRpaSource: toOptionalNumber(project.avg_rpa_source),
      dueDate: toIsoDate(project.end_date),
      ownerName: project.owner_display_name,
      totalTasks: toNumber(project.total_tasks),
      activeTasks: toNumber(project.active_tasks),
      completedTasks: toNumber(project.completed_tasks),
      avgRpa: toNumber(project.avg_rpa),
      openReviewItems: toNumber(project.open_review_items),
      pageUrl: project.page_url
    }

    projectsBySpace.set(project.space_id, [...(projectsBySpace.get(project.space_id) ?? []), entry])
  }

  const spaceGroups: SpaceProjectGroup[] = spaces.map(space => {
    const projects = projectsBySpace.get(space.space_id) ?? []

    return {
      spaceId: space.space_id,
      spaceName: space.space_name,
      clientId: space.client_id,
      hasNotionSource: projects.some(project => Boolean(project.pageUrl)),
      projects,
      healthScore: computeHealthScore(projects)
    }
  })

  // 3. Aggregate totals
  const allProjects = spaceGroups.flatMap(s => s.projects)
  const activeStatuses = allVariantsForGroup(TASK_STATUS_GROUPS.ACTIVE)

  const totalTasks = allProjects.reduce((s, p) => s + p.totalTasks, 0)
  const activeTasks = allProjects.reduce((s, p) => s + p.activeTasks, 0)
  const completedTasks = allProjects.reduce((s, p) => s + p.completedTasks, 0)

  const avgRpa = allProjects.length > 0
    ? Math.round(allProjects.reduce((s, p) => s + p.avgRpa, 0) / allProjects.length)
    : 0

  const avgHealth = spaceGroups.length > 0
    ? Math.round(spaceGroups.reduce((s, g) => s + g.healthScore, 0) / spaceGroups.length)
    : 0

  return {
    organizationId,
    spaces: spaceGroups,
    totals: {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.active || activeStatuses.includes(p.status)).length,
      totalTasks,
      activeTasks,
      completedTasks,
      avgRpa,
      overallHealth: overallHealthFromScore(avgHealth)
    }
  }
}

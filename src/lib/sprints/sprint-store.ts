import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'

// ── Types ──

export interface SprintListItem {
  sprintSourceId: string
  sprintName: string
  status: string
  startDate: string | null
  endDate: string | null
  totalTasks: number
  completedTasks: number
  activeTasks: number
  progress: number
  pageUrl: string | null
}

export interface SprintDetail extends SprintListItem {

  // ICO metrics (from metrics_by_sprint)
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvgDays: number | null
  throughputCount: number | null
  stuckAssetCount: number | null
}

export interface SprintBurndownPoint {
  date: string
  completedCumulative: number
  idealCumulative: number
}

// ── Helpers ──

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }

  if (v && typeof v === 'object' && 'value' in v) return toNum((v as { value: unknown }).value)

  return 0
}

const toNullNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  const n = toNum(v)

  return n === 0 ? null : n
}

const toDateStr = (v: unknown): string | null => {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  if (typeof v === 'object' && v !== null && 'value' in v) return toDateStr((v as { value: unknown }).value)

  return null
}

// ── Store functions ──

export const listSprints = async (projectIds: string[]): Promise<SprintListItem[]> => {
  if (projectIds.length === 0) return []

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      WITH sprint_tasks AS (
        SELECT
          dt.sprint_source_id,
          COUNT(*) AS total_tasks,
          COUNTIF(dt.task_status IN ('Listo', 'Done', 'Finalizado', 'Completado')) AS completed_tasks,
          COUNTIF(dt.task_status IN ('En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados')) AS active_tasks
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` dt
        WHERE dt.project_source_id IN UNNEST(@projectIds)
          AND dt.sprint_source_id IS NOT NULL
          AND dt.is_deleted = FALSE
        GROUP BY dt.sprint_source_id
      )
      SELECT
        ds.sprint_source_id,
        ds.sprint_name,
        ds.sprint_status AS status,
        ds.start_date,
        ds.end_date,
        COALESCE(st.total_tasks, 0) AS total_tasks,
        COALESCE(st.completed_tasks, 0) AS completed_tasks,
        COALESCE(st.active_tasks, 0) AS active_tasks,
        ds.page_url
      FROM \`${projectId}.greenhouse_conformed.delivery_sprints\` ds
      LEFT JOIN sprint_tasks st ON st.sprint_source_id = ds.sprint_source_id
      WHERE ds.project_source_id IN UNNEST(@projectIds)
        AND ds.is_deleted = FALSE
      ORDER BY
        CASE ds.sprint_status WHEN 'Actual' THEN 0 WHEN 'Siguiente' THEN 1 WHEN 'Último' THEN 2 ELSE 3 END,
        ds.start_date DESC NULLS LAST
    `,
    params: { projectIds }
  })

  return (rows as Array<Record<string, unknown>>).map(r => {
    const total = toNum(r.total_tasks)
    const completed = toNum(r.completed_tasks)

    return {
      sprintSourceId: String(r.sprint_source_id),
      sprintName: String(r.sprint_name || 'Sprint'),
      status: String(r.status || 'Unknown'),
      startDate: toDateStr(r.start_date),
      endDate: toDateStr(r.end_date),
      totalTasks: total,
      completedTasks: completed,
      activeTasks: toNum(r.active_tasks),
      progress: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
      pageUrl: r.page_url ? String(r.page_url) : null
    }
  })
}

export const getSprintDetail = async (sprintSourceId: string, projectIds: string[]): Promise<SprintDetail | null> => {
  const sprints = await listSprints(projectIds)
  const sprint = sprints.find(s => s.sprintSourceId === sprintSourceId)

  if (!sprint) return null

  // Get ICO metrics for this sprint
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [metricRows] = await bigQuery.query({
    query: `
      SELECT *
      FROM \`${projectId}.ico_engine.metrics_by_sprint\`
      WHERE sprint_source_id = @sprintSourceId
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
    `,
    params: { sprintSourceId }
  }).catch(() => [[]])

  const metrics = (metricRows as Array<Record<string, unknown>>)[0]

  return {
    ...sprint,
    rpaAvg: metrics ? toNullNum(metrics.rpa_avg) : null,
    otdPct: metrics ? toNullNum(metrics.otd_pct) : null,
    ftrPct: metrics ? toNullNum(metrics.ftr_pct) : null,
    cycleTimeAvgDays: metrics ? toNullNum(metrics.cycle_time_avg_days) : null,
    throughputCount: metrics ? toNullNum(metrics.throughput_count) : null,
    stuckAssetCount: metrics ? toNullNum(metrics.stuck_asset_count) : null
  }
}

export const getSprintBurndown = async (sprintSourceId: string, projectIds: string[]): Promise<SprintBurndownPoint[]> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  // Get sprint date range
  const [sprintRows] = await bigQuery.query({
    query: `
      SELECT start_date, end_date
      FROM \`${projectId}.greenhouse_conformed.delivery_sprints\`
      WHERE sprint_source_id = @sprintSourceId
        AND project_source_id IN UNNEST(@projectIds)
        AND is_deleted = FALSE
      LIMIT 1
    `,
    params: { sprintSourceId, projectIds }
  })

  const sprintRow = (sprintRows as Array<Record<string, unknown>>)[0]

  if (!sprintRow) return []

  const startDate = toDateStr(sprintRow.start_date)
  const endDate = toDateStr(sprintRow.end_date)

  if (!startDate || !endDate) return []

  // Get total tasks for ideal line
  const [totalRows] = await bigQuery.query({
    query: `
      SELECT COUNT(*) AS total
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE sprint_source_id = @sprintSourceId
        AND project_source_id IN UNNEST(@projectIds)
        AND is_deleted = FALSE
    `,
    params: { sprintSourceId, projectIds }
  })

  const totalTasks = toNum((totalRows as Array<Record<string, unknown>>)[0]?.total)

  if (totalTasks === 0) return []

  // Get daily completions
  const [completionRows] = await bigQuery.query({
    query: `
      SELECT
        DATE(completed_at) AS completion_date,
        COUNT(*) AS completed_count
      FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
      WHERE sprint_source_id = @sprintSourceId
        AND project_source_id IN UNNEST(@projectIds)
        AND is_deleted = FALSE
        AND completed_at IS NOT NULL
        AND DATE(completed_at) >= @startDate
      GROUP BY completion_date
      ORDER BY completion_date
    `,
    params: { sprintSourceId, projectIds, startDate }
  })

  // Build burndown points
  const start = new Date(startDate)
  const end = new Date(endDate)
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000))
  const dailyIdeal = totalTasks / totalDays

  const completionMap = new Map<string, number>()

  for (const r of completionRows as Array<{ completion_date: unknown; completed_count: unknown }>) {
    const d = toDateStr(r.completion_date)

    if (d) completionMap.set(d, toNum(r.completed_count))
  }

  const points: SprintBurndownPoint[] = []
  let cumulativeCompleted = 0

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const dayIndex = Math.ceil((d.getTime() - start.getTime()) / 86_400_000)

    cumulativeCompleted += completionMap.get(dateStr) || 0

    points.push({
      date: dateStr,
      completedCumulative: cumulativeCompleted,
      idealCumulative: Math.round(dailyIdeal * dayIndex)
    })
  }

  return points
}

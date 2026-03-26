import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { assertCampaignSchemaReady } from './campaign-store'

export interface CampaignMetrics {
  campaignId: string
  projectCount: number
  totalTasks: number
  completedTasks: number
  activeTasks: number
  completionPct: number
  rpaAvg: number | null
  otdPct: number | null
  ftrPct: number | null
  cycleTimeAvg: number | null
  throughputWeekly: number | null
  stuckCount48h: number
  stuckCount96h: number
}

interface LinkRow extends Record<string, unknown> {
  project_source_id: string
}

interface MetricRow {
  total_tasks: number | string
  completed_tasks: number | string
  active_tasks: number | string
  avg_rpa: number | string | null
  otd_pct: number | string | null
  ftr_pct: number | string | null
  cycle_time_avg: number | string | null
  throughput_weekly: number | string | null
  stuck_48h: number | string
  stuck_96h: number | string
}

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

export const getCampaignMetrics = async (campaignId: string): Promise<CampaignMetrics> => {
  await assertCampaignSchemaReady()

  // 1. Get linked project source IDs
  const links = await runGreenhousePostgresQuery<LinkRow>(
    `SELECT project_source_id FROM greenhouse_core.campaign_project_links WHERE campaign_id = $1`,
    [campaignId]
  )

  const projectSourceIds = links.map(l => l.project_source_id).filter(Boolean)

  if (projectSourceIds.length === 0) {
    return {
      campaignId,
      projectCount: 0,
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      completionPct: 0,
      rpaAvg: null,
      otdPct: null,
      ftrPct: null,
      cycleTimeAvg: null,
      throughputWeekly: null,
      stuckCount48h: 0,
      stuckCount96h: 0
    }
  }

  // 2. Query ICO metrics from BigQuery aggregated across linked projects
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [rows] = await bigQuery.query({
    query: `
      WITH campaign_tasks AS (
        SELECT t.*
        FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` t
        WHERE t.project_source_id IN UNNEST(@projectSourceIds)
      )
      SELECT
        COUNT(*) AS total_tasks,
        COUNTIF(t.status IN ('Listo', 'Done', 'Finalizado', 'Completado')) AS completed_tasks,
        COUNTIF(t.status IN ('En curso', 'Listo para revisión', 'Listo para revision', 'Cambios Solicitados')) AS active_tasks,
        SAFE_CAST(AVG(SAFE_CAST(t.rpa AS FLOAT64)) AS FLOAT64) AS avg_rpa,
        SAFE_DIVIDE(
          COUNTIF(t.completed_on_time = TRUE),
          NULLIF(COUNTIF(t.status IN ('Listo', 'Done', 'Finalizado', 'Completado')), 0)
        ) * 100 AS otd_pct,
        SAFE_DIVIDE(
          COUNTIF(t.revision_count = 0 AND t.status IN ('Listo', 'Done', 'Finalizado', 'Completado')),
          NULLIF(COUNTIF(t.status IN ('Listo', 'Done', 'Finalizado', 'Completado')), 0)
        ) * 100 AS ftr_pct,
        AVG(IF(t.cycle_time_days > 0, t.cycle_time_days, NULL)) AS cycle_time_avg,
        SAFE_DIVIDE(
          COUNTIF(t.status IN ('Listo', 'Done', 'Finalizado', 'Completado')
                  AND t.completed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)),
          1
        ) AS throughput_weekly,
        COUNTIF(t.status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado')
                AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_edited_at, HOUR) > 48) AS stuck_48h,
        COUNTIF(t.status NOT IN ('Listo', 'Done', 'Finalizado', 'Completado')
                AND TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), t.last_edited_at, HOUR) > 96) AS stuck_96h
      FROM campaign_tasks t
    `,
    params: { projectSourceIds }
  })

  const row = (rows[0] || {}) as MetricRow
  const totalTasks = toNum(row.total_tasks)
  const completedTasks = toNum(row.completed_tasks)

  return {
    campaignId,
    projectCount: projectSourceIds.length,
    totalTasks,
    completedTasks,
    activeTasks: toNum(row.active_tasks),
    completionPct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    rpaAvg: toNullNum(row.avg_rpa),
    otdPct: toNullNum(row.otd_pct),
    ftrPct: toNullNum(row.ftr_pct),
    cycleTimeAvg: toNullNum(row.cycle_time_avg),
    throughputWeekly: toNullNum(row.throughput_weekly),
    stuckCount48h: toNum(row.stuck_48h),
    stuckCount96h: toNum(row.stuck_96h)
  }
}

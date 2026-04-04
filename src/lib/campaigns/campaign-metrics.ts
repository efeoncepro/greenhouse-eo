import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { getFirstEffectiveBriefDateForProjects } from '@/lib/ico-engine/brief-clarity'
import {
  resolveTimeToMarketMetric,
  type TimeToMarketMetric
} from '@/lib/ico-engine/time-to-market'
import {
  assertCampaignSchemaReady,
  getCampaign,
  type Campaign
} from './campaign-store'

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
  timeToMarket: TimeToMarketMetric
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

interface TimeToMarketEvidenceRow {
  first_project_start_date: string | null
  last_project_end_date: string | null
  first_task_created_date: string | null
  first_briefing_task_date: string | null
  first_activation_task_date: string | null
  first_effective_brief_date: string | null
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

const buildTimeToMarketMetric = (
  campaign: Campaign,
  evidence: TimeToMarketEvidenceRow | null
): TimeToMarketMetric =>
  resolveTimeToMarketMetric({
    startCandidates: [
      {
        date: evidence?.first_effective_brief_date ?? null,
        label: 'Primer brief efectivo validado',
        source: 'ico_engine.ai_metric_scores.processed_at',
        mode: 'observed'
      },
      {
        date: evidence?.first_briefing_task_date ?? null,
        label: 'Primera tarea en fase de briefing',
        source: 'greenhouse_conformed.delivery_tasks.created_at',
        mode: 'proxy'
      },
      {
        date: evidence?.first_project_start_date ?? null,
        label: 'Fecha de inicio del proyecto vinculado',
        source: 'greenhouse_conformed.delivery_projects.start_date',
        mode: 'proxy'
      },
      {
        date: campaign.actualStartDate,
        label: 'Fecha real de inicio de campaña',
        source: 'greenhouse_core.campaigns.actual_start_date',
        mode: 'proxy'
      },
      {
        date: evidence?.first_task_created_date ?? null,
        label: 'Primera tarea creada en delivery',
        source: 'greenhouse_conformed.delivery_tasks.created_at',
        mode: 'proxy'
      },
      {
        date: campaign.plannedStartDate,
        label: 'Fecha planificada de inicio de campaña',
        source: 'greenhouse_core.campaigns.planned_start_date',
        mode: 'planned'
      }
    ],
    activationCandidates: [
      {
        date: campaign.actualLaunchDate,
        label: 'Fecha real de lanzamiento de campaña',
        source: 'greenhouse_core.campaigns.actual_launch_date',
        mode: 'observed'
      },
      {
        date: evidence?.first_activation_task_date ?? null,
        label: 'Primera tarea marcada como activación o publicación',
        source: 'greenhouse_conformed.delivery_tasks.task_status',
        mode: 'observed'
      },
      {
        date: evidence?.last_project_end_date ?? null,
        label: 'Fecha de cierre del proyecto vinculado',
        source: 'greenhouse_conformed.delivery_projects.end_date',
        mode: 'proxy'
      },
      {
        date: campaign.plannedLaunchDate,
        label: 'Fecha planificada de lanzamiento',
        source: 'greenhouse_core.campaigns.planned_launch_date',
        mode: 'planned'
      }
    ]
  })

export const getCampaignMetrics = async (campaignId: string): Promise<CampaignMetrics> => {
  await assertCampaignSchemaReady()

  const campaign = await getCampaign(campaignId)

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`)
  }

  // 1. Get linked project source IDs
  const links = await runGreenhousePostgresQuery<LinkRow>(
    `SELECT project_source_id
     FROM greenhouse_core.campaign_project_links
     WHERE campaign_id = $1
       AND space_id = $2`,
    [campaignId, campaign.spaceId]
  )

  const projectSourceIds = [...new Set(links.map(l => l.project_source_id).filter(Boolean))]
  const timeToMarket = buildTimeToMarketMetric(campaign, null)

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
      stuckCount96h: 0,
      timeToMarket
    }
  }

  // 2. Query ICO metrics from BigQuery aggregated across linked projects
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const [metricQueryResult, evidenceQueryResult, firstEffectiveBriefDate] = await Promise.all([
    bigQuery.query({
      query: `
        WITH campaign_tasks AS (
          SELECT t.*
          FROM \`${projectId}.greenhouse_conformed.delivery_tasks\` t
          WHERE t.space_id = @spaceId
            AND t.project_source_id IN UNNEST(@projectSourceIds)
            AND COALESCE(t.is_deleted, FALSE) = FALSE
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
      params: { spaceId: campaign.spaceId, projectSourceIds }
    }),
    bigQuery.query({
      query: `
        WITH campaign_projects AS (
          SELECT *
          FROM \`${projectId}.greenhouse_conformed.delivery_projects\`
          WHERE space_id = @spaceId
            AND project_source_id IN UNNEST(@projectSourceIds)
            AND COALESCE(is_deleted, FALSE) = FALSE
          QUALIFY ROW_NUMBER() OVER (
            PARTITION BY project_source_id
            ORDER BY last_edited_time DESC NULLS LAST, synced_at DESC NULLS LAST, project_source_id
          ) = 1
        ),
        campaign_tasks AS (
          SELECT *
          FROM \`${projectId}.greenhouse_conformed.delivery_tasks\`
          WHERE space_id = @spaceId
            AND project_source_id IN UNNEST(@projectSourceIds)
            AND COALESCE(is_deleted, FALSE) = FALSE
        )
        SELECT
          (SELECT MIN(start_date) FROM campaign_projects) AS first_project_start_date,
          (SELECT MAX(end_date) FROM campaign_projects) AS last_project_end_date,
          (SELECT MIN(DATE(created_at)) FROM campaign_tasks) AS first_task_created_date,
          (
            SELECT MIN(IF(REGEXP_CONTAINS(LOWER(COALESCE(status, '')), r'(brief|diseñ|disen|backlog|pendiente)'), DATE(created_at), NULL))
            FROM campaign_tasks
          ) AS first_briefing_task_date,
          (
            SELECT MIN(
              IF(
                REGEXP_CONTAINS(LOWER(COALESCE(status, '')), r'(activ|public|distrib|launch|lanz)'),
                COALESCE(DATE(completed_at), DATE(last_edited_at)),
                NULL
              )
            )
            FROM campaign_tasks
          ) AS first_activation_task_date
      `,
      params: { spaceId: campaign.spaceId, projectSourceIds }
    }),
    getFirstEffectiveBriefDateForProjects({
      spaceId: campaign.spaceId,
      projectSourceIds
    })
  ])

  const metricRows = metricQueryResult[0] as MetricRow[]
  const evidenceRows = evidenceQueryResult[0] as TimeToMarketEvidenceRow[]
  const row = (metricRows[0] || {}) as MetricRow

  const ttmEvidence = evidenceRows[0]
    ? {
        ...evidenceRows[0],
        first_effective_brief_date: firstEffectiveBriefDate
      }
    : firstEffectiveBriefDate
      ? {
          first_project_start_date: null,
          last_project_end_date: null,
          first_task_created_date: null,
          first_briefing_task_date: null,
          first_activation_task_date: null,
          first_effective_brief_date: firstEffectiveBriefDate
        }
      : null

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
    stuckCount96h: toNum(row.stuck_96h),
    timeToMarket: buildTimeToMarketMetric(campaign, ttmEvidence)
  }
}

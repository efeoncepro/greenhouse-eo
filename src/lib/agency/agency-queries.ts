import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { buildMetricSelectSQL, buildPeriodFilterSQL } from '@/lib/ico-engine/shared'
import { buildMetricValuesFromRow, type MetricAggregateRowLike } from '@/lib/ico-engine/read-metrics'
import type { ThresholdZone } from '@/lib/ico-engine/metric-registry'
import type { TeamRoleCategory } from '@/types/team'

export type AgencyMetricBenchmarkType = 'external' | 'analog' | 'adapted' | 'internal'
export type AgencyMetricQualityGateStatus = 'healthy' | 'degraded' | 'broken'
export type AgencyMetricConfidenceLevel = 'high' | 'medium' | 'low' | 'none'
export type AgencyMetricDataStatus = 'valid' | 'low_confidence' | 'suppressed' | 'unavailable'

export interface AgencyMetricTrustEvidence {
  sampleBasis: string
  sampleSize: number | null
  totalTasks: number | null
  completedTasks: number | null
  activeTasks: number | null
  deliveryClassifiedTasks: number | null
}

export interface AgencyRpaEvidence {
  eligibleTasks: number
  missingTasks: number
  nonPositiveTasks: number
}

export interface AgencyMetricSignal {
  metricId: string
  value: number | null
  zone: ThresholdZone | null
  benchmarkType?: AgencyMetricBenchmarkType
  benchmarkLabel?: string
  benchmarkSource?: string
  qualityGateStatus?: AgencyMetricQualityGateStatus
  qualityGateReasons?: string[]
  dataStatus?: AgencyMetricDataStatus
  confidenceLevel?: AgencyMetricConfidenceLevel
  suppressionReason?: string | null
  evidence?: AgencyRpaEvidence
  trustEvidence?: AgencyMetricTrustEvidence
}

export interface AgencySpaceHealth {
  clientId: string
  spaceId?: string | null
  clientName: string
  businessLines: string[]
  rpaAvg: number | null
  otdPct: number | null
  rpaMetric: AgencyMetricSignal | null
  otdMetric: AgencyMetricSignal | null
  assetsActivos: number
  feedbackPendiente: number
  projectCount: number
  notionProjectCount: number
  scopedProjectCount: number
  assignedMembers: number
  allocatedFte: number
  totalUsers: number
  activeUsers: number
  isInternal: boolean
}

export interface AgencyDeliveryTrendMonth {
  year: number
  month: number
  otdPct: number | null
  rpaAvg: number | null
  ftrPct: number | null
  rpaMetric: AgencyMetricSignal | null
  otdMetric: AgencyMetricSignal | null
  ftrMetric: AgencyMetricSignal | null
  totalTasks: number
  completedTasks: number
  stuckAssetCount: number
}

export interface AgencyPulseKpis {
  rpaGlobal: number | null
  rpaMetric: AgencyMetricSignal | null
  assetsActivos: number
  otdPctGlobal: number | null
  otdMetric: AgencyMetricSignal | null
  feedbackPendiente: number
  totalSpaces: number
  totalProjects: number
  lastSyncedAt: string | null
}

export interface AgencyChartWeeklyPoint {
  weekStart: string
  completed: number
}

export interface AgencyChartSpaceRpa {
  clientId: string
  clientName: string
  rpaAvg: number | null
}

export interface AgencyChartStatusItem {
  key: string
  label: string
  value: number
}

export interface AgencyCapacityMember {
  memberId: string
  displayName: string
  avatarUrl: string | null
  roleTitle: string
  roleCategory: TeamRoleCategory
  fteAllocation: number
  spaceAllocations: { clientId: string; clientName: string; fte: number }[]
}

export interface AgencyCapacityOverview {
  totalFte: number
  allocatedFte: number
  utilizationPct: number
  monthlyHours: number
  members: AgencyCapacityMember[]
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return toNumber((value as { value?: unknown }).value)
  }

  return 0
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null

  const parsed = toNumber(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object' && value !== null && 'value' in value) {
    const inner = (value as { value?: unknown }).value

    return typeof inner === 'string' ? inner : null
  }

  return null
}

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []

  return value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
}

const toAgencyMetricSignal = (
  row: MetricAggregateRowLike,
  metricId: 'rpa' | 'otd_pct' | 'ftr_pct'
): AgencyMetricSignal | null => {
  const metric = buildMetricValuesFromRow(row).find(item => item.metricId === metricId)

  if (!metric) return null

  return {
    metricId: metric.metricId,
    value: metric.value,
    zone: metric.zone,
    benchmarkType: metric.benchmarkType,
    benchmarkLabel: metric.benchmarkLabel,
    benchmarkSource: metric.benchmarkSource,
    qualityGateStatus: metric.qualityGateStatus,
    qualityGateReasons: metric.qualityGateReasons,
    dataStatus: metric.dataStatus,
    confidenceLevel: metric.confidenceLevel,
    suppressionReason: metric.suppressionReason ?? null,
    evidence: metric.evidence,
    trustEvidence: metric.trustEvidence
  }
}

const buildAgencyMetricAggregateRow = (
  row: unknown,
  overrides: Partial<MetricAggregateRowLike>
): MetricAggregateRowLike =>
  ({
    ...(row as Record<string, unknown> | MetricAggregateRowLike),
    ...overrides
  }) as unknown as MetricAggregateRowLike

const getCurrentDeliveryPeriod = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit'
  })

  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find(part => part.type === 'year')?.value ?? new Date().getUTCFullYear())
  const month = Number(parts.find(part => part.type === 'month')?.value ?? new Date().getUTCMonth() + 1)

  return { year, month }
}

const normalizeMatchValue = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferRoleCategory = (value: string | null | undefined): TeamRoleCategory => {
  const normalized = normalizeMatchValue(value)

  if (normalized.includes('account')) return 'account'
  if (normalized.includes('operat')) return 'operations'
  if (normalized.includes('strateg')) return 'strategy'
  if (normalized.includes('design') || normalized.includes('creative')) return 'design'
  if (normalized.includes('develop') || normalized.includes('web')) return 'development'
  if (normalized.includes('media')) return 'media'

  return 'unknown'
}

const getAgencyClientScopeCtes = (projectId: string) => `
  WITH active_clients AS (
    SELECT
      c.client_id,
      c.client_name
    FROM \`${projectId}.greenhouse.clients\` c
    WHERE c.active = TRUE
  ),
  client_spaces AS (
    SELECT
      ac.client_id,
      ac.client_name,
      sns.space_id
    FROM active_clients ac
    INNER JOIN \`${projectId}.greenhouse.space_notion_sources\` sns
      ON sns.client_id = ac.client_id
     AND sns.sync_enabled = TRUE
  ),
  user_summary AS (
    SELECT
      cu.client_id,
      COUNT(DISTINCT cu.user_id) AS total_users,
      COUNT(DISTINCT IF(cu.last_login_at IS NOT NULL, cu.user_id, NULL)) AS active_users
    FROM \`${projectId}.greenhouse.client_users\` cu
    WHERE cu.client_id IS NOT NULL
      AND cu.tenant_type = 'client'
    GROUP BY cu.client_id
  ),
  scoped_project_ids AS (
    SELECT
      cu.client_id,
      ups.project_id
    FROM \`${projectId}.greenhouse.client_users\` cu
    INNER JOIN \`${projectId}.greenhouse.user_project_scopes\` ups
      ON ups.user_id = cu.user_id
     AND ups.active = TRUE
    WHERE cu.client_id IS NOT NULL
      AND cu.tenant_type = 'client'
    GROUP BY cu.client_id, ups.project_id
  ),
  project_inventory AS (
    SELECT
      ac.client_id,
      COALESCE(pc.notion_project_count, 0) AS notion_project_count,
      COUNT(DISTINCT sp.project_id) AS scoped_project_count,
      GREATEST(COALESCE(pc.notion_project_count, 0), COUNT(DISTINCT sp.project_id)) AS project_count
    FROM active_clients ac
    LEFT JOIN (
      SELECT cs.client_id, COUNT(DISTINCT pr.notion_page_id) AS notion_project_count
      FROM client_spaces cs
      INNER JOIN \`${projectId}.notion_ops.proyectos\` pr ON pr.space_id = cs.space_id
      GROUP BY cs.client_id
    ) pc ON pc.client_id = ac.client_id
    LEFT JOIN scoped_project_ids sp
      ON sp.client_id = ac.client_id
    GROUP BY ac.client_id, pc.notion_project_count
  ),
  assignment_summary AS (
    SELECT
      ta.client_id,
      COUNT(DISTINCT ta.member_id) AS assigned_members,
      SUM(COALESCE(ta.fte_allocation, 0)) AS allocated_fte
    FROM \`${projectId}.greenhouse.client_team_assignments\` ta
    WHERE ta.active = TRUE
    GROUP BY ta.client_id
  )
`

export const getAgencyPulseKpis = async (): Promise<AgencyPulseKpis> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()
  const currentPeriod = getCurrentDeliveryPeriod()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)},
      ico_global AS (
        SELECT
          ${buildMetricSelectSQL()}
        FROM \`${projectId}.ico_engine.v_tasks_enriched\` te
        WHERE te.space_id IN (SELECT space_id FROM client_spaces)
          AND (${buildPeriodFilterSQL()})
      ),
      task_agg AS (
        SELECT
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(SAFE_CAST(t.open_frame_comments AS INT64) > 0) AS feedback_pendiente,
          MAX(t.last_edited_time) AS last_synced_at
        FROM \`${projectId}.notion_ops.tareas\` t
        WHERE t.space_id IN (SELECT space_id FROM client_spaces)
      ),
      project_agg AS (
        SELECT
          SUM(pi.project_count) AS total_projects
        FROM project_inventory pi
      )
      SELECT
        ig.rpa_avg AS rpa_global,
        ta.assets_activos,
        ta.feedback_pendiente,
        ta.last_synced_at,
        pa.total_projects,
        ig.otd_pct AS otd_pct_global,
        ig.rpa_eligible_task_count,
        ig.rpa_missing_task_count,
        ig.rpa_non_positive_task_count,
        ig.total_tasks,
        ig.completed_tasks,
        ig.active_tasks,
        ig.on_time_count,
        ig.late_drop_count,
        ig.overdue_count,
        (SELECT COUNT(*) FROM active_clients) AS total_spaces
      FROM task_agg ta
      CROSS JOIN ico_global ig
      CROSS JOIN project_agg pa
    `
    ,
    params: {
      periodYear: currentPeriod.year,
      periodMonth: currentPeriod.month
    }
  })

  const row = rows?.[0] as Record<string, unknown> | undefined
  const metricRow = row as MetricAggregateRowLike | undefined

  return {
    rpaGlobal: row ? toNullableNumber(row.rpa_global) : null,
    rpaMetric: metricRow
      ? toAgencyMetricSignal(
          buildAgencyMetricAggregateRow(row ?? {}, {
            rpa_avg: row?.rpa_global ?? null,
            otd_pct: row?.otd_pct_global ?? null,
            ftr_pct: null,
            cycle_time_avg_days: null,
            cycle_time_variance: null,
            throughput_count: null,
            pipeline_velocity: null,
            stuck_asset_count: null,
            stuck_asset_pct: null
          }),
          'rpa'
        )
      : null,
    assetsActivos: row ? toNumber(row.assets_activos) : 0,
    otdPctGlobal: row ? toNullableNumber(row.otd_pct_global) : null,
    otdMetric: metricRow
      ? toAgencyMetricSignal(
          buildAgencyMetricAggregateRow(row ?? {}, {
            rpa_avg: row?.rpa_global ?? null,
            otd_pct: row?.otd_pct_global ?? null,
            ftr_pct: null,
            cycle_time_avg_days: null,
            cycle_time_variance: null,
            throughput_count: null,
            pipeline_velocity: null,
            stuck_asset_count: null,
            stuck_asset_pct: null
          }),
          'otd_pct'
        )
      : null,
    feedbackPendiente: row ? toNumber(row.feedback_pendiente) : 0,
    totalSpaces: row ? toNumber(row.total_spaces) : 0,
    totalProjects: row ? toNumber(row.total_projects) : 0,
    lastSyncedAt: row ? toIsoString(row.last_synced_at) : null
  }
}

export const getAgencySpacesHealth = async (): Promise<AgencySpaceHealth[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()
  const currentPeriod = getCurrentDeliveryPeriod()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)},
      ico_health AS (
        SELECT
          cs.client_id,
          ${buildMetricSelectSQL()}
        FROM client_spaces cs
        LEFT JOIN \`${projectId}.ico_engine.v_tasks_enriched\` te
          ON te.space_id = cs.space_id
         AND (${buildPeriodFilterSQL()})
        GROUP BY cs.client_id
      ),
      task_health AS (
        SELECT
          cs.client_id,
          COUNTIF(t.estado NOT IN ('Listo', 'Cancelado')) AS assets_activos,
          COUNTIF(SAFE_CAST(t.open_frame_comments AS INT64) > 0) AS feedback_pendiente
        FROM client_spaces cs
        LEFT JOIN \`${projectId}.notion_ops.tareas\` t
          ON t.space_id = cs.space_id
        GROUP BY cs.client_id
      ),
      module_agg AS (
        SELECT
          csm.client_id,
          ARRAY_AGG(DISTINCT csm.module_code IGNORE NULLS ORDER BY csm.module_code) AS business_lines
        FROM \`${projectId}.greenhouse.client_service_modules\` csm
        INNER JOIN \`${projectId}.greenhouse.service_modules\` sm
          ON sm.module_code = csm.module_code
         AND sm.module_kind = 'business_line'
         AND sm.active = TRUE
        WHERE csm.active = TRUE
        GROUP BY csm.client_id
      )
      SELECT
        ac.client_id,
        ac.client_name,
        COALESCE(ma.business_lines, []) AS business_lines,
        ih.rpa_avg,
        ih.otd_pct,
        COALESCE(th.assets_activos, 0) AS assets_activos,
        COALESCE(th.feedback_pendiente, 0) AS feedback_pendiente,
        COALESCE(pi.project_count, 0) AS project_count,
        COALESCE(pi.notion_project_count, 0) AS notion_project_count,
        COALESCE(pi.scoped_project_count, 0) AS scoped_project_count,
        COALESCE(asg.assigned_members, 0) AS assigned_members,
        COALESCE(asg.allocated_fte, 0) AS allocated_fte,
        COALESCE(us.total_users, 0) AS total_users,
        COALESCE(us.active_users, 0) AS active_users
      FROM active_clients ac
      LEFT JOIN ico_health ih
        ON ih.client_id = ac.client_id
      LEFT JOIN task_health th
        ON th.client_id = ac.client_id
      LEFT JOIN project_inventory pi
        ON pi.client_id = ac.client_id
      LEFT JOIN assignment_summary asg
        ON asg.client_id = ac.client_id
      LEFT JOIN user_summary us
        ON us.client_id = ac.client_id
      LEFT JOIN module_agg ma
        ON ma.client_id = ac.client_id
      ORDER BY
        COALESCE(pi.project_count, 0) DESC,
        COALESCE(asg.allocated_fte, 0) DESC,
        ac.client_name ASC
    `
    ,
    params: {
      periodYear: currentPeriod.year,
      periodMonth: currentPeriod.month
    }
  })

  return (rows as Record<string, unknown>[]).map(row => {
    const clientId = String(row.client_id ?? '')
    const clientName = String(row.client_name ?? '')
    const normalizedSpace = `${clientId} ${clientName}`.toLowerCase()

    return {
      clientId,
      spaceId: null,
      clientName,
      businessLines: normalizeStringArray(row.business_lines),
      rpaAvg: toNullableNumber(row.rpa_avg),
      otdPct: toNullableNumber(row.otd_pct),
      rpaMetric: toAgencyMetricSignal(
        buildAgencyMetricAggregateRow(row, {
          rpa_avg: row.rpa_avg,
          otd_pct: row.otd_pct,
          ftr_pct: null,
          cycle_time_avg_days: null,
          cycle_time_variance: null,
          throughput_count: null,
          pipeline_velocity: null,
          stuck_asset_count: null,
          stuck_asset_pct: null
        }),
        'rpa'
      ),
      otdMetric: toAgencyMetricSignal(
        buildAgencyMetricAggregateRow(row, {
          rpa_avg: row.rpa_avg,
          otd_pct: row.otd_pct,
          ftr_pct: null,
          cycle_time_avg_days: null,
          cycle_time_variance: null,
          throughput_count: null,
          pipeline_velocity: null,
          stuck_asset_count: null,
          stuck_asset_pct: null
        }),
        'otd_pct'
      ),
      assetsActivos: toNumber(row.assets_activos),
      feedbackPendiente: toNumber(row.feedback_pendiente),
      projectCount: toNumber(row.project_count),
      notionProjectCount: toNumber(row.notion_project_count),
      scopedProjectCount: toNumber(row.scoped_project_count),
      assignedMembers: toNumber(row.assigned_members),
      allocatedFte: Number(toNumber(row.allocated_fte).toFixed(1)),
      totalUsers: toNumber(row.total_users),
      activeUsers: toNumber(row.active_users),
      isInternal: normalizedSpace.includes('efeonce')
    }
  })
}

export const getAgencyWeeklyActivity = async (): Promise<AgencyChartWeeklyPoint[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)}
      SELECT
        DATE_TRUNC(DATE(t.fecha_de_completado), WEEK(MONDAY)) AS week_start,
        COUNT(*) AS completed
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.space_id IN (SELECT space_id FROM client_spaces)
        AND t.estado = 'Listo'
        AND t.fecha_de_completado IS NOT NULL
        AND DATE(t.fecha_de_completado) >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 WEEK)
      GROUP BY week_start
      ORDER BY week_start ASC
    `
  })

  return (rows as Record<string, unknown>[]).map(row => ({
    weekStart: toIsoString(row.week_start) ?? '',
    completed: toNumber(row.completed)
  }))
}

export const getAgencyStatusMix = async (): Promise<AgencyChartStatusItem[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  const STATUS_MAP: Record<string, string> = {
    'En Curso': 'active',
    'Listo para Revision': 'review',
    'Cambios Solicitados': 'changes',
    'Listo': 'completed'
  }

  const [rows] = await bq.query({
    query: `
      ${getAgencyClientScopeCtes(projectId)}
      SELECT
        t.estado AS group_key,
        COUNT(*) AS item_count
      FROM \`${projectId}.notion_ops.tareas\` t
      WHERE t.space_id IN (SELECT space_id FROM client_spaces)
        AND t.estado IN ('En Curso', 'Listo para Revision', 'Cambios Solicitados', 'Listo')
      GROUP BY t.estado
    `
  })

  const LABELS: Record<string, string> = {
    active: 'En Curso',
    review: 'En Revisión',
    changes: 'Cambios',
    completed: 'Listo'
  }

  return (rows as Record<string, unknown>[])
    .map(row => ({
      key: STATUS_MAP[String(row.group_key)] ?? 'other',
      label: LABELS[STATUS_MAP[String(row.group_key)] ?? ''] ?? String(row.group_key),
      value: toNumber(row.item_count)
    }))
    .filter(item => item.key !== 'other')
}

export const getAgencyCapacity = async (): Promise<AgencyCapacityOverview> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  try {
    const [rows] = await bq.query({
      query: `
        WITH member_assignments AS (
          SELECT
            tm.member_id,
            tm.display_name,
            tm.avatar_url,
            tm.role_title,
            tm.role_category,
            ta.client_id,
            c.client_name,
            COALESCE(ta.fte_allocation, 0) AS fte_allocation
          FROM \`${projectId}.greenhouse.team_members\` tm
          LEFT JOIN \`${projectId}.greenhouse.client_team_assignments\` ta
            ON ta.member_id = tm.member_id
           AND ta.active = TRUE
          LEFT JOIN \`${projectId}.greenhouse.clients\` c
            ON c.client_id = ta.client_id
          WHERE tm.active = TRUE
        )
        SELECT
          member_id,
          display_name,
          avatar_url,
          role_title,
          role_category,
          COALESCE(SUM(fte_allocation), 0) AS fte_allocation,
          ARRAY_AGG(
            IF(
              client_id IS NULL,
              NULL,
              STRUCT(
                client_id AS client_id,
                COALESCE(client_name, client_id) AS client_name,
                fte_allocation AS fte
              )
            )
            IGNORE NULLS
            ORDER BY fte_allocation DESC, client_name ASC
          ) AS space_allocations
        FROM member_assignments
        GROUP BY member_id, display_name, avatar_url, role_title, role_category
        ORDER BY fte_allocation DESC, display_name ASC
      `
    })

    const members: AgencyCapacityMember[] = (rows as Record<string, unknown>[]).map(row => ({
      memberId: String(row.member_id ?? ''),
      displayName: String(row.display_name ?? ''),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      roleTitle: String(row.role_title ?? ''),
      roleCategory: inferRoleCategory(String(row.role_category ?? row.role_title ?? '')),
      fteAllocation: Number(toNumber(row.fte_allocation).toFixed(1)),
      spaceAllocations: Array.isArray(row.space_allocations)
        ? row.space_allocations
            .map(item => {
              const allocation = item as Record<string, unknown>

              return {
                clientId: String(allocation.client_id ?? ''),
                clientName: String(allocation.client_name ?? ''),
                fte: Number(toNumber(allocation.fte).toFixed(1))
              }
            })
            .filter(item => item.clientId)
        : []
    }))

    const totalFte = Number(members.reduce((sum, member) => sum + member.fteAllocation, 0).toFixed(1))
    const maxFte = members.length
    const utilizationPct = maxFte > 0 ? Math.round((totalFte / maxFte) * 100) : 0

    return {
      totalFte,
      allocatedFte: totalFte,
      utilizationPct,
      monthlyHours: Math.round(totalFte * 160),
      members
    }
  } catch {
    return {
      totalFte: 0,
      allocatedFte: 0,
      utilizationPct: 0,
      monthlyHours: 0,
      members: []
    }
  }
}

export const getAgencyDeliveryTrend = async (months = 6): Promise<AgencyDeliveryTrendMonth[]> => {
  const projectId = getBigQueryProjectId()
  const bq = getBigQueryClient()

  try {
    const [rows] = await bq.query({
      query: `
      SELECT
        period_year,
        period_month,
        ROUND(SAFE_DIVIDE(SUM(on_time_count), NULLIF(SUM(on_time_count) + SUM(late_drop_count) + SUM(overdue_count), 0)) * 100, 1) AS otd_pct,
        ROUND(SAFE_DIVIDE(SUM(COALESCE(rpa_avg, 0) * COALESCE(rpa_eligible_task_count, 0)), NULLIF(SUM(COALESCE(rpa_eligible_task_count, 0)), 0)), 2) AS rpa_avg,
        ROUND(SAFE_DIVIDE(SUM(COALESCE(ftr_pct, 0) * COALESCE(completed_tasks, 0)), NULLIF(SUM(COALESCE(completed_tasks, 0)), 0)), 2) AS ftr_pct,
        SUM(rpa_eligible_task_count) AS rpa_eligible_task_count,
        SUM(rpa_missing_task_count) AS rpa_missing_task_count,
        SUM(rpa_non_positive_task_count) AS rpa_non_positive_task_count,
        SUM(total_tasks) AS total_tasks,
        SUM(completed_tasks) AS completed_tasks,
        SUM(active_tasks) AS active_tasks,
        SUM(on_time_count) AS on_time_count,
        SUM(late_drop_count) AS late_drop_count,
        SUM(overdue_count) AS overdue_count,
        SUM(stuck_asset_count) AS stuck_asset_count
      FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
      GROUP BY period_year, period_month
        ORDER BY period_year DESC, period_month DESC
        LIMIT @months
      `,
      params: { months }
    })

    return (rows as Record<string, unknown>[])
      .map(r => ({
        year: toNumber(r.period_year),
        month: toNumber(r.period_month),
        otdPct: toNullableNumber(r.otd_pct),
        rpaAvg: toNullableNumber(r.rpa_avg),
        ftrPct: toNullableNumber(r.ftr_pct),
        rpaMetric: toAgencyMetricSignal(
          buildAgencyMetricAggregateRow(r, {
            rpa_avg: r.rpa_avg,
            otd_pct: r.otd_pct,
            ftr_pct: r.ftr_pct,
            cycle_time_avg_days: null,
            cycle_time_variance: null,
            throughput_count: null,
            pipeline_velocity: null,
            stuck_asset_count: r.stuck_asset_count,
            stuck_asset_pct: null
          }),
          'rpa'
        ),
        otdMetric: toAgencyMetricSignal(
          buildAgencyMetricAggregateRow(r, {
            rpa_avg: r.rpa_avg,
            otd_pct: r.otd_pct,
            ftr_pct: r.ftr_pct,
            cycle_time_avg_days: null,
            cycle_time_variance: null,
            throughput_count: null,
            pipeline_velocity: null,
            stuck_asset_count: r.stuck_asset_count,
            stuck_asset_pct: null
          }),
          'otd_pct'
        ),
        ftrMetric: toAgencyMetricSignal(
          buildAgencyMetricAggregateRow(r, {
            rpa_avg: r.rpa_avg,
            otd_pct: r.otd_pct,
            ftr_pct: r.ftr_pct,
            cycle_time_avg_days: null,
            cycle_time_variance: null,
            throughput_count: null,
            pipeline_velocity: null,
            stuck_asset_count: r.stuck_asset_count,
            stuck_asset_pct: null
          }),
          'ftr_pct'
        ),
        totalTasks: toNumber(r.total_tasks),
        completedTasks: toNumber(r.completed_tasks),
        stuckAssetCount: toNumber(r.stuck_asset_count)
      }))
      .reverse()
  } catch {
    return []
  }
}

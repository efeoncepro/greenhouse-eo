import 'server-only'

import { isInternalCommercialAssignment } from '@/lib/commercial-cost-attribution/assignment-classification'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  buildAgencyReportScopeSql,
  buildDeliveryPeriodSourceSql,
  buildMetricSelectSQL,
  getIcoEngineProjectId,
  isAgencyReportIncludedSpace,
  normalizeString,
  runIcoEngineQuery,
  toNullableNumber,
  toNumber
} from './shared'
import { readAgencyMetrics, type SpaceMetricSnapshot } from './read-metrics'
import { ICO_DATASET } from './schema'

export type PerformanceReportTrend = 'improving' | 'stable' | 'degrading'

export interface PerformanceReportTopPerformer {
  memberId: string
  memberName: string
  otdPct: number | null
  throughputCount: number
  rpaAvg: number | null
  ftrPct: number | null
}

export interface PerformanceReportTaskMixEntry {
  segmentType: 'client' | 'space'
  segmentId: string
  segmentKey: string
  segmentLabel: string
  totalTasks: number
}

export interface AgencyPerformanceReport {
  periodYear: number
  periodMonth: number
  previousPeriodYear: number
  previousPeriodMonth: number
  summary: {
    onTimePct: number | null
    previousOnTimePct: number | null
    onTimeDeltaPp: number | null
    trend: PerformanceReportTrend
    lateDrops: number
    overdue: number
    carryOver: number
    overdueCarriedForward: number
    totalTasks: number
    completedTasks: number
    activeTasks: number
    efeonceTasks: number
    skyTasks: number
  }
  taskMix: PerformanceReportTaskMixEntry[]
  alertText: string
  executiveSummary: string
  topPerformer: PerformanceReportTopPerformer | null
  assumptions: {
    topPerformerMinThroughput: number
    multiAssigneePolicy: string
    trendStableBandPp: number
  }
}

interface TopPerformerRow {
  member_id: string
  member_name: unknown
  otd_pct: unknown
  throughput_count: unknown
  rpa_avg: unknown
  ftr_pct: unknown
}

interface MaterializedPerformanceReportRow {
  report_scope: string
  period_year: unknown
  period_month: unknown
  on_time_count: unknown
  late_drop_count: unknown
  on_time_pct: unknown
  overdue_count: unknown
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
  total_tasks: unknown
  completed_tasks: unknown
  active_tasks: unknown
  efeonce_tasks_count: unknown
  sky_tasks_count: unknown
  task_mix_json: unknown
  top_performer_member_id: unknown
  top_performer_member_name: unknown
  top_performer_otd_pct: unknown
  top_performer_throughput_count: unknown
  top_performer_rpa_avg: unknown
  top_performer_ftr_pct: unknown
  top_performer_min_throughput: unknown
  trend_stable_band_pp: unknown
  multi_assignee_policy: unknown
}

type ServingPerformanceReportRow = Record<string, unknown> & {
  report_scope: string
  period_year: unknown
  period_month: unknown
  on_time_count: unknown
  late_drop_count: unknown
  on_time_pct: unknown
  overdue_count: unknown
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
  total_tasks: unknown
  completed_tasks: unknown
  active_tasks: unknown
  efeonce_tasks_count: unknown
  sky_tasks_count: unknown
  task_mix_json: unknown
  top_performer_member_id: unknown
  top_performer_member_name: unknown
  top_performer_otd_pct: unknown
  top_performer_throughput_count: unknown
  top_performer_rpa_avg: unknown
  top_performer_ftr_pct: unknown
  top_performer_min_throughput: unknown
  trend_stable_band_pp: unknown
  multi_assignee_policy: unknown
}

export const TOP_PERFORMER_MIN_THROUGHPUT = 5
export const TREND_STABLE_BAND_PP = 1
export const TOP_PERFORMER_MULTI_ASSIGNEE_POLICY = 'credits only the primary owner member; co-assignees and client owners receive no member credit'

const getPreviousPeriod = (year: number, month: number) => {
  if (month === 1) {
    return { year: year - 1, month: 12 }
  }

  return { year, month: month - 1 }
}

const computeOnTimePctFromSpaces = (spaces: SpaceMetricSnapshot[]): number | null => {
  const onTime = spaces.reduce((sum, space) => sum + space.context.onTimeTasks, 0)
  const lateDrops = spaces.reduce((sum, space) => sum + space.context.lateDropTasks, 0)
  const overdue = spaces.reduce((sum, space) => sum + space.context.overdueTasks, 0)
  const otdDenominator = onTime + lateDrops + overdue

  if (otdDenominator <= 0) return null

  return Math.round((onTime / otdDenominator) * 1000) / 10
}

const computeTrend = (current: number | null, previous: number | null): PerformanceReportTrend => {
  if (current === null || previous === null) return 'stable'

  const delta = current - previous

  if (delta > TREND_STABLE_BAND_PP) return 'improving'
  if (delta < -TREND_STABLE_BAND_PP) return 'degrading'

  return 'stable'
}

const summarizeSpaces = (spaces: SpaceMetricSnapshot[]) => ({
  lateDrops: spaces.reduce((sum, space) => sum + space.context.lateDropTasks, 0),
  overdue: spaces.reduce((sum, space) => sum + space.context.overdueTasks, 0),
  carryOver: spaces.reduce((sum, space) => sum + space.context.carryOverTasks, 0),
  overdueCarriedForward: spaces.reduce((sum, space) => sum + space.context.overdueCarriedForwardTasks, 0),
  totalTasks: spaces.reduce((sum, space) => sum + space.context.totalTasks, 0),
  completedTasks: spaces.reduce((sum, space) => sum + space.context.completedTasks, 0),
  activeTasks: spaces.reduce((sum, space) => sum + space.context.activeTasks, 0),
  efeonceTasks: spaces
    .filter(space => isInternalCommercialAssignment({ clientId: space.clientId, clientName: space.clientName }))
    .reduce((sum, space) => sum + space.context.totalTasks, 0),
  skyTasks: spaces
    .filter(space => {
      const label = `${space.clientId ?? ''} ${space.clientName ?? ''} ${space.spaceId ?? ''}`.toLowerCase()

      return label.includes('sky')
    })
    .reduce((sum, space) => sum + space.context.totalTasks, 0)
})

const buildTaskMixFromSpaces = (spaces: SpaceMetricSnapshot[]): PerformanceReportTaskMixEntry[] => {
  const segments = new Map<string, PerformanceReportTaskMixEntry>()

  for (const space of spaces) {
    const segmentType: PerformanceReportTaskMixEntry['segmentType'] = space.clientId ? 'client' : 'space'
    const segmentId = normalizeString(space.clientId) || normalizeString(space.spaceId)

    if (!segmentId || space.context.totalTasks <= 0) {
      continue
    }

    const segmentLabel = normalizeString(space.clientName) || normalizeString(space.spaceId) || 'Sin etiqueta'
    const segmentKey = `${segmentType}:${segmentId}`
    const existing = segments.get(segmentKey)

    if (existing) {
      existing.totalTasks += space.context.totalTasks
      continue
    }

    segments.set(segmentKey, {
      segmentType,
      segmentId,
      segmentKey,
      segmentLabel,
      totalTasks: space.context.totalTasks
    })
  }

  return Array.from(segments.values()).sort((a, b) => {
    if (b.totalTasks !== a.totalTasks) return b.totalTasks - a.totalTasks

    return a.segmentLabel.localeCompare(b.segmentLabel, 'es')
  })
}

const parseTaskMix = (raw: unknown): PerformanceReportTaskMixEntry[] => {
  if (!raw || typeof raw !== 'string') return []

  try {
    const parsed = JSON.parse(raw) as Array<{
      segment_type?: unknown
      segment_id?: unknown
      segment_key?: unknown
      segment_label?: unknown
      total_tasks?: unknown
    }>

    return parsed
      .map((entry): PerformanceReportTaskMixEntry => {
        const segmentKey = normalizeString(entry.segment_key) || 'segment'
        const explicitType = normalizeString(entry.segment_type)

        const segmentType: PerformanceReportTaskMixEntry['segmentType'] =
          explicitType === 'client' || segmentKey.startsWith('client:') ? 'client' : 'space'

        const segmentId =
          normalizeString(entry.segment_id) ||
          (segmentKey.includes(':') ? segmentKey.split(':').slice(1).join(':') : segmentKey) ||
          'segment'

        return {
          segmentType,
          segmentId,
          segmentKey,
          segmentLabel: normalizeString(entry.segment_label) || segmentKey || 'Sin etiqueta',
          totalTasks: toNumber(entry.total_tasks)
        }
      })
      .filter(entry => entry.totalTasks > 0)
  } catch {
    return []
  }
}

const buildAlertText = (
  summary: AgencyPerformanceReport['summary'],
  topPerformer: PerformanceReportTopPerformer | null
): string => {
  const alerts: string[] = []

  if (summary.onTimeDeltaPp !== null && summary.onTimeDeltaPp <= -TREND_STABLE_BAND_PP) {
    alerts.push(`OT cayó ${Math.abs(summary.onTimeDeltaPp).toFixed(1)}pp`)
  }

  if (summary.overdue > 0) {
    alerts.push(`${summary.overdue} overdue`)
  }

  if (summary.lateDrops > 0) {
    alerts.push(`${summary.lateDrops} late drops`)
  }

  if (summary.carryOver > 0) {
    alerts.push(`${summary.carryOver} carry-over`)
  }

  if (summary.overdueCarriedForward > 0) {
    alerts.push(`${summary.overdueCarriedForward} overdue carried forward`)
  }

  if (topPerformer?.memberName && topPerformer.otdPct !== null) {
    alerts.push(`Top performer ${topPerformer.memberName} ${topPerformer.otdPct.toFixed(1)}% OT`)
  }

  if (alerts.length === 0) {
    return 'Sin alertas críticas en el período actual.'
  }

  return alerts.join(' · ')
}

const buildExecutiveSummary = (
  summary: AgencyPerformanceReport['summary'],
  taskMix: PerformanceReportTaskMixEntry[],
  topPerformer: PerformanceReportTopPerformer | null
): string => {
  const parts: string[] = []

  if (summary.onTimePct !== null && summary.previousOnTimePct !== null && summary.onTimeDeltaPp !== null) {
    const direction = summary.onTimeDeltaPp > 0 ? 'subió' : summary.onTimeDeltaPp < 0 ? 'cayó' : 'se mantuvo'

    parts.push(`OT ${direction} ${Math.abs(summary.onTimeDeltaPp).toFixed(1)}pp (${summary.previousOnTimePct.toFixed(1)}% -> ${summary.onTimePct.toFixed(1)}%)`)
  } else if (summary.onTimePct !== null) {
    parts.push(`OT cerró en ${summary.onTimePct.toFixed(1)}%`)
  }

  parts.push(`${summary.totalTasks} tareas totales, ${summary.completedTasks} completadas y ${summary.activeTasks} activas`)

  if (summary.overdue > 0 || summary.lateDrops > 0 || summary.carryOver > 0 || summary.overdueCarriedForward > 0) {
    parts.push(`${summary.overdue} overdue, ${summary.lateDrops} late drops, ${summary.carryOver} carry-over y ${summary.overdueCarriedForward} overdue carried forward`)
  }

  const dominantSegment = taskMix[0]

  if (dominantSegment) {
    parts.push(`${dominantSegment.segmentLabel} concentró ${dominantSegment.totalTasks} tareas`)
  }

  if (topPerformer?.memberName && topPerformer.otdPct !== null) {
    parts.push(`${topPerformer.memberName} lideró con ${topPerformer.otdPct.toFixed(1)}% OT`)
  }

  return parts.join('. ') + '.'
}

const readTopPerformer = async (periodYear: number, periodMonth: number): Promise<PerformanceReportTopPerformer | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<TopPerformerRow>(`
    SELECT
      scoped.member_id,
      scoped.member_name,
      scoped.otd_pct,
      scoped.total_tasks AS throughput_count,
      scoped.rpa_avg,
      scoped.ftr_pct
    FROM (
      SELECT
        te.primary_owner_member_id AS member_id,
        COALESCE(tm.display_name, te.primary_owner_member_id) AS member_name,
        ${buildMetricSelectSQL()}
      FROM ${buildDeliveryPeriodSourceSql(projectId)} te
      LEFT JOIN \`${projectId}.greenhouse.team_members\` tm
        ON tm.member_id = te.primary_owner_member_id
      LEFT JOIN \`${projectId}.greenhouse.clients\` c1
        ON c1.client_id = te.client_id
      LEFT JOIN \`${projectId}.greenhouse.clients\` c2
        ON c2.client_id = te.space_id
      WHERE te.primary_owner_member_id IS NOT NULL
        AND te.primary_owner_member_id != ''
        AND ${buildAgencyReportScopeSql({
          spaceIdExpression: 'te.space_id',
          clientIdExpression: 'te.client_id',
          primaryNameExpression: 'c1.client_name',
          secondaryNameExpression: 'c2.client_name'
        })}
      GROUP BY member_id, member_name
    ) scoped
    WHERE scoped.total_tasks >= @minThroughput
      AND scoped.otd_pct IS NOT NULL
    ORDER BY
      scoped.otd_pct DESC,
      scoped.total_tasks DESC,
      scoped.rpa_avg ASC NULLS LAST,
      scoped.member_id ASC
    LIMIT 1
  `, {
    periodYear,
    periodMonth,
    minThroughput: TOP_PERFORMER_MIN_THROUGHPUT
  })

  const row = rows[0]

  if (!row) return null

  return {
    memberId: normalizeString(row.member_id),
    memberName: normalizeString(row.member_name) || normalizeString(row.member_id),
    otdPct: toNullableNumber(row.otd_pct),
    throughputCount: toNumber(row.throughput_count),
    rpaAvg: toNullableNumber(row.rpa_avg),
    ftrPct: toNullableNumber(row.ftr_pct)
  }
}

const buildTopPerformerFromMaterializedRow = (
  row: MaterializedPerformanceReportRow | ServingPerformanceReportRow
): PerformanceReportTopPerformer | null => {
  const memberId = normalizeString(row.top_performer_member_id)

  if (!memberId) return null

  return {
    memberId,
    memberName: normalizeString(row.top_performer_member_name) || memberId,
    otdPct: toNullableNumber(row.top_performer_otd_pct),
    throughputCount: toNumber(row.top_performer_throughput_count),
    rpaAvg: toNullableNumber(row.top_performer_rpa_avg),
    ftrPct: toNullableNumber(row.top_performer_ftr_pct)
  }
}

const buildReportFromMaterializedRows = (
  current: MaterializedPerformanceReportRow | ServingPerformanceReportRow,
  previous: MaterializedPerformanceReportRow | ServingPerformanceReportRow | null,
  periodYear: number,
  periodMonth: number,
  previousPeriodYear: number,
  previousPeriodMonth: number
): AgencyPerformanceReport => {
  const currentOnTimePct = toNullableNumber(current.on_time_pct)
  const previousOnTimePct = previous ? toNullableNumber(previous.on_time_pct) : null

  const onTimeDeltaPp =
    currentOnTimePct !== null && previousOnTimePct !== null
      ? Math.round((currentOnTimePct - previousOnTimePct) * 10) / 10
      : null

  const summary = {
    onTimePct: currentOnTimePct,
    previousOnTimePct,
    onTimeDeltaPp,
    trend: computeTrend(currentOnTimePct, previousOnTimePct),
    lateDrops: toNumber(current.late_drop_count),
    overdue: toNumber(current.overdue_count),
    carryOver: toNumber(current.carry_over_count),
    overdueCarriedForward: toNumber(current.overdue_carried_forward_count),
    totalTasks: toNumber(current.total_tasks),
    completedTasks: toNumber(current.completed_tasks),
    activeTasks: toNumber(current.active_tasks),
    efeonceTasks: toNumber(current.efeonce_tasks_count),
    skyTasks: toNumber(current.sky_tasks_count)
  }

  const topPerformer = buildTopPerformerFromMaterializedRow(current)
  const taskMix = parseTaskMix(current.task_mix_json)

  return {
    periodYear,
    periodMonth,
    previousPeriodYear,
    previousPeriodMonth,
    summary,
    taskMix,
    alertText: buildAlertText(summary, topPerformer),
    executiveSummary: buildExecutiveSummary(summary, taskMix, topPerformer),
    topPerformer,
    assumptions: {
      topPerformerMinThroughput: toNumber(current.top_performer_min_throughput) || TOP_PERFORMER_MIN_THROUGHPUT,
      multiAssigneePolicy: normalizeString(current.multi_assignee_policy) || TOP_PERFORMER_MULTI_ASSIGNEE_POLICY,
      trendStableBandPp: toNumber(current.trend_stable_band_pp) || TREND_STABLE_BAND_PP
    }
  }
}

const readServingAgencyPerformanceReport = async (
  periodYear: number,
  periodMonth: number
): Promise<AgencyPerformanceReport | null> => {
  const previous = getPreviousPeriod(periodYear, periodMonth)

  try {
    const rows = await runGreenhousePostgresQuery<ServingPerformanceReportRow>(
      `SELECT
        report_scope, period_year, period_month,
        on_time_count, late_drop_count, on_time_pct,
        overdue_count, carry_over_count, overdue_carried_forward_count,
        total_tasks, completed_tasks, active_tasks,
        efeonce_tasks_count, sky_tasks_count,
        task_mix_json::text AS task_mix_json,
        top_performer_member_id, top_performer_member_name,
        top_performer_otd_pct, top_performer_throughput_count,
        top_performer_rpa_avg, top_performer_ftr_pct,
        top_performer_min_throughput, trend_stable_band_pp, multi_assignee_policy
       FROM greenhouse_serving.agency_performance_reports
       WHERE report_scope = 'agency'
         AND (
           (period_year = $1 AND period_month = $2)
           OR
           (period_year = $3 AND period_month = $4)
         )`,
      [periodYear, periodMonth, previous.year, previous.month]
    )

    const current = rows.find(row =>
      toNumber(row.period_year) === periodYear &&
      toNumber(row.period_month) === periodMonth
    )

    if (!current) return null

    const previousRow = rows.find(row =>
      toNumber(row.period_year) === previous.year &&
      toNumber(row.period_month) === previous.month
    ) ?? null

    return buildReportFromMaterializedRows(current, previousRow, periodYear, periodMonth, previous.year, previous.month)
  } catch {
    return null
  }
}

const readMaterializedAgencyPerformanceReport = async (
  periodYear: number,
  periodMonth: number
): Promise<AgencyPerformanceReport | null> => {
  const projectId = getIcoEngineProjectId()
  const previous = getPreviousPeriod(periodYear, periodMonth)

  const rows = await runIcoEngineQuery<MaterializedPerformanceReportRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.performance_report_monthly\`
    WHERE report_scope = 'agency'
      AND (
        (period_year = @periodYear AND period_month = @periodMonth)
        OR
        (period_year = @previousPeriodYear AND period_month = @previousPeriodMonth)
      )
  `, {
    periodYear,
    periodMonth,
    previousPeriodYear: previous.year,
    previousPeriodMonth: previous.month
  })

  const current = rows.find(row =>
    toNumber(row.period_year) === periodYear &&
    toNumber(row.period_month) === periodMonth
  )

  if (!current) return null

  const previousRow = rows.find(row =>
    toNumber(row.period_year) === previous.year &&
    toNumber(row.period_month) === previous.month
  )

  return buildReportFromMaterializedRows(current, previousRow ?? null, periodYear, periodMonth, previous.year, previous.month)
}

export const readAgencyPerformanceReport = async (
  periodYear: number,
  periodMonth: number
): Promise<AgencyPerformanceReport> => {
  const serving = await readServingAgencyPerformanceReport(periodYear, periodMonth)

  if (serving) {
    return serving
  }

  const materialized = await readMaterializedAgencyPerformanceReport(periodYear, periodMonth)

  if (materialized) {
    return materialized
  }

  const previous = getPreviousPeriod(periodYear, periodMonth)

  const [currentSpaces, previousSpaces, topPerformer] = await Promise.all([
    readAgencyMetrics(periodYear, periodMonth),
    readAgencyMetrics(previous.year, previous.month),
    readTopPerformer(periodYear, periodMonth)
  ])

  const currentScopedSpaces = currentSpaces.filter(space => isAgencyReportIncludedSpace({
    spaceId: space.spaceId,
    clientId: space.clientId,
    clientName: space.clientName
  }))

  const previousScopedSpaces = previousSpaces.filter(space => isAgencyReportIncludedSpace({
    spaceId: space.spaceId,
    clientId: space.clientId,
    clientName: space.clientName
  }))

  const currentOnTimePct = computeOnTimePctFromSpaces(currentScopedSpaces)
  const previousOnTimePct = computeOnTimePctFromSpaces(previousScopedSpaces)

  const onTimeDeltaPp =
    currentOnTimePct !== null && previousOnTimePct !== null
      ? Math.round((currentOnTimePct - previousOnTimePct) * 10) / 10
      : null

  const currentSummary = summarizeSpaces(currentScopedSpaces)
  const taskMix = buildTaskMixFromSpaces(currentScopedSpaces)

  const summary = {
    onTimePct: currentOnTimePct,
    previousOnTimePct,
    onTimeDeltaPp,
    trend: computeTrend(currentOnTimePct, previousOnTimePct),
    lateDrops: currentSummary.lateDrops,
    overdue: currentSummary.overdue,
    carryOver: currentSummary.carryOver,
    overdueCarriedForward: currentSummary.overdueCarriedForward,
    totalTasks: currentSummary.totalTasks,
    completedTasks: currentSummary.completedTasks,
    activeTasks: currentSummary.activeTasks,
    efeonceTasks: currentSummary.efeonceTasks,
    skyTasks: currentSummary.skyTasks
  }

  return {
    periodYear,
    periodMonth,
    previousPeriodYear: previous.year,
    previousPeriodMonth: previous.month,
    summary,
    taskMix,
    alertText: buildAlertText(summary, topPerformer),
    executiveSummary: buildExecutiveSummary(summary, taskMix, topPerformer),
    topPerformer,
    assumptions: {
      topPerformerMinThroughput: TOP_PERFORMER_MIN_THROUGHPUT,
      multiAssigneePolicy: TOP_PERFORMER_MULTI_ASSIGNEE_POLICY,
      trendStableBandPp: TREND_STABLE_BAND_PP
    }
  }
}

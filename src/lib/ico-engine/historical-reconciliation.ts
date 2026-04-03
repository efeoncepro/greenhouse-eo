import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { agencyPerformanceReportProjection } from '@/lib/sync/projections/agency-performance-report'
import { icoMemberProjection } from '@/lib/sync/projections/ico-member-metrics'
import {
  getIcoEngineProjectId,
  normalizeString,
  runIcoEngineQuery,
  toNullableNumber,
  toNumber
} from './shared'
import {
  freezeDeliveryTaskMonthlySnapshot,
  materializeMonthlySnapshots,
  type MaterializationResult
} from './materialize'
import { ensureIcoEngineInfrastructure, ICO_DATASET } from './schema'

type AgencyReportRow = {
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
  top_performer_member_id: unknown
  top_performer_member_name: unknown
  top_performer_otd_pct: unknown
  top_performer_throughput_count: unknown
}

type MemberMetricRow = {
  member_id: string
  otd_pct: unknown
  total_tasks: unknown
  on_time_count: unknown
  late_drop_count: unknown
  overdue_count: unknown
  carry_over_count: unknown
  overdue_carried_forward_count: unknown
}

type ColumnRow = {
  column_name: string
}

type BaselineMemberExpectation = {
  memberId: string
  label: string
  totalTasks: number
  onTimeCount: number
  lateDropCount: number
  overdueCount: number
  carryOverCount: number
  overdueCarriedForwardCount: number
  otdPct: number
}

type BaselineExpectation = {
  sourcePageUrl: string
  agency: {
    totalTasks: number
    onTimeCount: number
    lateDropCount: number
    overdueCount: number
    carryOverCount: number
    overdueCarriedForwardCount: number
    onTimePct: number
    efeonceTasks: number
    skyTasks: number
    topPerformerMemberId: string
    topPerformerOtdPct: number
    topPerformerTaskCount: number
  }
  members: BaselineMemberExpectation[]
}

type NumericComparison = {
  expected: number | null
  actual: number | null
  delta: number | null
}

export interface HistoricalReconciliationResult {
  periodYear: number
  periodMonth: number
  periodKey: string
  infrastructure: {
    vTasksEnrichedHasPrimaryOwner: boolean
  }
  taskSnapshot: {
    rowsWritten: number
    snapshotStatus: 'working' | 'locked'
    reusedLockedSnapshot: boolean
  }
  materialization: MaterializationResult
  memberProjectionResults: Array<{
    memberId: string
    result: string | null
  }>
  agencyProjectionResult: string | null
  bigQueryReport: {
    onTimePct: number | null
    totalTasks: number
    onTimeCount: number
    lateDropCount: number
    overdueCount: number
    carryOverCount: number
    overdueCarriedForwardCount: number
    efeonceTasks: number
    skyTasks: number
    topPerformerMemberId: string | null
    topPerformerMemberName: string | null
    topPerformerOtdPct: number | null
    topPerformerTaskCount: number
  } | null
  postgresServingReport: {
    onTimePct: number | null
    totalTasks: number
    onTimeCount: number
    lateDropCount: number
    overdueCount: number
    carryOverCount: number
    overdueCarriedForwardCount: number
  } | null
  baselineComparison: {
    sourcePageUrl: string
    agency: {
      totalTasks: NumericComparison
      onTimeCount: NumericComparison
      lateDropCount: NumericComparison
      overdueCount: NumericComparison
      carryOverCount: NumericComparison
      overdueCarriedForwardCount: NumericComparison
      onTimePct: NumericComparison
      efeonceTasks: NumericComparison
      skyTasks: NumericComparison
      topPerformerOtdPct: NumericComparison
      topPerformerTaskCount: NumericComparison
      topPerformerMemberId: {
        expected: string | null
        actual: string | null
        matches: boolean
      }
    } | null
    members: Array<{
      memberId: string
      label: string
      totalTasks: NumericComparison
      onTimeCount: NumericComparison
      lateDropCount: NumericComparison
      overdueCount: NumericComparison
      carryOverCount: NumericComparison
      overdueCarriedForwardCount: NumericComparison
      otdPct: NumericComparison
    }>
  } | null
  residuals: string[]
}

const KNOWN_NOTION_BASELINES: Record<string, BaselineExpectation> = {
  '2026-03': {
    sourcePageUrl: 'https://www.notion.so/4504bd1576da4cef8404c2d8b0769b30',
    agency: {
      totalTasks: 283,
      onTimeCount: 191,
      lateDropCount: 75,
      overdueCount: 17,
      carryOverCount: 0,
      overdueCarriedForwardCount: 0,
      onTimePct: 67.5,
      efeonceTasks: 95,
      skyTasks: 188,
      topPerformerMemberId: 'daniela-ferreira',
      topPerformerOtdPct: 86.3,
      topPerformerTaskCount: 102
    },
    members: [
      {
        memberId: 'daniela-ferreira',
        label: 'Daniela',
        totalTasks: 102,
        onTimeCount: 88,
        lateDropCount: 13,
        overdueCount: 1,
        carryOverCount: 0,
        overdueCarriedForwardCount: 0,
        otdPct: 86.3
      },
      {
        memberId: 'valentina-hoyos',
        label: 'Valentina',
        totalTasks: 22,
        onTimeCount: 17,
        lateDropCount: 3,
        overdueCount: 2,
        carryOverCount: 0,
        overdueCarriedForwardCount: 0,
        otdPct: 77.3
      },
      {
        memberId: 'melkin-hernandez',
        label: 'Melkin',
        totalTasks: 53,
        onTimeCount: 26,
        lateDropCount: 26,
        overdueCount: 1,
        carryOverCount: 0,
        overdueCarriedForwardCount: 0,
        otdPct: 49.1
      },
      {
        memberId: 'andres-carlosama',
        label: 'Andrés',
        totalTasks: 67,
        onTimeCount: 29,
        lateDropCount: 25,
        overdueCount: 13,
        carryOverCount: 0,
        overdueCarriedForwardCount: 0,
        otdPct: 43.3
      }
    ]
  }
}

const buildNumericComparison = (expected: number | null, actual: number | null): NumericComparison => ({
  expected,
  actual,
  delta: expected === null || actual === null ? null : Math.round((actual - expected) * 10) / 10
})

const getBaseline = (periodYear: number, periodMonth: number) =>
  KNOWN_NOTION_BASELINES[`${periodYear}-${String(periodMonth).padStart(2, '0')}`] ?? null

const readVTasksEnrichedColumns = async (): Promise<Set<string>> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<ColumnRow>(`
    SELECT column_name
    FROM \`${projectId}.${ICO_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'v_tasks_enriched'
  `)

  return new Set(rows.map(row => normalizeString(row.column_name)).filter(Boolean))
}

const readAgencyReportRow = async (
  periodYear: number,
  periodMonth: number
): Promise<AgencyReportRow | null> => {
  const projectId = getIcoEngineProjectId()

  const rows = await runIcoEngineQuery<AgencyReportRow>(`
    SELECT *
    FROM \`${projectId}.${ICO_DATASET}.performance_report_monthly\`
    WHERE report_scope = 'agency'
      AND period_year = @periodYear
      AND period_month = @periodMonth
    LIMIT 1
  `, { periodYear, periodMonth })

  return rows[0] ?? null
}

const readServingAgencyReportRow = async (
  periodYear: number,
  periodMonth: number
): Promise<AgencyReportRow | null> => {
  const rows = await runGreenhousePostgresQuery<AgencyReportRow>(
    `SELECT
       report_scope, period_year, period_month,
       on_time_count, late_drop_count, on_time_pct,
       overdue_count, carry_over_count, overdue_carried_forward_count,
       total_tasks, completed_tasks, active_tasks,
       efeonce_tasks_count, sky_tasks_count,
       top_performer_member_id, top_performer_member_name,
       top_performer_otd_pct, top_performer_throughput_count
     FROM greenhouse_serving.agency_performance_reports
     WHERE report_scope = $1
       AND period_year = $2
       AND period_month = $3
     LIMIT 1`,
    ['agency', periodYear, periodMonth]
  )

  return rows[0] ?? null
}

const readMemberRows = async (
  periodYear: number,
  periodMonth: number,
  memberIds: string[]
): Promise<MemberMetricRow[]> => {
  if (memberIds.length === 0) return []

  const projectId = getIcoEngineProjectId()

  return runIcoEngineQuery<MemberMetricRow>(`
    SELECT
      member_id,
      otd_pct,
      total_tasks,
      on_time_count,
      late_drop_count,
      overdue_count,
      carry_over_count,
      overdue_carried_forward_count
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
      AND member_id IN UNNEST(@memberIds)
    ORDER BY member_id
  `, { periodYear, periodMonth, memberIds })
}

const mapAgencyReport = (row: AgencyReportRow | null) => {
  if (!row) return null

  return {
    onTimePct: toNullableNumber(row.on_time_pct),
    totalTasks: toNumber(row.total_tasks),
    onTimeCount: toNumber(row.on_time_count),
    lateDropCount: toNumber(row.late_drop_count),
    overdueCount: toNumber(row.overdue_count),
    carryOverCount: toNumber(row.carry_over_count),
    overdueCarriedForwardCount: toNumber(row.overdue_carried_forward_count),
    efeonceTasks: toNumber(row.efeonce_tasks_count),
    skyTasks: toNumber(row.sky_tasks_count),
    topPerformerMemberId: normalizeString(row.top_performer_member_id) || null,
    topPerformerMemberName: normalizeString(row.top_performer_member_name) || null,
    topPerformerOtdPct: toNullableNumber(row.top_performer_otd_pct),
    topPerformerTaskCount: toNumber(row.top_performer_throughput_count)
  }
}

export const reconcileHistoricalPerformancePeriod = async (
  periodYear: number,
  periodMonth: number
): Promise<HistoricalReconciliationResult> => {
  await ensureIcoEngineInfrastructure()

  const viewColumns = await readVTasksEnrichedColumns()
  const vTasksEnrichedHasPrimaryOwner = viewColumns.has('primary_owner_member_id')

  const taskSnapshot = await freezeDeliveryTaskMonthlySnapshot(periodYear, periodMonth)
  const materialization = await materializeMonthlySnapshots(periodYear, periodMonth)

  const projectId = getIcoEngineProjectId()

  const memberRows = await runIcoEngineQuery<{ member_id: string }>(`
    SELECT DISTINCT member_id
    FROM \`${projectId}.${ICO_DATASET}.metrics_by_member\`
    WHERE period_year = @periodYear
      AND period_month = @periodMonth
      AND member_id IS NOT NULL
      AND TRIM(member_id) != ''
    ORDER BY member_id
  `, { periodYear, periodMonth })

  const memberProjectionResults: HistoricalReconciliationResult['memberProjectionResults'] = []

  for (const row of memberRows) {
    const memberId = normalizeString(row.member_id)

    if (!memberId) continue

    const result = await icoMemberProjection.refresh(
      { entityType: 'member', entityId: memberId },
      { memberId, periodYear, periodMonth }
    )

    memberProjectionResults.push({ memberId, result })
  }

  const agencyProjectionResult = await agencyPerformanceReportProjection.refresh(
    { entityType: 'agency_performance_report', entityId: 'agency' },
    { reportScope: 'agency', periodYear, periodMonth }
  )

  const bigQueryReport = mapAgencyReport(await readAgencyReportRow(periodYear, periodMonth))
  const postgresServingReport = mapAgencyReport(await readServingAgencyReportRow(periodYear, periodMonth))

  const baseline = getBaseline(periodYear, periodMonth)

  const memberBaselineRows = baseline
    ? await readMemberRows(periodYear, periodMonth, baseline.members.map(member => member.memberId))
    : []

  const memberActualMap = new Map(memberBaselineRows.map(row => [normalizeString(row.member_id), row]))

  const baselineComparison = baseline ? {
    sourcePageUrl: baseline.sourcePageUrl,
    agency: bigQueryReport ? {
      totalTasks: buildNumericComparison(baseline.agency.totalTasks, bigQueryReport.totalTasks),
      onTimeCount: buildNumericComparison(baseline.agency.onTimeCount, bigQueryReport.onTimeCount),
      lateDropCount: buildNumericComparison(baseline.agency.lateDropCount, bigQueryReport.lateDropCount),
      overdueCount: buildNumericComparison(baseline.agency.overdueCount, bigQueryReport.overdueCount),
      carryOverCount: buildNumericComparison(baseline.agency.carryOverCount, bigQueryReport.carryOverCount),
      overdueCarriedForwardCount: buildNumericComparison(baseline.agency.overdueCarriedForwardCount, bigQueryReport.overdueCarriedForwardCount),
      onTimePct: buildNumericComparison(baseline.agency.onTimePct, bigQueryReport.onTimePct),
      efeonceTasks: buildNumericComparison(baseline.agency.efeonceTasks, bigQueryReport.efeonceTasks),
      skyTasks: buildNumericComparison(baseline.agency.skyTasks, bigQueryReport.skyTasks),
      topPerformerOtdPct: buildNumericComparison(baseline.agency.topPerformerOtdPct, bigQueryReport.topPerformerOtdPct),
      topPerformerTaskCount: buildNumericComparison(baseline.agency.topPerformerTaskCount, bigQueryReport.topPerformerTaskCount),
      topPerformerMemberId: {
        expected: baseline.agency.topPerformerMemberId,
        actual: bigQueryReport.topPerformerMemberId,
        matches: baseline.agency.topPerformerMemberId === bigQueryReport.topPerformerMemberId
      }
    } : null,
    members: baseline.members.map(member => {
      const actual = memberActualMap.get(member.memberId)

      return {
        memberId: member.memberId,
        label: member.label,
        totalTasks: buildNumericComparison(member.totalTasks, actual ? toNumber(actual.total_tasks) : null),
        onTimeCount: buildNumericComparison(member.onTimeCount, actual ? toNumber(actual.on_time_count) : null),
        lateDropCount: buildNumericComparison(member.lateDropCount, actual ? toNumber(actual.late_drop_count) : null),
        overdueCount: buildNumericComparison(member.overdueCount, actual ? toNumber(actual.overdue_count) : null),
        carryOverCount: buildNumericComparison(member.carryOverCount, actual ? toNumber(actual.carry_over_count) : null),
        overdueCarriedForwardCount: buildNumericComparison(member.overdueCarriedForwardCount, actual ? toNumber(actual.overdue_carried_forward_count) : null),
        otdPct: buildNumericComparison(member.otdPct, actual ? toNullableNumber(actual.otd_pct) : null)
      }
    })
  } : null

  const residuals: string[] = []

  if (!vTasksEnrichedHasPrimaryOwner) {
    residuals.push('v_tasks_enriched sigue sin primary_owner_member_id después de ensureIcoEngineInfrastructure().')
  }

  if (!bigQueryReport) {
    residuals.push('BigQuery performance_report_monthly no generó fila agency para el período.')
  }

  if (!postgresServingReport) {
    residuals.push('PostgreSQL greenhouse_serving.agency_performance_reports no recibió fila agency para el período.')
  }

  if (baselineComparison?.agency) {
    const fields = Object.entries(baselineComparison.agency)
      .filter(([key]) => key !== 'topPerformerMemberId')

    for (const [field, comparison] of fields) {
      if ('delta' in comparison && comparison.delta !== 0 && comparison.delta !== null) {
        residuals.push(`Agency drift en ${field}: ${comparison.delta}.`)
      }
    }

    if (!baselineComparison.agency.topPerformerMemberId.matches) {
      residuals.push('Top performer de Greenhouse no coincide con el baseline de Notion.')
    }
  }

  for (const member of baselineComparison?.members ?? []) {
    const memberFields = [
      member.totalTasks,
      member.onTimeCount,
      member.lateDropCount,
      member.overdueCount,
      member.carryOverCount,
      member.overdueCarriedForwardCount,
      member.otdPct
    ]

    if (memberFields.some(field => field.delta !== 0 && field.delta !== null)) {
      residuals.push(`Drift residual para ${member.label} (${member.memberId}).`)
    }
  }

  return {
    periodYear,
    periodMonth,
    periodKey: `${periodYear}-${String(periodMonth).padStart(2, '0')}`,
    infrastructure: {
      vTasksEnrichedHasPrimaryOwner
    },
    taskSnapshot,
    materialization,
    memberProjectionResults,
    agencyProjectionResult,
    bigQueryReport,
    postgresServingReport,
    baselineComparison,
    residuals
  }
}

import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  if (typeof v === 'object' && v !== null && 'value' in v) {
    return toNum((v as { value: unknown }).value)
  }

  return null
}

const toText = (v: unknown): string | null => {
  if (typeof v === 'string') {
    const trimmed = v.trim()

    return trimmed || null
  }

  return null
}

export const agencyPerformanceReportProjection: ProjectionDefinition = {
  name: 'agency_performance_reports',
  description: 'Mirror ICO monthly agency performance report into greenhouse_serving',
  domain: 'delivery',

  triggerEvents: ['ico.performance_report.materialized'],

  extractScope: payload => {
    const reportScope = typeof payload.reportScope === 'string' && payload.reportScope.trim()
      ? payload.reportScope.trim()
      : 'agency'

    return { entityType: 'agency_performance_report', entityId: reportScope }
  },

  refresh: async (scope, payload) => {
    const reportScope = scope.entityId || 'agency'
    const now = new Date()
    const periodYear = Number(payload.periodYear ?? now.getFullYear())
    const periodMonth = Number(payload.periodMonth ?? (now.getMonth() + 1))

    try {
      const projectId = getBigQueryProjectId()
      const bigQuery = getBigQueryClient()

      const [rows] = await bigQuery.query({
        query: `
          SELECT *
          FROM \`${projectId}.ico_engine.performance_report_monthly\`
          WHERE report_scope = @reportScope
            AND period_year = @periodYear
            AND period_month = @periodMonth
          LIMIT 1
        `,
        params: { reportScope, periodYear, periodMonth }
      })

      if (rows.length === 0) {
        return `no ICO agency performance report for ${reportScope} (${periodYear}-${periodMonth})`
      }

      const row = rows[0] as Record<string, unknown>
      const taskMixJson = toText(row.task_mix_json) ?? '[]'

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_serving.agency_performance_reports (
          report_scope, period_year, period_month,
          on_time_count, late_drop_count, on_time_pct,
          overdue_count, carry_over_count, overdue_carried_forward_count,
          total_tasks, completed_tasks, active_tasks,
          efeonce_tasks_count, sky_tasks_count, task_mix_json,
          top_performer_member_id, top_performer_member_name,
          top_performer_otd_pct, top_performer_throughput_count,
          top_performer_rpa_avg, top_performer_ftr_pct,
          top_performer_min_throughput, trend_stable_band_pp, multi_assignee_policy,
          source, materialized_at
        ) VALUES (
          $1, $2, $3,
          $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12,
          $13, $14, $15::jsonb,
          $16, $17,
          $18, $19,
          $20, $21,
          $22, $23, $24,
          'ico_engine.performance_report_monthly', NOW()
        )
        ON CONFLICT (report_scope, period_year, period_month) DO UPDATE SET
          on_time_count = EXCLUDED.on_time_count,
          late_drop_count = EXCLUDED.late_drop_count,
          on_time_pct = EXCLUDED.on_time_pct,
          overdue_count = EXCLUDED.overdue_count,
          carry_over_count = EXCLUDED.carry_over_count,
          overdue_carried_forward_count = EXCLUDED.overdue_carried_forward_count,
          total_tasks = EXCLUDED.total_tasks,
          completed_tasks = EXCLUDED.completed_tasks,
          active_tasks = EXCLUDED.active_tasks,
          efeonce_tasks_count = EXCLUDED.efeonce_tasks_count,
          sky_tasks_count = EXCLUDED.sky_tasks_count,
          task_mix_json = EXCLUDED.task_mix_json,
          top_performer_member_id = EXCLUDED.top_performer_member_id,
          top_performer_member_name = EXCLUDED.top_performer_member_name,
          top_performer_otd_pct = EXCLUDED.top_performer_otd_pct,
          top_performer_throughput_count = EXCLUDED.top_performer_throughput_count,
          top_performer_rpa_avg = EXCLUDED.top_performer_rpa_avg,
          top_performer_ftr_pct = EXCLUDED.top_performer_ftr_pct,
          top_performer_min_throughput = EXCLUDED.top_performer_min_throughput,
          trend_stable_band_pp = EXCLUDED.trend_stable_band_pp,
          multi_assignee_policy = EXCLUDED.multi_assignee_policy,
          source = 'ico_engine.performance_report_monthly',
          materialized_at = NOW()`,
        [
          reportScope, periodYear, periodMonth,
          toNum(row.on_time_count), toNum(row.late_drop_count), toNum(row.on_time_pct),
          toNum(row.overdue_count), toNum(row.carry_over_count), toNum(row.overdue_carried_forward_count),
          toNum(row.total_tasks), toNum(row.completed_tasks), toNum(row.active_tasks),
          toNum(row.efeonce_tasks_count), toNum(row.sky_tasks_count), taskMixJson,
          toText(row.top_performer_member_id), toText(row.top_performer_member_name),
          toNum(row.top_performer_otd_pct), toNum(row.top_performer_throughput_count),
          toNum(row.top_performer_rpa_avg), toNum(row.top_performer_ftr_pct),
          toNum(row.top_performer_min_throughput), toNum(row.trend_stable_band_pp), toText(row.multi_assignee_policy)
        ]
      )

      return `refreshed agency_performance_reports for ${reportScope} (${periodYear}-${periodMonth})`
    } catch (error) {
      return `skipped agency_performance_reports for ${reportScope}: ${error instanceof Error ? error.message : 'unknown error'}`
    }
  },

  maxRetries: 1
}

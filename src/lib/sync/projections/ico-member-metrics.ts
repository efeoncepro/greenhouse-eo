import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return v

  if (typeof v === 'string') {
    const n = Number(v)

    return Number.isFinite(n) ? n : null
  }

  if (typeof v === 'object' && v !== null && 'value' in v) return toNum((v as { value: unknown }).value)

  return null
}

export const icoMemberProjection: ProjectionDefinition = {
  name: 'ico_member_metrics',
  description: 'Refresh ICO member metrics when member assignments change',
  domain: 'people',

  triggerEvents: [
    'member.created',
    'member.updated',
    'assignment.created',
    'assignment.updated',
    'assignment.removed'
  ],

  extractScope: (payload) => {
    const memberId = payload.memberId as string | undefined

    if (memberId) return { entityType: 'member', entityId: memberId }

    return null
  },

  refresh: async (scope, payload) => {
    // Targeted refresh: pull this member's latest metrics from BigQuery → Postgres
    const memberId = scope.entityId

    try {
      const projectId = getBigQueryProjectId()
      const bigQuery = getBigQueryClient()

      const payloadYear =
        typeof payload.periodYear === 'number'
          ? payload.periodYear
          : typeof payload.periodYear === 'string'
            ? Number(payload.periodYear)
            : null

      const payloadMonth =
        typeof payload.periodMonth === 'number'
          ? payload.periodMonth
          : typeof payload.periodMonth === 'string'
            ? Number(payload.periodMonth)
            : null

      const now = new Date()

      const year = Number.isInteger(payloadYear) && payloadYear! >= 2024 && payloadYear! <= 2030
        ? payloadYear!
        : now.getFullYear()

      const month = Number.isInteger(payloadMonth) && payloadMonth! >= 1 && payloadMonth! <= 12
        ? payloadMonth!
        : now.getMonth() + 1

      const [rows] = await bigQuery.query({
        query: `SELECT *
                FROM \`${projectId}.ico_engine.metrics_by_member\`
                WHERE member_id = @memberId
                  AND period_year = @year AND period_month = @month
                LIMIT 1`,
        params: { memberId, year, month }
      })

      if (rows.length === 0) return `no ICO data for member ${memberId}`

      const r = rows[0] as Record<string, unknown>

      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_serving.ico_member_metrics (
          member_id, period_year, period_month,
          rpa_avg, rpa_median, otd_pct, ftr_pct,
          cycle_time_avg_days, throughput_count, pipeline_velocity,
          stuck_asset_count, stuck_asset_pct,
          total_tasks, completed_tasks, active_tasks, carry_over_count,
          materialized_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
          rpa_avg = EXCLUDED.rpa_avg,
          rpa_median = EXCLUDED.rpa_median,
          otd_pct = EXCLUDED.otd_pct,
          ftr_pct = EXCLUDED.ftr_pct,
          cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
          throughput_count = EXCLUDED.throughput_count,
          pipeline_velocity = EXCLUDED.pipeline_velocity,
          stuck_asset_count = EXCLUDED.stuck_asset_count,
          stuck_asset_pct = EXCLUDED.stuck_asset_pct,
          total_tasks = EXCLUDED.total_tasks,
          completed_tasks = EXCLUDED.completed_tasks,
          active_tasks = EXCLUDED.active_tasks,
          carry_over_count = EXCLUDED.carry_over_count,
          materialized_at = NOW()`,
        [
          memberId, year, month,
          toNum(r.rpa_avg), toNum(r.rpa_median), toNum(r.otd_pct), toNum(r.ftr_pct),
          toNum(r.cycle_time_avg_days), toNum(r.throughput_count), toNum(r.pipeline_velocity),
          toNum(r.stuck_asset_count), toNum(r.stuck_asset_pct),
          toNum(r.total_tasks), toNum(r.completed_tasks), toNum(r.active_tasks), toNum(r.carry_over_count)
        ]
      )

      return `refreshed ico_member_metrics for ${memberId} (${year}-${month})`
    } catch {
      // BigQuery may not have data yet — non-blocking
      return `flagged ico_member_metrics refresh for ${memberId} (no BQ data)`
    }
  },

  maxRetries: 1
}

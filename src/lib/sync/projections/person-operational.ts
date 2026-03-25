import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { ensurePersonOperationalSchema } from '@/lib/person-360/get-person-operational-serving'

export const personOperationalProjection: ProjectionDefinition = {
  name: 'person_operational_metrics',
  description: 'Materialize person operational serving from ICO member metrics',
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

  refresh: async (scope) => {
    await ensurePersonOperationalSchema()

    const memberId = scope.entityId

    // Copy latest ICO metrics into person_operational_metrics
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.person_operational_metrics (
        member_id, period_year, period_month,
        tasks_completed, tasks_active, tasks_total,
        rpa_avg, otd_pct, ftr_pct,
        cycle_time_avg_days, throughput_count, stuck_asset_count,
        project_breakdown, source, materialized_at
      )
      SELECT
        member_id, period_year, period_month,
        COALESCE(completed_tasks, 0), COALESCE(active_tasks, 0), COALESCE(total_tasks, 0),
        rpa_avg, otd_pct, ftr_pct,
        cycle_time_avg_days, throughput_count, COALESCE(stuck_asset_count, 0),
        '[]'::jsonb, 'ico_reactive', NOW()
      FROM greenhouse_serving.ico_member_metrics
      WHERE member_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
      ON CONFLICT (member_id, period_year, period_month) DO UPDATE SET
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_active = EXCLUDED.tasks_active,
        tasks_total = EXCLUDED.tasks_total,
        rpa_avg = EXCLUDED.rpa_avg,
        otd_pct = EXCLUDED.otd_pct,
        ftr_pct = EXCLUDED.ftr_pct,
        cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
        throughput_count = EXCLUDED.throughput_count,
        stuck_asset_count = EXCLUDED.stuck_asset_count,
        source = 'ico_reactive',
        materialized_at = NOW()`,
      [memberId]
    ).catch(() => {})

    return `refreshed person_operational_metrics for ${memberId}`
  },

  maxRetries: 1
}

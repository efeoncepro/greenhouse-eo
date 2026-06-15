import 'server-only'

import type { ProjectionDefinition } from '../projection-registry'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { ensureOrganizationOperationalSchema } from '@/lib/account-360/get-organization-operational-serving'

export const organizationOperationalProjection: ProjectionDefinition = {
  name: 'organization_operational_metrics',
  description: 'Materialize organization operational serving from ICO organization metrics',
  domain: 'organization',

  triggerEvents: [
    'ico.materialization.completed',
    'organization.created',
    'organization.updated',
    'space.created'
  ],

  extractScope: (payload) => {
    const orgId = payload.organizationId as string | undefined

    if (orgId) return { entityType: 'organization', entityId: orgId }

    return null
  },

  refresh: async (scope) => {
    await ensureOrganizationOperationalSchema()

    const organizationId = scope.entityId

    // Copy latest ICO metrics into organization_operational_metrics
    // Populate the full operational contract including the rich delivery columns (TASK-1106:
    // rpa_median / pipeline_velocity / stuck_asset_pct) so the compact serving cache stays at parity
    // with `ico_organization_metrics` and the Account 360 delivery facet reader never hits a
    // missing column (ISSUE-087).
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.organization_operational_metrics (
        organization_id, period_year, period_month,
        tasks_completed, tasks_active, tasks_total,
        rpa_avg, rpa_median, otd_pct, ftr_pct,
        cycle_time_avg_days, throughput_count, pipeline_velocity,
        stuck_asset_count, stuck_asset_pct,
        source, materialized_at
      )
      SELECT
        organization_id, period_year, period_month,
        COALESCE(completed_tasks, 0), COALESCE(active_tasks, 0), COALESCE(total_tasks, 0),
        rpa_avg, rpa_median, otd_pct, ftr_pct,
        cycle_time_avg_days, throughput_count, pipeline_velocity,
        COALESCE(stuck_asset_count, 0), stuck_asset_pct,
        'ico_organization_metrics', NOW()
      FROM greenhouse_serving.ico_organization_metrics
      WHERE organization_id = $1
      ORDER BY period_year DESC, period_month DESC
      LIMIT 1
      ON CONFLICT (organization_id, period_year, period_month) DO UPDATE SET
        tasks_completed = EXCLUDED.tasks_completed,
        tasks_active = EXCLUDED.tasks_active,
        tasks_total = EXCLUDED.tasks_total,
        rpa_avg = EXCLUDED.rpa_avg,
        rpa_median = EXCLUDED.rpa_median,
        otd_pct = EXCLUDED.otd_pct,
        ftr_pct = EXCLUDED.ftr_pct,
        cycle_time_avg_days = EXCLUDED.cycle_time_avg_days,
        throughput_count = EXCLUDED.throughput_count,
        pipeline_velocity = EXCLUDED.pipeline_velocity,
        stuck_asset_count = EXCLUDED.stuck_asset_count,
        stuck_asset_pct = EXCLUDED.stuck_asset_pct,
        source = 'ico_organization_metrics',
        materialized_at = NOW()`,
      [organizationId]
    ).catch(() => {})

    return `refreshed organization_operational_metrics for ${organizationId}`
  },

  maxRetries: 1
}

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

interface OrganizationIcoAliasRow extends Record<string, unknown> {
  organization_id: string
  hubspot_company_id: string | null
  space_client_id: string | null
}

export interface OrganizationIcoSourceResolution {
  organizationId: string
  sourceIds: string[]
}

export interface OrganizationIcoSourceMetricsRow {
  organization_id: string
  period_year: number
  period_month: number
  rpa_avg: unknown
  rpa_median: unknown
  otd_pct: unknown
  ftr_pct: unknown
  cycle_time_avg_days: unknown
  throughput_count: unknown
  pipeline_velocity: unknown
  stuck_asset_count: unknown
  stuck_asset_pct: unknown
  total_tasks: unknown
  completed_tasks: unknown
  active_tasks: unknown
  materialized_at: unknown
}

const pushAlias = (aliases: Set<string>, value: unknown) => {
  if (typeof value !== 'string') return

  const trimmed = value.trim()

  if (!trimmed) return

  aliases.add(trimmed)

  if (/^\d+$/.test(trimmed)) {
    aliases.add(`hubspot-company-${trimmed}`)
  }
}

export const resolveOrganizationIcoSourceIds = async (
  organizationIdOrPublicId: string
): Promise<OrganizationIcoSourceResolution> => {
  // The ICO materializer (TASK-900) keys `ico_engine.metrics_by_organization` rows by the
  // SPACE's client_id (e.g. `hubspot-company-30825221458`), NOT by the canonical org_id.
  // We therefore resolve every alias an org's spaces could be keyed under, using ONLY columns
  // that exist: organization_360.{organization_id, public_id, hubspot_company_id} and
  // greenhouse_core.spaces.{organization_id, client_id}. Referencing non-existent columns here
  // would throw and (under the legacy silent catch) collapse the alias set to org_id only —
  // the empirically-confirmed cause of null ICO metrics.
  const rows = await runGreenhousePostgresQuery<OrganizationIcoAliasRow>(`
    WITH target AS (
      SELECT
        organization_id,
        hubspot_company_id
      FROM greenhouse_serving.organization_360
      WHERE organization_id = $1 OR public_id = $1
      LIMIT 1
    )
    SELECT
      target.organization_id,
      target.hubspot_company_id,
      spaces.client_id AS space_client_id
    FROM target
    LEFT JOIN greenhouse_core.spaces spaces
      ON spaces.organization_id = target.organization_id
     AND spaces.active = TRUE
  `, [organizationIdOrPublicId])

  const canonicalOrganizationId = rows[0]?.organization_id || organizationIdOrPublicId
  const aliases = new Set<string>()

  pushAlias(aliases, canonicalOrganizationId)

  for (const row of rows) {
    pushAlias(aliases, row.hubspot_company_id)
    pushAlias(aliases, row.space_client_id)
  }

  return {
    organizationId: canonicalOrganizationId,
    sourceIds: Array.from(aliases)
  }
}

export const readOrganizationIcoMetricsFromBigQuery = async (input: {
  organizationId: string
  periodYear: number
  periodMonth: number
  mode?: 'exact' | 'latest_at_or_before'
}): Promise<OrganizationIcoSourceMetricsRow | null> => {
  const resolution = await resolveOrganizationIcoSourceIds(input.organizationId)

  if (resolution.sourceIds.length === 0) return null

  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const periodPredicate = input.mode === 'exact'
    ? 'period_year = @periodYear AND period_month = @periodMonth'
    : '(period_year < @periodYear OR (period_year = @periodYear AND period_month <= @periodMonth))'

  const [rows] = await bigQuery.query({
    query: `
      WITH candidate_rows AS (
        SELECT *
        FROM \`${projectId}.ico_engine.metrics_by_organization\`
        WHERE organization_id IN UNNEST(@sourceIds)
          AND ${periodPredicate}
      ),
      latest_period AS (
        SELECT period_year, period_month
        FROM candidate_rows
        GROUP BY period_year, period_month
        ORDER BY period_year DESC, period_month DESC
        LIMIT 1
      ),
      period_rows AS (
        SELECT candidate_rows.*
        FROM candidate_rows
        JOIN latest_period USING (period_year, period_month)
      )
      SELECT
        @canonicalOrganizationId AS organization_id,
        ANY_VALUE(period_year) AS period_year,
        ANY_VALUE(period_month) AS period_month,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(rpa_avg, 0) * COALESCE(rpa_eligible_task_count, completed_tasks, 0)),
            NULLIF(SUM(COALESCE(rpa_eligible_task_count, completed_tasks, 0)), 0)
          ),
          2
        ) AS rpa_avg,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(rpa_median, 0) * COALESCE(rpa_eligible_task_count, completed_tasks, 0)),
            NULLIF(SUM(COALESCE(rpa_eligible_task_count, completed_tasks, 0)), 0)
          ),
          2
        ) AS rpa_median,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(on_time_count, 0)),
            NULLIF(SUM(COALESCE(on_time_count, 0) + COALESCE(late_drop_count, 0) + COALESCE(overdue_count, 0)), 0)
          ) * 100,
          1
        ) AS otd_pct,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(ftr_pct, 0) * COALESCE(completed_tasks, 0)),
            NULLIF(SUM(COALESCE(completed_tasks, 0)), 0)
          ),
          1
        ) AS ftr_pct,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(cycle_time_avg_days, 0) * COALESCE(completed_tasks, 0)),
            NULLIF(SUM(COALESCE(completed_tasks, 0)), 0)
          ),
          1
        ) AS cycle_time_avg_days,
        SUM(COALESCE(throughput_count, 0)) AS throughput_count,
        SUM(COALESCE(pipeline_velocity, 0)) AS pipeline_velocity,
        SUM(COALESCE(stuck_asset_count, 0)) AS stuck_asset_count,
        ROUND(
          SAFE_DIVIDE(
            SUM(COALESCE(stuck_asset_count, 0)),
            NULLIF(SUM(COALESCE(active_tasks, total_tasks, 0)), 0)
          ) * 100,
          1
        ) AS stuck_asset_pct,
        SUM(COALESCE(total_tasks, 0)) AS total_tasks,
        SUM(COALESCE(completed_tasks, 0)) AS completed_tasks,
        SUM(COALESCE(active_tasks, 0)) AS active_tasks,
        MAX(materialized_at) AS materialized_at
      FROM period_rows
    `,
    params: {
      canonicalOrganizationId: resolution.organizationId,
      sourceIds: resolution.sourceIds,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth
    }
  })

  const row = rows[0] as OrganizationIcoSourceMetricsRow | undefined

  if (!row || row.period_year == null || row.period_month == null) return null

  return row
}

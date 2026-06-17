import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleAuthOptions, getGoogleProjectId } from '@/lib/google-credentials'
import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const parseArg = (name: string): string | null => {
  const prefix = `--${name}=`
  const arg = process.argv.find(value => value.startsWith(prefix))

  return arg ? arg.slice(prefix.length) : null
}

const main = async () => {
  loadGreenhouseToolEnv()

  const now = new Date()
  const year = Number(parseArg('year') ?? now.getUTCFullYear())
  const month = Number(parseArg('month') ?? now.getUTCMonth() + 1)
  const maxLagHours = Number(parseArg('max-lag-hours') ?? 36)

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid period: year=${year}, month=${month}`)
  }

  const projectId = getGoogleProjectId()
  const bq = new BigQuery(getGoogleAuthOptions())

  const query = `
    WITH member_freshness AS (
      SELECT
        MAX(materialized_at) AS member_materialized_at,
        COUNT(*) AS member_rows
      FROM \`${projectId}.ico_engine.metrics_by_member\`
      WHERE period_year = @year
        AND period_month = @month
    ),
    source_freshness AS (
      SELECT MAX(source_freshness_at) AS source_freshness_at
      FROM (
        SELECT MAX(materialized_at) AS source_freshness_at
        FROM \`${projectId}.ico_engine.delivery_task_monthly_snapshots\`
        WHERE period_year = @year
          AND period_month = @month

        UNION ALL

        SELECT MAX(computed_at) AS source_freshness_at
        FROM \`${projectId}.ico_engine.metric_snapshots_monthly\`
        WHERE period_year = @year
          AND period_month = @month
      )
    )
    SELECT
      member_rows,
      member_materialized_at,
      source_freshness_at,
      TIMESTAMP_DIFF(source_freshness_at, member_materialized_at, HOUR) AS lag_hours
    FROM member_freshness, source_freshness
  `

  const [rows] = await bq.query({
    query,
    params: { year, month }
  })

  const row = rows[0] ?? {}
  const lagHours = Number(row.lag_hours ?? 0)

  const payload = {
    projectId,
    period: { year, month },
    memberRows: Number(row.member_rows ?? 0),
    memberMaterializedAt: row.member_materialized_at?.value ?? row.member_materialized_at ?? null,
    sourceFreshnessAt: row.source_freshness_at?.value ?? row.source_freshness_at ?? null,
    lagHours,
    maxLagHours,
    status: lagHours > maxLagHours ? 'stale' : 'ok'
  }

  console.log(JSON.stringify(payload, null, 2))

  if (payload.status === 'stale') {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

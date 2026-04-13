import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import {
  LEGACY_CLIENT_DASHBOARD_PATH,
  LEGACY_FINANCE_DASHBOARD_PATH,
  LEGACY_HR_HOME_PATH,
  LEGACY_INTERNAL_DASHBOARD_PATH,
  LEGACY_MY_HOME_PATH,
  PORTAL_HOME_PATH
} from '@/lib/tenant/resolve-portal-home-path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const APPLY_FLAG = '--apply'
const isApplyMode = process.argv.includes(APPLY_FLAG)

const legacyPaths = [
  LEGACY_CLIENT_DASHBOARD_PATH,
  LEGACY_INTERNAL_DASHBOARD_PATH,
  LEGACY_FINANCE_DASHBOARD_PATH,
  LEGACY_HR_HOME_PATH,
  LEGACY_MY_HOME_PATH
]

const postgresPredicate = `
  default_portal_home_path IS NULL
  OR btrim(default_portal_home_path) = ''
  OR btrim(default_portal_home_path) IN ('${legacyPaths.join("','")}')
`

const postgresNormalizationSql = `
  CASE
    WHEN default_portal_home_path IS NULL OR btrim(default_portal_home_path) = '' THEN '${PORTAL_HOME_PATH}'
    WHEN btrim(default_portal_home_path) IN ('${LEGACY_CLIENT_DASHBOARD_PATH}', '${LEGACY_INTERNAL_DASHBOARD_PATH}') THEN '${PORTAL_HOME_PATH}'
    WHEN btrim(default_portal_home_path) = '${LEGACY_FINANCE_DASHBOARD_PATH}' THEN '/finance'
    WHEN btrim(default_portal_home_path) = '${LEGACY_HR_HOME_PATH}' THEN '/hr/payroll'
    WHEN btrim(default_portal_home_path) = '${LEGACY_MY_HOME_PATH}' THEN '/my'
    ELSE btrim(default_portal_home_path)
  END
`

const bigQueryPredicate = `
  default_portal_home_path IS NULL
  OR TRIM(default_portal_home_path) = ''
  OR TRIM(default_portal_home_path) IN ('${legacyPaths.join("','")}')
`

const bigQueryNormalizationSql = `
  CASE
    WHEN default_portal_home_path IS NULL OR TRIM(default_portal_home_path) = '' THEN '${PORTAL_HOME_PATH}'
    WHEN TRIM(default_portal_home_path) IN ('${LEGACY_CLIENT_DASHBOARD_PATH}', '${LEGACY_INTERNAL_DASHBOARD_PATH}') THEN '${PORTAL_HOME_PATH}'
    WHEN TRIM(default_portal_home_path) = '${LEGACY_FINANCE_DASHBOARD_PATH}' THEN '/finance'
    WHEN TRIM(default_portal_home_path) = '${LEGACY_HR_HOME_PATH}' THEN '/hr/payroll'
    WHEN TRIM(default_portal_home_path) = '${LEGACY_MY_HOME_PATH}' THEN '/my'
    ELSE TRIM(default_portal_home_path)
  END
`

const toCount = (value: unknown) => {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number.parseInt(value, 10)
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return toCount((value as { value?: unknown }).value)
  }

  return 0
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const projectId = process.env.GCP_PROJECT

  if (!projectId) {
    throw new Error('GCP_PROJECT is required to backfill portal home paths in BigQuery.')
  }

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const bigQuery = new BigQuery({ projectId })

  try {
    const postgresRows = await runGreenhousePostgresQuery<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM greenhouse_core.client_users
       WHERE ${postgresPredicate}`
    )

    const [bigQueryRows] = await bigQuery.query({
      query: `
        SELECT COUNT(1) AS count
        FROM \`${projectId}.greenhouse.client_users\`
        WHERE ${bigQueryPredicate}
      `
    })

    const postgresCount = Number(postgresRows[0]?.count ?? 0)
    const bigQueryCount = toCount((bigQueryRows as Array<{ count?: unknown }>)[0]?.count)

    console.log('[portal-home-contract] pending normalization')
    console.log(`  Postgres greenhouse_core.client_users: ${postgresCount}`)
    console.log(`  BigQuery greenhouse.client_users: ${bigQueryCount}`)

    if (!isApplyMode) {
      console.log(`[portal-home-contract] dry run complete. Re-run with ${APPLY_FLAG} to apply the normalization.`)

      return
    }

    const updatedPostgresRows = await runGreenhousePostgresQuery<{ user_id: string }>(
      `UPDATE greenhouse_core.client_users
       SET default_portal_home_path = ${postgresNormalizationSql},
           updated_at = CURRENT_TIMESTAMP
       WHERE ${postgresPredicate}
       RETURNING user_id`
    )

    await bigQuery.query({
      query: `
        UPDATE \`${projectId}.greenhouse.client_users\`
        SET default_portal_home_path = ${bigQueryNormalizationSql}
        WHERE ${bigQueryPredicate}
      `
    })

    const [remainingBigQueryRows] = await bigQuery.query({
      query: `
        SELECT COUNT(1) AS count
        FROM \`${projectId}.greenhouse.client_users\`
        WHERE ${bigQueryPredicate}
      `
    })

    const remainingBigQueryCount = toCount((remainingBigQueryRows as Array<{ count?: unknown }>)[0]?.count)
    const updatedBigQueryRows = Math.max(0, bigQueryCount - remainingBigQueryCount)

    console.log('[portal-home-contract] normalization applied')
    console.log(`  Postgres updated rows: ${updatedPostgresRows.length}`)
    console.log(`  BigQuery updated rows: ${updatedBigQueryRows}`)
  } finally {
    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error('[portal-home-contract] failed', error)
  process.exit(1)
})

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const splitSqlStatements = (sql: string) =>
  sql
    .split(/;\s*\n/g)
    .map(statement => statement.trim())
    .filter(Boolean)

const getProjectId = () => {
  return process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'
}

const main = async () => {
  loadGreenhouseToolEnv()

  const projectId = getProjectId()
  const location = process.env.GREENHOUSE_BIGQUERY_LOCATION?.trim() || 'US'
  const sqlPath = path.resolve(process.cwd(), 'scripts/setup-bigquery-source-sync.sql')
  const sql = await readFile(sqlPath, 'utf8')
  const renderedSql = sql.replaceAll('__PROJECT_ID__', projectId).replaceAll('__LOCATION__', location)
  const statements = splitSqlStatements(renderedSql)
  const bigQuery = new BigQuery({ projectId })

  for (const statement of statements) {
    await bigQuery.query({
      query: statement,
      location
    })
  }

  console.log(`Applied ${statements.length} BigQuery statements for Greenhouse source sync foundation.`)
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})

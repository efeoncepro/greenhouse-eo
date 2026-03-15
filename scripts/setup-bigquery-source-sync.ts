import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { BigQuery } from '@google-cloud/bigquery'

import { getGoogleCredentials } from '@/lib/google-credentials'

const splitSqlStatements = (sql: string) =>
  sql
    .split(/;\s*\n/g)
    .map(statement => statement.trim())
    .filter(Boolean)

const getProjectId = () => {
  const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!projectId) {
    throw new Error('Missing GCP_PROJECT environment variable')
  }

  return projectId
}

const main = async () => {
  const projectId = getProjectId()
  const location = process.env.GREENHOUSE_BIGQUERY_LOCATION?.trim() || 'US'
  const sqlPath = path.resolve(process.cwd(), 'scripts/setup-bigquery-source-sync.sql')
  const sql = await readFile(sqlPath, 'utf8')
  const renderedSql = sql.replaceAll('__PROJECT_ID__', projectId).replaceAll('__LOCATION__', location)
  const statements = splitSqlStatements(renderedSql)
  const credentials = getGoogleCredentials()

  const bigQuery = new BigQuery({
    projectId,
    ...(credentials ? { credentials } : {})
  })

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

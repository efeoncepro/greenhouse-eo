import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { closeGreenhousePostgres, getGreenhousePostgresMissingConfig, runGreenhousePostgresQuery } from '@/lib/postgres/client'

const splitSqlStatements = (sql: string) =>
  sql
    .split(/;\s*\n/g)
    .map(statement => statement.trim())
    .filter(Boolean)

const main = async () => {
  const missing = getGreenhousePostgresMissingConfig()

  if (missing.length > 0) {
    throw new Error(`Greenhouse Postgres is not configured. Missing: ${missing.join(', ')}`)
  }

  const sqlPath = path.resolve(process.cwd(), 'scripts/setup-postgres-hr-leave.sql')
  const sql = await readFile(sqlPath, 'utf8')
  const statements = splitSqlStatements(sql)

  for (const statement of statements) {
    await runGreenhousePostgresQuery(statement)
  }

  console.log(`Applied ${statements.length} PostgreSQL statements for HR leave.`)
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })

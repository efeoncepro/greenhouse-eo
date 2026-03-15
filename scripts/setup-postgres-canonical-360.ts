import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../src/lib/postgres/client'

const SQL_FILE = path.resolve(process.cwd(), 'scripts/setup-postgres-canonical-360.sql')

const splitStatements = (sql: string) =>
  sql
    .split(/;\s*\n/g)
    .map(statement => statement.trim())
    .filter(Boolean)

async function main() {
  const sql = await readFile(SQL_FILE, 'utf8')
  const statements = splitStatements(sql)

  for (const statement of statements) {
    await runGreenhousePostgresQuery(statement)
  }

  console.log(`Applied ${statements.length} PostgreSQL statements for Greenhouse canonical 360.`)
}

main()
  .catch(error => {
    console.error('Unable to provision Greenhouse PostgreSQL canonical 360 schema.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })

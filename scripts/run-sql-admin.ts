/**
 * Run a SQL file as a single statement via admin Postgres profile.
 * Usage: npx tsx scripts/run-sql-admin.ts scripts/setup-postgres-operations-infra.sql
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  const sqlFile = process.argv[2]

  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run-sql-admin.ts <path-to-sql-file>')
    process.exit(1)
  }

  console.log(`=== Running SQL (admin): ${sqlFile} ===\n`)

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('admin')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('../src/lib/postgres/client')

  try {
    const sql = readFileSync(sqlFile, 'utf-8')

    await runGreenhousePostgresQuery(sql)
    console.log('✓ Migration executed successfully')
  } catch (err) {
    console.error('✗ Migration failed:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  } finally {
    await closeGreenhousePostgres()
  }
}

main()

/**
 * Run a SQL migration file against Postgres.
 * Usage: npx tsx scripts/run-migration.ts scripts/setup-postgres-operations-infra.sql
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'

const main = async () => {
  const sqlFile = process.argv[2]

  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run-migration.ts <path-to-sql-file>')
    process.exit(1)
  }

  console.log(`=== Running migration: ${sqlFile} ===\n`)

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('migrator')

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    const sql = readFileSync(sqlFile, 'utf-8')

    // Split on semicolons, filter empty statements
    const statements = sql
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} statements\n`)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const preview = stmt.slice(0, 80).replace(/\n/g, ' ')

      console.log(`[${i + 1}/${statements.length}] ${preview}...`)

      try {
        await runGreenhousePostgresQuery(stmt)

        console.log('  ✓ OK')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)

        // Skip "already exists" errors — idempotent
        if (msg.includes('already exists') || msg.includes('duplicate key')) {
          console.log(`  ⊘ Skipped (already exists)`)
        } else {
          console.error(`  ✗ FAILED: ${msg}`)
        }
      }
    }

    console.log('\n=== Migration complete ===')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await closeGreenhousePostgres()
  }
}

main()

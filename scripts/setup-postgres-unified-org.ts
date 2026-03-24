/**
 * Unified Organization Model — Schema Migration Runner
 *
 * Adds:
 *   - organization_type to greenhouse_core.organizations
 *   - organization_id FK to greenhouse_finance.income
 *   - organization_id FK to greenhouse_finance.suppliers
 *   - organization_type to organization_360 serving view
 *
 * Safe to run multiple times (all DDL is idempotent).
 *
 * Usage:
 *   npx tsx scripts/setup-postgres-unified-org.ts
 */
import fs from 'node:fs'
import path from 'node:path'

import { runGreenhousePostgresQuery } from '../src/lib/postgres/client'

const runSqlFile = async (filename: string) => {
  const filePath = path.join(__dirname, filename)
  const sql = fs.readFileSync(filePath, 'utf-8')

  // Split on semicolons at end-of-line, but preserve DO $$ ... END $$; blocks
  const statements: string[] = []
  let current = ''
  let inDollarBlock = false

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('--')) {
      if (inDollarBlock) current += line + '\n'
      continue
    }

    if (/^DO\s+\$\$/.test(trimmed)) inDollarBlock = true

    current += line + '\n'

    if (inDollarBlock && /END\s+\$\$\s*;/.test(trimmed)) {
      statements.push(current.trim())
      current = ''
      inDollarBlock = false
    } else if (!inDollarBlock && trimmed.endsWith(';')) {
      statements.push(current.trim().replace(/;$/, ''))
      current = ''
    }
  }

  if (current.trim()) statements.push(current.trim())

  for (const stmt of statements) {
    try {
      await runGreenhousePostgresQuery(stmt)
    } catch (error) {
      // Ignore "already exists" errors for idempotent DDL
      const msg = error instanceof Error ? error.message : String(error)

      if (msg.includes('already exists')) {
        console.log(`  ⏩ Skipped (already exists): ${stmt.slice(0, 60)}...`)
      } else {
        throw error
      }
    }
  }
}

const main = async () => {
  console.log('═══ Unified Organization Model — Schema Migration ═══\n')

  console.log('1. Running DDL migrations...')
  await runSqlFile('setup-postgres-unified-org.sql')
  console.log('   ✅ DDL migrations applied\n')

  console.log('2. Updating organization_360 serving view...')
  await runSqlFile('setup-postgres-organization-360.sql')
  console.log('   ✅ Serving view updated\n')

  // Verify columns exist
  console.log('3. Verifying schema...')

  const orgTypeCheck = await runGreenhousePostgresQuery<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'greenhouse_core' AND table_name = 'organizations'
      AND column_name = 'organization_type'
  `)

  console.log(`   organization_type on organizations: ${orgTypeCheck.length > 0 ? '✅' : '❌'}`)

  const incomeOrgCheck = await runGreenhousePostgresQuery<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'income'
      AND column_name = 'organization_id'
  `)

  console.log(`   organization_id on income: ${incomeOrgCheck.length > 0 ? '✅' : '❌'}`)

  const supplierOrgCheck = await runGreenhousePostgresQuery<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'greenhouse_finance' AND table_name = 'suppliers'
      AND column_name = 'organization_id'
  `)

  console.log(`   organization_id on suppliers: ${supplierOrgCheck.length > 0 ? '✅' : '❌'}`)

  console.log('\n═══ Done ═══')
  process.exit(0)
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})

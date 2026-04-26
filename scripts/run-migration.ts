/**
 * Run a SQL migration file against Postgres.
 * Usage: npx tsx scripts/run-migration.ts scripts/setup-postgres-operations-infra.sql
 */
import { readFileSync } from 'node:fs'
import process from 'node:process'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv, type PostgresProfile } from './lib/load-greenhouse-tool-env'

const stripLeadingSqlComments = (sql: string) => {
  let out = sql

  // Remove leading whitespace + line comments.
  // Note: we keep inline/trailing comments intact; this is only for statement detection.
   
  while (true) {
    const next = out.replace(/^\s+/, '')

    if (next.startsWith('--')) {
      const newlineIdx = next.indexOf('\n')

      out = newlineIdx >= 0 ? next.slice(newlineIdx + 1) : ''
      continue
    }

    if (next.startsWith('/*')) {
      const endIdx = next.indexOf('*/')

      out = endIdx >= 0 ? next.slice(endIdx + 2) : ''
      continue
    }

    out = next
    break
  }

  return out.trim()
}

const splitSqlStatements = (sql: string) => {
  const statements: string[] = []
  let current = ''
  let i = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let inLineComment = false
  let inBlockComment = false
  let dollarTag: string | null = null

  while (i < sql.length) {
    const char = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      current += char

      if (char === '\n') {
        inLineComment = false
      }

      i += 1
      continue
    }

    if (inBlockComment) {
      current += char

      if (char === '*' && next === '/') {
        current += next
        inBlockComment = false
        i += 2
        continue
      }

      i += 1
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && char === '-' && next === '-') {
      current += char + next
      inLineComment = true
      i += 2
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && char === '/' && next === '*') {
      current += char + next
      inBlockComment = true
      i += 2
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && char === '$') {
      const remainder = sql.slice(i)
      const match = remainder.match(/^\$[A-Za-z0-9_]*\$/)

      if (match) {
        const tag = match[0]

        current += tag

        if (dollarTag === tag) {
          dollarTag = null
        } else if (!dollarTag) {
          dollarTag = tag
        }

        i += tag.length
        continue
      }
    }

    if (!inDoubleQuote && !dollarTag && char === '\'') {
      if (inSingleQuote && next === '\'') {
        current += char + next
        i += 2
        continue
      }

      inSingleQuote = !inSingleQuote
      current += char
      i += 1
      continue
    }

    if (!inSingleQuote && !dollarTag && char === '"') {
      inDoubleQuote = !inDoubleQuote
      current += char
      i += 1
      continue
    }

    if (!inSingleQuote && !inDoubleQuote && !dollarTag && char === ';') {
      const statement = current.trim()
      const cleaned = stripLeadingSqlComments(statement)

      if (cleaned.length > 0) {
        statements.push(cleaned)
      }

      current = ''
      i += 1
      continue
    }

    current += char
    i += 1
  }

  const trailingStatement = current.trim()
  const trailingCleaned = stripLeadingSqlComments(trailingStatement)

  if (trailingCleaned.length > 0) {
    statements.push(trailingCleaned)
  }

  return statements
}

const main = async () => {
  const sqlFile = process.argv[2]
  const profileArg = process.argv.find(arg => arg.startsWith('--profile='))
  const profile = (profileArg?.split('=')[1] as PostgresProfile | undefined) ?? 'migrator'

  if (!sqlFile) {
    console.error('Usage: npx tsx scripts/run-migration.ts <path-to-sql-file>')
    process.exit(1)
  }

  console.log(`=== Running migration: ${sqlFile} ===\n`)

  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile(profile)

  const { closeGreenhousePostgres, runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  try {
    const sql = readFileSync(sqlFile, 'utf-8')

    const statements = splitSqlStatements(sql)

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

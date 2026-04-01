#!/usr/bin/env tsx
// ============================================================
// Greenhouse PostgreSQL — Kysely Type Generator
// ============================================================
// Generates TypeScript types from the live database schema
// using kysely-codegen.
//
// Usage:
//   pnpm db:generate-types
//
// Prerequisites:
//   - Direct TCP access to Cloud SQL (GREENHOUSE_POSTGRES_HOST set)
//   - GREENHOUSE_POSTGRES_USER + PASSWORD configured in .env.local
//
// The generated file is src/types/db.d.ts.
// ============================================================

import { execSync } from 'node:child_process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile, type PostgresProfile } from './lib/load-greenhouse-tool-env'

const OUT_FILE = 'src/types/db.d.ts'

const main = () => {
  loadGreenhouseToolEnv()

  const profile = (process.env.DB_TYPES_PROFILE as PostgresProfile) || 'runtime'

  console.log(`[db:generate-types] Using profile: ${profile}`)
  applyGreenhousePostgresProfile(profile)

  const host = process.env.GREENHOUSE_POSTGRES_HOST?.trim()
  const port = process.env.GREENHOUSE_POSTGRES_PORT?.trim() || '5432'
  const database = process.env.GREENHOUSE_POSTGRES_DATABASE?.trim()
  const user = process.env.GREENHOUSE_POSTGRES_USER?.trim()
  const password = process.env.GREENHOUSE_POSTGRES_PASSWORD?.trim()

  if (!host || !database || !user || !password) {
    console.error(
      '[db:generate-types] Direct TCP credentials required.\n' +
      'Set GREENHOUSE_POSTGRES_HOST, DATABASE, USER, and PASSWORD in .env.local.\n' +
      'Cloud SQL Connector is not supported for codegen — it requires a DATABASE_URL.'
    )
    process.exit(1)
  }

  const encodedPassword = encodeURIComponent(password)
  const databaseUrl = `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}?sslmode=disable`

  console.log(`[db:generate-types] Introspecting ${database} on ${host}:${port} as ${user} ...`)

  try {
    execSync(`npx kysely-codegen --out-file ${OUT_FILE}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      }
    })

    console.log(`[db:generate-types] Types written to ${OUT_FILE}`)
  } catch {
    console.error('[db:generate-types] kysely-codegen failed. Check connection and credentials.')
    process.exit(1)
  }
}

main()

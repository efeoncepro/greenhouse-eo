#!/usr/bin/env tsx
// ============================================================
// Greenhouse PostgreSQL — Migration Wrapper (node-pg-migrate)
// ============================================================
// Uses the existing profile system (load-greenhouse-tool-env.ts)
// to resolve credentials, then invokes node-pg-migrate via CLI.
//
// Usage:
//   tsx scripts/migrate.ts up
//   tsx scripts/migrate.ts down
//   tsx scripts/migrate.ts create <name>
//   tsx scripts/migrate.ts status
//
// Environment:
//   Reads from .env.local via loadGreenhouseToolEnv().
//   Uses the 'migrator' profile by default (GREENHOUSE_POSTGRES_MIGRATOR_*).
//   Override with MIGRATE_PROFILE=admin for break-glass ops.
// ============================================================

import { execSync } from 'node:child_process'

import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile, type PostgresProfile } from './lib/load-greenhouse-tool-env'

const MIGRATIONS_DIR = 'migrations'
const MIGRATIONS_TABLE = 'pgmigrations'
const MIGRATIONS_SCHEMA = 'public'

const buildDatabaseUrl = () => {
  const host = process.env.GREENHOUSE_POSTGRES_HOST?.trim()
  const port = process.env.GREENHOUSE_POSTGRES_PORT?.trim() || '5432'
  const database = process.env.GREENHOUSE_POSTGRES_DATABASE?.trim()
  const user = process.env.GREENHOUSE_POSTGRES_USER?.trim()
  const password = process.env.GREENHOUSE_POSTGRES_PASSWORD?.trim()
  const isLocalProxy = host === '127.0.0.1' || host === 'localhost'
  const sslEnv = process.env.GREENHOUSE_POSTGRES_SSL?.trim()?.toLowerCase() === 'true'

  // ── Fail-fast: Cloud SQL public IP is NOT reachable via TCP ────────
  // No authorized networks are configured. Connecting to the public IP
  // will hang for 30+ seconds before ETIMEDOUT. Detect and abort early.
  if (host && !isLocalProxy && !host.endsWith('.internal')) {
    console.error(`
┌─────────────────────────────────────────────────────────────────┐
│  GREENHOUSE_POSTGRES_HOST="${host}" is not reachable   │
│  via direct TCP. Cloud SQL has no authorized networks.          │
│                                                                 │
│  Start the Cloud SQL Auth Proxy first:                          │
│    cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev"   │
│      --port 15432                                               │
│                                                                 │
│  Then set in .env.local:                                        │
│    GREENHOUSE_POSTGRES_HOST="127.0.0.1"                         │
│    GREENHOUSE_POSTGRES_PORT="15432"                              │
│    GREENHOUSE_POSTGRES_SSL="false"                               │
└─────────────────────────────────────────────────────────────────┘
`)
    process.exit(1)
  }

  // Cloud SQL Proxy handles encryption — SSL on top of the tunnel causes a handshake deadlock.
  // Auto-disable SSL when connecting through the local proxy, regardless of env var.
  const ssl = sslEnv && !isLocalProxy

  if (isLocalProxy && sslEnv) {
    console.log('[migrate] Auto-disabled SSL for local proxy connection (127.0.0.1/localhost)')
  }

  if (!host || !database || !user || !password) {
    const missing = [
      !host && 'GREENHOUSE_POSTGRES_HOST',
      !database && 'GREENHOUSE_POSTGRES_DATABASE',
      !user && 'GREENHOUSE_POSTGRES_USER (resolved from profile)',
      !password && 'GREENHOUSE_POSTGRES_PASSWORD (resolved from profile)'
    ].filter(Boolean)

    throw new Error(`Cannot build DATABASE_URL. Missing: ${missing.join(', ')}`)
  }

  const encodedPassword = encodeURIComponent(password)
  const sslParam = ssl ? '?sslmode=require' : '?sslmode=disable'

  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}${sslParam}`
}

const main = () => {
  const [command, ...rest] = process.argv.slice(2)

  if (!command) {
    console.error('Usage: tsx scripts/migrate.ts <up|down|create|status> [args...]')
    process.exit(1)
  }

  // Load env and apply profile
  loadGreenhouseToolEnv()

  // Default to 'ops' — greenhouse_ops is the canonical owner of all objects
  // and has DDL privileges across all schemas. Override with MIGRATE_PROFILE
  // if needed (e.g., MIGRATE_PROFILE=migrator for restricted DDL).
  const profile = (process.env.MIGRATE_PROFILE as PostgresProfile) || 'ops'

  console.log(`[migrate] Using profile: ${profile}`)
  applyGreenhousePostgresProfile(profile)

  // Build the DATABASE_URL that node-pg-migrate expects
  const databaseUrl = buildDatabaseUrl()

  // Build the node-pg-migrate command
  const baseArgs = [
    `--database-url-var DATABASE_URL`,
    `--migrations-dir ${MIGRATIONS_DIR}`,
    `--migrations-table ${MIGRATIONS_TABLE}`,
    `--schema ${MIGRATIONS_SCHEMA}`,
    `--migration-filename-format utc`
  ].join(' ')

  let pgMigrateCommand: string

  switch (command) {
    case 'up':
      pgMigrateCommand = `up ${baseArgs} ${rest.join(' ')}`
      break
    case 'down':
      pgMigrateCommand = `down ${baseArgs} ${rest.join(' ')}`
      break

    case 'create':
      if (rest.length === 0) {
        console.error('Usage: tsx scripts/migrate.ts create <migration-name>')
        process.exit(1)
      }

      pgMigrateCommand = `create ${rest.join(' ')} --migrations-dir ${MIGRATIONS_DIR} --migration-filename-format utc --migration-file-language sql`
      break

    case 'status': {
      // node-pg-migrate doesn't have a native status command.
      // We query the pgmigrations table directly.
      console.log(`[migrate] Querying ${MIGRATIONS_SCHEMA}.${MIGRATIONS_TABLE} ...`)
      pgMigrateCommand = `up --dry-run ${baseArgs}`
      break
    }

    default:
      console.error(`Unknown command: ${command}. Expected: up, down, create, status`)
      process.exit(1)
  }

  const fullCommand = `npx node-pg-migrate ${pgMigrateCommand}`
  const envWithUrl = { ...process.env, DATABASE_URL: databaseUrl }

  console.log(`[migrate] Running: ${fullCommand}`)

  try {
    execSync(fullCommand, { stdio: 'inherit', env: envWithUrl })
  } catch {
    process.exit(1)
  }

  // After up/down, auto-regenerate Kysely types so they stay in sync
  if (command === 'up' || command === 'down') {
    const skipTypes = process.env.MIGRATE_SKIP_TYPES === 'true'

    if (skipTypes) {
      console.log('[migrate] Skipping type generation (MIGRATE_SKIP_TYPES=true)')
    } else {
      console.log('[migrate] Regenerating Kysely types...')

      try {
        execSync(`npx kysely-codegen --out-file src/types/db.d.ts`, {
          stdio: 'inherit',
          env: envWithUrl
        })

        console.log('[migrate] Types updated in src/types/db.d.ts')
      } catch {
        console.warn('[migrate] Type generation failed — run pnpm db:generate-types manually')
      }
    }
  }
}

main()

// ============================================================
// Greenhouse PostgreSQL — Centralized Database Connection
// ============================================================
// RULE: Never create Pool instances outside src/lib/postgres/client.ts.
// RULE: Never read GREENHOUSE_POSTGRES_* directly outside client.ts.
// RULE: Import { query, withTransaction } for raw pg queries.
// RULE: Import { db } for Kysely typed queries (new modules).
// RULE: Existing modules using runGreenhousePostgresQuery are fine.
// ============================================================

import { Kysely, PostgresDialect } from 'kysely'

import {
  getGreenhousePostgresPool,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
  closeGreenhousePostgres
} from '@/lib/postgres/client'

import type { DB } from '@/types/db'

// ── Re-exports from existing client (backwards-compatible) ──
export {
  getGreenhousePostgresPool,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
  closeGreenhousePostgres
}

// Convenience alias — matches the simpler name new modules expect
export const query = runGreenhousePostgresQuery
export const withTransaction = withGreenhousePostgresTransaction

// ── Kysely instance (typed queries for new modules) ──────────
// Lazy-initialised: the Pool is async (Cloud SQL Connector + Secret Manager),
// so we build the Kysely instance on first access.

let _db: Kysely<DB> | null = null
let _dbPromise: Promise<Kysely<DB>> | null = null

const buildKysely = async (): Promise<Kysely<DB>> => {
  const pool = await getGreenhousePostgresPool()

  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool })
  })
}

/**
 * Returns the Kysely typed query builder instance.
 *
 * The instance is lazily created and shares the same Pool as
 * `runGreenhousePostgresQuery`, so there is no extra connection overhead.
 *
 * ```ts
 * import { getDb } from '@/lib/db'
 *
 * const db = await getDb()
 * const rows = await db
 *   .selectFrom('greenhouse_core.clients')
 *   .select(['client_id', 'client_name'])
 *   .where('status', '=', 'active')
 *   .execute()
 * ```
 */
export const getDb = async (): Promise<Kysely<DB>> => {
  if (_db) return _db

  _dbPromise ??= buildKysely().then(instance => {
    _db = instance
    _dbPromise = null

    return instance
  }).catch(error => {
    _dbPromise = null
    throw error
  })

  return _dbPromise
}

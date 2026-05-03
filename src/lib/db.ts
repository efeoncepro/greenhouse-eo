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
import type { Pool, PoolClient } from 'pg'

import {
  getGreenhousePostgresPool,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
  closeGreenhousePostgres,
  isGreenhousePostgresRetryableConnectionError,
  onGreenhousePostgresReset
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

const resetKyselyInstance = () => {
  _db = null
  _dbPromise = null
}

onGreenhousePostgresReset(resetKyselyInstance)

const connectKyselyClient = async (attempt = 0): Promise<PoolClient> => {
  try {
    const pool = await getGreenhousePostgresPool()

    return await pool.connect()
  } catch (error) {
    if (attempt > 0 || !isGreenhousePostgresRetryableConnectionError(error)) {
      throw error
    }

    console.warn('Retrying Greenhouse Kysely connection after retryable Postgres failure.', error)
    await closeGreenhousePostgres({ source: 'retryable_error', error }).catch(() => undefined)

    return connectKyselyClient(attempt + 1)
  }
}

const createKyselyPoolAdapter = (): Pick<Pool, 'connect' | 'end'> => ({
  connect: () => connectKyselyClient(),
  end: async () => {
    await closeGreenhousePostgres()
  }
}) as Pick<Pool, 'connect' | 'end'>

const buildKysely = async (): Promise<Kysely<DB>> => {
  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: createKyselyPoolAdapter() as Pool
    })
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

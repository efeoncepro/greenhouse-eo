import 'server-only'

/**
 * TASK-1845 — acceso a datos del dominio Insights. Los stores reciben opcionalmente un
 * `PoolClient` para componer dentro de `withGreenhousePostgresTransaction` (state +
 * historial + outbox atómicos); sin cliente usan el pool canónico. NUNCA un `new Pool()`.
 */

import type { PoolClient } from 'pg'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export type InsightsDbClient = Pick<PoolClient, 'query'>

export const runInsightsQuery = async <T extends Record<string, unknown>>(
  client: InsightsDbClient | undefined,
  sql: string,
  params: unknown[] = []
): Promise<T[]> => {
  if (client) {
    const result = await client.query<T>(sql, params)

    return result.rows
  }

  return runGreenhousePostgresQuery<T>(sql, params)
}

export const toIso = (value: unknown): string | null => {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value

  return null
}

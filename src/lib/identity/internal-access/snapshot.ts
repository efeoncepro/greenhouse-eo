import 'server-only'

import type { QueryConfig } from 'pg'

import type { query } from '@/lib/db'
import { withTransaction } from '@/lib/db'

/** All facts of one authority decision share one committed snapshot. Nothing survives this call. */
export const withInternalAuthoritySnapshot = <T>(
  operation: (input: { readQuery: typeof query; now: Date }) => Promise<T>
): Promise<T> => withTransaction(async client => {
  const deadline = Date.now() + 4000

  await client.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  await client.query("SET LOCAL statement_timeout = '4s'")
  const { rows } = await client.query<{ now: Date }>('SELECT CURRENT_TIMESTAMP AS now')
  // Memoized facts within this snapshot amortize discovery's shared role/view reads.
  // This is never a cross-request permission cache, and includes every query parameter in its key.
  let validUntil = Number.POSITIVE_INFINITY
  const snapshotTime = new Date(rows[0].now).getTime()

  const observeBoundaries = (facts: Record<string, unknown>[]) => {
    for (const fact of facts) {
      for (const key of ['expires_at', 'effective_from', 'effective_to', 'end_date']) {
        const raw = fact[key]

        if (typeof raw !== 'string' && !(raw instanceof Date)) continue
        // Assignment end_date is inclusive (the canonical relationship uses CURRENT_DATE).
        const boundary = new Date(raw).getTime() + (key === 'end_date' ? 86400000 : 0)

        if (boundary > snapshotTime) validUntil = Math.min(validUntil, boundary)
      }
    }
  }

  let queue = Promise.resolve()
  let statementBudget = 4000
  const reads = new Map<string, Promise<Record<string, unknown>[]>>()

  const readQuery: typeof query = async <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
    if (Date.now() >= deadline) throw new Error('internal_reader_unavailable')
    const key = JSON.stringify([text, values])
    let pending = reads.get(key)

    if (!pending) {
      pending = queue.then(async () => {
        const remaining = deadline - Date.now()

        if (remaining <= 0) throw new Error('internal_reader_unavailable')

        if (remaining < statementBudget / 2) {
          statementBudget = Math.max(1, Math.floor(remaining))
          await client.query("SELECT set_config('statement_timeout', $1, true)", [String(statementBudget)])
        }

        // pg supports per-query read timeout; @types/pg currently exposes it only on ClientConfig.
        const statement: QueryConfig & { query_timeout: number } = { text, values, query_timeout: remaining }

        return (await client.query<Row>(statement)).rows
      })
      queue = pending.then(() => undefined, () => undefined)
      reads.set(key, pending)
    }

    const result = await pending

    if (Date.now() >= deadline) throw new Error('internal_reader_unavailable')

    observeBoundaries(result)

    return result as Row[]
  }

  const result = await operation({ readQuery, now: rows[0].now })

  if (Date.now() >= deadline || Date.now() >= validUntil) throw new Error('internal_reader_temporal_boundary')

  return result
})

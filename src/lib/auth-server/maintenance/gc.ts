/** Dry-run counts reflect existing dependencies; apply may clear further stages in the same transaction.
 * 500 rows per table, 11 tables: at most 5,500 deletes per invocation.
 * The PostgreSQL SECURITY DEFINER function owns cleanup predicates and its narrow delete authority. */
import { withTransaction } from '@/lib/db'

export const AUTH_GC_MIN_RETENTION_DAYS = 30
export type AuthGcOptions = { dryRun?: boolean; batchSize?: number; retentionDays?: number }
export type AuthGcResult = {
  dryRun: boolean
  locked: boolean
  cutoff: string
  batchSize: number
  counts: Record<string, number>
}

export const runAuthGarbageCollection = async (options: AuthGcOptions = {}): Promise<AuthGcResult> => {
  const dryRun = options.dryRun !== false,
    batchSize = options.batchSize ?? 500,
    retention = options.retentionDays ?? AUTH_GC_MIN_RETENTION_DAYS

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('auth_gc_invalid_batch')
  if (!Number.isInteger(retention) || retention < AUTH_GC_MIN_RETENTION_DAYS || retention > 3650)
    throw new Error('auth_gc_invalid_retention')

  const rows = await withTransaction(async client => {
    await client.query("SET LOCAL statement_timeout = '15s'")
    await client.query("SET LOCAL lock_timeout = '2s'")

    return (
      await client.query<{ result: AuthGcResult }>(
        'SELECT greenhouse_auth.gc_ephemeral_state($1::integer,$2::integer,$3::boolean) AS result',
        [batchSize, retention, dryRun]
      )
    ).rows
  })

  const result = rows[0]?.result

  if (
    !result ||
    typeof result !== 'object' ||
    result.dryRun !== dryRun ||
    result.batchSize !== batchSize ||
    typeof result.locked !== 'boolean' ||
    !result.counts ||
    typeof result.counts !== 'object' ||
    !Number.isFinite(Date.parse(result.cutoff))
  )
    throw new Error('auth_gc_invalid_result')
  if (Object.values(result.counts).some(n => !Number.isInteger(n) || n < 0 || n > batchSize))
    throw new Error('auth_gc_invalid_result')

  return result
}

/** Dry-run counts reflect existing dependencies; apply may clear further stages in the same transaction.
 * 500 rows per table, up to 16 tables: at most 8,000 deletes per invocation after additive migrations.
 * PostgreSQL SECURITY DEFINER functions own cleanup predicates and narrow delete authority. */
import { withTransaction } from '@/lib/db'

export const AUTH_GC_MIN_RETENTION_DAYS = 30
export type AuthGcOptions = { dryRun?: boolean; batchSize?: number; retentionDays?: number }
type ExtensionStatus = 'ran' | 'not_migrated' | 'retention_mismatch' | 'lock_unavailable'
export type AuthGcResult = {
  dryRun: boolean
  locked: boolean
  cutoff: string
  batchSize: number
  counts: Record<string, number>
  extensions?: Record<'first_party' | 'email_otp', ExtensionStatus>
}

const extensions = [
  { key: 'first_party', signature: 'greenhouse_auth.gc_first_party_ephemeral(integer,boolean)',
    sql: 'SELECT greenhouse_auth.gc_first_party_ephemeral($1::integer,$2::boolean) AS result', fields: ['handles', 'codes', 'transactions'] },
  { key: 'email_otp', signature: 'greenhouse_auth.gc_invitation_email_otp(integer,boolean)',
    sql: 'SELECT greenhouse_auth.gc_invitation_email_otp($1::integer,$2::boolean) AS result', fields: ['challenges', 'budgets'] }
] as const

const validateResult = (result: AuthGcResult | undefined, dryRun: boolean, batchSize: number): AuthGcResult => {
  if (!result || typeof result !== 'object' || result.dryRun !== dryRun || result.batchSize !== batchSize ||
      typeof result.locked !== 'boolean' || !result.counts || typeof result.counts !== 'object' ||
      Array.isArray(result.counts) || !Number.isFinite(Date.parse(result.cutoff)) ||
      Object.values(result.counts).some(n => !Number.isInteger(n) || n < 0 || n > batchSize)) throw new Error('auth_gc_invalid_result')

  return result
}

export const runAuthGarbageCollection = async (options: AuthGcOptions = {}): Promise<AuthGcResult> => {
  const dryRun = options.dryRun !== false,
    batchSize = options.batchSize ?? 500,
    retention = options.retentionDays ?? AUTH_GC_MIN_RETENTION_DAYS

  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 500) throw new Error('auth_gc_invalid_batch')
  if (!Number.isInteger(retention) || retention < AUTH_GC_MIN_RETENTION_DAYS || retention > 3650)
    throw new Error('auth_gc_invalid_retention')

  return withTransaction(async client => {
    await client.query("SET LOCAL statement_timeout = '15s'")
    await client.query("SET LOCAL lock_timeout = '2s'")

    const base = await client.query<{ result: AuthGcResult }>(
      'SELECT greenhouse_auth.gc_ephemeral_state($1::integer,$2::integer,$3::boolean) AS result',
      [batchSize, retention, dryRun]
    )

    const result = validateResult(base.rows[0]?.result, dryRun, batchSize)

    result.extensions = { first_party: 'not_migrated', email_otp: 'not_migrated' }

    // The base PG function retains its global transaction advisory lock until this callback commits.
    // Helpers have fixed 30-day predicates: a longer operator retention must never be shortened.
    if (!result.locked || retention !== AUTH_GC_MIN_RETENTION_DAYS) {
      const status = result.locked ? 'retention_mismatch' : 'lock_unavailable'

      result.extensions = { first_party: status, email_otp: status }

      return result
    }

    for (const extension of extensions) {
      const present = await client.query<{ present: boolean }>('SELECT to_regprocedure($1) IS NOT NULL AS present', [extension.signature])

      if (!present.rows[0]?.present) continue
      const extra = (await client.query<{ result: Record<string, unknown> }>(extension.sql, [batchSize, dryRun])).rows[0]?.result

      if (!extra || extra.dryRun !== dryRun || Object.keys(extra).length !== extension.fields.length + 1 ||
          extension.fields.some(field => !Number.isInteger(extra[field]) || Number(extra[field]) < 0 || Number(extra[field]) > batchSize))
        throw new Error('auth_gc_invalid_extension_result')
      for (const field of extension.fields) result.counts[`${extension.key}_${field}`] = Number(extra[field])
      result.extensions[extension.key] = 'ran'
    }

    return result
  })
}

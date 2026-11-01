import type { BudgetState, ChallengeState, InvitationOtpStore } from './types'

export interface OtpSqlClient {
  query<T>(text: string, values?: unknown[]): Promise<{ rows: T[] }>
}
/** Use the existing '@/lib/db' withTransaction adapter. Tests inject an isolated local transaction. */
export type OtpSqlTransaction = <T>(work: (client: OtpSqlClient) => Promise<T>) => Promise<T>

export function createPostgresInvitationOtpStore(withTransaction: OtpSqlTransaction): InvitationOtpStore {
  return {
    transaction(keys, work) {
      return withTransaction(async client => {
        for (const key of [...new Set(keys)].sort()) {
          // Transaction advisory locks also serialize creation of missing rows. Prefix owns a namespace.
          await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`auth-email-otp:${key}`])
        }

        return work({
          async getChallenge(key) {
            const result = await client.query<{ value: ChallengeState }>(
              'SELECT value FROM greenhouse_auth.email_otp_challenges WHERE state_key = $1', [key])

            return result.rows[0]?.value ?? null
          },
          async saveChallenge(key, value) {
            await client.query(`INSERT INTO greenhouse_auth.email_otp_challenges (state_key, value, expires_at)
              VALUES ($1, $2::jsonb, to_timestamp($3 / 1000.0)) ON CONFLICT (state_key)
              DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [key, JSON.stringify(value), Math.max(value.expiresAt, value.createdAt + 86_400_000)])
          },
          async getBudget(key) {
            const result = await client.query<{ value: BudgetState }>(
              'SELECT value FROM greenhouse_auth.email_otp_budgets WHERE state_key = $1', [key])

            return result.rows[0]?.value ?? null
          },
          async saveBudget(key, value) {
            await client.query(`INSERT INTO greenhouse_auth.email_otp_budgets (state_key, value, expires_at)
              VALUES ($1, $2::jsonb, to_timestamp($3 / 1000.0)) ON CONFLICT (state_key)
              DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [key, JSON.stringify(value), value.expiresAt])
          }
        })
      })
    }
  }
}

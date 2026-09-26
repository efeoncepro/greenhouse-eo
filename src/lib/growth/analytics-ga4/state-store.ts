import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { GA4_STATE_TTL_MS } from './contracts'

const hash = (state: string): string => createHash('sha256').update(state).digest('hex')

export const createGa4OAuthState = async (organizationId: string, userId: string | null): Promise<string> => {
  const state = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + GA4_STATE_TTL_MS).toISOString()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.ga4_oauth_states
       (state_hash, organization_id, created_by_user_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [hash(state), organizationId, userId, expiresAt]
  )

  return state
}

export const consumeGa4OAuthState = async (state: string): Promise<{ organizationId: string; userId: string | null } | null> =>
  withGreenhousePostgresTransaction(async client => {
    const found = await client.query<{
      state_id: string
      organization_id: string
      created_by_user_id: string | null
      expires_at: Date | string
      consumed_at: Date | string | null
    }>(
      `SELECT state_id, organization_id, created_by_user_id, expires_at, consumed_at
         FROM greenhouse_growth.ga4_oauth_states
        WHERE state_hash = $1 FOR UPDATE`,
      [hash(state)]
    )

    const row = found.rows[0]

    if (!row || row.consumed_at || new Date(row.expires_at).getTime() <= Date.now()) return null

    const consumed = await client.query(
      `UPDATE greenhouse_growth.ga4_oauth_states
          SET consumed_at = NOW()
        WHERE state_id = $1 AND consumed_at IS NULL`,
      [row.state_id]
    )

    return consumed.rowCount === 1
      ? { organizationId: row.organization_id, userId: row.created_by_user_id }
      : null
  })

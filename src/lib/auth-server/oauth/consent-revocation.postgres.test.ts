/** TASK-1833: consent and token-family revocation against disposable PostgreSQL with real Auth DDL. */
import { realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { Pool, type PoolClient } from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ client: null as PoolClient | null }))

vi.mock('@/lib/db', () => ({
  query: async (sql: string, values?: unknown[]) => {
    if (!state.client) throw new Error('local_postgres_not_ready')

    return (await state.client.query(sql, values)).rows
  },
  withTransaction: async <T>(work: (client: PoolClient) => Promise<T>): Promise<T> => {
    if (!state.client) throw new Error('local_postgres_not_ready')
    await state.client.query('BEGIN')

    try {
      const result = await work(state.client)

      await state.client.query('COMMIT')

      return result
    } catch (error) {
      await state.client.query('ROLLBACK')
      throw error
    }
  }
}))

import { revokeClientConsent } from './consent'
import { PostgresOAuthStore } from './store/postgres-store'

const localSocket = process.env.AUTH_CONSENT_LOCAL_POSTGRES_SOCKET
const localPort = Number(process.env.AUTH_CONSENT_LOCAL_POSTGRES_PORT)

describe.skipIf(!localSocket)('TASK-1833 consent revocation on disposable PostgreSQL', () => {
  let pool: Pool | null = null

  beforeAll(async () => {
    const directory = realpathSync(localSocket!)
    const directoryInfo = statSync(directory)

    if (!/^\/(?:private\/)?tmp\/auth-consent-smoke\.[A-Za-z0-9]+$/.test(directory) ||
      !directoryInfo.isDirectory() || (directoryInfo.mode & 0o077) !== 0 ||
      directoryInfo.uid !== process.getuid?.() ||
      !Number.isInteger(localPort) || localPort < 1 || localPort > 65535 ||
      !statSync(join(directory, `.s.PGSQL.${localPort}`)).isSocket()) {
      throw new Error('Consent smoke accepts only an owned private disposable PostgreSQL socket')
    }

    pool = new Pool({ host: directory, port: localPort, database: 'auth_consent_local', user: 'greenhouse_app', max: 1 })
    state.client = await pool.connect()
    expect((await state.client.query('SELECT current_user')).rows[0].current_user).toBe('greenhouse_app')
    expect((await state.client.query('SHOW listen_addresses')).rows[0].listen_addresses).toBe('')

    for (const clientId of ['target-client', 'control-client']) {
      await state.client.query(`INSERT INTO greenhouse_auth.oauth_clients
        (client_id,registration_kind,client_type,client_name,redirect_uris,grant_types,response_types,
         token_endpoint_auth_method,client_secret_hash,created_by)
        VALUES ($1,'preregistered','confidential',$1,ARRAY['https://example.test/cb'],
                ARRAY['authorization_code'],ARRAY['code'],'client_secret_basic',repeat('a',64),'local-smoke')`, [clientId])
    }

    for (const [clientId, subject, environmentId, suffix] of [
      ['target-client', 'target-subject', 'env-a', 'target'],
      ['target-client', 'control-subject', 'env-a', 'other-subject'],
      ['control-client', 'target-subject', 'env-a', 'other-client'],
      ['target-client', 'target-subject', 'env-b', 'other-environment']
    ] as const) {
      await state.client.query(`INSERT INTO greenhouse_auth.client_consents
        (subject,environment_id,client_id,scope,granted_via,granted_by)
        VALUES ($1,$2,$3,'efeonce.mcp.read','cli','local-smoke')`, [subject, environmentId, clientId])
      await state.client.query(`INSERT INTO greenhouse_auth.refresh_tokens
        (token_hash,grant_id,client_id,subject,environment_id,scopes,expires_at,absolute_expires_at)
        VALUES ($1,$2,$3,$4,$5,ARRAY['efeonce.mcp.read'],now()+INTERVAL '1 hour',now()+INTERVAL '1 day')`,
      [`refresh-${suffix}`, `grant-${suffix}`, clientId, subject, environmentId])
      await state.client.query(`INSERT INTO greenhouse_auth.access_tokens
        (jti,grant_id,client_id,subject,environment_id,scopes,issued_at,expires_at)
        VALUES ($1,$2,$3,$4,$5,ARRAY['efeonce.mcp.read'],now(),now()+INTERVAL '1 hour')`,
      [`access-${suffix}`, `grant-${suffix}`, clientId, subject, environmentId])
    }
  })

  afterAll(async () => {
    state.client?.release()
    state.client = null
    await pool?.end()
  })

  it('rolls back consent when revoking the token family fails', async () => {
    await expect(revokeClientConsent({
      subject: 'target-subject', environmentId: 'env-a', clientId: 'target-client', scopes: null,
      reason: 'local_failure', actor: 'operator:synthetic', via: 'admin'
    }, { store: new PostgresOAuthStore() })).rejects.toThrow('local_reject_consent_revoke')

    const consent = await state.client!.query(`SELECT status FROM greenhouse_auth.client_consents
      WHERE subject='target-subject' AND client_id='target-client'`)

    const refresh = await state.client!.query(`SELECT status FROM greenhouse_auth.refresh_tokens WHERE token_hash='refresh-target'`)
    const access = await state.client!.query(`SELECT revoked_at FROM greenhouse_auth.access_tokens WHERE jti='access-target'`)

    expect(consent.rows[0].status).toBe('active')
    expect(refresh.rows[0].status).toBe('active')
    expect(access.rows[0].revoked_at).toBeNull()
  })

  it('rolls back consent and refresh when the final access-token update fails', async () => {
    await expect(revokeClientConsent({
      subject: 'target-subject', environmentId: 'env-a', clientId: 'target-client', scopes: null,
      reason: 'access_failure', actor: 'operator:synthetic', via: 'admin'
    }, { store: new PostgresOAuthStore() })).rejects.toThrow('local_reject_access_revoke')

    const consent = await state.client!.query(`SELECT status FROM greenhouse_auth.client_consents
      WHERE subject='target-subject' AND environment_id='env-a' AND client_id='target-client'`)

    const refresh = await state.client!.query(`SELECT status FROM greenhouse_auth.refresh_tokens WHERE token_hash='refresh-target'`)
    const access = await state.client!.query(`SELECT revoked_at FROM greenhouse_auth.access_tokens WHERE jti='access-target'`)

    expect(consent.rows[0].status).toBe('active')
    expect(refresh.rows[0].status).toBe('active')
    expect(access.rows[0].revoked_at).toBeNull()
  })

  it('revokes the selected client and subject together, preserving controls and idempotency', async () => {
    const store = new PostgresOAuthStore()

    const input = {
      subject: 'target-subject', environmentId: 'env-a', clientId: 'target-client', scopes: null,
      reason: 'local_success', actor: 'operator:synthetic', via: 'admin' as const
    }

    expect(await revokeClientConsent(input, { store })).toEqual({ consentsRevoked: 1, refreshRevoked: 1, accessRevoked: 1 })
    expect(await revokeClientConsent(input, { store })).toEqual({ consentsRevoked: 0, refreshRevoked: 0, accessRevoked: 0 })

    const rows = await state.client!.query(`SELECT c.subject,c.environment_id,c.client_id,c.status,
      r.status AS refresh_status,a.revoked_at AS access_revoked_at
      FROM greenhouse_auth.client_consents c
      JOIN greenhouse_auth.refresh_tokens r ON r.subject=c.subject AND r.environment_id=c.environment_id AND r.client_id=c.client_id
      JOIN greenhouse_auth.access_tokens a ON a.subject=c.subject AND a.environment_id=c.environment_id AND a.client_id=c.client_id
      ORDER BY c.environment_id,c.client_id,c.subject`)

    expect(rows.rows.filter(row => row.subject === 'target-subject' && row.environment_id === 'env-a' && row.client_id === 'target-client'))
      .toEqual([expect.objectContaining({ status: 'revoked', refresh_status: 'revoked', access_revoked_at: expect.any(Date) })])
    const controls = rows.rows.filter(row => row.subject !== 'target-subject' || row.environment_id !== 'env-a' || row.client_id !== 'target-client')

    expect(controls).toHaveLength(3)
    expect(controls.every(row => row.status === 'active' && row.refresh_status === 'active' && row.access_revoked_at === null))
      .toBe(true)
  })
})

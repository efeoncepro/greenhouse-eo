/**
 * TASK-1833: revocation command against disposable loopback PostgreSQL.
 * The runner applies the real TASK-1830 Auth migrations with only the core source-link FK stubbed.
 */
import { createHash } from 'node:crypto'

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

import { revokePersonAuthState } from './recovery'
import { PostgresPersonAuthStore } from './store/postgres-store'

const localUrl = process.env.AUTH_REVOKE_LOCAL_POSTGRES_URL
const configured = Boolean(localUrl)

describe.skipIf(!configured)('TASK-1833 person revocation on disposable PostgreSQL with real Auth DDL', () => {
  let pool: Pool | null = null

  beforeAll(async () => {
    const parsed = new URL(localUrl!)

    const port = Number(parsed.port)

    if (
      parsed.protocol !== 'postgresql:' ||
      parsed.hostname !== '127.0.0.1' ||
      parsed.pathname !== '/auth_revoke_local' ||
      parsed.search !== '' ||
      parsed.hash !== '' ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      !Number.isInteger(port) || port < 1 || port > 65535
    ) {
      throw new Error('Recovery smoke accepts only the disposable loopback database')
    }

    pool = new Pool({ host: '127.0.0.1', port, database: 'auth_revoke_local', user: 'greenhouse_app', max: 1 })
    state.client = await pool.connect()
    expect((await state.client.query('SELECT current_user')).rows[0].current_user).toBe('greenhouse_app')
  })

  afterAll(async () => {
    state.client?.release()
    state.client = null
    await pool?.end()
  })

  it('revokes only the selected subject and environment, records hashed audit, and is idempotent', async () => {
    const client = state.client!

    await client.query(`
      INSERT INTO greenhouse_auth.sessions
        (session_hash, environment_id, subject, profile_id, link_id, amr, auth_time, expires_at, absolute_expires_at) VALUES
        (repeat('a',64),'env-a','subject-target','profile-synthetic','link-synthetic',ARRAY['magic_link'],now(),now()+INTERVAL '1 hour',now()+INTERVAL '1 day'),
        (repeat('b',64),'env-a','subject-target','profile-synthetic','link-synthetic',ARRAY['magic_link'],now(),now()+INTERVAL '1 hour',now()+INTERVAL '1 day'),
        (repeat('c',64),'env-a','subject-control','profile-synthetic','link-synthetic',ARRAY['magic_link'],now(),now()+INTERVAL '1 hour',now()+INTERVAL '1 day'),
        (repeat('d',64),'env-b','subject-target','profile-synthetic','link-synthetic',ARRAY['magic_link'],now(),now()+INTERVAL '1 hour',now()+INTERVAL '1 day');
      INSERT INTO greenhouse_auth.passkey_credentials(credential_id,environment_id,subject,public_key) VALUES
        ('target-passkey-1','env-a','subject-target',decode('01','hex')),
        ('target-passkey-2','env-a','subject-target',decode('02','hex')),
        ('control-passkey-subject','env-a','subject-control',decode('03','hex')),
        ('control-passkey-environment','env-b','subject-target',decode('04','hex'));
      INSERT INTO greenhouse_auth.totp_enrollments
        (environment_id,subject,secret_ciphertext,kms_key_name,status,confirmed_at) VALUES
        ('env-a','subject-target',decode('01','hex'),'local-test-key','active',now()),
        ('env-a','subject-control',decode('02','hex'),'local-test-key','active',now()),
        ('env-b','subject-target',decode('03','hex'),'local-test-key','active',now());
    `)

    const deps = {
      store: new PostgresPersonAuthStore(),
      environmentId: 'env-a',
      now: () => new Date('2026-10-28T12:00:00.000Z')
    }

    const input = {
      subject: 'subject-target',
      reason: 'local_incident_rehearsal',
      actorRef: 'operator:synthetic',
      correlationId: 'synthetic-rehearsal'
    }

    expect(await revokePersonAuthState(deps, input)).toEqual({
      subject: input.subject,
      sessionsRevoked: 2,
      passkeysRevoked: 2,
      totpRevoked: true
    })
    expect(await revokePersonAuthState(deps, input)).toEqual({
      subject: input.subject,
      sessionsRevoked: 0,
      passkeysRevoked: 0,
      totpRevoked: false
    })

    for (const table of ['sessions', 'passkey_credentials', 'totp_enrollments']) {
      const rows = (await client.query(
        `SELECT environment_id, subject, revoked_at IS NOT NULL AS revoked FROM greenhouse_auth.${table} ORDER BY environment_id, subject`
      )).rows

      expect(rows.filter(row => row.environment_id === 'env-a' && row.subject === 'subject-target')
        .every(row => row.revoked)).toBe(true)
      expect(rows.filter(row => row.environment_id !== 'env-a' || row.subject !== 'subject-target')
        .every(row => !row.revoked)).toBe(true)
    }

    const attempts = (await client.query('SELECT method,stage,outcome,subject_hash,details FROM greenhouse_auth.person_auth_attempts')).rows

    expect(attempts).toHaveLength(2)
    expect(attempts.every(row => row.method === 'recovery' && row.stage === 'revoke' && row.outcome === 'success'))
      .toBe(true)
    expect(attempts.every(row => row.subject_hash === createHash('sha256').update(input.subject).digest('hex')))
      .toBe(true)
    expect(attempts.map(row => row.details)).toEqual(expect.arrayContaining([
      expect.objectContaining({ sessionsRevoked: 2, passkeysRevoked: 2, totpRevoked: true }),
      expect.objectContaining({ sessionsRevoked: 0, passkeysRevoked: 0, totpRevoked: false })
    ]))
  })

  it('rolls back credential revocation when the audit insert fails', async () => {
    const client = state.client!

    await client.query(`
      INSERT INTO greenhouse_auth.sessions
        (session_hash,environment_id,subject,profile_id,link_id,amr,auth_time,expires_at,absolute_expires_at)
        VALUES (repeat('e',64),'env-a','subject-audit-failure','profile-synthetic','link-synthetic',
          ARRAY['magic_link'],now(),now()+INTERVAL '1 hour',now()+INTERVAL '1 day');
      INSERT INTO greenhouse_auth.passkey_credentials(credential_id,environment_id,subject,public_key)
        VALUES ('audit-failure-passkey','env-a','subject-audit-failure',decode('05','hex'));
      INSERT INTO greenhouse_auth.totp_enrollments
        (environment_id,subject,secret_ciphertext,kms_key_name,status,confirmed_at)
        VALUES ('env-a','subject-audit-failure',decode('04','hex'),'local-test-key','active',now());
    `)

    await expect(revokePersonAuthState(
      { store: new PostgresPersonAuthStore(), environmentId: 'env-a', now: () => new Date() },
      {
        subject: 'subject-audit-failure',
        reason: 'local_audit_failure',
        actorRef: 'operator:synthetic',
        correlationId: 'synthetic-audit-failure'
      }
    )).rejects.toThrow('local_reject_recovery_audit')

    for (const [table, key] of [
      ['sessions', 'session_hash'],
      ['passkey_credentials', 'credential_id'],
      ['totp_enrollments', 'subject']
    ]) {
      const rows = (await client.query(
        `SELECT revoked_at FROM greenhouse_auth.${table} WHERE ${key}=$1`,
        [table === 'totp_enrollments' ? 'subject-audit-failure' : table === 'sessions' ? 'e'.repeat(64) : 'audit-failure-passkey']
      )).rows

      expect(rows).toHaveLength(1)
      expect(rows[0].revoked_at).toBeNull()
    }

    const failedAuditRows = await client.query(
      "SELECT COUNT(*)::int AS count FROM greenhouse_auth.person_auth_attempts WHERE reason_code='local_audit_failure'"
    )

    expect(failedAuditRows.rows[0].count).toBe(0)
  })
})

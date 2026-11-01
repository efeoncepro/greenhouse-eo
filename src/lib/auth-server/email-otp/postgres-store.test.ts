import { readFileSync } from 'node:fs'

import { Client } from 'pg'
import { beforeAll, describe, expect, it } from 'vitest'

import { createInvitationEmailOtp } from './core'
import { createPostgresInvitationOtpStore, type OtpSqlTransaction } from './postgres-store'
import type { InvitationDelivery } from './types'

// Never use the shared Cloud SQL environment. Explicit isolated database name + loopback are mandatory.
const localUrl = process.env.AUTH_OTP_LOCAL_POSTGRES_URL

if (localUrl) {
  const parsed = new URL(localUrl)

  if (parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/auth_otp_local') throw new Error('OTP SQL tests require isolated loopback auth_otp_local database')
}

const transaction: OtpSqlTransaction = async work => {
  const client = new Client({ connectionString: localUrl })

  await client.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)

    await client.query('COMMIT')

    return result
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { await client.end() }
}

const migration = readFileSync('migrations/20261025213415654_task-2067-invitation-email-otp.sql', 'utf8')
const [up, down] = migration.split('-- Down Migration')

describe.skipIf(!localUrl)('OTP isolated PostgreSQL', () => {
  beforeAll(async () => {
    await transaction(async db => {
      await db.query(`CREATE SCHEMA greenhouse_auth; CREATE SCHEMA greenhouse_notifications;
        CREATE ROLE greenhouse_ops; CREATE ROLE greenhouse_runtime; CREATE ROLE greenhouse_app;
        GRANT USAGE, CREATE ON SCHEMA greenhouse_auth TO greenhouse_ops;
        GRANT USAGE ON SCHEMA greenhouse_auth TO greenhouse_runtime, greenhouse_app;
        CREATE TABLE greenhouse_notifications.email_type_config (email_type text PRIMARY KEY, enabled boolean NOT NULL, paused_reason text);`)
      await db.query(up)
    })
  })
  it('real transactions preserve one consumption and no raw credential state', async () => {
    const sent: InvitationDelivery[] = []
    const binding = { clientId: 'efeonce-rp-rooms', invitationId: 'local-synthetic-invite', invitationVersion: '1', recipientReference: 'local-recipient' }

    const core = createInvitationEmailOtp({
      store: createPostgresInvitationOtpStore(transaction),
      authority: { resolve: async () => ({ ...binding, email: 'synthetic@example.test', roomLabel: 'Synthetic SQL',
        invitationUrl: `https://rooms.example.test/invite#token=${'a'.repeat(43)}`, expiresAt: Date.now() + 600_000 }) },
      mailer: { send: async delivery => { sent.push(delivery);

return { status: 'accepted' } } },
      signer: { sign: async () => 'synthetic-signed-proof' }, audit: { record: async () => {} },
      hmacSecret: 'synthetic-secret-at-least-32-bytes-long', issuer: 'https://auth.example.test', roomsOrigin: 'https://rooms.example.test'
    })

    const issue = { ...binding, requestId: 'request-local-0000001', requesterKey: 'requester-local-00001' }
    const prepared = await Promise.all([core.prepare(issue), core.prepare(issue)])

    expect(sent).toHaveLength(1)
    expect(prepared.every(result => result.ok)).toBe(true)
    const accepted = prepared.find(result => result.ok && result.deliveryStatus === 'accepted')!

    if (!accepted.ok) throw new Error('Expected accepted')

    const attempt = { ...binding, challengeId: accepted.challengeId, requesterKey: issue.requesterKey,
      nonce: 'nonce-local-synthetic-longer-than-32', code: sent[0].code }

    const results = await Promise.all(Array.from({ length: 8 }, () => core.verify(attempt)))

    expect(results.filter(result => result.ok)).toHaveLength(1)
    await transaction(async db => {
      const { rows } = await db.query<{ value: Record<string, unknown> }>('SELECT value FROM greenhouse_auth.email_otp_challenges')

      expect(rows[0].value.status).toBe('consumed')
      expect(rows[0].value).not.toHaveProperty('code')
      expect(rows[0].value).not.toHaveProperty('email')
      expect(JSON.stringify(rows)).not.toContain('synthetic@example.test')
    })
  })
  it('runtime cannot DELETE but bounded SECURITY DEFINER GC can reclaim expired state', async () => {
    await transaction(async db => {
      await db.query("UPDATE greenhouse_auth.email_otp_challenges SET expires_at=now()-interval '31 days'")
      await db.query('SET LOCAL ROLE greenhouse_runtime')
      const result = await db.query<{ result: { challenges: number } }>("SELECT greenhouse_auth.gc_invitation_email_otp(1,true) AS result")

      expect(result.rows[0].result.challenges).toBe(1)
      await db.query('SELECT greenhouse_auth.gc_invitation_email_otp(1,false)')
    })
    await expect(transaction(async db => {
      await db.query('SET LOCAL ROLE greenhouse_runtime')
      await db.query('DELETE FROM greenhouse_auth.email_otp_budgets')
    })).rejects.toThrow()
    await expect(transaction(async db => db.query('SELECT greenhouse_auth.gc_invitation_email_otp(501,false)'))).rejects.toThrow()
  })
  it('down/up guards preserve disabled email type and recreate clean state', async () => {
    await transaction(async db => {
      await db.query(down)
      await db.query(up)
      const { rows } = await db.query<{ enabled: boolean }>("SELECT enabled FROM greenhouse_notifications.email_type_config WHERE email_type='auth_server_rooms_invitation_otp'")

      expect(rows[0].enabled).toBe(false)
    })
  })
})

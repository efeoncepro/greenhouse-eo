/** Only the dedicated runner's brand-new loopback database may execute these mutations. */
import { randomBytes, randomUUID } from 'node:crypto'

import { beforeAll, describe, expect, it } from 'vitest'

import { query } from '@/lib/db'
import { getAuthFirstPartyAbuseSignals } from '@/lib/reliability/queries/auth-server-signals'
import { server } from '@/mocks/node'

import { createFirstPartyIdentityPort, resolveFirstPartyCorporateIdentity } from './identity'
import { PostgresFirstPartyStore } from './postgres-store'
import { registerFirstPartyClient } from './registry'
import type { FirstPartyCode, FirstPartyAccessHandle } from './types'

const enabled = process.env.FIRST_PARTY_EPHEMERAL_TEST === 'true'
const localHost = ['127.0.0.1','localhost','::1'].includes(process.env.GREENHOUSE_POSTGRES_HOST ?? '')
const id = 'fp-' + randomBytes(5).toString('hex')
const hash = () => randomBytes(32).toString('hex')
const store = new PostgresFirstPartyStore()
const now = new Date()
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000)
let clientId = ''
let sessionHash = ''

describe.skipIf(!enabled)('TASK-1834 isolated PostgreSQL contracts', () => {
  beforeAll(async () => {
    if (!localHost || !process.env.GREENHOUSE_POSTGRES_DATABASE?.startsWith('auth_first_party_')) throw new Error('ephemeral_local_database_required')
    server.close()

    const client = await registerFirstPartyClient({ clientId: `efeonce-rp-${id}`, product: 'rooms',
      redirectUris: ['https://rooms.example.test/callback'], actor: id }, { store })

    clientId = client.client.clientId
    sessionHash = hash()
    await query(`INSERT INTO greenhouse_core.external_identity_environments VALUES ($1,'active')`, [id])
    await query(`INSERT INTO greenhouse_core.identity_profiles(profile_id) VALUES ($1)`, [id])
    await query(`INSERT INTO greenhouse_core.identity_profile_source_links(link_id,profile_id,source_system,source_object_type,source_object_id)
      VALUES ($1,$1,$2,'subject',$3)`, [id,`external_idp:${id}`,`${id}-subject`])
    await query(`INSERT INTO greenhouse_auth.sessions(session_hash,subject,profile_id,environment_id,link_id,amr,auth_time,expires_at,absolute_expires_at)
      VALUES ($1,$2,$3,$3,$3,ARRAY['magic_link'],$4,$5,$5)`, [sessionHash,`${id}-subject`,id,now,later(3600)])
  })

  const code = (): FirstPartyCode => ({ codeHash: hash(), clientId, sessionHash, subject: `${id}-subject`,
    redirectUri: 'https://rooms.example.test/callback', codeChallenge: 'a'.repeat(43), nonce: 'nonce', authTime: now,
    createdAt: now, expiresAt: later(300), consumedAt: null, invalidatedAt: null })

  const handle = (record: FirstPartyCode): FirstPartyAccessHandle => ({ tokenHash: hash(), codeHash: record.codeHash, clientId,
    sessionHash, subject: record.subject, authTime: now, createdAt: now, expiresAt: later(300), revokedAt: null })

  it('registers once with atomic append-only actor audit and rejects inconsistent SQL state', async () => {
    const audits = await query<{ details: Record<string, unknown> }>('SELECT details FROM greenhouse_auth.oauth_audit_events WHERE client_id=$1', [clientId])

    expect(audits).toHaveLength(1)
    expect(audits[0].details).toMatchObject({ actor: id, flowClass: 'first_party_sign_in', product: 'rooms' })
    await expect(query(`UPDATE greenhouse_auth.oauth_audit_events SET details='{}' WHERE client_id=$1`, [clientId])).rejects.toThrow()
    await expect(query('UPDATE greenhouse_auth.first_party_clients SET session_max_age_seconds=0 WHERE client_id=$1',[clientId])).rejects.toThrow()
    await expect(query('SELECT greenhouse_auth.gc_first_party_ephemeral(NULL,TRUE)')).rejects.toThrow()
    await expect(query('SELECT greenhouse_auth.gc_first_party_ephemeral(500,NULL)')).rejects.toThrow()
  })

  it('atomically consumes once, leaves foreign-client codes untouched and blocks late issuance after replay', async () => {
    const record = code()

    await store.insertCode(record)
    expect(await store.consumeCode(record.codeHash,'efeonce-rp-foreign',now)).toBeNull()
    const results = await Promise.all([store.consumeCode(record.codeHash,clientId,now),store.consumeCode(record.codeHash,clientId,now)])

    expect(results.map(r => r?.status).sort()).toEqual(['consumed','reused'])
    expect(await store.insertAccessHandle(handle(record))).toBe(false)
    const next = code()

    await store.insertCode(next)
    await store.consumeCode(next.codeHash,clientId,now)
    const active = handle(next)

    expect(await store.insertAccessHandle(active)).toBe(true)
    await store.consumeCode(next.codeHash,clientId,now)
    expect((await store.getAccessHandle(active.tokenHash))?.revokedAt).toBeTruthy()
  })

  it('maps real first-party and OTP audit rows to aggregate signals without PII', async () => {
    const cases = [
      { flowClass: 'first_party_sign_in', reason: 'first_party_code_reuse' },
      { surface: 'invitation_email_otp', outcome: 'rate_limited' },
      { surface: 'invitation_email_otp', outcome: 'delivery_failed' },
      { surface: 'invitation_email_otp', outcome: 'unavailable' }
    ]

    for (const details of cases) await query(`INSERT INTO greenhouse_auth.oauth_audit_events(event_type,outcome,client_id,details)
      VALUES($1,'rejected',$2,$3::jsonb)`, ['flowClass' in details ? 'token' : 'authorize', clientId, JSON.stringify({ ...details, email: 'fixture@example.test' })])
    await query(`INSERT INTO greenhouse_auth.oauth_audit_events(event_type,outcome,client_id,details)
      VALUES('authorize','success',$1,$2::jsonb)`, [clientId,JSON.stringify({ surface: 'invitation_email_otp', outcome: 'rate_limited' })])
    const signals = await getAuthFirstPartyAbuseSignals()

    expect(signals.map(signal => signal.severity)).toEqual(['error','warning','error','error'])
    expect(signals.map(signal => signal.evidence.find(item => item.label === 'events_24h')?.value)).toEqual(['1','1','1','1'])
    expect(JSON.stringify(signals)).not.toContain('fixture@example.test')
    expect(JSON.stringify(signals)).not.toContain(clientId)
  })

  it('garbage collection dry-run preserves expired rows and apply removes only bounded expired state', async () => {
    const transactionHash = hash()

    await store.insertLoginTransaction({ transactionHash,clientId,authorizationUrl:'https://auth.example.test/oauth/authorize',
      previousSessionHash:null,freshAfter:null,expiresAt:later(-31 * 86400),consumedAt:null })
    const dry = await query<{ result: { dryRun: boolean; transactions: number } }>('SELECT greenhouse_auth.gc_first_party_ephemeral(1,TRUE) AS result')

    expect(dry[0].result).toMatchObject({ dryRun: true, transactions: 1 })
    expect(await store.getLoginTransaction(transactionHash)).not.toBeNull()
    const applied = await query<{ result: { dryRun: boolean; transactions: number } }>('SELECT greenhouse_auth.gc_first_party_ephemeral(1,FALSE) AS result')

    expect(applied[0].result).toMatchObject({ dryRun: false, transactions: 1 })
    expect(await store.getLoginTransaction(transactionHash)).toBeNull()
  })

  it('consumes durable login transaction once and round-trips freshness', async () => {
    const transactionHash = hash()

    await store.insertLoginTransaction({ transactionHash,clientId,authorizationUrl:'https://auth.example.test/oauth/authorize',
      previousSessionHash:sessionHash,freshAfter:now,expiresAt:later(600),consumedAt:null })
    expect((await store.getLoginTransaction(transactionHash))?.previousSessionHash).toBe(sessionHash)
    const results = await Promise.all([store.consumeLoginTransaction(transactionHash,now),store.consumeLoginTransaction(transactionHash,now)])

    expect(results.sort()).toEqual([false,true])
  })

  it('revalidates identity/link/profile/environment/session and never infers identity from an email', async () => {
    const identity = createFirstPartyIdentityPort({ environmentId:id,sessionCookieName:'__Host-test' })

    expect((await identity.resolveSession(sessionHash,now))?.subject).toBe(`${id}-subject`)

    for (const [table,column] of [['identity_profiles','active'],['identity_profile_source_links','active']] as const) {
      await query(`UPDATE greenhouse_core.${table} SET ${column}=FALSE`)
      expect(await identity.resolveSession(sessionHash,now)).toBeNull()
      await query(`UPDATE greenhouse_core.${table} SET ${column}=TRUE`)
    }

    await query(`UPDATE greenhouse_core.identity_profiles SET merged_into_profile_id='another' WHERE profile_id=$1`,[id])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query('UPDATE greenhouse_core.identity_profiles SET merged_into_profile_id=NULL WHERE profile_id=$1',[id])
    await query('UPDATE greenhouse_auth.sessions SET revoked_at=$2 WHERE session_hash=$1',[sessionHash,now])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query('UPDATE greenhouse_auth.sessions SET revoked_at=NULL WHERE session_hash=$1',[sessionHash])
    expect(await identity.resolveSession(sessionHash,later(3601))).toBeNull()
    await query(`UPDATE greenhouse_core.external_identity_environments SET status='draft' WHERE environment_id=$1`,[id])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query(`UPDATE greenhouse_core.external_identity_environments SET status='active' WHERE environment_id=$1`,[id])
  })

  it('requires corporate provenance, canonical workforce and enrollment but no delegated binding or capability', async () => {
    const tenant = randomUUID(), oid = randomUUID(), upstream = `${id}-upstream`, member = `${id}-member`

    await query(`UPDATE greenhouse_auth.sessions SET amr=ARRAY['entra_oidc'] WHERE session_hash=$1`,[sessionHash])
    const identity = createFirstPartyIdentityPort({ environmentId:id,sessionCookieName:'__Host-test' })

    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query(`UPDATE greenhouse_core.identity_profiles SET profile_type='efeonce_internal' WHERE profile_id=$1`,[id])
    await query(`INSERT INTO greenhouse_core.identity_profile_source_links VALUES($1,$2,'azure_ad','user',$3,TRUE,TRUE)`,[upstream,id,oid])
    await query(`INSERT INTO greenhouse_core.members VALUES($1,$2,TRUE,$3)`,[member,id,oid])
    await query(`INSERT INTO greenhouse_core.client_users VALUES($1,$1,$2,TRUE,'active','efeonce_internal',$3,$4)`,[id,member,oid,tenant])
    await query(`INSERT INTO greenhouse_core.organizations VALUES($1,'EO-ORG-0007',TRUE,'active',TRUE)`,[id])
    await query(`INSERT INTO greenhouse_core.person_memberships VALUES($1,$1,'team_member',TRUE,'active')`,[id])
    await query(`INSERT INTO greenhouse_core.person_legal_entity_relationships VALUES($1,$1,'employee','active',CURRENT_DATE,NULL)`,[id])
    await query(`INSERT INTO greenhouse_core.internal_native_enrollments VALUES($1,$1,$2,$1,$3::uuid,$4::uuid,'active')`,[id,upstream,tenant,oid])
    const upstreamIdentity = { environmentId:id,tenantId:tenant,objectId:oid,issuer:`https://login.microsoftonline.com/${tenant}/v2.0` }

    expect((await resolveFirstPartyCorporateIdentity(upstreamIdentity))?.profileId).toBe(id)
    await query(`INSERT INTO greenhouse_auth.corporate_session_evidence VALUES($1,$2,$3::uuid,$4::uuid,$5,$6)`,
      [sessionHash,upstream,tenant,oid,upstreamIdentity.issuer,now])
    expect((await identity.resolveSession(sessionHash,now))?.profileId).toBe(id)
    await query(`UPDATE greenhouse_auth.corporate_session_evidence SET upstream_issuer='https://invalid.example' WHERE session_hash=$1`,[sessionHash])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query(`UPDATE greenhouse_auth.corporate_session_evidence SET upstream_issuer=$2 WHERE session_hash=$1`,[sessionHash,upstreamIdentity.issuer])
    await query(`UPDATE greenhouse_core.client_users SET microsoft_tenant_id=$2 WHERE identity_profile_id=$1`,[id,randomUUID()])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    await query(`UPDATE greenhouse_core.client_users SET microsoft_tenant_id=$2 WHERE identity_profile_id=$1`,[id,tenant])
    await query(`UPDATE greenhouse_core.internal_native_enrollments SET status='revoked' WHERE profile_id=$1`,[id])
    expect(await identity.resolveSession(sessionHash,now)).toBeNull()
    expect(await resolveFirstPartyCorporateIdentity(upstreamIdentity)).toBeNull()
  })
})

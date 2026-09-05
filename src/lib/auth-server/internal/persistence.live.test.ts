/** TASK-1836: actual PostgreSQL stores/FKs/concurrency. Run only through pnpm test:live.
 * Isolated random fixtures; no existing organization/person is selected or modified.
 * Needs ops/migrator permissions for strict cleanup. No migrations or runtime flags are changed.
 */
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { applyGreenhousePostgresProfile } from '../../../../scripts/lib/load-greenhouse-tool-env'

import { query } from '@/lib/db'
import { server } from '@/mocks/node'

import { PostgresPersonAuthStore } from '../persons/store/postgres-store'

import { PostgresOAuthStore } from '../oauth/store/postgres-store'
import type { InternalAuthorizationContext } from './context'
import {
  PostgresInternalContextStore,
  PostgresInternalLoginTransactions,
  type LoginEnvelopePort
} from './postgres-store'

const hasPgConfig = Boolean(
  process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || process.env.GREENHOUSE_POSTGRES_HOST
)

const suffix = randomBytes(8).toString('hex')
const id = `t1836-${suffix}`
const sessionHash = randomBytes(32).toString('hex')
const challengeHash = randomBytes(32).toString('hex')
const transactionId = randomBytes(32).toString('base64url')
const browserBindingHash = randomBytes(32).toString('hex')
const now = new Date()
const later = (seconds: number) => new Date(now.getTime() + seconds * 1000)
let fixturesStarted = false
const contextStore = new PostgresInternalContextStore()
const oauth = new PostgresOAuthStore()
const persons = new PostgresPersonAuthStore()
const key = randomBytes(32)

// Real AEAD with transaction ID as AAD; KMS transport has separate tests and is not claimed here.
const envelope: LoginEnvelopePort = {
  encrypt: async (plaintext, aad) => {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    cipher.setAAD(Buffer.from(aad))
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
  },
  decrypt: async (encoded, aad) => {
    const bytes = Buffer.from(encoded, 'base64')
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))

    decipher.setAAD(Buffer.from(aad))
    decipher.setAuthTag(bytes.subarray(12, 28))

    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8')
  }
}

const transactions = new PostgresInternalLoginTransactions(envelope)

const context: InternalAuthorizationContext = {
  id: randomUUID(),
  version: 1,
  issuer: `https://${id}.invalid`,
  environmentId: id,
  subject: id,
  profileId: id,
  clientId: id,
  audience: 'https://mcp.invalid/mcp',
  organizationId: id,
  bindingId: id,
  sessionHash,
  upstreamLinkId: id,
  authTime: now,
  createdAt: now,
  expiresAt: later(3600),
  revokedAt: null
}

describe.skipIf(!hasPgConfig)('TASK-1836 internal persistence — real PG', () => {
  beforeAll(async () => {
    // Live network credentials must never be echoed by MSW's unhandled-request logger.
    server.close()
    applyGreenhousePostgresProfile('ops')

    const cleanupTables = [
      'greenhouse_auth.passkey_challenges',
      'greenhouse_auth.access_tokens',
      'greenhouse_auth.refresh_tokens',
      'greenhouse_auth.authorization_codes',
      'greenhouse_auth.client_consents',
      'greenhouse_auth.authorization_contexts',
      'greenhouse_auth.internal_login_transactions',
      'greenhouse_auth.corporate_session_evidence',
      'greenhouse_auth.sessions',
      'greenhouse_auth.oauth_clients',
      'greenhouse_core.external_organization_bindings',
      'greenhouse_core.identity_profile_source_links',
      'greenhouse_core.identity_profiles',
      'greenhouse_core.external_identity_environments',
      'greenhouse_core.organizations'
    ]

    const permissions = await query<{ table_name: string; allowed: boolean }>(
      `SELECT t AS table_name, has_table_privilege(current_user, t, 'DELETE') AS allowed FROM unnest($1::text[]) t`,
      [cleanupTables]
    )

    expect(
      permissions.filter(p => !p.allowed).map(p => p.table_name),
      'cleanup permissions must exist before fixture writes'
    ).toEqual([])
    // A missing migration is an explicit failure, never a skipped green suite.
    expect(
      (
        await query<{ relation: string | null }>(
          `SELECT to_regclass('greenhouse_auth.authorization_contexts')::text AS relation`
        )
      )[0]?.relation
    ).toBe('greenhouse_auth.authorization_contexts')
    fixturesStarted = true
    await query(
      `INSERT INTO greenhouse_core.organizations (organization_id, organization_name, status, active) VALUES ($1, $2, 'inactive', FALSE)`,
      [id, `Isolated auth persistence fixture ${id}`]
    )
    await query(
      `INSERT INTO greenhouse_core.external_identity_environments (environment_id, display_name, provider, issuer_url, jwks_uri, audience, issuer_class, status) VALUES ($1, $1, 'test', $2, $3, $4, 'external', 'draft')`,
      [id, context.issuer, `${context.issuer}/jwks`, context.audience]
    )
    await query(
      `INSERT INTO greenhouse_core.identity_profiles (profile_id, public_id, profile_type, canonical_email, full_name, status, active, primary_source_system, primary_source_object_type, primary_source_object_id) VALUES ($1, $1, 'external_contact', $2, $1, 'active', FALSE, $3, 'subject', $1)`,
      [id, `${id}@example.invalid`, `external_idp:${id}`]
    )
    await query(
      `INSERT INTO greenhouse_core.identity_profile_source_links (link_id, profile_id, source_system, source_object_type, source_object_id, source_user_id, is_login_identity, active) VALUES ($1, $1, $2, 'subject', $1, $1, FALSE, FALSE)`,
      [id, `external_idp:${id}`]
    )
    await query(
      `INSERT INTO greenhouse_core.external_organization_bindings (binding_id, organization_id, environment_id, external_organization_ref, status, bound_by, revoked_at, revoked_by, revoke_reason) VALUES ($1, $1, $1, $1, 'revoked', $1, $2, $1, 'Isolated persistence fixture')`,
      [id, now]
    )
    await oauth.upsertClient({
      clientId: id,
      registrationKind: 'preregistered',
      clientType: 'public',
      clientName: id,
      redirectUris: ['https://client.invalid/cb'],
      grantTypes: ['authorization_code', 'refresh_token'],
      responseTypes: ['code'],
      tokenEndpointAuthMethod: 'none',
      clientSecretHash: null,
      allowedScopes: ['efeonce.mcp.read'],
      status: 'active',
      metadata: { fixture: id },
      createdBy: id,
      createdAt: now,
      updatedAt: now
    })
    await query(
      `INSERT INTO greenhouse_auth.sessions (session_hash, subject, environment_id, profile_id, link_id, amr, auth_time, created_at, last_seen_at, expires_at, absolute_expires_at) VALUES ($1, $2, $2, $2, $2, ARRAY['entra_oidc'], $3, $3, $3, $4, $5)`,
      [sessionHash, id, now, later(3600), later(7200)]
    )
    await query(
      `INSERT INTO greenhouse_auth.corporate_session_evidence (session_hash, upstream_link_id, tenant_id, object_id, upstream_issuer, authenticated_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionHash, id, randomUUID(), randomUUID(), context.issuer, now]
    )
  })

  afterAll(async () => {
    if (!fixturesStarted) return
    await query('DELETE FROM greenhouse_auth.passkey_challenges WHERE correlation_id = $1', [id])
    // Every delete uses this run's exact identifier. Cleanup failures fail the suite.
    await query(`DELETE FROM greenhouse_auth.access_tokens WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_auth.refresh_tokens WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_auth.authorization_codes WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_auth.client_consents WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_auth.authorization_contexts WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_auth.internal_login_transactions WHERE transaction_id = $1`, [transactionId])
    await query(`DELETE FROM greenhouse_auth.corporate_session_evidence WHERE session_hash = $1`, [sessionHash])
    await query(`DELETE FROM greenhouse_auth.sessions WHERE session_hash = $1`, [sessionHash])
    await query(`DELETE FROM greenhouse_auth.oauth_clients WHERE client_id = $1`, [id])
    await query(`DELETE FROM greenhouse_core.external_organization_bindings WHERE binding_id = $1`, [id])
    await query(`DELETE FROM greenhouse_core.identity_profile_source_links WHERE link_id = $1`, [id])
    await query(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [id])
    await query(`DELETE FROM greenhouse_core.external_identity_environments WHERE environment_id = $1`, [id])
    await query(`DELETE FROM greenhouse_core.organizations WHERE organization_id = $1`, [id])
  })

  it('atomically returns one stable ID under concurrent inserts and never extends its expiry', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => contextStore.insert({ ...context, id: randomUUID() }))
    )

    expect(new Set(results.map(r => r.id)).size).toBe(1)
    const stable = results[0]

    expect(await contextStore.get(stable.id)).toEqual({ ...context, id: stable.id })
    expect(await contextStore.insert({ ...context, id: randomUUID(), expiresAt: later(7200) })).toEqual(stable)
    await expect(
      contextStore.insert({ ...context, id: randomUUID(), bindingId: `${id}-missing` })
    ).rejects.toMatchObject({ code: '23503' })
  })

  it('consumes encrypted transaction exactly once and rejects another browser without burning it', async () => {
    const transaction = {
      id: transactionId,
      browserBindingHash,
      nonce: 'fixture-nonce',
      codeVerifier: 'fixture-verifier',
      returnTo: '/oauth/authorize?client_id=fixture',
      createdAt: now,
      expiresAt: later(300)
    }

    await transactions.insert(transaction)

    const stored = await query<{ encrypted_payload: string }>(
      `SELECT encrypted_payload FROM greenhouse_auth.internal_login_transactions WHERE transaction_id = $1`,
      [transactionId]
    )

    expect(stored[0].encrypted_payload).not.toContain(transaction.codeVerifier)
    expect(
      await transactions.consume({ id: transactionId, browserBindingHash: randomBytes(32).toString('hex'), now })
    ).toBeNull()

    const consumed = await Promise.all(
      Array.from({ length: 6 }, () => transactions.consume({ id: transactionId, browserBindingHash, now }))
    )

    expect(consumed.filter(Boolean)).toEqual([transaction])
  })

  it('round-trips context through code, isolated consent, refresh rotation and access ledger', async () => {
    const persisted = await contextStore.insert(context)
    const authorizationContextId = persisted.id
    const scopes = ['efeonce.mcp.read']
    const base = { subject: id, environmentId: id, clientId: id, authorizationContextId }

    await oauth.insertAuthorizationCode({
      ...base,
      codeHash: `${id}-code`,
      grantId: id,
      redirectUri: 'https://client.invalid/cb',
      scopes,
      codeChallenge: 'a'.repeat(43),
      codeChallengeMethod: 'S256',
      nonce: null,
      authTime: now,
      grantsVersion: 1,
      expiresAt: later(300),
      consumedAt: null,
      createdAt: now,
      ipHash: null,
      correlationId: id
    })
    const code = await oauth.consumeAuthorizationCode({ codeHash: `${id}-code`, now })

    expect(code.status === 'consumed' && code.code.authorizationContextId).toBe(authorizationContextId)
    const consent = { ...base, scopes, grantedBy: id, grantedVia: 'cli', now }
    const consents = await Promise.all([oauth.grantConsents(consent), oauth.grantConsents(consent)])

    expect(consents.map(rows => rows.length)).toEqual([1, 1])
    expect(consents[0][0].authorizationContextId).toBe(authorizationContextId)
    expect(await oauth.listActiveConsents({ ...base, authorizationContextId: null })).toEqual([])
    await oauth.grantConsents({ ...consent, authorizationContextId: null })
    expect(await oauth.listActiveConsents(base)).toHaveLength(1)
    expect(await oauth.listActiveConsents({ ...base, authorizationContextId: null })).toHaveLength(1)

    const refresh = {
      ...base,
      grantId: id,
      tokenHash: `${id}-rt1`,
      scopes,
      status: 'active' as const,
      rotatedToHash: null,
      expiresAt: later(3600),
      absoluteExpiresAt: later(7200),
      authTime: now,
      createdAt: now,
      usedAt: null,
      revokedAt: null,
      revokeReason: null
    }

    const access = {
      ...base,
      grantId: id,
      jti: `${id}-jti`,
      scopes,
      issuedAt: later(1),
      expiresAt: later(900),
      revokedAt: null,
      revokeReason: null
    }

    await oauth.insertRefreshToken(refresh)

    const rotated = await oauth.rotateRefreshToken({
      tokenHash: refresh.tokenHash,
      now: later(1),
      next: { ...refresh, tokenHash: `${id}-rt2`, createdAt: later(1) },
      accessToken: access
    })

    expect(rotated.status).toBe('rotated')
    expect(await oauth.getRefreshToken(`${id}-rt2`)).toMatchObject({ authorizationContextId, authTime: now })
    expect(await oauth.getAccessToken(access.jti)).toMatchObject({ authorizationContextId })
    expect(await contextStore.revoke({ id: authorizationContextId, now: later(2), reason: 'fixture completed' })).toBe(
      true
    )
    expect((await contextStore.get(authorizationContextId))?.revokedAt).toEqual(later(2))
  })

  it('persists a session-bound UV challenge and atomically denies mismatched, expired or revoked elevation', async () => {
    const challenge = {
      challengeHash,
      purpose: 'step_up' as const,
      environmentId: id,
      subject: id,
      sessionHash,
      createdAt: now,
      expiresAt: later(300),
      consumedAt: null,
      ipHash: null,
      correlationId: id
    }

    await persons.insertPasskeyChallenge(challenge)
    const claimed = await persons.claimPasskeyChallenge({ challengeHash, now })

    expect(claimed).toEqual({ status: 'claimed', record: { ...challenge, consumedAt: now } })
    expect(await persons.claimPasskeyChallenge({ challengeHash, now })).toEqual({ status: 'already_consumed' })
    await expect(
      persons.insertPasskeyChallenge({
        ...challenge,
        challengeHash: randomBytes(32).toString('hex'),
        sessionHash: null
      })
    ).rejects.toMatchObject({ code: '23514' })
    await expect(
      persons.insertPasskeyChallenge({
        ...challenge,
        challengeHash: randomBytes(32).toString('hex'),
        purpose: 'authentication'
      })
    ).rejects.toMatchObject({ code: '23514' })

    const bound = {
      sessionHash,
      subject: id,
      environmentId: id,
      profileId: id,
      linkId: id,
      stepUpAt: later(1),
      amr: ['uv', 'passkey']
    }

    // The fixture link starts inactive: verified UV alone cannot restore access.
    expect(await persons.recordBoundSessionStepUp(bound)).toBe(false)
    await query('UPDATE greenhouse_core.identity_profile_source_links SET active = TRUE WHERE link_id = $1', [id])

    for (const field of ['subject', 'environmentId', 'profileId', 'linkId', 'sessionHash'] as const) {
      expect(await persons.recordBoundSessionStepUp({ ...bound, [field]: 'other' })).toBe(false)
    }

    expect((await persons.getSessionWithLink(sessionHash))?.session.stepUpAt).toBeNull()

    const evidenceBefore = await query(
      'SELECT * FROM greenhouse_auth.corporate_session_evidence WHERE session_hash = $1',
      [sessionHash]
    )

    expect(await persons.recordBoundSessionStepUp(bound)).toBe(true)
    const upgraded = await persons.getSessionWithLink(sessionHash)

    expect(
      await query('SELECT * FROM greenhouse_auth.corporate_session_evidence WHERE session_hash = $1', [sessionHash])
    ).toEqual(evidenceBefore)
    expect(upgraded?.session.authTime).toEqual(now)
    expect(upgraded?.session.stepUpAt).toEqual(later(1))
    expect(upgraded?.session.amr).toEqual(expect.arrayContaining(['entra_oidc', 'uv', 'passkey']))
    expect(await persons.recordBoundSessionStepUp({ ...bound, stepUpAt: later(8000) })).toBe(false)
    await persons.revokeSession({ sessionHash, now: later(2), reason: 'fixture revoke' })
    expect(await persons.recordBoundSessionStepUp({ ...bound, stepUpAt: later(3) })).toBe(false)
    expect((await persons.getSessionWithLink(sessionHash))?.session.stepUpAt).toEqual(later(1))
    await query('UPDATE greenhouse_core.identity_profile_source_links SET active = FALSE WHERE link_id = $1', [id])
  })
})

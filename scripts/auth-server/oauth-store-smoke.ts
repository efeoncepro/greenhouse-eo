/**
 * Smoke del `PostgresOAuthStore` contra PostgreSQL REAL (TASK-1829).
 *
 * Ejercita cada operación del store sobre `greenhouse_auth.*` con filas de prueba prefijadas
 * `smoke-` y las limpia al final (los tests con mocks ejercitan el TS, no el SQL). Requiere proxy:
 *
 *   pnpm auth-server:oauth-store:smoke   (lee .env.local; proxy en 127.0.0.1:15432, perfil ops)
 */
import { randomBytes } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

import type { OAuthClientRecord } from '@/lib/auth-server/oauth/store/port'

// Env ANTES de importar el cliente PG (los imports estáticos se hoistean).
loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`[oauth-store-smoke] ${message}`)
}

const run = async () => {
  const { query } = await import('@/lib/db')
  const { PostgresOAuthStore } = await import('@/lib/auth-server/oauth/store/postgres-store')
  const store = new PostgresOAuthStore()
  const suffix = randomBytes(4).toString('hex')
  const clientId = `smoke-client-${suffix}`
  const subject = `smoke-subject-${suffix}`
  const environmentId = 'efeonce-auth'
  const now = new Date()
  const later = (seconds: number) => new Date(now.getTime() + seconds * 1000)

  const client: OAuthClientRecord = {
    clientId,
    registrationKind: 'preregistered',
    clientType: 'confidential',
    clientName: 'Smoke client',
    redirectUris: ['https://smoke.example/cb'],
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    tokenEndpointAuthMethod: 'client_secret_basic',
    clientSecretHash: 'a'.repeat(64),
    allowedScopes: null,
    status: 'active',
    metadata: { smoke: true },
    createdBy: 'smoke',
    createdAt: now,
    updatedAt: now
  }

  try {
    await store.upsertClient(client)
    const loaded = await store.getClient(clientId)

    assert(loaded?.clientType === 'confidential' && loaded.redirectUris[0] === 'https://smoke.example/cb', 'client round-trip')

    const cimdUrl = `https://smoke.example/${suffix}/client.json`

    await store.putCimdCache({ clientIdUrl: cimdUrl, document: { client_id: cimdUrl }, etag: '"e"', status: 'valid', rejectReason: null, fetchedAt: now, expiresAt: later(3600) })
    assert((await store.getCimdCache(cimdUrl))?.status === 'valid', 'cimd cache round-trip')

    const codeHash = `smoke-code-${suffix}`
    const grantId = `smoke-grant-${suffix}`

    await store.insertAuthorizationCode({
      codeHash, clientId, subject, environmentId, grantId, redirectUri: 'https://smoke.example/cb', scopes: ['efeonce.mcp.read'],
      codeChallenge: 'c'.repeat(43), codeChallengeMethod: 'S256', nonce: null, authTime: now, grantsVersion: 1,
      expiresAt: later(300), consumedAt: null, createdAt: now, ipHash: null, correlationId: 'smoke'
    })

    const first = await store.consumeAuthorizationCode({ codeHash, now: later(1) })
    const second = await store.consumeAuthorizationCode({ codeHash, now: later(2) })

    assert(first.status === 'consumed' && second.status === 'already_consumed', `code single-use (${first.status}/${second.status})`)

    const consents = await store.grantConsents({ subject, environmentId, clientId, scopes: ['efeonce.mcp.read', 'efeonce.mcp.read'], grantedVia: 'cli', grantedBy: 'smoke', now })
    const again = await store.grantConsents({ subject, environmentId, clientId, scopes: ['efeonce.mcp.read'], grantedVia: 'cli', grantedBy: 'smoke', now })

    assert(consents.length === 1 && again.length === 1, 'consent idempotent via partial unique index')

    const rt1 = `smoke-rt1-${suffix}`
    const rt2 = `smoke-rt2-${suffix}`
    const base = { grantId, clientId, subject, environmentId, scopes: ['efeonce.mcp.read'], status: 'active' as const, rotatedToHash: null, expiresAt: later(3600), absoluteExpiresAt: later(7200), createdAt: now, usedAt: null, revokedAt: null, revokeReason: null }

    await store.insertRefreshToken({ ...base, tokenHash: rt1 })
    await store.insertAccessToken({ jti: `smoke-jti1-${suffix}`, grantId, clientId, subject, environmentId, scopes: ['efeonce.mcp.read'], issuedAt: now, expiresAt: later(900), revokedAt: null, revokeReason: null })

    const rotated = await store.rotateRefreshToken({ tokenHash: rt1, now: later(1), next: { ...base, tokenHash: rt2, createdAt: later(1) }, accessToken: { jti: `smoke-jti2-${suffix}`, grantId, clientId, subject, environmentId, scopes: ['efeonce.mcp.read'], issuedAt: later(1), expiresAt: later(901), revokedAt: null, revokeReason: null } })
    const reused = await store.rotateRefreshToken({ tokenHash: rt1, now: later(2), next: { ...base, tokenHash: `smoke-rt3-${suffix}` }, accessToken: { jti: `smoke-jti3-${suffix}`, grantId, clientId, subject, environmentId, scopes: ['efeonce.mcp.read'], issuedAt: later(2), expiresAt: later(902), revokedAt: null, revokeReason: null } })

    assert(rotated.status === 'rotated' && reused.status === 'reused', `refresh rotation/reuse (${rotated.status}/${reused.status})`)
    assert((await store.getRefreshToken(rt2))?.status === 'active', 'next refresh active')

    const revoked = await store.revokeGrant({ grantId, now: later(3), reason: 'smoke' })

    assert(revoked.refreshRevoked === 2 && revoked.accessRevoked === 2, `family revoke counts (${revoked.refreshRevoked}/${revoked.accessRevoked})`)
    assert((await store.getAccessToken(`smoke-jti2-${suffix}`))?.revokedAt !== null, 'access revoked')

    const revokedConsents = await store.revokeConsents({ subject, environmentId, clientId, scopes: null, revokedBy: 'smoke', reason: 'smoke', now: later(4) })

    assert(revokedConsents === 1 && (await store.listActiveConsents({ subject, environmentId, clientId })).length === 0, 'consent revoke')

    await store.recordAuditEvent({ eventType: 'token', outcome: 'rejected', clientId, subjectHash: null, grantId, errorCode: 'smoke', ipHash: `smoke-ip-${suffix}`, userAgentHash: null, correlationId: 'smoke', details: {} })

    const count = await store.countAuditEvents({ eventTypes: ['token', 'refresh'], since: later(-60), ipHash: `smoke-ip-${suffix}` })

    assert(count === 1, `audit count by ip (${count})`)

    let appendOnlyBlocked = false

    try {
      await query(`DELETE FROM greenhouse_auth.oauth_audit_events WHERE ip_hash = $1`, [`smoke-ip-${suffix}`])
    } catch {
      appendOnlyBlocked = true
    }

    assert(appendOnlyBlocked, 'audit append-only trigger')

    console.log(`[oauth-store-smoke] OK — client=${clientId} (all store operations verified against real PG)`)
  } finally {
    // Limpieza (el audit es append-only: la fila de smoke se conserva, identificada por correlation_id='smoke').
    await query(`DELETE FROM greenhouse_auth.access_tokens WHERE client_id = $1`, [clientId])
    await query(`DELETE FROM greenhouse_auth.refresh_tokens WHERE client_id = $1`, [clientId])
    await query(`DELETE FROM greenhouse_auth.authorization_codes WHERE client_id = $1`, [clientId])
    await query(`DELETE FROM greenhouse_auth.client_consents WHERE client_id = $1`, [clientId])
    await query(`DELETE FROM greenhouse_auth.cimd_cache WHERE client_id_url LIKE 'https://smoke.example/%'`)
    await query(`DELETE FROM greenhouse_auth.oauth_clients WHERE client_id = $1`, [clientId])
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })

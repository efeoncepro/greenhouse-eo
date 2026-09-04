/**
 * Smoke del `PostgresPersonAuthStore` contra PostgreSQL REAL (TASK-1830).
 *
 * Existe porque los tests con mocks ejercitan el TS, NUNCA el SQL: el CHECK del `bucket_key`, el
 * `ON CONFLICT` del bucket, el `ARRAY(SELECT DISTINCT unnest(...))` del `amr`, el JOIN con el source
 * link y el trigger append-only del ledger sólo se prueban acá. Requiere proxy:
 *
 *   pnpm auth-server:person-auth:smoke   (lee .env.local; proxy en 127.0.0.1:15432, perfil ops)
 *
 * Crea sus propias filas con sufijo aleatorio y las limpia al final, incluido el `identity_profile`
 * y el source link de prueba (la sesión tiene FK contra el link: sin él no hay fila que insertar).
 */
import { createHash, randomUUID } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

// Env ANTES de importar el cliente PG (los imports estáticos se hoistean).
loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`[person-auth-smoke] ${message}`)
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

const run = async () => {
  const { query } = await import('@/lib/db')
  const { PostgresPersonAuthStore } = await import('@/lib/auth-server/persons/store/postgres-store')
  const { buildRateLimitBucketKey } = await import('@/lib/auth-server/persons/rate-limit')

  const store = new PostgresPersonAuthStore()
  const suffix = randomUUID().slice(0, 8)
  const environmentId = 'efeonce-auth'
  const sourceSystem = `external_idp:${environmentId}`
  const subject = `smoke-subject-${suffix}`
  const profileId = `smoke-profile-${suffix}`
  const linkId = `smoke-link-${suffix}`
  const email = `smoke-${suffix}@example.invalid`
  const now = new Date()
  const later = (seconds: number) => new Date(now.getTime() + seconds * 1000)
  // Fuera del `try` para que la limpieza borre EXACTAMENTE esta llave y no las de otros.
  const bucketKey = buildRateLimitBucketKey('magic_link_request', 'ip', `203.0.113.smoke-${suffix}`)

  try {
    // ─── Fixture: persona + source link (la sesión tiene FK contra el link) ───
    await query(
      `INSERT INTO greenhouse_core.identity_profiles (
         profile_id, public_id, profile_type, canonical_email, full_name, status, active,
         primary_source_system, primary_source_object_type, primary_source_object_id
       ) VALUES ($1, $2, 'external_contact', $3, $4, 'active', TRUE, $5, 'subject', $6)`,
      [profileId, `smoke-public-${suffix}`, email, `Smoke ${suffix}`, sourceSystem, subject]
    )

    await query(
      `INSERT INTO greenhouse_core.identity_profile_source_links (
         link_id, profile_id, source_system, source_object_type, source_object_id,
         source_user_id, source_email, source_display_name, is_login_identity, active
       ) VALUES ($1, $2, $3, 'subject', $4, $4, $5, $6, TRUE, TRUE)`,
      [linkId, profileId, sourceSystem, subject, email, `Smoke ${suffix}`]
    )

    // ─── Readers canónicos de TASK-1631 usados por el directorio ─────────────
    const { findActiveExternalIdpLinkByEmail, getActiveExternalIdpLinkBySubject } = await import(
      '@/lib/identity/external-access'
    )

    const bySubject = await getActiveExternalIdpLinkBySubject({ environmentId, subject })
    const byEmail = await findActiveExternalIdpLinkByEmail({ environmentId, email })

    assert(bySubject?.linkId === linkId, 'source link resuelto por subject')
    assert(byEmail?.subject === subject, 'source link resuelto por correo (case-insensitive)')
    assert(
      (await findActiveExternalIdpLinkByEmail({ environmentId, email: email.toUpperCase() }))?.subject === subject,
      'la resolución por correo ignora mayúsculas'
    )

    // ─── Sesión ──────────────────────────────────────────────────────────────
    const sessionId = `smoke-session-${suffix}`
    const sessionHash = sha256(sessionId)

    await store.insertSession({
      sessionHash,
      subject,
      environmentId,
      profileId,
      linkId,
      amr: ['magic_link'],
      authTime: now,
      stepUpAt: null,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: later(3600),
      absoluteExpiresAt: later(7 * 24 * 3600),
      revokedAt: null,
      revokeReason: null,
      ipHash: sha256('203.0.113.10').slice(0, 32),
      userAgentHash: null,
      correlationId: `smoke-${suffix}`
    })

    const resolved = await store.getSessionWithLink(sessionHash)

    assert(resolved?.session.subject === subject, 'sesión round-trip')
    assert(resolved?.linkActive === true, 'el JOIN trae el estado vivo del link')
    assert(resolved?.linkSourceSystem === sourceSystem, 'el JOIN trae el source_system del link')
    assert(Array.isArray(resolved?.session.amr) && resolved!.session.amr[0] === 'magic_link', 'amr como text[]')

    // `LEAST(..., absolute_expires_at)` respeta el tope absoluto aunque se pida de más.
    await store.touchSession({ sessionHash, lastSeenAt: now, expiresAt: later(999 * 24 * 3600) })

    const touched = await store.getSessionWithLink(sessionHash)

    assert(
      touched!.session.expiresAt.getTime() === touched!.session.absoluteExpiresAt.getTime(),
      'la ventana deslizante nunca supera el tope absoluto'
    )

    // Unión de `amr` sin duplicados (ARRAY(SELECT DISTINCT unnest(...))).
    await store.recordSessionStepUp({ sessionHash, stepUpAt: now, amr: ['totp', 'magic_link'] })

    const steppedUp = await store.getSessionWithLink(sessionHash)

    assert(steppedUp!.session.amr.length === 2, `amr sin duplicados tras step-up (${steppedUp!.session.amr.join(',')})`)
    assert(steppedUp!.session.amr.includes('totp'), 'el step-up agrega el factor')
    assert(steppedUp!.session.stepUpAt !== null, 'step_up_at persistido')

    assert((await store.revokeSession({ sessionHash, now, reason: 'smoke' })) === 1, 'revocación revoca una fila')
    assert((await store.revokeSession({ sessionHash, now, reason: 'smoke' })) === 0, 'revocar dos veces es idempotente')

    // ─── Magic link ──────────────────────────────────────────────────────────
    const tokenId = randomUUID()
    const verifier = `smoke-verifier-${suffix}`

    await store.insertMagicLink({
      tokenId,
      tokenHash: sha256(verifier),
      environmentId,
      subject,
      emailHash: sha256(email),
      returnTo: '/oauth/authorize?client_id=smoke',
      requestedAt: now,
      expiresAt: later(900),
      consumedAt: null,
      requestedIpHash: null,
      consumedIpHash: null,
      userAgentHash: null,
      correlationId: `smoke-${suffix}`
    })

    const firstClaim = await store.claimMagicLink({ tokenId, now: later(1), consumedIpHash: null })
    const secondClaim = await store.claimMagicLink({ tokenId, now: later(2), consumedIpHash: null })

    assert(firstClaim.status === 'claimed', `primer consumo (${firstClaim.status})`)
    assert(secondClaim.status === 'already_consumed', `consumo único (${secondClaim.status})`)
    assert(
      firstClaim.status === 'claimed' && firstClaim.record.returnTo === '/oauth/authorize?client_id=smoke',
      'return_to round-trip'
    )

    const expiredTokenId = randomUUID()

    await store.insertMagicLink({
      tokenId: expiredTokenId,
      tokenHash: sha256('otro'),
      environmentId,
      subject,
      emailHash: sha256(email),
      returnTo: null,
      requestedAt: now,
      expiresAt: later(1),
      consumedAt: null,
      requestedIpHash: null,
      consumedIpHash: null,
      userAgentHash: null,
      correlationId: null
    })

    assert(
      (await store.claimMagicLink({ tokenId: expiredTokenId, now: later(120), consumedIpHash: null })).status ===
        'expired',
      'un enlace vencido no se puede reclamar'
    )

    assert(
      (await store.claimMagicLink({ tokenId: randomUUID(), now, consumedIpHash: null })).status === 'not_found',
      'un tokenId inexistente responde not_found'
    )

    // ─── Rate limit: el CHECK del bucket_key y el ON CONFLICT ────────────────
    const hit = (at: Date) =>
      store.hitRateLimitBucket({
        bucketKey,
        now: at,
        windowSeconds: 60,
        limit: 2,
        lockoutBaseSeconds: 60,
        lockoutMaxSeconds: 3600
      })

    assert((await hit(now)).allowed, 'primer golpe permitido')
    assert((await hit(now)).allowed, 'segundo golpe permitido')

    const blocked = await hit(now)

    assert(!blocked.allowed, 'el tercer golpe bloquea')
    assert(!blocked.allowed && blocked.retryAfterSeconds === 60, 'backoff base')
    assert(!(await hit(later(5))).allowed, 'sigue bloqueado dentro de la ventana de bloqueo')

    let rejectedBadKey = false

    try {
      await store.hitRateLimitBucket({
        bucketKey: `magic_link_request:ip:${email}`,
        now,
        windowSeconds: 60,
        limit: 2,
        lockoutBaseSeconds: 60,
        lockoutMaxSeconds: 3600
      })
    } catch {
      rejectedBadKey = true
    }

    assert(rejectedBadKey, 'el CHECK rechaza una llave con el valor en claro')

    // ─── Ledger append-only ──────────────────────────────────────────────────
    await store.recordAttempt({
      method: 'magic_link',
      stage: 'request',
      outcome: 'success',
      reasonCode: null,
      environmentId,
      subjectHash: sha256(subject),
      ipHash: null,
      userAgentHash: null,
      correlationId: `smoke-${suffix}`,
      details: { smoke: true }
    })

    const attempts = await query<{ attempt_id: string }>(
      `SELECT attempt_id FROM greenhouse_auth.person_auth_attempts WHERE correlation_id = $1`,
      [`smoke-${suffix}`]
    )

    assert(attempts.length === 1, 'el intento quedó registrado')

    let blockedMutation = false

    try {
      await query(`UPDATE greenhouse_auth.person_auth_attempts SET outcome = 'failure' WHERE attempt_id = $1`, [
        attempts[0].attempt_id
      ])
    } catch {
      blockedMutation = true
    }

    assert(blockedMutation, 'el trigger append-only bloquea el UPDATE del ledger')

    console.log('[person-auth-smoke] OK — sesión, magic link, rate limit y ledger verificados contra PG real')
  } finally {
    // Limpieza: el orden respeta las FKs (sesión → link → profile).
    await query(`DELETE FROM greenhouse_auth.person_auth_attempts WHERE correlation_id = $1`, [`smoke-${suffix}`]).catch(
      () => undefined
    )
    await query(`DELETE FROM greenhouse_auth.sessions WHERE link_id = $1`, [linkId]).catch(() => undefined)
    await query(`DELETE FROM greenhouse_auth.magic_link_tokens WHERE subject = $1`, [subject]).catch(() => undefined)
    await query(`DELETE FROM greenhouse_auth.auth_rate_limits WHERE bucket_key = $1`, [bucketKey]).catch(
      () => undefined
    )
    await query(`DELETE FROM greenhouse_core.identity_profile_source_links WHERE link_id = $1`, [linkId]).catch(
      () => undefined
    )
    await query(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [profileId]).catch(
      () => undefined
    )
  }

  process.exit(0)
}

void run().catch(error => {
  console.error('[person-auth-smoke] FAILED:', error instanceof Error ? error.message : error)
  process.exit(1)
})

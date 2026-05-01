import 'server-only'

import crypto from 'crypto'

import { compare, hash } from 'bcryptjs'

import { recordAuthAttempt } from '@/lib/auth/attempt-tracker'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  getTenantAccessRecordByEmail,
  getTenantAccessRecordByUserId,
  type TenantAccessRecord
} from '@/lib/tenant/access'

/**
 * TASK-742 Capa 5 — Self-recovery magic-link.
 *
 * Allows a provisioned user without password and with broken SSO to receive
 * a single-use, short-lived link by email and resume access. This is the
 * airbag for incidents like 2026-04-30 (Microsoft SSO callback rejection).
 *
 * Security properties:
 *   - Token: 32 random bytes, urlsafe base64. Never logged in raw form.
 *   - Storage: only bcrypt(token) is persisted. Even DB compromise cannot
 *     replay tokens.
 *   - TTL: 15 minutes from issuance. Hard-coded; no per-tenant override.
 *   - Single-use: row is marked used_at on first consume; second attempt
 *     fails with magic_link_used.
 *   - Rate limit: 60s cooldown per user, 5 requests/hour per IP. Enforced
 *     in the request endpoint, not here, so this module stays pure.
 *   - Email channel: only sends to the user's persisted `email`. Never
 *     accepts a target email from the client.
 */

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000
const MAGIC_LINK_BCRYPT_COST = 10

export interface MagicLinkRequestResult {
  ok: boolean
  /** undefined on rate-limit / unknown user (no enumeration). */
  rawToken?: string
  tokenId?: string
  expiresAt?: string
  reason?: 'unknown_user' | 'rate_limited' | 'inactive_user' | 'pg_failure'
}

export interface MagicLinkConsumeResult {
  ok: boolean
  tenant?: TenantAccessRecord
  reason?: 'invalid' | 'expired' | 'already_used' | 'pg_failure'
}

const generateRawToken = (): string =>
  crypto.randomBytes(32).toString('base64url')

const generateTokenId = (): string => crypto.randomUUID()

export const requestMagicLink = async ({
  email,
  ip
}: {
  email: string
  ip: string | null
}): Promise<MagicLinkRequestResult> => {
  const normalizedEmail = email.trim().toLowerCase()

  let tenant: TenantAccessRecord | null = null

  try {
    tenant = await getTenantAccessRecordByEmail(normalizedEmail)
  } catch {
    // Tenant lookup failure → no enumeration, just signal pg_failure.
    return { ok: false, reason: 'pg_failure' }
  }

  // Anti-enumeration: respond identically for unknown user vs. rate-limited.
  if (!tenant) {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: 'tenant_not_found',
      email: normalizedEmail,
      ip
    })

    return { ok: false, reason: 'unknown_user' }
  }

  if (!tenant.active || tenant.status !== 'active') {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: tenant.active ? 'account_status_invalid' : 'account_disabled',
      userIdResolved: tenant.userId,
      email: normalizedEmail,
      ip
    })

    return { ok: false, reason: 'inactive_user' }
  }

  // Cooldown check — last issued < 60s ago for this user, return rate_limited.
  // Best-effort: if PG read fails, allow the request (better UX than blocking).
  try {
    const recent = await runGreenhousePostgresQuery<{ requested_at: Date }>(
      `SELECT requested_at FROM greenhouse_serving.auth_magic_links
       WHERE user_id = $1 AND requested_at > NOW() - INTERVAL '60 seconds'
       ORDER BY requested_at DESC LIMIT 1`,
      [tenant.userId]
    )

    if (recent.length > 0) {
      return { ok: false, reason: 'rate_limited' }
    }
  } catch {
    // Table missing pre-migration → treat as no rate-limit pre-existing.
  }

  const rawToken = generateRawToken()
  const tokenId = generateTokenId()
  const tokenHash = await hash(rawToken, MAGIC_LINK_BCRYPT_COST)
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)
  const requestedAt = new Date()
  const ipHashed = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32) : null

  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.auth_magic_links (
        token_id, user_id, token_hash_bcrypt, requested_ip_hashed,
        requested_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [tokenId, tenant.userId, tokenHash, ipHashed, requestedAt.toISOString(), expiresAt.toISOString()]
    )
  } catch (error) {
    console.warn('[magic-link] Failed to persist token; aborting request.', {
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return { ok: false, reason: 'pg_failure' }
  }

  return {
    ok: true,
    rawToken,
    tokenId,
    expiresAt: expiresAt.toISOString()
  }
}

export const consumeMagicLink = async ({
  tokenId,
  rawToken,
  ip
}: {
  tokenId: string
  rawToken: string
  ip: string | null
}): Promise<MagicLinkConsumeResult> => {
  if (!tokenId || !rawToken) {
    return { ok: false, reason: 'invalid' }
  }

  let row:
    | {
        user_id: string
        token_hash_bcrypt: string
        expires_at: Date
        used_at: Date | null
      }
    | undefined

  try {
    const rows = await runGreenhousePostgresQuery<{
      user_id: string
      token_hash_bcrypt: string
      expires_at: Date
      used_at: Date | null
    }>(
      `SELECT user_id, token_hash_bcrypt, expires_at, used_at
       FROM greenhouse_serving.auth_magic_links
       WHERE token_id = $1 LIMIT 1`,
      [tokenId]
    )

    row = rows[0]
  } catch {
    return { ok: false, reason: 'pg_failure' }
  }

  if (!row) {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: 'magic_link_invalid',
      ip
    })

    return { ok: false, reason: 'invalid' }
  }

  if (row.used_at) {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: 'magic_link_used',
      userIdResolved: row.user_id,
      ip
    })

    return { ok: false, reason: 'already_used' }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: 'magic_link_expired',
      userIdResolved: row.user_id,
      ip
    })

    return { ok: false, reason: 'expired' }
  }

  const matches = await compare(rawToken, row.token_hash_bcrypt)

  if (!matches) {
    await recordAuthAttempt({
      provider: 'magic-link',
      stage: 'magic_link_consume',
      outcome: 'rejected',
      reasonCode: 'magic_link_invalid',
      userIdResolved: row.user_id,
      ip
    })

    return { ok: false, reason: 'invalid' }
  }

  // Mark used
  const ipHashed = ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32) : null

  try {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_serving.auth_magic_links
       SET used_at = NOW(), used_ip_hashed = $2
       WHERE token_id = $1 AND used_at IS NULL`,
      [tokenId, ipHashed]
    )
  } catch (error) {
    console.warn('[magic-link] Failed to mark token used; refusing to issue session.', {
      error: error instanceof Error ? error.message : 'unknown_error'
    })

    return { ok: false, reason: 'pg_failure' }
  }

  // Resolve full tenant context for session minting (looks up roles/views/etc).
  const fullTenant = await getTenantAccessRecordByUserId(row.user_id).catch(() => null)

  if (!fullTenant) {
    return { ok: false, reason: 'invalid' }
  }

  await recordAuthAttempt({
    provider: 'magic-link',
    stage: 'magic_link_consume',
    outcome: 'success',
    reasonCode: 'success',
    userIdResolved: fullTenant.userId,
    email: fullTenant.email,
    ip
  })

  return { ok: true, tenant: fullTenant }
}

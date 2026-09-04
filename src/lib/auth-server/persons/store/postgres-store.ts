/**
 * Implementación PostgreSQL del `PersonAuthStorePort` sobre `greenhouse_auth.*` (TASK-1830).
 *
 * Columnas verificadas contra la migración `20260904184837565_task-1830-auth-person-session-magic-link.sql`
 * APLICADA en PG real, y ejercitadas por `scripts/auth-server/person-auth-smoke.ts` (los tests con
 * mocks ejercitan el TS, no el SQL). Ningún token, verificador, correo ni IP llega acá en claro: el
 * caller hashea antes.
 */

import { query, withTransaction } from '@/lib/db'

import { buildExternalIdpSourceSystem } from '@/lib/identity/external-access'

import type {
  ClaimMagicLinkResult,
  MagicLinkRecord,
  PersonAuthAttemptEvent,
  PersonSessionRecord,
  PersonSessionWithLink,
  RateLimitDecision
} from '../types'
import { computeLockoutSeconds } from '../rate-limit'
import type { PersonAuthStorePort } from './port'

const asDate = (value: unknown): Date => (value instanceof Date ? value : new Date(String(value)))
const asDateOrNull = (value: unknown): Date | null => (value === null || value === undefined ? null : asDate(value))
const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])

const SESSION_COLUMNS = `session_hash, subject, environment_id, profile_id, link_id, amr, auth_time, step_up_at,
  created_at, last_seen_at, expires_at, absolute_expires_at, revoked_at, revoke_reason, ip_hash, user_agent_hash,
  correlation_id`

type SessionRow = {
  session_hash: string
  subject: string
  environment_id: string
  profile_id: string
  link_id: string
  amr: string[]
  auth_time: Date | string
  step_up_at: Date | string | null
  created_at: Date | string
  last_seen_at: Date | string
  expires_at: Date | string
  absolute_expires_at: Date | string
  revoked_at: Date | string | null
  revoke_reason: string | null
  ip_hash: string | null
  user_agent_hash: string | null
  correlation_id: string | null
}

const mapSession = (row: SessionRow): PersonSessionRecord => ({
  sessionHash: row.session_hash,
  subject: row.subject,
  environmentId: row.environment_id,
  profileId: row.profile_id,
  linkId: row.link_id,
  amr: asStringArray(row.amr) as PersonSessionRecord['amr'],
  authTime: asDate(row.auth_time),
  stepUpAt: asDateOrNull(row.step_up_at),
  createdAt: asDate(row.created_at),
  lastSeenAt: asDate(row.last_seen_at),
  expiresAt: asDate(row.expires_at),
  absoluteExpiresAt: asDate(row.absolute_expires_at),
  revokedAt: asDateOrNull(row.revoked_at),
  revokeReason: row.revoke_reason,
  ipHash: row.ip_hash,
  userAgentHash: row.user_agent_hash,
  correlationId: row.correlation_id
})

const MAGIC_LINK_COLUMNS = `token_id, token_hash, environment_id, subject, email_hash, return_to, requested_at,
  expires_at, consumed_at, requested_ip_hash, consumed_ip_hash, user_agent_hash, correlation_id`

type MagicLinkRow = {
  token_id: string
  token_hash: string
  environment_id: string
  subject: string
  email_hash: string
  return_to: string | null
  requested_at: Date | string
  expires_at: Date | string
  consumed_at: Date | string | null
  requested_ip_hash: string | null
  consumed_ip_hash: string | null
  user_agent_hash: string | null
  correlation_id: string | null
}

const mapMagicLink = (row: MagicLinkRow): MagicLinkRecord => ({
  tokenId: row.token_id,
  tokenHash: row.token_hash,
  environmentId: row.environment_id,
  subject: row.subject,
  emailHash: row.email_hash,
  returnTo: row.return_to,
  requestedAt: asDate(row.requested_at),
  expiresAt: asDate(row.expires_at),
  consumedAt: asDateOrNull(row.consumed_at),
  requestedIpHash: row.requested_ip_hash,
  consumedIpHash: row.consumed_ip_hash,
  userAgentHash: row.user_agent_hash,
  correlationId: row.correlation_id
})

export class PostgresPersonAuthStore implements PersonAuthStorePort {
  async insertSession(record: PersonSessionRecord): Promise<void> {
    await query(
      `INSERT INTO greenhouse_auth.sessions (${SESSION_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        record.sessionHash,
        record.subject,
        record.environmentId,
        record.profileId,
        record.linkId,
        record.amr,
        record.authTime,
        record.stepUpAt,
        record.createdAt,
        record.lastSeenAt,
        record.expiresAt,
        record.absoluteExpiresAt,
        record.revokedAt,
        record.revokeReason,
        record.ipHash,
        record.userAgentHash,
        record.correlationId
      ]
    )
  }

  async getSessionWithLink(sessionHash: string): Promise<PersonSessionWithLink | null> {
    const rows = await query<SessionRow & { link_active: boolean; link_subject: string; link_source_system: string }>(
      `SELECT ${SESSION_COLUMNS.split(',')
        .map(column => `s.${column.trim()}`)
        .join(', ')},
              l.active AS link_active, l.source_object_id AS link_subject, l.source_system AS link_source_system
         FROM greenhouse_auth.sessions s
         JOIN greenhouse_core.identity_profile_source_links l ON l.link_id = s.link_id
        WHERE s.session_hash = $1`,
      [sessionHash]
    )

    const row = rows[0]

    if (!row) return null

    return {
      session: mapSession(row),
      linkActive: row.link_active,
      linkSubject: row.link_subject,
      linkSourceSystem: row.link_source_system
    }
  }

  async touchSession({
    sessionHash,
    lastSeenAt,
    expiresAt
  }: {
    sessionHash: string
    lastSeenAt: Date
    expiresAt: Date
  }): Promise<void> {
    // `LEAST(..., absolute_expires_at)` mantiene el tope absoluto aunque el caller calcule de más.
    await query(
      `UPDATE greenhouse_auth.sessions
          SET last_seen_at = $2,
              expires_at = LEAST($3::timestamptz, absolute_expires_at)
        WHERE session_hash = $1 AND revoked_at IS NULL`,
      [sessionHash, lastSeenAt, expiresAt]
    )
  }

  async recordSessionStepUp({
    sessionHash,
    stepUpAt,
    amr
  }: {
    sessionHash: string
    stepUpAt: Date
    amr: readonly string[]
  }): Promise<void> {
    // Unión de `amr` sin duplicados: el step-up agrega el factor, nunca reescribe el login base.
    await query(
      `UPDATE greenhouse_auth.sessions
          SET step_up_at = $2,
              amr = ARRAY(SELECT DISTINCT unnest(amr || $3::text[]))
        WHERE session_hash = $1 AND revoked_at IS NULL`,
      [sessionHash, stepUpAt, [...amr]]
    )
  }

  async revokeSession({
    sessionHash,
    now,
    reason
  }: {
    sessionHash: string
    now: Date
    reason: string
  }): Promise<number> {
    const rows = await query<{ session_hash: string }>(
      `UPDATE greenhouse_auth.sessions
          SET revoked_at = $2, revoke_reason = $3
        WHERE session_hash = $1 AND revoked_at IS NULL
        RETURNING session_hash`,
      [sessionHash, now, reason]
    )

    return rows.length
  }

  async revokeSessionsForSubject({
    environmentId,
    subject,
    now,
    reason
  }: {
    environmentId: string
    subject: string
    now: Date
    reason: string
  }): Promise<number> {
    const rows = await query<{ session_hash: string }>(
      `UPDATE greenhouse_auth.sessions
          SET revoked_at = $3, revoke_reason = $4
        WHERE environment_id = $1 AND subject = $2 AND revoked_at IS NULL
        RETURNING session_hash`,
      [environmentId, subject, now, reason]
    )

    return rows.length
  }

  async insertMagicLink(record: MagicLinkRecord): Promise<void> {
    await query(
      `INSERT INTO greenhouse_auth.magic_link_tokens (${MAGIC_LINK_COLUMNS})
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        record.tokenId,
        record.tokenHash,
        record.environmentId,
        record.subject,
        record.emailHash,
        record.returnTo,
        record.requestedAt,
        record.expiresAt,
        record.consumedAt,
        record.requestedIpHash,
        record.consumedIpHash,
        record.userAgentHash,
        record.correlationId
      ]
    )
  }

  async claimMagicLink({
    tokenId,
    now,
    consumedIpHash
  }: {
    tokenId: string
    now: Date
    consumedIpHash: string | null
  }): Promise<ClaimMagicLinkResult> {
    return withTransaction(async client => {
      const existing = await client.query<MagicLinkRow>(
        `SELECT ${MAGIC_LINK_COLUMNS} FROM greenhouse_auth.magic_link_tokens WHERE token_id = $1 FOR UPDATE`,
        [tokenId]
      )

      const row = existing.rows[0]

      if (!row) return { status: 'not_found' } as const
      if (row.consumed_at) return { status: 'already_consumed' } as const
      if (asDate(row.expires_at) <= now) return { status: 'expired' } as const

      const claimed = await client.query<MagicLinkRow>(
        `UPDATE greenhouse_auth.magic_link_tokens
            SET consumed_at = $2, consumed_ip_hash = $3
          WHERE token_id = $1 AND consumed_at IS NULL
          RETURNING ${MAGIC_LINK_COLUMNS}`,
        [tokenId, now, consumedIpHash]
      )

      // Sin fila = otro request ganó la carrera dentro de la misma ventana; nunca dos sesiones.
      if (claimed.rows.length !== 1) return { status: 'already_consumed' } as const

      return { status: 'claimed', record: mapMagicLink(claimed.rows[0]) } as const
    })
  }

  async hitRateLimitBucket({
    bucketKey,
    now,
    windowSeconds,
    limit,
    lockoutBaseSeconds,
    lockoutMaxSeconds
  }: {
    bucketKey: string
    now: Date
    windowSeconds: number
    limit: number
    lockoutBaseSeconds: number
    lockoutMaxSeconds: number
  }): Promise<RateLimitDecision> {
    // La aritmética va en SQL (`hit_count + 1`) para que dos requests concurrentes no pierdan un
    // golpe; la DECISIÓN se toma en TS sobre el valor devuelto.
    const rows = await query<{ hit_count: number; lockout_count: number; locked_until: Date | string | null }>(
      `INSERT INTO greenhouse_auth.auth_rate_limits (bucket_key, window_started_at, hit_count, lockout_count, locked_until, updated_at)
       VALUES ($1, $2, 1, 0, NULL, $2)
       ON CONFLICT (bucket_key) DO UPDATE SET
         window_started_at = CASE
           WHEN greenhouse_auth.auth_rate_limits.window_started_at <= $2::timestamptz - ($3::int * INTERVAL '1 second')
           THEN $2::timestamptz
           ELSE greenhouse_auth.auth_rate_limits.window_started_at END,
         hit_count = CASE
           WHEN greenhouse_auth.auth_rate_limits.window_started_at <= $2::timestamptz - ($3::int * INTERVAL '1 second')
           THEN 1
           ELSE greenhouse_auth.auth_rate_limits.hit_count + 1 END,
         locked_until = CASE
           WHEN greenhouse_auth.auth_rate_limits.locked_until IS NOT NULL
            AND greenhouse_auth.auth_rate_limits.locked_until > $2::timestamptz
           THEN greenhouse_auth.auth_rate_limits.locked_until
           ELSE NULL END,
         updated_at = $2
       RETURNING hit_count, lockout_count, locked_until`,
      [bucketKey, now, windowSeconds]
    )

    const row = rows[0]

    if (!row) return { allowed: true, hits: 1 }

    const lockedUntil = asDateOrNull(row.locked_until)

    if (lockedUntil && lockedUntil > now) {
      return {
        allowed: false,
        reason: 'locked_out',
        retryAfterSeconds: Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000))
      }
    }

    if (Number(row.hit_count) <= limit) return { allowed: true, hits: Number(row.hit_count) }

    const nextLockoutCount = Number(row.lockout_count) + 1
    const lockoutSeconds = computeLockoutSeconds(nextLockoutCount, lockoutBaseSeconds, lockoutMaxSeconds)

    await query(
      `UPDATE greenhouse_auth.auth_rate_limits
          SET lockout_count = $2,
              locked_until = $3,
              updated_at = $4
        WHERE bucket_key = $1`,
      [bucketKey, nextLockoutCount, new Date(now.getTime() + lockoutSeconds * 1000), now]
    )

    return { allowed: false, reason: 'window_exceeded', retryAfterSeconds: lockoutSeconds }
  }

  async recordAttempt(event: PersonAuthAttemptEvent): Promise<void> {
    await query(
      `INSERT INTO greenhouse_auth.person_auth_attempts (
         method, stage, outcome, reason_code, environment_id, subject_hash, ip_hash, user_agent_hash,
         correlation_id, details
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        event.method,
        event.stage,
        event.outcome,
        event.reasonCode,
        event.environmentId,
        event.subjectHash,
        event.ipHash,
        event.userAgentHash,
        event.correlationId,
        JSON.stringify(event.details ?? {})
      ]
    )
  }
}

/** Nombre del `source_system` que una sesión de este environment debe llevar en su link. */
export const expectedSourceSystemFor = (environmentId: string): string => buildExternalIdpSourceSystem(environmentId)

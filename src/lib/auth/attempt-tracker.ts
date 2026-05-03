import 'server-only'

import crypto from 'crypto'

import { captureWithDomain } from '@/lib/observability/capture'
import { redactSensitive } from '@/lib/observability/redact'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { shouldFallbackFromIdentityPostgres } from '@/lib/tenant/identity-store'

/**
 * TASK-742 Capa 3 — Structured auth attempt observability.
 *
 * Persists every login attempt (success/failure) to `greenhouse_serving.auth_attempts`
 * with redacted PII. Drives the `/admin/identity/auth-health` dashboard and feeds
 * Sentry incidents under domain='identity'.
 *
 * The table is append-only, retention 90 days. The `outcome` + `reason_code` is
 * stable enough for alerting (top error reasons, success rate). The `*_redacted`
 * columns let us still query "what happened to user X" without storing raw PII.
 *
 * Failure mode: if PG is unreachable or the row insert fails, we still emit the
 * Sentry event. The persistence is best-effort — it must not break sign-in.
 */

export type AuthAttemptProvider = 'credentials' | 'azure-ad' | 'google' | 'magic-link'
export type AuthAttemptStage =
  | 'authorize'
  | 'signin_callback'
  | 'jwt_callback'
  | 'session_callback'
  | 'token_exchange'
  | 'lookup'
  | 'magic_link_consume'
export type AuthAttemptOutcome = 'success' | 'failure' | 'rejected' | 'degraded'
export type AuthAttemptReasonCode =
  | 'invalid_password'
  | 'tenant_not_found'
  | 'account_disabled'
  | 'account_inactive'
  | 'account_status_invalid'
  | 'oid_mismatch'
  | 'email_alias_mismatch'
  | 'callback_exception'
  | 'pg_lookup_failed'
  | 'bigquery_fallback_failed'
  | 'magic_link_expired'
  | 'magic_link_used'
  | 'magic_link_invalid'
  | 'success'
  | 'unknown'

export interface RecordAuthAttemptInput {
  provider: AuthAttemptProvider
  stage: AuthAttemptStage
  outcome: AuthAttemptOutcome
  reasonCode: AuthAttemptReasonCode
  userIdResolved?: string | null
  email?: string | null
  microsoftOid?: string | null
  microsoftTenantId?: string | null
  ip?: string | null
  userAgent?: string | null
  reasonDetail?: string | null
  requestId?: string | null
}

const hashSensitive = (value: string | null | undefined): string | null => {
  if (!value) return null

  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 32)
}

const redactEmail = (email: string | null | undefined): string | null => {
  if (!email) return null

  const [local, domain] = email.split('@')

  if (!domain) return null

  const localPrefix = (local || '').slice(0, 2)

  return `${localPrefix}***@${domain}`
}

const redactOid = (oid: string | null | undefined): string | null => {
  if (!oid) return null
  if (oid.length <= 8) return '***'

  return `${oid.slice(0, 4)}…${oid.slice(-4)}`
}

/**
 * Record an auth attempt. Best-effort — never throws.
 *
 * Side effects:
 *   1. INSERT into greenhouse_serving.auth_attempts (if PG reachable)
 *   2. captureWithDomain to Sentry when outcome is failure/degraded
 */
export const recordAuthAttempt = async (input: RecordAuthAttemptInput): Promise<void> => {
  const attemptId = crypto.randomUUID()
  const attemptedAt = new Date().toISOString()

  const emailRedacted = redactEmail(input.email)
  const oidRedacted = redactOid(input.microsoftOid)
  const ipHashed = hashSensitive(input.ip)
  const userAgentHash = hashSensitive(input.userAgent)
  const reasonRedacted = input.reasonDetail ? redactSensitive(input.reasonDetail) : null

  // Best-effort persistence
  try {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_serving.auth_attempts (
        attempt_id, attempted_at, provider, stage, outcome, reason_code,
        reason_redacted, user_id_resolved, email_redacted,
        microsoft_oid_redacted, microsoft_tenant_id, ip_hashed,
        user_agent_hash, request_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12,
        $13, $14
      )`,
      [
        attemptId,
        attemptedAt,
        input.provider,
        input.stage,
        input.outcome,
        input.reasonCode,
        reasonRedacted,
        input.userIdResolved ?? null,
        emailRedacted,
        oidRedacted,
        input.microsoftTenantId ?? null,
        ipHashed,
        userAgentHash,
        input.requestId ?? null
      ]
    )
  } catch (error) {
    // PG is degraded or table doesn't exist yet (pre-migration). Don't break
    // sign-in. Capture once with low severity and move on.
    if (shouldFallbackFromIdentityPostgres(error)) {
      // Expected during local development without PG. Silent.
    } else {
      console.warn('[auth-attempts] Failed to persist attempt; continuing sign-in.', {
        error: error instanceof Error ? error.message : 'unknown_error'
      })
    }
  }

  // Always emit Sentry on non-success outcomes
  if (input.outcome === 'failure' || input.outcome === 'degraded') {
    captureWithDomain(new Error(`auth.${input.provider}.${input.stage}.${input.reasonCode}`), 'identity', {
      level: input.outcome === 'failure' ? 'warning' : 'error',
      extra: {
        provider: input.provider,
        stage: input.stage,
        outcome: input.outcome,
        reasonCode: input.reasonCode,
        userIdResolved: input.userIdResolved ?? null,
        emailRedacted,
        oidRedacted,
        microsoftTenantId: input.microsoftTenantId ?? null,
        attemptId
      }
    })
  }
}

/** Wraps an async signIn/jwt callback so any throw becomes a recorded failure. */
export const withAuthAttemptTracking = async <T>({
  provider,
  stage,
  fn
}: {
  provider: AuthAttemptProvider
  stage: AuthAttemptStage
  fn: () => Promise<T>
}): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    await recordAuthAttempt({
      provider,
      stage,
      outcome: 'failure',
      reasonCode: 'callback_exception',
      reasonDetail: error instanceof Error ? error.message : 'unknown_error'
    })

    throw error
  }
}

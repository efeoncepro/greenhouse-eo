import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { decideAbuse, hashIdentifier, type AbuseDecision } from '@/lib/growth/public-submission/abuse-guard'

import { HIRING_INTAKE_EMAIL_SALT, HIRING_INTAKE_IP_SALT, resolveHiringIntakeLimits } from './config'

// TASK-1367 — Wrapper de anti-abuse del apply público. Cuenta las postulaciones ACEPTADAS de hoy por
// email_hash/ip_hash desde el ledger append-only + decide con el core compartido. Registra el evento
// (outcome) sin PII cruda. Mirror de src/lib/growth/ai-visibility/public-intake/abuse-guard.ts.

export type HiringIntakeOutcome = 'accepted' | 'rate_limited' | 'captcha_failed' | 'invalid' | 'spam_rejected' | 'not_open'

export const hashHiringEmail = (email: string | null | undefined): string | null => hashIdentifier(email, HIRING_INTAKE_EMAIL_SALT)
export const hashHiringIp = (ip: string | null | undefined): string | null => hashIdentifier(ip, HIRING_INTAKE_IP_SALT)

const countTodayAccepted = async (column: 'email_hash' | 'ip_hash', hash: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_hiring.hiring_application_intake_events
     WHERE ${column} = $1 AND outcome = 'accepted' AND created_at >= date_trunc('day', NOW())`,
    [hash],
  )


return Number(rows[0]?.n ?? 0)
}

/** Rate-limit: per-email → per-IP (sin costo LLM → budget desactivado). Devuelve la decisión pura. */
export const checkHiringIntakeAbuse = async (input: { emailHash: string | null; ipHash: string | null }): Promise<AbuseDecision> => {
  const limits = resolveHiringIntakeLimits()
  const emailCountToday = input.emailHash ? await countTodayAccepted('email_hash', input.emailHash) : 0
  const ipCountToday = input.ipHash ? await countTodayAccepted('ip_hash', input.ipHash) : null

  return decideAbuse({ emailCountToday, ipCountToday, spentUsdToday: 0, estimatedCostUsd: 0, limits })
}

/** Registra un evento de intake (append-only, solo hashes). Best-effort: nunca rompe el request. */
export const recordHiringIntakeEvent = async (input: {
  emailHash: string | null
  ipHash: string | null
  openingPublicId: string | null
  outcome: HiringIntakeOutcome
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_hiring.hiring_application_intake_events (email_hash, ip_hash, opening_public_id, outcome)
     VALUES ($1, $2, $3, $4)`,
    [input.emailHash, input.ipHash, input.openingPublicId, input.outcome],
  )
}

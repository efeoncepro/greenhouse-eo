import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Abuse/cost guard (EPIC-020 B).
 *
 * Rate-limit (per-IP + per-email) + presupuesto global diario (circuit breaker) sobre
 * `grader_intake_events` (window counters, identificadores HASHEADOS). El presupuesto
 * global es el guard REAL de costo: acota el gasto LLM absoluto sin importar los
 * límites per-clave. Excedido → `cost_blocked` (503 honesto), no falla silencioso.
 */

import { createHash } from 'crypto'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// Salt estático: el hash es para CONTAR ventanas, no seguridad (el email crudo vive
// en grader_leads con consent). Evita rainbow-tables triviales sobre el contador.
const HASH_SALT = 'gh-ai-visibility-intake-v1'

export const hashIdentifier = (value: string | null): string | null =>
  value == null || value.trim().length === 0
    ? null
    : createHash('sha256').update(`${HASH_SALT}:${value.trim().toLowerCase()}`).digest('hex')

export interface IntakeLimits {
  perEmailPerDay: number
  perIpPerDay: number
  globalDailyBudgetUsd: number
}

/** Estimación conservadora del costo de un run público (`light`) para el budget pre-check. */
export const ESTIMATED_PUBLIC_RUN_COST_USD = 0.1

export const resolveIntakeLimits = (env: NodeJS.ProcessEnv = process.env): IntakeLimits => ({
  perEmailPerDay: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_PER_EMAIL_PER_DAY) || 3,
  perIpPerDay: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_PER_IP_PER_DAY) || 10,
  globalDailyBudgetUsd: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_DAILY_BUDGET_USD) || 25
})

export type IntakeBlockOutcome = 'rate_limited' | 'cost_blocked'

export interface AbuseDecision {
  allowed: boolean
  outcome: IntakeBlockOutcome | null
}

const countAccepted = async (column: 'ip_hash' | 'email_hash', value: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_growth.grader_intake_events
      WHERE ${column} = $1 AND outcome = 'accepted' AND created_at > NOW() - INTERVAL '1 day'`,
    [value]
  )

  return Number(rows[0]?.n ?? 0)
}

/** Decide si el intake se acepta: per-email → per-IP → presupuesto global. PURO-ish (read-only). */
export const checkIntakeAbuse = async (input: {
  ipHash: string | null
  emailHash: string
  estimatedCostUsd: number
  limits: IntakeLimits
}): Promise<AbuseDecision> => {
  if ((await countAccepted('email_hash', input.emailHash)) >= input.limits.perEmailPerDay) {
    return { allowed: false, outcome: 'rate_limited' }
  }

  if (input.ipHash && (await countAccepted('ip_hash', input.ipHash)) >= input.limits.perIpPerDay) {
    return { allowed: false, outcome: 'rate_limited' }
  }

  const spentRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COALESCE(SUM(estimated_cost_usd), 0)::text AS total
       FROM greenhouse_growth.grader_intake_events
      WHERE outcome = 'accepted' AND created_at > NOW() - INTERVAL '1 day'`
  )

  const spent = Number(spentRows[0]?.total ?? 0)

  if (spent + input.estimatedCostUsd > input.limits.globalDailyBudgetUsd) {
    return { allowed: false, outcome: 'cost_blocked' }
  }

  return { allowed: true, outcome: null }
}

/** Registra un intento (append-only) para los window counters + observabilidad. */
export const recordIntakeEvent = async (input: {
  ipHash: string | null
  emailHash: string | null
  runId: string | null
  estimatedCostUsd: number | null
  outcome: string
}): Promise<void> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.grader_intake_events (ip_hash, email_hash, run_id, estimated_cost_usd, outcome)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.ipHash, input.emailHash, input.runId, input.estimatedCostUsd, input.outcome]
  )
}

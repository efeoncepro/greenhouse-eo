import 'server-only'

/**
 * TASK-1240 / TASK-1251 — Growth AI Visibility · Abuse/cost guard (EPIC-020 B).
 *
 * Rate-limit (per-IP + per-email) + presupuesto global diario (circuit breaker) sobre
 * `grader_intake_events` (window counters, identificadores HASHEADOS). El presupuesto
 * global es el guard REAL de costo: acota el gasto LLM absoluto sin importar los
 * límites per-clave. Excedido → `cost_blocked` (503 honesto), no falla silencioso.
 *
 * Convergencia (TASK-1251 Slice 1): la DECISIÓN (per-email → per-IP → presupuesto) ya
 * NO vive acá — la delega al core PURO compartido `decideAbuse`
 * (`@/lib/growth/public-submission`), el mismo que consume el motor Growth Forms
 * (TASK-1229). Este módulo queda como WRAPPER DE STORAGE: computa los conteos del día
 * desde `grader_intake_events` y llama al core. Así hay UN solo abuse-guard (no dos
 * implementaciones paralelas de la misma decisión de seguridad). El `hashIdentifier`
 * y los tipos (`IntakeLimits`/`AbuseDecision`/`IntakeBlockOutcome`) también vienen del
 * core — el hash queda BYTE-IDÉNTICO al previo (mismo salt) para no orfanar los window
 * counters ya escritos.
 */

import {
  type AbuseDecision,
  type IntakeBlockOutcome,
  type IntakeLimits,
  decideAbuse,
  hashIdentifier as hashIdentifierWithSalt,
} from '@/lib/growth/public-submission'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// Re-export de los tipos del core compartido: un solo nominal type para ambos consumers.
export type { AbuseDecision, IntakeBlockOutcome, IntakeLimits }

// Salt estático: el hash es para CONTAR ventanas, no seguridad (el email crudo vive
// en grader_leads con consent). Evita rainbow-tables triviales sobre el contador.
// PRESERVADO byte-idéntico al de TASK-1240: los `grader_intake_events` existentes se
// cuentan por este hash — cambiarlo orfanaría las ventanas de rate-limit en vuelo.
const HASH_SALT = 'gh-ai-visibility-intake-v1'

/**
 * Hash del identificador (email/IP) para contar ventanas. Wrapper del `hashIdentifier`
 * compartido con el salt del grader → byte-idéntico al algoritmo previo
 * (`sha256(salt:value.trim().toLowerCase())`).
 */
export const hashIdentifier = (value: string | null): string | null => hashIdentifierWithSalt(value, HASH_SALT)

/** Estimación conservadora del costo de un run público (`light`) para el budget pre-check. */
export const ESTIMATED_PUBLIC_RUN_COST_USD = 0.1

export const resolveIntakeLimits = (env: NodeJS.ProcessEnv = process.env): IntakeLimits => ({
  perEmailPerDay: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_PER_EMAIL_PER_DAY) || 3,
  perIpPerDay: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_PER_IP_PER_DAY) || 10,
  globalDailyBudgetUsd: Number(env.GROWTH_AI_VISIBILITY_PUBLIC_DAILY_BUDGET_USD) || 25,
})

const countAccepted = async (column: 'ip_hash' | 'email_hash', value: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_growth.grader_intake_events
      WHERE ${column} = $1 AND outcome = 'accepted' AND created_at > NOW() - INTERVAL '1 day'`,
    [value]
  )

  return Number(rows[0]?.n ?? 0)
}

const sumSpentToday = async (): Promise<number> => {
  const spentRows = await runGreenhousePostgresQuery<{ total: string }>(
    `SELECT COALESCE(SUM(estimated_cost_usd), 0)::text AS total
       FROM greenhouse_growth.grader_intake_events
      WHERE outcome = 'accepted' AND created_at > NOW() - INTERVAL '1 day'`
  )

  return Number(spentRows[0]?.total ?? 0)
}

/**
 * Decide si el intake se acepta. Computa los conteos del día (storage) y delega la
 * DECISIÓN al core PURO compartido (`decideAbuse`): per-email → per-IP → presupuesto
 * global. El SUM del presupuesto se computa lazy — sólo cuando no hubo rate-limit —
 * para no cargar la DB en el path ya bloqueado (preserva el short-circuit de TASK-1240).
 */
export const checkIntakeAbuse = async (input: {
  ipHash: string | null
  emailHash: string
  estimatedCostUsd: number
  limits: IntakeLimits
}): Promise<AbuseDecision> => {
  const emailCountToday = await countAccepted('email_hash', input.emailHash)
  const ipCountToday = input.ipHash ? await countAccepted('ip_hash', input.ipHash) : null

  // Short-circuit del SUM: si el rate-limit ya excede, el presupuesto es irrelevante.
  // `decideAbuse` sigue siendo la autoridad de la decisión; esto sólo evita el query.
  const rateLimited =
    emailCountToday >= input.limits.perEmailPerDay ||
    (ipCountToday != null && ipCountToday >= input.limits.perIpPerDay)

  const spentUsdToday = rateLimited ? 0 : await sumSpentToday()

  return decideAbuse({
    emailCountToday,
    ipCountToday,
    spentUsdToday,
    estimatedCostUsd: input.estimatedCostUsd,
    limits: input.limits,
  })
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

import 'server-only'

/**
 * TASK-1229 — Growth · Abuse-guard CORE compartido (public-submission).
 *
 * El núcleo de DECISIÓN (rate-limit per-email → per-IP → presupuesto global) es PURO:
 * recibe los conteos ya computados y decide. Cada consumer (Growth Forms, AI Visibility
 * Grader) computa sus conteos desde SU tabla (`form_submission` / `grader_intake_events`)
 * y llama a `decideAbuse`. Así el port es uno solo (no hay abuse-guard paralelo); la
 * convergencia TASK-1251 mueve el grader a consumir este core (su `checkIntakeAbuse`
 * queda como wrapper de storage).
 *
 * `hashIdentifier` es para CONTAR ventanas, no seguridad (el valor crudo vive con
 * consent en su tabla). El salt evita rainbow-tables triviales sobre el contador.
 */
import { createHash } from 'crypto'

export const hashIdentifier = (value: string | null | undefined, salt: string): string | null =>
  value == null || value.trim().length === 0
    ? null
    : createHash('sha256').update(`${salt}:${value.trim().toLowerCase()}`).digest('hex')

export interface IntakeLimits {
  perEmailPerDay: number
  perIpPerDay: number
  globalDailyBudgetUsd: number
}

export type IntakeBlockOutcome = 'rate_limited' | 'cost_blocked'

export interface AbuseDecision {
  allowed: boolean
  outcome: IntakeBlockOutcome | null
}

/**
 * Decisión PURA de abuse/cost: per-email → per-IP → presupuesto global. Recibe los
 * conteos del día ya computados por el consumer. `spentUsd`/`estimatedCostUsd` y el
 * budget sólo aplican a consumers con costo (LLM); para forms sin costo, pasar 0 +
 * budget Infinity desactiva el circuit breaker de costo y deja solo el rate-limit.
 */
export const decideAbuse = (input: {
  emailCountToday: number
  ipCountToday: number | null
  spentUsdToday: number
  estimatedCostUsd: number
  limits: IntakeLimits
}): AbuseDecision => {
  if (input.emailCountToday >= input.limits.perEmailPerDay) {
    return { allowed: false, outcome: 'rate_limited' }
  }

  if (input.ipCountToday != null && input.ipCountToday >= input.limits.perIpPerDay) {
    return { allowed: false, outcome: 'rate_limited' }
  }

  if (input.spentUsdToday + input.estimatedCostUsd > input.limits.globalDailyBudgetUsd) {
    return { allowed: false, outcome: 'cost_blocked' }
  }

  return { allowed: true, outcome: null }
}

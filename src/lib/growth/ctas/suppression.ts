/**
 * TASK-1428 — Growth CTA engine: decisión PURA de suppression/frequency capping
 * (arch §11; task §Visitor-experience policy).
 *
 * Recibe la policy persistida + el snapshot de visitor state ya cargado y decide.
 * Sin I/O: el fetch del state vive en `visitor-state.ts`; la integración (shadow vs
 * enforcement, claim atómico de impresión) en `readers.ts`. El browser NUNCA ve esta
 * lógica ni las ventanas — solo el outcome mínimo (regla dura §20).
 *
 * Orden de evaluación (primera causa gana; espejo del pipeline §11
 * eligibility → suppression → mutual exclusion → priority):
 *   policy_invalid → dismissed → already_converted → consent_or_identity_limited
 *   (solo interruptivos sin sujeto) → frequency per-CTA → frequency global.
 */

import {
  type CtaSuppressionDecision,
  type CtaSuppressionPolicy,
  ctaSuppressionPolicySchema,
} from './contracts'

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/**
 * Snapshot mínimo del estado de un sujeto para UN candidato (merge cross-subject:
 * el caller combina filas visitor+session tomando la evidencia más restrictiva).
 */
export interface CtaSuppressionStateSnapshot {
  lastDismissedAt: Date | null
  convertedAt: Date | null
  windowStartedAt: Date | null
  impressionsInWindow: number
}

export interface CtaGlobalWindowSnapshot {
  windowStartedAt: Date | null
  impressionsInWindow: number
}

export interface EvaluateCtaSuppressionInput {
  /** `suppression_policy_json` de la versión ({} = defaults conservadores). */
  policyJson: unknown
  /** Placement interruptivo (frequency caps solo aplican a interruptivos). */
  interruptive: boolean
  /** ¿Existe al menos un sujeto (visitor consent-gated o session)? */
  hasSubject: boolean
  /** Estado per-CTA ya mergeado cross-subject; null = sin filas. */
  state: CtaSuppressionStateSnapshot | null
  /** Ventana global interruptiva del sujeto (fila `cta_id IS NULL`); null = sin filas. */
  globalWindow: CtaGlobalWindowSnapshot | null
  /** Cap engine-level de interruptivos por sujeto/día (cross-CTA). */
  globalInterruptiveCapPerDay: number
  now: Date
}

/** Parse de la policy con defaults; `null` = malformada (fail-closed en el caller). */
export const parseSuppressionPolicy = (policyJson: unknown): CtaSuppressionPolicy | null => {
  const parsed = ctaSuppressionPolicySchema.safeParse(policyJson ?? {})

  return parsed.success ? parsed.data : null
}

const isWithinWindow = (start: Date | null, windowMs: number, now: Date): boolean =>
  start !== null && now.getTime() - start.getTime() < windowMs

export const evaluateCtaSuppression = (input: EvaluateCtaSuppressionInput): CtaSuppressionDecision => {
  const policy = parseSuppressionPolicy(input.policyJson)

  if (!policy) return { outcome: 'suppressed', reason: 'policy_invalid' }

  const { state, now } = input

  // Dismiss explícito dentro del cooldown (aplica a TODO placement: honra la decisión del visitante).
  if (
    policy.dismissCooldownDays > 0 &&
    state !== null &&
    isWithinWindow(state.lastDismissedAt, policy.dismissCooldownDays * DAY_MS, now)
  ) {
    return { outcome: 'suppressed', reason: 'dismissed' }
  }

  // Conversión server-verificada (jamás por heurística browser — el write path lo garantiza).
  if (policy.suppressAfterConversion && state?.convertedAt) {
    return { outcome: 'suppressed', reason: 'already_converted' }
  }

  if (!input.interruptive) return { outcome: 'eligible', reason: null }

  // Fallback conservador (task §Detailed Spec): sin sujeto no hay base para ventanas ⇒
  // un placement interruptivo NO se expone (la ausencia de identity no autoriza exposición ilimitada).
  if (!input.hasSubject) {
    return { outcome: 'suppressed', reason: 'consent_or_identity_limited' }
  }

  // Frequency cap per-CTA (ventana rodante de la policy).
  if (
    state !== null &&
    isWithinWindow(state.windowStartedAt, policy.windowHours * HOUR_MS, now) &&
    state.impressionsInWindow >= policy.maxImpressionsPerWindow
  ) {
    return { outcome: 'capped', reason: 'frequency_capped' }
  }

  // Cap global engine-level de interruptivos por sujeto/día (cross-CTA).
  if (
    input.globalWindow !== null &&
    isWithinWindow(input.globalWindow.windowStartedAt, DAY_MS, now) &&
    input.globalWindow.impressionsInWindow >= input.globalInterruptiveCapPerDay
  ) {
    return { outcome: 'capped', reason: 'frequency_capped' }
  }

  return { outcome: 'eligible', reason: null }
}

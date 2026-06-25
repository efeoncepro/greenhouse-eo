import 'server-only'

/**
 * TASK-1240 — Growth AI Visibility · Public run intake command (EPIC-020 B, server-only).
 *
 * `createPublicGraderRun` es el write público gobernado: valida + verifica captcha +
 * aplica el abuse/cost guard + persiste el lead (con consent) + ENCOLA un run
 * `public_diagnostic`+`light` (worker async TASK-1234, NO inline). El email (PII)
 * vive SOLO en el lead, NUNCA viaja a `enqueueGraderDiagnostic` (que sólo recibe
 * marca/categoría/mercado). Default gateado por flag (`isPublicIntakeEnabled`).
 *
 * NO lanza para bloqueos esperados (disabled/invalid/captcha/rate/cost): devuelve un
 * `PublicIntakeResult` que el endpoint mapea a un status sanitizado. Sólo lanza ante
 * un fallo inesperado (→ 502).
 */

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { captureWithDomain } from '@/lib/observability/capture'

import { enqueueGraderDiagnostic } from '../commands'
import { isPublicIntakeEnabled } from '../flags'
import {
  ESTIMATED_PUBLIC_RUN_COST_USD,
  checkIntakeAbuse,
  hashIdentifier,
  recordIntakeEvent,
  resolveIntakeLimits
} from './abuse-guard'
import { turnstileCaptchaVerifier, type CaptchaVerifier } from './captcha'
import { type PublicGraderRunInput, type PublicIntakeOutcome, type PublicIntakeResult } from './contracts'
import { insertGraderLead } from './store'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isValidInput = (input: PublicGraderRunInput): boolean =>
  input.consent === true &&
  typeof input.email === 'string' &&
  EMAIL_RE.test(input.email.trim()) &&
  [input.brandName, input.market, input.locale, input.category].every(
    value => typeof value === 'string' && value.trim().length > 0
  )

const reasonFor = (outcome: PublicIntakeOutcome): string =>
  GH_GROWTH_AI_VISIBILITY.public_intake[outcome as keyof typeof GH_GROWTH_AI_VISIBILITY.public_intake]

const result = (outcome: PublicIntakeOutcome, runPublicId: string | null): PublicIntakeResult => ({
  outcome,
  runPublicId,
  reason: reasonFor(outcome)
})

export interface PublicIntakeContext {
  ip: string | null
  captchaToken: string | null
  idempotencyKey?: string | null
  /** Verifier inyectable (tests). Default = Turnstile real (bypass dev / fail-closed prod). */
  verifier?: CaptchaVerifier
}

export const createPublicGraderRun = async (
  input: PublicGraderRunInput,
  context: PublicIntakeContext
): Promise<PublicIntakeResult> => {
  if (!isPublicIntakeEnabled()) {
    return result('disabled', null)
  }

  if (!isValidInput(input)) {
    return result('invalid', null)
  }

  const ipHash = hashIdentifier(context.ip)
  const emailHash = hashIdentifier(input.email)

  if (!emailHash) {
    return result('invalid', null)
  }

  // 1. Captcha (humano).
  const verifier = context.verifier ?? turnstileCaptchaVerifier()
  const captcha = await verifier.verify(context.captchaToken, context.ip)

  if (!captcha.ok) {
    await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: 'captcha_failed' }).catch(
      () => {}
    )

    return result('captcha_failed', null)
  }

  // 2. Abuse/cost guard (rate-limit per-IP/email + presupuesto global).
  const limits = resolveIntakeLimits()
  const decision = await checkIntakeAbuse({ ipHash, emailHash, estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD, limits })

  if (!decision.allowed && decision.outcome) {
    await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: decision.outcome }).catch(
      () => {}
    )

    return result(decision.outcome, null)
  }

  // 3. Encolar el run (worker async, NO inline). EMAIL NUNCA viaja acá.
  try {
    const enqueued = await enqueueGraderDiagnostic({
      brandName: input.brandName,
      websiteUrl: input.websiteUrl,
      market: input.market,
      locale: input.locale,
      category: input.category,
      competitorsDeclared: input.competitorsDeclared,
      mode: 'light',
      runKind: 'public_diagnostic',
      idempotencyKey: context.idempotencyKey ?? null
    })

    // Doble-submit idempotente: mismo run → no doble lead ni doble costo.
    if (enqueued.idempotentHit) {
      return result('accepted', enqueued.run.publicId)
    }

    await insertGraderLead({
      email: input.email.trim(),
      consent: true,
      brandName: input.brandName,
      websiteUrl: input.websiteUrl,
      market: input.market,
      category: input.category,
      industry: input.industry,
      persona: input.persona,
      companySize: input.companySize,
      mainChallenge: input.mainChallenge,
      competitorsDeclared: input.competitorsDeclared,
      runId: enqueued.run.runId,
      profileId: enqueued.run.profileId,
      ipHash
    })

    await recordIntakeEvent({
      ipHash,
      emailHash,
      runId: enqueued.run.runId,
      estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD,
      outcome: 'accepted'
    })

    return result('accepted', enqueued.run.publicId)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_intake' } })

    throw error
  }
}

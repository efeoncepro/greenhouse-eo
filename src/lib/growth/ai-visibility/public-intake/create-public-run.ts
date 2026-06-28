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
import { evaluateFormEmailGate } from '@/lib/growth/forms/email-verification'
import { isFormsEmailVerificationEnabled } from '@/lib/growth/forms/flags'
import { getPublishedVersionBySlug } from '@/lib/growth/forms/store'
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
import {
  isValidPublicGraderInput,
  type PublicGraderRunInput,
  type PublicIntakeOutcome,
  type PublicIntakeResult,
} from './contracts'
import { insertGraderLead } from './store'

const reasonFor = (outcome: PublicIntakeOutcome): string =>
  GH_GROWTH_AI_VISIBILITY.public_intake[outcome as keyof typeof GH_GROWTH_AI_VISIBILITY.public_intake]

const result = (
  outcome: PublicIntakeOutcome,
  runPublicId: string | null,
  pollToken: string | null = null
): PublicIntakeResult => ({
  outcome,
  runPublicId,
  pollToken,
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

  if (!isValidPublicGraderInput(input)) {
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

  // 2.5 Gate de correo corporativo (TASK-1254/1263), ANTES de encolar → un correo no
  //     corporativo/temporal NO encola run ni crea lead (ahorra costo AI). La política sale de
  //     la versión publicada del grader-form ('ai-visibility-grader' slug). La resolución de la
  //     versión (1 query) queda detrás del flag para NO pegarle a la DB en cada submit con el
  //     gate apagado (default prod hasta TASK-1246). `emailPolicy.mode='off'` → no opina. El
  //     rechazo del path a-medida se observa por su log nativo `grader_intake_events` (outcome
  //     'email_not_corporate'); el signal `email_rejection_rate` (form_submission) cubre forms-engine.
  if (isFormsEmailVerificationEnabled()) {
    const publishedVersion = await getPublishedVersionBySlug('ai-visibility-grader')
    const emailGate = await evaluateFormEmailGate(publishedVersion?.validation_schema_json, { email: input.email.trim() })

    if (emailGate.gated && emailGate.rejected) {
      await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: 'email_not_corporate' }).catch(
        () => {}
      )

      return result('email_not_corporate', null)
    }
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
      return result('accepted', enqueued.run.publicId, enqueued.run.pollToken)
    }

    await insertGraderLead({
      email: input.email.trim(),
      consent: true,
      // TASK-1257 — nombre/apellido (PII) al lead; NUNCA a `enqueueGraderDiagnostic`.
      firstName: input.firstName,
      lastName: input.lastName,
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

    return result('accepted', enqueued.run.publicId, enqueued.run.pollToken)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_intake' } })

    throw error
  }
}

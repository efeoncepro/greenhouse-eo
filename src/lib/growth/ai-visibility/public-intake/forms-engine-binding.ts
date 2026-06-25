import 'server-only'

/**
 * TASK-1251 — Convergencia del intake del grader sobre el motor Growth Forms.
 *
 * `createPublicGraderRunViaFormsEngine` es la FACHADA del path convergente: hace los
 * MISMOS pre-checks que el path a-medida (validación + captcha + abuse/cost guard del
 * grader sobre `grader_intake_events` — el cost ceiling se preserva) pero, al aceptar,
 * NO encola el run inline: persiste un SUBMISSION gobernado del motor
 * (`form_submission` + consent_snapshot + outbox `growth.forms.submission_accepted`,
 * todo en UNA tx) y devuelve el `submission_id` como handle de poll. Un reactive
 * consumer (`growth_grader_run_from_submission`) encola el run + materializa el lead.
 *
 * Boundary atómico (arch + spec): la tx síncrona escribe SÓLO {submission + consent +
 * outbox}; el enqueue del run + el lead (PII) son post-submit reactivos idempotentes,
 * NO inline (HubSpot/email/LLM caídos no abortan la aceptación del lead).
 *
 * El EMAIL (PII) viaja al `normalized_fields_json` del submission (igual que cualquier
 * form del motor; es el payload entregable que vive en PG con consent) — NUNCA a los
 * providers (el reactive consumer separa marca/categoría/mercado del email al encolar).
 */

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'
import { dedupeFingerprint } from '@/lib/growth/forms/hash'
import { findRecentDuplicate, persistAcceptedSubmission } from '@/lib/growth/forms/store'
import { captureWithDomain } from '@/lib/observability/capture'

import { isPublicIntakeEnabled } from '../flags'
import {
  ESTIMATED_PUBLIC_RUN_COST_USD,
  checkIntakeAbuse,
  hashIdentifier,
  recordIntakeEvent,
  resolveIntakeLimits,
} from './abuse-guard'
import { turnstileCaptchaVerifier } from './captcha'
import {
  isValidPublicGraderInput,
  type PublicGraderRunInput,
  type PublicIntakeOutcome,
  type PublicIntakeResult,
} from './contracts'
import { type PublicIntakeContext } from './create-public-run'

// IDs pineados por la migración task-1251 (seed del grader como form gobernado).
export const GRADER_FORM_ID = 'fdef-ai-visibility-grader'
export const GRADER_FORM_VERSION_ID = 'fver-ai-visibility-grader-v1'
export const GRADER_SURFACE_ID = 'fhsf-ai-visibility-grader'
export const GRADER_CONSENT_POLICY_VERSION = 'ai-visibility-grader-consent-v1'

const reasonFor = (outcome: PublicIntakeOutcome): string =>
  GH_GROWTH_AI_VISIBILITY.public_intake[outcome as keyof typeof GH_GROWTH_AI_VISIBILITY.public_intake]

const result = (
  outcome: PublicIntakeOutcome,
  submissionId: string | null,
): PublicIntakeResult => ({
  outcome,
  runPublicId: null,
  submissionId,
  reason: reasonFor(outcome),
})

/**
 * Construye el payload entregable del submission desde el input del grader. El email
 * va acá (vive en PG con consent); el reactive consumer lo separa al encolar el run.
 */
const toNormalizedFields = (input: PublicGraderRunInput): Record<string, unknown> => ({
  brandName: input.brandName.trim(),
  websiteUrl: input.websiteUrl,
  market: input.market.trim(),
  locale: input.locale.trim(),
  category: input.category.trim(),
  competitorsDeclared: input.competitorsDeclared,
  email: input.email.trim(),
  industry: input.industry,
  persona: input.persona,
  companySize: input.companySize,
  mainChallenge: input.mainChallenge,
})

export const createPublicGraderRunViaFormsEngine = async (
  input: PublicGraderRunInput,
  context: PublicIntakeContext,
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

  // 1. Captcha (humano) — mismo port compartido que el path a-medida.
  const verifier = context.verifier ?? turnstileCaptchaVerifier()
  const captcha = await verifier.verify(context.captchaToken, context.ip)

  if (!captcha.ok) {
    await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: 'captcha_failed' }).catch(
      () => {},
    )

    return result('captcha_failed', null)
  }

  // 2. Abuse/cost guard del grader (rate-limit + presupuesto global) — preservado.
  const limits = resolveIntakeLimits()
  const decision = await checkIntakeAbuse({ ipHash, emailHash, estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD, limits })

  if (!decision.allowed && decision.outcome) {
    await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: decision.outcome }).catch(
      () => {},
    )

    return result(decision.outcome, null)
  }

  try {
    // 3. Dedupe de doble-submit (ventana 60 min) — espeja `submitForm` del motor y el
    //    `idempotentHit` del path a-medida. NO crea segundo submission/run/lead/costo.
    const fingerprint = dedupeFingerprint(GRADER_FORM_ID, [input.email.trim(), context.idempotencyKey ?? ''])
    const duplicate = await findRecentDuplicate(GRADER_FORM_ID, fingerprint)

    if (duplicate) {
      return result('accepted', duplicate.submission_id)
    }

    // 4. Persistir submission gobernado del motor (submission + consent + outbox, in-tx).
    const submission = await persistAcceptedSubmission({
      formId: GRADER_FORM_ID,
      formVersionId: GRADER_FORM_VERSION_ID,
      surfaceId: GRADER_SURFACE_ID,
      pageUri: null,
      pageName: null,
      leadEmailHash: emailHash,
      normalizedFields: toNormalizedFields(input),
      dedupeFingerprint: fingerprint,
      requestId: context.idempotencyKey ?? null,
      ipHash,
      consent: {
        consentPolicyVersion: GRADER_CONSENT_POLICY_VERSION,
        checkboxes: [],
      },
    })

    // 5. Cost accounting del grader (runId null: el run lo crea el reactive consumer).
    await recordIntakeEvent({
      ipHash,
      emailHash,
      runId: null,
      estimatedCostUsd: ESTIMATED_PUBLIC_RUN_COST_USD,
      outcome: 'accepted',
    })

    return result('accepted', submission.submission_id)
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_intake_forms_engine' } })

    throw error
  }
}

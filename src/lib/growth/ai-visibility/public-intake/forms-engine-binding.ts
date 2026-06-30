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
import { evaluateFormEmailGate } from '@/lib/growth/forms/email-verification'
import { dedupeFingerprint } from '@/lib/growth/forms/hash'
import {
  findRecentDuplicate,
  getPublishedVersionBySlug,
  insertRejectedSubmission,
  persistAcceptedSubmission,
} from '@/lib/growth/forms/store'
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
export const GRADER_FORM_SLUG = 'ai-visibility-grader'
// TASK-1257 — v2: agrega firstName/lastName al field_schema. La v1 quedó deprecada (migración Slice 2).
// TASK-1263 — fallback: la fachada resuelve la versión publicada vigente por slug en runtime
// (espeja `submitForm`), así el `emailPolicy` + el FK anchor siguen a la versión publicada más
// alta sin re-pinear un constante por cada publish. Este id es sólo el default defensivo si la
// resolución por slug falla (no debería: el grader está sembrado publicado).
export const GRADER_FORM_VERSION_ID = 'fver-ai-visibility-grader-v2'
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
  // TASK-1257 — nombre/apellido (PII) viajan al submission junto al email; el reactive consumer
  // los pasa al lead, NUNCA al enqueue del run (que sólo recibe marca/categoría/mercado).
  firstName: input.firstName,
  lastName: input.lastName,
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

  // 3. Resolución de la versión publicada vigente (espeja `submitForm`): el FK anchor del
  //    submission Y la `emailPolicy` del gate salen de la versión publicada más alta del slug,
  //    no de un constante re-pineado. Default defensivo al constante si la resolución falla.
  const version = await getPublishedVersionBySlug(GRADER_FORM_SLUG)
  const formVersionId = version?.form_version_id ?? GRADER_FORM_VERSION_ID

  // 4. Gate de correo corporativo (TASK-1254/1263), ANTES de aceptar/encolar → un correo no
  //    corporativo/temporal NO persiste submission, NO encola run, NO dispara handoff (ahorra
  //    costo AI). Default OFF (flag) ó `emailPolicy.mode='off'` → no opina. El email es PII:
  //    el rechazo persiste sólo reason_class (sin email) para el signal `email_rejection_rate`.
  const emailGate = await evaluateFormEmailGate(version?.validation_schema_json, { email: input.email.trim() })

  if (emailGate.gated && emailGate.rejected) {
    await insertRejectedSubmission({
      formId: GRADER_FORM_ID,
      formVersionId,
      surfaceId: GRADER_SURFACE_ID,
      reasonClass: emailGate.rejectionClass ?? 'email_not_corporate',
      requestId: context.idempotencyKey ?? null,
    }).catch(error => captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_intake_forms_engine' } }))

    await recordIntakeEvent({ ipHash, emailHash, runId: null, estimatedCostUsd: null, outcome: 'email_not_corporate' }).catch(
      () => {},
    )

    return result('email_not_corporate', null)
  }

  try {
    // 5. Dedupe de doble-submit (ventana 60 min) — espeja `submitForm` del motor y el
    //    `idempotentHit` del path a-medida. NO crea segundo submission/run/lead/costo.
    const fingerprint = dedupeFingerprint(GRADER_FORM_ID, [input.email.trim(), context.idempotencyKey ?? ''])
    const duplicate = await findRecentDuplicate(GRADER_FORM_ID, fingerprint)

    if (duplicate) {
      return result('accepted', duplicate.submission_id)
    }

    // 6. Persistir submission gobernado del motor (submission + consent + outbox, in-tx). La
    //    calidad del email (verified/suspect + corporate/personal/disposable) viaja al submission
    //    como en `submitForm` (etiqueta el lead aunque la política no sea block_field).
    const submission = await persistAcceptedSubmission({
      formId: GRADER_FORM_ID,
      formVersionId,
      surfaceId: GRADER_SURFACE_ID,
      pageUri: null,
      pageName: null,
      leadEmailHash: emailHash,
      normalizedFields: toNormalizedFields(input),
      dedupeFingerprint: fingerprint,
      requestId: context.idempotencyKey ?? null,
      ipHash,
      emailQuality: emailGate.gated ? emailGate.quality : null,
      emailDomainClass: emailGate.gated ? emailGate.domainClass : null,
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

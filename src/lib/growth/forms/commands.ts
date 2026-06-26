/**
 * TASK-1229 — Growth Forms engine: commands canónicos (write path gobernado).
 *
 * Full API Parity: cada acción de negocio vive acá como command reutilizable; la
 * UI/admin/Nexa/MCP/CLI son clientes, no reimplementan lógica. La autorización
 * (capability) se aplica en la capa API; estos commands son dominio puro.
 */
import 'server-only'

import { z } from 'zod'

import { captureWithDomain } from '@/lib/observability/capture'

import {
  type FieldDefinition,
  type FormKind,
  type PublicSubmitInput,
  type PublicSubmitResult,
  type RiskProfile,
  fieldDefinitionSchema,
  publicSubmitInputSchema,
  resolveEmailPolicy,
} from './contracts'
import { dedupeFingerprint } from './hash'
import {
  isFormsEmailVerificationEnabled,
  isFormsPiiEncryptionEnabled,
  isFormsServerValidationEnabled,
  resolveFormsAbuseLimits,
} from './flags'
import { splitAndEncryptPii } from './pii/encryption'
import type { EncryptedFieldEnvelope } from './pii/types'
import { validateFieldValue } from './validators/core'
import { verifyEmail } from './email-verification'
import { compileFormVersion } from './policy-compiler'
import {
  type CaptchaVerifier,
  decideAbuse,
  hashIdentifier,
  turnstileCaptchaVerifier,
} from '@/lib/growth/public-submission'
import {
  type FormDestinationRow,
  type FormVersionRow,
  archiveFormDefinition,
  countAcceptedSubmissionsByHash,
  findRecentDuplicate,
  getFormDefinitionById,
  getFormDefinitionBySlug,
  getFormVersionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  insertDestination,
  insertFormDefinition,
  insertFormVersion,
  insertHostSurface,
  insertRejectedSubmission,
  listDestinationsForVersion,
  persistAcceptedSubmission,
  setDestinationEnabled,
  setHostSurfaceStatus,
  updateVersionStatus,
} from './store'

// ─── Authoring ────────────────────────────────────────────────────────────────

export interface AuthorDraftFormInput {
  slug: string
  name: string
  formKind: FormKind
  purpose: string
  riskProfile?: RiskProfile
  locale?: string
  fieldSchema: unknown
  /** TASK-1254 — política de validación por form (incluye emailPolicy del gate corporativo). */
  validationSchema?: unknown
  uiPolicy?: unknown
  successBehavior?: unknown
  consentPolicyVersion?: string
  dataClassification?: unknown
  destinationPolicy?: unknown
  analyticsPolicy?: unknown
  retentionPolicy?: unknown
  commercialHandoffPolicy?: unknown
  createdBy?: string
}

/** Crea (o reusa) la definición + una nueva draft version. */
export const authorDraftForm = async (input: AuthorDraftFormInput): Promise<{ formId: string; formVersionId: string }> => {
  const existing = await getFormDefinitionBySlug(input.slug)

  const definition =
    existing ??
    (await insertFormDefinition({
      slug: input.slug,
      name: input.name,
      formKind: input.formKind,
      purpose: input.purpose,
      riskProfile: input.riskProfile ?? 'low',
      defaultLocale: input.locale,
      createdBy: input.createdBy ?? null,
    }))

  const version = await insertFormVersion({
    formId: definition.form_id,
    locale: input.locale ?? definition.default_locale,
    fieldSchema: input.fieldSchema,
    validationSchema: input.validationSchema,
    uiPolicy: input.uiPolicy,
    successBehavior: input.successBehavior,
    consentPolicyVersion: input.consentPolicyVersion ?? null,
    dataClassification: input.dataClassification,
    destinationPolicy: input.destinationPolicy,
    analyticsPolicy: input.analyticsPolicy,
    retentionPolicy: input.retentionPolicy,
    commercialHandoffPolicy: input.commercialHandoffPolicy,
  })

  return { formId: definition.form_id, formVersionId: version.form_version_id }
}

// ─── Review / lifecycle ───────────────────────────────────────────────────────

const loadVersionContext = async (
  formVersionId: string,
): Promise<{ definition: Awaited<ReturnType<typeof getFormDefinitionBySlug>>; version: FormVersionRow; destinations: FormDestinationRow[] } | null> => {
  const version = await getFormVersionById(formVersionId)

  if (!version) return null
  const definition = await getFormDefinitionById(version.form_id)

  if (!definition) return null
  const destinations = await listDestinationsForVersion(formVersionId)

  
return { definition, version, destinations }
}

export interface ReviewResult {
  ok: boolean
  blockingReasons: string[]
  warnings: { code: string; dimension: string; message: string; blocking: boolean }[]
}

/** Corre el compiler (sin publicar) y mueve draft -> review. */
export const reviewForm = async (formVersionId: string): Promise<ReviewResult> => {
  const ctx = await loadVersionContext(formVersionId)

  if (!ctx?.definition) return { ok: false, blockingReasons: ['form_version no existe'], warnings: [] }
  const result = compileFormVersion(ctx.definition, ctx.version, ctx.destinations, { forPublication: false })

  if (ctx.version.status === 'draft') await updateVersionStatus(formVersionId, 'review')
  
return { ok: result.ok, blockingReasons: result.blockingReasons, warnings: result.warnings }
}

/** Publica la versión si pasa el gate del compiler; si no, devuelve las razones. */
export const publishForm = async (formVersionId: string): Promise<ReviewResult> => {
  const ctx = await loadVersionContext(formVersionId)

  if (!ctx?.definition) return { ok: false, blockingReasons: ['form_version no existe'], warnings: [] }
  if (ctx.version.status === 'published') return { ok: true, blockingReasons: [], warnings: [] }

  const result = compileFormVersion(ctx.definition, ctx.version, ctx.destinations, { forPublication: true })

  if (!result.ok) return { ok: false, blockingReasons: result.blockingReasons, warnings: result.warnings }

  await updateVersionStatus(formVersionId, 'published', { setPublishedAt: true })
  
return { ok: true, blockingReasons: [], warnings: result.warnings }
}

export const deprecateForm = async (formVersionId: string): Promise<void> => {
  await updateVersionStatus(formVersionId, 'deprecated')
}

export const archiveForm = async (formVersionId: string, formId: string): Promise<void> => {
  await updateVersionStatus(formVersionId, 'archived')
  await archiveFormDefinition(formId)
}

// ─── Destinations / surfaces ──────────────────────────────────────────────────

export const addDestination = insertDestination
export const setDestinationEnabledCommand = setDestinationEnabled
export const createHostSurface = insertHostSurface
export const setHostSurfaceStatusCommand = setHostSurfaceStatus

// ─── Public submit (el command más cargado) ──────────────────────────────────

const originAllowed = (allowlist: unknown, origin: string | null): boolean => {
  if (!origin) return false
  if (!Array.isArray(allowlist) || allowlist.length === 0) return false
  
return allowlist.includes(origin)
}

const slugAllowed = (allowed: unknown, slug: string): boolean =>
  Array.isArray(allowed) && (allowed.length === 0 || allowed.includes(slug))

const FORMS_EMAIL_SALT = 'gh-forms-email-v1'
const FORMS_IP_SALT = 'gh-forms-ip-v1'

export interface SubmitContext {
  origin: string | null
  ip?: string | null
  captchaToken?: string | null
  requestId?: string | null
  /** Inyectable para tests; default = Turnstile (bypass dev / fail-closed prod). */
  verifier?: CaptchaVerifier
}

/**
 * Procesa un submit público: resuelve la versión publicada por slug, autoriza la
 * surface (origin + slug allowlist), valida honeypot/consent/dedupe, normaliza y
 * persiste la submission ACEPTADA + consent + outbox event (in-tx). La entrega al
 * destino es async (dispatcher), NUNCA inline. Devuelve outcome (no throws para
 * bloqueos esperados; espeja `createPublicGraderRun`).
 */
export type RevalidateOutcome =
  | { ok: true; normalizedFields: Record<string, unknown> }
  | { ok: false; fieldKey: string; reasonCode: string }

/**
 * TASK-1253 — Re-validación + normalización server-side (autoridad). Valida los campos
 * PRESENTES no-vacíos con el registry canónico (MISMO core que el renderer → paridad),
 * normaliza, y rechaza al primer campo con formato inválido. El required condicional y
 * el consent se resuelven en sus propios gates; este paso cierra el "POST directo mete
 * basura". NUNCA incluir el valor crudo en logs/errores.
 */
export const revalidateAndNormalizeFields = (
  fieldDefs: FieldDefinition[],
  rawFields: Record<string, unknown>,
): RevalidateOutcome => {
  const normalized: Record<string, unknown> = { ...rawFields }

  for (const field of fieldDefs) {
    if (field.type === 'hidden' || field.type === 'consent') continue

    const raw = rawFields[field.key]

    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) continue

    const result = validateFieldValue(field, raw)

    if (!result.valid && result.reasonCode) {
      return { ok: false, fieldKey: field.key, reasonCode: result.reasonCode }
    }

    normalized[field.key] = result.normalized
  }

  return { ok: true, normalizedFields: normalized }
}

export const submitForm = async (rawInput: PublicSubmitInput, context: SubmitContext): Promise<PublicSubmitResult> => {
  const parsed = publicSubmitInputSchema.safeParse(rawInput)

  if (!parsed.success) return { outcome: 'invalid', reason: 'payload no válido' }
  const input = parsed.data

  // Honeypot: si viene con valor, se rechaza silenciosamente como spam.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { outcome: 'spam_rejected', reason: 'honeypot' }
  }

  // Captcha (port compartido Turnstile: bypass dev / fail-closed prod).
  const verifier = context.verifier ?? turnstileCaptchaVerifier()
  const captcha = await verifier.verify(context.captchaToken ?? null, context.ip ?? null)

  if (!captcha.ok) return { outcome: 'captcha_failed', reason: captcha.reason }

  const version = await getPublishedVersionBySlug(input.formSlug)

  if (!version) return { outcome: 'form_not_published', reason: 'sin versión publicada para el slug' }

  const definition = await getFormDefinitionById(version.form_id)

  if (!definition || definition.status !== 'active') {
    return { outcome: 'form_not_published', reason: 'definición inactiva' }
  }

  // Autorización de surface (origin/slug), NO basta el slug (Arch §7.2/§19.4).
  let surfaceId: string | null = null

  if (input.surfaceId) {
    const surface = await getHostSurfaceById(input.surfaceId)

    if (!surface || surface.status !== 'active') return { outcome: 'surface_unauthorized', reason: 'surface inválida' }

    if (!slugAllowed(surface.allowed_form_slugs_json, input.formSlug)) {
      return { outcome: 'surface_unauthorized', reason: 'slug no permitido en la surface' }
    }

    if (!originAllowed(surface.origin_allowlist_json, context.origin)) {
      return { outcome: 'surface_unauthorized', reason: 'origin no permitido' }
    }

    surfaceId = surface.surface_id
  }

  // Consent gate (salvo survey).
  const consentRequired = definition.form_kind !== 'survey'

  if (consentRequired && !input.consent) return { outcome: 'consent_required', reason: 'consent requerido' }

  // TASK-1253 — Autoridad de validación server-side. El renderer valida por UX, pero un
  // POST directo puede inyectar basura: re-validamos con el MISMO registry canónico
  // (paridad) y normalizamos (email lowercased / E.164 / RUT / número). Gated por flag
  // (default OFF) con degradación honesta. El `normalized_fields_json` resultante es el
  // payload entregable (incluye el email) que el dispatcher async manda al destino; la
  // minimización de PII se gobierna por persistence_mode + retención (arch §8.4), NO
  // descartando el dato que el form debe entregar. `lead_email_hash` queda como clave de
  // dedupe/rate-limit, separada del payload.
  // field_schema_json se parsea UNA vez: lo consumen la re-validación server (TASK-1253)
  // y el cifrado de national_id (TASK-1255).
  const parsedFieldDefs = z.array(fieldDefinitionSchema).safeParse(version.field_schema_json)

  let normalizedFields: Record<string, unknown> = { ...input.fields }

  if (isFormsServerValidationEnabled()) {
    if (parsedFieldDefs.success) {
      const revalidated = revalidateAndNormalizeFields(parsedFieldDefs.data, input.fields)

      if (!revalidated.ok) return { outcome: 'invalid', reason: 'Revisa los datos del formulario.' }

      normalizedFields = revalidated.normalizedFields
    } else {
      // Degradación honesta: field_schema_json no parseable (form legacy/corrupto). NO
      // rechazar (no romper el form); emitir señal a Sentry y seguir con el raw.
      captureWithDomain(new Error('growth.forms server validation: field_schema_json no parseable'), 'growth', {
        extra: { formId: version.form_id, formVersionId: version.form_version_id },
      })
    }
  }

  // TASK-1254 — Gate de email por política del form (default OFF via flag). Tier 1 (gratis,
  // síncrono) decide el gate; el veredicto profundo Tier 2 (provider) es async y NO bloquea.
  // `block_field` rechaza si el email no es corporativo/no-desechable; `warn`/`tag_only` no
  // bloquean, solo marcan la calidad del lead. Autoridad server-side (el botón es UX).
  let emailQuality: 'verified' | 'suspect' | 'unknown' | null = null
  let emailDomainClass: 'corporate' | 'personal' | 'disposable' | null = null

  if (isFormsEmailVerificationEnabled()) {
    const policy = resolveEmailPolicy(version.validation_schema_json)

    if (policy.mode !== 'off') {
      const emailValue = normalizedFields[policy.field]
      const verdict = await verifyEmail(emailValue)

      if (verdict.syntaxValid) {
        emailDomainClass = verdict.isDisposable ? 'disposable' : verdict.isCorporate ? 'corporate' : 'personal'
        emailQuality = verdict.quality

        const failsCorporate = verdict.reasonCode === 'email_not_corporate' || verdict.reasonCode === 'email_disposable'

        if (policy.mode === 'block_field' && failsCorporate) {
          // Registra el rechazo (sin PII: solo reason_class) para que el signal de
          // rejection rate lo vea. La spike de este signal es la alerta canónica de
          // "el gate corporativo está matando conversión" (risk matrix).
          const emailReasonClass = verdict.reasonCode === 'email_disposable' ? 'email_disposable' : 'email_not_corporate'

          await insertRejectedSubmission({
            formId: version.form_id,
            formVersionId: version.form_version_id,
            surfaceId,
            reasonClass: emailReasonClass,
            requestId: context.requestId ?? null,
          }).catch(error => captureWithDomain(error, 'growth', { extra: { stage: 'email_gate_rejection_persist' } }))

          return { outcome: 'invalid', reason: 'Usa el correo de tu empresa para continuar.' }
        }
      }
    }
  }

  // TASK-1255 — Cifrado at-rest de national_id (cédula), gated default OFF. Saca los
  // campos national_id del blob en claro y los cifra (AES-256-GCM) → encrypted_fields_json.
  // Boundary: tras esto el dispatcher (que lee normalized_fields_json) ya no ve la cédula.
  // El email gate corrió ANTES (email NO es national_id, sigue en el blob). Fail-closed:
  // si el cifrado está ON pero la key falla, NO se persiste la cédula en claro — se rechaza.
  let encryptedFields: Record<string, EncryptedFieldEnvelope> = {}

  if (isFormsPiiEncryptionEnabled() && parsedFieldDefs.success) {
    try {
      const split = await splitAndEncryptPii(parsedFieldDefs.data, normalizedFields)

      normalizedFields = split.remaining
      encryptedFields = split.encrypted
    } catch (error) {
      captureWithDomain(error, 'growth', { extra: { stage: 'pii_encryption_split', formId: version.form_id } })

      return { outcome: 'error', reason: 'No fue posible procesar tus datos de forma segura. Intenta más tarde.' }
    }
  }

  // Hashes (nunca PII cruda en el ledger: ni email ni IP). El email se hashea YA
  // normalizado para que dedupe/rate-limit no mientan con formatos heterogéneos.
  const emailRaw = typeof normalizedFields.email === 'string' ? normalizedFields.email : null
  const leadEmailHash = hashIdentifier(emailRaw, FORMS_EMAIL_SALT)
  const ipHash = hashIdentifier(context.ip ?? null, FORMS_IP_SALT)

  // Rate-limit (abuse-guard core compartido): per-email → per-IP. Forms sin costo LLM
  // → budget Infinity (sólo opera el rate-limit, no el circuit-breaker de costo).
  const limits = resolveFormsAbuseLimits()
  const emailCount = leadEmailHash ? await countAcceptedSubmissionsByHash('lead_email_hash', leadEmailHash) : 0
  const ipCount = ipHash ? await countAcceptedSubmissionsByHash('ip_hash', ipHash) : null
  const abuse = decideAbuse({ emailCountToday: emailCount, ipCountToday: ipCount, spentUsdToday: 0, estimatedCostUsd: 0, limits })

  if (!abuse.allowed) return { outcome: 'rate_limited', reason: abuse.outcome ?? 'rate_limited' }

  // Dedupe (ventana 60 min).
  const fingerprint = dedupeFingerprint(version.form_id, [emailRaw, input.formSlug])
  const duplicate = await findRecentDuplicate(version.form_id, fingerprint)

  if (duplicate) return { outcome: 'accepted', submissionId: duplicate.submission_id, reason: 'dedupe (submission previa)' }

  const submission = await persistAcceptedSubmission({
    formId: version.form_id,
    formVersionId: version.form_version_id,
    surfaceId,
    pageUri: input.pageUri ?? null,
    pageName: input.pageName ?? null,
    leadEmailHash,
    normalizedFields,
    encryptedFields,
    dedupeFingerprint: fingerprint,
    requestId: context.requestId ?? null,
    ipHash,
    emailQuality,
    emailDomainClass,
    consent: {
      consentPolicyVersion: version.consent_policy_version ?? 'unspecified',
      checkboxes: input.consentCheckboxes,
    },
  })

  return { outcome: 'accepted', submissionId: submission.submission_id }
}

/** Registra un rechazo explícito (para paths que ya resolvieron la versión). */
export const recordRejectedSubmission = insertRejectedSubmission

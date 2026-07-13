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
} from './contracts'
import { mintEmbedKey, verifyEmbedKeySecret } from './embed-key'
import { dedupeFingerprint } from './hash'
import { type InsertableFormCatalogEntryVm, listInsertableFormCatalog } from './readers'
import {
  isFormsPiiEncryptionEnabled,
  isFormsServerValidationEnabled,
  resolveFormsAbuseLimits,
} from './flags'
import { splitAndEncryptPii } from './pii/encryption'
import type { EncryptedFieldEnvelope } from './pii/types'
import { validateFieldValue } from './validators/core'
import { evaluateFormEmailGate } from './email-verification'
import { applyNameNormalizationPolicy } from './name-normalization'
import { compileFormVersion } from './policy-compiler'
import {
  GrowthFormUploadError,
  type GrowthFormUploadedFiles,
  prepareGrowthFormUploadedFiles,
} from './file-uploads'
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
  updateHostSurfaceEmbedKey,
  updateVersionStatus,
} from './store'

// ─── Authoring ────────────────────────────────────────────────────────────────

export interface AuthorDraftFormInput {
  slug: string
  /** Identidad pública estable (`form_key`) para first-publish de consumers externos. */
  formKey?: string
  name: string
  formKind: FormKind
  purpose: string
  riskProfile?: RiskProfile
  locale?: string
  fieldSchema: unknown
  /** TASK-1254 — política de validación por form (incluye emailPolicy del gate corporativo). */
  validationSchema?: unknown
  /** TASK-1297 — render copy (copyRef → string) publicado al render contract. Se sanea
   *  browser-safe en el policy-compiler (sanitizeRenderCopy) antes de exponerse. */
  copyRefs?: unknown
  /** Variante visual gobernada del renderer portable (`form_version.style_variant`). */
  styleVariant?: string | null
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

  if (existing && input.formKey && existing.form_key !== input.formKey) {
    throw new Error(`form_key_mismatch:${input.slug}`)
  }

  const definition =
    existing ??
    (await insertFormDefinition({
      slug: input.slug,
      formKey: input.formKey,
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
    copyRefs: input.copyRefs,
    styleVariant: input.styleVariant,
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

// ─── External form catalog + per-site embed key (TASK-1258 — precond TASK-1259) ─

/**
 * Mintea (o rota) la credencial per-site de una surface. Persiste el hash; devuelve el
 * secreto crudo UNA sola vez para que el operador lo configure server-side en el plugin
 * WordPress (NUNCA en el browser). Command gobernado: la autorización (capability) se
 * aplica en la capa API/CLI; este command es dominio puro.
 */
export type SetSurfaceEmbedKeyResult =
  | { ok: true; embedKeyId: string; secret: string }
  | { ok: false; reason: 'surface_not_found' }

export const setSurfaceEmbedKey = async (surfaceId: string): Promise<SetSurfaceEmbedKeyResult> => {
  const minted = mintEmbedKey()
  const updated = await updateHostSurfaceEmbedKey(surfaceId, minted.embedKeyId, minted.embedKeyHash)

  if (!updated) return { ok: false, reason: 'surface_not_found' }

  return { ok: true, embedKeyId: minted.embedKeyId, secret: minted.secret }
}

/**
 * Resuelve el catálogo externo de forms insertables autorizando por surface + origin +
 * credencial per-site (embed key). Las fallas de auth colapsan a `unauthorized` (anti
 * enumeración: no se filtra cuál chequeo falló). El secreto se compara timing-safe contra
 * `embed_key_hash`; una surface sin embed key provisionada NO autoriza (la credencial es
 * obligatoria para el catálogo, a diferencia del render/submit que sólo validan origin/slug).
 */
export type ExternalFormCatalogResult =
  | { ok: true; entries: InsertableFormCatalogEntryVm[] }
  | { ok: false; reason: 'missing_credentials' | 'unauthorized' }

export const resolveExternalFormCatalog = async (input: {
  surfaceId: string | null
  embedKeySecret: string | null
  origin: string | null
}): Promise<ExternalFormCatalogResult> => {
  if (!input.surfaceId || !input.embedKeySecret) return { ok: false, reason: 'missing_credentials' }

  const surface = await getHostSurfaceById(input.surfaceId)

  if (!surface || surface.status !== 'active') return { ok: false, reason: 'unauthorized' }
  if (!originAllowed(surface.origin_allowlist_json, input.origin)) return { ok: false, reason: 'unauthorized' }
  if (!verifyEmbedKeySecret(input.embedKeySecret, surface.embed_key_hash)) return { ok: false, reason: 'unauthorized' }

  const entries = await listInsertableFormCatalog(surface)

  return { ok: true, entries }
}

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
  uploadedFiles?: GrowthFormUploadedFiles
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

    if (field.type === 'multiselect') {
      if (!Array.isArray(raw) && typeof raw !== 'string') {
        return { ok: false, fieldKey: field.key, reasonCode: 'field_required' }
      }

      const source = Array.isArray(raw) ? raw : raw.split(',')
      const values: string[] = []
      const seen = new Set<string>()

      for (const item of source) {
        const value = String(item).trim()
        const key = value.toLocaleLowerCase('es-CL')

        if (!value || seen.has(key)) continue

        if (field.maxLength && value.length > field.maxLength) {
          return { ok: false, fieldKey: field.key, reasonCode: 'max_length' }
        }

        if (field.maxItems && values.length >= field.maxItems) break

        seen.add(key)
        values.push(value)
      }

      normalized[field.key] = values
      continue
    }

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

  // TASK-1318 — Name policy enrichment. Runs after field normalization and before
  // email/PII/storage/destination so all downstream consumers see the same derived
  // contract. Default is off; raw fullName is preserved and lastName is never fabricated.
  normalizedFields = applyNameNormalizationPolicy(version.validation_schema_json, normalizedFields)

  // TASK-1254/1263 — Gate de email por política del form (default OFF via flag), vía el helper
  // canónico `evaluateFormEmailGate` (un primitive, muchos consumers: submitForm + las dos
  // fachadas del grader). Tier 1 (gratis, síncrono) decide el gate; el veredicto Tier 2 es
  // async y NO bloquea. `block_field` rechaza si el email no es corporativo/no-desechable;
  // `warn`/`tag_only` no bloquean, solo marcan la calidad. Autoridad server-side (el botón es UX).
  const emailGate = await evaluateFormEmailGate(version.validation_schema_json, normalizedFields)
  const emailQuality = emailGate.gated ? emailGate.quality : null
  const emailDomainClass = emailGate.gated ? emailGate.domainClass : null

  if (emailGate.gated && emailGate.rejected) {
    // Registra el rechazo (sin PII: solo reason_class) para que el signal de rejection rate
    // lo vea. La spike de este signal es la alerta canónica de "el gate corporativo está
    // matando conversión" (risk matrix).
    await insertRejectedSubmission({
      formId: version.form_id,
      formVersionId: version.form_version_id,
      surfaceId,
      reasonClass: emailGate.rejectionClass ?? 'email_not_corporate',
      requestId: context.requestId ?? null,
    }).catch(error => captureWithDomain(error, 'growth', { extra: { stage: 'email_gate_rejection_persist' } }))

    return { outcome: 'invalid', reason: 'Usa el correo de tu empresa para continuar.' }
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

  const hasUploadedFiles = Object.keys(context.uploadedFiles ?? {}).length > 0
  const hasFileFields = parsedFieldDefs.success && parsedFieldDefs.data.some(field => field.type === 'file')

  if (hasUploadedFiles || hasFileFields) {
    if (!parsedFieldDefs.success) {
      captureWithDomain(new Error('growth.forms upload: field_schema_json no parseable'), 'growth', {
        extra: { formId: version.form_id, formVersionId: version.form_version_id },
      })

      return { outcome: 'invalid', reason: 'Revisa los archivos del formulario.' }
    }

    try {
      const uploadedDescriptors = await prepareGrowthFormUploadedFiles({
        formId: version.form_id,
        formVersionId: version.form_version_id,
        surfaceId,
        fields: parsedFieldDefs.data,
        uploadedFiles: context.uploadedFiles ?? {},
      })

      normalizedFields = { ...normalizedFields, ...uploadedDescriptors }
    } catch (error) {
      if (error instanceof GrowthFormUploadError) {
        return { outcome: 'invalid', reason: 'Revisa los archivos del formulario.' }
      }

      throw error
    }
  }

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

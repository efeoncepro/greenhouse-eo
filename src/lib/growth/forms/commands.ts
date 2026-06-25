/**
 * TASK-1229 — Growth Forms engine: commands canónicos (write path gobernado).
 *
 * Full API Parity: cada acción de negocio vive acá como command reutilizable; la
 * UI/admin/Nexa/MCP/CLI son clientes, no reimplementan lógica. La autorización
 * (capability) se aplica en la capa API; estos commands son dominio puro.
 */
import 'server-only'

import {
  type FormKind,
  type PublicSubmitInput,
  type PublicSubmitResult,
  type RiskProfile,
  publicSubmitInputSchema,
} from './contracts'
import { dedupeFingerprint, hashValue } from './hash'
import { compileFormVersion } from './policy-compiler'
import {
  type FormDestinationRow,
  type FormVersionRow,
  archiveFormDefinition,
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

export interface SubmitContext {
  origin: string | null
  requestId?: string | null
}

/**
 * Procesa un submit público: resuelve la versión publicada por slug, autoriza la
 * surface (origin + slug allowlist), valida honeypot/consent/dedupe, normaliza y
 * persiste la submission ACEPTADA + consent + outbox event (in-tx). La entrega al
 * destino es async (dispatcher), NUNCA inline. Devuelve outcome (no throws para
 * bloqueos esperados; espeja `createPublicGraderRun`).
 */
export const submitForm = async (rawInput: PublicSubmitInput, context: SubmitContext): Promise<PublicSubmitResult> => {
  const parsed = publicSubmitInputSchema.safeParse(rawInput)

  if (!parsed.success) return { outcome: 'invalid', reason: 'payload no válido' }
  const input = parsed.data

  // Honeypot: si viene con valor, se rechaza silenciosamente como spam.
  if (input.honeypot && input.honeypot.trim().length > 0) {
    return { outcome: 'spam_rejected', reason: 'honeypot' }
  }

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

  // Normalización mínima + email hash (nunca PII cruda en el ledger).
  const emailRaw = typeof input.fields.email === 'string' ? input.fields.email : null
  const leadEmailHash = hashValue(emailRaw)
  const normalizedFields: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input.fields)) {
    if (key === 'email') continue // el email no se persiste crudo
    normalizedFields[key] = value
  }

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
    dedupeFingerprint: fingerprint,
    requestId: context.requestId ?? null,
    consent: {
      consentPolicyVersion: version.consent_policy_version ?? 'unspecified',
      checkboxes: input.consentCheckboxes,
    },
  })

  return { outcome: 'accepted', submissionId: submission.submission_id }
}

/** Registra un rechazo explícito (para paths que ya resolvieron la versión). */
export const recordRejectedSubmission = insertRejectedSubmission

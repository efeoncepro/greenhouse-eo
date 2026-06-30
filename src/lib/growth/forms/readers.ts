/**
 * TASK-1229 — Growth Forms engine: readers canónicos (read path gobernado).
 *
 * El render_contract público sale de acá ya acotado a browser-safe (sin mapping,
 * GUIDs, property names ni secretos). Los listados admin alimentan el cockpit
 * (TASK-1232), Nexa/MCP y CLI sobre el mismo primitive.
 */
import 'server-only'

import type { RenderContract } from './contracts'
import { compileFormVersion } from './policy-compiler'
import {
  type FormDestinationAttemptRow,
  type FormDestinationRow,
  type FormHostSurfaceRow,
  type FormSubmissionRow,
  getFormDefinitionById,
  getFormDefinitionByKey,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  getConsentSnapshot,
  listAttemptsForSubmission,
  listDestinationsForVersion,
  listFormDefinitions,
  listHostSurfaces,
  listSubmissions,
  listVersionsForForm,
  getSubmissionById,
} from './store'

export interface GetRenderContractOptions {
  surfaceId?: string | null
  origin?: string | null
}

/**
 * Render contract público de la versión publicada de un slug. Aplica la surface
 * policy (origins permitidos) cuando se pasa una surface. Devuelve null si no hay
 * versión publicable o la surface no está autorizada.
 */
export const getPublishedRenderContract = async (
  slug: string,
  options: GetRenderContractOptions = {},
): Promise<RenderContract | null> => {
  const version = await getPublishedVersionBySlug(slug)

  if (!version) return null
  const definition = await getFormDefinitionById(version.form_id)

  if (!definition || definition.status !== 'active') return null

  const destinations = await listDestinationsForVersion(version.form_version_id)
  const compiled = compileFormVersion(definition, version, destinations, { forPublication: false })

  if (!compiled.renderContract) return null

  const contract = compiled.renderContract

  if (options.surfaceId) {
    const surface = await getHostSurfaceById(options.surfaceId)

    if (!surface || surface.status !== 'active') return null
    const allowedSlugs = surface.allowed_form_slugs_json

    if (Array.isArray(allowedSlugs) && allowedSlugs.length > 0 && !allowedSlugs.includes(slug)) return null
    const origins = Array.isArray(surface.origin_allowlist_json) ? (surface.origin_allowlist_json as string[]) : []

    contract.surfacePolicy = { surfaceId: surface.surface_id, allowedOrigins: origins, rendererChannel: surface.renderer_channel as RenderContract['surfacePolicy']['rendererChannel'] }
  }

  return contract
}

/**
 * TASK-1297 — un `formRef` público puede ser el `slug` (alias humano/legacy) o el
 * `form_key` (identidad estable opaca, UUID). UUID estricto v4-ish (hex 8-4-4-4-12) =
 * key; cualquier otra cosa = slug. Los slugs son kebab humano (`efeonce-aeo-diagnostic`),
 * jamás con forma UUID → la desambiguación es determinista y sin colisión.
 */
const FORM_KEY_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isFormKey = (ref: string): boolean => FORM_KEY_RE.test(ref)

/**
 * Resuelve un `formRef` (slug o form_key) al `slug` canónico. Los consumers públicos
 * (render/submit) siguen operando por slug aguas abajo (surface allowlist, dedupe), así
 * que la resolución por key se centraliza acá: un primitive, los 3 endpoints lo reusan.
 * Devuelve `null` si el ref es un key que no existe o cuya definición no está activa.
 */
export const resolveFormSlugFromRef = async (ref: string): Promise<string | null> => {
  if (!isFormKey(ref)) return ref
  const definition = await getFormDefinitionByKey(ref)

  return definition && definition.status === 'active' ? definition.slug : null
}

/**
 * Render contract público resuelto por `formRef` (slug o form_key). Mantiene la surface
 * policy por slug (mismo path que `getPublishedRenderContract`). Es lo que permite que
 * `<greenhouse-form form-key="...">` cargue por identidad estable sin ruta ni CORS nueva.
 */
export const getPublishedRenderContractByRef = async (
  ref: string,
  options: GetRenderContractOptions = {},
): Promise<RenderContract | null> => {
  const slug = await resolveFormSlugFromRef(ref)

  if (!slug) return null

  return getPublishedRenderContract(slug, options)
}

// ─── Admin readers ────────────────────────────────────────────────────────────

export interface FormSummaryVm {
  formId: string
  slug: string
  name: string
  formKind: string
  purpose: string
  riskProfile: string
  ownerTeam: string | null
  status: string
  defaultLocale: string
  latestVersion: number | null
  latestVersionId: string | null
  latestVersionStatus: string | null
  latestVersionCreatedAt: Date | null
  latestPublishedAt: Date | null
}

export const listFormsAdmin = async (): Promise<FormSummaryVm[]> => {
  const definitions = await listFormDefinitions()
  const summaries: FormSummaryVm[] = []

  for (const def of definitions) {
    const versions = await listVersionsForForm(def.form_id)
    const latest = versions[0] ?? null

    summaries.push({
      formId: def.form_id,
      slug: def.slug,
      name: def.name,
      formKind: def.form_kind,
      purpose: def.purpose,
      riskProfile: def.risk_profile,
      ownerTeam: def.owner_team,
      status: def.status,
      defaultLocale: def.default_locale,
      latestVersion: latest?.version ?? null,
      latestVersionId: latest?.form_version_id ?? null,
      latestVersionStatus: latest?.status ?? null,
      latestVersionCreatedAt: latest?.created_at ?? null,
      latestPublishedAt: latest?.published_at ?? null,
    })
  }

  
return summaries
}

export const getFormDetailAdmin = async (formId: string) => {
  const definition = await getFormDefinitionById(formId)

  if (!definition) return null
  const versions = await listVersionsForForm(formId)
  const destinationsByVersion: Record<string, Awaited<ReturnType<typeof listDestinationsForVersion>>> = {}

  for (const v of versions) {
    destinationsByVersion[v.form_version_id] = await listDestinationsForVersion(v.form_version_id)
  }

  
return { definition, versions, destinationsByVersion }
}

export interface SubmissionSummaryVm {
  submissionId: string
  formId: string
  status: string
  surfaceId: string | null
  rejectionReasonClass: string | null
  createdAt: Date
}

export const listSubmissionsAdmin = async (opts: { formId?: string; limit?: number } = {}): Promise<SubmissionSummaryVm[]> => {
  const rows = await listSubmissions(opts)

  
return rows.map(r => ({
    submissionId: r.submission_id,
    formId: r.form_id,
    status: r.status,
    surfaceId: r.surface_id,
    rejectionReasonClass: r.rejection_reason_class,
    createdAt: r.created_at,
  }))
}

export interface SubmissionDeliveryVm {
  submissionId: string
  status: string
  attempts: Array<Pick<FormDestinationAttemptRow, 'attempt_id' | 'destination_id' | 'provider' | 'status' | 'error_class' | 'retry_count' | 'created_at'>>
}

export const getSubmissionDeliveryStateAdmin = async (submissionId: string): Promise<SubmissionDeliveryVm | null> => {
  const submission = await getSubmissionById(submissionId)

  if (!submission) return null
  const attempts = await listAttemptsForSubmission(submissionId)

  
return {
    submissionId: submission.submission_id,
    status: submission.status,
    attempts: attempts.map(a => ({
      attempt_id: a.attempt_id,
      destination_id: a.destination_id,
      provider: a.provider,
      status: a.status,
      error_class: a.error_class,
      retry_count: a.retry_count,
      created_at: a.created_at,
    })),
  }
}

export const listHostSurfacesAdmin = listHostSurfaces

// ─── External form catalog (TASK-1258 — precondición de TASK-1259) ────────────

/**
 * Readiness del destino de un form, derivada honesta (regla TASK-1232: nunca pintar
 * verde si la señal es desconocida). Le dice al editor externo si insertar el form
 * realmente entrega leads o si quedaría capturando sin destino activo.
 *   - `ready`                 — ≥1 destino habilitado con delivery `direct`.
 *   - `review_only`           — habilitado pero entrega tras revisión humana.
 *   - `manual_only`           — habilitado pero entrega 100% manual.
 *   - `destination_disabled`  — hay destinos pero ninguno entrega (deshabilitado/disabled).
 *   - `no_destination`        — el form no tiene destino configurado.
 */
export type DestinationReadiness = 'ready' | 'review_only' | 'manual_only' | 'destination_disabled' | 'no_destination'

export const resolveDestinationReadiness = (destinations: Pick<FormDestinationRow, 'enabled' | 'delivery_mode'>[]): DestinationReadiness => {
  if (destinations.length === 0) return 'no_destination'

  const enabled = destinations.filter(destination => destination.enabled)

  if (enabled.length === 0) return 'destination_disabled'
  if (enabled.some(destination => destination.delivery_mode === 'direct')) return 'ready'
  if (enabled.some(destination => destination.delivery_mode === 'after_review')) return 'review_only'
  if (enabled.some(destination => destination.delivery_mode === 'manual_only')) return 'manual_only'

  // Habilitados pero todos con delivery_mode 'disabled' ⇒ no entregan.
  return 'destination_disabled'
}

/**
 * Entrada del catálogo externo: SOLO metadata browser/editor-safe (sin GUIDs HubSpot,
 * property names, mapping ni secretos). Es lo que el selector de TASK-1259 muestra para
 * elegir qué form insertar.
 */
export interface InsertableFormCatalogEntryVm {
  displayName: string
  /** TASK-1297 — identidad estable/opaca; preferir sobre slug para embeds/mutaciones. */
  formKey: string
  formSlug: string
  formKind: string
  /** Versión publicada (la insertable). */
  version: number
  versionStatus: 'published'
  defaultLocale: string
  /** Surfaces activas donde este slug es insertable (allowlist vacía ⇒ cualquier slug). */
  surfaceIds: string[]
  destinationReadiness: DestinationReadiness
}

const allowlistIncludesSlug = (allowlist: unknown, slug: string): boolean =>
  Array.isArray(allowlist) && (allowlist.length === 0 || allowlist.includes(slug))

/**
 * Catálogo gobernado de forms INSERTABLES para una surface (un reader, muchos consumers:
 * plugin WordPress vía endpoint, Nexa/MCP, cockpit). "Insertable" = definición activa
 * CON una versión publicada. Si la surface tiene `allowed_form_slugs` no vacío, el
 * catálogo se acota a esos slugs; vacío ⇒ todos los publicados. NUNCA expone destino crudo.
 */
export const listInsertableFormCatalog = async (
  surface: Pick<FormHostSurfaceRow, 'allowed_form_slugs_json'>,
): Promise<InsertableFormCatalogEntryVm[]> => {
  const surfaceAllowlist = Array.isArray(surface.allowed_form_slugs_json)
    ? (surface.allowed_form_slugs_json as string[])
    : []

  const scopeToAllowlist = surfaceAllowlist.length > 0

  const [definitions, activeSurfaces] = await Promise.all([
    listFormDefinitions(),
    listHostSurfaces(),
  ])

  const insertableSurfaces = activeSurfaces.filter(s => s.status === 'active')
  const entries: InsertableFormCatalogEntryVm[] = []

  for (const definition of definitions) {
    if (definition.status !== 'active') continue
    if (scopeToAllowlist && !surfaceAllowlist.includes(definition.slug)) continue

    const publishedVersion = await getPublishedVersionBySlug(definition.slug)

    if (!publishedVersion) continue

    const destinations = await listDestinationsForVersion(publishedVersion.form_version_id)

    const surfaceIds = insertableSurfaces
      .filter(s => allowlistIncludesSlug(s.allowed_form_slugs_json, definition.slug))
      .map(s => s.surface_id)

    entries.push({
      displayName: definition.name,
      formKey: definition.form_key,
      formSlug: definition.slug,
      formKind: definition.form_kind,
      version: publishedVersion.version,
      versionStatus: 'published',
      defaultLocale: definition.default_locale,
      surfaceIds,
      destinationReadiness: resolveDestinationReadiness(destinations),
    })
  }


return entries.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

// ─── Admin cockpit (TASK-1232) ───────────────────────────────────────────────

export type GrowthFormsHealthState = 'draft' | 'setup' | 'ready' | 'healthy' | 'attention' | 'dead_letter'

export interface GrowthFormsCockpitDestinationVm {
  destinationId: string
  provider: string
  adapterKind: string
  endpointStatus: string
  enabled: boolean
  deliveryMode: string
}

export interface GrowthFormsCockpitSurfaceVm {
  surfaceId: string
  surfaceKind: string
  surfaceName: string
  rendererChannel: string
  status: string
  allowedFormSlugs: string[]
  originAllowlist: string[]
  createdAt: string
  updatedAt: string
}

export interface GrowthFormsCockpitAttemptVm {
  attemptId: string
  submissionId: string
  destinationId: string
  provider: string
  status: string
  errorClass: string | null
  retryCount: number
  httpStatus: number | null
  externalId: string | null
  nextRetryAt: string | null
  createdAt: string
  completedAt: string | null
}

export interface GrowthFormsCockpitSubmissionVm {
  submissionId: string
  formId: string
  status: string
  surfaceId: string | null
  pageUri: string | null
  pageName: string | null
  rejectionReasonClass: string | null
  deliveryAttempts: number
  nextAttemptAt: string | null
  createdAt: string
  updatedAt: string
  attempts: GrowthFormsCockpitAttemptVm[]
  consent: {
    consentPolicyVersion: string
    legalBasis: string
    privacyUrl: string | null
    noticeTextHash: string | null
    createdAt: string
  } | null
}

export interface GrowthFormsCockpitFormVm extends Omit<FormSummaryVm, 'latestVersionCreatedAt' | 'latestPublishedAt'> {
  latestVersionCreatedAt: string | null
  latestPublishedAt: string | null
  destinations: GrowthFormsCockpitDestinationVm[]
  surfaces: GrowthFormsCockpitSurfaceVm[]
  submissionCount: number
  submissions24h: number
  retryQueueCount: number
  deadLetterCount: number
  lastSubmissionAt: string | null
  lastSubmissionId: string | null
  health: GrowthFormsHealthState
}

export interface GrowthFormsCockpitVm {
  forms: GrowthFormsCockpitFormVm[]
  submissions: GrowthFormsCockpitSubmissionVm[]
  surfaces: GrowthFormsCockpitSurfaceVm[]
  summary: {
    totalForms: number
    publishedForms: number
    activeSurfaces: number
    submissions24h: number
    retryQueue: number
    deadLetters: number
  }
}

const toIso = (value: Date | null | undefined) => value?.toISOString() ?? null

const unknownStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const mapSurface = (surface: FormHostSurfaceRow): GrowthFormsCockpitSurfaceVm => ({
  surfaceId: surface.surface_id,
  surfaceKind: surface.surface_kind,
  surfaceName: surface.surface_name,
  rendererChannel: surface.renderer_channel,
  status: surface.status,
  allowedFormSlugs: unknownStringArray(surface.allowed_form_slugs_json),
  originAllowlist: unknownStringArray(surface.origin_allowlist_json),
  createdAt: surface.created_at.toISOString(),
  updatedAt: surface.updated_at.toISOString(),
})

const mapDestination = (destination: FormDestinationRow): GrowthFormsCockpitDestinationVm => ({
  destinationId: destination.destination_id,
  provider: destination.provider,
  adapterKind: destination.adapter_kind,
  endpointStatus: destination.endpoint_status,
  enabled: destination.enabled,
  deliveryMode: destination.delivery_mode,
})

const mapAttempt = (attempt: FormDestinationAttemptRow): GrowthFormsCockpitAttemptVm => ({
  attemptId: attempt.attempt_id,
  submissionId: attempt.submission_id,
  destinationId: attempt.destination_id,
  provider: attempt.provider,
  status: attempt.status,
  errorClass: attempt.error_class,
  retryCount: attempt.retry_count,
  httpStatus: attempt.http_status,
  externalId: attempt.external_id,
  nextRetryAt: toIso(attempt.next_retry_at),
  createdAt: attempt.created_at.toISOString(),
  completedAt: toIso(attempt.completed_at),
})

const isRetryState = (status: string) =>
  status === 'retrying' || status === 'destination_failed' || status === 'failed' || status === 'pending'

const isDeadLetterState = (status: string) => status === 'dead_letter'

const resolveFormHealth = ({
  latestVersionStatus,
  destinations,
  submissions,
  attempts,
}: {
  latestVersionStatus: string | null
  destinations: GrowthFormsCockpitDestinationVm[]
  submissions: FormSubmissionRow[]
  attempts: GrowthFormsCockpitAttemptVm[]
}): GrowthFormsHealthState => {
  if (!latestVersionStatus || latestVersionStatus === 'draft' || latestVersionStatus === 'review') return 'draft'

  if (destinations.length === 0 || destinations.every(destination => !destination.enabled)) return 'setup'

  if (submissions.some(submission => isDeadLetterState(submission.status)) || attempts.some(attempt => isDeadLetterState(attempt.status))) {
    return 'dead_letter'
  }

  if (submissions.some(submission => isRetryState(submission.status)) || attempts.some(attempt => isRetryState(attempt.status))) {
    return 'attention'
  }

  if (submissions.length > 0) return 'healthy'

  return 'ready'
}

export const getGrowthFormsCockpitAdmin = async (): Promise<GrowthFormsCockpitVm> => {
  const [forms, surfacesRows, submissionsRows] = await Promise.all([
    listFormsAdmin(),
    listHostSurfaces(),
    listSubmissions({ limit: 200 }),
  ])

  const surfaces = surfacesRows.map(mapSurface)
  const attemptsBySubmission = new Map<string, GrowthFormsCockpitAttemptVm[]>()
  const consentBySubmission = new Map<string, GrowthFormsCockpitSubmissionVm['consent']>()

  await Promise.all(
    submissionsRows.map(async submission => {
      const [attempts, consent] = await Promise.all([
        listAttemptsForSubmission(submission.submission_id),
        getConsentSnapshot(submission.submission_id),
      ])

      attemptsBySubmission.set(submission.submission_id, attempts.map(mapAttempt))
      consentBySubmission.set(
        submission.submission_id,
        consent
          ? {
              consentPolicyVersion: consent.consent_policy_version,
              legalBasis: consent.legal_basis,
              privacyUrl: consent.privacy_url,
              noticeTextHash: consent.notice_text_hash,
              createdAt: consent.created_at.toISOString(),
            }
          : null,
      )
    }),
  )

  const submissions: GrowthFormsCockpitSubmissionVm[] = submissionsRows.map(submission => ({
    submissionId: submission.submission_id,
    formId: submission.form_id,
    status: submission.status,
    surfaceId: submission.surface_id,
    pageUri: submission.page_uri,
    pageName: submission.page_name,
    rejectionReasonClass: submission.rejection_reason_class,
    deliveryAttempts: submission.delivery_attempts,
    nextAttemptAt: toIso(submission.next_attempt_at),
    createdAt: submission.created_at.toISOString(),
    updatedAt: submission.updated_at.toISOString(),
    attempts: attemptsBySubmission.get(submission.submission_id) ?? [],
    consent: consentBySubmission.get(submission.submission_id) ?? null,
  }))

  const now = Date.now()
  const oneDayMs = 24 * 60 * 60 * 1000
  const totalAttempts = submissions.flatMap(submission => submission.attempts)
  const cockpitForms: GrowthFormsCockpitFormVm[] = []

  for (const form of forms) {
    const detail = await getFormDetailAdmin(form.formId)
    const latestVersionId = form.latestVersionId
    const destinations = latestVersionId ? (detail?.destinationsByVersion[latestVersionId] ?? []).map(mapDestination) : []

    const relatedSurfaces = surfaces.filter(surface => {
      if (surface.allowedFormSlugs.length === 0) return true

      return surface.allowedFormSlugs.includes(form.slug)
    })

    const relatedSubmissionsRows = submissionsRows.filter(submission => submission.form_id === form.formId)
    const relatedSubmissions = submissions.filter(submission => submission.formId === form.formId)
    const relatedAttempts = relatedSubmissions.flatMap(submission => submission.attempts)

    const retryQueueCount =
      relatedSubmissionsRows.filter(submission => isRetryState(submission.status)).length +
      relatedAttempts.filter(attempt => isRetryState(attempt.status)).length

    const deadLetterCount =
      relatedSubmissionsRows.filter(submission => isDeadLetterState(submission.status)).length +
      relatedAttempts.filter(attempt => isDeadLetterState(attempt.status)).length

    const submissions24h = relatedSubmissionsRows.filter(submission => now - submission.created_at.getTime() <= oneDayMs).length
    const lastSubmission = relatedSubmissions[0] ?? null

    cockpitForms.push({
      ...form,
      latestVersionCreatedAt: toIso(form.latestVersionCreatedAt),
      latestPublishedAt: toIso(form.latestPublishedAt),
      destinations,
      surfaces: relatedSurfaces,
      submissionCount: relatedSubmissionsRows.length,
      submissions24h,
      retryQueueCount,
      deadLetterCount,
      lastSubmissionAt: lastSubmission?.createdAt ?? null,
      lastSubmissionId: lastSubmission?.submissionId ?? null,
      health: resolveFormHealth({
        latestVersionStatus: form.latestVersionStatus,
        destinations,
        submissions: relatedSubmissionsRows,
        attempts: relatedAttempts,
      }),
    })
  }

  return {
    forms: cockpitForms,
    submissions,
    surfaces,
    summary: {
      totalForms: cockpitForms.length,
      publishedForms: cockpitForms.filter(form => form.latestVersionStatus === 'published').length,
      activeSurfaces: surfaces.filter(surface => surface.status === 'active').length,
      submissions24h: submissionsRows.filter(submission => now - submission.created_at.getTime() <= oneDayMs).length,
      retryQueue: submissions.filter(submission => isRetryState(submission.status)).length + totalAttempts.filter(attempt => isRetryState(attempt.status)).length,
      deadLetters:
        submissions.filter(submission => isDeadLetterState(submission.status)).length +
        totalAttempts.filter(attempt => isDeadLetterState(attempt.status)).length,
    },
  }
}

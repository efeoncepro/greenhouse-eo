/**
 * TASK-1229 — Growth Forms engine: data-access canónico (greenhouse_growth.form_*).
 *
 * Único punto de acceso a las 7 tablas del motor. Readers y commands construyen
 * sobre esto; ningún consumer (API/Nexa/MCP/CLI) toca SQL directo (Full API Parity).
 */
import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  FORM_SUBMISSION_ACCEPTED_EVENT,
  FORM_SUBMISSION_AGGREGATE,
  type FormSubmissionAcceptedEventPayload,
} from './contracts'

// ─── Row shapes (lean; mapeados desde greenhouse_growth.*) ────────────────────

export type FormDefinitionRow = {
  form_id: string
  /** TASK-1297 — identidad estable, opaca e inmutable (UUID). Pública/browser-safe.
   *  NUNCA es el HubSpot destination form GUID. Distinta de form_id/slug/version/surface. */
  form_key: string
  slug: string
  name: string
  form_kind: string
  purpose: string
  risk_profile: string
  owner_team: string | null
  status: string
  default_locale: string
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export type FormVersionRow = {
  form_version_id: string
  form_id: string
  version: number
  status: string
  locale: string
  field_schema_json: unknown
  validation_schema_json: unknown
  copy_refs_json: unknown
  style_variant: string | null
  ui_policy_json: unknown
  success_behavior_json: unknown
  consent_policy_version: string | null
  data_classification_json: unknown
  destination_policy_json: unknown
  analytics_policy_json: unknown
  retention_policy_json: unknown
  commercial_handoff_policy_json: unknown
  published_at: Date | null
  created_at: Date
}

export type FormDestinationRow = {
  destination_id: string
  form_version_id: string
  provider: string
  adapter_kind: string
  adapter_version: string
  endpoint_status: string
  enabled: boolean
  delivery_mode: string
  mapping_json: unknown
  consent_requirements_json: unknown
  retry_policy_json: unknown
  created_at: Date
}

export type FormHostSurfaceRow = {
  surface_id: string
  surface_kind: string
  surface_name: string
  origin_allowlist_json: unknown
  allowed_form_slugs_json: unknown
  embed_key_id: string | null
  embed_key_hash: string | null
  renderer_channel: string
  csp_requirements_json: unknown
  status: string
  created_at: Date
  updated_at: Date
}

export type FormSubmissionRow = {
  submission_id: string
  form_id: string
  form_version_id: string
  surface_id: string | null
  page_uri: string | null
  page_name: string | null
  lead_email_hash: string | null
  normalized_fields_json: unknown
  /** TASK-1255 — national_id cifrado (AES-256-GCM), fuera del blob en claro. Map fieldKey → envelope. */
  encrypted_fields_json: unknown
  status: string
  rejection_reason_class: string | null
  dedupe_fingerprint: string | null
  request_id: string | null
  ip_hash: string | null
  delivery_attempts: number
  next_attempt_at: Date | null
  created_at: Date
  updated_at: Date
}

/**
 * TASK-1375 — asset entregable gated de un form (ebook PDF en bucket privado).
 * SERVER-ONLY: `object_name` nunca cruza al render contract. La ruta de descarga
 * resuelve el objeto desde acá por el `form_id` de la submission aceptada.
 */
export type FormAssetRow = {
  form_asset_id: string
  form_id: string
  asset_kind: string
  object_name: string
  file_name: string
  content_type: string
  ttl_hours: number
  active: boolean
  created_at: Date
  updated_at: Date
}

export type FormDestinationAttemptRow = {
  attempt_id: string
  submission_id: string
  destination_id: string
  provider: string
  adapter_version: string
  status: string
  external_id: string | null
  http_status: number | null
  error_class: string | null
  retry_count: number
  next_retry_at: Date | null
  created_at: Date
  completed_at: Date | null
}

// ─── Definitions ──────────────────────────────────────────────────────────────

export interface InsertFormDefinitionInput {
  slug: string
  /** Identidad pública estable (`form_key`). Si no se entrega, la DB genera un UUID. */
  formKey?: string | null
  name: string
  formKind: string
  purpose: string
  riskProfile: string
  ownerTeam?: string | null
  defaultLocale?: string
  createdBy?: string | null
}

/**
 * ⚠️ Al crear/publicar un form: registrar su fila en la capa de medición —
 * `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (slug, página/surface, evento
 * GA4 destino, key event, estado de tagging). La DB es SoT de la definición; el
 * tracking plan es SoT de la capa de medición/tagging (que la DB no tiene).
 */
export const insertFormDefinition = async (input: InsertFormDefinitionInput): Promise<FormDefinitionRow> => {
  const rows = await query<FormDefinitionRow>(
    `INSERT INTO greenhouse_growth.form_definition
       (slug, form_key, name, form_kind, purpose, risk_profile, owner_team, default_locale, created_by)
     VALUES ($1, COALESCE($2::uuid, gen_random_uuid()), $3, $4, $5, $6, $7, COALESCE($8, 'es-CL'), $9)
     RETURNING *`,
    [
      input.slug,
      input.formKey ?? null,
      input.name,
      input.formKind,
      input.purpose,
      input.riskProfile,
      input.ownerTeam ?? null,
      input.defaultLocale ?? null,
      input.createdBy ?? null,
    ],
  )

  
return rows[0]
}

export const getFormDefinitionById = async (formId: string): Promise<FormDefinitionRow | null> => {
  const rows = await query<FormDefinitionRow>(
    `SELECT * FROM greenhouse_growth.form_definition WHERE form_id = $1`,
    [formId],
  )

  
return rows[0] ?? null
}

export const getFormDefinitionBySlug = async (slug: string): Promise<FormDefinitionRow | null> => {
  const rows = await query<FormDefinitionRow>(
    `SELECT * FROM greenhouse_growth.form_definition WHERE slug = $1`,
    [slug],
  )


return rows[0] ?? null
}

/** TASK-1297 — resuelve la definición por su identidad estable `form_key` (UUID). */
export const getFormDefinitionByKey = async (formKey: string): Promise<FormDefinitionRow | null> => {
  const rows = await query<FormDefinitionRow>(
    `SELECT * FROM greenhouse_growth.form_definition WHERE form_key = $1`,
    [formKey],
  )


return rows[0] ?? null
}

export const listFormDefinitions = async (): Promise<FormDefinitionRow[]> =>
  query<FormDefinitionRow>(`SELECT * FROM greenhouse_growth.form_definition ORDER BY created_at DESC`)

export const archiveFormDefinition = async (formId: string): Promise<void> => {
  await query(`UPDATE greenhouse_growth.form_definition SET status = 'archived' WHERE form_id = $1`, [formId])
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export interface InsertFormVersionInput {
  formId: string
  locale: string
  fieldSchema: unknown
  validationSchema?: unknown
  copyRefs?: unknown
  styleVariant?: string | null
  uiPolicy?: unknown
  successBehavior?: unknown
  consentPolicyVersion?: string | null
  dataClassification?: unknown
  destinationPolicy?: unknown
  analyticsPolicy?: unknown
  retentionPolicy?: unknown
  commercialHandoffPolicy?: unknown
}

const jsonParam = (value: unknown, fallback: string): string =>
  value === undefined || value === null ? fallback : JSON.stringify(value)

export const insertFormVersion = async (input: InsertFormVersionInput): Promise<FormVersionRow> => {
  const rows = await query<FormVersionRow>(
    `INSERT INTO greenhouse_growth.form_version (
       form_id, version, status, locale, field_schema_json, validation_schema_json,
       copy_refs_json, style_variant, ui_policy_json, success_behavior_json,
       consent_policy_version, data_classification_json, destination_policy_json,
       analytics_policy_json, retention_policy_json, commercial_handoff_policy_json)
     VALUES (
       $1,
       (SELECT COALESCE(MAX(version), 0) + 1 FROM greenhouse_growth.form_version WHERE form_id = $1),
       'draft', $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb, $8::jsonb,
       $9, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb)
     RETURNING *`,
    [
      input.formId,
      input.locale,
      jsonParam(input.fieldSchema, '[]'),
      jsonParam(input.validationSchema, '{}'),
      jsonParam(input.copyRefs, '{}'),
      input.styleVariant ?? null,
      jsonParam(input.uiPolicy, '{}'),
      jsonParam(input.successBehavior, '{}'),
      input.consentPolicyVersion ?? null,
      jsonParam(input.dataClassification, '{}'),
      jsonParam(input.destinationPolicy, '{}'),
      jsonParam(input.analyticsPolicy, '{}'),
      jsonParam(input.retentionPolicy, '{}'),
      jsonParam(input.commercialHandoffPolicy, '{}'),
    ],
  )

  
return rows[0]
}

export const getFormVersionById = async (formVersionId: string): Promise<FormVersionRow | null> => {
  const rows = await query<FormVersionRow>(
    `SELECT * FROM greenhouse_growth.form_version WHERE form_version_id = $1`,
    [formVersionId],
  )

  
return rows[0] ?? null
}

export const listVersionsForForm = async (formId: string): Promise<FormVersionRow[]> =>
  query<FormVersionRow>(
    `SELECT * FROM greenhouse_growth.form_version WHERE form_id = $1 ORDER BY version DESC`,
    [formId],
  )

export const getPublishedVersionBySlug = async (slug: string): Promise<FormVersionRow | null> => {
  const rows = await query<FormVersionRow>(
    `SELECT v.* FROM greenhouse_growth.form_version v
       JOIN greenhouse_growth.form_definition d ON d.form_id = v.form_id
     WHERE d.slug = $1 AND v.status = 'published' AND d.status = 'active'
     ORDER BY v.version DESC LIMIT 1`,
    [slug],
  )

  
return rows[0] ?? null
}

/** Transición de lifecycle gobernada (publish/deprecate/archive). */
export const updateVersionStatus = async (
  formVersionId: string,
  status: 'review' | 'published' | 'deprecated' | 'archived' | 'draft',
  opts: { setPublishedAt?: boolean } = {},
): Promise<void> => {
  await query(
    `UPDATE greenhouse_growth.form_version
       SET status = $2${opts.setPublishedAt ? ', published_at = NOW()' : ''}
     WHERE form_version_id = $1`,
    [formVersionId, status],
  )
}

// ─── Destinations ─────────────────────────────────────────────────────────────

export interface InsertDestinationInput {
  formVersionId: string
  provider: string
  adapterKind?: string
  adapterVersion?: string
  endpointStatus?: string
  deliveryMode?: string
  mapping?: unknown
  consentRequirements?: unknown
  retryPolicy?: unknown
}

export const insertDestination = async (input: InsertDestinationInput): Promise<FormDestinationRow> => {
  const rows = await query<FormDestinationRow>(
    `INSERT INTO greenhouse_growth.form_destination (
       form_version_id, provider, adapter_kind, adapter_version, endpoint_status,
       delivery_mode, mapping_json, consent_requirements_json, retry_policy_json)
     VALUES ($1, $2, COALESCE($3,'fake_echo'), COALESCE($4,'fake-v1'), COALESCE($5,'supported'),
       COALESCE($6,'direct'), $7::jsonb, $8::jsonb, $9::jsonb)
     RETURNING *`,
    [
      input.formVersionId,
      input.provider,
      input.adapterKind ?? null,
      input.adapterVersion ?? null,
      input.endpointStatus ?? null,
      input.deliveryMode ?? null,
      jsonParam(input.mapping, '{}'),
      jsonParam(input.consentRequirements, '{}'),
      jsonParam(input.retryPolicy, '{}'),
    ],
  )

  
return rows[0]
}

export const listDestinationsForVersion = async (formVersionId: string): Promise<FormDestinationRow[]> =>
  query<FormDestinationRow>(
    `SELECT * FROM greenhouse_growth.form_destination WHERE form_version_id = $1 ORDER BY created_at ASC`,
    [formVersionId],
  )

export const setDestinationEnabled = async (destinationId: string, enabled: boolean): Promise<void> => {
  await query(`UPDATE greenhouse_growth.form_destination SET enabled = $2 WHERE destination_id = $1`, [
    destinationId,
    enabled,
  ])
}

// ─── Host surfaces ────────────────────────────────────────────────────────────

export interface UpsertHostSurfaceInput {
  surfaceId?: string
  surfaceKind: string
  surfaceName: string
  originAllowlist: string[]
  allowedFormSlugs: string[]
  embedKeyId?: string | null
  embedKeyHash?: string | null
  rendererChannel?: string
  cspRequirements?: unknown
  status?: string
}

export const insertHostSurface = async (input: UpsertHostSurfaceInput): Promise<FormHostSurfaceRow> => {
  const rows = await query<FormHostSurfaceRow>(
    // TASK-1375 — honra `surfaceId` si viene (id estable p.ej. `fhsf-web-agentica-ebook`); si no,
    // usa el DEFAULT (`fhsf-` || gen_random_uuid()). Aditivo/backward-compatible.
    `INSERT INTO greenhouse_growth.form_host_surface (
       surface_id, surface_kind, surface_name, origin_allowlist_json, allowed_form_slugs_json,
       embed_key_id, embed_key_hash, renderer_channel, csp_requirements_json, status)
     VALUES (COALESCE($1, 'fhsf-' || gen_random_uuid()::text), $2, $3, $4::jsonb, $5::jsonb, $6, $7, COALESCE($8,'stable'), $9::jsonb, COALESCE($10,'active'))
     RETURNING *`,
    [
      input.surfaceId ?? null,
      input.surfaceKind,
      input.surfaceName,
      JSON.stringify(input.originAllowlist),
      JSON.stringify(input.allowedFormSlugs),
      input.embedKeyId ?? null,
      input.embedKeyHash ?? null,
      input.rendererChannel ?? null,
      jsonParam(input.cspRequirements, '{}'),
      input.status ?? null,
    ],
  )


return rows[0]
}

export const getHostSurfaceById = async (surfaceId: string): Promise<FormHostSurfaceRow | null> => {
  const rows = await query<FormHostSurfaceRow>(
    `SELECT * FROM greenhouse_growth.form_host_surface WHERE surface_id = $1`,
    [surfaceId],
  )

  
return rows[0] ?? null
}

export const listHostSurfaces = async (): Promise<FormHostSurfaceRow[]> =>
  query<FormHostSurfaceRow>(`SELECT * FROM greenhouse_growth.form_host_surface ORDER BY created_at DESC`)

/**
 * TASK-1335 — Unión gobernada de origins para el transporte CORS público.
 *
 * SoT único = `form_host_surface`: devuelve los origins DISTINTOS declarados por las
 * surfaces `active`. Es surface-agnóstico a propósito (el preflight `OPTIONS /submit`
 * no lleva `surfaceId`, así que el transporte no puede depender de una surface puntual);
 * la autoridad fina por-surface (origin + slug + surface) sigue server-side en el command.
 * Lean: solo la columna necesaria, sin traer filas completas al hot path público.
 */
export const listActivePublicFormOrigins = async (): Promise<string[]> => {
  const rows = await query<{ origin: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(origin_allowlist_json) AS origin
       FROM greenhouse_growth.form_host_surface
      WHERE status = 'active'`,
  )

  return rows.map(row => row.origin).filter((origin): origin is string => typeof origin === 'string' && origin.length > 0)
}

export const setHostSurfaceStatus = async (
  surfaceId: string,
  status: 'active' | 'paused' | 'archived',
): Promise<void> => {
  await query(`UPDATE greenhouse_growth.form_host_surface SET status = $2 WHERE surface_id = $1`, [surfaceId, status])
}

/**
 * TASK-1258 — Setea (rota) la credencial per-site de una surface: persiste el
 * `embed_key_id` (público) + `embed_key_hash` (sha256 del secreto). El secreto crudo
 * NUNCA toca la DB. Devuelve la surface actualizada o null si el id no existe.
 */
export const updateHostSurfaceEmbedKey = async (
  surfaceId: string,
  embedKeyId: string,
  embedKeyHash: string,
): Promise<FormHostSurfaceRow | null> => {
  const rows = await query<FormHostSurfaceRow>(
    `UPDATE greenhouse_growth.form_host_surface
       SET embed_key_id = $2, embed_key_hash = $3, updated_at = NOW()
     WHERE surface_id = $1
     RETURNING *`,
    [surfaceId, embedKeyId, embedKeyHash],
  )


return rows[0] ?? null
}

// ─── Submissions (write path: in-tx submission + consent + outbox event) ──────

export interface PersistSubmissionInput {
  formId: string
  formVersionId: string
  surfaceId: string | null
  pageUri: string | null
  pageName: string | null
  leadEmailHash: string | null
  normalizedFields: Record<string, unknown>
  /** TASK-1255 — national_id cifrado (map fieldKey → envelope). Default `{}` (sin cédula). */
  encryptedFields?: Record<string, unknown>
  dedupeFingerprint: string | null
  requestId: string | null
  ipHash: string | null
  /** TASK-1254 — calidad del lead derivada de la verificación de email (nullable). */
  emailQuality?: 'verified' | 'suspect' | 'unknown' | null
  emailDomainClass?: 'corporate' | 'personal' | 'disposable' | null
  consent: {
    consentPolicyVersion: string
    legalBasis?: string
    checkboxes: unknown
    noticeTextHash?: string | null
    privacyUrl?: string | null
  }
}

/**
 * Persiste una submission ACEPTADA + su consent snapshot + el outbox event
 * `growth.forms.submission_accepted` en UNA transacción. La entrega al destino es
 * async (la drena el dispatcher), NUNCA inline (overlay #3 + CLAUDE.md outbox).
 */
export const persistAcceptedSubmission = async (input: PersistSubmissionInput): Promise<FormSubmissionRow> =>
  withTransaction(async client => {
    const submissionRows = await client.query(
      `INSERT INTO greenhouse_growth.form_submission (
         form_id, form_version_id, surface_id, page_uri, page_name, lead_email_hash,
         normalized_fields_json, encrypted_fields_json, status, dedupe_fingerprint, request_id, ip_hash,
         email_quality, email_domain_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, 'accepted', $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        input.formId,
        input.formVersionId,
        input.surfaceId,
        input.pageUri,
        input.pageName,
        input.leadEmailHash,
        JSON.stringify(input.normalizedFields),
        JSON.stringify(input.encryptedFields ?? {}),
        input.dedupeFingerprint,
        input.requestId,
        input.ipHash,
        input.emailQuality ?? null,
        input.emailDomainClass ?? null,
      ],
    )

    const submission = (submissionRows.rows as FormSubmissionRow[])[0]

    await client.query(
      `INSERT INTO greenhouse_growth.form_submission_consent_snapshot (
         submission_id, consent_policy_version, legal_basis, checkboxes_json,
         notice_text_hash, privacy_url)
       VALUES ($1, $2, COALESCE($3,'consent'), $4::jsonb, $5, $6)`,
      [
        submission.submission_id,
        input.consent.consentPolicyVersion,
        input.consent.legalBasis ?? null,
        JSON.stringify(input.consent.checkboxes ?? []),
        input.consent.noticeTextHash ?? null,
        input.consent.privacyUrl ?? null,
      ],
    )

    const payload: FormSubmissionAcceptedEventPayload = {
      schemaVersion: 1,
      submissionId: submission.submission_id,
      formId: submission.form_id,
      formVersionId: submission.form_version_id,
    }

    await publishOutboxEvent(
      {
        aggregateType: FORM_SUBMISSION_AGGREGATE,
        aggregateId: submission.submission_id,
        eventType: FORM_SUBMISSION_ACCEPTED_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return submission
  })

/** Submission rechazada: metadata operacional mínima, sin PII innecesaria. */
export const insertRejectedSubmission = async (input: {
  formId: string
  formVersionId: string
  surfaceId: string | null
  reasonClass: string
  requestId: string | null
}): Promise<FormSubmissionRow> => {
  const rows = await query<FormSubmissionRow>(
    `INSERT INTO greenhouse_growth.form_submission (
       form_id, form_version_id, surface_id, status, rejection_reason_class, request_id)
     VALUES ($1, $2, $3, 'rejected', $4, $5)
     RETURNING *`,
    [input.formId, input.formVersionId, input.surfaceId, input.reasonClass, input.requestId],
  )

  
return rows[0]
}

export const getSubmissionById = async (submissionId: string): Promise<FormSubmissionRow | null> => {
  const rows = await query<FormSubmissionRow>(
    `SELECT * FROM greenhouse_growth.form_submission WHERE submission_id = $1`,
    [submissionId],
  )


return rows[0] ?? null
}

/** TASK-1375 — el asset activo que entrega un form (una fila por form). SERVER-ONLY. */
export const getActiveFormAsset = async (formId: string): Promise<FormAssetRow | null> => {
  const rows = await query<FormAssetRow>(
    `SELECT * FROM greenhouse_growth.form_asset WHERE form_id = $1 AND active LIMIT 1`,
    [formId],
  )

  return rows[0] ?? null
}

export interface UpsertFormAssetInput {
  formId: string
  objectName: string
  fileName: string
  assetKind?: string
  contentType?: string
  ttlHours?: number
}

/**
 * TASK-1375 — Registra/reemplaza el asset entregable activo de un form (write gobernado).
 * Desactiva el asset activo previo (append-friendly; el índice parcial exige uno activo por
 * form) e inserta el nuevo. SERVER-ONLY: `object_name` nunca cruza al render contract.
 */
export const upsertActiveFormAsset = async (input: UpsertFormAssetInput): Promise<FormAssetRow> =>
  withTransaction(async tx => {
    await tx.query(
      `UPDATE greenhouse_growth.form_asset SET active = false, updated_at = NOW()
        WHERE form_id = $1 AND active`,
      [input.formId],
    )

    const rows = await tx.query<FormAssetRow>(
      `INSERT INTO greenhouse_growth.form_asset
         (form_id, asset_kind, object_name, file_name, content_type, ttl_hours, active)
       VALUES ($1, COALESCE($2,'ebook'), $3, $4, COALESCE($5,'application/pdf'), COALESCE($6,72), true)
       RETURNING *`,
      [
        input.formId,
        input.assetKind ?? null,
        input.objectName,
        input.fileName,
        input.contentType ?? null,
        input.ttlHours ?? null,
      ],
    )

    return rows.rows[0]
  })

export const listSubmissions = async (opts: { formId?: string; limit?: number } = {}): Promise<FormSubmissionRow[]> => {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500)

  if (opts.formId) {
    return query<FormSubmissionRow>(
      `SELECT * FROM greenhouse_growth.form_submission WHERE form_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [opts.formId, limit],
    )
  }

  
return query<FormSubmissionRow>(
    `SELECT * FROM greenhouse_growth.form_submission ORDER BY created_at DESC LIMIT $1`,
    [limit],
  )
}

export const updateSubmissionStatus = async (submissionId: string, status: string): Promise<void> => {
  await query(`UPDATE greenhouse_growth.form_submission SET status = $2 WHERE submission_id = $1`, [
    submissionId,
    status,
  ])
}

export const findRecentDuplicate = async (
  formId: string,
  dedupeFingerprint: string,
  windowMinutes = 60,
): Promise<FormSubmissionRow | null> => {
  const rows = await query<FormSubmissionRow>(
    `SELECT * FROM greenhouse_growth.form_submission
     WHERE form_id = $1 AND dedupe_fingerprint = $2
       AND created_at > NOW() - ($3 || ' minutes')::interval
     ORDER BY created_at DESC LIMIT 1`,
    [formId, dedupeFingerprint, String(windowMinutes)],
  )

  
return rows[0] ?? null
}

/** Conteo de submissions aceptadas por hash (email/ip) en una ventana — rate-limit. */
export const countAcceptedSubmissionsByHash = async (
  column: 'lead_email_hash' | 'ip_hash',
  value: string,
  windowMinutes = 1440,
): Promise<number> => {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.form_submission
     WHERE ${column} = $1 AND status = 'accepted'
       AND created_at > NOW() - ($2 || ' minutes')::interval`,
    [value, String(windowMinutes)],
  )

  
return Number(rows[0]?.n ?? 0)
}

/**
 * Submissions listas para (re)entrega: aceptadas o en retry cuyo `next_attempt_at`
 * venció. NUNCA incluye `delivered`/`dead_letter` (terminales) — at-most-once.
 */
export const listSubmissionsPendingDispatch = async (limit = 50): Promise<FormSubmissionRow[]> =>
  query<FormSubmissionRow>(
    `SELECT * FROM greenhouse_growth.form_submission
     WHERE status IN ('accepted', 'routed', 'retrying')
       AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
     ORDER BY created_at ASC LIMIT $1`,
    [Math.min(Math.max(limit, 1), 200)],
  )

/** Transición atómica del estado de entrega (status + contador + próximo retry). */
export const updateSubmissionDeliveryState = async (
  submissionId: string,
  input: { status: string; deliveryAttempts?: number; nextAttemptAt?: Date | null },
): Promise<void> => {
  await query(
    `UPDATE greenhouse_growth.form_submission
       SET status = $2,
           delivery_attempts = COALESCE($3, delivery_attempts),
           next_attempt_at = $4
     WHERE submission_id = $1`,
    [submissionId, input.status, input.deliveryAttempts ?? null, input.nextAttemptAt ?? null],
  )
}

// ─── Destination attempts (append-only ledger) ────────────────────────────────

export const insertAttempt = async (input: {
  submissionId: string
  destinationId: string
  provider: string
  adapterVersion: string
  status: string
  externalId?: string | null
  httpStatus?: number | null
  errorClass?: string | null
  retryCount?: number
}): Promise<FormDestinationAttemptRow> => {
  const rows = await query<FormDestinationAttemptRow>(
    `INSERT INTO greenhouse_growth.form_destination_attempt (
       submission_id, destination_id, provider, adapter_version, status,
       external_id, http_status, error_class, retry_count, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9,0),
       CASE WHEN $5 IN ('succeeded','failed','dead_letter') THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      input.submissionId,
      input.destinationId,
      input.provider,
      input.adapterVersion,
      input.status,
      input.externalId ?? null,
      input.httpStatus ?? null,
      input.errorClass ?? null,
      input.retryCount ?? 0,
    ],
  )

  
return rows[0]
}

export const listAttemptsForSubmission = async (submissionId: string): Promise<FormDestinationAttemptRow[]> =>
  query<FormDestinationAttemptRow>(
    `SELECT * FROM greenhouse_growth.form_destination_attempt WHERE submission_id = $1 ORDER BY created_at ASC`,
    [submissionId],
  )

export type FormConsentSnapshotRow = {
  submission_id: string
  consent_policy_version: string
  legal_basis: string
  checkboxes_json: unknown
  notice_text_hash: string | null
  privacy_url: string | null
  created_at: Date
}

export const getConsentSnapshot = async (submissionId: string): Promise<FormConsentSnapshotRow | null> => {
  const rows = await query<FormConsentSnapshotRow>(
    `SELECT * FROM greenhouse_growth.form_submission_consent_snapshot WHERE submission_id = $1`,
    [submissionId],
  )

  
return rows[0] ?? null
}

/**
 * Versión del adapter de test/fake (echo + hubspot-en-modo-fake). Los smoke/tests escriben
 * attempts con esta versión en la PG compartida; NUNCA deben contar en un signal de producción.
 * SSOT del discriminador de test para `countDeadLetterAttempts`.
 */
export const FAKE_ADAPTER_VERSION = 'fake-v1'

/**
 * SSOT del conteo de dead-letters VIGENTES (alimenta `growth.forms.dead_letter_count`).
 *
 * `form_destination_attempt` es append-only (TASK-1229: trigger bloquea DELETE), así que un
 * `COUNT(*)` crudo de `status='dead_letter'` es un ratchet de una sola vía que nunca vuelve a 0.
 * Definición canónica de "dead-letter vigente":
 *   1. status='dead_letter';
 *   2. adapter REAL (excluye `FAKE_ADAPTER_VERSION` — fixtures de test no manchan un signal prod);
 *   3. sin un `succeeded` posterior para el mismo (submission_id, destination_id) — recovery-aware:
 *      cuando exista un replay/requeue que appende un `succeeded`, el signal se auto-limpia.
 * Un dead-letter de adapter real NUNCA se excluye (los adapters reales usan otra versión).
 */
export const countDeadLetterAttempts = async (): Promise<number> => {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM greenhouse_growth.form_destination_attempt a
      WHERE a.status = 'dead_letter'
        AND a.adapter_version <> $1
        AND NOT EXISTS (
          SELECT 1
            FROM greenhouse_growth.form_destination_attempt s
           WHERE s.submission_id = a.submission_id
             AND s.destination_id = a.destination_id
             AND s.status = 'succeeded'
             AND s.created_at > a.created_at
        )`,
    [FAKE_ADAPTER_VERSION],
  )


return Number(rows[0]?.n ?? 0)
}

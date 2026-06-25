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
  name: string
  formKind: string
  purpose: string
  riskProfile: string
  ownerTeam?: string | null
  defaultLocale?: string
  createdBy?: string | null
}

export const insertFormDefinition = async (input: InsertFormDefinitionInput): Promise<FormDefinitionRow> => {
  const rows = await query<FormDefinitionRow>(
    `INSERT INTO greenhouse_growth.form_definition
       (slug, name, form_kind, purpose, risk_profile, owner_team, default_locale, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'es-CL'), $8)
     RETURNING *`,
    [
      input.slug,
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
    `INSERT INTO greenhouse_growth.form_host_surface (
       surface_kind, surface_name, origin_allowlist_json, allowed_form_slugs_json,
       embed_key_id, embed_key_hash, renderer_channel, csp_requirements_json, status)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, COALESCE($7,'stable'), $8::jsonb, COALESCE($9,'active'))
     RETURNING *`,
    [
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

export const setHostSurfaceStatus = async (
  surfaceId: string,
  status: 'active' | 'paused' | 'archived',
): Promise<void> => {
  await query(`UPDATE greenhouse_growth.form_host_surface SET status = $2 WHERE surface_id = $1`, [surfaceId, status])
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
  dedupeFingerprint: string | null
  requestId: string | null
  ipHash: string | null
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
         normalized_fields_json, status, dedupe_fingerprint, request_id, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'accepted', $8, $9, $10)
       RETURNING *`,
      [
        input.formId,
        input.formVersionId,
        input.surfaceId,
        input.pageUri,
        input.pageName,
        input.leadEmailHash,
        JSON.stringify(input.normalizedFields),
        input.dedupeFingerprint,
        input.requestId,
        input.ipHash,
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

export const countDeadLetterAttempts = async (): Promise<number> => {
  const rows = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM greenhouse_growth.form_destination_attempt WHERE status = 'dead_letter'`,
  )

  
return Number(rows[0]?.n ?? 0)
}

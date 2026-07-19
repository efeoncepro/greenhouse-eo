/**
 * TASK-1339 — Growth CTA engine: data-access canónico (greenhouse_growth.cta_*).
 *
 * Único punto de acceso a las 4 tablas del motor. Readers y commands construyen
 * sobre esto; ningún consumer (API/Nexa/MCP/CLI) toca SQL directo (Full API Parity).
 * Las transiciones de lifecycle emiten el outbox event in-tx (misma transacción que
 * el cambio de estado — patrón outbox canónico).
 */
import 'server-only'

import { query, withTransaction } from '@/lib/db'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  CTA_SURFACE_AGGREGATE,
  CTA_SURFACE_REGISTERED_EVENT,
  CTA_VERSION_AGGREGATE,
  CTA_VERSION_LIFECYCLE_EVENT,
  type CtaSurfaceKind,
  type CtaSurfaceRegisteredEventPayload,
  type CtaVersionLifecycleEventPayload,
  type CtaVersionStatus,
} from './contracts'

// ─── Row shapes (lean; mapeados desde greenhouse_growth.cta_*) ────────────────

export type CtaDefinitionRow = {
  cta_id: string
  slug: string
  name: string
  purpose: string
  owner_team: string | null
  campaign_slug: string | null
  status: string
  default_locale: string
  created_by: string | null
  created_at: Date
  updated_at: Date
}

export type CtaVersionRow = {
  cta_version_id: string
  cta_id: string
  version: number
  status: string
  locale: string
  placement: string
  style_variant: string | null
  copy_refs_json: unknown
  content_json: unknown
  visual_asset_ref: string | null
  action_policy_json: unknown
  targeting_policy_json: unknown
  suppression_policy_json: unknown
  priority_policy_json: unknown
  analytics_policy_json: unknown
  experiment_policy_json: unknown
  published_at: Date | null
  created_at: Date
}

export type CtaSurfaceBindingRow = {
  surface_id: string
  surface_kind: string
  surface_name: string
  origin_allowlist_json: unknown
  allowed_cta_slugs_json: unknown
  embed_key_id: string | null
  embed_key_hash: string | null
  renderer_channel: string
  status: string
  created_at: Date
  updated_at: Date
}

export type CtaConversionEventRow = {
  event_id: string
  cta_id: string | null
  cta_version_id: string | null
  surface_id: string | null
  page_uri: string | null
  placement: string | null
  trigger_kind: string | null
  variant_id: string | null
  action_kind: string | null
  event_kind: string
  visitor_key_hash: string | null
  session_key_hash: string | null
  ip_hash: string | null
  consent_state: string | null
  consent_source: string | null
  utm_json: unknown
  referrer_domain: string | null
  trust_level: string
  ingest_status: string
  rejection_reason_class: string | null
  dedupe_fingerprint: string | null
  form_submission_id: string | null
  event_payload_json: unknown
  created_at: Date
}

/** Candidato del arbiter: versión published + campos de la definición activa. */
export type CtaPublishedCandidateRow = CtaVersionRow & {
  slug: string
  campaign_slug: string | null
  default_locale: string
}

// ─── Definitions ──────────────────────────────────────────────────────────────

export const getCtaDefinitionBySlug = async (slug: string): Promise<CtaDefinitionRow | null> => {
  const rows = await query<CtaDefinitionRow>(
    `SELECT * FROM greenhouse_growth.cta_definition WHERE slug = $1`,
    [slug],
  )

  return rows[0] ?? null
}

export const getCtaDefinitionById = async (ctaId: string): Promise<CtaDefinitionRow | null> => {
  const rows = await query<CtaDefinitionRow>(
    `SELECT * FROM greenhouse_growth.cta_definition WHERE cta_id = $1`,
    [ctaId],
  )

  return rows[0] ?? null
}

export const listCtaDefinitions = async (): Promise<CtaDefinitionRow[]> => {
  const rows = await query<CtaDefinitionRow>(
    `SELECT * FROM greenhouse_growth.cta_definition ORDER BY created_at DESC`,
  )

  return rows
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export const getCtaVersionById = async (ctaVersionId: string): Promise<CtaVersionRow | null> => {
  const rows = await query<CtaVersionRow>(
    `SELECT * FROM greenhouse_growth.cta_version WHERE cta_version_id = $1`,
    [ctaVersionId],
  )

  return rows[0] ?? null
}

export const listVersionsForCta = async (ctaId: string): Promise<CtaVersionRow[]> => {
  const rows = await query<CtaVersionRow>(
    `SELECT * FROM greenhouse_growth.cta_version WHERE cta_id = $1 ORDER BY version DESC`,
    [ctaId],
  )

  return rows
}

export interface AuthorCtaDraftInput {
  slug: string
  name: string
  purpose: string
  ownerTeam?: string | null
  campaignSlug?: string | null
  defaultLocale?: string
  createdBy?: string | null
  locale?: string
  placement: string
  styleVariant?: string | null
  copyRefs?: Record<string, unknown>
  content: Record<string, unknown>
  visualAssetRef?: string | null
  actionPolicy: Record<string, unknown>
  targetingPolicy: Record<string, unknown>
  suppressionPolicy?: Record<string, unknown>
  priorityPolicy?: Record<string, unknown>
  analyticsPolicy?: Record<string, unknown>
  experimentPolicy?: Record<string, unknown>
}

/**
 * Upsert de la definición por slug + INSERT de una versión draft nueva (número
 * siguiente), en una tx. Emite el outbox event de lifecycle (null → draft) in-tx.
 */
export const insertCtaDraft = async (
  input: AuthorCtaDraftInput,
): Promise<{ ctaId: string; ctaVersionId: string; version: number }> =>
  withTransaction(async client => {
    const existing = await client.query<CtaDefinitionRow>(
      `SELECT * FROM greenhouse_growth.cta_definition WHERE slug = $1 FOR UPDATE`,
      [input.slug],
    )

    let ctaId: string

    if (existing.rows[0]) {
      ctaId = existing.rows[0].cta_id
    } else {
      const inserted = await client.query<{ cta_id: string }>(
        `INSERT INTO greenhouse_growth.cta_definition
           (slug, name, purpose, owner_team, campaign_slug, default_locale, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING cta_id`,
        [
          input.slug,
          input.name,
          input.purpose,
          input.ownerTeam ?? null,
          input.campaignSlug ?? null,
          input.defaultLocale ?? 'es-CL',
          input.createdBy ?? null,
        ],
      )

      ctaId = inserted.rows[0].cta_id
    }

    const nextVersion = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM greenhouse_growth.cta_version WHERE cta_id = $1`,
      [ctaId],
    )

    const version = Number(nextVersion.rows[0]?.next ?? 1)

    const insertedVersion = await client.query<{ cta_version_id: string }>(
      `INSERT INTO greenhouse_growth.cta_version
         (cta_id, version, status, locale, placement, style_variant, copy_refs_json, content_json,
          visual_asset_ref, action_policy_json, targeting_policy_json, suppression_policy_json,
          priority_policy_json, analytics_policy_json, experiment_policy_json)
       VALUES ($1, $2, 'draft', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING cta_version_id`,
      [
        ctaId,
        version,
        input.locale ?? input.defaultLocale ?? 'es-CL',
        input.placement,
        input.styleVariant ?? null,
        JSON.stringify(input.copyRefs ?? {}),
        JSON.stringify(input.content),
        input.visualAssetRef ?? null,
        JSON.stringify(input.actionPolicy),
        JSON.stringify(input.targetingPolicy),
        JSON.stringify(input.suppressionPolicy ?? {}),
        JSON.stringify(input.priorityPolicy ?? { score: 100 }),
        JSON.stringify(input.analyticsPolicy ?? {}),
        JSON.stringify(input.experimentPolicy ?? {}),
      ],
    )

    const ctaVersionId = insertedVersion.rows[0].cta_version_id

    const payload: CtaVersionLifecycleEventPayload = {
      schemaVersion: 1,
      ctaId,
      ctaVersionId,
      fromStatus: null,
      toStatus: 'draft',
    }

    await publishOutboxEvent(
      {
        aggregateType: CTA_VERSION_AGGREGATE,
        aggregateId: ctaVersionId,
        eventType: CTA_VERSION_LIFECYCLE_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return { ctaId, ctaVersionId, version }
  })

export interface TransitionResult {
  ok: boolean
  /** `invalid_transition` cuando el estado actual no está en `fromStatuses`; `not_found` si no existe. */
  reason?: 'not_found' | 'invalid_transition'
  fromStatus?: CtaVersionStatus
}

/**
 * Transición atómica de estado con guard optimista (WHERE status = esperado) +
 * outbox in-tx. `setPublishedAt` marca published_at (solo en la transición a
 * published la primera vez; el trigger de inmutabilidad congela el resto).
 */
export const transitionCtaVersionStatus = async (
  ctaVersionId: string,
  fromStatuses: CtaVersionStatus[],
  toStatus: CtaVersionStatus,
  options: { setPublishedAt?: boolean } = {},
): Promise<TransitionResult> =>
  withTransaction(async client => {
    const current = await client.query<{ cta_id: string; status: CtaVersionStatus }>(
      `SELECT cta_id, status FROM greenhouse_growth.cta_version WHERE cta_version_id = $1 FOR UPDATE`,
      [ctaVersionId],
    )

    const row = current.rows[0]

    if (!row) return { ok: false, reason: 'not_found' }

    if (!fromStatuses.includes(row.status)) {
      return { ok: false, reason: 'invalid_transition', fromStatus: row.status }
    }

    await client.query(
      options.setPublishedAt
        ? `UPDATE greenhouse_growth.cta_version SET status = $2, published_at = COALESCE(published_at, NOW()) WHERE cta_version_id = $1`
        : `UPDATE greenhouse_growth.cta_version SET status = $2 WHERE cta_version_id = $1`,
      [ctaVersionId, toStatus],
    )

    const payload: CtaVersionLifecycleEventPayload = {
      schemaVersion: 1,
      ctaId: row.cta_id,
      ctaVersionId,
      fromStatus: row.status,
      toStatus,
    }

    await publishOutboxEvent(
      {
        aggregateType: CTA_VERSION_AGGREGATE,
        aggregateId: ctaVersionId,
        eventType: CTA_VERSION_LIFECYCLE_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return { ok: true, fromStatus: row.status }
  })

/**
 * Publish atómico: si otra versión del MISMO CTA está published, la deprecia en la
 * misma tx antes de publicar (una sola published viva; el índice parcial único es la
 * defensa en profundidad). Emite outbox por CADA transición.
 */
export const publishCtaVersionAtomic = async (ctaVersionId: string): Promise<TransitionResult> =>
  withTransaction(async client => {
    const current = await client.query<{ cta_id: string; status: CtaVersionStatus }>(
      `SELECT cta_id, status FROM greenhouse_growth.cta_version WHERE cta_version_id = $1 FOR UPDATE`,
      [ctaVersionId],
    )

    const row = current.rows[0]

    if (!row) return { ok: false, reason: 'not_found' }

    if (row.status !== 'review') {
      return { ok: false, reason: 'invalid_transition', fromStatus: row.status }
    }

    const supersede = await client.query<{ cta_version_id: string }>(
      `UPDATE greenhouse_growth.cta_version
         SET status = 'deprecated'
       WHERE cta_id = $1 AND status = 'published' AND cta_version_id <> $2
       RETURNING cta_version_id`,
      [row.cta_id, ctaVersionId],
    )

    for (const superseded of supersede.rows) {
      const supersededPayload: CtaVersionLifecycleEventPayload = {
        schemaVersion: 1,
        ctaId: row.cta_id,
        ctaVersionId: superseded.cta_version_id,
        fromStatus: 'published',
        toStatus: 'deprecated',
      }

      await publishOutboxEvent(
        {
          aggregateType: CTA_VERSION_AGGREGATE,
          aggregateId: superseded.cta_version_id,
          eventType: CTA_VERSION_LIFECYCLE_EVENT,
          payload: supersededPayload as unknown as Record<string, unknown>,
        },
        client,
      )
    }

    await client.query(
      `UPDATE greenhouse_growth.cta_version
         SET status = 'published', published_at = COALESCE(published_at, NOW())
       WHERE cta_version_id = $1`,
      [ctaVersionId],
    )

    const payload: CtaVersionLifecycleEventPayload = {
      schemaVersion: 1,
      ctaId: row.cta_id,
      ctaVersionId,
      fromStatus: 'review',
      toStatus: 'published',
    }

    await publishOutboxEvent(
      {
        aggregateType: CTA_VERSION_AGGREGATE,
        aggregateId: ctaVersionId,
        eventType: CTA_VERSION_LIFECYCLE_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return { ok: true, fromStatus: 'review' }
  })

/**
 * Candidatos del arbiter para una surface: versiones published de definiciones
 * active, opcionalmente acotadas al allowlist de slugs de la surface. El match de
 * targeting/priority se evalúa en TS (arbiter); acá solo el fetch canónico.
 */
export const listPublishedCandidates = async (
  allowedSlugs: string[] | null,
): Promise<CtaPublishedCandidateRow[]> => {
  const rows = await query<CtaPublishedCandidateRow>(
    `SELECT v.*, d.slug, d.campaign_slug, d.default_locale
       FROM greenhouse_growth.cta_version v
       JOIN greenhouse_growth.cta_definition d ON d.cta_id = v.cta_id
      WHERE v.status = 'published'
        AND d.status = 'active'
        AND ($1::text[] IS NULL OR d.slug = ANY($1::text[]))
      ORDER BY d.slug ASC, v.version DESC`,
    [allowedSlugs && allowedSlugs.length > 0 ? allowedSlugs : null],
  )

  return rows
}

// ─── Surface bindings ─────────────────────────────────────────────────────────

export const getSurfaceBindingById = async (surfaceId: string): Promise<CtaSurfaceBindingRow | null> => {
  const rows = await query<CtaSurfaceBindingRow>(
    `SELECT * FROM greenhouse_growth.cta_surface_binding WHERE surface_id = $1`,
    [surfaceId],
  )

  return rows[0] ?? null
}

export const listSurfaceBindings = async (): Promise<CtaSurfaceBindingRow[]> => {
  const rows = await query<CtaSurfaceBindingRow>(
    `SELECT * FROM greenhouse_growth.cta_surface_binding ORDER BY created_at ASC`,
  )

  return rows
}

/** Unión de origins de surfaces active — alimenta el CORS data-driven de las rutas públicas. */
export const listActiveCtaOrigins = async (): Promise<string[]> => {
  const rows = await query<{ origin: string }>(
    `SELECT DISTINCT jsonb_array_elements_text(origin_allowlist_json) AS origin
       FROM greenhouse_growth.cta_surface_binding
      WHERE status = 'active'`,
  )

  return rows.map(row => row.origin).filter(origin => origin.length > 0)
}

export interface RegisterSurfaceInput {
  surfaceKind: CtaSurfaceKind
  surfaceName: string
  originAllowlist: string[]
  allowedCtaSlugs: string[]
  embedKeyId: string
  embedKeyHash: string
  rendererChannel?: string
}

/** Registra una surface con su credencial ya minteada. Emite outbox in-tx (sin secreto/hash en payload). */
export const insertSurfaceBinding = async (input: RegisterSurfaceInput): Promise<{ surfaceId: string }> =>
  withTransaction(async client => {
    const inserted = await client.query<{ surface_id: string }>(
      `INSERT INTO greenhouse_growth.cta_surface_binding
         (surface_kind, surface_name, origin_allowlist_json, allowed_cta_slugs_json,
          embed_key_id, embed_key_hash, renderer_channel)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING surface_id`,
      [
        input.surfaceKind,
        input.surfaceName,
        JSON.stringify(input.originAllowlist),
        JSON.stringify(input.allowedCtaSlugs),
        input.embedKeyId,
        input.embedKeyHash,
        input.rendererChannel ?? 'stable',
      ],
    )

    const surfaceId = inserted.rows[0].surface_id

    const payload: CtaSurfaceRegisteredEventPayload = {
      schemaVersion: 1,
      surfaceId,
      surfaceKind: input.surfaceKind,
    }

    await publishOutboxEvent(
      {
        aggregateType: CTA_SURFACE_AGGREGATE,
        aggregateId: surfaceId,
        eventType: CTA_SURFACE_REGISTERED_EVENT,
        payload: payload as unknown as Record<string, unknown>,
      },
      client,
    )

    return { surfaceId }
  })

/** Rota la credencial per-surface (persiste id + hash nuevos; el secreto se entrega UNA vez fuera). */
export const updateSurfaceEmbedKey = async (
  surfaceId: string,
  embedKeyId: string,
  embedKeyHash: string,
): Promise<boolean> => {
  const rows = await query<{ surface_id: string }>(
    `UPDATE greenhouse_growth.cta_surface_binding
        SET embed_key_id = $2, embed_key_hash = $3
      WHERE surface_id = $1
      RETURNING surface_id`,
    [surfaceId, embedKeyId, embedKeyHash],
  )

  return rows.length > 0
}

// ─── Conversion ledger (Tier A, append-only) ──────────────────────────────────

export interface InsertConversionEventInput {
  ctaId: string | null
  ctaVersionId: string | null
  surfaceId: string | null
  pageUri?: string | null
  placement?: string | null
  triggerKind?: string | null
  variantId?: string | null
  actionKind?: string | null
  eventKind: string
  visitorKeyHash?: string | null
  sessionKeyHash?: string | null
  ipHash?: string | null
  consentState?: string | null
  consentSource?: string | null
  utm?: Record<string, string>
  referrerDomain?: string | null
  trustLevel: string
  ingestStatus: 'accepted' | 'rejected'
  rejectionReasonClass?: string | null
  dedupeFingerprint?: string | null
  formSubmissionId?: string | null
  payload?: Record<string, unknown>
}

export const insertConversionEvent = async (input: InsertConversionEventInput): Promise<{ eventId: string }> => {
  const rows = await query<{ event_id: string }>(
    `INSERT INTO greenhouse_growth.cta_conversion_event
       (cta_id, cta_version_id, surface_id, page_uri, placement, trigger_kind, variant_id,
        action_kind, event_kind, visitor_key_hash, session_key_hash, ip_hash, consent_state,
        consent_source, utm_json, referrer_domain, trust_level, ingest_status,
        rejection_reason_class, dedupe_fingerprint, form_submission_id, event_payload_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
     RETURNING event_id`,
    [
      input.ctaId,
      input.ctaVersionId,
      input.surfaceId,
      input.pageUri ?? null,
      input.placement ?? null,
      input.triggerKind ?? null,
      input.variantId ?? null,
      input.actionKind ?? null,
      input.eventKind,
      input.visitorKeyHash ?? null,
      input.sessionKeyHash ?? null,
      input.ipHash ?? null,
      input.consentState ?? null,
      input.consentSource ?? null,
      JSON.stringify(input.utm ?? {}),
      input.referrerDomain ?? null,
      input.trustLevel,
      input.ingestStatus,
      input.rejectionReasonClass ?? null,
      input.dedupeFingerprint ?? null,
      input.formSubmissionId ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  )

  return { eventId: rows[0].event_id }
}

/** Conteo de eventos aceptados por hash (ventana) — alimenta el rate-limit del ingest. */
export const countAcceptedEventsByHash = async (
  column: 'ip_hash' | 'visitor_key_hash',
  hash: string,
  windowHours: number,
): Promise<number> => {
  const rows = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
       FROM greenhouse_growth.cta_conversion_event
      WHERE ${column} = $1
        AND ingest_status = 'accepted'
        AND created_at > NOW() - ($2 || ' hours')::interval`,
    [hash, String(windowHours)],
  )

  return rows[0]?.total ?? 0
}

/** Tope de escrituras de rechazo por IP (ventana 1h) — la forja no infla el ledger sin límite. */
export const countRejectedEventsByIp = async (ipHash: string | null): Promise<number> => {
  if (!ipHash) return 0

  const rows = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
       FROM greenhouse_growth.cta_conversion_event
      WHERE ip_hash = $1
        AND ingest_status = 'rejected'
        AND created_at > NOW() - INTERVAL '1 hour'`,
    [ipHash],
  )

  return rows[0]?.total ?? 0
}

/** Duplicado reciente por fingerprint (idempotencia observable: devuelve el evento existente). */
export const findRecentDuplicateEvent = async (
  fingerprint: string,
  windowMinutes: number,
): Promise<{ event_id: string } | null> => {
  const rows = await query<{ event_id: string }>(
    `SELECT event_id
       FROM greenhouse_growth.cta_conversion_event
      WHERE dedupe_fingerprint = $1
        AND ingest_status = 'accepted'
        AND created_at > NOW() - ($2 || ' minutes')::interval
      ORDER BY created_at DESC
      LIMIT 1`,
    [fingerprint, String(windowMinutes)],
  )

  return rows[0] ?? null
}

/**
 * Breadcrumb server-side de error operacional (render/handoff), deduplicado por día:
 * fuente PG de los signals `growth.cta.render_error_rate` / `form_handoff_failed`.
 * `server_confirmed` porque lo observa el servidor, no el browser. Best-effort: el
 * caller lo envuelve en try/catch (un fallo acá nunca rompe el read path).
 */
export const recordServerErrorEventOncePerDay = async (input: {
  ctaId: string | null
  ctaVersionId: string | null
  surfaceId: string | null
  reason: string
}): Promise<void> => {
  const rows = await query<{ event_id: string }>(
    `SELECT event_id
       FROM greenhouse_growth.cta_conversion_event
      WHERE event_kind = 'error'
        AND trust_level = 'server_confirmed'
        AND event_payload_json->>'reason' = $1
        AND cta_version_id IS NOT DISTINCT FROM $2
        AND created_at > NOW() - INTERVAL '1 day'
      LIMIT 1`,
    [input.reason, input.ctaVersionId],
  )

  if (rows[0]) return

  await insertConversionEvent({
    ctaId: input.ctaId,
    ctaVersionId: input.ctaVersionId,
    surfaceId: input.surfaceId,
    eventKind: 'error',
    trustLevel: 'server_confirmed',
    ingestStatus: 'accepted',
    payload: { reason: input.reason },
  })
}

/** Resumen de conversión de un CTA (reportes: SOLO server_confirmed cuenta como conversión). */
export interface CtaConversionSummary {
  eventKind: string
  trustLevel: string
  total: number
}

export const summarizeConversionEvents = async (ctaId: string): Promise<CtaConversionSummary[]> => {
  const rows = await query<{ event_kind: string; trust_level: string; total: number }>(
    `SELECT event_kind, trust_level, COUNT(*)::int AS total
       FROM greenhouse_growth.cta_conversion_event
      WHERE cta_id = $1 AND ingest_status = 'accepted'
      GROUP BY event_kind, trust_level
      ORDER BY event_kind, trust_level`,
    [ctaId],
  )

  return rows.map(row => ({ eventKind: row.event_kind, trustLevel: row.trust_level, total: row.total }))
}

/**
 * TASK-1430 — conteos del ledger Tier A por ventana (actual vs previa) para las
 * métricas de marketing del cockpit. Solo `ingest_status='accepted'`; el reader
 * decide qué kinds cuentan como conversión (server_confirmed, jamás `error`).
 */
export interface CtaEventWindowCount {
  window: 'current' | 'previous'
  eventKind: string
  trustLevel: string
  total: number
}

export const summarizeConversionEventWindows = async (
  ctaId: string,
  windowDays: number,
): Promise<CtaEventWindowCount[]> => {
  const rows = await query<{
    window_key: 'current' | 'previous'
    event_kind: string
    trust_level: string
    total: number
  }>(
    `SELECT CASE WHEN created_at > NOW() - ($2 || ' days')::interval THEN 'current' ELSE 'previous' END AS window_key,
            event_kind, trust_level, COUNT(*)::int AS total
       FROM greenhouse_growth.cta_conversion_event
      WHERE cta_id = $1
        AND ingest_status = 'accepted'
        AND created_at > NOW() - ($3 || ' days')::interval
      GROUP BY 1, 2, 3`,
    [ctaId, String(windowDays), String(windowDays * 2)],
  )

  return rows.map(row => ({
    window: row.window_key,
    eventKind: row.event_kind,
    trustLevel: row.trust_level,
    total: row.total,
  }))
}

/**
 * TASK-1430 — conteos del ledger DESDE un instante (ventana alineada de rates:
 * cuando el tracking de impresiones nació después que el de clics, el CTR
 * honesto se computa solo sobre el tramo donde AMBAS señales existen).
 */
export const summarizeAlignedEventCounts = async (
  ctaId: string,
  sinceIso: string,
): Promise<Array<{ eventKind: string; trustLevel: string; total: number }>> => {
  const rows = await query<{ event_kind: string; trust_level: string; total: number }>(
    `SELECT event_kind, trust_level, COUNT(*)::int AS total
       FROM greenhouse_growth.cta_conversion_event
      WHERE cta_id = $1
        AND ingest_status = 'accepted'
        AND created_at >= $2::timestamptz
      GROUP BY event_kind, trust_level`,
    [ctaId, sinceIso],
  )

  return rows.map(row => ({ eventKind: row.event_kind, trustLevel: row.trust_level, total: row.total }))
}

/** Timestamp del último evento accepted de un CTA (freshness del panel de métricas). */
export const getLastAcceptedEventAt = async (ctaId: string): Promise<string | null> => {
  const rows = await query<{ last_at: string | null }>(
    `SELECT MAX(created_at)::text AS last_at
       FROM greenhouse_growth.cta_conversion_event
      WHERE cta_id = $1 AND ingest_status = 'accepted'`,
    [ctaId],
  )

  return rows[0]?.last_at ?? null
}

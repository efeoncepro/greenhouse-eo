/**
 * TASK-1339 — Growth CTA & Popup Engine: contratos canónicos (browser-safe + server).
 *
 * Fuente: GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md §§7, 9-13, 16, 20.
 *
 * Un primitive, muchos consumers (Full API Parity): estos contratos los consumen el
 * renderer portable (TASK-1340), el admin cockpit futuro, Nexa/MCP y CLI.
 *
 * Frontera dura (browser-safe): el render contract NUNCA expone targeting, priority,
 * suppression, analytics/experiment policy, notas de campaña, scoring, destination
 * mapping ni PII. El browser recibe el resultado ya arbitrado (0–1 interruptivo +
 * N no-interruptivos), jamás el candidate set ni la política (arch §11).
 */
import { z } from 'zod'

/** Contrato runtime versionado (arch §7). */
export const CTA_CONTRACT_VERSION = 'greenhouse-growth-cta-popup.v1'

// ─── Enums de dominio (state machines vía CHECK en DB; espejo en TS) ───────────

export const CTA_DEFINITION_STATUSES = ['active', 'archived'] as const
export type CtaDefinitionStatus = (typeof CTA_DEFINITION_STATUSES)[number]

export const CTA_VERSION_STATUSES = ['draft', 'review', 'published', 'paused', 'deprecated', 'archived'] as const
export type CtaVersionStatus = (typeof CTA_VERSION_STATUSES)[number]

export const CTA_PLACEMENTS = [
  'embedded',
  'inline_banner',
  'sticky_banner',
  'slide_in',
  'popup_modal',
  'floating_button',
] as const
export type CtaPlacement = (typeof CTA_PLACEMENTS)[number]

/**
 * Clase interruptiva para el arbiter (arch §10/§11): a lo sumo UN prompt interruptivo
 * por página/sesión. `embedded`/`inline_banner` viven en el flujo del contenido y
 * `floating_button` nunca bloquea contenido → no-interruptivos.
 */
export const CTA_INTERRUPTIVE_PLACEMENTS = ['sticky_banner', 'slide_in', 'popup_modal'] as const

export const isInterruptivePlacement = (placement: CtaPlacement): boolean =>
  (CTA_INTERRUPTIVE_PLACEMENTS as readonly string[]).includes(placement)

export const CTA_SURFACE_KINDS = ['wordpress', 'astro', 'think', 'nextjs', 'generic_html'] as const
export type CtaSurfaceKind = (typeof CTA_SURFACE_KINDS)[number]

export const CTA_RENDERER_CHANNELS = ['stable', 'beta', 'preview'] as const
export type CtaRendererChannel = (typeof CTA_RENDERER_CHANNELS)[number]

export const CTA_SURFACE_STATUSES = ['active', 'paused', 'archived'] as const
export type CtaSurfaceStatus = (typeof CTA_SURFACE_STATUSES)[number]

/**
 * Acciones soportadas en esta rebanada vertical (arch §12/§18): SOLO `open_growth_form`.
 * `embed_growth_form`/`download_asset`/`book_meeting`/`hubspot_handoff`/etc. llegan por
 * tasks futuras — extender este enum + el action router juntos.
 */
export const CTA_ACTION_KINDS = ['open_growth_form'] as const
export type CtaActionKind = (typeof CTA_ACTION_KINDS)[number]

/** Tier A — evidencia de conversión audit-grade (arch §9.4). Exposición (eligible/suppressed/viewed) es Tier B, FUERA de este ledger. */
export const CTA_EVENT_KINDS = [
  'clicked',
  'action_started',
  'action_completed',
  'form_opened',
  'form_submitted',
  'dismissed',
  'error',
] as const
export type CtaEventKind = (typeof CTA_EVENT_KINDS)[number]

export const CTA_TRUST_LEVELS = ['browser_reported', 'server_confirmed'] as const
export type CtaTrustLevel = (typeof CTA_TRUST_LEVELS)[number]

export const CTA_CONSENT_STATES = ['granted', 'denied', 'unknown'] as const
export type CtaConsentState = (typeof CTA_CONSENT_STATES)[number]

// ─── Server-side policies (persisten en cta_version; NUNCA cruzan al browser) ──

/** Política de acción (server). `formRef` = slug o form_key del Growth Form; el CTA guarda SOLO la relación (arch §12: nunca copia schema/validación/consent). */
export const ctaActionPolicySchema = z.object({
  kind: z.enum(CTA_ACTION_KINDS),
  formRef: z.string().min(1).max(200),
})
export type CtaActionPolicy = z.infer<typeof ctaActionPolicySchema>

/**
 * Targeting V1 (server): patrones de ruta glob-lite (`/**`, `/blog/**`, exactos).
 * Inputs coarse permitidos por arch §11; NUNCA PII ni atributos sensibles.
 */
export const ctaTargetingPolicySchema = z.object({
  routes: z.array(z.string().min(1).max(300)).min(1).default(['/**']),
  excludeRoutes: z.array(z.string().min(1).max(300)).default([]),
})
export type CtaTargetingPolicy = z.infer<typeof ctaTargetingPolicySchema>

/** Priority V1 (server): score entero; el arbiter ordena desc (arch §11). */
export const ctaPriorityPolicySchema = z.object({
  score: z.number().int().min(0).max(1000).default(100),
})
export type CtaPriorityPolicy = z.infer<typeof ctaPriorityPolicySchema>

// ─── Contenido browser-safe del prompt ─────────────────────────────────────────

export const ctaContentSchema = z.object({
  eyebrow: z.string().max(80).optional(),
  headline: z.string().min(1).max(200),
  body: z.string().max(600).optional(),
  ctaLabel: z.string().min(1).max(80),
  dismissLabel: z.string().max(60).optional(),
  footnote: z.string().max(200).optional(),
})
export type CtaContent = z.infer<typeof ctaContentSchema>

// ─── Render contract — LO ÚNICO que cruza al browser (arch §9.2/§16) ───────────

/** Acción ya resuelta server-side: refs browser-safe del form (slug + key estable). */
export const ctaRenderActionSchema = z.object({
  kind: z.literal('open_growth_form'),
  formSlug: z.string().min(1),
  formKey: z.string().optional(),
})
export type CtaRenderAction = z.infer<typeof ctaRenderActionSchema>

export const ctaRenderContractSchema = z.object({
  contractVersion: z.literal(CTA_CONTRACT_VERSION),
  cta: z.object({
    ctaId: z.string(),
    slug: z.string(),
    campaignSlug: z.string().nullable().default(null),
    ctaVersionId: z.string(),
    version: z.number().int(),
    locale: z.string(),
  }),
  placement: z.enum(CTA_PLACEMENTS),
  interruptive: z.boolean(),
  styleVariant: z.string().optional(),
  content: ctaContentSchema,
  action: ctaRenderActionSchema,
  visualAssetRef: z.string().optional(),
  /** Metadata de variante (experimentación powered DIFERIDA fuera de V1 — ADR §Deferred). */
  variantId: z.string().default('control'),
  surfacePolicy: z.object({
    surfaceId: z.string(),
    allowedOrigins: z.array(z.string()).default([]),
    rendererChannel: z.enum(CTA_RENDERER_CHANNELS).default('stable'),
  }),
})
export type CtaRenderContract = z.infer<typeof ctaRenderContractSchema>

/** Respuesta arbitrada del GET público: 0–1 interruptivo + N no-interruptivos (arch §11). */
export interface ArbitratedRenderResult {
  interruptive: CtaRenderContract | null
  nonInterruptive: CtaRenderContract[]
}

// ─── Public event ingest (POST body) — write forjable, tratado untrusted (§16.1) ──

/** Keys permitidas en `payload` (allowlist dura; sin PII). */
export const CTA_EVENT_PAYLOAD_ALLOWED_KEYS = ['reason', 'step', 'durationMs'] as const

/** Keys UTM permitidas (allowlist dura). */
export const CTA_UTM_ALLOWED_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

export const ctaPublicEventInputSchema = z.object({
  surfaceId: z.string().min(1).max(100),
  embedKey: z.string().min(1).max(200),
  ctaSlug: z.string().min(1).max(200),
  ctaVersionId: z.string().min(1).max(100),
  eventKind: z.enum(CTA_EVENT_KINDS),
  pageUri: z.string().max(2000).optional(),
  placement: z.enum(CTA_PLACEMENTS).optional(),
  trigger: z.string().max(60).optional(),
  variantId: z.string().max(60).optional(),
  actionKind: z.enum(CTA_ACTION_KINDS).optional(),
  /** Identificador pseudónimo generado por el renderer; se hashea server-side, NUNCA se persiste crudo. */
  visitorKey: z.string().max(200).optional(),
  sessionKey: z.string().max(200).optional(),
  consentState: z.enum(CTA_CONSENT_STATES).default('unknown'),
  /** De dónde viene el consent (arch §16.2): p.ej. `gtm_consent_mode`, `host_cmp`, `none`. */
  consentSource: z.string().max(60).default('none'),
  utm: z.record(z.string(), z.string().max(300)).default({}),
  referrerDomain: z.string().max(200).optional(),
  /** Join de reconciliación con Growth Forms (submission server-aceptada); browser-reported hasta confirmación server. */
  formSubmissionId: z.string().max(100).optional(),
  payload: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean()])).default({}),
})
export type CtaPublicEventInput = z.infer<typeof ctaPublicEventInputSchema>

/** Outcomes del ingest público (mapeados a HTTP status en la route). */
export const CTA_PUBLIC_EVENT_OUTCOMES = [
  'accepted',
  'invalid',
  'surface_unauthorized',
  'rate_limited',
  'disabled',
  'error',
] as const
export type CtaPublicEventOutcome = (typeof CTA_PUBLIC_EVENT_OUTCOMES)[number]

export interface CtaPublicEventResult {
  outcome: CtaPublicEventOutcome
  eventId?: string
  reason?: string
}

/** Clases de rechazo persistidas sin PII en el ledger (fuente del signal de forja §16.1). */
export const CTA_INGEST_REJECTION_REASONS = [
  'surface_unknown_or_inactive',
  'embed_key_invalid',
  'origin_denied',
  'surface_version_mismatch',
  'version_not_live',
] as const
export type CtaIngestRejectionReason = (typeof CTA_INGEST_REJECTION_REASONS)[number]

// ─── Outbox events canónicos del motor (internos growth.cta.*, §13) ────────────

/** Transición de lifecycle de una versión; se emite in-tx con la transición. Payload v1. */
export const CTA_VERSION_LIFECYCLE_EVENT = 'growth.cta.version_lifecycle_changed' as const
export const CTA_VERSION_AGGREGATE = 'growth_cta_version' as const

export interface CtaVersionLifecycleEventPayload {
  schemaVersion: 1
  ctaId: string
  ctaVersionId: string
  fromStatus: CtaVersionStatus | null
  toStatus: CtaVersionStatus
}

/** Registro/rotación de credencial de una surface. Payload v1 (NUNCA lleva el secreto ni el hash). */
export const CTA_SURFACE_REGISTERED_EVENT = 'growth.cta.surface_registered' as const
export const CTA_SURFACE_AGGREGATE = 'growth_cta_surface' as const

export interface CtaSurfaceRegisteredEventPayload {
  schemaVersion: 1
  surfaceId: string
  surfaceKind: CtaSurfaceKind
}

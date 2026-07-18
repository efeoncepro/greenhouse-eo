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
 * Acciones soportadas (arch §12 + amendment 2026-07-18, TASK-1431): registry tipado
 * con `open_growth_form` + navegación gobernada. `download_asset`/`embed_growth_form`/
 * `hubspot_handoff` siguen siendo kinds de arquitectura pero gradúan como adapters
 * demand-driven — extender este enum + `action-registry.ts` + el espejo del renderer
 * JUNTOS (un kind sin entry registrado no publica ni renderiza: fail-closed).
 */
export const CTA_ACTION_KINDS = ['open_growth_form', 'link_url', 'open_think_tool', 'book_meeting'] as const
export type CtaActionKind = (typeof CTA_ACTION_KINDS)[number]

/** Kinds de la familia `navigate` (proyección href + newContext; executor anchor nativo). */
export const CTA_NAVIGATE_ACTION_KINDS = ['link_url', 'open_think_tool', 'book_meeting'] as const
export type CtaNavigateActionKind = (typeof CTA_NAVIGATE_ACTION_KINDS)[number]

// ─── Action registry — metadata browser-safe/read-only por kind (TASK-1431) ────

/**
 * Familia de ejecución del executor portable: `growth_form` monta el form gobernado
 * in-place; `navigate` es navegación real del browser (anchor nativo). El renderer
 * dispatchea SOLO por familia — nunca lógica por-kind duplicada en cada consumer.
 */
export const CTA_ACTION_EXECUTION_FAMILIES = ['growth_form', 'navigate'] as const
export type CtaActionExecutionFamily = (typeof CTA_ACTION_EXECUTION_FAMILIES)[number]

/** Expectativa de destino (expectation integrity: el label debe coincidir con esto). */
export const CTA_ACTION_DESTINATION_EXPECTATIONS = ['form', 'internal_page', 'think_tool', 'booking_page'] as const
export type CtaActionDestinationExpectation = (typeof CTA_ACTION_DESTINATION_EXPECTATIONS)[number]

/** Política de contexto de navegación. Default seguro: mismo contexto; `new_context_allowed` solo habilita el opt-in del autor, nunca lo impone. */
export const CTA_ACTION_NAVIGATION_CONTEXTS = ['same_context', 'new_context_allowed'] as const
export type CtaActionNavigationContext = (typeof CTA_ACTION_NAVIGATION_CONTEXTS)[number]

/** Taxonomía canónica de fallo de resolución (task §Security; sin raw error ni URL cruda). */
export const CTA_ACTION_FAILURE_REASONS = [
  'action_policy_invalid',
  'action_kind_unsupported',
  'action_destination_invalid',
  'action_destination_unavailable',
] as const
export type CtaActionFailureReason = (typeof CTA_ACTION_FAILURE_REASONS)[number]

/**
 * Metadata read-only por action kind, browser-safe: la consumen cockpit (TASK-1430),
 * preview, tests de parity y el executor SIN importar resolvers server-only. NUNCA
 * contiene appearance/placement/density/copy final/asset (eso es del CTA Experience
 * System + contenido gobernado) ni policy interna/destination mapping.
 */
export interface CtaActionKindMetadata {
  kind: CtaActionKind
  executionFamily: CtaActionExecutionFamily
  destinationExpectation: CtaActionDestinationExpectation
  navigationContext: CtaActionNavigationContext
  /** Derivado del adapter (¿continúa in-place dentro del shell?), no de la campaña. */
  supportsInlineContinuation: boolean
  /** Campos de policy requeridos para authoring programático (cockpit/Nexa/CLI). */
  requiredPolicyFields: readonly string[]
  /** Subconjunto de la taxonomía que este kind puede emitir al fallar la resolución. */
  failureReasons: readonly CtaActionFailureReason[]
  /** Valor allowlisted que viaja como `action_kind` en telemetría (jamás URL completa). */
  telemetryKind: CtaActionKind
}

export const CTA_ACTION_KIND_METADATA: Readonly<Record<CtaActionKind, CtaActionKindMetadata>> = {
  open_growth_form: {
    kind: 'open_growth_form',
    executionFamily: 'growth_form',
    destinationExpectation: 'form',
    navigationContext: 'same_context',
    supportsInlineContinuation: true,
    requiredPolicyFields: ['formRef'],
    failureReasons: ['action_policy_invalid', 'action_destination_unavailable'],
    telemetryKind: 'open_growth_form',
  },
  link_url: {
    kind: 'link_url',
    executionFamily: 'navigate',
    destinationExpectation: 'internal_page',
    navigationContext: 'new_context_allowed',
    supportsInlineContinuation: false,
    requiredPolicyFields: ['url'],
    failureReasons: ['action_policy_invalid', 'action_destination_invalid'],
    telemetryKind: 'link_url',
  },
  open_think_tool: {
    kind: 'open_think_tool',
    executionFamily: 'navigate',
    destinationExpectation: 'think_tool',
    navigationContext: 'new_context_allowed',
    supportsInlineContinuation: false,
    requiredPolicyFields: ['toolPath'],
    failureReasons: ['action_policy_invalid', 'action_destination_invalid', 'action_destination_unavailable'],
    telemetryKind: 'open_think_tool',
  },
  book_meeting: {
    kind: 'book_meeting',
    executionFamily: 'navigate',
    destinationExpectation: 'booking_page',
    navigationContext: 'new_context_allowed',
    supportsInlineContinuation: false,
    requiredPolicyFields: ['meetingUrl'],
    failureReasons: ['action_policy_invalid', 'action_destination_invalid'],
    telemetryKind: 'book_meeting',
  },
}

/** Espejo browser-safe kind→familia para el executor (parity test contra la metadata). */
export const CTA_ACTION_KIND_FAMILIES: Readonly<Record<CtaActionKind, CtaActionExecutionFamily>> = {
  open_growth_form: 'growth_form',
  link_url: 'navigate',
  open_think_tool: 'navigate',
  book_meeting: 'navigate',
}

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

/**
 * Tier B — kinds de exposición (TASK-1428, arch §9.4): el ingest público los acepta
 * tras la MISMA cadena de defensa que Tier A, pero van al rollup agregado
 * (`cta_exposure_rollup`), JAMÁS al ledger OLTP. `eligible`/`suppressed` los observa
 * el server en el render path; el browser solo aporta `viewed`.
 */
export const CTA_TIER_B_EVENT_KINDS = ['viewed'] as const
export type CtaTierBEventKind = (typeof CTA_TIER_B_EVENT_KINDS)[number]

/** Kinds aceptados por el ingest público (Tier A + Tier B; el pipeline decide el destino). */
export const CTA_PUBLIC_INGEST_EVENT_KINDS = [...CTA_EVENT_KINDS, ...CTA_TIER_B_EVENT_KINDS] as const
export type CtaPublicIngestEventKind = (typeof CTA_PUBLIC_INGEST_EVENT_KINDS)[number]

export const isTierBEventKind = (kind: string): kind is CtaTierBEventKind =>
  (CTA_TIER_B_EVENT_KINDS as readonly string[]).includes(kind)

export const CTA_TRUST_LEVELS = ['browser_reported', 'server_confirmed'] as const
export type CtaTrustLevel = (typeof CTA_TRUST_LEVELS)[number]

export const CTA_CONSENT_STATES = ['granted', 'denied', 'unknown'] as const
export type CtaConsentState = (typeof CTA_CONSENT_STATES)[number]

// ─── Server-side policies (persisten en cta_version; NUNCA cruzan al browser) ──

/** Policy `open_growth_form` (server). `formRef` = slug o form_key del Growth Form; el CTA guarda SOLO la relación (arch §12: nunca copia schema/validación/consent). */
export const ctaOpenGrowthFormPolicySchema = z.object({
  kind: z.literal('open_growth_form'),
  formRef: z.string().min(1).max(200),
})
export type CtaOpenGrowthFormPolicy = z.infer<typeof ctaOpenGrowthFormPolicySchema>

/** Keys UTM permitidas (allowlist dura; también gobierna el campaign context de Think). */
export const CTA_UTM_ALLOWED_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

/** Largo máximo de un destino autorado (espejo del límite del render action). */
export const CTA_ACTION_DESTINATION_MAX = 2000

/**
 * Policy `link_url` (server): destino root-relative o HTTPS. La validación de
 * gobernanza (protocolos peligrosos, credenciales embebidas, protocol-relative)
 * vive en el resolver del registry — el schema solo acota shape/largo.
 */
export const ctaLinkUrlPolicySchema = z.object({
  kind: z.literal('link_url'),
  url: z.string().min(1).max(CTA_ACTION_DESTINATION_MAX),
  /** Opt-in del autor a nueva pestaña/contexto (default seguro: mismo contexto). */
  openInNewContext: z.boolean().default(false),
})
export type CtaLinkUrlPolicy = z.infer<typeof ctaLinkUrlPolicySchema>

/**
 * Policy `open_think_tool` (server): path DENTRO del hub Think gobernado (el host
 * lo resuelve el registry — la policy jamás guarda un host arbitrario) + contexto
 * de campaña allowlisted (UTM-only, `.strict()`): nunca identidad directa ni PII.
 */
export const ctaOpenThinkToolPolicySchema = z.object({
  kind: z.literal('open_think_tool'),
  toolPath: z.string().min(1).max(500),
  campaignUtm: z
    .object({
      source: z.string().min(1).max(300).optional(),
      medium: z.string().min(1).max(300).optional(),
      campaign: z.string().min(1).max(300).optional(),
      term: z.string().min(1).max(300).optional(),
      content: z.string().min(1).max(300).optional(),
    })
    .strict()
    .default({}),
  openInNewContext: z.boolean().default(false),
})
export type CtaOpenThinkToolPolicy = z.infer<typeof ctaOpenThinkToolPolicySchema>

/**
 * Policy `book_meeting` (server): URL HTTPS de un host de booking gobernado
 * (allowlist en el registry). Navegación-only: NUNCA crea Contact/Deal/Meeting
 * por click (arch §12; el adapter CRM es demand-driven fuera de V1).
 */
export const ctaBookMeetingPolicySchema = z.object({
  kind: z.literal('book_meeting'),
  meetingUrl: z.string().min(1).max(CTA_ACTION_DESTINATION_MAX),
  openInNewContext: z.boolean().default(false),
})
export type CtaBookMeetingPolicy = z.infer<typeof ctaBookMeetingPolicySchema>

/**
 * Unión discriminada de action policies (TASK-1431). El shape por kind vive junto a
 * su entry del registry (`action-registry.ts` = SoT de validación server-side); esta
 * unión existe para tipado/authoring. NUNCA cruza al browser.
 */
export const ctaActionPolicySchema = z.discriminatedUnion('kind', [
  ctaOpenGrowthFormPolicySchema,
  ctaLinkUrlPolicySchema,
  ctaOpenThinkToolPolicySchema,
  ctaBookMeetingPolicySchema,
])
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

// ─── Suppression / visitor state (TASK-1428, arch §11/§16.2) ───────────────────

/**
 * Taxonomía ESTABLE de razones de suppression (server-only, task §Visitor-experience
 * policy). Al browser solo cruza el outcome mínimo; a Tier B va la reason class
 * allowlisted (enum cerrado espejado en el CHECK de `cta_exposure_rollup`).
 */
export const CTA_SUPPRESSION_REASONS = [
  'dismissed',
  'frequency_capped',
  'already_converted',
  'higher_priority_selected',
  'surface_killed',
  'global_killed',
  'consent_or_identity_limited',
  'placement_not_supported',
  'policy_invalid',
  'runtime_degraded',
] as const
export type CtaSuppressionReason = (typeof CTA_SUPPRESSION_REASONS)[number]

/** Sujetos del visitor state store: `visitor` = durable consent-gated; `session` = fallback conservador. */
export const CTA_VISITOR_SUBJECT_KINDS = ['visitor', 'session'] as const
export type CtaVisitorSubjectKind = (typeof CTA_VISITOR_SUBJECT_KINDS)[number]

/**
 * Suppression policy V1 (server; vive en `cta_version.suppression_policy_json`).
 * Defaults conservadores: `{}` (el default de toda versión foundation) ES una policy
 * válida con estos valores. Policy malformada ⇒ fail-closed (`policy_invalid`).
 *  - `dismissCooldownDays`: ventana de no-reaparición tras dismiss explícito (0 = sin cooldown).
 *  - `suppressAfterConversion`: suprime tras conversión server-verificada (`already_converted`).
 *  - `maxImpressionsPerWindow`/`windowHours`: frequency cap per-CTA (solo placements interruptivos).
 */
export const ctaSuppressionPolicySchema = z.object({
  dismissCooldownDays: z.number().int().min(0).max(365).default(14),
  suppressAfterConversion: z.boolean().default(true),
  maxImpressionsPerWindow: z.number().int().min(1).max(100).default(2),
  windowHours: z.number().int().min(1).max(2160).default(24),
})
export type CtaSuppressionPolicy = z.infer<typeof ctaSuppressionPolicySchema>

/**
 * Contexto pseudónimo del read público (headers `x-greenhouse-cta-visitor|session|consent|
 * consent-source`): keys crudas se hashean server-side y JAMÁS se persisten. La key
 * `visitor` solo habilita state durable con `consentState='granted'` (arch §16.2);
 * sin consentimiento el fallback es session-scoped (retención corta).
 */
export interface CtaVisitorContext {
  visitorKey: string | null
  sessionKey: string | null
  consentState: CtaConsentState
  consentSource: string
}

/** Outcome de la decisión server-side. El renderer solo representa; nunca reconstruye ventanas. */
export const CTA_SUPPRESSION_OUTCOMES = ['eligible', 'suppressed', 'capped', 'killed'] as const
export type CtaSuppressionOutcome = (typeof CTA_SUPPRESSION_OUTCOMES)[number]

export interface CtaSuppressionDecision {
  outcome: CtaSuppressionOutcome
  reason: CtaSuppressionReason | null
}

// ─── Tier B exposure (TASK-1428, arch §9.4) ────────────────────────────────────

export const CTA_EXPOSURE_KINDS = ['eligible', 'suppressed', 'viewed'] as const
export type CtaExposureKind = (typeof CTA_EXPOSURE_KINDS)[number]

export const CTA_EXPOSURE_DECISION_SOURCES = ['server', 'browser'] as const
export type CtaExposureDecisionSource = (typeof CTA_EXPOSURE_DECISION_SOURCES)[number]

/**
 * TASK-1430 — predicado canónico de binding surface↔CTA: una surface admite un
 * slug si su allowlist está vacía (admite todos) o lo incluye. Misma regla que
 * aplica el store en `listPublishedCandidates` (allowlist vacía ⇒ sin filtro);
 * el cockpit lo consume para mostrar bindings sin duplicar la regla inline.
 */
export const surfaceAllowsCtaSlug = (allowedSlugs: readonly string[], slug: string): boolean =>
  allowedSlugs.length === 0 || allowedSlugs.includes(slug)

// ─── Kill switch (TASK-1428, arch §16.3) ───────────────────────────────────────

export const CTA_KILL_SWITCH_SCOPES = ['global', 'surface'] as const
export type CtaKillSwitchScope = (typeof CTA_KILL_SWITCH_SCOPES)[number]

export const CTA_KILL_SWITCH_ACTIONS = ['engage', 'release'] as const
export type CtaKillSwitchAction = (typeof CTA_KILL_SWITCH_ACTIONS)[number]

/**
 * Estado del motor que cruza al browser: mínimo necesario para que el renderer
 * distinga "no hay CTAs" de "retiro operativo" (`killed`, nunca un falso `dismissed`).
 * Sin actor/reason/ventanas — eso es operador-only (readers admin).
 */
export const CTA_ENGINE_STATES = ['ok', 'killed'] as const
export type CtaEngineState = (typeof CTA_ENGINE_STATES)[number]

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

/** Acción `open_growth_form` ya resuelta server-side: refs browser-safe del form (slug + key estable). */
export const ctaRenderOpenGrowthFormActionSchema = z.object({
  kind: z.literal('open_growth_form'),
  formSlug: z.string().min(1),
  formKey: z.string().optional(),
})
export type CtaRenderOpenGrowthFormAction = z.infer<typeof ctaRenderOpenGrowthFormActionSchema>

/** Proyección navigate ya resuelta: href validado server-side + hint de contexto. */
const buildNavigateRenderActionSchema = <K extends CtaNavigateActionKind>(kind: K) =>
  z.object({
    kind: z.literal(kind),
    /** https absoluta o path root-relative — YA pasó la gobernanza del resolver. */
    href: z.string().min(1).max(CTA_ACTION_DESTINATION_MAX),
    /** true ⇒ el executor puede abrir nuevo contexto (con rel seguro obligatorio). */
    newContext: z.boolean(),
  })

export const ctaRenderLinkUrlActionSchema = buildNavigateRenderActionSchema('link_url')
export const ctaRenderOpenThinkToolActionSchema = buildNavigateRenderActionSchema('open_think_tool')
export const ctaRenderBookMeetingActionSchema = buildNavigateRenderActionSchema('book_meeting')

export type CtaRenderNavigateAction =
  | z.infer<typeof ctaRenderLinkUrlActionSchema>
  | z.infer<typeof ctaRenderOpenThinkToolActionSchema>
  | z.infer<typeof ctaRenderBookMeetingActionSchema>

/**
 * Unión discriminada de acciones YA resueltas (TASK-1431) — LO ÚNICO que cruza al
 * browser sobre la acción: kind + refs/href allowlisted + hints mínimos. Nunca la
 * policy, el destination mapping ni el candidate set.
 */
export const ctaRenderActionSchema = z.discriminatedUnion('kind', [
  ctaRenderOpenGrowthFormActionSchema,
  ctaRenderLinkUrlActionSchema,
  ctaRenderOpenThinkToolActionSchema,
  ctaRenderBookMeetingActionSchema,
])
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

/**
 * Respuesta arbitrada del GET público: 0–1 interruptivo + N no-interruptivos (arch §11).
 * `engineState` (TASK-1428) es aditivo: `killed` = retiro operativo (arch §16.3); el
 * renderer legacy que lo ignora sigue funcionando (resultado vacío = fail-closed).
 */
export interface ArbitratedRenderResult {
  interruptive: CtaRenderContract | null
  nonInterruptive: CtaRenderContract[]
  engineState?: CtaEngineState
}

// ─── Public event ingest (POST body) — write forjable, tratado untrusted (§16.1) ──

/** Keys permitidas en `payload` (allowlist dura; sin PII). */
export const CTA_EVENT_PAYLOAD_ALLOWED_KEYS = ['reason', 'step', 'durationMs'] as const

export const ctaPublicEventInputSchema = z.object({
  surfaceId: z.string().min(1).max(100),
  embedKey: z.string().min(1).max(200),
  ctaSlug: z.string().min(1).max(200),
  ctaVersionId: z.string().min(1).max(100),
  /** Tier A + Tier B (`viewed`): misma cadena de defensa; el pipeline separa el destino (§9.4). */
  eventKind: z.enum(CTA_PUBLIC_INGEST_EVENT_KINDS),
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

// ─── Telemetría browser (greenhouse_cta_*) — SoT de la familia (TASK-1340) ─────

/**
 * Eventos browser/host-facing del motor (arch §13). Namespace `greenhouse_cta_*`
 * DELIBERADAMENTE distinto del interno `growth.cta.*` (no armonizar) y del rail
 * legacy ad-hoc `gh_cta_clicked` de widgets WordPress pre-motor (deprecar-no-
 * renombrar; deslinde registrado en TRACKING-PLAN §CTAs). Espejo browser:
 * `RENDERER_GTM_EVENTS` en `src/growth-cta-renderer/telemetry.ts` (parity test).
 */
export const CTA_GTM_EVENT_NAMES = [
  'greenhouse_cta_viewed',
  'greenhouse_cta_clicked',
  'greenhouse_cta_dismissed',
  'greenhouse_cta_form_opened',
  'greenhouse_cta_form_submitted',
  'greenhouse_cta_error',
] as const
export type CtaGtmEventName = (typeof CTA_GTM_EVENT_NAMES)[number]

/**
 * Allowlist DURA de params de la familia CTA (doc 04 §2 + arch §13): identidad por
 * PARÁMETRO (`cta_id`/`cta_slug`/`cta_location`…), nunca un evento por superficie.
 * Sin PII, sin policies server-only. Espejo browser: `RENDERER_ALLOWED_PAYLOAD_KEYS`
 * (mismo archivo de telemetry; parity test los mantiene idénticos).
 */
export const CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS = [
  'event',
  'cta_id',
  'cta_slug',
  'cta_version_id',
  'cta_kind',
  'cta_location',
  'campaign_slug',
  'surface_id',
  'placement',
  'variant_id',
  'action_kind',
  'form_slug',
  'form_key',
  'form_submission_id',
  'reason_class',
  'renderer_version',
  'contract_version',
  'page_uri',
] as const
export type CtaTelemetryAllowedPayloadKey = (typeof CTA_TELEMETRY_ALLOWED_PAYLOAD_KEYS)[number]

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

/**
 * Cambio de kill switch global/per-surface (TASK-1428, arch §16.3); se emite in-tx
 * con el INSERT append-only en `cta_kill_switch_event`. Payload v1 (audit trail;
 * `actorRef` es identidad interna del operador, jamás cruza al browser).
 */
export const CTA_KILL_SWITCH_CHANGED_EVENT = 'growth.cta.kill_switch_changed' as const
export const CTA_KILL_SWITCH_AGGREGATE = 'growth_cta_kill_switch' as const

export interface CtaKillSwitchChangedEventPayload {
  schemaVersion: 1
  scope: CtaKillSwitchScope
  surfaceId: string | null
  action: CtaKillSwitchAction
  reason: string
  actorRef: string | null
}

/**
 * TASK-1229 — Growth Forms engine: contratos canónicos (browser-safe + server).
 *
 * Fuente: GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md §§8-21.
 *
 * Un primitive, muchos consumers (Full API Parity): estos contratos los consumen
 * el renderer portable (TASK-1231), el admin cockpit (TASK-1232), Nexa/MCP y CLI.
 *
 * Frontera dura (browser-safe): el `render_contract` y el `telemetryPolicy` NUNCA
 * exponen HubSpot property names, form GUIDs, destination mapping, URLs privadas,
 * secrets ni scoring server-only.
 */
import { z } from 'zod'

import { NAMED_VALIDATORS } from './validators/core'

// ─── Enums de dominio (state machines vía CHECK en DB; espejo en TS) ───────────

export const FORM_KINDS = [
  'subscribe',
  'lead_magnet',
  'contact',
  'diagnostic_intake',
  'quote_request',
  'pricing_simulation',
  'document_upload',
  'event_registration',
  'survey',
  'preference',
  'application',
] as const
export type FormKind = (typeof FORM_KINDS)[number]

export const RISK_PROFILES = ['low', 'medium', 'high', 'restricted'] as const
export type RiskProfile = (typeof RISK_PROFILES)[number]

export const FORM_DEFINITION_STATUSES = ['active', 'archived'] as const
export type FormDefinitionStatus = (typeof FORM_DEFINITION_STATUSES)[number]

export const FORM_VERSION_STATUSES = ['draft', 'review', 'published', 'deprecated', 'archived'] as const
export type FormVersionStatus = (typeof FORM_VERSION_STATUSES)[number]

export const SUBMISSION_STATUSES = [
  'received',
  'validated',
  'accepted',
  'rejected',
  'routed',
  'delivered',
  'destination_failed',
  'retrying',
  'dead_letter',
] as const
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const ATTEMPT_STATUSES = ['pending', 'succeeded', 'retrying', 'failed', 'dead_letter'] as const
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number]

export const DESTINATION_PROVIDERS = ['hubspot', 'crm_contact', 'email', 'webhook', 'greenhouse_only'] as const
export type DestinationProvider = (typeof DESTINATION_PROVIDERS)[number]

export const DELIVERY_MODES = ['direct', 'after_review', 'manual_only', 'disabled'] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export const SURFACE_KINDS = ['wordpress', 'astro', 'nextjs', 'generic_html'] as const
export type SurfaceKind = (typeof SURFACE_KINDS)[number]

export const RENDERER_CHANNELS = ['stable', 'beta', 'preview'] as const
export type RendererChannel = (typeof RENDERER_CHANNELS)[number]

export const SURFACE_STATUSES = ['active', 'paused', 'archived'] as const
export type SurfaceStatus = (typeof SURFACE_STATUSES)[number]

// Composición soportada en V1 (Arch §11.2): static + conditional_simple primero.
export const COMPOSITION_MODES = [
  'static',
  'conditional_simple',
  'multi_step_light',
  'computed_result',
  'async_result',
  'authenticated_or_tokenized',
] as const
export type CompositionMode = (typeof COMPOSITION_MODES)[number]

export const PERSISTENCE_MODES = ['normalized_only', 'raw_with_ttl', 'greenhouse_only', 'external_after_review'] as const
export type PersistenceMode = (typeof PERSISTENCE_MODES)[number]

export const FIELD_DATA_CLASSES = [
  'public',
  'company',
  'contact_pii',
  'free_text',
  'financial_hint',
  'file_metadata',
  'uploaded_file',
  'consent_evidence',
] as const
export type FieldDataClass = (typeof FIELD_DATA_CLASSES)[number]

export const FIELD_TYPES = [
  'text',
  'email',
  'tel',
  'url',
  'national_id',
  'textarea',
  'select',
  'multiselect',
  'checkbox',
  'radio',
  'number',
  'date',
  'hidden',
  'consent',
] as const
export type FieldType = (typeof FIELD_TYPES)[number]

// ─── Telemetry contract (browser-safe) — Arch §15, §15.1, §19 ─────────────────

/** Eventos server-side canónicos. */
export const TELEMETRY_EVENT_NAMES = [
  'form_viewed',
  'form_started',
  'field_validation_failed',
  'form_submitted',
  'submission_accepted',
  'submission_rejected',
  'destination_delivered',
  'destination_failed',
  'asset_accessed',
  'report_viewed',
] as const
export type TelemetryEventName = (typeof TELEMETRY_EVENT_NAMES)[number]

/** Nombres GTM/dataLayer para la página padre (Arch §15.1). */
export const GTM_EVENT_NAMES = [
  'gh_form_viewed',
  'gh_form_started',
  'gh_form_field_validation_failed',
  'gh_form_submitted',
  'gh_form_submission_accepted',
  'gh_form_submission_rejected',
  'gh_form_destination_delivered',
  'gh_form_asset_accessed',
  // TASK-1319 success card capability — eventos render-only (browser/GTM), sin equivalente
  // server-side en TELEMETRY_EVENT_NAMES (no hay round-trip: la card se ve/clickea en el cliente).
  'gh_form_success_viewed',
  'gh_form_success_action_clicked',
] as const
export type GtmEventName = (typeof GTM_EVENT_NAMES)[number]

/** Claves de payload PERMITIDAS en analytics browser-safe (Arch §15). */
export const TELEMETRY_ALLOWED_PAYLOAD_KEYS = [
  'form_id',
  'form_key',
  'form_slug',
  'form_version_id',
  'form_kind',
  'surface_id',
  'surface_kind',
  'renderer_version',
  'contract_version',
  'page_uri',
  'page_name',
  'referrer',
  'locale',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'correlation_id',
  'reason_class',
  'success_behavior',
  'destination_kind',
  // TASK-1319 success card capability — clasificadores browser-safe (nunca valores/PII).
  'action_kind',
  'reward_kind',
  // TASK-1336 tokenized_report handoff — el submit aceptado entrega al host el handle
  // público del run + la URL de status para arrancar el poll (browser-safe: el handle ya
  // se expone como submissionId/correlation_id; status_url es la API pública canónica).
  // NUNCA lleva PII, reportToken (sólo aparece al hacer poll cuando `ready`) ni ids internos.
  'run_handle',
  'status_url',
  // TASK-1375 asset download handoff — URL pública GATED de descarga del asset (ebook) con el
  // handle (submissionId) ya embebido. browser-safe: es la API pública canónica; sin form
  // completado no hay handle. NUNCA lleva object_name, bucket ni signed-URL.
  'download_url',
] as const
export type TelemetryAllowedPayloadKey = (typeof TELEMETRY_ALLOWED_PAYLOAD_KEYS)[number]

/**
 * Claves PROHIBIDAS en cualquier payload de analytics/telemetry: valores crudos,
 * PII, internals de HubSpot, URLs privadas, tokens. El compiler debe rechazar un
 * `analytics_policy` que las incluya.
 */
export const TELEMETRY_FORBIDDEN_PAYLOAD_KEYS = [
  'email',
  'phone',
  'document_name',
  'free_text',
  'hubspot_property',
  'hubspot_form_guid',
  'private_url',
  'token',
  'raw_value',
] as const

export const telemetryPolicySchema = z.object({
  enabled: z.boolean().default(true),
  allowedEvents: z.array(z.enum(TELEMETRY_EVENT_NAMES)).default([...TELEMETRY_EVENT_NAMES]),
  gtmDataLayer: z.boolean().default(true),
  fieldLevelAnalyticsDisabled: z.boolean().default(true),
})
export type TelemetryPolicy = z.infer<typeof telemetryPolicySchema>

// ─── Field contract (browser-safe) — Arch §11, §11.1, §19.3 ───────────────────

export const fieldConditionSchema = z.object({
  field: z.string().min(1),
  equals: z.union([z.string(), z.number(), z.boolean()]).optional(),
  includes: z.string().optional(),
})
export type FieldCondition = z.infer<typeof fieldConditionSchema>

export const fieldDefinitionSchema = z.object({
  key: z.string().min(1).max(80),
  type: z.enum(FIELD_TYPES),
  label: z.string().max(200).optional(),
  copyRef: z.string().max(200).optional(),
  placeholder: z.string().max(200).optional(),
  required: z.boolean().default(false),
  options: z.array(z.object({ value: z.string(), label: z.string().optional(), copyRef: z.string().optional() })).optional(),
  freeEntry: z.boolean().optional(),
  maxItems: z.number().int().positive().max(50).optional(),
  maxLength: z.number().int().positive().max(10_000).optional(),
  autocomplete: z.string().max(40).optional(),
  inputMode: z.string().max(20).optional(),
  // Validador declarativo (catálogo CURADO, anti-ReDoS): el admin elige de
  // NAMED_VALIDATORS, NUNCA inyecta regex. Si se omite, el registry deriva el
  // default por `type` (TASK-1253). `validatorParams.country` (ISO alpha-2)
  // gobierna national_id / e164_phone.
  validator: z.enum(NAMED_VALIDATORS).optional(),
  validatorParams: z.object({ country: z.string().length(2).optional() }).optional(),
  // Reglas declarativas, NO JavaScript arbitrario (Arch §11.1).
  visibleWhen: z.array(fieldConditionSchema).optional(),
  requiredWhen: z.array(fieldConditionSchema).optional(),
})
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>

// ─── render_contract — Arch §19.3 (lo único que recibe el browser) ────────────

export const CONTRACT_VERSION = 'greenhouse-growth-public-forms.v1'

/**
 * TASK-1297 — Render copy contract (browser-safe). El `copy` del render contract es un
 * mapa `copyRef → string` que el renderer usa para labels/help/submit/success. Es PÚBLICO,
 * así que sólo puede contener strings acotados: NUNCA objetos anidados, números, PII
 * estructurada ni payloads. `copyDisplaySchema` documenta la forma canónica;
 * `sanitizeRenderCopy` la aplica por-entrada (tolerante: conserva las entradas válidas y
 * descarta las inseguras, en vez de tirar todo el copy si una entrada falla) en el borde
 * de serialización del `policy-compiler` — alineado con `consentDisplay`/`security`, que
 * el compiler ya valida con `safeParse` antes de exponerlos.
 */
export const COPY_KEY_MAX = 120
export const COPY_VALUE_MAX = 4000
export const copyDisplaySchema = z.record(z.string().min(1).max(COPY_KEY_MAX), z.string().max(COPY_VALUE_MAX))
export type CopyDisplay = z.infer<typeof copyDisplaySchema>

export const sanitizeRenderCopy = (raw: unknown): Record<string, string> => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}
  const out: Record<string, string> = {}

  for (const [key, value] of Object.entries(source)) {
    if (typeof key !== 'string' || key.length === 0 || key.length > COPY_KEY_MAX) continue
    if (typeof value !== 'string' || value.length > COPY_VALUE_MAX) continue
    out[key] = value
  }

  return out
}

export const consentDisplaySchema = z.object({
  consentPolicyVersion: z.string().optional(),
  noticeText: z.string().max(4000).optional(),
  noticeCopyRef: z.string().optional(),
  privacyUrl: z.string().url().optional(),
  checkboxes: z
    .array(z.object({ key: z.string(), label: z.string().optional(), copyRef: z.string().optional(), required: z.boolean().default(true) }))
    .default([]),
})
export type ConsentDisplay = z.infer<typeof consentDisplaySchema>

// ─── Success card capability (TASK-1319) — browser-safe in-card thank-you ──────
//
// `presentation` es ORTOGONAL a `kind`: `kind` = QUÉ outcome se promete
// (inline_message/redirect/asset_access/review_pending/tokenized_report); `presentation`
// = CÓMO se muestra (mensaje simple vs success card estructurada). El `reward` es un
// sub-bloque de la card, NO un repurpose del `kind='asset_access'`. Estos campos cruzan
// al browser tal cual (el compiler hace passthrough y el GET serializa el contrato), así
// que el schema ES el leak boundary: strings acotados + `href` allowlisted.

/** Presentación del estado success. `success_card` habilita la card in-card estructurada. */
export const SUCCESS_PRESENTATIONS = ['inline_message', 'success_card'] as const
export type SuccessPresentation = (typeof SUCCESS_PRESENTATIONS)[number]

/** Kinds de acción permitidos en V1 (browser-safe). */
export const SUCCESS_ACTION_KINDS = ['external_link', 'download', 'asset_access', 'schedule'] as const
export type SuccessActionKind = (typeof SUCCESS_ACTION_KINDS)[number]

/** Kinds de reward para lead magnets / gated resources. `none` = sin reward. */
export const SUCCESS_REWARD_KINDS = ['none', 'ebook', 'guide', 'template', 'report_preview', 'surprise'] as const
export type SuccessRewardKind = (typeof SUCCESS_REWARD_KINDS)[number]

export const SUCCESS_HREF_MAX = 2000
export const SUCCESS_STEPS_MAX = 4
export const SUCCESS_ACTIONS_MAX = 2

/**
 * href allowlist browser-safe (TASK-1319): sólo URLs seguras cruzan al browser.
 * Acepta: https absoluta, http SÓLO en localhost/127.0.0.1 (dev/test), o path root-relative
 * same-origin (`/algo`, NUNCA protocol-relative `//host`). Rechaza: `javascript:`/`data:`/
 * `vbscript:`, non-https externas, y cualquier signed/private URL no aprobada explícitamente.
 */
export const isBrowserSafeSuccessHref = (value: string): boolean => {
  const trimmed = value.trim()

  if (trimmed.length === 0) return false
  const lower = trimmed.toLowerCase()

  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return false
  // Path root-relative same-origin (excluye protocol-relative `//host`).
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true

  try {
    const url = new URL(trimmed)

    if (url.protocol === 'https:') return true
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true

    return false
  } catch {
    return false
  }
}

export const successCardHrefSchema = z
  .string()
  .trim()
  .max(SUCCESS_HREF_MAX)
  .refine(isBrowserSafeSuccessHref, {
    message: 'href debe ser https (o path same-origin `/`); sin javascript:/data:/non-https externa',
  })

export const successCardActionSchema = z.object({
  kind: z.enum(SUCCESS_ACTION_KINDS),
  label: z.string().max(80).optional(),
  labelCopyRef: z.string().max(120).optional(),
  href: successCardHrefSchema.optional(),
  target: z.enum(['_self', '_blank']).optional(),
  telemetryKey: z.string().max(80).optional(),
})
export type SuccessCardAction = z.infer<typeof successCardActionSchema>

export const successCardRewardSchema = z.object({
  kind: z.enum(SUCCESS_REWARD_KINDS),
  title: z.string().max(120).optional(),
  titleCopyRef: z.string().max(120).optional(),
  body: z.string().max(600).optional(),
  bodyCopyRef: z.string().max(120).optional(),
  action: successCardActionSchema.optional(),
})
export type SuccessCardReward = z.infer<typeof successCardRewardSchema>

export const successCardStepSchema = z.object({
  label: z.string().max(160).optional(),
  copyRef: z.string().max(120).optional(),
})

/**
 * TASK-1336 — Handoff auto-descriptivo del `tokenized_report`. Cuando el submit es aceptado, el
 * renderer resuelve `statusPathTemplate` sustituyendo `{handle}` por el `submissionId` y se lo
 * entrega al host (evento `gh_form_submission_accepted` con `run_handle`+`status_url`) para que
 * arranque el poll SIN hardcodear la ruta ni conocer el dominio del grader (Full API Parity).
 *
 * `statusPathTemplate` es browser-safe por construcción: ruta RELATIVA acotada a la superficie
 * pública (`/api/public/...`) con el placeholder `{handle}`. NUNCA una URL absoluta (evita apuntar
 * a un origin arbitrario) ni un endpoint privado. El schema es el leak boundary: cruza al browser
 * tal cual dentro del render contract.
 */
export const tokenizedReportBehaviorSchema = z
  .object({
    statusPathTemplate: z
      .string()
      .min(1)
      .max(300)
      .refine(value => value.startsWith('/api/public/'), {
        message: 'statusPathTemplate debe ser una ruta relativa bajo /api/public/',
      })
      .refine(value => !value.includes('//') && !/\s/.test(value), {
        message: 'statusPathTemplate no puede ser protocol-relative ni contener espacios',
      })
      .refine(value => value.includes('{handle}'), {
        message: 'statusPathTemplate debe contener el placeholder {handle}',
      }),
  })
  .strict()
export type TokenizedReportBehavior = z.infer<typeof tokenizedReportBehaviorSchema>

/**
 * TASK-1375 — Config del handoff de descarga GATED de asset (ebook lead magnet). Espejo del
 * `tokenizedReportBehaviorSchema`: `downloadPathTemplate` es una ruta relativa bajo /api/public/
 * con `{handle}` (browser-safe; el handle = submissionId ya cruza al browser). El renderer
 * sustituye `{handle}` y emite `download_url` para la descarga on-screen post-submit. El
 * object_name/bucket NUNCA cruzan (server-only en `form_asset`). Es el leak boundary.
 */
export const assetDownloadBehaviorSchema = z
  .object({
    downloadPathTemplate: z
      .string()
      .min(1)
      .max(300)
      .refine(value => value.startsWith('/api/public/'), {
        message: 'downloadPathTemplate debe ser una ruta relativa bajo /api/public/',
      })
      .refine(value => !value.includes('//') && !/\s/.test(value), {
        message: 'downloadPathTemplate no puede ser protocol-relative ni contener espacios',
      })
      .refine(value => value.includes('{handle}'), {
        message: 'downloadPathTemplate debe contener el placeholder {handle}',
      }),
  })
  .strict()
export type AssetDownloadBehavior = z.infer<typeof assetDownloadBehaviorSchema>

export const successBehaviorSchema = z.object({
  kind: z.enum(['inline_message', 'redirect', 'asset_access', 'review_pending', 'tokenized_report']),
  // TASK-1336 — Config del handoff `tokenized_report` (browser-safe). Opcional: sin él, el kind
  // `tokenized_report` conserva su comportamiento legacy (success card / mensaje, sin handoff).
  tokenizedReport: tokenizedReportBehaviorSchema.optional(),
  // TASK-1375 — Config del handoff de descarga GATED del asset (browser-safe). Cuando el kind es
  // `asset_access` y esto está presente, el renderer emite `download_url` en el evento accepted.
  assetDownload: assetDownloadBehaviorSchema.optional(),
  presentation: z.enum(SUCCESS_PRESENTATIONS).optional(),
  message: z.string().max(2000).optional(),
  messageCopyRef: z.string().optional(),
  // Success card estructurada (browser-safe) — TASK-1319.
  title: z.string().max(160).optional(),
  titleCopyRef: z.string().max(120).optional(),
  body: z.string().max(1000).optional(),
  bodyCopyRef: z.string().max(120).optional(),
  steps: z.array(successCardStepSchema).max(SUCCESS_STEPS_MAX).optional(),
  reward: successCardRewardSchema.optional(),
  actions: z.array(successCardActionSchema).max(SUCCESS_ACTIONS_MAX).optional(),
  supportingNote: z.string().max(400).optional(),
  supportingNoteCopyRef: z.string().max(120).optional(),
  redirectUrl: z.string().url().optional(),
})
export type SuccessBehavior = z.infer<typeof successBehaviorSchema>

export const captchaSecuritySchema = z.object({
  provider: z.literal('turnstile'),
  required: z.boolean().default(true),
  mode: z.literal('invisible').default('invisible'),
  siteKey: z.string().min(1).max(200),
  execution: z.literal('submit').default('submit'),
})
export type CaptchaSecurity = z.infer<typeof captchaSecuritySchema>

export const renderSecuritySchema = z.object({
  captcha: captchaSecuritySchema.optional(),
})
export type RenderSecurity = z.infer<typeof renderSecuritySchema>

export const renderStepSchema = z.object({
  key: z.string(),
  label: z.string().optional(),
  fieldKeys: z.array(z.string()),
})
export type RenderStep = z.infer<typeof renderStepSchema>

export const renderContractSchema = z.object({
  contractVersion: z.literal(CONTRACT_VERSION),
  form: z.object({
    formId: z.string(),
    /** TASK-1297 — identidad estable/opaca pública (UUID). NUNCA el HubSpot destination formGuid. */
    formKey: z.string(),
    slug: z.string(),
    formVersionId: z.string(),
    version: z.number().int(),
    locale: z.string(),
    formKind: z.enum(FORM_KINDS),
  }),
  composition: z.enum(COMPOSITION_MODES),
  fields: z.array(fieldDefinitionSchema),
  conditions: z.array(fieldConditionSchema).default([]),
  steps: z.array(renderStepSchema).optional(),
  copy: z.record(z.string(), z.string()).default({}),
  consent: consentDisplaySchema.optional(),
  successBehavior: successBehaviorSchema,
  styleVariant: z.string().optional(),
  surfacePolicy: z.object({
    surfaceId: z.string().optional(),
    allowedOrigins: z.array(z.string()).default([]),
    rendererChannel: z.enum(RENDERER_CHANNELS).default('stable'),
  }),
  security: renderSecuritySchema.optional(),
  telemetryPolicy: telemetryPolicySchema,
})
export type RenderContract = z.infer<typeof renderContractSchema>

// ─── submission_contract — server-only (validación/normalización/dedupe/spam) ──

export const submissionContractSchema = z.object({
  formId: z.string(),
  formVersionId: z.string(),
  fields: z.array(fieldDefinitionSchema),
  persistenceMode: z.enum(PERSISTENCE_MODES),
  dedupe: z.object({ enabled: z.boolean().default(true), fields: z.array(z.string()).default([]) }),
  spam: z.object({
    honeypotField: z.string().default('company_website'),
    perEmailPerDay: z.number().int().positive().optional(),
    perIpPerDay: z.number().int().positive().optional(),
    maxPayloadBytes: z.number().int().positive().default(64_000),
  }),
  consentRequired: z.boolean().default(true),
  consentPolicyVersion: z.string().optional(),
})
export type SubmissionContract = z.infer<typeof submissionContractSchema>

// ─── email_policy — TASK-1254 — gate corporativo por form (server-only) ────────

/**
 * Política de email por form. Vive en `form_version.validation_schema_json.emailPolicy`
 * (no requiere columna nueva). Default `off` ⇒ el form se comporta como hoy (sin gate).
 *  - `block_field`: rechaza el submit si el email no es corporativo/deliverable (gate duro).
 *  - `warn`: deja enviar pero marca el lead como `suspect` (etiqueta, no bloquea).
 *  - `tag_only`: nunca bloquea; solo clasifica la calidad del dominio.
 */
export const EMAIL_POLICY_MODES = ['off', 'block_field', 'warn', 'tag_only'] as const
export type EmailPolicyMode = (typeof EMAIL_POLICY_MODES)[number]

export const emailPolicySchema = z.object({
  mode: z.enum(EMAIL_POLICY_MODES).default('off'),
  /** Campo del form que lleva el email a gatear. */
  field: z.string().default('email'),
})
export type EmailPolicy = z.infer<typeof emailPolicySchema>

/** Extrae la política de email de `validation_schema_json`. Degradación segura ⇒ `off`. */
export const resolveEmailPolicy = (validationSchemaJson: unknown): EmailPolicy => {
  const raw =
    validationSchemaJson && typeof validationSchemaJson === 'object'
      ? (validationSchemaJson as Record<string, unknown>).emailPolicy
      : undefined

  const parsed = emailPolicySchema.safeParse(raw ?? {})

  return parsed.success ? parsed.data : { mode: 'off', field: 'email' }
}

// ─── destination_plan — server-only (router de destinos) ──────────────────────

export const destinationPlanEntrySchema = z.object({
  destinationId: z.string(),
  provider: z.enum(DESTINATION_PROVIDERS),
  adapterKind: z.string(),
  adapterVersion: z.string(),
  deliveryMode: z.enum(DELIVERY_MODES),
  enabled: z.boolean(),
  fieldAllowlist: z.array(z.string()).default([]),
  // Config del destino (string→unknown): el compiler NO valida su forma específica —
  // cada adapter valida su mapping (HubSpot: portalId/formGuid/fieldMapping anidado).
  mapping: z.record(z.string(), z.unknown()).default({}),
  retryPolicy: z
    .object({ maxRetries: z.number().int().min(0).max(10).default(5), backoffSeconds: z.number().int().positive().default(60) })
    .default({ maxRetries: 5, backoffSeconds: 60 }),
})
export type DestinationPlanEntry = z.infer<typeof destinationPlanEntrySchema>

export const destinationPlanSchema = z.object({
  formVersionId: z.string(),
  destinations: z.array(destinationPlanEntrySchema),
})
export type DestinationPlan = z.infer<typeof destinationPlanSchema>

// ─── Public submit input (POST body) — Arch §20 ───────────────────────────────

export const publicSubmitInputSchema = z.object({
  formSlug: z.string().min(1).max(200),
  surfaceId: z.string().min(1).optional(),
  embedKey: z.string().min(1).optional(),
  formVersionId: z.string().optional(),
  fields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
  consent: z.boolean(),
  consentCheckboxes: z.array(z.string()).default([]),
  pageUri: z.string().max(2000).optional(),
  pageName: z.string().max(400).optional(),
  referrer: z.string().max(2000).optional(),
  // Honeypot anti-bot: si viene con valor, se rechaza silenciosamente.
  honeypot: z.string().optional(),
  idempotencyKey: z.string().max(200).optional(),
})
export type PublicSubmitInput = z.infer<typeof publicSubmitInputSchema>

/** Outcomes del submit público (mapeados a HTTP status en la route). */
export const PUBLIC_SUBMIT_OUTCOMES = [
  'accepted',
  'invalid',
  'consent_required',
  'surface_unauthorized',
  'rate_limited',
  'spam_rejected',
  'captcha_failed',
  'form_not_published',
  'disabled',
  // TASK-1255 — fail-closed: el motor no pudo procesar de forma segura (p.ej. cifrado de
  // PII habilitado pero la key no está disponible). NUNCA se persiste PII en claro creyendo
  // cifrarla; se rechaza el submit y se reintenta al resolver la causa.
  'error',
] as const
export type PublicSubmitOutcome = (typeof PUBLIC_SUBMIT_OUTCOMES)[number]

export interface PublicSubmitResult {
  outcome: PublicSubmitOutcome
  submissionId?: string
  reason?: string
}

// ─── Outbox event canónico del motor ──────────────────────────────────────────

/** Evento emitido in-tx al aceptar una submission; lo drena el dispatcher async. */
export const FORM_SUBMISSION_ACCEPTED_EVENT = 'growth.forms.submission_accepted' as const
export const FORM_SUBMISSION_AGGREGATE = 'growth_form_submission' as const

/**
 * TASK-1255 — Evento de reveal de PII (cédula/email/teléfono) en el cockpit. Trail
 * append-only; lo lee el signal `growth.forms.pii_reveal_without_reason`. NUNCA
 * lleva el valor revelado en el payload, sólo qué campo + actor + razón.
 */
export const FORM_LEAD_PII_REVEALED_EVENT = 'growth.forms.lead_pii.revealed' as const

export interface FormSubmissionAcceptedEventPayload {
  schemaVersion: 1
  submissionId: string
  formId: string
  formVersionId: string
}

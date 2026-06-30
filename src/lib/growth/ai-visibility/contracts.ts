/**
 * TASK-1226 — Growth AI Visibility Grader · Contract skeleton (Slice 1).
 *
 * Contratos base del dominio `growth.ai_visibility`: provider ids, execution
 * modes, run kinds, lifecycle status, prompt input y provider observation
 * normalizada. Este módulo es PURO (sin IO, sin secretos, sin PG) — lo consumen
 * el policy resolver (Slice 2), los adapters (Slice 3), la persistencia (Slice 4)
 * y el smoke/eval harness (Slice 5).
 *
 * Invariantes (ADR `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md` +
 * spec `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`):
 *  - Provider evidence NO es business truth: el score/report se derivan después,
 *    versionados (TASK-1227). Acá solo modelamos la observación cruda normalizada.
 *  - Cada observación queda asociada a run_id, prompt_id, provider, model,
 *    provider_policy_version y prompt_pack_version.
 *  - Secrets y raw payloads NUNCA viajan en estos tipos client-facing.
 *  - Full API parity: estos tipos son el contrato único; UI pública, admin,
 *    Nexa/MCP, report builder y HubSpot handoff consumen los MISMOS primitives.
 */

// ── Providers ────────────────────────────────────────────────────────────────

/**
 * Answer engines observados. El arch V1 definió OpenAI/Perplexity/Gemini;
 * el ADR delta (2026-06-24, spike TASK-1228) adoptó Anthropic al set V1.
 * TASK-1265 agrega Google AI Overviews / AI Mode como canal SERP gobernado
 * vía DataForSEO (no scraping directo de Google).
 */
export const GROWTH_AI_VISIBILITY_PROVIDER_IDS = [
  'openai',
  'anthropic',
  'perplexity',
  'gemini',
  'google_ai_overview'
] as const

export type GrowthAiVisibilityProviderId = (typeof GROWTH_AI_VISIBILITY_PROVIDER_IDS)[number]

export const isGrowthAiVisibilityProviderId = (value: unknown): value is GrowthAiVisibilityProviderId =>
  typeof value === 'string' &&
  (GROWTH_AI_VISIBILITY_PROVIDER_IDS as readonly string[]).includes(value)

// ── Execution modes ──────────────────────────────────────────────────────────

/**
 * Profundidad/costo de un run. `light` es el modo público barato (ver caveat de
 * costo de Anthropic+web_search en la calibración: 3-4× OpenAI → el policy
 * resolver puede excluir providers caros del tier `light`).
 */
export const GROWTH_AI_VISIBILITY_EXECUTION_MODES = ['light', 'full', 'internal_audit'] as const

export type GrowthAiVisibilityExecutionMode = (typeof GROWTH_AI_VISIBILITY_EXECUTION_MODES)[number]

export const isGrowthAiVisibilityExecutionMode = (value: unknown): value is GrowthAiVisibilityExecutionMode =>
  typeof value === 'string' &&
  (GROWTH_AI_VISIBILITY_EXECUTION_MODES as readonly string[]).includes(value)

// ── Run kinds ────────────────────────────────────────────────────────────────

/**
 * Propósito/disparador de un run. `public_diagnostic` queda reservado para la
 * superficie pública futura (fuera de scope de esta task); en V1 solo corren
 * `smoke`, `eval` e `internal_audit`.
 */
export const GROWTH_AI_VISIBILITY_RUN_KINDS = ['smoke', 'eval', 'internal_audit', 'public_diagnostic'] as const

export type GrowthAiVisibilityRunKind = (typeof GROWTH_AI_VISIBILITY_RUN_KINDS)[number]

export const isGrowthAiVisibilityRunKind = (value: unknown): value is GrowthAiVisibilityRunKind =>
  typeof value === 'string' && (GROWTH_AI_VISIBILITY_RUN_KINDS as readonly string[]).includes(value)

// ── Lifecycle status (run-level) ─────────────────────────────────────────────

/**
 * Estado del run completo. `partial` = algunas observaciones OK, otras skipped/
 * failed (degradación honesta: nunca se inventa un run `succeeded` con evidencia
 * incompleta). `skipped` = grader/flags OFF antes de ejecutar.
 */
export const GROWTH_AI_VISIBILITY_RUN_STATUSES = [
  'pending',
  'running',
  'succeeded',
  'partial',
  'failed',
  'skipped'
] as const

export type GrowthAiVisibilityRunStatus = (typeof GROWTH_AI_VISIBILITY_RUN_STATUSES)[number]

// ── Observation status (provider-call level) ─────────────────────────────────

/**
 * Resultado de una llamada individual a un provider para un prompt.
 * `skipped` = provider deshabilitado o secret ausente (skip controlado, NO crash).
 */
export const GROWTH_AI_VISIBILITY_OBSERVATION_STATUSES = [
  'succeeded',
  'failed',
  'rate_limited',
  'skipped'
] as const

export type GrowthAiVisibilityObservationStatus =
  (typeof GROWTH_AI_VISIBILITY_OBSERVATION_STATUSES)[number]

// ── Provider error classes ───────────────────────────────────────────────────

/**
 * Clases canónicas de error/skip de provider. NUNCA exponen el raw provider
 * error al cliente — son códigos estables para observabilidad y para que el
 * policy/consumers decidan degradación. El mensaje crudo del provider va a
 * `captureWithDomain('growth', ...)`, no a estos tipos.
 */
export const GROWTH_AI_VISIBILITY_PROVIDER_ERROR_CODES = [
  'grader_disabled',
  'provider_disabled',
  'missing_secret',
  'rate_limited',
  'timeout',
  'provider_error',
  'invalid_response',
  'no_capability',
  'no_ai_overview_block'
] as const

export type GrowthAiVisibilityProviderErrorCode =
  (typeof GROWTH_AI_VISIBILITY_PROVIDER_ERROR_CODES)[number]

/** Códigos de error que representan un skip controlado (config ausente), no un fallo de ejecución. */
export const GROWTH_AI_VISIBILITY_SKIP_ERROR_CODES: readonly GrowthAiVisibilityProviderErrorCode[] = [
  'grader_disabled',
  'provider_disabled',
  'missing_secret',
  'no_capability',
  'no_ai_overview_block'
]

export const isGrowthAiVisibilitySkipErrorCode = (
  code: GrowthAiVisibilityProviderErrorCode
): boolean => GROWTH_AI_VISIBILITY_SKIP_ERROR_CODES.includes(code)

// ── Citation source types ────────────────────────────────────────────────────

export const GROWTH_AI_VISIBILITY_SOURCE_TYPES = [
  'owned',
  'earned',
  'social',
  'directory',
  'marketplace',
  'news',
  'unknown'
] as const

export type GrowthAiVisibilitySourceType = (typeof GROWTH_AI_VISIBILITY_SOURCE_TYPES)[number]

export interface GrowthAiVisibilityCitation {
  url: string
  domain: string
  title?: string
  sourceType?: GrowthAiVisibilitySourceType
}

// ── Prompt input ─────────────────────────────────────────────────────────────

/**
 * Input de un prompt para un provider. La marca/categoría se interpolan como
 * DATO delimitado (anti prompt-injection). NUNCA incluye PII (email/teléfono/
 * datos personales del submitter) — invariante de `data posture` del ADR.
 */
export interface GrowthAiVisibilityPromptInput {
  runId: string
  promptId: string
  promptText: string
  locale: string
  market: string
  brandName: string
  websiteUrl: string | null
  competitorsDeclared: string[]
  mode: GrowthAiVisibilityExecutionMode
}

// ── Provider observation (normalized) ────────────────────────────────────────

/**
 * Observación normalizada de un answer engine. Es la evidencia cruda muestreada,
 * NO el finding/score (eso lo deriva TASK-1227). El `rawEvidencePointer` apunta
 * al payload completo (storage), nunca lo embebe; `answerExcerpt` es bounded.
 */
export interface GrowthAiVisibilityProviderObservation {
  observationId: string
  runId: string
  promptId: string
  provider: GrowthAiVisibilityProviderId
  model: string
  status: GrowthAiVisibilityObservationStatus
  answerTextHash: string | null
  answerExcerpt: string | null
  citations: GrowthAiVisibilityCitation[]
  usage: Record<string, unknown>
  latencyMs: number
  providerRequestHash: string
  rawEvidencePointer: string | null
  errorCode: GrowthAiVisibilityProviderErrorCode | null
  providerPolicyVersion: string
  promptPackVersion: string
  createdAt: string
}

/** Límite de retención del excerpt bounded (caracteres). */
export const GROWTH_AI_VISIBILITY_EXCERPT_MAX = 600

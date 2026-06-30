/**
 * TASK-1290 Slice 0 — Growth AI Visibility · Prompt tag vocabulary (closed enums).
 *
 * El CONTRATO entre el prompt set y el scorer/normalizer. Los tags por query
 * (`family`/`fanOutType`/`intentStage`/`namesBrand`) son un vocabulario CERRADO,
 * fuente única para: el pack v1, los baselines por arquetipo (Slice 1), el schema
 * structured del autor LLM (Slice 3), el normalizer y el scoring engine.
 *
 * Por qué cerrado: el scorer pondera por `intentStage` exacto (revenue intent) y
 * deriva descubrimiento de `namesBrand`. Un valor libre ("reserva" en vez de
 * `purchase_intent`) rompería la medición en silencio. El autor LLM se valida
 * contra estos enums; un valor fuera de enum → rechazo de schema → baseline.
 *
 * Antes esta info estaba implícita (strings libres en `prompt-pack-v1.ts`) y
 * `REVENUE_INTENT_STAGES` estaba DUPLICADO en `normalizer.ts` y `scoring/engine.ts`.
 * Acá se consolida sin cambiar valores → no-regresión bit-for-bit del caso agencia.
 */

/** Tipos de sub-query del Query Fan-Out (seo-aeo §04). Cerrado. */
export const PROMPT_FAN_OUT_TYPES = ['related', 'comparative', 'implicit', 'recent'] as const
export type PromptFanOutType = (typeof PROMPT_FAN_OUT_TYPES)[number]

/**
 * Etapas de buyer-intent — vocabulario ÚNICO cross-arquetipo (cada arquetipo cubre
 * el subconjunto que aplica; mantiene el scorer agnóstico al modelo de negocio).
 */
export const PROMPT_INTENT_STAGES = [
  'awareness',
  'problem_aware',
  'consideration',
  'comparison',
  'trust',
  'purchase_intent',
  'local',
  'enterprise',
  'risk',
  'message_recall'
] as const
export type PromptIntentStage = (typeof PROMPT_INTENT_STAGES)[number]

/**
 * Familias funcionales de prompt (agrupación). El scorer las usa SÓLO para contar
 * cobertura (familias distintas), así que no afectan la fórmula; el enum cerrado
 * habilita el contrato del autor LLM + el agrupado de la UI de review (TASK-1291).
 * Superset: las del pack agencia v1 + familias neutrales para otros arquetipos.
 */
export const PROMPT_FAMILIES = [
  // Pack agencia v1 (preservadas para no-regresión bit-for-bit).
  'category_discovery',
  'provider_recommendation',
  'comparison',
  'trust_reputation',
  'purchase_readiness',
  'local_intent',
  'enterprise_intent',
  'risk_reputation',
  'message_recall',
  // Neutrales para consumo/retail/saas/marketplace/público (Slice 1).
  'product_discovery',
  'value_assessment',
  'support_experience',
  'availability_access'
] as const
export type PromptFamily = (typeof PROMPT_FAMILIES)[number]

/**
 * Intent stages que representan intención de compra/comparación (revenue intent).
 * SoT consolidada (antes duplicada en normalizer + engine). El scorer la usa para
 * ponderar; NO cambiar sin re-validar la eval (TASK-1292) y `score_version`.
 */
export const REVENUE_INTENT_STAGES: ReadonlySet<PromptIntentStage> = new Set([
  'consideration',
  'comparison',
  'purchase_intent',
  'enterprise',
  'local'
])

/** Stage de recall de mensaje (descripción de la marca). */
export const MESSAGE_RECALL_STAGE: PromptIntentStage = 'message_recall'

/** Los tags que el scorer/normalizer necesitan por prompt (subset que viaja con el run). */
export interface PromptTag {
  family: PromptFamily
  fanOutType: PromptFanOutType
  intentStage: PromptIntentStage
  namesBrand: boolean
}

/** promptId → tags del set RESUELTO del run (no del pack estático). */
export type PromptTagCatalog = Map<string, PromptTag>

export const isRevenueIntentStage = (stage: string): boolean =>
  REVENUE_INTENT_STAGES.has(stage as PromptIntentStage)

export const isPromptFanOutType = (value: unknown): value is PromptFanOutType =>
  typeof value === 'string' && (PROMPT_FAN_OUT_TYPES as readonly string[]).includes(value)

export const isPromptIntentStage = (value: unknown): value is PromptIntentStage =>
  typeof value === 'string' && (PROMPT_INTENT_STAGES as readonly string[]).includes(value)

export const isPromptFamily = (value: unknown): value is PromptFamily =>
  typeof value === 'string' && (PROMPT_FAMILIES as readonly string[]).includes(value)

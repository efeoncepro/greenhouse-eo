/**
 * TASK-1664 — Contratos cerrados del keyword discovery (seed expansion + enrichment).
 *
 * Este módulo fija la frontera entre una idea humana y una decisión SEO: enums cerrados,
 * límites duros y el perfil de costo determinista que el preview y el runner COMPARTEN.
 * Nada acá llama al proveedor ni toca la base — es la parte del dominio que se prueba pura.
 *
 * Principios que el resto del módulo no puede violar:
 * - **La métrica de mercado NO vive acá.** `search_volume`/`difficulty`/`intent`/`core_keyword`
 *   son un hecho de `(keyword, mercado, as-of)` cuyo SSOT es `seo_keyword_market_data`
 *   (TASK-1661). El candidato guarda SOLO procedencia (run, seed, endpoint, rank).
 * - **Descubrir no es seguir.** Ninguna pieza de discovery escribe `seo_keyword_set_members`;
 *   la promoción es un command posterior y explícito (`trackKeywords`).
 * - **Labs es Live y cada fila cuesta.** El costo se estima ANTES de gastar con la fórmula
 *   de abajo, y la respuesta real del proveedor prevalece en el ledger.
 */

import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from '../provider-pricing'

// ─── Eventos outbox (trazabilidad, NO cola de trabajo) ──────────────────────────────
//
// En este dominio el despacho real es Cloud Scheduler → ops-worker (drain con claim
// SKIP LOCKED); el outbox conserva el rastro y el mirror BQ, jamás dispara al worker.
// Las constantes viven en el dominio y no en un catálogo central (seam de extracción §17.3).

export const SEO_KEYWORD_DISCOVERY_REQUESTED_EVENT = 'growth.seo.keyword_discovery.requested'

export const SEO_KEYWORD_DISCOVERY_COMPLETED_EVENT = 'growth.seo.keyword_discovery.completed'

/** Mismo aggregate que el resto del dominio SEO: la corrida pertenece a un target. */
export const SEO_KEYWORD_DISCOVERY_AGGREGATE_TYPE = 'seo_target'

// ─── Enums cerrados ─────────────────────────────────────────────────────────────────

/** Fuente de seeds de la corrida. `mixed` = manual + UNA fuente medida, nunca dos targets. */
export type SeoDiscoverySourceKind = 'manual' | 'gsc_queries' | 'tracked_keywords' | 'target_domain' | 'mixed'

export const SEO_DISCOVERY_SOURCE_KINDS: readonly SeoDiscoverySourceKind[] = [
  'manual',
  'gsc_queries',
  'tracked_keywords',
  'target_domain',
  'mixed'
]

/**
 * Métodos de expansión = endpoints Labs Live autorizados en V1. `keywords_for_site` es el
 * cuarto método opcional (apagado por default: requiere activarlo el operador y usa el
 * dominio canónico del target, jamás uno arbitrario del body).
 */
export type SeoDiscoveryMethod = 'keyword_suggestions' | 'related_keywords' | 'keyword_ideas' | 'keywords_for_site'

export const SEO_DISCOVERY_METHODS: readonly SeoDiscoveryMethod[] = [
  'keyword_suggestions',
  'related_keywords',
  'keyword_ideas',
  'keywords_for_site'
]

/** Endpoint Labs Live por método. Un task por llamada; siempre vía `postDataForSeoTask`. */
export const SEO_DISCOVERY_METHOD_ENDPOINTS: Record<SeoDiscoveryMethod, string> = {
  keyword_suggestions: '/v3/dataforseo_labs/google/keyword_suggestions/live',
  related_keywords: '/v3/dataforseo_labs/google/related_keywords/live',
  keyword_ideas: '/v3/dataforseo_labs/google/keyword_ideas/live',
  keywords_for_site: '/v3/dataforseo_labs/google/keywords_for_site/live'
}

/** Endpoint del enriquecimiento top-up (no es un método de expansión: no crea seeds). */
export const SEO_DISCOVERY_OVERVIEW_ENDPOINT = '/v3/dataforseo_labs/google/keyword_overview/live'

/**
 * Máquina de estados de la corrida. Transiciones permitidas:
 * `pending → running` (claim del worker) · `pending → cancelled` (operador) ·
 * `running → succeeded | partial | no_results | failed | budget_blocked`.
 * Los estados finales no mutan; una nueva pregunta es una nueva corrida.
 */
export type SeoDiscoveryRunStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'partial'
  | 'no_results'
  | 'failed'
  | 'budget_blocked'
  | 'cancelled'

export const SEO_DISCOVERY_RUN_STATUSES: readonly SeoDiscoveryRunStatus[] = [
  'pending',
  'running',
  'succeeded',
  'partial',
  'no_results',
  'failed',
  'budget_blocked',
  'cancelled'
]

/** Acciones append-only sobre un candidato. Ninguna escribe tracking por sí sola. */
export type SeoDiscoveryActionKind =
  | 'dismissed'
  | 'selected_for_target'
  | 'selected_for_grounded_query'
  | 'promoted_to_tracking'
  | 'rejected'

export const SEO_DISCOVERY_ACTION_KINDS: readonly SeoDiscoveryActionKind[] = [
  'dismissed',
  'selected_for_target',
  'selected_for_grounded_query',
  'promoted_to_tracking',
  'rejected'
]

/**
 * Códigos de error cerrados del dominio (spec TASK-1664 §Access/privacy/error). El app lane
 * los traduce 1:1 a códigos canónicos; ningún mensaje expone endpoint, SQL ni payload del
 * proveedor.
 */
export type SeoDiscoveryErrorCode =
  | 'seo_keyword_discovery_disabled'
  | 'forbidden'
  | 'target_not_found'
  | 'invalid_seed'
  | 'limit_exceeded'
  | 'duplicate_run'
  | 'busy'
  | 'budget_blocked'
  | 'provider_error'
  | 'no_results'
  | 'partial'
  | 'run_not_found'

// ─── Límites duros por corrida (spec §Cost and limits) ──────────────────────────────

export const MAX_DISCOVERY_SEEDS = 10

/** Máximo de métodos de EXPANSIÓN (sugerencias/relacionadas/ideas). */
export const MAX_DISCOVERY_EXPANSION_METHODS = 3

/** `limit` por endpoint/seed: default conservador, máximo del contrato V1. */
export const DEFAULT_DISCOVERY_RESULTS_PER_CALL = 50

export const MAX_DISCOVERY_RESULTS_PER_CALL = 100

/** Techo de candidatos persistidos por corrida (antes de dedupe final). */
export const MAX_DISCOVERY_CANDIDATES_PER_RUN = 500

/** Techo de keywords enriquecidas vía `keyword_overview` (top-up del faltante/vencido). */
export const MAX_DISCOVERY_ENRICHMENT_KEYWORDS = 200

/**
 * `keyword_overview` en discovery va en lotes de 100 (contrato V1 de la spec; el proveedor
 * admite 700, pero el top-up de discovery está acotado a 200 → máximo 2 llamadas).
 */
export const MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL = 100

export const MAX_DISCOVERY_OVERVIEW_CALLS = Math.ceil(
  MAX_DISCOVERY_ENRICHMENT_KEYWORDS / MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL
)

/** Techo absoluto de llamadas Labs por corrida (peor caso V1 = 24; el margen es para retries). */
export const MAX_DISCOVERY_PROVIDER_CALLS = 30

/** Límite Labs por keyword: 80 caracteres y 10 palabras. */
export const MAX_SEED_CHARS = 80

export const MAX_SEED_WORDS = 10

/** Ventana máxima de consultas GSC usadas como seeds (4 ciclos semanales completos). */
export const MAX_GSC_SEED_WINDOW_DAYS = 28

/** Umbral de la señal de confiabilidad: una corrida `running` más vieja que esto está atascada. */
export const DISCOVERY_STUCK_RUN_MINUTES = 15

// ─── Validación pura de seeds ───────────────────────────────────────────────────────

export type SeedValidation = { ok: true } | { ok: false; reason: 'empty' | 'too_long' | 'too_many_words' }

/** Valida UNA seed contra los límites del proveedor. Puro; la normalización va aparte. */
export const validateSeedKeyword = (raw: string): SeedValidation => {
  const trimmed = raw.trim()

  if (!trimmed) return { ok: false, reason: 'empty' }

  if (trimmed.length > MAX_SEED_CHARS) return { ok: false, reason: 'too_long' }

  if (trimmed.split(/\s+/).length > MAX_SEED_WORDS) return { ok: false, reason: 'too_many_words' }

  return { ok: true }
}

// ─── Perfil de costo determinista ───────────────────────────────────────────────────

export interface SeoDiscoveryMethodSpec {
  method: SeoDiscoveryMethod
  /** Filas solicitadas por llamada (`limit` del endpoint). */
  resultsPerCall: number
}

export interface SeoDiscoveryCostEstimate {
  providerCalls: number
  requestedRows: number
  estimatedCostUsd: number
  /** La fórmula se muestra al operador: número sin fórmula no es un preview honesto. */
  formula: string
}

/**
 * Costo conservador de una corrida ANTES de gastar. Peor caso deliberado: asume que el
 * enriquecimiento comprará el máximo (`enrichmentKeywords`), aunque el top-up real sólo
 * pague lo que falte o esté vencido en el store de mercado — la corrida real siempre
 * cuesta igual o menos que este número.
 *
 * `methods: []` es válido y cuesta 0: una corrida GSC-only materializa la resolución de
 * seeds y valida el pipeline completo sin ninguna llamada al proveedor.
 */
export const estimateDiscoveryCost = (input: {
  seedCount: number
  methods: readonly SeoDiscoveryMethodSpec[]
  /** Techo de keywords a enriquecer (default: el máximo del contrato). */
  enrichmentKeywords?: number
}): SeoDiscoveryCostEstimate => {
  const seedCount = Math.max(0, Math.floor(input.seedCount))

  let providerCalls = 0
  let requestedRows = 0

  for (const spec of input.methods) {
    const perCall = Math.min(MAX_DISCOVERY_RESULTS_PER_CALL, Math.max(1, Math.floor(spec.resultsPerCall)))

    // Sugerencias/relacionadas = una llamada POR seed; ideas/dominio = una llamada por corrida.
    const calls = spec.method === 'keyword_suggestions' || spec.method === 'related_keywords' ? seedCount : 1

    providerCalls += calls
    requestedRows += calls * perCall
  }

  // Top-up de enriquecimiento: sólo aplica si la expansión puede producir candidatos.
  const enrichmentCap =
    input.methods.length === 0
      ? 0
      : Math.min(MAX_DISCOVERY_ENRICHMENT_KEYWORDS, Math.max(0, Math.floor(input.enrichmentKeywords ?? MAX_DISCOVERY_ENRICHMENT_KEYWORDS)))

  const overviewCalls = Math.min(MAX_DISCOVERY_OVERVIEW_CALLS, Math.ceil(enrichmentCap / MAX_DISCOVERY_OVERVIEW_KEYWORDS_PER_CALL))

  providerCalls += overviewCalls
  requestedRows += enrichmentCap

  const setup = providerCalls * LABS_TASK_SETUP_USD
  const rows = requestedRows * LABS_RESULT_ROW_USD

  return {
    providerCalls,
    requestedRows,
    // Redondeo a 6 decimales: el ledger usa NUMERIC(14,6) y un float crudo arrastra ruido.
    estimatedCostUsd: Number((setup + rows).toFixed(6)),
    formula:
      `${providerCalls} llamada(s) × USD ${LABS_TASK_SETUP_USD} (task setup) + ` +
      `${requestedRows} fila(s) solicitadas × USD ${LABS_RESULT_ROW_USD} (por resultado); ` +
      `peor caso — el top-up de enriquecimiento sólo compra lo que falte en el store de mercado`
  }
}

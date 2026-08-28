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

/**
 * Acciones append-only sobre un candidato. Ninguna escribe tracking por sí sola.
 *
 * 🔴 **Quién escribe cada kind (TASK-1692) — la frontera es qué produjo el hecho:**
 * - `dismissed` y `rejected` → decisión HUMANA pura, vía `recordKeywordDiscoveryAction`
 *   (el `record_action` público). Ningún command las produce; alguien simplemente decidió.
 * - `selected_for_grounded_query` → lo escribe `createGroundedQueryDraft` dentro de su propia
 *   transacción. También lo escribe una RE-SELECCIÓN humana explícita de un candidato
 *   descartado, distinguible por `metadata.reason = 'reselected'`.
 * - `promoted_to_tracking` → lo escribe el camino de tracking dentro de la MISMA transacción
 *   que abre la membresía.
 *
 * **NUNCA un consumer (UI, Nexa, lane ecosystem) encadena un `record_action` para "reportar"
 * el resultado de un command.** Entre la llamada que produce el outcome y la que lo registra
 * hay una red: cuando se cae, queda el compromiso de gasto hecho y la decisión sin autor, y
 * nada reconcilia las dos mitades. El writer vive donde nace el hecho.
 *
 * ⚠️ **`selected_for_target` se retiró de este vocabulario (TASK-1692).** No tenía writer, y no
 * podía tenerlo: la intención (`target | opportunity`) es un atributo de la MEMBRESÍA, con autor
 * y fecha (TASK-1659), así que un candidato que no se sigue no puede tener intención declarada.
 * "Declarar objetivo" ES `trackKeywords` con `intent: 'target'`, y su hecho se registra como
 * `promoted_to_tracking` con `metadata.intent`. Mantenerlo vivo no era neutro: `record_action`
 * acepta cualquier kind del enum, así que quedaba una puerta para escribir —y pintar— un estado
 * de negocio que ningún command produjo. El `CHECK` de la base CONSERVA el valor a propósito:
 * una fila histórica tiene que seguir siendo legible.
 */
export type SeoDiscoveryActionKind =
  | 'dismissed'
  | 'selected_for_grounded_query'
  | 'promoted_to_tracking'
  | 'rejected'

export const SEO_DISCOVERY_ACTION_KINDS: readonly SeoDiscoveryActionKind[] = [
  'dismissed',
  'selected_for_grounded_query',
  'promoted_to_tracking',
  'rejected'
]

/**
 * Kinds que un consumer puede escribir por `record_action`: SOLO decisiones humanas puras.
 *
 * `promoted_to_tracking` no está porque nadie lo "decide" sin promover — lo produce el command
 * de tracking. `selected_for_grounded_query` SÍ está, pero únicamente como re-selección
 * explícita de un candidato descartado (`metadata.reason = 'reselected'`); el bridge escribe su
 * propia fila con la metadata del draft real.
 */
export const SEO_DISCOVERY_CONSUMER_ACTION_KINDS: readonly SeoDiscoveryActionKind[] = [
  'dismissed',
  'rejected',
  'selected_for_grounded_query'
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

/**
 * Política de frescura de una corrida: a partir de acá lo que se ve deja de leerse como actual.
 *
 * Siete días y no treinta: esta lente es un workbench DIARIO, y su decisión de salida (declarar un
 * objetivo, seguir una oportunidad) compromete gasto recurrente. El snapshot de volumen del
 * proveedor se refresca mensual, pero el SERP y el interés se mueven antes; presentar candidatos de
 * hace tres semanas sin decirlo invita a comprometer presupuesto contra una foto vieja.
 *
 * No es un bloqueo: la corrida sigue visible y sus candidatos siguen siendo accionables. Es un
 * aviso — la diferencia entre «esto es lo que hay hoy» y «esto es lo que había».
 */
export const DISCOVERY_RUN_STALE_AFTER_DAYS = 7

/**
 * `true` cuando la corrida terminó hace más de {@link DISCOVERY_RUN_STALE_AFTER_DAYS} días.
 * Una corrida sin fecha de término (aún corriendo, o fallida antes de terminar) NUNCA es stale:
 * no hay foto vieja que advertir todavía.
 */
export const isDiscoveryRunStale = (completedAt: string | null, now: Date = new Date()): boolean => {
  if (!completedAt) return false

  const completed = new Date(completedAt).getTime()

  if (!Number.isFinite(completed)) return false

  return now.getTime() - completed > DISCOVERY_RUN_STALE_AFTER_DAYS * 24 * 60 * 60 * 1000
}

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

// ─── Barrera de enlaces como filtro decisional (TASK-1694) ──────────────────────────

/**
 * Vocabulario CERRADO del filtro de barrera de enlaces.
 *
 * `unknown` NO está: no es un nivel, es la AUSENCIA del dato. Un filtro que lo dejara pasar
 * afirmaría una oportunidad que nadie midió — la doctrina del dominio es que "Sin dato" jamás
 * se lee como "Baja" (ISSUE-152). Para incluir lo no medido el caller lo pide EXPLÍCITO con
 * `includeUnknownBarrier`, y así queda dicho en su propia petición.
 *
 * El orden `low < medium < high` es el mismo de `LINK_BARRIER_SORT` en el reader; la
 * derivación de los umbrales vive SOLO en `deriveLinkBarrier` (`keyword-market-data.ts`).
 */
export type SeoDiscoveryLinkBarrierFilterLevel = 'low' | 'medium' | 'high'

export const SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS: readonly SeoDiscoveryLinkBarrierFilterLevel[] = [
  'low',
  'medium',
  'high'
]

/** Guard puro para validar un valor de borde (query param, body HTTP, argumento MCP). */
export const isDiscoveryLinkBarrierFilterLevel = (value: unknown): value is SeoDiscoveryLinkBarrierFilterLevel =>
  typeof value === 'string' && (SEO_DISCOVERY_LINK_BARRIER_FILTER_LEVELS as readonly string[]).includes(value)

/**
 * Filtros que el contrato ACEPTA pero ya NO aplica, declarados en la respuesta.
 *
 * Entre las dos formas de equivocarse —devolver de más y decirlo, o devolver el subconjunto
 * equivocado en silencio— el contrato elige la primera: un caller que recibe más filas Y la
 * razón puede corregir; uno que recibe menos filas creyendo que filtró, no.
 */
export interface SeoDiscoveryIgnoredFilter {
  filter: string
  reason: string
  /** Filtro canónico que lo reemplaza, o `null` si no hay equivalente. */
  replacement: string | null
}

/**
 * `maxDifficulty` se acepta y no decide: `keyword_difficulty` tiene piso duro en su fórmula y
 * colapsa a 0 en SERPs es-LATAM (ISSUE-152 — `pintura` marca KD 0 con 135.000 búsquedas/mes en
 * MX), así que filtrar por ella entrega keywords de barrera Alta a quien creyó pedir lo fácil.
 * Se declara en vez de eliminarse porque tres consumers vivos ya lo mandan.
 */
export const SEO_DISCOVERY_MAX_DIFFICULTY_IGNORED: SeoDiscoveryIgnoredFilter = {
  filter: 'maxDifficulty',
  reason: 'non_decisional_link_barrier_is_canonical',
  replacement: 'maxLinkBarrier'
}

// ─── Política de inclusión del borde de adquisición (TASK-1694) ─────────────────────

/**
 * Qué filas COMPRA un método de expansión.
 *
 * - `all` — se compra lo que el endpoint devuelva, con `limit` como único techo.
 * - `positive_volume_only` — el proveedor descarta server-side lo que no tiene volumen estimado.
 *
 * 🔴 Los cuatro adapters usan `all` desde TASK-1694, y no es una preferencia estética.
 * DataForSEO cobra por fila devuelta y `limit` acota las filas devueltas, así que el filtro
 * provider-side **no baja el techo de costo de la llamada**: cambia qué filas se compran por el
 * mismo precio. En un mercado grueso da lo mismo; en uno ralo —el caso fuente de ISSUE-152— el
 * filtro gasta el `limit` descartando justo el long-tail emergente que discovery existe para
 * encontrar. Y contradecía, en el borde de adquisición, la doctrina "ausencia ≠ 0" que el resto
 * del pipeline sostiene con tres estados explícitos. El equivalente honesto ya existe aguas
 * abajo: `minSearchVolume` en el contrato de lectura, que el operador ve, elige y puede quitar.
 */
export type SeoDiscoveryVolumePolicy = 'all' | 'positive_volume_only'

export const SEO_DISCOVERY_DEFAULT_VOLUME_POLICY: SeoDiscoveryVolumePolicy = 'all'

/**
 * Política con la que se compró ANTES de TASK-1694, por método.
 *
 * Una corrida vieja no registró su política en `methods_json`, así que leerla con el default
 * nuevo reescribiría su historia: diría que compró long-tail sin volumen cuando el proveedor
 * ya lo había descartado. El default de lectura REPRODUCE lo que pasó, no lo que pasaría hoy.
 */
export const SEO_DISCOVERY_HISTORICAL_VOLUME_POLICY: Record<SeoDiscoveryMethod, SeoDiscoveryVolumePolicy> = {
  keyword_suggestions: 'positive_volume_only',
  keyword_ideas: 'positive_volume_only',
  related_keywords: 'all',
  keywords_for_site: 'all'
}

export const isDiscoveryVolumePolicy = (value: unknown): value is SeoDiscoveryVolumePolicy =>
  value === 'all' || value === 'positive_volume_only'

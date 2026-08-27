/**
 * TASK-1661 — Captura de datos de mercado por keyword vía DataForSEO Labs `keyword_overview`.
 *
 * Cierra la pregunta que Search Console NO puede contestar. Para una keyword donde el cliente
 * YA rankea, GSC es mejor insumo que cualquier promedio de mercado (es demanda medida, de su
 * propia SERP). Pero donde NO rankea, GSC entrega literalmente nada: cero impresiones, sin
 * posición. Volumen y dificultad son la única forma de contestar "¿vale la pena?" y "¿cuánto
 * cuesta?" — sin esto se aceptan objetivos a ciegas.
 *
 * ⚠️ **Lente ◑ estimada, NUNCA ● medida.** Estas métricas salen de la Keyword Database del
 * proveedor (origen Google Ads, snapshot MENSUAL), no de la SERP del cliente. No se promedian
 * con GSC ni la sustituyen (boundary §1.1 de la arquitectura del módulo).
 *
 * ⚠️ **`keyword_overview` y no otro endpoint.** Trae volumen + CPC + competition + dificultad
 * + intención + `core_keyword` en UNA sola llamada. Usar `bulk_keyword_difficulty` +
 * `search_intent` por separado costaría dos task setups y obligaría a un join entre APIs para
 * el mismo dato.
 *
 * Contrato de gasto (patrón TASK-1303 / `rank-history-seed.ts`):
 *   - pre-check de frescura ANTES del provider — una keyword con captura vigente NO se re-compra;
 *   - `enforceSeoRunEntitlement` con el estimado del batch completo, antes de la primera llamada;
 *   - spend fence: re-consulta del gate cada K llamadas cobradas;
 *   - `ON CONFLICT DO NOTHING` (la tabla es append-only; su trigger prohíbe DO UPDATE);
 *   - el ledger de gasto lo escribe el TRANSPORTE, jamás este módulo.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'

import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from './provider-pricing'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type SeoLinkBarrierLevel } from './contracts'
import { enforceSeoRunEntitlement } from './entitlement'
import { isSeoKeywordMarketDataEnabled, isSeoModuleEnabled } from './flags'

/**
 * Perfil de costo Labs. Los valores viven en `provider-pricing.ts` —módulo PURO, sin
 * `server-only`— porque el preview del builder los necesita en el browser; declararlos acá
 * arrastraba `server-only` a cualquier cliente que importara el estimador, de forma transitiva
 * e invisible para el typecheck. Se re-exportan para no romper a los consumers existentes.
 */
export { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from './provider-pricing'

/**
 * Máximo documentado de `keyword_overview` (ref 02-labs §7 gotcha 8).
 *
 * Se usa el máximo del proveedor a propósito: el costo por fila es idéntico se pidan en una
 * llamada o en diez, pero el task setup se cobra POR LLAMADA. Menos llamadas es estrictamente
 * más barato. Con el techo de 200 keywords por target (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`)
 * esto siempre resuelve en una sola llamada; el chunking existe por corrección, no por costo.
 */
export const MAX_KEYWORDS_PER_OVERVIEW_CALL = 700

/** Espejo del patrón TASK-1303: re-consulta del gate cada K llamadas cobradas. */
const SPEND_FENCE_RECHECK_EVERY = 10

/**
 * Ventana de frescura. El proveedor refresca las métricas de keyword UNA VEZ AL MES siguiendo
 * el ciclo de Google Ads, así que re-comprar antes de 30 días paga de nuevo por el mismo número.
 * Es el pre-check que protege el presupuesto, no sólo la unicidad de filas.
 */
export const MARKET_DATA_FRESHNESS_DAYS = 30

/**
 * Endpoints autorizados a escribir esta tabla (espeja el CHECK de la migración; expand
 * TASK-1776 `20260827194219636`). Productores vivos: TASK-1661 (`keyword_overview`),
 * TASK-1664 (discovery: suggestions/related/ideas/for_site), TASK-1776 (`ranked_keywords` —
 * el `keyword_info` viene inline y YA PAGADO en cada fila de visibilidad por URL);
 * TASK-1662 (`domain_intersection`) sigue pendiente.
 */
export type SeoMarketDataSourceEndpoint =
  | 'keyword_overview'
  | 'keyword_suggestions'
  | 'related_keywords'
  | 'keyword_ideas'
  | 'keywords_for_site'
  | 'domain_intersection'
  | 'ranked_keywords'

export type SeoSearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional'

/**
 * Vocabulario cerrado del intent, exportado como VALOR y no sólo como tipo.
 *
 * Sin esto, un consumer que recibe el intent por query string sólo puede castear con `as` —el tipo
 * se borra en runtime— y un valor inventado entra al reader como si fuera legítimo. Acá vive el
 * SSOT para que las rutas validen contra la misma lista que tipa el dominio.
 */
export const SEO_SEARCH_INTENTS: readonly SeoSearchIntent[] = [
  'informational',
  'navigational',
  'commercial',
  'transactional'
]

export interface SeoKeywordMarketDatum {
  normalizedKeyword: string
  keyword: string
  locationCode: string
  languageCode: string
  searchVolume: number | null
  keywordDifficulty: number | null
  /** ⚠️ Competencia PAGA (Google Ads) 0–1. NO es dificultad orgánica. */
  competition: number | null
  competitionLevel: 'low' | 'medium' | 'high' | null
  cpcUsd: number | null
  searchIntent: SeoSearchIntent | null
  searchIntentProbability: number | null
  coreKeyword: string | null
  providerLastUpdatedAt: string | null
  /** Perfil de enlaces promedio del top-10 — la evidencia cruda de la barrera. */
  avgPageRank: number | null
  avgMainDomainRank: number | null
  avgBacklinks: number | null
  avgReferringDomains: number | null
}

// El TIPO vive en `contracts.ts` (lo consumen los DTOs); la DERIVACIÓN vive acá, junto a la
// evidencia que la alimenta. Una sola fuente para cada cosa.
// `unknown` NO es un cuarto nivel de dificultad: es "no lo capturamos", y se mantiene separado
// a propósito para que ninguna superficie pinte un hueco como "baja".

/**
 * Umbrales de dominios referentes promedio del top-10. Calibrados sobre las mediciones reales
 * de 2026-08-13 en MX (ver la migración): `pintura para piso` 0,1 · `berel` 30,4 · `pintura`
 * 52,6. Son un punto de partida honesto, no una constante universal — si se recalibran, se
 * recalibran ACÁ y todas las superficies siguen.
 */
export const LINK_BARRIER_REFERRING_DOMAINS_MEDIUM = 10
export const LINK_BARRIER_REFERRING_DOMAINS_HIGH = 40

/** Page rank promedio del top-10 que, por sí solo, ya implica un top-10 atrincherado. */
export const LINK_BARRIER_PAGE_RANK_HIGH = 80

/**
 * Deriva la barrera de enlaces del top-10. Pura y exportada: es una regla de producto y tiene
 * que poder probarse sin base de datos.
 *
 * 🔴 **Gobierna la DIVERSIDAD de dominios referentes, no el conteo de enlaces.** El oficio lo
 * dice (`seo-aeo` §05: "un enlace editorial relevante > 100 enlaces de directorios") y los
 * datos medidos lo confirman de forma contraintuitiva: `berel` tiene 5.125 backlinks contra los
 * 232 de `pintura`, pero MENOS dominios referentes (30,4 vs 52,6). Ordenar por conteo pondría a
 * `berel` como lo más difícil, cuando su perfil es concentrado, no diverso.
 *
 * `avgBacklinks` NO participa del cálculo — se persiste sólo para auditoría.
 */
export const deriveLinkBarrier = (input: {
  avgReferringDomains: number | null
  avgPageRank: number | null
}): SeoLinkBarrierLevel => {
  const domains = input.avgReferringDomains
  const pageRank = input.avgPageRank

  // Sin ninguna de las dos señales no se opina. Un hueco jamás se pinta como "baja".
  if (domains === null && pageRank === null) return 'unknown'

  // Un top-10 con page rank muy alto está atrincherado aunque los dominios sean pocos:
  // significa URLs individualmente muy fuertes.
  if (pageRank !== null && pageRank >= LINK_BARRIER_PAGE_RANK_HIGH) return 'high'

  if (domains === null) return 'unknown'

  if (domains >= LINK_BARRIER_REFERRING_DOMAINS_HIGH) return 'high'
  if (domains >= LINK_BARRIER_REFERRING_DOMAINS_MEDIUM) return 'medium'

  return 'low'
}

export type SeoMarketCaptureKeywordStatus =
  | 'captured'
  | 'already_fresh'
  | 'no_market_data'
  | 'budget_blocked'
  | 'provider_error'

export interface SeoMarketCaptureKeywordOutcome {
  keyword: string
  status: SeoMarketCaptureKeywordStatus
  errorCode: string | null
}

type SeoMarketBlockedReason = 'no_entitlement' | 'expired' | 'budget_exhausted' | 'quota_exhausted'

export type CaptureKeywordMarketDataResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      keywords: number
      captured: number
      alreadyFresh: number
      noMarketData: number
      budgetBlocked: number
      providerErrors: number
      providerCalls: number
      costUsd: number
      outcomes: SeoMarketCaptureKeywordOutcome[]
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_keywords' | SeoMarketBlockedReason
      status: null
    }

export type PreviewKeywordMarketDataResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      locationCode: string
      languageCode: string
      trackedKeywords: number
      /** Keywords con captura dentro de la ventana de frescura: NO se vuelven a comprar. */
      alreadyFresh: number
      /** Lo que se consultaría de verdad. */
      pendingKeywords: number
      providerCalls: number
      estimatedCostUsd: number
      /** La fórmula en texto: el preview muestra el cálculo, no sólo un número. */
      formula: string
      budgetRemainingUsd: number | null
      wouldBeAllowed: boolean
      blockedReason: string | null
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_keywords'
      status: null
    }

/**
 * Normalización canónica de la clave de mercado: NFKC + trim + lowercase + colapso de espacios.
 *
 * ⚠️ NO elimina tildes. "diseño" y "diseno" son búsquedas DISTINTAS con volúmenes distintos;
 * colapsarlas produciría un número que no corresponde a ninguna de las dos.
 */
export const normalizeMarketKeyword = (keyword: string): string =>
  keyword.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()

/** Costo determinista de una corrida. Puro: el preview y el runner comparten esta única fuente. */
export const estimateMarketDataCost = (
  pendingKeywords: number
): { providerCalls: number; estimatedCostUsd: number; formula: string } => {
  const providerCalls = Math.ceil(pendingKeywords / MAX_KEYWORDS_PER_OVERVIEW_CALL)
  const setup = providerCalls * LABS_TASK_SETUP_USD
  const rows = pendingKeywords * LABS_RESULT_ROW_USD

  return {
    providerCalls,
    // Redondeo a 6 decimales: el ledger usa NUMERIC(14,6) y un float crudo arrastra ruido.
    estimatedCostUsd: Number((setup + rows).toFixed(6)),
    formula:
      `${providerCalls} llamada(s) × USD ${LABS_TASK_SETUP_USD} (task setup) + ` +
      `${pendingKeywords} fila(s) × USD ${LABS_RESULT_ROW_USD} (por resultado)`
  }
}

const clampProbability = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  return Math.min(1, Math.max(0, value))
}

/** Decimal >= 0 o null. Los promedios del top-10 son fraccionarios (0,1 backlinks es real). */
const asNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return value
}

const asNonNegativeInt = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null

  return Math.round(value)
}

interface KeywordOverviewItem {
  keyword?: string
  keyword_info?: {
    search_volume?: number | null
    cpc?: number | null
    competition?: number | null
    competition_level?: string | null
    last_updated_time?: string | null
  } | null
  keyword_properties?: {
    keyword_difficulty?: number | null
    core_keyword?: string | null
  } | null
  /** Promedios del top-10 orgánico. Vienen GRATIS en la misma respuesta ya pagada. */
  avg_backlinks_info?: {
    backlinks?: number | null
    referring_main_domains?: number | null
    rank?: number | null
    main_domain_rank?: number | null
  } | null
  search_intent_info?: {
    main_intent?: string | null
    probability?: number | null
    last_updated_time?: string | null
  } | null
}

const INTENTS: readonly string[] = ['informational', 'navigational', 'commercial', 'transactional']
const COMPETITION_LEVELS: readonly string[] = ['low', 'medium', 'high']

/**
 * Proyecta un item de `keyword_overview` al hecho persistible. Puro y exportado: es la pieza
 * que puede cambiar de forma cuando el proveedor cambie su shape, así que se prueba sin base.
 *
 * ⚠️ Todo campo ausente se proyecta como `null`, NUNCA como 0. "El proveedor no tiene el dato"
 * y "nadie busca eso" son hechos distintos, y el contrato `market` existe justamente para
 * distinguirlos.
 */
export const parseKeywordOverviewItem = (
  item: KeywordOverviewItem,
  context: { locationCode: string; languageCode: string }
): SeoKeywordMarketDatum | null => {
  const keyword = typeof item.keyword === 'string' ? item.keyword.trim() : ''

  if (!keyword) return null

  const info = item.keyword_info ?? {}
  const properties = item.keyword_properties ?? {}
  const intentInfo = item.search_intent_info ?? {}
  const backlinksInfo = item.avg_backlinks_info ?? {}

  const rawLevel = typeof info.competition_level === 'string' ? info.competition_level.toLowerCase() : null
  const rawIntent = typeof intentInfo.main_intent === 'string' ? intentInfo.main_intent.toLowerCase() : null

  const difficulty = asNonNegativeInt(properties.keyword_difficulty)

  return {
    normalizedKeyword: normalizeMarketKeyword(keyword),
    keyword,
    locationCode: context.locationCode,
    languageCode: context.languageCode,
    searchVolume: asNonNegativeInt(info.search_volume),
    keywordDifficulty: difficulty !== null && difficulty <= 100 ? difficulty : null,
    competition: clampProbability(info.competition),
    competitionLevel: rawLevel !== null && COMPETITION_LEVELS.includes(rawLevel) ? (rawLevel as 'low' | 'medium' | 'high') : null,
    cpcUsd: typeof info.cpc === 'number' && Number.isFinite(info.cpc) && info.cpc >= 0 ? info.cpc : null,
    searchIntent: rawIntent !== null && INTENTS.includes(rawIntent) ? (rawIntent as SeoSearchIntent) : null,
    searchIntentProbability: clampProbability(intentInfo.probability),
    coreKeyword: typeof properties.core_keyword === 'string' && properties.core_keyword.trim() ? properties.core_keyword.trim() : null,
    providerLastUpdatedAt: typeof info.last_updated_time === 'string' && info.last_updated_time ? info.last_updated_time : null,
    // Perfil de enlaces del top-10: viene gratis en esta misma respuesta y hasta ahora se
    // descartaba. Es la evidencia que reemplaza al `keyword_difficulty` que colapsa a 0.
    avgPageRank: asNonNegativeNumber(backlinksInfo.rank),
    avgMainDomainRank: asNonNegativeNumber(backlinksInfo.main_domain_rank),
    avgBacklinks: asNonNegativeNumber(backlinksInfo.backlinks),
    avgReferringDomains: asNonNegativeNumber(backlinksInfo.referring_main_domains)
  }
}

const mapBlockedReason = (reason: string | null): SeoMarketBlockedReason => {
  switch (reason) {
    case 'expired':
      return 'expired'
    case 'budget_exhausted':
      return 'budget_exhausted'
    case 'quota_exhausted':
      return 'quota_exhausted'
    default:
      return 'no_entitlement'
  }
}

// `type` y no `interface`: el genérico de `runGreenhousePostgresQuery` exige
// `Record<string, unknown>`, y una interface no lo satisface (no tiene index signature implícito).
type ResolvedTarget = {
  seo_target_id: string
  organization_id: string
  location_code: string
  language_code: string
}

const loadTarget = async (seoTargetId: string): Promise<ResolvedTarget | null> => {
  const rows = await runGreenhousePostgresQuery<ResolvedTarget>(
    `SELECT seo_target_id, organization_id, location_code, language_code
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1
        AND status = 'active'`,
    [seoTargetId]
  )

  return rows[0] ?? null
}

/** Keywords VIGENTES del set monitoreado. Mismo predicado que el rank capture (TASK-1303). */
const loadTrackedKeywords = async (seoTargetId: string): Promise<string[]> => {
  const rows = await runGreenhousePostgresQuery<{ keyword: string }>(
    `SELECT DISTINCT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
      ORDER BY m.keyword`,
    [seoTargetId]
  )

  return rows.map(row => row.keyword)
}

/**
 * Keywords con captura DENTRO de la ventana de frescura: no se vuelven a comprar.
 *
 * Exportado (TASK-1664): el top-up de enriquecimiento del discovery usa EXACTAMENTE este
 * pre-check para comprar sólo lo que falta o venció — dos pre-checks distintos divergirían
 * en qué consideran "fresco" y uno de los dos pagaría de más.
 *
 * ⚠️ `capture_date` es DATE y `CURRENT_DATE` también, así que la resta da `integer` directo
 * (gate TASK-893: `EXTRACT(EPOCH FROM (date - date))` revienta en runtime).
 */
export const loadFreshMarketKeywords = async (
  normalizedKeywords: string[],
  locationCode: string,
  languageCode: string
): Promise<Set<string>> => {
  if (normalizedKeywords.length === 0) return new Set()

  const rows = await runGreenhousePostgresQuery<{ normalized_keyword: string }>(
    `SELECT DISTINCT normalized_keyword
       FROM greenhouse_growth.seo_keyword_market_data
      WHERE normalized_keyword = ANY($1::text[])
        AND location_code = $2
        AND language_code = $3
        AND (CURRENT_DATE - capture_date) < $4`,
    [normalizedKeywords, locationCode, languageCode, MARKET_DATA_FRESHNESS_DAYS]
  )

  return new Set(rows.map(row => row.normalized_keyword))
}

const loadFreshKeywords = loadFreshMarketKeywords

/**
 * Writer canónico del store de mercado — la ÚNICA forma de escribir
 * `seo_keyword_market_data` (TASK-1661 productor #1 vía `keyword_overview`; TASK-1664
 * productor #2 con el `keyword_info` inline de discovery; TASK-1776 productor #3 con el
 * `keyword_data.keyword_info` inline de `ranked_keywords` — costo 0, ya pagado en la fila
 * de visibilidad; TASK-1662 productor #4 futuro).
 *
 * Contrato del hecho:
 * - append-only con `ON CONFLICT ... DO NOTHING` (el trigger de la tabla prohíbe UPDATE);
 * - una fila con NULLs ES un hecho ("preguntamos y el proveedor no tiene el dato") — el
 *   caller decide cuándo escribirla (tres estados, jamás colapsar ausencia a 0);
 * - el costo del proveedor es por BATCH: se atribuye a la PRIMERA fila escrita y las demás
 *   quedan en 0, para que la suma de `provider_cost` no multiplique el gasto.
 */
export const persistKeywordMarketData = async (input: {
  data: readonly SeoKeywordMarketDatum[]
  sourceEndpoint: SeoMarketDataSourceEndpoint
  capturedByOrganizationId: string
  providerCostUsd: number
}): Promise<{ rowsWritten: number }> => {
  let rowsWritten = 0

  for (const datum of input.data) {
    const rowCost = rowsWritten === 0 ? input.providerCostUsd : 0

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.seo_keyword_market_data
         (normalized_keyword, keyword, location_code, language_code, capture_date,
          search_volume, keyword_difficulty, competition, competition_level, cpc_usd,
          search_intent, search_intent_probability, core_keyword, source_endpoint,
          provider_last_updated_at, captured_by_organization_id, provider_cost,
          avg_page_rank, avg_main_domain_rank, avg_backlinks, avg_referring_domains)
       VALUES ($1, $2, $3, $4, CURRENT_DATE,
               $5, $6, $7, $8, $9,
               $10, $11, $12, $13,
               $14, $15, $16,
               $17, $18, $19, $20)
       ON CONFLICT ON CONSTRAINT seo_keyword_market_data_capture_unique DO NOTHING`,
      [
        datum.normalizedKeyword,
        datum.keyword,
        datum.locationCode,
        datum.languageCode,
        datum.searchVolume,
        datum.keywordDifficulty,
        datum.competition,
        datum.competitionLevel,
        datum.cpcUsd,
        datum.searchIntent,
        datum.searchIntentProbability,
        datum.coreKeyword,
        input.sourceEndpoint,
        datum.providerLastUpdatedAt,
        input.capturedByOrganizationId,
        rowCost,
        datum.avgPageRank,
        datum.avgMainDomainRank,
        datum.avgBacklinks,
        datum.avgReferringDomains
      ]
    )

    rowsWritten += 1
  }

  return { rowsWritten }
}

/**
 * DRY RUN. Reporta qué se consultaría y cuánto costaría **sin gastar un peso**.
 *
 * Es requisito de la task, no una comodidad: la primera corrida con gasto se hace después de
 * ver este número, nunca antes.
 */
export const previewKeywordMarketDataCapture = async (
  seoTargetId: string
): Promise<PreviewKeywordMarketDataResult> => {
  if (!isSeoModuleEnabled() || !isSeoKeywordMarketDataEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const target = await loadTarget(seoTargetId)

  if (!target) return { ok: false, errorCode: 'target_not_found', status: null }

  const keywords = await loadTrackedKeywords(seoTargetId)

  if (keywords.length === 0) return { ok: false, errorCode: 'no_keywords', status: null }

  const normalized = [...new Set(keywords.map(normalizeMarketKeyword))]
  const fresh = await loadFreshKeywords(normalized, target.location_code, target.language_code)
  const pending = normalized.filter(keyword => !fresh.has(keyword))

  const { providerCalls, estimatedCostUsd, formula } = estimateMarketDataCost(pending.length)

  // Se consulta el gate SIN ejecutar nada: el preview también responde "¿me dejarían?".
  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  return {
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    locationCode: target.location_code,
    languageCode: target.language_code,
    trackedKeywords: normalized.length,
    alreadyFresh: fresh.size,
    pendingKeywords: pending.length,
    providerCalls,
    estimatedCostUsd,
    formula,
    budgetRemainingUsd: gate.budgetRemainingUsd ?? null,
    wouldBeAllowed: gate.allowed,
    blockedReason: gate.blockedReason ?? null
  }
}

/**
 * Captura real. GASTA. Sólo corre con ambos flags ON y tras pasar el gate de entitlement.
 *
 * El alcance V1 es el set monitoreado del target: acotado, predecible y con techo conocido.
 * El caso caro (todas las oportunidades detectadas) se decide con el costo por keyword ya
 * medido, no antes.
 */
export const captureKeywordMarketData = async (
  seoTargetId: string
): Promise<CaptureKeywordMarketDataResult> => {
  if (!isSeoModuleEnabled() || !isSeoKeywordMarketDataEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const target = await loadTarget(seoTargetId)

  if (!target) return { ok: false, errorCode: 'target_not_found', status: null }

  const keywords = await loadTrackedKeywords(seoTargetId)

  if (keywords.length === 0) return { ok: false, errorCode: 'no_keywords', status: null }

  // Se conserva el texto original por keyword normalizada: el proveedor recibe lo que el
  // operador escribió, no una versión mutilada.
  const originalByNormalized = new Map<string, string>()

  for (const keyword of keywords) {
    const normalized = normalizeMarketKeyword(keyword)

    if (!originalByNormalized.has(normalized)) originalByNormalized.set(normalized, keyword)
  }

  const normalized = [...originalByNormalized.keys()]
  const fresh = await loadFreshKeywords(normalized, target.location_code, target.language_code)
  const pending = normalized.filter(keyword => !fresh.has(keyword))

  const outcomes: SeoMarketCaptureKeywordOutcome[] = [...fresh].map(keyword => ({
    keyword: originalByNormalized.get(keyword) ?? keyword,
    status: 'already_fresh' as const,
    errorCode: null
  }))

  if (pending.length === 0) {
    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      keywords: normalized.length,
      captured: 0,
      alreadyFresh: outcomes.length,
      noMarketData: 0,
      budgetBlocked: 0,
      providerErrors: 0,
      providerCalls: 0,
      costUsd: 0,
      outcomes
    }
  }

  const { estimatedCostUsd } = estimateMarketDataCost(pending.length)

  const gate = await enforceSeoRunEntitlement(target.organization_id, {
    estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return { ok: false, errorCode: mapBlockedReason(gate.blockedReason), status: null }
  }

  const chunks: string[][] = []

  for (let index = 0; index < pending.length; index += MAX_KEYWORDS_PER_OVERVIEW_CALL) {
    chunks.push(pending.slice(index, index + MAX_KEYWORDS_PER_OVERVIEW_CALL))
  }

  let captured = 0
  let noMarketData = 0
  let providerErrors = 0
  let budgetBlocked = 0
  let providerCalls = 0
  let costUsd = 0
  let chargedCalls = 0
  let fenceTripped = false

  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
    const chunk = chunks[chunkIndex]

    if (chargedCalls > 0 && chargedCalls % SPEND_FENCE_RECHECK_EVERY === 0 && !fenceTripped) {
      const remaining = pending.length - chunkIndex * MAX_KEYWORDS_PER_OVERVIEW_CALL

      const fence = await enforceSeoRunEntitlement(target.organization_id, {
        estimatedCostUsd: estimateMarketDataCost(remaining).estimatedCostUsd,
        consumesAuditAllowance: false
      })

      if (!fence.allowed) fenceTripped = true
    }

    if (fenceTripped) {
      for (const keyword of chunk) {
        budgetBlocked += 1
        outcomes.push({
          keyword: originalByNormalized.get(keyword) ?? keyword,
          status: 'budget_blocked',
          errorCode: 'budget_exhausted'
        })
      }

      continue
    }

    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        endpoint: '/v3/dataforseo_labs/google/keyword_overview/live',
        organizationId: target.organization_id,
        tasks: [
          {
            keywords: chunk.map(keyword => originalByNormalized.get(keyword) ?? keyword),
            location_code: Number(target.location_code),
            language_code: target.language_code,
            include_serp_info: false,
            // ⚠️ Clickstream DUPLICA el costo del request y no aporta a esta pregunta.
            include_clickstream_data: false
          }
        ]
      })

      const providerCostUsd = response.cost ?? 0

      providerCalls += 1
      costUsd += providerCostUsd
      chargedCalls += 1

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: KeywordOverviewItem[] }>
      }

      if (!response.ok || task.status_code !== 20000) {
        // Proveedor caído NUNCA se disfraza de lista vacía: sin veredicto no se escribe nada.
        for (const keyword of chunk) {
          providerErrors += 1
          outcomes.push({
            keyword: originalByNormalized.get(keyword) ?? keyword,
            status: 'provider_error',
            errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}`
          })
        }

        continue
      }

      const items = task.result?.[0]?.items ?? []
      const byNormalized = new Map<string, SeoKeywordMarketDatum>()

      for (const item of items) {
        const datum = parseKeywordOverviewItem(item, {
          locationCode: target.location_code,
          languageCode: target.language_code
        })

        if (datum) byNormalized.set(datum.normalizedKeyword, datum)
      }

      const datums: SeoKeywordMarketDatum[] = []

      for (const keyword of chunk) {
        const found = byNormalized.get(keyword)

        // 🔴 TRES estados, no dos — descubierto en el smoke real del 2026-08-13:
        //   fila ausente        = nunca preguntamos;
        //   fila con NULL       = preguntamos y el proveedor NO tiene el dato;
        //   fila con 0          = el proveedor dice demanda cero.
        //
        // La primera versión no escribía nada cuando el proveedor no tenía la keyword. Como el
        // pre-check de frescura mira filas, esas keywords nunca quedaban "frescas" y se
        // RE-COMPRABAN en cada corrida, para siempre: el smoke lo mostró cobrando USD 0.012 en
        // una corrida que capturó cero. Registrar el intento cierra la fuga y además es más
        // honesto: "preguntamos y no hay" es un hecho que merece su fecha.
        datums.push(
          found ?? {
            normalizedKeyword: keyword,
            keyword: originalByNormalized.get(keyword) ?? keyword,
            locationCode: target.location_code,
            languageCode: target.language_code,
            searchVolume: null,
            keywordDifficulty: null,
            competition: null,
            competitionLevel: null,
            cpcUsd: null,
            searchIntent: null,
            searchIntentProbability: null,
            coreKeyword: null,
            providerLastUpdatedAt: null,
            avgPageRank: null,
            avgMainDomainRank: null,
            avgBacklinks: null,
            avgReferringDomains: null
          }
        )

        if (found) {
          captured += 1
          outcomes.push({
            keyword: originalByNormalized.get(keyword) ?? keyword,
            status: 'captured',
            errorCode: null
          })
        } else {
          // El proveedor respondió bien pero no tiene esta keyword: hecho, no error. Queda
          // registrado con su fecha para no volver a comprarlo dentro del mismo ciclo mensual.
          noMarketData += 1
          outcomes.push({
            keyword: originalByNormalized.get(keyword) ?? keyword,
            status: 'no_market_data',
            errorCode: null
          })
        }
      }

      await persistKeywordMarketData({
        data: datums,
        sourceEndpoint: 'keyword_overview',
        capturedByOrganizationId: target.organization_id,
        providerCostUsd
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_keyword_market_data' },
        extra: { seoTargetId, chunkIndex }
      })

      for (const keyword of chunk) {
        providerErrors += 1
        outcomes.push({
          keyword: originalByNormalized.get(keyword) ?? keyword,
          status: 'provider_error',
          errorCode: 'provider_unreachable'
        })
      }
    }
  }

  return {
    ok: true,
    seoTargetId,
    organizationId: target.organization_id,
    keywords: normalized.length,
    captured,
    alreadyFresh: fresh.size,
    noMarketData,
    budgetBlocked,
    providerErrors,
    providerCalls,
    costUsd,
    outcomes
  }
}

/** Frescura del dato de mercado de un target: alimenta el reader y la señal de confiabilidad. */
export interface SeoMarketDataFreshness {
  /** Keywords del set con captura vigente (dentro de la ventana). */
  freshKeywords: number
  /** Fecha de la captura más reciente disponible para ese mercado. */
  latestCaptureDate: string | null
}

export interface ReadKeywordMarketDataResult {
  market: 'available' | 'unavailable'
  /** Indexado por `normalizedKeyword`. Ausencia = no consultado, NUNCA cero. */
  byKeyword: Map<string, SeoKeywordMarketDatum>
  /**
   * Barrera de enlaces ya DERIVADA por keyword. Se expone acá para que ningún consumer
   * re-implemente los umbrales: la regla vive en `deriveLinkBarrier` y punto.
   */
  linkBarrierByKeyword: Map<string, SeoLinkBarrierLevel>
  freshness: SeoMarketDataFreshness
}

/**
 * Reader canónico del dato de mercado. ÚNICO consumo: ni la UI, ni Nexa, ni MCP, ni el
 * enriquecimiento de oportunidades tocan la tabla directo.
 *
 * ⚠️ Recibe una selección EXPLÍCITA y acotada de keywords (contrato del Delta 2026-08-08 con
 * TASK-1664): nunca una consulta libre que permita traer todas las keywords de una org.
 *
 * Devuelve la captura MÁS RECIENTE por keyword vía `DISTINCT ON`, sin ventana de frescura: si
 * el dato existe pero está viejo, el consumer merece verlo CON su `capturedAt` y decidir — es
 * lo contrario de esconderlo y mostrar un hueco.
 */
export const readKeywordMarketData = async (input: {
  keywords: string[]
  locationCode: string
  languageCode: string
}): Promise<ReadKeywordMarketDataResult> => {
  const normalized = [...new Set(input.keywords.map(normalizeMarketKeyword))].filter(Boolean)

  const empty: ReadKeywordMarketDataResult = {
    market: 'unavailable',
    byKeyword: new Map(),
    linkBarrierByKeyword: new Map(),
    freshness: { freshKeywords: 0, latestCaptureDate: null }
  }

  if (normalized.length === 0) return empty

  const rows = await runGreenhousePostgresQuery<{
    normalized_keyword: string
    keyword: string
    search_volume: number | null
    keyword_difficulty: number | null
    competition: string | null
    competition_level: string | null
    cpc_usd: string | null
    search_intent: string | null
    search_intent_probability: string | null
    core_keyword: string | null
    provider_last_updated_at: Date | null
    capture_date: Date | string
    avg_page_rank: string | null
    avg_main_domain_rank: string | null
    avg_backlinks: string | null
    avg_referring_domains: string | null
    is_fresh: boolean
  }>(
    `SELECT DISTINCT ON (normalized_keyword)
            normalized_keyword, keyword, search_volume, keyword_difficulty, competition,
            competition_level, cpc_usd, search_intent, search_intent_probability, core_keyword,
            provider_last_updated_at, capture_date,
            avg_page_rank, avg_main_domain_rank, avg_backlinks, avg_referring_domains,
            ((CURRENT_DATE - capture_date) < $4) AS is_fresh
       FROM greenhouse_growth.seo_keyword_market_data
      WHERE normalized_keyword = ANY($1::text[])
        AND location_code = $2
        AND language_code = $3
      ORDER BY normalized_keyword, capture_date DESC`,
    [normalized, input.locationCode, input.languageCode, MARKET_DATA_FRESHNESS_DAYS]
  )

  if (rows.length === 0) return empty

  const byKeyword = new Map<string, SeoKeywordMarketDatum>()
  const linkBarrierByKeyword = new Map<string, SeoLinkBarrierLevel>()
  let freshKeywords = 0
  let latestCaptureDate: string | null = null

  const asNumber = (value: string | null): number | null => {
    if (value === null) return null

    const parsed = Number(value)

    return Number.isFinite(parsed) ? parsed : null
  }

  for (const row of rows) {
    const captureDate =
      row.capture_date instanceof Date ? row.capture_date.toISOString().slice(0, 10) : String(row.capture_date).slice(0, 10)

    if (latestCaptureDate === null || captureDate > latestCaptureDate) latestCaptureDate = captureDate
    if (row.is_fresh) freshKeywords += 1

    byKeyword.set(row.normalized_keyword, {
      normalizedKeyword: row.normalized_keyword,
      keyword: row.keyword,
      locationCode: input.locationCode,
      languageCode: input.languageCode,
      searchVolume: row.search_volume,
      keywordDifficulty: row.keyword_difficulty,
      competition: asNumber(row.competition),
      competitionLevel:
        row.competition_level === 'low' || row.competition_level === 'medium' || row.competition_level === 'high'
          ? row.competition_level
          : null,
      cpcUsd: asNumber(row.cpc_usd),
      searchIntent: INTENTS.includes(row.search_intent ?? '') ? (row.search_intent as SeoSearchIntent) : null,
      searchIntentProbability: asNumber(row.search_intent_probability),
      coreKeyword: row.core_keyword,
      providerLastUpdatedAt: row.provider_last_updated_at ? row.provider_last_updated_at.toISOString() : null,
      avgPageRank: asNumber(row.avg_page_rank),
      avgMainDomainRank: asNumber(row.avg_main_domain_rank),
      avgBacklinks: asNumber(row.avg_backlinks),
      avgReferringDomains: asNumber(row.avg_referring_domains)
    })
  }

  for (const [key, datum] of byKeyword) {
    linkBarrierByKeyword.set(
      key,
      deriveLinkBarrier({ avgReferringDomains: datum.avgReferringDomains, avgPageRank: datum.avgPageRank })
    )
  }

  return {
    // `available` significa "hay dato para al menos una keyword de la selección". El detalle
    // por keyword lo dice la ausencia en el Map, que el consumer proyecta como `null`.
    market: 'available',
    byKeyword,
    linkBarrierByKeyword,
    freshness: { freshKeywords, latestCaptureDate }
  }
}

/**
 * Variante por target: resuelve el mercado (país + idioma) desde el propio target en vez de
 * confiar en lo que mande el caller.
 *
 * Existe para que ningún consumer —lane, MCP, UI— tenga que saber cómo derivar el mercado. El
 * volumen de una keyword NO es global; dejar que el caller elija el país abriría la puerta a
 * leer el mercado equivocado y a que dos superficies muestren cifras distintas para lo mismo.
 */
export const readKeywordMarketDataForTarget = async (
  seoTargetId: string,
  keywords: string[]
): Promise<(ReadKeywordMarketDataResult & { locationCode: string; languageCode: string }) | null> => {
  const target = await loadTarget(seoTargetId)

  if (!target) return null

  const result = await readKeywordMarketData({
    keywords,
    locationCode: target.location_code,
    languageCode: target.language_code
  })

  return { ...result, locationCode: target.location_code, languageCode: target.language_code }
}

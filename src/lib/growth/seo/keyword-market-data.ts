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
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { enforceSeoRunEntitlement } from './entitlement'
import { isSeoKeywordMarketDataEnabled, isSeoModuleEnabled } from './flags'

/**
 * Perfil de costo Labs verificado contra la doc oficial (as-of 2026-08-06):
 * modelo dual = se cobra el task setup del request Y cada fila devuelta.
 * `.claude/skills/dataforseo-operator/references/02-labs.md` §5.
 */
export const LABS_TASK_SETUP_USD = 0.012
export const LABS_RESULT_ROW_USD = 0.00012

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

/** Endpoints autorizados a escribir esta tabla (espeja el CHECK de la migración). */
export type SeoMarketDataSourceEndpoint =
  | 'keyword_overview'
  | 'keyword_suggestions'
  | 'related_keywords'
  | 'keyword_ideas'
  | 'keywords_for_site'
  | 'domain_intersection'

export type SeoSearchIntent = 'informational' | 'navigational' | 'commercial' | 'transactional'

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
    providerLastUpdatedAt: typeof info.last_updated_time === 'string' && info.last_updated_time ? info.last_updated_time : null
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
 * ⚠️ `capture_date` es DATE y `CURRENT_DATE` también, así que la resta da `integer` directo
 * (gate TASK-893: `EXTRACT(EPOCH FROM (date - date))` revienta en runtime).
 */
const loadFreshKeywords = async (
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

      for (const keyword of chunk) {
        const datum = byNormalized.get(keyword)

        if (!datum) {
          // El proveedor respondió bien pero no tiene esta keyword: hecho, no error.
          noMarketData += 1
          outcomes.push({
            keyword: originalByNormalized.get(keyword) ?? keyword,
            status: 'no_market_data',
            errorCode: null
          })
          continue
        }

        // El costo del provider es por BATCH: se atribuye a la primera fila del chunk y las
        // demás quedan en 0, para que la suma de `provider_cost` no multiplique el gasto real.
        const rowCost = captured === 0 ? providerCostUsd : 0

        await runGreenhousePostgresQuery(
          `INSERT INTO greenhouse_growth.seo_keyword_market_data
             (normalized_keyword, keyword, location_code, language_code, capture_date,
              search_volume, keyword_difficulty, competition, competition_level, cpc_usd,
              search_intent, search_intent_probability, core_keyword, source_endpoint,
              provider_last_updated_at, captured_by_organization_id, provider_cost)
           VALUES ($1, $2, $3, $4, CURRENT_DATE,
                   $5, $6, $7, $8, $9,
                   $10, $11, $12, 'keyword_overview',
                   $13, $14, $15)
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
            datum.providerLastUpdatedAt,
            target.organization_id,
            rowCost
          ]
        )

        captured += 1
        outcomes.push({
          keyword: originalByNormalized.get(keyword) ?? keyword,
          status: 'captured',
          errorCode: null
        })
      }
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

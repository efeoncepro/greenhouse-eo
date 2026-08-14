/**
 * TASK-1664 — Adapters tipados de los endpoints Labs Live de discovery.
 *
 * Un task por llamada, SIEMPRE vía `postDataForSeoTask` (familia `labs`): auth, timeout,
 * breaker y registro de costo viven en el transporte, jamás acá. Cada adapter arma el
 * payload EXACTO del contrato V1 de la spec y parsea la respuesta con el gate
 * `status_code === 20000` — un HTTP 200 con task fallida es `provider_error`, nunca una
 * lista vacía.
 *
 * El parser reusa `parseKeywordOverviewItem` (TASK-1661): los items de discovery traen el
 * MISMO bloque `keyword_info`/`keyword_properties`/`search_intent_info`/`avg_backlinks_info`
 * ya pagado, y proyectarlo con otra pieza duplicaría el shape del proveedor en dos lugares.
 */

import 'server-only'

import { createHash } from 'node:crypto'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'

import {
  SEO_DISCOVERY_METHOD_ENDPOINTS,
  SEO_DISCOVERY_OVERVIEW_ENDPOINT,
  type SeoDiscoveryMethod
} from './contracts'
import { parseKeywordOverviewItem, type SeoKeywordMarketDatum } from '../keyword-market-data'

// ─── Tipos ──────────────────────────────────────────────────────────────────────────

export interface DiscoveryProviderItem {
  keyword: string
  /** Posición del resultado dentro de ESA respuesta (1-based). */
  sourceRank: number
  /** Métrica de mercado inline ya pagada; `null` si el item no trajo señal de mercado. */
  datum: SeoKeywordMarketDatum | null
}

export type DiscoveryCallOutcome =
  | {
      ok: true
      items: DiscoveryProviderItem[]
      costUsd: number
      /** Hash del payload de items para correlación de candidatos; jamás el payload crudo. */
      rawPayloadHash: string
    }
  | { ok: false; errorCode: 'provider_error' | 'breaker_open'; detail: string; costUsd: number }

export interface DiscoveryCallContext {
  organizationId: string
  locationCode: string
  languageCode: string
  /** Tag correlacionable del proveedor: `runId` + hash de la subllamada. */
  tag: string
}

// ─── Parsing ────────────────────────────────────────────────────────────────────────

/**
 * `related_keywords` envuelve el bloque de keyword en `keyword_data`; el resto de los
 * endpoints lo entregan plano. Un item sin keyword se descarta (no hay qué persistir).
 */
type ProviderRawItem = Record<string, unknown> & {
  keyword_data?: Record<string, unknown> | null
}

const hasMarketSignal = (datum: SeoKeywordMarketDatum): boolean =>
  datum.searchVolume !== null ||
  datum.cpcUsd !== null ||
  datum.competition !== null ||
  datum.keywordDifficulty !== null ||
  datum.providerLastUpdatedAt !== null

const parseItems = (
  rawItems: unknown[],
  context: { locationCode: string; languageCode: string }
): DiscoveryProviderItem[] => {
  const items: DiscoveryProviderItem[] = []

  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) continue

    const entry = raw as ProviderRawItem

    const block = (entry.keyword_data && typeof entry.keyword_data === 'object' ? entry.keyword_data : entry) as Record<
      string,
      unknown
    >

    const datum = parseKeywordOverviewItem(block, context)

    if (!datum) continue

    items.push({
      keyword: datum.keyword,
      sourceRank: items.length + 1,
      // ⚠️ Sólo cuenta como hecho de mercado si el item trajo señal. Un item sin
      // `keyword_info` NO es "el proveedor no tiene el dato" (eso lo declara el top-up de
      // `keyword_overview` con su fila NULL); persistirlo acá como NULL lo marcaría fresco
      // y bloquearía la compra del dato real.
      datum: hasMarketSignal(datum) ? datum : null
    })
  }

  return items
}

const runCall = async (
  endpoint: string,
  payload: Record<string, unknown>,
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> => {
  const response = await postDataForSeoTask({
    family: 'labs',
    endpoint,
    organizationId: context.organizationId,
    tasks: [{ ...payload, tag: context.tag }]
  })

  const costUsd = response.cost ?? 0

  if (response.breakerOpen) {
    return { ok: false, errorCode: 'breaker_open', detail: 'breaker_open', costUsd }
  }

  const task = (response.tasks?.[0] ?? {}) as {
    status_code?: number
    result?: Array<{ items?: unknown[] }>
  }

  if (!response.ok || task.status_code !== 20000) {
    return {
      ok: false,
      errorCode: 'provider_error',
      detail: `task_status_${String(task.status_code ?? response.httpStatus)}`,
      costUsd
    }
  }

  const rawItems = task.result?.[0]?.items ?? []

  const items = parseItems(rawItems, {
    locationCode: context.locationCode,
    languageCode: context.languageCode
  })

  return {
    ok: true,
    items,
    costUsd,
    rawPayloadHash: createHash('sha256').update(JSON.stringify(rawItems)).digest('hex').slice(0, 32)
  }
}

// ─── Adapters por método (contrato V1 exacto de la spec) ────────────────────────────

/** Una llamada POR seed. Long-tail que contiene la seed. */
export const callKeywordSuggestions = (
  input: { seed: string; limit: number },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> =>
  runCall(
    SEO_DISCOVERY_METHOD_ENDPOINTS.keyword_suggestions,
    {
      keyword: input.seed,
      location_code: Number(context.locationCode),
      language_code: context.languageCode,
      include_seed_keyword: false,
      exact_match: false,
      include_serp_info: false,
      include_clickstream_data: false,
      limit: input.limit,
      filters: [['keyword_info.search_volume', '>', 0]]
    },
    context
  )

/** Una llamada POR seed. Términos del bloque "searches related to" con `depth=1`. */
export const callRelatedKeywords = (
  input: { seed: string; limit: number },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> =>
  runCall(
    SEO_DISCOVERY_METHOD_ENDPOINTS.related_keywords,
    {
      keyword: input.seed,
      location_code: Number(context.locationCode),
      language_code: context.languageCode,
      depth: 1,
      include_serp_info: false,
      include_clickstream_data: false,
      limit: input.limit
    },
    context
  )

/** UNA llamada para TODAS las seeds (misma categoría). */
export const callKeywordIdeas = (
  input: { seeds: readonly string[]; limit: number },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> =>
  runCall(
    SEO_DISCOVERY_METHOD_ENDPOINTS.keyword_ideas,
    {
      keywords: [...input.seeds],
      location_code: Number(context.locationCode),
      language_code: context.languageCode,
      closely_variants: false,
      include_serp_info: false,
      include_clickstream_data: false,
      limit: input.limit,
      filters: [['keyword_info.search_volume', '>', 0]]
    },
    context
  )

/** UNA llamada opcional por corrida. El target viene del dominio canónico, sin scheme. */
export const callKeywordsForSite = (
  input: { targetDomain: string; limit: number },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> =>
  runCall(
    SEO_DISCOVERY_METHOD_ENDPOINTS.keywords_for_site,
    {
      target: input.targetDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
      location_code: Number(context.locationCode),
      language_code: context.languageCode,
      include_serp_info: false,
      include_clickstream_data: false,
      limit: input.limit,
      order_by: ['relevance,desc']
    },
    context
  )

/**
 * Enriquecimiento top-up: hasta 100 keywords deduplicadas por llamada, SOLO las que no
 * tienen métrica vigente en el store de mercado. No crea seeds ni candidatos.
 */
export const callKeywordOverview = (
  input: { keywords: readonly string[] },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> =>
  runCall(
    SEO_DISCOVERY_OVERVIEW_ENDPOINT,
    {
      keywords: [...input.keywords],
      location_code: Number(context.locationCode),
      language_code: context.languageCode,
      include_serp_info: false,
      include_clickstream_data: false
    },
    context
  )

/** Despachador por método de expansión (el runner no conoce payloads del proveedor). */
export const callDiscoveryMethod = (
  method: SeoDiscoveryMethod,
  input: { seed?: string; seeds?: readonly string[]; targetDomain?: string; limit: number },
  context: DiscoveryCallContext
): Promise<DiscoveryCallOutcome> => {
  switch (method) {
    case 'keyword_suggestions':
      return callKeywordSuggestions({ seed: input.seed ?? '', limit: input.limit }, context)
    case 'related_keywords':
      return callRelatedKeywords({ seed: input.seed ?? '', limit: input.limit }, context)
    case 'keyword_ideas':
      return callKeywordIdeas({ seeds: input.seeds ?? [], limit: input.limit }, context)
    case 'keywords_for_site':
      return callKeywordsForSite({ targetDomain: input.targetDomain ?? '', limit: input.limit }, context)
  }
}

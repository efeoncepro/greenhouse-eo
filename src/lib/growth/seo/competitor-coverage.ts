/**
 * TASK-1662 Slice 2 — Captura de cobertura de keywords de un competidor declarado.
 *
 * Endpoint: `labs/google/domain_intersection` — la receta canónica del proveedor para el
 * keyword gap (ref 02-labs §8.1): comparar DOS dominios trae, en la MISMA fila ya pagada,
 * la posición de cada uno + el `keyword_data` completo (volumen, cpc, intent,
 * avg_backlinks_info para `deriveLinkBarrier()`, serp_info con las SERP features).
 *
 * Dos llamadas por competidor y ciclo:
 *   1. `intersections: false` → keywords donde el competidor ranquea y el cliente NO
 *      (el insumo de "no aparezco" — gap de contenido).
 *   2. `intersections: true`  → keywords donde ambos ranquean (el insumo de "aparezco
 *      peor" — gap de optimización).
 *
 * ═══ Lo que este módulo NO hace ═══
 *
 * - NO deriva el gap: persiste INSUMOS fechados (`seo_competitor_keyword_coverage`). El gap
 *   se calcula al leer (`keyword-gap-reader.ts`) cruzando contra el set del cliente y su
 *   GSC medido — persistirlo lo congelaría y envejecería sin señal.
 * - NO abre un segundo almacén de mercado: el `keyword_data` inline va al hecho compartido
 *   `seo_keyword_market_data` vía `persistKeywordMarketData` (productor #4, costo 0 — ya
 *   pagado en la fila de cobertura).
 * - NO decide quién es competidor: eso es una declaración humana (`competitors.ts`).
 *
 * ═══ Contrato de gasto (patrón TASK-1303 + variante de frescura TASK-1661) ═══
 *
 * Flag OFF por defecto (`GROWTH_SEO_COMPETITOR_GAP_ENABLED`, ops-worker); gate
 * `enforceSeoRunEntitlement` con el costo estimado ANTES de la primera llamada; pre-check
 * de FRESCURA contra el run ledger (`seo_competitor_coverage_runs`) — el proveedor refresca
 * su base Labs una vez al mes, así que recapturar antes de 30 días paga dos veces por el
 * mismo dato; y el VEREDICTO se persiste siempre (captured|failed), porque un competidor
 * cuya captura devuelve 0 filas de gap es un hecho ("no hay gap"), no un hueco que se
 * re-compra en cada corrida para siempre (la fuga que TASK-1661 encontró en vivo).
 *
 * V1: **un competidor por corrida** (`maxCompetitors` default 1) — el costo real se mide
 * antes de escalar.
 */

import 'server-only'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

// El ledger de gasto lo escribe el TRANSPORTE — sin este import de efecto, la primera
// llamada cobrada con organizationId LANZA (guard deliberado del contrato DataForSEO).
import './register-provider-spend'

import { enforceSeoRunEntitlement } from './entitlement'
import { isSeoCompetitorGapEnabled, isSeoModuleEnabled } from './flags'
import {
  loadFreshMarketKeywords,
  parseKeywordOverviewItem,
  persistKeywordMarketData,
  type SeoKeywordMarketDatum
} from './keyword-market-data'
import { LABS_RESULT_ROW_USD, LABS_TASK_SETUP_USD } from './provider-pricing'

/** Espeja la ventana Labs mensual (misma constante conceptual que el hecho de mercado). */
export const COMPETITOR_COVERAGE_FRESHNESS_DAYS = 30

/**
 * Techo de filas por llamada — la palanca de costo explícita (el costo Labs escala con lo
 * que DEVUELVES, no con lo que pides). 500 filas ≈ USD 0,072 por llamada; con las dos
 * llamadas el ciclo de un competidor cuesta ~USD 0,15. Knob NO-flag.
 */
export const COMPETITOR_COVERAGE_ROW_LIMIT_KNOB = 'GROWTH_SEO_COMPETITOR_COVERAGE_ROW_LIMIT'
const DEFAULT_COVERAGE_ROW_LIMIT = 500

const DOMAIN_INTERSECTION_ENDPOINT = '/v3/dataforseo_labs/google/domain_intersection/live'

export const resolveCoverageRowLimit = (env: NodeJS.ProcessEnv = process.env): number => {
  const parsed = Number.parseInt(env[COMPETITOR_COVERAGE_ROW_LIMIT_KNOB] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : DEFAULT_COVERAGE_ROW_LIMIT
}

/** Peor caso: las dos llamadas devuelven el límite completo de filas. */
export const estimateCompetitorCoverageCost = (
  rowLimit: number
): { providerCalls: number; estimatedCostUsd: number; formula: string } => {
  const perCall = LABS_TASK_SETUP_USD + rowLimit * LABS_RESULT_ROW_USD
  const estimatedCostUsd = Number((2 * perCall).toFixed(6))

  return {
    providerCalls: 2,
    estimatedCostUsd,
    formula: `2 × (${LABS_TASK_SETUP_USD} + ${rowLimit} × ${LABS_RESULT_ROW_USD})`
  }
}

/**
 * Elemento SERP de un lado de la intersección. El proveedor lo entrega directo o envuelto
 * en `serp_item` según el endpoint/versión — el extractor tolera ambos shapes; el smoke
 * contra el proveedor real (sanity de la task) es quien fija la verdad.
 */
interface RawSerpElementish {
  serp_item?: { rank_group?: number | null; rank_absolute?: number | null; url?: string | null } | null
  rank_group?: number | null
  rank_absolute?: number | null
  url?: string | null
}

interface DomainIntersectionItem {
  keyword_data?: {
    keyword?: string
    keyword_info?: Record<string, unknown> | null
    keyword_properties?: Record<string, unknown> | null
    avg_backlinks_info?: Record<string, unknown> | null
    search_intent_info?: Record<string, unknown> | null
    serp_info?: { serp_item_types?: unknown } | null
  } | null
  first_domain_serp_element?: RawSerpElementish | null
  second_domain_serp_element?: RawSerpElementish | null
}

const extractRank = (element: RawSerpElementish | null | undefined): { rank: number | null; url: string | null } => {
  if (!element) return { rank: null, url: null }

  const inner = element.serp_item ?? element
  const rawRank = inner.rank_group ?? inner.rank_absolute

  return {
    rank: typeof rawRank === 'number' && Number.isFinite(rawRank) && rawRank > 0 ? Math.round(rawRank) : null,
    url: typeof inner.url === 'string' && inner.url ? inner.url : null
  }
}

export interface ParsedCoverageRow {
  keyword: string
  competitorRank: number
  competitorUrl: string | null
  clientRank: number | null
  clientUrl: string | null
  /** `null` = el proveedor no trajo serp_info (`sin_dato`); `[]` = lo trajo vacío. */
  serpItemTypes: string[] | null
  marketDatum: SeoKeywordMarketDatum | null
}

/**
 * Proyecta un item de `domain_intersection` (target1 = COMPETIDOR, target2 = CLIENTE) al
 * insumo persistible. Pura y exportada: se prueba sin base y sin proveedor.
 */
export const parseDomainIntersectionItem = (
  item: DomainIntersectionItem,
  context: { locationCode: string; languageCode: string }
): ParsedCoverageRow | null => {
  const keywordData = item.keyword_data ?? {}
  const keyword = typeof keywordData.keyword === 'string' ? keywordData.keyword.trim() : ''

  if (!keyword) return null

  const competitor = extractRank(item.first_domain_serp_element)

  // Sin posición del competidor no hay hecho de cobertura que persistir: la fila existe
  // porque el competidor ranquea.
  if (competitor.rank === null) return null

  const client = extractRank(item.second_domain_serp_element)

  const rawTypes = keywordData.serp_info?.serp_item_types

  const serpItemTypes = Array.isArray(rawTypes)
    ? rawTypes.filter((value): value is string => typeof value === 'string').sort()
    : null

  return {
    keyword,
    competitorRank: competitor.rank,
    competitorUrl: competitor.url,
    clientRank: client.rank,
    clientUrl: client.url,
    serpItemTypes,
    marketDatum: parseKeywordOverviewItem(keywordData as Parameters<typeof parseKeywordOverviewItem>[0], context)
  }
}

type CompetitorRow = {
  seo_competitor_id: string
  seo_target_id: string
  competitor_domain: string
  organization_id: string
  root_domain: string
  location_code: string
  language_code: string
}

const loadActiveCompetitor = async (seoCompetitorId: string): Promise<CompetitorRow | null> => {
  const rows = await runGreenhousePostgresQuery<CompetitorRow>(
    `SELECT c.seo_competitor_id, c.seo_target_id, c.competitor_domain,
            t.organization_id, t.root_domain, t.location_code, t.language_code
       FROM greenhouse_growth.seo_competitors c
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = c.seo_target_id
      WHERE c.seo_competitor_id = $1
        AND c.effective_to IS NULL
        AND t.status = 'active'`,
    [seoCompetitorId]
  )

  return rows[0] ?? null
}

/**
 * ¿Hay una captura exitosa dentro de la ventana de frescura?
 * ⚠️ DATE − DATE = integer (gate TASK-893) — jamás EXTRACT(EPOCH …).
 */
const hasFreshCoverageRun = async (seoCompetitorId: string): Promise<boolean> => {
  const rows = await runGreenhousePostgresQuery<{ fresh: boolean }>(
    `SELECT EXISTS (
        SELECT 1
          FROM greenhouse_growth.seo_competitor_coverage_runs
         WHERE seo_competitor_id = $1
           AND status = 'captured'
           AND (CURRENT_DATE - capture_date) < $2
      ) AS fresh`,
    [seoCompetitorId, COMPETITOR_COVERAGE_FRESHNESS_DAYS]
  )

  return rows[0]?.fresh === true
}

export type CaptureCompetitorCoverageResult =
  | { status: 'disabled' }
  | { status: 'competitor_not_found' }
  | { status: 'skipped_fresh'; seoCompetitorId: string }
  | { status: 'budget_blocked'; seoCompetitorId: string; blockedReason: string | null; estimatedCostUsd: number }
  | { status: 'failed'; seoCompetitorId: string; coverageRunId: string | null; errorCode: string; providerCostUsd: number }
  | {
      status: 'captured'
      seoCompetitorId: string
      coverageRunId: string
      rowsWritten: number
      contentGapRows: number
      overlapRows: number
      marketRowsWritten: number
      providerCostUsd: number
    }

/** DRY RUN: qué se compraría y a qué costo, sin gastar. La primera corrida real va después. */
export const previewCompetitorCoverageCapture = async (
  seoCompetitorId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<
  | { ok: false; errorCode: 'disabled' | 'competitor_not_found' }
  | {
      ok: true
      seoCompetitorId: string
      competitorDomain: string
      clientDomain: string
      fresh: boolean
      rowLimit: number
      providerCalls: number
      estimatedCostUsd: number
      formula: string
      gateAllowed: boolean
      gateBlockedReason: string | null
    }
> => {
  if (!isSeoModuleEnabled(env) || !isSeoCompetitorGapEnabled(env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  const competitor = await loadActiveCompetitor(seoCompetitorId)

  if (!competitor) return { ok: false, errorCode: 'competitor_not_found' }

  const rowLimit = resolveCoverageRowLimit(env)
  const estimate = estimateCompetitorCoverageCost(rowLimit)
  const fresh = await hasFreshCoverageRun(seoCompetitorId)

  const gate = await enforceSeoRunEntitlement(competitor.organization_id, {
    estimatedCostUsd: estimate.estimatedCostUsd,
    consumesAuditAllowance: false
  })

  return {
    ok: true,
    seoCompetitorId,
    competitorDomain: competitor.competitor_domain,
    clientDomain: competitor.root_domain,
    fresh,
    rowLimit,
    providerCalls: estimate.providerCalls,
    estimatedCostUsd: estimate.estimatedCostUsd,
    formula: estimate.formula,
    gateAllowed: gate.allowed,
    gateBlockedReason: gate.blockedReason
  }
}

const insertCoverageRun = async (input: {
  competitor: CompetitorRow
  status: 'captured' | 'failed'
  errorCode: string | null
  rowsWritten: number
  providerCostUsd: number
  sourceRunId: string
}): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ coverage_run_id: string }>(
    `INSERT INTO greenhouse_growth.seo_competitor_coverage_runs
       (seo_competitor_id, seo_target_id, location_code, language_code, capture_date,
        status, error_code, rows_written, provider_cost, source_run_id)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9)
     ON CONFLICT (seo_competitor_id, capture_date) WHERE status = 'captured' DO NOTHING
     RETURNING coverage_run_id`,
    [
      input.competitor.seo_competitor_id,
      input.competitor.seo_target_id,
      input.competitor.location_code,
      input.competitor.language_code,
      input.status,
      input.errorCode,
      input.rowsWritten,
      input.providerCostUsd,
      input.sourceRunId
    ]
  )

  return rows[0]?.coverage_run_id ?? null
}

/**
 * Captura la cobertura de UN competidor. El flag y la frescura se validan acá (no sólo en
 * el batch): este command es el único camino con gasto y no confía en su caller.
 */
export const captureCompetitorCoverage = async (
  seoCompetitorId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<CaptureCompetitorCoverageResult> => {
  if (!isSeoModuleEnabled(env) || !isSeoCompetitorGapEnabled(env)) {
    return { status: 'disabled' }
  }

  const competitor = await loadActiveCompetitor(seoCompetitorId)

  if (!competitor) return { status: 'competitor_not_found' }

  if (await hasFreshCoverageRun(seoCompetitorId)) {
    return { status: 'skipped_fresh', seoCompetitorId }
  }

  const rowLimit = resolveCoverageRowLimit(env)
  const estimate = estimateCompetitorCoverageCost(rowLimit)

  const gate = await enforceSeoRunEntitlement(competitor.organization_id, {
    estimatedCostUsd: estimate.estimatedCostUsd,
    consumesAuditAllowance: false
  })

  if (!gate.allowed) {
    return {
      status: 'budget_blocked',
      seoCompetitorId,
      blockedReason: gate.blockedReason,
      estimatedCostUsd: estimate.estimatedCostUsd
    }
  }

  const sourceRunId = `task-1662-coverage-${Date.now()}`
  let providerCostUsd = 0

  const runCall = async (
    intersections: boolean
  ): Promise<{ ok: true; items: DomainIntersectionItem[] } | { ok: false; errorCode: string }> => {
    try {
      const response = await postDataForSeoTask({
        family: 'labs',
        consumer: 'seo',
        endpoint: DOMAIN_INTERSECTION_ENDPOINT,
        organizationId: competitor.organization_id,
        tasks: [
          {
            // target1 = COMPETIDOR, target2 = CLIENTE. Con `intersections: false` el
            // proveedor devuelve donde target1 ranquea y target2 no — exactamente el
            // insumo de "no aparezco". El orden NO es decorativo.
            target1: competitor.competitor_domain,
            target2: competitor.root_domain,
            location_code: Number(competitor.location_code),
            language_code: competitor.language_code,
            intersections,
            include_serp_info: true,
            // ⚠️ Clickstream DUPLICA el costo y no aporta a esta pregunta.
            include_clickstream_data: false,
            limit: rowLimit,
            // Palanca de costo, NO orden de salida: dentro del límite comprado se
            // prioriza el volumen alto (el reader devuelve orden NEUTRAL — la cola de
            // TASK-1700 es la autoridad de orden).
            order_by: ['keyword_data.keyword_info.search_volume,desc'],
            tag: 'task-1662-competitor-coverage'
          }
        ]
      })

      providerCostUsd += response.cost ?? 0

      const task = (response.tasks?.[0] ?? {}) as {
        status_code?: number
        result?: Array<{ items?: DomainIntersectionItem[] }>
      }

      // HTTP 200 ≠ éxito: el veredicto es el status_code POR TASK. Un fallo jamás se
      // disfraza de "cero filas de gap".
      if (!response.ok || task.status_code !== 20000) {
        return { ok: false, errorCode: `task_status_${String(task.status_code ?? response.httpStatus)}` }
      }

      return { ok: true, items: task.result?.flatMap(result => result.items ?? []) ?? [] }
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_competitor_coverage_call' },
        extra: { seoCompetitorId, intersections }
      })

      return { ok: false, errorCode: 'transport_error' }
    }
  }

  // Secuencial a propósito (no Promise.all): la segunda llamada no se dispara si la
  // primera reventó — medio gasto es mejor que gasto entero sin veredicto.
  const contentGapCall = await runCall(false)

  const overlapCall = contentGapCall.ok ? await runCall(true) : contentGapCall

  if (!contentGapCall.ok || !overlapCall.ok) {
    const errorCode = !contentGapCall.ok ? contentGapCall.errorCode : (overlapCall as { errorCode: string }).errorCode

    // El fallo TAMBIÉN se persiste (no consume la ranura de frescura — índice parcial
    // WHERE status='captured'): sin veredicto, el gasto de la corrida rota sería invisible.
    const coverageRunId = await insertCoverageRun({
      competitor,
      status: 'failed',
      errorCode,
      rowsWritten: 0,
      providerCostUsd,
      sourceRunId
    })

    return { status: 'failed', seoCompetitorId, coverageRunId, errorCode, providerCostUsd }
  }

  const context = { locationCode: competitor.location_code, languageCode: competitor.language_code }

  const contentGapRows = contentGapCall.items
    .map(item => parseDomainIntersectionItem(item, context))
    .filter((row): row is ParsedCoverageRow => row !== null)
    // Defensa por si el proveedor devolviera una fila con posición del cliente en la
    // llamada de no-intersección: el insumo de "no aparezco" no lleva client_rank.
    .map(row => ({ ...row, clientRank: null, clientUrl: null }))

  const overlapRows = overlapCall.items
    .map(item => parseDomainIntersectionItem(item, context))
    .filter((row): row is ParsedCoverageRow => row !== null && row.clientRank !== null)

  // Si una keyword aparece en ambas respuestas manda la fila con posición del cliente
  // (overlap): es el hecho más completo del par.
  const byKeyword = new Map<string, ParsedCoverageRow>()

  for (const row of contentGapRows) byKeyword.set(row.keyword, row)
  for (const row of overlapRows) byKeyword.set(row.keyword, row)

  const rows = [...byKeyword.values()]

  try {
    const coverageRunId = await insertCoverageRun({
      competitor,
      status: 'captured',
      errorCode: null,
      rowsWritten: rows.length,
      providerCostUsd,
      sourceRunId
    })

    if (!coverageRunId) {
      // La ranura del día ya estaba tomada (carrera con otra corrida): el gasto quedó en el
      // ledger, pero no hay run propio que anclar — se reporta como skip tardío.
      return { status: 'skipped_fresh', seoCompetitorId }
    }

    for (const row of rows) {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_growth.seo_competitor_keyword_coverage
           (coverage_run_id, seo_competitor_id, seo_target_id, keyword,
            location_code, language_code, capture_date,
            competitor_rank, competitor_url, client_rank, client_url, serp_item_types)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, $10, $11)
         ON CONFLICT ON CONSTRAINT seo_competitor_keyword_coverage_run_keyword_unique DO NOTHING`,
        [
          coverageRunId,
          competitor.seo_competitor_id,
          competitor.seo_target_id,
          row.keyword,
          competitor.location_code,
          competitor.language_code,
          row.competitorRank,
          row.competitorUrl,
          row.clientRank,
          row.clientUrl,
          row.serpItemTypes === null ? null : JSON.stringify(row.serpItemTypes)
        ]
      )
    }

    // ── Hecho de mercado compartido (productor #4, costo 0 — ya pagado en la fila) ──
    // Pre-check de frescura para no escribir filas que el ciclo mensual ya tiene.
    const data = rows
      .map(row => row.marketDatum)
      .filter((datum): datum is SeoKeywordMarketDatum => datum !== null)

    let marketRowsWritten = 0

    if (data.length > 0) {
      const freshKeywords = await loadFreshMarketKeywords(
        data.map(datum => datum.normalizedKeyword),
        competitor.location_code,
        competitor.language_code
      )

      const pending = data.filter(datum => !freshKeywords.has(datum.normalizedKeyword))

      if (pending.length > 0) {
        const persisted = await persistKeywordMarketData({
          data: pending,
          sourceEndpoint: 'domain_intersection',
          capturedByOrganizationId: competitor.organization_id,
          providerCostUsd: 0
        })

        marketRowsWritten = persisted.rowsWritten
      }
    }

    return {
      status: 'captured',
      seoCompetitorId,
      coverageRunId,
      rowsWritten: rows.length,
      contentGapRows: rows.filter(row => row.clientRank === null).length,
      overlapRows: rows.filter(row => row.clientRank !== null).length,
      marketRowsWritten,
      providerCostUsd
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_competitor_coverage_persist' },
      extra: { seoCompetitorId, rows: rows.length }
    })

    return { status: 'failed', seoCompetitorId, coverageRunId: null, errorCode: 'persist_failed', providerCostUsd }
  }
}

export interface CompetitorCoverageBatchSummary {
  status: 'disabled' | 'completed'
  eligible: number
  attempted: number
  captured: number
  skippedFresh: number
  budgetBlocked: number
  failed: number
  providerCostUsd: number
  outcomes: Array<
    | CaptureCompetitorCoverageResult
    | { status: 'dry_run'; seoCompetitorId: string; estimatedCostUsd: number; fresh: boolean }
  >
}

/**
 * Batch del worker. V1: `maxCompetitors` default **1** — la spec manda medir el costo real
 * de UN competidor antes de escalar; subirlo es una decisión del operador, no un default.
 */
export const runCompetitorCoverageBatch = async (
  options: { maxCompetitors?: number; dryRun?: boolean; env?: NodeJS.ProcessEnv } = {}
): Promise<CompetitorCoverageBatchSummary> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoCompetitorGapEnabled(env)) {
    return {
      status: 'disabled',
      eligible: 0,
      attempted: 0,
      captured: 0,
      skippedFresh: 0,
      budgetBlocked: 0,
      failed: 0,
      providerCostUsd: 0,
      outcomes: []
    }
  }

  const maxCompetitors = Math.max(1, options.maxCompetitors ?? 1)

  // Elegibles: competidores VIGENTES de targets activos SIN captura fresca. La frescura se
  // filtra ya en el listado para que el batch no queme su cupo (`maxCompetitors`) en skips.
  const eligibleRows = await runGreenhousePostgresQuery<{ seo_competitor_id: string }>(
    `SELECT c.seo_competitor_id
       FROM greenhouse_growth.seo_competitors c
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = c.seo_target_id
      WHERE c.effective_to IS NULL
        AND t.status = 'active'
        AND NOT EXISTS (
          SELECT 1
            FROM greenhouse_growth.seo_competitor_coverage_runs r
           WHERE r.seo_competitor_id = c.seo_competitor_id
             AND r.status = 'captured'
             AND (CURRENT_DATE - r.capture_date) < $1
        )
      ORDER BY c.declared_at ASC`,
    [COMPETITOR_COVERAGE_FRESHNESS_DAYS]
  )

  const summary: CompetitorCoverageBatchSummary = {
    status: 'completed',
    eligible: eligibleRows.length,
    attempted: 0,
    captured: 0,
    skippedFresh: 0,
    budgetBlocked: 0,
    failed: 0,
    providerCostUsd: 0,
    outcomes: []
  }

  for (const row of eligibleRows.slice(0, maxCompetitors)) {
    summary.attempted += 1

    if (options.dryRun) {
      const preview = await previewCompetitorCoverageCapture(row.seo_competitor_id, env)

      summary.outcomes.push({
        status: 'dry_run',
        seoCompetitorId: row.seo_competitor_id,
        estimatedCostUsd: preview.ok ? preview.estimatedCostUsd : 0,
        fresh: preview.ok ? preview.fresh : false
      })
      continue
    }

    const outcome = await captureCompetitorCoverage(row.seo_competitor_id, env)

    summary.outcomes.push(outcome)

    if (outcome.status === 'captured') {
      summary.captured += 1
      summary.providerCostUsd += outcome.providerCostUsd
    } else if (outcome.status === 'skipped_fresh') {
      summary.skippedFresh += 1
    } else if (outcome.status === 'budget_blocked') {
      summary.budgetBlocked += 1
    } else if (outcome.status === 'failed') {
      summary.failed += 1
      summary.providerCostUsd += outcome.providerCostUsd
    }
  }

  summary.providerCostUsd = Number(summary.providerCostUsd.toFixed(6))

  return summary
}

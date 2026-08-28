/**
 * TASK-1662 Slice 3 — `readKeywordGap`: el gap competitivo DERIVADO al leer.
 *
 * Responde la tercera pregunta del módulo — ¿qué búsquedas gana la competencia donde el
 * cliente es invisible? — cruzando los INSUMOS fechados de cobertura
 * (`seo_competitor_keyword_coverage`, lente ◑ estimada) contra el set del cliente y su GSC
 * medido (●). El gap NUNCA se persiste: persistirlo lo congela y envejece sin señal.
 *
 * ═══ Los cuatro invariantes que dan forma al contrato ═══
 *
 * 1. 🔴 **Cuando hay medición, el gap se calla.** Una keyword con impresiones en el GSC del
 *    cliente en la ventana NO es gap: existe una posición MEDIDA y la conversación correcta
 *    es la de la superficie de oportunidades ("estoy en la 14, ¿cómo llego a la 5?"), no
 *    "no aparezco". El reader la EXCLUYE y declara cuántas excluyó — ● gana sobre ◑
 *    también en el ordenamiento, no sólo al pintar.
 *
 * 2. 🔴 **El reader NO devuelve orden propio.** Entrega hechos + factores con procedencia y
 *    fecha; las listas van en orden NEUTRAL (alfabético por keyword — deliberadamente
 *    inservible como prioridad). Quien ordena es la cola priorizada (TASK-1700), con su
 *    `priority_score_version`. El ancla para su `evidence_ref` OPACA es el
 *    `coverageRunId` (`seo:competitor_gap:<coverage_run_id>`) — nunca FK, nunca JOIN.
 *
 * 3. **"No aparezco" ≠ "aparezco peor".** Contenido nuevo (`contentGap`) y optimización
 *    (`ranksWorse`) son dos hechos separados en el contrato; colapsarlos produce una lista
 *    inflada donde lo verdaderamente nuevo se pierde. Y una keyword ya declarada `target`
 *    (TASK-1659) NO es un hallazgo: es un compromiso en curso — viaja en `declaredTargets`,
 *    con su fecha, jamás mezclada con lo descubierto.
 *
 * 4. **Un factor ausente se declara `sin_dato`, nunca 0 ni "baja".** Volumen/cpc/barrera
 *    salen del hecho de mercado compartido (con su `asOf`); las SERP features de la
 *    cobertura (`null` = el proveedor no las trajo); la banda alcanzable se deriva SOLO de
 *    la barrera de enlaces por un mapa puro versionado (`link_barrier_v1`) — es un factor
 *    declarativo, NO un score.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { COMPETITOR_COVERAGE_FRESHNESS_DAYS } from './competitor-coverage'
import { listActiveCompetitors } from './competitors'
import { type SeoCompetitorSummary, type SeoKeywordIntent, type SeoLinkBarrierLevel } from './contracts'
import { resolveSeoEntitlement } from './entitlement'
import { isSeoModuleEnabled } from './flags'
import { deriveLinkBarrier } from './keyword-market-data'

/** Ventana GSC para la exclusión por demanda medida — misma ventana que el gap SEO↔AEO. */
export const KEYWORD_GAP_GSC_WINDOW_DAYS = 28

/** Techo de filas por lista y competidor. El excedente se DECLARA en `truncated`. */
const DEFAULT_ROW_LIMIT = 500
const MAX_ROW_LIMIT = 1000

/**
 * Versión del mapa barrera → banda alcanzable. Cambiar el mapa exige subir la versión: la
 * cola registra qué derivación leyó.
 */
export const ATTAINABLE_POSITION_BASIS = 'link_barrier_v1'

export type AttainablePositionBand = 'top10_possible' | 'page2_likely' | 'blocked_by_links' | 'sin_dato'

/**
 * Banda alcanzable derivada SOLO de la barrera de enlaces (mapa puro, versionado).
 * `unknown` NUNCA degrada a optimista: sin evidencia, `sin_dato`.
 */
export const deriveAttainablePositionBand = (barrier: SeoLinkBarrierLevel): AttainablePositionBand => {
  switch (barrier) {
    case 'low':
      return 'top10_possible'
    case 'medium':
      return 'page2_likely'
    case 'high':
      return 'blocked_by_links'
    default:
      return 'sin_dato'
  }
}

export interface KeywordGapFactors {
  /** ◑ estimado del hecho de mercado; `null` = sin_dato (sin fila fresca o sin dato del proveedor). */
  searchVolume: number | null
  cpcUsd: number | null
  /** `unknown` se pinta "Sin dato" — jamás "baja". */
  linkBarrier: SeoLinkBarrierLevel
  /** Fecha del hecho de mercado que alimentó volumen/cpc/barrera; `null` = sin fila. */
  marketAsOf: string | null
  /** SERP features de la cobertura. `null` = el proveedor no trajo serp_info (`sin_dato`). */
  serpFeatures: string[] | null
  /** Derivado de `serpFeatures`; `null` = sin_dato (nunca se asume "sin AIO"). */
  aiOverviewPresent: boolean | null
  attainablePositionBand: AttainablePositionBand
  attainablePositionBasis: typeof ATTAINABLE_POSITION_BASIS
}

export interface KeywordGapRow {
  keyword: string
  classification: 'content_gap' | 'ranks_worse'
  /** Posición del competidor según el proveedor (◑), as-of la fecha de la cobertura. */
  competitorRank: number
  competitorUrl: string | null
  /** Sólo en `ranks_worse`: posición del cliente según el proveedor (◑, NO GSC). */
  clientRank: number | null
  /**
   * Membresía vigente en el set del cliente (sin intención declarada o `opportunity`).
   * `target` jamás llega acá — va en `declaredTargets`.
   */
  clientSetMembership: { intent: Exclude<SeoKeywordIntent, 'target'> | null } | null
  factors: KeywordGapFactors
}

export interface DeclaredTargetRow {
  keyword: string
  /** Desde cuándo es compromiso declarado — la fecha que evita venderlo como hallazgo. */
  intentDeclaredAt: string | null
  competitorRank: number
  clientRank: number | null
}

export interface CompetitorGapCoverage {
  competitor: SeoCompetitorSummary
  coverage:
    | { state: 'no_coverage' }
    | {
        state: 'available'
        /** Ancla del `evidence_ref` opaco de la cola: `seo:competitor_gap:<coverage_run_id>`. */
        coverageRunId: string
        captureDate: string
        /** Más viejo que la ventana de frescura del proveedor: se declara, no se esconde. */
        stale: boolean
        contentGap: KeywordGapRow[]
        ranksWorse: KeywordGapRow[]
        declaredTargets: DeclaredTargetRow[]
        excluded: {
          /** 🔴 Con impresiones GSC en la ventana: manda la lente medida (●). */
          measuredInGsc: number
          /** El cliente ranquea igual o mejor que el competidor: no hay gap. */
          clientBetterOrEqual: number
        }
        /** Filas más allá del límite por lista — cap DECLARADO, nunca silencioso. */
        truncated: { contentGap: number; ranksWorse: number }
      }
}

export type KeywordGapResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      /** Todo lo de acá es lente ◑ estimada del proveedor; lo medido (●) sólo EXCLUYE. */
      lens: 'estimated'
      gscWindowDays: number
      competitors: CompetitorGapCoverage[]
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'no_entitlement' | 'query_failed'; status: null }

interface CoverageRow extends Record<string, unknown> {
  coverage_run_id: string
  seo_competitor_id: string
  keyword: string
  competitor_rank: number
  competitor_url: string | null
  client_rank: number | null
  serp_item_types: unknown
}

interface MarketRow extends Record<string, unknown> {
  normalized_keyword: string
  search_volume: number | null
  cpc_usd: string | number | null
  avg_page_rank: string | number | null
  avg_referring_domains: string | number | null
  capture_date: string
}

const asNumber = (value: string | number | null): number | null => {
  if (value === null) return null

  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

export interface ReadKeywordGapOptions {
  /** Acota a UN competidor declarado del target. */
  seoCompetitorId?: string
  /** Techo de filas por lista y competidor (default 500, máx 1000). El resto se declara. */
  limit?: number
  env?: NodeJS.ProcessEnv
}

export const readKeywordGap = async (
  seoTargetId: string,
  options: ReadKeywordGapOptions = {}
): Promise<KeywordGapResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const limit = Math.min(Math.max(1, options.limit ?? DEFAULT_ROW_LIMIT), MAX_ROW_LIMIT)

  try {
    const targets = await runGreenhousePostgresQuery<{
      organization_id: string
      location_code: string
      language_code: string
    }>(
      `SELECT organization_id, location_code, language_code
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targets[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const entitlement = await resolveSeoEntitlement(target.organization_id, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const allCompetitors = await listActiveCompetitors(seoTargetId)

    const competitors = options.seoCompetitorId
      ? allCompetitors.filter(competitor => competitor.seoCompetitorId === options.seoCompetitorId)
      : allCompetitors

    if (competitors.length === 0) {
      return {
        ok: true,
        seoTargetId,
        organizationId: target.organization_id,
        lens: 'estimated',
        gscWindowDays: KEYWORD_GAP_GSC_WINDOW_DAYS,
        competitors: []
      }
    }

    const competitorIds = competitors.map(competitor => competitor.seoCompetitorId)

    // Última captura exitosa por competidor. ⚠️ DATE − DATE = integer (gate TASK-893).
    const runs = await runGreenhousePostgresQuery<{
      seo_competitor_id: string
      coverage_run_id: string
      capture_date: string
      age_days: number
    }>(
      `SELECT DISTINCT ON (seo_competitor_id)
              seo_competitor_id, coverage_run_id, capture_date::text AS capture_date,
              (CURRENT_DATE - capture_date)::int AS age_days
         FROM greenhouse_growth.seo_competitor_coverage_runs
        WHERE seo_competitor_id = ANY($1::text[])
          AND status = 'captured'
        ORDER BY seo_competitor_id, capture_date DESC`,
      [competitorIds]
    )

    const runByCompetitor = new Map(runs.map(run => [run.seo_competitor_id, run]))
    const runIds = runs.map(run => run.coverage_run_id)

    const coverageRows =
      runIds.length > 0
        ? await runGreenhousePostgresQuery<CoverageRow>(
            `SELECT coverage_run_id, seo_competitor_id, keyword,
                    competitor_rank, competitor_url, client_rank, serp_item_types
               FROM greenhouse_growth.seo_competitor_keyword_coverage
              WHERE coverage_run_id = ANY($1::text[])
              ORDER BY keyword ASC`,
            [runIds]
          )
        : []

    const keywords = [...new Set(coverageRows.map(row => row.keyword.toLowerCase()))]

    // ● Demanda medida del cliente en la ventana — la lente que EXCLUYE.
    const measuredRows =
      keywords.length > 0
        ? await runGreenhousePostgresQuery<{ query: string }>(
            `SELECT query
               FROM greenhouse_growth.seo_gsc_daily
              WHERE organization_id = $1
                AND capture_date >= (CURRENT_DATE - $2::int)
                AND query = ANY($3::text[])
              GROUP BY query
             HAVING SUM(impressions) > 0`,
            [target.organization_id, KEYWORD_GAP_GSC_WINDOW_DAYS, keywords]
          )
        : []

    const measured = new Set(measuredRows.map(row => row.query))

    // Membresías vigentes del set del cliente, con su intención declarada (TASK-1659).
    const membershipRows = await runGreenhousePostgresQuery<{
      keyword: string
      intent: string | null
      intent_declared_at: string | null
    }>(
      `SELECT m.keyword, m.intent, m.intent_declared_at::text AS intent_declared_at
         FROM greenhouse_growth.seo_keyword_set_members m
         JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
        WHERE s.seo_target_id = $1
          AND m.effective_to IS NULL`,
      [seoTargetId]
    )

    const membershipByKeyword = new Map(
      membershipRows.map(row => [
        row.keyword,
        { intent: (row.intent as SeoKeywordIntent | null) ?? null, intentDeclaredAt: row.intent_declared_at }
      ])
    )

    // ◑ Hecho de mercado más reciente por keyword (JOIN intra-SEO permitido; el boundary
    // prohibido es hacia grader_* y hacia la cola).
    const marketRows =
      keywords.length > 0
        ? await runGreenhousePostgresQuery<MarketRow>(
            `SELECT DISTINCT ON (normalized_keyword)
                    normalized_keyword, search_volume, cpc_usd,
                    avg_page_rank, avg_referring_domains, capture_date::text AS capture_date
               FROM greenhouse_growth.seo_keyword_market_data
              WHERE normalized_keyword = ANY($1::text[])
                AND location_code = $2
                AND language_code = $3
              ORDER BY normalized_keyword, capture_date DESC`,
            [keywords, target.location_code, target.language_code]
          )
        : []

    const marketByKeyword = new Map(marketRows.map(row => [row.normalized_keyword, row]))

    const buildFactors = (row: CoverageRow): KeywordGapFactors => {
      const market = marketByKeyword.get(row.keyword.toLowerCase()) ?? null

      const linkBarrier: SeoLinkBarrierLevel = market
        ? deriveLinkBarrier({
            avgReferringDomains: asNumber(market.avg_referring_domains),
            avgPageRank: asNumber(market.avg_page_rank)
          })
        : 'unknown'

      const serpFeatures = Array.isArray(row.serp_item_types)
        ? (row.serp_item_types as unknown[]).filter((value): value is string => typeof value === 'string')
        : null

      return {
        searchVolume: market ? market.search_volume : null,
        cpcUsd: market ? asNumber(market.cpc_usd) : null,
        linkBarrier,
        marketAsOf: market ? market.capture_date : null,
        serpFeatures,
        aiOverviewPresent: serpFeatures === null ? null : serpFeatures.includes('ai_overview'),
        attainablePositionBand: deriveAttainablePositionBand(linkBarrier),
        attainablePositionBasis: ATTAINABLE_POSITION_BASIS
      }
    }

    const result: CompetitorGapCoverage[] = competitors.map(competitor => {
      const run = runByCompetitor.get(competitor.seoCompetitorId)

      if (!run) {
        // Degradación honesta: un competidor sin cobertura SE DICE, no se omite.
        return { competitor, coverage: { state: 'no_coverage' as const } }
      }

      const rows = coverageRows.filter(row => row.coverage_run_id === run.coverage_run_id)

      const contentGap: KeywordGapRow[] = []
      const ranksWorse: KeywordGapRow[] = []
      const declaredTargets: DeclaredTargetRow[] = []
      let measuredInGsc = 0
      let clientBetterOrEqual = 0

      for (const row of rows) {
        const normalized = row.keyword.toLowerCase()

        // 🔴 Invariante 1: con demanda medida manda la lente ● — fuera del gap, declarado.
        if (measured.has(normalized)) {
          measuredInGsc += 1
          continue
        }

        const membership = membershipByKeyword.get(normalized) ?? null

        // Invariante 3: un compromiso declarado no es un hallazgo.
        if (membership?.intent === 'target') {
          declaredTargets.push({
            keyword: row.keyword,
            intentDeclaredAt: membership.intentDeclaredAt,
            competitorRank: row.competitor_rank,
            clientRank: row.client_rank
          })
          continue
        }

        if (row.client_rank !== null && row.client_rank <= row.competitor_rank) {
          clientBetterOrEqual += 1
          continue
        }

        const gapRow: KeywordGapRow = {
          keyword: row.keyword,
          classification: row.client_rank === null ? 'content_gap' : 'ranks_worse',
          competitorRank: row.competitor_rank,
          competitorUrl: row.competitor_url,
          clientRank: row.client_rank,
          clientSetMembership: membership
            ? { intent: membership.intent === 'opportunity' ? 'opportunity' : null }
            : null,
          factors: buildFactors(row)
        }

        if (gapRow.classification === 'content_gap') contentGap.push(gapRow)
        else ranksWorse.push(gapRow)
      }

      // Orden NEUTRAL: alfabético por keyword — deliberadamente inservible como prioridad.
      // Se ordena ACÁ además del ORDER BY del SQL (defensa en profundidad): el contrato
      // "el reader no ordena por score" no puede depender de que nadie toque la query.
      const byKeyword = (a: { keyword: string }, b: { keyword: string }) => a.keyword.localeCompare(b.keyword)

      contentGap.sort(byKeyword)
      ranksWorse.sort(byKeyword)
      declaredTargets.sort(byKeyword)

      // El techo se aplica por lista y el excedente se DECLARA.
      const truncated = {
        contentGap: Math.max(0, contentGap.length - limit),
        ranksWorse: Math.max(0, ranksWorse.length - limit)
      }

      return {
        competitor,
        coverage: {
          state: 'available' as const,
          coverageRunId: run.coverage_run_id,
          captureDate: run.capture_date,
          stale: run.age_days >= COMPETITOR_COVERAGE_FRESHNESS_DAYS,
          contentGap: contentGap.slice(0, limit),
          ranksWorse: ranksWorse.slice(0, limit),
          declaredTargets,
          excluded: { measuredInGsc, clientBetterOrEqual },
          truncated
        }
      }
    })

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      lens: 'estimated',
      gscWindowDays: KEYWORD_GAP_GSC_WINDOW_DAYS,
      competitors: result
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_keyword_gap_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

/**
 * TASK-1303 — Reader canónico `readRankEvolution` (la película de posiciones en el
 * tiempo — backend de la pantalla ancla de EPIC-022, TASK-1307).
 *
 * SoT split (arch SEO §4): rangos dentro de la ventana caliente (~180d) se sirven desde
 * PG (`seo_rank_snapshots`, índice `(seo_target_id, keyword, capture_date DESC)`);
 * rangos largos caen a BigQuery `greenhouse_growth_analytics.seo_rank_history` (historia
 * larga espejada por el mirror reactivo).
 *
 * Contrato de honestidad §5: sirve SOLO la serie DataForSEO (posición exacta de mercado).
 * NUNCA se promedia ni mezcla con la serie GSC — ese cruce vive en el report layer.
 *
 * Consumer-agnóstico (Full API Parity): UI, Nexa, lane ecosystem y MCP consumen este
 * mismo reader. El plano fino de capability (`growth.seo.observation.read` vía `can()`)
 * es responsabilidad del consumer; la resolución de entitlement del lane máquina vive en
 * `ecosystem-growth-seo.ts`.
 */

import 'server-only'

import { getBigQueryClient, getBigQueryProjectId } from '@/lib/bigquery'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { RankEvolutionPoint, RankEvolutionResult, RankEvolutionSeries, SeoRankDevice } from './contracts'
import { isSeoModuleEnabled } from './flags'
import { resolveSantiagoCaptureDate } from './rank-capture'
import { SEO_RANK_HISTORY_DATASET, SEO_RANK_HISTORY_TABLE } from './rank-history-bq-mirror'

/**
 * Ventana caliente PG (~180d, arch §4). Dentro de ella el read es Postgres-first; más
 * allá, BigQuery. El tamaño definitivo se recalibra con el patrón de queries de la
 * pantalla ancla (follow-up declarado en la task).
 */
export const RANK_EVOLUTION_HOT_WINDOW_DAYS = 180

const DEFAULT_RANGE_DAYS = 90
const MAX_RANGE_DAYS = 1825 // ~5 años de historia larga
const MAX_KEYWORDS_FILTER = 100

export interface ReadRankEvolutionOptions {
  /** Filtro opcional de keywords exactas (máx 100). */
  keywords?: string[]
  /** Días hacia atrás desde hoy (default 90; clamp 1..1825). */
  rangeDays?: number
  engine?: string
  device?: SeoRankDevice
}

type SeriesRow = {
  keyword: string
  date: string
  position: number | null
  url: string | null
  ai_overview?: boolean | null
}

const groupSeries = (rows: SeriesRow[]): RankEvolutionSeries[] => {
  const byKeyword = new Map<string, RankEvolutionPoint[]>()

  for (const row of rows) {
    const points = byKeyword.get(row.keyword) ?? []

    points.push({
      date: row.date,
      position: row.position,
      url: row.url,
      // Sólo viaja cuando ES true: el campo es aditivo y los consumers legacy comparan
      // puntos por igualdad estructural.
      ...(row.ai_overview === true ? { aiOverview: true } : {})
    })
    byKeyword.set(row.keyword, points)
  }

  return [...byKeyword.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([keyword, points]) => ({ keyword, points }))
}

const readSeriesFromPostgres = async (input: {
  seoTargetId: string
  engine: string
  device: string
  rangeDays: number
  keywords: string[] | null
}): Promise<SeriesRow[]> => {
  const params: unknown[] = [input.seoTargetId, input.engine, input.device, input.rangeDays]
  let keywordFilter = ''

  if (input.keywords) {
    params.push(input.keywords)
    keywordFilter = 'AND keyword = ANY($5)'
  }

  // Date-math canónico: `CURRENT_DATE - integer` es DATE (nunca EXTRACT EPOCH — TASK-893).
  return runGreenhousePostgresQuery<SeriesRow>(
    `SELECT keyword,
            capture_date::text AS date,
            position,
            url,
            (serp_features ? 'ai_overview') AS ai_overview
       FROM greenhouse_growth.seo_rank_snapshots
      WHERE seo_target_id = $1
        AND engine = $2
        AND device = $3
        AND capture_date >= CURRENT_DATE - ($4::int - 1)
        ${keywordFilter}
      ORDER BY keyword, capture_date`,
    params
  )
}

const readSeriesFromBigQuery = async (input: {
  seoTargetId: string
  engine: string
  device: string
  rangeDays: number
  keywords: string[] | null
}): Promise<SeriesRow[]> => {
  const projectId = getBigQueryProjectId()
  const bigQuery = getBigQueryClient()

  const keywordFilter = input.keywords ? 'AND keyword IN UNNEST(@keywords)' : ''

  const [rows] = await bigQuery.query({
    query: `SELECT keyword,
                   CAST(capture_date AS STRING) AS date,
                   position,
                   url,
                   ('ai_overview' IN UNNEST(IFNULL(JSON_VALUE_ARRAY(serp_features), []))) AS ai_overview
              FROM \`${projectId}.${SEO_RANK_HISTORY_DATASET}.${SEO_RANK_HISTORY_TABLE}\`
             WHERE seo_target_id = @seo_target_id
               AND engine = @engine
               AND device = @device
               AND capture_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @range_days - 1 DAY)
               ${keywordFilter}
             ORDER BY keyword, capture_date`,
    params: {
      seo_target_id: input.seoTargetId,
      engine: input.engine,
      device: input.device,
      range_days: input.rangeDays,
      ...(input.keywords ? { keywords: input.keywords } : {})
    },
    types: {
      seo_target_id: 'STRING',
      engine: 'STRING',
      device: 'STRING',
      range_days: 'INT64',
      ...(input.keywords ? { keywords: ['STRING'] } : {})
    }
  })

  return (rows as Array<Record<string, unknown>>).map(row => ({
    keyword: String(row.keyword),
    date: String(row.date),
    position: typeof row.position === 'number' ? row.position : null,
    url: typeof row.url === 'string' ? row.url : null,
    ai_overview: row.ai_overview === true
  }))
}

const shiftIsoDate = (isoDate: string, deltaDays: number): string => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  date.setUTCDate(date.getUTCDate() + deltaDays)

  return date.toISOString().slice(0, 10)
}

export const readRankEvolution = async (
  seoTargetId: string,
  options: ReadRankEvolutionOptions = {}
): Promise<RankEvolutionResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const engine = options.engine ?? 'google'
  const device: SeoRankDevice = options.device ?? 'desktop'

  const rawRange = options.rangeDays ?? DEFAULT_RANGE_DAYS
  const rangeDays = Math.min(MAX_RANGE_DAYS, Math.max(1, Math.floor(rawRange)))

  const keywords =
    options.keywords && options.keywords.length > 0
      ? options.keywords.map(keyword => keyword.trim()).filter(Boolean).slice(0, MAX_KEYWORDS_FILTER)
      : null

  try {
    const targetRows = await runGreenhousePostgresQuery<{ seo_target_id: string; organization_id: string }>(
      `SELECT seo_target_id, organization_id
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targetRows[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const source = rangeDays <= RANK_EVOLUTION_HOT_WINDOW_DAYS ? 'postgres' : 'bigquery'

    const rows =
      source === 'postgres'
        ? await readSeriesFromPostgres({ seoTargetId, engine, device, rangeDays, keywords })
        : await readSeriesFromBigQuery({ seoTargetId, engine, device, rangeDays, keywords })

    if (rows.length === 0) {
      // Serie vacía = estado honesto (target recién configurado, captura pausada o
      // filtro sin matches) — no un éxito con series fantasma.
      return { ok: false, errorCode: 'no_data', status: null }
    }

    const to = resolveSantiagoCaptureDate()
    const from = shiftIsoDate(to, -(rangeDays - 1))

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      engine,
      device,
      range: { from, to, days: rangeDays },
      source,
      series: groupSeries(rows)
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_rank_evolution_reader' },
      extra: { seoTargetId, rangeDays, engine, device }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

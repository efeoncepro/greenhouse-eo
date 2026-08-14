/**
 * TASK-1302 — Reader canónico de oportunidades striking-distance.
 *
 * Primitive gobernado (Full API Parity): lo consumen UI (TASK-1308), Nexa y el lane
 * ecosystem/MCP (TASK-1645) sin duplicar el join en ningún consumer.
 *
 * ═══ Decisiones de método (validadas con la skill `seo-aeo`, 2026-08-05) ═══
 *
 * 1. POSICIÓN 8–20. 8–10 es el mejor ratio esfuerzo/retorno (Google ya te tiene en la
 *    página 1 para esa query, falta un empujón a top-5); 11–20 es la página 2 clásica.
 *
 * 2. "ALTA IMPRESIÓN" ES UN PERCENTIL, NO UN NÚMERO. Un sitio con 100 impresiones/día y
 *    uno con 1M no pueden compartir umbral absoluto. Se resuelve el percentil sobre la
 *    propia distribución de la organización, con un piso mínimo para validez estadística
 *    (una keyword con 2 impresiones tiene una "posición media" que no significa nada).
 *
 * 3. VENTANA DE 28 DÍAS, Y LA POSICIÓN SE PONDERA POR IMPRESIONES. `AVG(position)` entre
 *    días está MAL: GSC ya entrega su `position` ponderada por impresiones dentro del
 *    período, así que promediar días planos le daría el mismo peso a un día de 2
 *    impresiones que a uno de 500. Correcto: `SUM(position × impressions) / SUM(impressions)`.
 *
 * 4. EL SCORE NO NECESITA DATOS DE MERCADO. Las impresiones de GSC YA SON la demanda
 *    medida — y son mejores que un volumen estimado por un tercero, porque son de TU SERP.
 *    Score = `impresiones × (CTR_esperado_en_objetivo − CTR_actual)` = clics incrementales
 *    estimados. La curva de CTR por posición se deriva de los datos de la PROPIA org, así
 *    que absorbe sola el efecto de los AI Overviews en ese sitio concreto. DataForSEO
 *    (TASK-1300), cuando aterrice, será un enriquecimiento — no el corazón del cálculo.
 *
 * 5. FALSOS POSITIVOS. Una query con varias páginas en la ventana no es una oportunidad
 *    de optimización sino de CONSOLIDACIÓN (canibalización: dos URLs compitiendo por la
 *    misma intención se diluyen). Se marca, no se descarta: la acción es distinta.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type KeywordOpportunitiesResult, type KeywordOpportunity } from './contracts'
import { normalizeMarketKeyword, readKeywordMarketData } from './keyword-market-data'

const DEFAULT_WINDOW_DAYS = 28
const DEFAULT_MIN_POSITION = 8
const DEFAULT_MAX_POSITION = 20
/** Posición a la que se aspira llegar; define el CTR objetivo del score. */
const DEFAULT_TARGET_POSITION = 5
/** Percentil de impresiones dentro de la propia org. */
const DEFAULT_IMPRESSIONS_PERCENTILE = 0.75
/** Piso absoluto: bajo esto la "posición media" no es estadísticamente interpretable. */
const MIN_IMPRESSIONS_FLOOR = 10
const DEFAULT_LIMIT = 50

/**
 * SQL del striking-distance, exportado para que el sanity live lo ejercite EXACTAMENTE.
 *
 * `seo_gsc_daily` es append-only (trigger no-delete), así que un sanity no puede limpiar con
 * `DELETE` como hacen los demás del repo: tiene que correr dentro de una transacción que
 * aborta. Y una transacción de prueba no puede ver lo que hace este reader, porque el reader
 * usa el pool. Por eso el script ejercita este SQL sobre su conexión fijada — y lo importa de
 * acá en vez de copiarlo, para que no pueda quedar verde probando una versión vieja.
 *
 * Nota date-math (gate TASK-893): `capture_date` es DATE. No se usa `EXTRACT(EPOCH FROM
 * (a - b))` en ningún punto — sólo comparación contra `CURRENT_DATE - $n::int`, que es la
 * forma segura sobre columnas DATE.
 *
 * Parámetros: `$1` organizationId · `$2` windowDays · `$3` minPosition · `$4` maxPosition ·
 * `$5` impressionsThreshold · `$6` limit.
 */
export const SEO_KEYWORD_OPPORTUNITIES_SQL = `WITH per_query AS (
         SELECT query,
                SUM(impressions)                                            AS impressions,
                SUM(clicks)                                                 AS clicks,
                -- Ponderada por impresiones: promediar días planos daría el mismo peso
                -- a un día de 2 impresiones que a uno de 500.
                SUM(position * impressions) / NULLIF(SUM(impressions), 0)    AS weighted_position,
                COUNT(DISTINCT page)                                         AS competing_pages
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query
       ),
       best_page AS (
         SELECT DISTINCT ON (query) query, page
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query, page
          ORDER BY query, SUM(impressions) DESC, MIN(position) ASC
       )
       SELECT pq.query AS keyword,
              bp.page,
              pq.weighted_position,
              pq.impressions,
              pq.clicks,
              pq.competing_pages
         FROM per_query pq
         JOIN best_page bp ON bp.query = pq.query
        WHERE pq.weighted_position >= $3::numeric
          AND pq.weighted_position <= $4::numeric
          AND pq.impressions >= $5::int
        ORDER BY pq.impressions DESC
        LIMIT $6::int`

export interface ReadKeywordOpportunitiesOptions {
  windowDays?: number
  minPosition?: number
  maxPosition?: number
  targetPosition?: number
  impressionsPercentile?: number
  limit?: number
}

interface OpportunityRow extends Record<string, unknown> {
  keyword: string
  page: string
  weighted_position: string
  impressions: string
  clicks: string
  competing_pages: string
}

/**
 * Curva de CTR por posición **de la propia organización**.
 *
 * Se prefiere sobre cualquier tabla de industria porque incorpora automáticamente cómo
 * los AI Overviews están deprimiendo el CTR en ESE sitio y vertical. Devuelve un mapa
 * posición-entera → CTR observado.
 */
const readOrgCtrCurve = async (organizationId: string, windowDays: number): Promise<Map<number, number>> => {
  const rows = await runGreenhousePostgresQuery<{ position_bucket: string; ctr: string }>(
    `SELECT ROUND(position)::int AS position_bucket,
            (SUM(clicks)::numeric / NULLIF(SUM(impressions), 0)) AS ctr
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1
        AND capture_date >= (CURRENT_DATE - $2::int)
        AND position > 0
      GROUP BY ROUND(position)::int
     HAVING SUM(impressions) >= $3`,
    [organizationId, windowDays, MIN_IMPRESSIONS_FLOOR]
  )

  const curve = new Map<number, number>()

  for (const row of rows) {
    const ctr = Number(row.ctr)

    if (Number.isFinite(ctr)) curve.set(Number(row.position_bucket), ctr)
  }

  return curve
}

/**
 * CTR esperado en una posición, con fallback monótono.
 *
 * Si la org todavía no tiene datos propios para esa posición se usa la curva pública de
 * referencia — marcada como aproximación, no como medición. Nunca devuelve un CTR
 * objetivo menor al actual (eso produciría una "oportunidad" negativa).
 */
const FALLBACK_CTR_CURVE: Record<number, number> = {
  1: 0.27, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.03, 9: 0.027, 10: 0.025
}

const expectedCtrAt = (position: number, curve: Map<number, number>): number => {
  const bucket = Math.max(1, Math.round(position))
  const measured = curve.get(bucket)

  if (typeof measured === 'number') return measured

  return FALLBACK_CTR_CURVE[bucket] ?? 0.02
}

/**
 * Lee las oportunidades striking-distance de un `seo_target`.
 *
 * El target aporta la organización y el dominio; la serie GSC está anclada a la org
 * (ver la migración de TASK-1302), así que acá se resuelve target → org.
 */
export const readKeywordOpportunities = async (
  seoTargetId: string,
  options: ReadKeywordOpportunitiesOptions = {}
): Promise<KeywordOpportunitiesResult> => {
  const windowDays = Math.max(1, options.windowDays ?? DEFAULT_WINDOW_DAYS)
  const minPosition = Math.max(1, options.minPosition ?? DEFAULT_MIN_POSITION)
  const maxPosition = Math.max(minPosition, options.maxPosition ?? DEFAULT_MAX_POSITION)
  const targetPosition = Math.max(1, options.targetPosition ?? DEFAULT_TARGET_POSITION)
  const percentile = Math.min(0.99, Math.max(0, options.impressionsPercentile ?? DEFAULT_IMPRESSIONS_PERCENTILE))
  const limit = Math.max(1, options.limit ?? DEFAULT_LIMIT)

  try {
    // TASK-1661: el mercado se resuelve con el target, porque el volumen de una keyword NO es
    // global — el de Chile no es el de México — y sin país la cifra no es correcta para nadie.
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
    const organizationId = target?.organization_id

    if (!organizationId || !target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // Umbral de impresiones resuelto sobre la propia distribución de la org.
    const thresholdRows = await runGreenhousePostgresQuery<{ threshold: string | null }>(
      `SELECT PERCENTILE_CONT($3::numeric) WITHIN GROUP (ORDER BY total_impressions) AS threshold
         FROM (
           SELECT SUM(impressions) AS total_impressions
             FROM greenhouse_growth.seo_gsc_daily
            WHERE organization_id = $1
              AND capture_date >= (CURRENT_DATE - $2::int)
            GROUP BY query
         ) per_query`,
      [organizationId, windowDays, percentile]
    )

    const rawThreshold = Number(thresholdRows[0]?.threshold ?? 0)
    const impressionsThreshold = Math.max(MIN_IMPRESSIONS_FLOOR, Number.isFinite(rawThreshold) ? Math.round(rawThreshold) : MIN_IMPRESSIONS_FLOOR)

    // Nota date-math (gate TASK-893): `capture_date` es DATE. No se usa
    // EXTRACT(EPOCH FROM (a - b)) en ningún punto — sólo comparación contra
    // `CURRENT_DATE - $n::int`, que es la forma segura sobre columnas DATE.
    const rows = await runGreenhousePostgresQuery<OpportunityRow>(
      SEO_KEYWORD_OPPORTUNITIES_SQL,
      [organizationId, windowDays, minPosition, maxPosition, impressionsThreshold, limit]
    )

    const curve = await readOrgCtrCurve(organizationId, windowDays)
    const targetCtr = expectedCtrAt(targetPosition, curve)

    // TASK-1661 — enriquecimiento de mercado (lente ◑ estimada). Se pide SÓLO por las keywords
    // que el striking-distance ya seleccionó: una selección explícita y acotada, nunca una
    // consulta libre sobre toda la org. Si no hay dato, el reader sigue entregando el
    // striking-distance completo (que es demanda MEDIDA y no depende de esto).
    const marketData = await readKeywordMarketData({
      keywords: rows.map(row => row.keyword ?? '').filter(Boolean),
      locationCode: target.location_code,
      languageCode: target.language_code
    })

    const opportunities: KeywordOpportunity[] = rows
      .map(row => {
        const impressions = Number(row.impressions)
        const clicks = Number(row.clicks)
        const position = Number(row.weighted_position)
        const competingPages = Number(row.competing_pages)
        const ctr = impressions > 0 ? clicks / impressions : 0

        // Ausencia en el Map = "no lo consultamos", que se proyecta `null`. NUNCA 0: el
        // contrato separa "sin dato" de "nadie lo busca" y colapsarlos borraría esa diferencia.
        const market = marketData.byKeyword.get(normalizeMarketKeyword(row.keyword ?? ''))

        return {
          keyword: row.keyword ?? '',
          page: row.page,
          position: Number(position.toFixed(2)),
          impressions,
          clicks,
          ctr: Number(ctr.toFixed(6)),
          // Nunca negativo: si la keyword ya convierte mejor que la media de la posición
          // objetivo, la ganancia estimada es 0, no un número que invita a "optimizar".
          estimatedClickGain: Math.round(impressions * Math.max(0, targetCtr - ctr)),
          quickWin: position <= 10,
          cannibalized: competingPages > 1,
          competingPages,
          searchVolume: market?.searchVolume ?? null,
          difficulty: market?.keywordDifficulty ?? null,
          // Derivada del perfil de enlaces del top-10, NO de `difficulty` — ese índice colapsa
          // a 0 en SERPs es-LATAM y no discrimina (ISSUE-152 delta 2026-08-14).
          linkBarrier:
            marketData.linkBarrierByKeyword.get(normalizeMarketKeyword(row.keyword ?? '')) ?? 'unknown'
        }
      })
      .sort((a, b) => b.estimatedClickGain - a.estimatedClickGain)

    return {
      ok: true,
      organizationId,
      seoTargetId,
      windowDays,
      impressionsThreshold,
      // TASK-1661: deja de estar cableado. `available` cuando hay al menos una captura de
      // mercado para las keywords de esta lectura; `unavailable` cuando no se ha consultado
      // nada todavía. El striking-distance NO depende de esto — se calcula con datos MEDIDOS
      // de GSC — así que el reader entrega valor completo en ambos casos y sólo declara si el
      // enriquecimiento estimado (◑) está o no.
      market: marketData.market,
      opportunities
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_keyword_opportunities_reader' },
      extra: { seoTargetId, windowDays }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}

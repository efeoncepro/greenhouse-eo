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

import { type KeywordOpportunitiesResult, type KeywordOpportunity, type SeoKeywordOpportunityOrder } from './contracts'
import { readOrgCtrCurve, resolveExpectedCtrAtPosition } from './ctr-curve'
import { normalizeMarketKeyword, readKeywordMarketData } from './keyword-market-data'

const DEFAULT_WINDOW_DAYS = 28
const DEFAULT_MIN_POSITION = 8
const DEFAULT_MAX_POSITION = 20
/** Posición a la que se aspira llegar; define el CTR objetivo del score. */
const DEFAULT_TARGET_POSITION = 5
/** Percentil de impresiones dentro de la propia org. */
const DEFAULT_IMPRESSIONS_PERCENTILE = 0.75
/**
 * Piso absoluto de la LENTE: bajo esto la "posición media" no es estadísticamente
 * interpretable, así que la keyword no entra al striking-distance.
 *
 * 🔴 **NO es el piso de validez de la curva de CTR, y jamás vuelve a serlo (TASK-1792).**
 * Son dos preguntas estadísticas distintas y este número sólo responde la primera:
 *
 * - «¿es interpretable la posición media?» → 10 basta (mismo uso legítimo en
 *   `gap/read-seo-aeo-gap.ts`).
 * - «¿es estimable el CTR en este bucket?» → necesita ~1.000 impresiones **y** clics, porque
 *   la precisión de un estimador de tasa la gobiernan los éxitos, no los ensayos. Un bucket
 *   con 10 impresiones y 0 clics es compatible con cualquier CTR entre 0% y 26%.
 *
 * Reutilizar este 10 para la segunda pregunta fue la mitad del defecto original, y nada en el
 * código marcaba que la misma constante respondía dos cosas. Ese piso vive ahora en
 * `ctr-curve.ts`, adoptado de la config versionada del score.
 */
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
 * Criterio SECUNDARIO de orden: impresiones × cercanía a página 1. **Todo medido.**
 *
 * Se usa cuando el techo estimado no puede ordenar —porque la curva propia no es utilizable
 * en la posición objetivo, o porque la ganancia salió idéntica en todas las filas— y la lente
 * lo DECLARA en `orderedBy`. Ambos factores salen de GSC: las impresiones son demanda medida
 * y la posición es la ponderada de la ventana. No hay nada estimado acá, que es justamente por
 * qué sirve de respaldo.
 *
 * La cercanía es lineal sobre el rango de la lente y acotada a [0,1]: una keyword en la
 * posición 8 está más cerca del empujón a top-5 que una en la 20, con las mismas impresiones.
 */
const measuredDemandRank = (
  opportunity: Pick<KeywordOpportunity, 'impressions' | 'position'>,
  minPosition: number,
  maxPosition: number
): number => {
  const span = Math.max(1, maxPosition + 1 - minPosition)
  const proximity = Math.min(1, Math.max(0, (maxPosition + 1 - opportunity.position) / span))

  return opportunity.impressions * proximity
}

/** `true` cuando el campo no discrimina: todas las filas llevan el mismo valor. */
const hasNoVariance = (values: number[]): boolean => values.length > 1 && values.every(value => value === values[0])

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

    const impressionsThreshold = Math.max(
      MIN_IMPRESSIONS_FLOOR,
      Number.isFinite(rawThreshold) ? Math.round(rawThreshold) : MIN_IMPRESSIONS_FLOOR
    )

    // Nota date-math (gate TASK-893): `capture_date` es DATE. No se usa
    // EXTRACT(EPOCH FROM (a - b)) en ningún punto — sólo comparación contra
    // `CURRENT_DATE - $n::int`, que es la forma segura sobre columnas DATE.
    const rows = await runGreenhousePostgresQuery<OpportunityRow>(SEO_KEYWORD_OPPORTUNITIES_SQL, [
      organizationId,
      windowDays,
      minPosition,
      maxPosition,
      impressionsThreshold,
      limit
    ])

    const curve = await readOrgCtrCurve(organizationId, windowDays)
    // TASK-1792 — el veredicto DECLARA de dónde sale el CTR objetivo y con qué muestra, en vez
    // de que el consumidor lo infiera de la presencia de una clave en un `Map`.
    const ctrVerdict = resolveExpectedCtrAtPosition(curve, targetPosition)
    const targetCtr = ctrVerdict.expectedCtr

    // TASK-1661 — enriquecimiento de mercado (lente ◑ estimada). Se pide SÓLO por las keywords
    // que el striking-distance ya seleccionó: una selección explícita y acotada, nunca una
    // consulta libre sobre toda la org. Si no hay dato, el reader sigue entregando el
    // striking-distance completo (que es demanda MEDIDA y no depende de esto).
    const marketData = await readKeywordMarketData({
      keywords: rows.map(row => row.keyword ?? '').filter(Boolean),
      locationCode: target.location_code,
      languageCode: target.language_code
    })

    const scored: KeywordOpportunity[] = rows.map(row => {
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
        linkBarrier: marketData.linkBarrierByKeyword.get(normalizeMarketKeyword(row.keyword ?? '')) ?? 'unknown'
      }
    })

    // ── TASK-1792: el orden es honesto o dice que no lo es ────────────────────
    //
    // Dos motivos, uno por cada forma en que el techo deja de ser un criterio:
    //
    // 1. La curva propia no es utilizable en la posición objetivo. El techo existe, pero sale
    //    de una tabla prestada: sirve para mostrarlo declarado, no para decidir qué va arriba.
    // 2. La curva SÍ es utilizable y aun así la ganancia salió idéntica en todas las filas —
    //    por ejemplo, todas ya convierten por encima de la media de la posición objetivo, así
    //    que todas colapsan a 0 por el `Math.max(0, …)`. Un `.sort()` sobre un campo de
    //    varianza cero es un no-op: preserva el orden de entrada y finge haber ordenado.
    //
    // En ambos casos la lente ordena por demanda MEDIDA y lo declara en `orderedBy`. Ordenar
    // igual y callarlo es exactamente lo que dejó la pantalla sin orden sin que nadie lo notara.
    const orderedBy: SeoKeywordOpportunityOrder =
      ctrVerdict.source === 'org_measured' && !hasNoVariance(scored.map(row => row.estimatedClickGain))
        ? 'estimated_click_gain'
        : 'measured_demand'

    const opportunities =
      orderedBy === 'estimated_click_gain'
        ? [...scored].sort((a, b) => b.estimatedClickGain - a.estimatedClickGain)
        : [...scored].sort(
            (a, b) => measuredDemandRank(b, minPosition, maxPosition) - measuredDemandRank(a, minPosition, maxPosition)
          )

    return {
      ok: true,
      organizationId,
      seoTargetId,
      windowDays,
      impressionsThreshold,
      targetPosition: ctrVerdict.targetPosition,
      expectedCtrAtTarget: ctrVerdict.expectedCtr,
      ctrCurveSource: ctrVerdict.source,
      curveSampleSize: ctrVerdict.sampleSize,
      orderedBy,
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

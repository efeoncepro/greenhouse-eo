import 'server-only'

/**
 * TASK-1700 — Colector `consolidation`: canibalización con verbo propio.
 *
 * La auditoría lo llama brecha S8: "la canibalización se detecta y muere ahí". El reader de
 * oportunidades marca `competing_pages > 1` y la deja en la MISMA lista que las de
 * optimizar, así que la señal existe y no produce trabajo.
 *
 * 🔴 No es una keyword que empujar: son dos URLs que fusionar. Ordenarla junto a un
 * "optimizar" hace que el operador tome la acción equivocada — le pide más contenido a un
 * problema causado por tener contenido de más.
 *
 * A diferencia del striking-distance, acá NO se filtra por rango de posición: una query
 * canibalizada en posición 3 sigue diluyendo autoridad, y esperar a que caiga a la 8 para
 * verla es esperar a que el problema empeore.
 *
 * ⚠️ Sí comparte el MISMO umbral de impresiones (percentil sobre la propia distribución de la
 * org), y eso no es cosmético: con el piso crudo de 10 impresiones, la primera corrida real
 * sobre berel.com devolvió 400 canibalizaciones contra 161 striking-distance y el techo por
 * origen recortó 200. La asimetría no describía el sitio, describía dos umbrales distintos
 * para la misma pregunta ("¿esta query tiene volumen suficiente para merecer trabajo?").
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { normalizeMarketKeyword } from '../../keyword-market-data'
import { SEO_COMPETING_PAGE_CTE, evaluateCannibalization } from '../cannibalization'
import { resolveImpressionsThreshold } from './gsc-striking-distance'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'consolidation' as const

/**
 * SQL exportado para el sanity live. Posición ponderada por impresiones (promediar días
 * planos le daría el mismo peso a un día de 2 impresiones que a uno de 500), y la página
 * "principal" es la de más impresiones — la candidata natural a absorber a las otras.
 *
 * 🔴 El SQL trae CANDIDATAS (multi-página sobre el umbral), no canibalizadas. Quién lo está
 * lo decide `evaluateCannibalization` en TS, y sólo ahí: tener el predicado partido entre
 * este SQL y el TS del striking-distance es justo lo que dejaría que los dos se separaran en
 * silencio.
 *
 * Nota date-math (gate TASK-893): `capture_date` es DATE; sólo `CURRENT_DATE - $n::int`.
 *
 * Parámetros: `$1` organizationId · `$2` windowDays · `$3` impressionsFloor · `$4` limit.
 */
export const SEO_WORK_QUEUE_CONSOLIDATION_SQL = `WITH per_query AS (
         SELECT query,
                SUM(impressions)                                          AS impressions,
                SUM(clicks)                                               AS clicks,
                SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS weighted_position
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query
         HAVING SUM(impressions) >= $3::int
       ),
       ${SEO_COMPETING_PAGE_CTE},
       main_page AS (
         SELECT DISTINCT ON (query) query, norm_page
           FROM content_page
          WHERE norm_page LIKE '%/%'
            AND norm_page !~* '[.](pdf|jpe?g|png|webp|gif|svg|zip|docx?|xlsx?)$'
          ORDER BY query, impressions DESC, norm_page ASC
       )
       SELECT pq.query                        AS keyword,
              mp.norm_page                    AS page,
              pq.weighted_position::text      AS weighted_position,
              pq.impressions::text            AS impressions,
              pq.clicks::text                 AS clicks,
              c.competing_pages::text         AS competing_pages,
              c.main_page_impressions::text   AS main_page_impressions,
              c.total_page_impressions::text  AS total_page_impressions,
              -- Total REAL sobre el umbral, antes del LIMIT. Sin esto el recorte sólo puede
              -- declarar lo que alcanzó a ver, y una declaración parcial de un cap es tan
              -- engañosa como no declararlo: dice "quedaron 200 fuera" cuando quedaron miles.
              COUNT(*) OVER ()::text          AS total_over_threshold
         FROM per_query pq
         JOIN competing c  ON c.query = pq.query
         JOIN main_page mp ON mp.query = pq.query
        WHERE c.competing_pages > 1
        ORDER BY pq.impressions DESC
        LIMIT $4::int`

interface ConsolidationRow extends Record<string, unknown> {
  keyword: string
  page: string
  weighted_position: string
  impressions: string
  clicks: string
  competing_pages: string
  main_page_impressions: string
  total_page_impressions: string
  total_over_threshold: string
}

export const collectConsolidation = async (ctx: SeoWorkQueueCollectorContext): Promise<SeoWorkQueueCollectorResult> => {
  const { config } = ctx

  try {
    const threshold = await resolveImpressionsThreshold(
      ctx.organizationId,
      config.windowDays,
      config.impressionsPercentile,
      config.minImpressionsFloor
    )

    const rows = await runGreenhousePostgresQuery<ConsolidationRow>(SEO_WORK_QUEUE_CONSOLIDATION_SQL, [
      ctx.organizationId,
      config.windowDays,
      threshold,
      WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin * 2
    ])

    const items: SeoWorkQueueItemInput[] = []
    let notCannibalized = 0

    for (const row of rows) {
      const normalizedKeyword = normalizeMarketKeyword(row.keyword ?? '')

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue

      const impressions = Number(row.impressions)
      const clicks = Number(row.clicks)
      const weightedPosition = Number(row.weighted_position)
      const competingPages = Number(row.competing_pages)

      // 🔴 El predicado ÚNICO. Multi-página NO es canibalización: `pinturas` tenía 41
      // páginas con el 99,3 % de las impresiones en una sola, y v1 le proponía fusionar 41
      // URLs al ítem #1 del sitio.
      const verdict = evaluateCannibalization(
        {
          normalizedKeyword,
          competingPages,
          mainPageImpressions: Number(row.main_page_impressions),
          // El denominador incluye TODAS las páginas (home y assets incluidos): la
          // pregunta es si una sola se queda con la query, y la home puede ser esa.
          totalImpressions: Number(row.total_page_impressions),
          brandToken: ctx.brandToken
        },
        config
      )

      if (!verdict.cannibalized) {
        notCannibalized += 1
        continue
      }

      const scored = computePriorityScore(
        {
          impressions,
          clicks,
          weightedPosition: Number.isFinite(weightedPosition) ? weightedPosition : null,
          curve: ctx.curve
        },
        config.version as never
      )

      items.push({
        origin: ORIGIN,
        normalizedKeyword,
        targetUrl: row.page || null,
        // 🔴 El verbo NO depende de la banda acá: una canibalización sin curva utilizable
        // sigue siendo una canibalización. Lo que la banda 2/3 dice es que no se puede
        // CUANTIFICAR la ganancia, no que la acción cambie.
        recommendedVerb: 'consolidate',
        scoreBasis: scored.basis,
        scoreBand: scored.band,
        priorityScore: scored.score,
        breakdown: {
          ...scored.breakdown,
          competingPages,
          mainPageShare: verdict.mainPageShare,
          basisReason:
            `${competingPages} páginas compiten por esta intención y la principal sólo concentra ` +
            `${Math.round((verdict.mainPageShare ?? 0) * 100)} % de las impresiones. ${scored.breakdown.basisReason}`
        },
        evidenceRef: buildEvidenceRef(ORIGIN, normalizedKeyword),
        sourceScoreVersion: null,
        tieBreakImpressions: Number.isFinite(impressions) ? impressions : 0
      })
    }

    const totalCandidates = Number(rows[0]?.total_over_threshold ?? rows.length)

    // 🔴 Sólo se declara lo que se SABE. El `COUNT(*) OVER ()` cuenta CANDIDATAS
    // (multi-página sobre el umbral), no canibalizadas: cuántas de las no evaluadas lo
    // están es justamente lo que no se midió. Decir "quedaron N canibalizadas fuera" sería
    // la misma clase de afirmación inflada que esta versión corrige.
    if (Number.isFinite(totalCandidates) && totalCandidates > rows.length) {
      return {
        items,
        health: unhealthy(
          ORIGIN,
          'degraded',
          `Se evaluaron las ${rows.length} queries multi-página de mayor demanda de ${totalCandidates} sobre el umbral; ` +
            `${items.length} resultaron canibalizadas y ${notCannibalized} no. Las de menor demanda no se evaluaron.`,
          items.length
        )
      }
    }

    return { items, health: healthy(ORIGIN, items.length) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudo leer la canibalización: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}

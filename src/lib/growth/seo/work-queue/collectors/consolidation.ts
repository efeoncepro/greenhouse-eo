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
 * Nota date-math (gate TASK-893): `capture_date` es DATE; sólo `CURRENT_DATE - $n::int`.
 *
 * Parámetros: `$1` organizationId · `$2` windowDays · `$3` impressionsFloor · `$4` limit.
 */
export const SEO_WORK_QUEUE_CONSOLIDATION_SQL = `WITH per_query AS (
         SELECT query,
                SUM(impressions)                                          AS impressions,
                SUM(clicks)                                               AS clicks,
                SUM(position * impressions) / NULLIF(SUM(impressions), 0) AS weighted_position,
                COUNT(DISTINCT page)                                      AS competing_pages
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query
         HAVING COUNT(DISTINCT page) > 1
            AND SUM(impressions) >= $3::int
       ),
       main_page AS (
         SELECT DISTINCT ON (query) query, page
           FROM greenhouse_growth.seo_gsc_daily
          WHERE organization_id = $1
            AND capture_date >= (CURRENT_DATE - $2::int)
          GROUP BY query, page
          ORDER BY query, SUM(impressions) DESC, MIN(position) ASC
       )
       SELECT pq.query           AS keyword,
              mp.page            AS page,
              pq.weighted_position::text AS weighted_position,
              pq.impressions::text       AS impressions,
              pq.clicks::text            AS clicks,
              pq.competing_pages::text   AS competing_pages,
              -- Total REAL sobre el umbral, antes del LIMIT. Sin esto el recorte sólo puede
              -- declarar lo que alcanzó a ver, y una declaración parcial de un cap es tan
              -- engañosa como no declararlo: dice "quedaron 200 fuera" cuando quedaron miles.
              COUNT(*) OVER ()::text     AS total_over_threshold
         FROM per_query pq
         JOIN main_page mp ON mp.query = pq.query
        ORDER BY pq.impressions DESC
        LIMIT $4::int`

interface ConsolidationRow extends Record<string, unknown> {
  keyword: string
  page: string
  weighted_position: string
  impressions: string
  clicks: string
  competing_pages: string
  total_over_threshold: string
}

export const collectConsolidation = async (
  ctx: SeoWorkQueueCollectorContext
): Promise<SeoWorkQueueCollectorResult> => {
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

    for (const row of rows) {
      const normalizedKeyword = normalizeMarketKeyword(row.keyword ?? '')

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue

      const impressions = Number(row.impressions)
      const clicks = Number(row.clicks)
      const weightedPosition = Number(row.weighted_position)
      const competingPages = Number(row.competing_pages)

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
          basisReason: `${competingPages} páginas compiten por esta intención. ${scored.breakdown.basisReason}`
        },
        evidenceRef: buildEvidenceRef(ORIGIN, normalizedKeyword),
        sourceScoreVersion: null,
        tieBreakImpressions: Number.isFinite(impressions) ? impressions : 0
      })
    }

    const totalOverThreshold = Number(rows[0]?.total_over_threshold ?? items.length)

    // El techo lo aplica el materializador; acá se declara CUÁNTAS quedaron realmente fuera,
    // que es un número que sólo esta query conoce.
    if (Number.isFinite(totalOverThreshold) && totalOverThreshold > items.length) {
      return {
        items,
        health: unhealthy(
          ORIGIN,
          'degraded',
          `${totalOverThreshold} queries del sitio tienen más de una página compitiendo sobre el umbral de impresiones; este snapshot trae las de mayor demanda.`,
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

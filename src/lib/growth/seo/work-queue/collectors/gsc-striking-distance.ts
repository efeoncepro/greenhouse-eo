import 'server-only'

/**
 * TASK-1700 — Colector `gsc_striking_distance`: la demanda MEDIDA que ya está cerca.
 *
 * Reusa el SQL exportado del reader de oportunidades (`SEO_KEYWORD_OPPORTUNITIES_SQL`) en
 * vez de copiarlo, para que el test de paridad del Slice 7 no pueda quedar verde comparando
 * contra una versión vieja de la query.
 *
 * 🔴 Las keywords CANIBALIZADAS no salen por acá: van al colector `consolidation` con su
 * propio verbo, porque no son una oportunidad de optimización sino dos URLs que fusionar, y
 * empujar una tercera vez es la acción equivocada. El reader legacy las marcaba y las dejaba
 * en la misma lista, que es justo lo que hace que el operador tome la decisión errada.
 *
 * ⚠️ Quién está canibalizada lo decide `evaluateCannibalization`, IMPORTADO — nunca una
 * copia de la regla acá. v1 preguntaba `competingPages > 1` en este mismo lugar y en el SQL
 * del otro colector: dos escrituras de la misma regla que podían separarse sin que nada
 * fallara, porque el dedup por sujeto habría elegido un origen y enmascarado el drift.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { normalizeMarketKeyword } from '../../keyword-market-data'
import { SEO_KEYWORD_OPPORTUNITIES_SQL } from '../../keyword-opportunities-reader'
import { evaluateCannibalization } from '../cannibalization'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'gsc_striking_distance' as const

interface OpportunityRow extends Record<string, unknown> {
  keyword: string
  page: string
  weighted_position: string
  impressions: string
  clicks: string
  /**
   * 🔴 `content_competing_pages`, NO `competing_pages`. La columna cruda cuenta home,
   * assets y variantes `http`/`www` de la misma URL. Leerla acá le daba al predicado una
   * definición DISTINTA de la que usa el colector de consolidación, y eso abría un hueco por
   * el que un ítem desaparecía de la cola entera: una query con home + un producto salía
   * canibalizada por acá (2 páginas crudas) y quedaba fuera de allá (1 sola fusionable).
   */
  content_competing_pages: string | null
  main_page_impressions: string | null
  total_page_impressions: string | null
}

/**
 * Umbral de impresiones resuelto sobre la PROPIA distribución de la org.
 *
 * "Alta impresión" es un percentil, no un número: un sitio con 100 impresiones/día y uno con
 * 1M no pueden compartir umbral absoluto.
 */
export const resolveImpressionsThreshold = async (
  organizationId: string,
  windowDays: number,
  percentile: number,
  floor: number
): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ threshold: string | null }>(
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

  const raw = Number(rows[0]?.threshold ?? 0)

  return Math.max(floor, Number.isFinite(raw) ? Math.round(raw) : floor)
}

export const collectGscStrikingDistance = async (
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

    const rows = await runGreenhousePostgresQuery<OpportunityRow>(SEO_KEYWORD_OPPORTUNITIES_SQL, [
      ctx.organizationId,
      config.windowDays,
      config.minPosition,
      config.maxPosition,
      threshold,
      // El techo por origen se aplica DESPUÉS del filtro de canibalización y decisiones, así
      // que se pide con holgura: recortar acá dejaría fuera filas que sí califican.
      WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin * 3
    ])

    if (rows.length === 0) {
      // Vacío legítimo: hay conexión y ventana, simplemente no hay nada entre 8 y 20.
      return { items: [], health: healthy(ORIGIN, 0) }
    }

    const items: SeoWorkQueueItemInput[] = []

    for (const row of rows) {
      const normalizedKeyword = normalizeMarketKeyword(row.keyword ?? '')

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue

      const impressions = Number(row.impressions)
      const clicks = Number(row.clicks)
      const weightedPosition = Number(row.weighted_position)
      const competingPages = Number(row.content_competing_pages ?? 0)

      // 🔴 MISMO predicado que el colector de consolidación, importado y no reimplementado.
      // v1 excluía por `competingPages > 1`, que mandaba a consolidación toda query de marca
      // —el 80 % de la población— y le cambiaba el verbo a la de mayor demanda del sitio.
      const verdict = evaluateCannibalization(
        {
          normalizedKeyword,
          competingPages,
          mainPageImpressions: Number(row.main_page_impressions ?? 0),
          totalImpressions: Number(row.total_page_impressions ?? impressions),
          brandToken: ctx.brandToken
        },
        config
      )

      // Canibalizada → es del colector de consolidación, con otro verbo.
      if (verdict.cannibalized) continue

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
        recommendedVerb: scored.band === 3 ? 'measure' : 'optimize',
        scoreBasis: scored.basis,
        scoreBand: scored.band,
        priorityScore: scored.score,
        // 🔴 `competingPages` viaja SIEMPRE, no sólo en consolidación. Sin esto el adapter
        // tenía que derivarlo del origen —`origin === 'consolidation' ? 2 : 1`— y afirmaba
        // "1 página" sobre una query con 41.
        breakdown: { ...scored.breakdown, competingPages, mainPageShare: verdict.mainPageShare },
        // La keyword ES el sujeto en GSC: no hay id de fila que citar, y fabricar uno daría
        // una falsa sensación de trazabilidad hacia una tabla que no lo tiene.
        evidenceRef: buildEvidenceRef(ORIGIN, normalizedKeyword),
        sourceScoreVersion: null,
        tieBreakImpressions: Number.isFinite(impressions) ? impressions : 0
      })
    }

    return { items, health: healthy(ORIGIN, items.length) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudo leer la demanda medida: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}

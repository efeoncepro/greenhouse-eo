import 'server-only'

/**
 * TASK-1700 — Colector `aeo_gap`: el cruce SEO↔AEO, por CONTRATO y nunca por SQL.
 *
 * 🔴 El lado AEO se lee ÚNICAMENTE con `readSeoAeoGap`. Ese reader une dos queries EN
 * MEMORIA por diseño —motores aislados con providers, cadencias y breakers distintos— y su
 * propio archivo declara que unirlas por SQL "es la violación más cara posible acá". Este
 * colector no tiene ni una línea de SQL contra `grader_*`, y el test de boundary lo fija.
 *
 * 🔴 Cada item registra el `source_score_version` del lado AEO (CHECK en DB). Sin él, una
 * recalibración del grader movería filas de la cola sin que nadie pueda decir por qué — el
 * mismo agujero que `priority_score_version` cierra del lado SEO.
 *
 * Qué entra: sólo los cuadrantes donde la citabilidad IA es el problema (`riesgo`,
 * `invisible`). `dominante` no es trabajo, y `oportunidad` —te citan y no rankeas— ya es
 * territorio del striking-distance o del contenido nuevo. Meter los cuatro cuadrantes
 * convertiría la cola en un espejo de la matriz en vez de una lista de trabajo.
 */

import { readSeoAeoGap } from '../../gap/read-seo-aeo-gap'
import { normalizeMarketKeyword } from '../../keyword-market-data'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'aeo_gap' as const

/** Cuadrantes que representan trabajo de citabilidad. Los otros dos no son de este origen. */
const ACTIONABLE_QUADRANTS = new Set(['riesgo', 'invisible'])

export const collectAeoGap = async (ctx: SeoWorkQueueCollectorContext): Promise<SeoWorkQueueCollectorResult> => {
  const { config } = ctx

  try {
    const result = await readSeoAeoGap(ctx.seoTargetId, { windowDays: config.windowDays }, ctx.env)

    if (!result.ok) {
      // Degradación honesta heredada del reader: `no_aeo_data` significa que la organización
      // no tiene un run reportable, no que su citabilidad sea cero. Cero ceros fantasma.
      const state = result.errorCode === 'query_failed' ? 'down' : 'degraded'

      return {
        items: [],
        health: unhealthy(ORIGIN, state, `El cruce SEO↔AEO respondió ${result.errorCode}.`)
      }
    }

    const { aeoLens } = result
    const standingByKeyword = new Map(result.seoLens.keywords.map(k => [k.keyword, k]))
    const items: SeoWorkQueueItemInput[] = []

    for (const entry of result.quadrants) {
      if (!ACTIONABLE_QUADRANTS.has(entry.quadrant)) continue

      const normalizedKeyword = normalizeMarketKeyword(entry.keyword ?? '')

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue
      if (items.length >= WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin) break

      const standing = standingByKeyword.get(entry.keyword)

      const scored = computePriorityScore(
        {
          impressions: standing?.impressions ?? 0,
          clicks: standing?.clicks ?? 0,
          weightedPosition: standing?.position ?? null,
          curve: ctx.curve
        },
        config.version as never
      )

      items.push({
        origin: ORIGIN,
        normalizedKeyword,
        targetUrl: standing?.page || null,
        // Citabilidad se gana con contenido citable. `riesgo` (rankeas y no te citan) es
        // reescribir lo que ya existe; `invisible` es que no hay nada que citar.
        recommendedVerb: entry.quadrant === 'riesgo' ? 'optimize' : 'create',
        scoreBasis: scored.basis,
        scoreBand: scored.band,
        priorityScore: scored.score,
        breakdown: {
          ...scored.breakdown,
          basisReason: `Cuadrante ${entry.quadrant} (citabilidad IA ${entry.aeoScore}/100 en el dominio). ${scored.breakdown.basisReason}`
        },
        // Opaca: ancla el run del grader que se leyó, sin FK ni JOIN cross-motor.
        evidenceRef: buildEvidenceRef(ORIGIN, aeoLens.latestRunId),
        // 🔴 Obligatorio para este origen. El reader degrada a `no_aeo_data` si el run no la
        // trae, así que acá siempre existe.
        sourceScoreVersion: aeoLens.scoreVersion,
        tieBreakImpressions: standing?.impressions ?? 0
      })
    }

    return { items, health: healthy(ORIGIN, items.length, aeoLens.latestRunAt) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudo leer el cruce SEO↔AEO: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}

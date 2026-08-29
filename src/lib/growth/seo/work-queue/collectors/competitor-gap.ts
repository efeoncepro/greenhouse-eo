import 'server-only'

/**
 * TASK-1700 — Colector `competitor_gap`: lo que un competidor DECLARADO cubre y el cliente no.
 *
 * ⚠️ Recalibración de alcance (2026-08-28). La spec original decía que este origen "nace
 * declarado y DESACTIVADO porque `seo_competitors` no tiene productor". Eso quedó falso
 * mientras la task esperaba: la cadena completa está en producción desde el release
 * `e82c18579b05` — descubrimiento (TASK-1699) → declaración (TASK-1662) → cobertura
 * (TASK-1662) → `readKeywordGap`. Cablear un `state: 'down', reason: 'no_producer'` fijo
 * habría sido documentar una mentira y dejarla para que alguien la desmonte en octubre.
 *
 * Así que el colector es real y su salud sale del ESTADO DE COBERTURA que el reader
 * declara, no de una constante:
 *   - sin competidores declarados → `degraded` (capacidad disponible, nadie la usó)
 *   - `no_coverage` → `degraded` (declarado y nunca capturado)
 *   - `stale` → `degraded` con la fecha, para que se vea de cuándo es
 *   - cobertura fresca → `ok`
 *
 * 🔴 `readKeywordGap` YA excluye las keywords con impresiones GSC en la ventana: manda la
 * lente medida (●) sobre la estimada (◑). Así que de acá salen candidatos SIN demanda medida
 * —banda 3, verbo `measure`— y nunca duplicados del striking-distance. Esa exclusión es del
 * reader dueño y NO se replica acá: replicarla sería una segunda respuesta a la misma
 * pregunta, que es como nacen los defectos de este tipo.
 *
 * Sólo entra `content_gap` (el cliente está AUSENTE del SERP del proveedor). `ranks_worse`
 * es optimización que la superficie de oportunidades ya cubre con demanda MEDIDA, y
 * `declaredTargets` son compromisos en curso, no hallazgos — reportarlos como trabajo nuevo
 * sería vender de vuelta algo que el cliente ya declaró.
 */

import { readKeywordGap } from '../../keyword-gap-reader'
import { normalizeMarketKeyword } from '../../keyword-market-data'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'competitor_gap' as const

export const collectCompetitorGap = async (
  ctx: SeoWorkQueueCollectorContext
): Promise<SeoWorkQueueCollectorResult> => {
  const { config } = ctx

  try {
    const result = await readKeywordGap(ctx.seoTargetId, { limit: WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin })

    if (!result.ok) {
      const state = result.errorCode === 'query_failed' ? 'down' : 'degraded'

      return { items: [], health: unhealthy(ORIGIN, state, `El gap competitivo respondió ${result.errorCode}.`) }
    }

    if (result.competitors.length === 0) {
      return {
        items: [],
        health: unhealthy(
          ORIGIN,
          'degraded',
          'No hay competidores declarados para este sitio: la comparativa está disponible y nadie la activó.'
        )
      }
    }

    const items: SeoWorkQueueItemInput[] = []
    const notes: string[] = []
    let anyFreshCoverage = false
    let latestCapture: string | null = null

    for (const entry of result.competitors) {
      const domain = entry.competitor.competitorDomain

      if (entry.coverage.state === 'no_coverage') {
        notes.push(`${domain}: declarado y nunca capturado`)
        continue
      }

      if (entry.coverage.stale) {
        notes.push(`${domain}: cobertura del ${entry.coverage.captureDate} (vencida)`)
      } else {
        anyFreshCoverage = true
      }

      if (!latestCapture || entry.coverage.captureDate > latestCapture) {
        latestCapture = entry.coverage.captureDate
      }

      for (const row of entry.coverage.contentGap) {
        const normalizedKeyword = normalizeMarketKeyword(row.keyword ?? '')

        if (!normalizedKeyword) continue
        if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue
        if (items.length >= WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin) break

        // 🔴 Sin impresiones por construcción (el reader ya excluyó las medidas), así que
        // esto SIEMPRE cae a banda 3. Se puntúa igual con la función canónica en vez de
        // cablear la banda: si mañana el reader cambia su exclusión, la banda la decide la
        // evidencia y no un literal que nadie recuerda revisar.
        const scored = computePriorityScore(
          { impressions: 0, clicks: 0, weightedPosition: null, curve: ctx.curve },
          config.version as never
        )

        items.push({
          origin: ORIGIN,
          normalizedKeyword,
          targetUrl: null,
          recommendedVerb: scored.band === 3 ? 'measure' : 'create',
          scoreBasis: scored.basis,
          scoreBand: scored.band,
          priorityScore: scored.score,
          breakdown: {
            ...scored.breakdown,
            basisReason: `${domain} cubre esta intención (posición ${row.competitorRank}, lente ◑ estimada) y el cliente está ausente. ${scored.breakdown.basisReason}`
          },
          // Ancla opaca declarada por el reader dueño: `seo:competitor_gap:<coverage_run_id>`.
          evidenceRef: buildEvidenceRef(ORIGIN, entry.coverage.coverageRunId),
          sourceScoreVersion: null,
          tieBreakImpressions: 0
        })
      }
    }

    if (!anyFreshCoverage) {
      return {
        items,
        health: unhealthy(
          ORIGIN,
          'degraded',
          notes.length > 0 ? notes.join('; ') : 'Ninguna cobertura fresca disponible.',
          items.length,
          latestCapture
        )
      }
    }

    return { items, health: healthy(ORIGIN, items.length, latestCapture) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudo leer el gap competitivo: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}

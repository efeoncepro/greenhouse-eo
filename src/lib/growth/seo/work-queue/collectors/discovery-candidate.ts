import 'server-only'

/**
 * TASK-1700 — Colector `discovery_candidate`: lo que discovery encontró y nadie decidió.
 *
 * Consume `readKeywordDiscovery` (contrato de TASK-1694), NUNCA SQL propio sobre
 * `seo_keyword_discovery_candidates`. Eso importa porque el contrato ya colapsa el duplicado
 * cross-método: la unidad puntuable es la keyword normalizada con sus `candidateIds[]`, no
 * la fila de procedencia. Sin ese colapso, la cola habría persistido la misma keyword hasta
 * cuatro veces con cuatro scores y cuatro CTAs de gasto sobre una sola intención — en una
 * tabla append-only, o sea sin arreglo hacia adelante.
 *
 * 🔴 Un candidato de discovery SÍ puede tener demanda medida: el reader compone `measuredGsc`
 * por candidato y su orden por defecto premia justo ese caso como el de mayor valor del
 * inbox. Por eso la banda sale de la evidencia y no del origen.
 *
 * ⚠️ Lo que este colector NO puede resolver: **medido ≠ pertinente**. Hoy nada declara si un
 * candidato tiene que ver con el negocio (`TASK-1791`), así que una keyword ajena con
 * impresiones reales entra a banda 1 legítimamente. La cola no puede filtrarlo sin puntuar
 * con una señal que su `evidence_ref` opaca no puede citar; cuando esa señal exista, entra
 * como FACTOR del item con su procedencia, jamás como multiplicador del score.
 */

import { readKeywordDiscovery } from '../../keyword-discovery/reader'
import { buildEvidenceRef, type SeoWorkQueueCollectorResult, type SeoWorkQueueItemInput } from '../contracts'
import { computePriorityScore } from '../priority-score'
import { WORK_QUEUE_RUNTIME_CONFIG } from '../score-versions'
import { healthy, isRetiredSubject, unhealthy, type SeoWorkQueueCollectorContext } from './context'

const ORIGIN = 'discovery_candidate' as const

export const collectDiscoveryCandidates = async (
  ctx: SeoWorkQueueCollectorContext
): Promise<SeoWorkQueueCollectorResult> => {
  const { config } = ctx

  try {
    /*
     * 🔴 LECTURA EN DOS PASOS, y no es una optimización — es la única forma de obtener
     * candidatos.
     *
     * Sin `runId`, `readKeywordDiscovery` devuelve SÓLO el historial de corridas y
     * `candidates: []`. Pedirlo de una sola vez devolvía cero candidatos SIEMPRE, y el
     * colector lo reportaba como `state: 'ok', items: 0` — o sea un origen roto declarándose
     * sano. Lo destapó la primera corrida real, no un test: el vacío era perfectamente
     * creíble. Primero se resuelve CUÁL corrida mirar (la última), y recién entonces se
     * piden sus candidatos.
     */
    const runs = await readKeywordDiscovery({
      organizationId: ctx.organizationId,
      seoTargetId: ctx.seoTargetId
    })

    if (!runs.ok) {
      const configuredOffRuns: readonly string[] = [
        'seo_keyword_discovery_disabled',
        'target_not_found',
        'forbidden'
      ]

      return {
        items: [],
        health: unhealthy(
          ORIGIN,
          configuredOffRuns.includes(runs.errorCode) ? 'degraded' : 'down',
          `El reader de discovery respondió ${runs.errorCode} al listar corridas.`
        )
      }
    }

    const latestRun = runs.run ?? runs.runs[0] ?? null

    if (!latestRun) {
      // Sin corridas NO es un origen sano y vacío: es una capacidad que nadie usó todavía.
      // Declararlo `ok` con 0 items haría indistinguible "no hay candidatos" de "nunca se
      // corrió discovery", que son dos cosas muy distintas para el operador.
      return {
        items: [],
        health: unhealthy(ORIGIN, 'degraded', 'Este sitio todavía no tiene ninguna corrida de discovery.')
      }
    }

    const result = await readKeywordDiscovery({
      organizationId: ctx.organizationId,
      seoTargetId: ctx.seoTargetId,
      runId: latestRun.runId,
      // Ya seguidos no son trabajo pendiente: seguirlos otra vez no hace nada y ensucia.
      excludeTracked: true,
      limit: WORK_QUEUE_RUNTIME_CONFIG.maxItemsPerOrigin
    })

    if (!result.ok) {
      // El discovery apagado NO es una falla del snapshot: es una capacidad que esta
      // organización no tiene encendida. Se declara degradado con su razón y el resto de
      // los orígenes sigue intacto.
      // `seo_keyword_discovery_disabled` y `target_not_found` son estados de configuración,
      // no fallas: la capacidad existe y esta organización no la tiene encendida. `down` se
      // reserva para lo que sí es una falla, para que la señal de reliability distinga una
      // cosa de la otra en vez de alertar por un módulo apagado a propósito.
      const configuredOff: readonly string[] = ['seo_keyword_discovery_disabled', 'target_not_found', 'forbidden']

      return {
        items: [],
        health: unhealthy(
          ORIGIN,
          configuredOff.includes(result.errorCode) ? 'degraded' : 'down',
          `El reader de discovery respondió ${result.errorCode}.`
        )
      }
    }

    const items: SeoWorkQueueItemInput[] = []

    for (const candidate of result.candidates) {
      const normalizedKeyword = candidate.normalizedKeyword

      if (!normalizedKeyword) continue
      if (isRetiredSubject(ctx, ORIGIN, normalizedKeyword)) continue

      // Una acción previa en el ledger de discovery (TASK-1692) también retira el sujeto:
      // son dos libros del mismo hecho y reproponer lo descartado allá sería ignorarlo.
      if (candidate.latestAction?.kind === 'dismissed') continue

      const measured = candidate.measuredGsc

      const scored = computePriorityScore(
        {
          impressions: measured?.impressions ?? 0,
          // El reader no expone clics del candidato; con impresiones y sin clics el CTR
          // actual es 0, que es el caso conservador: la ganancia estimada queda en su techo.
          clicks: 0,
          weightedPosition: measured?.position ?? null,
          curve: ctx.curve
        },
        config.version as never
      )

      items.push({
        origin: ORIGIN,
        normalizedKeyword,
        targetUrl: null,
        // Sin página propia que empujar, un candidato es contenido por crear. Con demanda
        // medida ya hay algo apareciendo, así que se optimiza lo que existe.
        recommendedVerb: scored.band === 3 ? 'measure' : measured ? 'optimize' : 'create',
        scoreBasis: scored.basis,
        scoreBand: scored.band,
        priorityScore: scored.score,
        breakdown: {
          ...scored.breakdown,
          basisReason: candidate.clusterConflict.status === 'conflict'
            ? `⚠️ Choca con ${candidate.clusterConflict.trackedMemberCount} keyword(s) vigentes del mismo cluster. ${scored.breakdown.basisReason}`
            : scored.breakdown.basisReason
        },
        // Procedencia REPRESENTATIVA del contrato colapsado. Opaca: el consumer con permiso
        // la resuelve con el reader de discovery, nadie hace JOIN.
        evidenceRef: buildEvidenceRef(ORIGIN, candidate.candidateId),
        sourceScoreVersion: null,
        tieBreakImpressions: measured?.impressions ?? 0
      })
    }

    return { items, health: healthy(ORIGIN, items.length, result.marketFreshness) }
  } catch (error) {
    return {
      items: [],
      health: unhealthy(
        ORIGIN,
        'down',
        `No se pudieron leer los candidatos de discovery: ${error instanceof Error ? error.message : 'error desconocido'}`
      )
    }
  }
}

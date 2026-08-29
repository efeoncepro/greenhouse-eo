import 'server-only'

/**
 * TASK-1700 — Redactor del DTO cliente. La ÚNICA diferencia entre lo que ve el operador y lo
 * que ve el cliente.
 *
 * 🔴 Se construye por CONSTRUCCIÓN EXPLÍCITA, nunca por omisión de campos sobre el objeto
 * completo (`delete`, `omit`, spread con exclusiones). La diferencia importa: con un
 * redactor por sustracción, cualquier campo NUEVO del reader llega al cliente por defecto y
 * la fuga es silenciosa. Acá un campo nuevo simplemente no aparece hasta que alguien lo
 * agregue a mano, que es la dirección correcta del default.
 *
 * Qué NO cruza, y por qué:
 * - `keyword_difficulty` y volumen estimado del proveedor: son lente ◑ de un tercero que en
 *   es-LATAM mide mal (ISSUE-152). Mostrárselos al cliente les da estatus de hecho.
 * - Costo de proveedor: es lo que a Efeonce le CUESTA servir, no consumo del cliente.
 * - `evidence_ref` cruda: expone ids internos de motores y su topología.
 * - `score_breakdown_json` completo: lleva umbrales, percentiles y tamaños de muestra que
 *   son el método, no el resultado.
 *
 * Qué SÍ cruza: la keyword, el verbo, la banda, la estimación de clics marcada `◑ estimado`
 * sobre impresiones marcadas `● medido`, y el `asOf`.
 */

import { SEO_LENS_MARKER } from '../lens'
import {
  type SeoWorkQueueOrigin,
  type SeoWorkQueueScoreBand,
  type SeoWorkQueueStaleness,
  type SeoWorkQueueVerb
} from './contracts'
import { type ReadSeoWorkQueueResult } from './reader'

export interface ClientWorkQueueItemDto {
  keyword: string
  recommendedVerb: SeoWorkQueueVerb
  scoreBand: SeoWorkQueueScoreBand
  origin: SeoWorkQueueOrigin
  /** Clics incrementales estimados. `null` cuando no se puede afirmar — jamás un 0 de relleno. */
  estimatedIncrementalClicks: number | null
  /**
   * Marcador de lente del score: es una estimación sobre demanda medida.
   *
   * TASK-1785 — ⚠️ Esta fila es el caso donde las DOS lentes conviven: el techo estimado (◑)
   * va al lado de las impresiones medidas (●), bajo un solo `asOf`. Por eso el rótulo vive
   * POR CAMPO y no a nivel de fila — no había forma honesta de rotular la fila entera, y esa
   * necesidad llegó sola a la forma que el resto del módulo adoptó después.
   */
  estimatedMarker: typeof SEO_LENS_MARKER.estimated
  /** Impresiones de Search Console: demanda MEDIDA del propio sitio del cliente. */
  measuredImpressions: number
  measuredMarker: typeof SEO_LENS_MARKER.measured
  /** Por qué está en esta banda, en lenguaje del cliente. Sin umbrales ni percentiles. */
  reason: string
}

export interface ClientWorkQueueDto {
  items: ClientWorkQueueItemDto[]
  asOf: string | null
  staleness: SeoWorkQueueStaleness
  /** Orígenes degradados, sin detalle técnico: el cliente merece saber que la foto es parcial. */
  partialSources: number
}

/**
 * Razón en lenguaje de cliente. NO se reusa `basisReason` del breakdown: esa frase habla de
 * percentiles, tamaños de muestra y nombres de origen — es la explicación para quien opera el
 * motor, no para quien recibe el servicio.
 */
const clientReason = (band: SeoWorkQueueScoreBand, verb: SeoWorkQueueVerb): string => {
  if (band === 1) {
    return verb === 'consolidate'
      ? 'Varias páginas del sitio compiten por esta búsqueda y se restan entre sí.'
      : 'Ya recibes búsquedas por este término y estás cerca de la primera página.'
  }

  if (band === 2) {
    return 'Ya recibes búsquedas por este término, pero todavía no hay datos suficientes para estimar cuántos clics adicionales daría.'
  }

  return 'Todavía nadie llega al sitio por este término: el primer paso es medirlo.'
}

export const toClientWorkQueueDto = (result: ReadSeoWorkQueueResult): ClientWorkQueueDto => {
  if (!result.ok) {
    return { items: [], asOf: null, staleness: 'absent', partialSources: 0 }
  }

  return {
    items: result.items.map(item => ({
      keyword: item.keyword,
      recommendedVerb: item.recommendedVerb,
      scoreBand: item.scoreBand,
      origin: item.origin,
      estimatedIncrementalClicks: item.priorityScore === null ? null : Math.round(item.priorityScore),
      // 🔴 Se deriva el VALOR, jamás se spreadea el módulo de lentes: el redactor es por
      // construcción explícita para que un campo nuevo del tipo compartido NO cruce solo, y
      // un spread invertiría esa dirección en silencio.
      estimatedMarker: SEO_LENS_MARKER.estimated,
      measuredImpressions: item.breakdown.impressions,
      measuredMarker: SEO_LENS_MARKER.measured,
      reason: clientReason(item.scoreBand, item.recommendedVerb)
    })),
    asOf: result.asOf,
    staleness: result.staleness,
    partialSources: result.originHealth.filter(entry => entry.state !== 'ok').length
  }
}

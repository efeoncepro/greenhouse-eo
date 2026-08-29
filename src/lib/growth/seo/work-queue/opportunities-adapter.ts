import 'server-only'

/**
 * TASK-1700 Slice 7 — el cutover de la lente de oportunidades.
 *
 * 🔴 **Cambia la FUENTE DEL ORDEN, no la forma.** La lente sigue devolviendo exactamente
 * `KeywordOpportunitiesResult`, con las mismas columnas y el mismo copy: la vista no se
 * entera. Lo único que cambia es quién manda el orden — pasa de un score no versionado
 * calculado al vuelo a un snapshot inmutable con `priority_score_version` persistida.
 *
 * La superficie completa de la cola (bandas visibles, verbos, filtros por origen, estado
 * `stale`, salud de orígenes en pantalla) es una task `ui-ux` posterior. Por eso esta task
 * declara `UI impact: none`.
 *
 * ═══ Qué orígenes entran y por qué ═══
 *
 * `gsc_striking_distance` **y** `consolidation`. El colector de striking-distance excluye
 * las keywords canibalizadas y las manda al de consolidación (son otra acción), pero el
 * reader legacy las incluía marcadas con `cannibalized: true`. Recomponer los dos orígenes
 * es lo que hace que el conjunto de filas sea el MISMO: si sólo se sirviera el primero, el
 * operador perdería filas en el cutover, y eso ya no sería un cambio de fuente.
 *
 * 🔴 **Y se recorta a la ventana de posición de la lente (8–20).** El colector de
 * consolidación cubre TODAS las posiciones a propósito —una query canibalizada en posición 3
 * sigue diluyendo autoridad, y esperar a que caiga a la 8 es esperar a que empeore— pero la
 * lente legacy nunca mostró esas filas. Sin este recorte el cutover metía 99 keywords nuevas
 * y subía los techos de cabecera: una MEJORA, sí, pero un cambio de comportamiento que esta
 * task no autorizó y que el operador descubriría un lunes sin aviso. Lo destapó el gate de
 * paridad, no producción.
 *
 * El aggregate conserva la foto completa —es su trabajo— y esas filas salen a la superficie
 * en la task `ui-ux` de la cola, con su verbo y su banda visibles.
 *
 * ═══ El enriquecimiento de mercado ═══
 *
 * La cola no transporta volumen ni dificultad a propósito (invariante ●/◑). La lente sí los
 * muestra, así que se piden al MISMO reader canónico que usaba antes
 * (`readKeywordMarketData`), por las mismas keywords y con el mismo marcado. No es una
 * fuente nueva: es la que la lente ya consultaba.
 */

import {
  type KeywordOpportunitiesResult,
  type KeywordOpportunity,
  type SeoCtrCurveSource,
  type SeoKeywordOpportunityOrder
} from '../contracts'
import { normalizeMarketKeyword, readKeywordMarketData } from '../keyword-market-data'
import { seoProvenance } from '../lens'
import { readSeoWorkQueue } from './reader'
import { getPriorityScoreConfig } from './score-versions'

const LENS_ORIGINS = ['gsc_striking_distance', 'consolidation'] as const

/** Techo de la lente legacy, conservado para no cambiar cuántas filas ve el operador. */
const DEFAULT_LENS_LIMIT = 50

/** Se traen ambos orígenes completos antes de recortar por ventana de posición. */
const MAX_QUEUE_FETCH = 200

export interface WorkQueueOpportunitiesResult {
  result: KeywordOpportunitiesResult
  /** `true` cuando la lente se sirvió desde la cola; `false` obliga al caller a caer al legacy. */
  servedFromWorkQueue: boolean
}

export const readKeywordOpportunitiesFromWorkQueue = async (
  seoTargetId: string,
  options: { windowDays?: number; limit?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<WorkQueueOpportunitiesResult | null> => {
  const config = getPriorityScoreConfig()

  const queue = await readSeoWorkQueue(seoTargetId, {
    origins: LENS_ORIGINS,
    // Se pide de más a propósito: el recorte por ventana de posición ocurre DESPUÉS, así que
    // limitar acá dejaría fuera filas que sí califican.
    limit: MAX_QUEUE_FETCH,
    ...(options.env ? { env: options.env } : {})
  })

  // Con la cola apagada, caída o sin snapshot todavía, el caller cae al reader legacy. NO se
  // sirve una lente vacía: "no hay oportunidades" y "la cola aún no corrió" son cosas
  // distintas, y colapsarlas afirmaría lo primero.
  if (!queue.ok || queue.staleness === 'absent' || !queue.snapshot) {
    return null
  }

  /*
   * Ventana de posición de la lente. `weightedPosition` nulo NO entra: la lente muestra
   * posición media, y una fila sin ella no tiene qué mostrar en esa columna.
   */
  const inLensWindow = queue.items.filter(item => {
    const position = item.breakdown.weightedPosition

    return position !== null && position >= config.minPosition && position <= config.maxPosition
  })

  const targets = inLensWindow.slice(0, options.limit ?? DEFAULT_LENS_LIMIT)

  /*
   * 🔴 LA COLA SIRVE ESTA LENTE **SÓLO SI PUEDE HACERLO SIN FABRICAR UN NÚMERO.**
   *
   * Los dos contratos usan la palabra "ganancia" con semánticas OPUESTAS en el mismo valor:
   *
   *   - En la cola, `priority_score = null` significa «me niego a estimar»: no hay curva
   *     utilizable, y la banda 2 existe justamente para decirlo.
   *   - En la lente, `estimatedClickGain` es `number` y **jamás** señala dato faltante — un
   *     `0` ahí es una afirmación POSITIVA: «esta keyword ya convierte por encima de la media
   *     de la posición objetivo». TASK-1792 eliminó ese cero-sentinel a propósito.
   *
   * Traducir `null → 0` en esta costura reintroduce, en el contrato, exactamente el defecto
   * que 1792 cerró en el código: ausencia presentada como evidencia de cero. Y no sería
   * marginal — con una curva no utilizable, TODA la lente de esa organización saldría
   * empatada en un cero fabricado, bajo un envelope que dice `org_measured` porque se computa
   * desde una sola fila de referencia.
   *
   * Por eso, si alguna fila que llegaría a la lente no tiene score, el adapter DEVUELVE NULL
   * y el caller cae al reader legacy — que desde 1792 sabe ordenar honestamente ese caso
   * (`orderedBy: 'measured_demand'`, sobre impresiones × cercanía a página 1, todo medido).
   *
   * En la práctica esto es una condición POR ORGANIZACIÓN, no por fila: la curva se evalúa a
   * nivel de org en la posición objetivo, así que o todas las filas tienen score o ninguna
   * lo tiene. Con curva sana (Berel) la cola sirve la lente; con curva no utilizable
   * (efeoncepro) la sirve el legacy. La cola conserva su snapshot completo en los dos casos.
   *
   * Crédito del hallazgo: `greenhouse-eo-9b`, revisando la costura entre los dos contratos.
   */
  if (targets.some(item => item.priorityScore === null)) {
    return null
  }

  const market = await readKeywordMarketData({
    keywords: targets.map(item => item.keyword),
    // El mercado se resuelve dentro del reader canónico con el target; acá sólo se pasan
    // las keywords ya seleccionadas, igual que hacía la lente antes.
    locationCode: '',
    languageCode: ''
  }).catch(() => null)

  const opportunities: KeywordOpportunity[] = targets.map(item => {
    const breakdown = item.breakdown
    const normalized = normalizeMarketKeyword(item.keyword)
    const datum = market?.byKeyword.get(normalized)

    return {
      keyword: item.keyword,
      page: item.targetUrl ?? '',
      position: breakdown.weightedPosition === null ? 0 : Number(breakdown.weightedPosition.toFixed(2)),
      impressions: breakdown.impressions,
      clicks: breakdown.clicks,
      ctr: breakdown.currentCtr === null ? 0 : Number(breakdown.currentCtr.toFixed(6)),
      // El techo ya viene calculado y VERSIONADO desde el snapshot: acá no se recalcula nada.
      // Sin `?? 0`: el guard de arriba garantiza que acá NO hay nulls. Un fallback silencioso
      // volvería a abrir la puerta que ese guard cierra.
      estimatedClickGain: Math.round(item.priorityScore ?? Number.NaN),
      quickWin: breakdown.weightedPosition !== null && breakdown.weightedPosition <= 10,
      cannibalized: item.origin === 'consolidation',
      competingPages: breakdown.competingPages ?? (item.origin === 'consolidation' ? 2 : 1),
      searchVolume: datum?.searchVolume ?? null,
      difficulty: datum?.keywordDifficulty ?? null,
      linkBarrier: market?.linkBarrierByKeyword.get(normalized) ?? 'unknown'
    }
  })

  /*
   * Campos de procedencia del score (TASK-1792). NO se recalculan: se leen del breakdown
   * PERSISTIDO, que es el que efectivamente produjo estos techos. Recomputarlos acá podría
   * dar un valor distinto al que se usó —la curva de hoy no es la de cuando corrió el
   * snapshot— y la lente estaría declarando una procedencia que no fue la suya.
   */
  const reference = targets.find(item => item.scoreBand === 1)?.breakdown ?? targets[0]?.breakdown ?? null

  const ctrCurveSource: SeoCtrCurveSource =
    reference?.ctrCurveSource === 'org_measured'
      ? 'org_measured'
      : // `not_applicable` (sin demanda medida) no tiene equivalente en el vocabulario de la
        // lente; `unusable` es lo honesto: no había con qué estimar un CTR objetivo.
        'unusable'

  /*
   * `orderedBy` declara qué criterio ordenó DE VERDAD. Acá es siempre `estimated_click_gain`
   * y no por comodidad: el guard de arriba ya devolvió `null` para cualquier caso en que la
   * cola no hubiera podido ordenar por techo. Cuando la cola sirve esta lente, ordenó por
   * ganancia estimada — y cuando no pudo, no la sirve.
   */
  const orderedBy: SeoKeywordOpportunityOrder = 'estimated_click_gain'

  return {
    servedFromWorkQueue: true,
    result: {
      ok: true,
      organizationId: queue.snapshot.organizationId,
      seoTargetId: queue.snapshot.seoTargetId,
      windowDays: options.windowDays ?? queue.snapshot.windowDays,
      // El umbral efectivo lo aplicó el colector dentro del snapshot; la lente lo reporta
      // como 0 en vez de inventar uno que no fue el usado.
      impressionsThreshold: 0,
      market: market?.market ?? 'unavailable',
      targetPosition: reference?.targetPosition ?? 0,
      expectedCtrAtTarget: reference?.expectedCtrAtTarget ?? 0,
      ctrCurveSource,
      curveSampleSize:
        reference?.curveSampleImpressions === null || reference?.curveSampleImpressions === undefined
          ? null
          : { impressions: reference.curveSampleImpressions, clicks: reference.curveSampleClicks ?? 0 },
      orderedBy,
      opportunities,
      /**
       * TASK-1785 — la lente NO cambia por servirse desde la cola.
       *
       * El adapter cambia la FUENTE DEL ORDEN, jamás la naturaleza de las cifras: el
       * striking-distance sigue siendo demanda medida de Search Console y el enriquecimiento
       * de mercado sigue siendo ◑ del proveedor. El as-of medido es el del snapshot que
       * ordenó — no el de hoy: un snapshot es una foto fechada, y presentarla como fresca
       * sería justo la clase de afirmación que esta procedencia existe para impedir.
       */
      provenance: [
        seoProvenance({
          section: 'opportunities[].{position,impressions,clicks,ctr,estimatedClickGain,competingPages}',
          source: 'gsc',
          capturedAt: queue.asOf
        }),
        seoProvenance({
          section: 'opportunities[].{searchVolume,difficulty,linkBarrier}',
          source: 'dataforseo_labs',
          capturedAt: market?.freshness?.latestCaptureDate ?? null
        })
      ]
    }
  }
}

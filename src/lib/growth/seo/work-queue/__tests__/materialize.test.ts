import { describe, expect, it } from 'vitest'

import { compareWorkQueueItems, computeInputSnapshotHash, dedupeBySubject } from '../materialize'
import type { SeoWorkQueueItemInput } from '../contracts'

const item = (over: Partial<SeoWorkQueueItemInput>): SeoWorkQueueItemInput => ({
  origin: 'gsc_striking_distance',
  normalizedKeyword: 'k',
  targetUrl: null,
  recommendedVerb: 'optimize',
  scoreBasis: 'measured_incremental_clicks',
  scoreBand: 1,
  priorityScore: 10,
  breakdown: {
    impressions: 0,
    clicks: 0,
    currentCtr: null,
    weightedPosition: null,
    targetPosition: 5,
    expectedCtrAtTarget: null,
    ctrCurveSource: 'not_applicable',
    curveSampleImpressions: null,
    curveSampleClicks: null,
    windowDays: 28,
    incrementalClicks: null,
    basisReason: ''
  },
  evidenceRef: 'seo:gsc_query:k',
  sourceScoreVersion: null,
  tieBreakImpressions: 0,
  ...over
})

describe('TASK-1700 — orden canónico', () => {
  it('la banda manda sobre el score: un objetivo declarado sin medir NO le gana a un striking-distance', () => {
    const band1 = item({ normalizedKeyword: 'a-medida', scoreBand: 1, priorityScore: 1 })

    const band3 = item({
      normalizedKeyword: 'z-sin-medir',
      scoreBand: 3,
      scoreBasis: 'no_measured_demand',
      priorityScore: null
    })

    expect([band3, band1].sort(compareWorkQueueItems)[0]).toBe(band1)
  })

  it('dentro de banda 1 ordena por clics incrementales descendente', () => {
    const low = item({ normalizedKeyword: 'a', priorityScore: 5 })
    const high = item({ normalizedKeyword: 'z', priorityScore: 500 })

    expect([low, high].sort(compareWorkQueueItems).map(i => i.normalizedKeyword)).toEqual(['z', 'a'])
  })

  /**
   * 🔴 EL ASSERT QUE PROTEGE EL INVARIANTE ●/◑ EN EL ORDEN.
   *
   * La banda 3 no tiene score, así que necesita un desempate — y la opción obvia (volumen
   * estimado descendente) reintroduciría por la puerta de atrás justo lo que el invariante
   * prohíbe. En es-LATAM el volumen del proveedor es la peor señal disponible (ISSUE-152), y
   * además nada declara todavía si un candidato tiene que ver con el negocio (TASK-1791):
   * una corrida real de discovery para una agencia B2B chilena devolvió `chatgpt en linea`
   * con volumen 480, que por volumen encabezaría la banda.
   *
   * Este test fija que el desempate es ALFABÉTICO. Si alguien mete volumen acá, falla.
   */
  it('en banda 3 el desempate es alfabético, NUNCA por volumen del proveedor', () => {
    // `tieBreakImpressions` alto simula lo que haría un desempate por magnitud del proveedor.
    const ruidoso = item({
      normalizedKeyword: 'zapatos chatgpt',
      scoreBand: 3,
      scoreBasis: 'no_measured_demand',
      priorityScore: null,
      tieBreakImpressions: 480
    })

    const pertinente = item({
      normalizedKeyword: 'agencia aeo chile',
      scoreBand: 3,
      scoreBasis: 'no_measured_demand',
      priorityScore: null,
      tieBreakImpressions: 10
    })

    expect([ruidoso, pertinente].sort(compareWorkQueueItems).map(i => i.normalizedKeyword)).toEqual([
      'agencia aeo chile',
      'zapatos chatgpt'
    ])
  })

  it('en banda 2 sí desempatan las impresiones: es demanda MEDIDA sin curva', () => {
    const pocas = item({
      normalizedKeyword: 'a',
      scoreBand: 2,
      scoreBasis: 'measured_without_curve',
      priorityScore: null,
      tieBreakImpressions: 10
    })

    const muchas = item({
      normalizedKeyword: 'z',
      scoreBand: 2,
      scoreBasis: 'measured_without_curve',
      priorityScore: null,
      tieBreakImpressions: 9000
    })

    expect([pocas, muchas].sort(compareWorkQueueItems).map(i => i.normalizedKeyword)).toEqual(['z', 'a'])
  })
})

describe('TASK-1700 — hash de insumos', () => {
  it('mismos insumos ⇒ mismo hash, sin importar el orden de llegada', () => {
    const a = item({ normalizedKeyword: 'uno', priorityScore: 10 })
    const b = item({ normalizedKeyword: 'dos', priorityScore: 20 })

    expect(computeInputSnapshotHash('v1', [a, b])).toBe(computeInputSnapshotHash('v1', [b, a]))
  })

  it('un score distinto cambia el hash: la corrida de mañana SÍ escribe si algo se movió', () => {
    const a = item({ normalizedKeyword: 'uno', priorityScore: 10 })
    const moved = item({ normalizedKeyword: 'uno', priorityScore: 11 })

    expect(computeInputSnapshotHash('v1', [a])).not.toBe(computeInputSnapshotHash('v1', [moved]))
  })

  it('la versión del score entra al hash: un bump NO reusa el snapshot viejo', () => {
    const a = item({ normalizedKeyword: 'uno', priorityScore: 10 })

    expect(computeInputSnapshotHash('incremental-clicks-v1', [a])).not.toBe(
      computeInputSnapshotHash('incremental-clicks-v2', [a])
    )
  })

  it('el hash NO depende del reloj: dos corridas seguidas sin cambios reusan', () => {
    // Si el hash llevara timestamp, cada corrida sería "distinta" y la idempotencia sería
    // decorativa: escribiría un snapshot nuevo cada día aunque nada se hubiera movido.
    const a = item({ normalizedKeyword: 'uno', priorityScore: 10 })
    const first = computeInputSnapshotHash('v1', [a])

    expect(computeInputSnapshotHash('v1', [a])).toBe(first)
  })
})

describe('TASK-1700 — deduplicación por sujeto', () => {
  /**
   * 🔴 REGRESIÓN DE LA PRIMERA CORRIDA REAL (berel.com, 2026-08-28).
   *
   * El snapshot dejó `pinturas` en #1 como `consolidate` y en #2 como `optimize`, con el
   * MISMO score: los dos hechos eran ciertos, pero una cola que dice dos cosas distintas
   * sobre la misma keyword falla justo la pregunta que existe para contestar.
   */
  it('un sujeto señalado por dos orígenes produce UNA fila, no dos', () => {
    const canibalizada = item({
      normalizedKeyword: 'pinturas',
      origin: 'consolidation',
      recommendedVerb: 'consolidate',
      priorityScore: 70.3322
    })

    const citabilidad = item({
      normalizedKeyword: 'pinturas',
      origin: 'aeo_gap',
      recommendedVerb: 'optimize',
      priorityScore: 70.3322,
      sourceScoreVersion: 'grader-v3'
    })

    const result = dedupeBySubject([citabilidad, canibalizada])

    expect(result).toHaveLength(1)
    // Consolidar es BLOQUEANTE: empujar una keyword canibalizada es la acción equivocada.
    expect(result[0]!.origin).toBe('consolidation')
    expect(result[0]!.recommendedVerb).toBe('consolidate')
  })

  it('la evidencia suprimida NO se pierde: viaja en el breakdown', () => {
    const result = dedupeBySubject([
      item({ normalizedKeyword: 'sellador', origin: 'consolidation', recommendedVerb: 'consolidate' }),
      item({ normalizedKeyword: 'sellador', origin: 'aeo_gap', recommendedVerb: 'optimize' })
    ])

    expect(result[0]!.breakdown.alsoSurfacedBy).toEqual([{ origin: 'aeo_gap', verb: 'optimize' }])
    expect(result[0]!.breakdown.basisReason).toContain('aeo_gap')
  })

  it('la BANDA manda sobre la precedencia: deduplicar no entierra a nadie', () => {
    // `consolidation` tiene mejor precedencia, pero si su evidencia no alcanza para puntuar
    // y otro origen sí puede, el sujeto conserva la banda que le corresponde.
    const sinMedir = item({
      normalizedKeyword: 'sellador',
      origin: 'consolidation',
      recommendedVerb: 'consolidate',
      scoreBand: 3,
      scoreBasis: 'no_measured_demand',
      priorityScore: null
    })

    const medida = item({
      normalizedKeyword: 'sellador',
      origin: 'gsc_striking_distance',
      recommendedVerb: 'optimize',
      scoreBand: 1,
      priorityScore: 42
    })

    expect(dedupeBySubject([sinMedir, medida])[0]!.scoreBand).toBe(1)
  })

  it('sujetos distintos no se tocan', () => {
    const a = item({ normalizedKeyword: 'uno' })
    const b = item({ normalizedKeyword: 'dos' })

    expect(dedupeBySubject([a, b])).toHaveLength(2)
  })
})

describe('TASK-1700 — la salud entra al hash', () => {
  const health = (state: 'ok' | 'degraded' | 'down', itemCount: number) => [
    { origin: 'aeo_gap' as const, state, reason: null, asOf: null, itemCount }
  ]

  it('mismo plan + origen que se cayó ⇒ snapshot NUEVO', () => {
    // El plan es idéntico, pero la evidencia sobre su completitud cambió: reusar serviría una
    // declaración de honestidad vencida.
    const a = item({ normalizedKeyword: 'uno' })

    expect(computeInputSnapshotHash('v1', [a], health('ok', 3))).not.toBe(
      computeInputSnapshotHash('v1', [a], health('down', 3))
    )
  })

  it('la REDACCIÓN de la razón no cambia el hash', () => {
    // `reason` y `asOf` son texto y relojes. Si entraran, `marketFreshness` y `latestRunAt`
    // harían que cada corrida fuera "distinta" y la idempotencia quedaría decorativa.
    const a = item({ normalizedKeyword: 'uno' })

    const wordingA = [
      { origin: 'aeo_gap' as const, state: 'degraded' as const, reason: 'texto A', asOf: '2026-01-01', itemCount: 2 }
    ]

    const wordingB = [
      { origin: 'aeo_gap' as const, state: 'degraded' as const, reason: 'texto B', asOf: '2026-02-02', itemCount: 2 }
    ]

    expect(computeInputSnapshotHash('v1', [a], wordingA)).toBe(computeInputSnapshotHash('v1', [a], wordingB))
  })
})

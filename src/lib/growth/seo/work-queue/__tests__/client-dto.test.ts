import { describe, expect, it } from 'vitest'

import { toClientWorkQueueDto } from '../client-dto'
import { buildWorkQueueProvenance, type ReadSeoWorkQueueResult } from '../reader'

const result: ReadSeoWorkQueueResult = {
  ok: true,
  snapshot: {
    snapshotId: 'seowqs-1',
    organizationId: 'org-1',
    seoTargetId: 'seot-1',
    priorityScoreVersion: 'incremental-clicks-v1',
    windowDays: 28,
    itemCount: 1,
    computedAt: '2026-08-28T10:00:00.000Z',
    expiresAt: '2026-08-29T12:00:00.000Z'
  },
  items: [
    {
      itemId: 'seowqi-1',
      rank: 1,
      origin: 'gsc_striking_distance',
      keyword: 'pinturas',
      targetUrl: 'https://berel.com/pinturas',
      recommendedVerb: 'optimize',
      scoreBasis: 'measured_incremental_clicks',
      scoreBand: 1,
      priorityScore: 70.3322,
      breakdown: {
        impressions: 12_000,
        clicks: 30,
        currentCtr: 0.0025,
        weightedPosition: 11.4,
        targetPosition: 5,
        expectedCtrAtTarget: 0.0098,
        ctrCurveSource: 'org_measured',
        curveSampleImpressions: 37_600,
        curveSampleClicks: 370,
        windowDays: 28,
        incrementalClicks: 70.3322,
        basisReason: 'Techo de 70 clics adicionales con la curva medida del propio sitio.'
      },
      evidenceRef: 'seo:gsc_query:pinturas',
      sourceScoreVersion: null
    }
  ],
  originHealth: [
    { origin: 'aeo_gap', state: 'down', reason: 'El cruce SEO↔AEO respondió no_aeo_data.', asOf: null, itemCount: 0 },
    { origin: 'gsc_striking_distance', state: 'ok', reason: null, asOf: null, itemCount: 1 }
  ],
  priorityScoreVersion: 'incremental-clicks-v1',
  asOf: '2026-08-28T10:00:00.000Z',
  staleness: 'fresh',
  nextCursor: null,
  // TASK-1785 — presente en el fixture para que el test de no-fuga de abajo pruebe que el
  // redactor NO lo arrastra al DTO cliente: la procedencia del operador nombra secciones
  // internas del breakdown y el cliente ya recibe sus lentes por campo (markers del redactor).
  provenance: buildWorkQueueProvenance('2026-08-28T10:00:00.000Z')
}

/**
 * 🔴 TEST DE NO-FUGA.
 *
 * Serializa el DTO completo y busca los términos prohibidos en el JSON crudo. Es a propósito
 * más burdo que un assert por campo: un redactor que un día devuelva el objeto entero
 * pasaría cualquier chequeo campo-por-campo que sólo mire los campos que ya conocemos.
 */
describe('TASK-1700 — DTO cliente', () => {
  const dto = toClientWorkQueueDto(result)
  const serialized = JSON.stringify(dto)

  it('no filtra el método: umbrales, percentiles ni tamaños de muestra', () => {
    for (const forbidden of [
      'curveSample',
      'expectedCtrAtTarget',
      'targetPosition',
      'ctrCurveSource',
      'basisReason',
      'windowDays',
      'weightedPosition'
    ]) {
      expect(serialized, `el DTO cliente filtró ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('no filtra procedencia interna ni identificadores de motores', () => {
    for (const forbidden of ['evidenceRef', 'seo:gsc_query', 'snapshotId', 'seowqi-', 'seowqs-', 'itemId', 'sourceScoreVersion']) {
      expect(serialized, `el DTO cliente filtró ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('no filtra dificultad, volumen estimado ni costo de proveedor', () => {
    for (const forbidden of ['difficulty', 'searchVolume', 'search_volume', 'cpc', 'costUsd', 'providerCost']) {
      expect(serialized.toLowerCase(), `el DTO cliente filtró ${forbidden}`).not.toContain(forbidden.toLowerCase())
    }
  })

  it('no filtra la versión del score: es método interno, no resultado', () => {
    expect(serialized).not.toContain('incremental-clicks-v1')
    expect(serialized).not.toContain('priorityScoreVersion')
  })

  it('SÍ entrega lo que el cliente necesita, con sus dos lentes marcadas', () => {
    expect(dto.items[0]).toMatchObject({
      keyword: 'pinturas',
      recommendedVerb: 'optimize',
      estimatedIncrementalClicks: 70,
      estimatedMarker: '◑',
      measuredImpressions: 12_000,
      measuredMarker: '●'
    })

    expect(dto.asOf).toBe('2026-08-28T10:00:00.000Z')
    expect(dto.staleness).toBe('fresh')
    // El cliente sabe que la foto es parcial, sin ver de qué motor se trata.
    expect(dto.partialSources).toBe(1)
  })

  it('la razón del cliente NO reusa la del operador (habla de método)', () => {
    expect(dto.items[0]!.reason).not.toContain('curva')
    expect(dto.items[0]!.reason).not.toContain('Techo')
  })

  it('un score nulo llega como null, jamás como 0 de relleno', () => {
    const band3 = toClientWorkQueueDto({
      ...result,
      items: [{ ...result.items[0]!, scoreBand: 3, scoreBasis: 'no_measured_demand', priorityScore: null, recommendedVerb: 'measure' }]
    })

    expect(band3.items[0]!.estimatedIncrementalClicks).toBeNull()
  })
})

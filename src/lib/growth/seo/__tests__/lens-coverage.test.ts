/**
 * TASK-1785 — El guard de cobertura ejercitado sobre los DTO REALES de los readers.
 *
 * Los fixtures son del tipo del reader (no `any`), así que `tsc` valida su forma y el
 * caminador valida su cobertura: las dos mitades del mecanismo sobre el mismo objeto.
 */
import { describe, expect, it } from 'vitest'

import type { BacklinkProfileResult, KeywordOpportunitiesResult, SeoPerformanceResult } from '../contracts'
import { collectNumericLeafPaths, reportLensCoverage, sectionClaims } from '../lens-coverage'

describe('gramática de `section`', () => {
  it('`*` reclama todo', () => {
    expect(sectionClaims('*', 'summary.current.clicks')).toBe(true)
  })

  it('un subárbol reclama sus hojas, y sólo las suyas', () => {
    expect(sectionClaims('summary', 'summary.current.clicks')).toBe(true)
    expect(sectionClaims('summary', 'standings[].clicks')).toBe(false)
  })

  it('un array reclama las hojas de sus items', () => {
    expect(sectionClaims('points[]', 'points[].referringDomains')).toBe(true)
  })

  it('un conjunto entre llaves reclama SÓLO los campos nombrados', () => {
    const section = 'standings[].{clicks,impressions,ctr}'

    expect(sectionClaims(section, 'standings[].clicks')).toBe(true)
    // La que sigue al chart pertenece a la OTRA entrada: si ésta la reclamara también, la
    // cifra tendría dos dueños y el DTO habría vuelto a ser ambiguo.
    expect(sectionClaims(section, 'standings[].position')).toBe(false)
  })

  it('nombrar un campo reclama lo que hay DENTRO de ese campo', () => {
    // `trend` es un array de escalares: su hoja real es `trend[]`. Exigir el nombre exacto
    // obligaría a declarar la forma interna de cada campo, y la gramática pasaría a ser una
    // copia del DTO — que es justo lo que no queremos mantener a mano.
    expect(sectionClaims('standings[].{position,trend}', 'standings[].trend[]')).toBe(true)
    expect(sectionClaims('standings[].{position,trend}', 'standings[].clicks')).toBe(false)
  })
})

describe('caminador de hojas numéricas', () => {
  it('colapsa índices de array: la lente es del campo, no de la fila', () => {
    const paths = collectNumericLeafPaths({ rows: [{ a: 1 }, { a: 2 }, { b: 3 }] })

    expect(paths.sort()).toEqual(['rows[].a', 'rows[].b'])
  })

  it('recorre TODO el array, no sólo el primer elemento', () => {
    // Una fila con un campo que las demás no traen es justo lo que un muestreo perdería.
    expect(collectNumericLeafPaths({ rows: [{ a: 1 }, { a: 1, tardio: 9 }] })).toContain('rows[].tardio')
  })

  it('`null` no es una hoja numérica: su ausencia de lente no es el defecto que perseguimos', () => {
    expect(collectNumericLeafPaths({ magnitude: null })).toEqual([])
  })
})

describe('cobertura sobre DTO reales', () => {
  it('perfil de enlaces: una sola lente cubre todas sus cifras', () => {
    const dto: BacklinkProfileResult = {
      ok: true,
      seoTargetId: 'seot-1',
      organizationId: 'org-1',
      range: { from: '2026-08-01', to: '2026-08-28', days: 28 },
      points: [
        {
          date: '2026-08-28',
          referringDomains: 100,
          backlinksTotal: 500,
          domainRank: 42,
          toxicShare: 0.12,
          newLostDelta: {}
        }
      ],
      provenance: [
        { section: 'points[]', lens: 'estimated', source: 'dataforseo_backlinks', capturedAt: '2026-08-28' }
      ]
    }

    expect(
      reportLensCoverage({ dto, provenance: dto.provenance, notFigures: ['range.days'] })
    ).toEqual({ unclaimed: [], ambiguous: [], figuresWithoutAsOf: [] })
  })

  it('🔴 performance: el DTO mixto queda cubierto SIN que una cifra tenga dos dueños', () => {
    // Éste es el caso que probó que la lente no puede vivir a nivel de resultado: `summary`
    // es ● aunque el chart sea ◑, y `standings` mezcla las dos en la misma fila.
    const dto: SeoPerformanceResult = {
      ok: true,
      organizationId: 'org-1',
      seoTargetId: 'seot-1',
      mode: 'keyword',
      metric: 'position',
      device: 'desktop',
      range: { from: '2026-08-01', to: '2026-08-28', days: 28 },
      source: 'dataforseo_estimated',
      series: [{ item: 'agencia', points: [{ date: '2026-08-28', value: 7 }], sparse: false }],
      standings: [
        {
          item: 'agencia',
          position: 7,
          positionDelta30d: -2,
          clicks: 10,
          impressions: 900,
          ctr: 0.011,
          trend: [8, 7]
        }
      ],
      summary: {
        current: { clicks: 10, impressions: 900, position: 7, ctr: 0.011 },
        previous: null,
        series: [{ date: '2026-08-28', clicks: 10, impressions: 900, position: 7, ctr: 0.011 }]
      },
      itemsWithoutData: [],
      provenance: [
        { section: 'series[].points[].value', lens: 'estimated', source: 'dataforseo_serp', capturedAt: '2026-08-28' },
        {
          section: 'standings[].{position,positionDelta30d,trend}',
          lens: 'estimated',
          source: 'dataforseo_serp',
          capturedAt: '2026-08-28'
        },
        { section: 'standings[].{clicks,impressions,ctr}', lens: 'measured', source: 'gsc', capturedAt: '2026-08-28' },
        { section: 'summary', lens: 'measured', source: 'gsc', capturedAt: '2026-08-28' }
      ]
    }

    const report = reportLensCoverage({ dto, provenance: dto.provenance, notFigures: ['range.days'] })

    expect(report).toEqual({ unclaimed: [], ambiguous: [], figuresWithoutAsOf: [] })

    // Y la prueba de que la partición dice algo: las dos lentes conviven en el mismo DTO.
    expect(new Set(dto.provenance.map(entry => entry.lens))).toEqual(new Set(['measured', 'estimated']))
  })

  it('detecta la cifra nueva que nace sin lente — el caso que el guard existe para atrapar', () => {
    const provenance = [
      { section: 'points[]', lens: 'estimated' as const, source: 'dataforseo_backlinks' as const, capturedAt: null }
    ]

    const report = reportLensCoverage({
      dto: { points: [{ referringDomains: 10 }], nuevoKpiSinLente: 42 },
      provenance
    })

    expect(report.unclaimed).toEqual(['nuevoKpiSinLente'])
  })

  it('detecta una sección CON cifras que no declara as-of', () => {
    // `capturedAt: null` es legítimo en una sección vacía y deja de serlo en cuanto hay un
    // número: una cifra sin fecha se lee como vigente para siempre.
    const report = reportLensCoverage({
      dto: { points: [{ referringDomains: 10 }] },
      provenance: [
        { section: 'points[]', lens: 'estimated', source: 'dataforseo_backlinks', capturedAt: null }
      ]
    })

    expect(report.figuresWithoutAsOf).toEqual(['points[]'])
  })

  it('una sección VACÍA puede declarar `capturedAt: null` sin ser un hallazgo', () => {
    const report = reportLensCoverage({
      dto: { points: [] },
      provenance: [
        { section: 'points[]', lens: 'estimated', source: 'dataforseo_backlinks', capturedAt: null }
      ]
    })

    expect(report.figuresWithoutAsOf).toEqual([])
  })

  it('detecta la cifra con DOS dueños: ambigüedad, no redundancia', () => {
    const report = reportLensCoverage({
      dto: { clicks: 10 },
      provenance: [
        { section: '*', lens: 'measured', source: 'gsc', capturedAt: null },
        { section: 'clicks', lens: 'estimated', source: 'dataforseo_labs', capturedAt: null }
      ]
    })

    expect(report.ambiguous).toEqual(['clicks'])
  })

  it('oportunidades: lo medido y lo estimado quedan en entradas distintas', () => {
    const dto: KeywordOpportunitiesResult = {
      ok: true,
      organizationId: 'org-1',
      seoTargetId: 'seot-1',
      windowDays: 28,
      impressionsThreshold: 10,
      market: 'available',
      targetPosition: 3,
      expectedCtrAtTarget: 0.1,
      ctrCurveSource: 'org_measured',
      curveSampleSize: { impressions: 2000, clicks: 40 },
      orderedBy: 'estimated_click_gain',
      opportunities: [
        {
          keyword: 'agencia',
          page: 'https://example.com/a',
          position: 9,
          impressions: 900,
          clicks: 10,
          ctr: 0.011,
          estimatedClickGain: 80,
          quickWin: true,
          cannibalized: false,
          competingPages: 1,
          searchVolume: 1300,
          difficulty: 12,
          linkBarrier: 'low'
        }
      ],
      provenance: [
        {
          section: 'opportunities[].{position,impressions,clicks,ctr,estimatedClickGain,competingPages}',
          lens: 'measured',
          source: 'gsc',
          capturedAt: '2026-08-28'
        },
        {
          section: 'opportunities[].{searchVolume,difficulty,linkBarrier}',
          lens: 'estimated',
          source: 'dataforseo_labs',
          capturedAt: '2026-08-01'
        }
      ]
    }

    // Los parámetros del cálculo NO son cifras del mercado, y declararlo es parte del punto:
    // "esto es un parámetro" tiene que afirmarlo alguien, no asumirse por omisión.
    const report = reportLensCoverage({
      dto,
      provenance: dto.provenance,
      notFigures: [
        'windowDays',
        'impressionsThreshold',
        'targetPosition',
        'expectedCtrAtTarget',
        'curveSampleSize.impressions',
        'curveSampleSize.clicks'
      ]
    })

    expect(report).toEqual({ unclaimed: [], ambiguous: [], figuresWithoutAsOf: [] })
  })
})

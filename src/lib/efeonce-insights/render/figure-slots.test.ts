/**
 * TASK-1889 Slice 5 — reglas de página de figura que salieron de ediciones REALES (Berel/Sky, 2026-09-25).
 */

import { describe, expect, it } from 'vitest'

import { buildFigureSlides, FIGURE_CAPACITY } from './figure-slots'

const fact = (factId: string, value: number, metricId: string, channelId?: string) =>
  [factId, { factId, value, unit: 'count', label: metricId, metricId, evidenceRef: `ev-${factId}`, ...(channelId ? { channelId } : {}) }] as const

const grouped = (channels: Array<string | null>) => ({
  specVersion: 'chart_spec_v1', chartId: 'c', family: 'bar_grouped', relation: 'comparison', title: 'Figura', unit: 'count',
  dimensionLabels: ['A', 'B'], dimensionChannelIds: channels, references: [], scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
  series: [
    { seriesId: 'p', label: 'Período anterior', factIds: ['p1', 'p2'], unit: 'count' },
    { seriesId: 'c', label: 'Período', factIds: ['c1', 'c2'], unit: 'count' }
  ]
}) as never

const byId = new Map([fact('c1', 9377, 'clicks'), fact('p1', 10662, 'clicks'), fact('c2', 512113, 'impressions'), fact('p2', 566297, 'impressions')]) as never

describe('qué página recibe una figura agrupada', () => {
  it('métricas que comparten canal (SEO: todas `google`) van a comparación, cada una en su escala', () => {
    // Caso real Berel: en un eje común, 9.377 clics contra 512.113 impresiones quedaba invisible.
    const [slide] = buildFigureSlides(grouped(['google', 'google']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.kind).toBe('comparison')
  })

  it('canales distintos (un motor por dimensión) van a columnas sobre un eje', () => {
    const [slide] = buildFigureSlides(grouped(['chatgpt', 'gemini']), byId, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.kind).toBe('columns')
  })
})

describe('texto de la página de figura con datos reales (revisión de TASK-1846 sobre Berel y Sky)', () => {
  const withMethod = new Map([
    ['c1', { factId: 'c1', value: 9377, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e', method: { name: 'gsc_window_aggregate' } }],
    ['p1', { factId: 'p1', value: 10662, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e', method: { name: 'gsc_window_aggregate' } }],
    ['c2', { factId: 'c2', value: 1, unit: 'count', label: 'Pos', metricId: 'page_one_keywords', evidenceRef: 'e', method: { name: 'dataforseo_serp_rank' } }],
    ['p2', { factId: 'p2', value: 2, unit: 'count', label: 'Pos', metricId: 'page_one_keywords', evidenceRef: 'e', method: { name: 'dataforseo_serp_rank' } }]
  ]) as never

  const claim = { claimId: 'k', text: 'Clics orgánicos: 9.377 (período anterior 10.662, variación −12,1 %).', factIds: ['c1', 'p1'] }

  it('la fuente es la de los hechos que la figura dibuja, legible y sin repetir', () => {
    const [slide] = buildFigureSlides(grouped([null, null]), withMethod, undefined, [claim], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.sourceText).toBe('Google Search Console · Mediciones de posiciones en buscadores')
  })

  it('«Lo que significa» que repite la conclusión no se dibuja', () => {
    const reading = { chartId: 'c', meaning: { ...claim, claimId: 'm' }, nextStep: null }
    const [slide] = buildFigureSlides(grouped([null, null]), withMethod, reading as never, [claim], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.conclusion).toBe(claim.text)
    expect(slide!.closing).toEqual([])
  })
})

describe('metas', () => {
  const facts = new Map([
    ['ftr', { factId: 'ftr', value: 90.9, unit: 'percent', label: 'FTR', metricId: 'ftr', evidenceRef: 'e' }],
    ['ftr-prev', { factId: 'ftr-prev', value: 96.5, unit: 'percent', label: 'FTR', metricId: 'ftr', evidenceRef: 'e' }],
    ['ftr-target', { factId: 'ftr-target', value: 80, unit: 'percent', label: 'Meta FTR', metricId: 'target.ftr', evidenceRef: 'e', role: 'reference' }]
  ]) as never

  const chart = {
    specVersion: 'chart_spec_v1', chartId: 'b', family: 'bullet', relation: 'target', title: 'FTR', unit: 'percent', series: [], dimensionLabels: ['Sky'],
    references: [], scale: { kind: 'linear', baseline: 0 }, tabularEquivalent: { columns: [], rows: [] },
    data: { kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i', label: 'Sky', valueFactId: 'ftr', targetFactId: 'ftr-target' }] }
  } as never

  const comparison = { claimId: 'cmp', text: 'FTR: 90,9 % (período anterior 96,5 %, variación −5,6 pp).', factIds: ['ftr', 'ftr-prev'] }
  const againstTarget = { claimId: 'tgt', text: 'Sky: 90,9 %, sobre la meta de 80,0 %.', factIds: ['ftr', 'ftr-target'] }

  it('una métrica en % se lee contra la meta en pp, no como «114 %»', () => {
    const [slide] = buildFigureSlides(chart, facts, undefined, [], 'es-CL', FIGURE_CAPACITY.report)

    expect((slide!.body.bulletRows as Array<{ pct: string }>)[0]!.pct).toBe('10,9 pp')
  })

  it('sin lectura, la conclusión es la afirmación que cita la meta, no la comparación de períodos', () => {
    const [slide] = buildFigureSlides(chart, facts, undefined, [comparison, againstTarget], 'es-CL', FIGURE_CAPACITY.report)

    expect(slide!.conclusion).toBe(againstTarget.text)
  })
})

describe('predicado compartido con el planner', () => {
  it('hasFigurePage es el mismo criterio del render: familia sin página o sin hechos ⇒ false', async () => {
    const { hasFigurePage } = await import('./figure-slots')

    expect(hasFigurePage(grouped([null, null]), byId)).toBe(true)
    expect(hasFigurePage({ ...(grouped([null, null]) as object), family: 'pie' } as never, byId)).toBe(false)
    expect(hasFigurePage(grouped([null, null]), new Map() as never)).toBe(false)
  })
})

describe('bajada', () => {
  it('no repite el hecho principal de la conclusión con otras palabras (caso Berel clics)', () => {
    const facts = new Map([
      ['c1', { factId: 'c1', value: 9377, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e' }],
      ['p1', { factId: 'p1', value: 10662, unit: 'count', label: 'Clics', metricId: 'clicks', evidenceRef: 'e' }],
      ['c2', { factId: 'c2', value: 5, unit: 'count', label: 'Imp', metricId: 'impressions', evidenceRef: 'e' }],
      ['p2', { factId: 'p2', value: 6, unit: 'count', label: 'Imp', metricId: 'impressions', evidenceRef: 'e' }]
    ]) as never

    const reading = { chartId: 'c', conclusion: { claimId: 'k', text: 'Los clics bajaron de 10.662 a 9.377 (−12,1 %).', factIds: ['c1', 'p1'] }, nextStep: null }
    const sameFact = { claimId: 'a', text: 'Clics orgánicos: 9.377 (período anterior 10.662).', factIds: ['c1', 'p1'] }
    const other = { claimId: 'b', text: 'Impresiones: 5 (período anterior 6).', factIds: ['c2', 'p2'] }

    const [withOther] = buildFigureSlides(grouped([null, null]), facts, reading as never, [sameFact, other], 'es-CL', FIGURE_CAPACITY.report)
    const [alone] = buildFigureSlides(grouped([null, null]), facts, reading as never, [sameFact], 'es-CL', FIGURE_CAPACITY.report)

    expect(withOther!.lead).toBe(other.text)
    expect(alone!.lead).toBeNull()
  })
})

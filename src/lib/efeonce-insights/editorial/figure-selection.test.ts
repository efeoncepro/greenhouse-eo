import { describe, expect, it } from 'vitest'

import type { ChartSpecV1 } from '../contracts/chart-spec'

import { chartFactUse, chooseFigureFamily, duplicatedFigureFacts, familiesForQuestion, metricDirectionOf, orderByQuestion } from './figure-selection'

// TASK-1974 — una fila del criterio canónico (§5) por caso.
describe('familiesForQuestion — tabla pregunta → familia', () => {
  it('¿cuánto es y cómo cambió? → tarjeta de cifra', () => {
    expect(familiesForQuestion({ question: 'value_change' })).toEqual(['stat'])
  })

  it('¿cómo evolucionó? → línea con 3 o más puntos; con menos, sin figura propia', () => {
    expect(familiesForQuestion({ question: 'evolution', points: 4 })).toEqual(['line'])
    expect(familiesForQuestion({ question: 'evolution', points: 2 })).toEqual([])
  })

  it('¿cumplimos la meta? → bullet', () => {
    expect(familiesForQuestion({ question: 'target' })).toEqual(['bullet'])
  })

  it('¿qué explica el cambio? → cascada', () => {
    expect(familiesForQuestion({ question: 'explain_change' })).toEqual(['waterfall'])
  })

  it('composición de 2–3 partes → dona (y waffle si son pocas unidades contables)', () => {
    expect(familiesForQuestion({ question: 'composition', parts: 3, units: 1686 })).toEqual(['donut'])
    expect(familiesForQuestion({ question: 'composition', parts: 2, units: 8 })).toEqual(['donut', 'waffle'])
  })

  it('composición contable de 4 categorías → waffle; más de 4 → barras ordenadas', () => {
    expect(familiesForQuestion({ question: 'composition', parts: 4, units: 8 })).toEqual(['waffle'])
    expect(familiesForQuestion({ question: 'composition', parts: 5, units: 42 })).toEqual(['bar'])
    expect(familiesForQuestion({ question: 'composition', parts: 4, units: null })).toEqual(['bar'])
  })

  it('un waffle con más de 100 unidades no es un conteo legible', () => {
    expect(familiesForQuestion({ question: 'composition', parts: 4, units: 101 })).toEqual(['bar'])
  })

  it('¿cuánto del total es un subconjunto, en dos períodos? → barras apiladas (≤ 4 segmentos)', () => {
    expect(familiesForQuestion({ question: 'subset', periods: 2, segments: 2 })).toEqual(['bar_stacked'])
    expect(familiesForQuestion({ question: 'subset', periods: 1, segments: 2 })).toEqual([])
    expect(familiesForQuestion({ question: 'subset', periods: 2, segments: 5 })).toEqual([])
  })

  it('comparar elementos ordenados → barras', () => {
    expect(familiesForQuestion({ question: 'compare', elements: 5 })).toEqual(['bar'])
    expect(familiesForQuestion({ question: 'compare', elements: 1 })).toEqual([])
  })
})

describe('chooseFigureFamily — la variedad sólo desempata', () => {
  it('entre dos familias igual de válidas elige la que no usó la figura anterior', () => {
    expect(chooseFigureFamily({ question: 'composition', parts: 2, units: 8 }, 'donut')).toBe('waffle')
    expect(chooseFigureFamily({ question: 'composition', parts: 2, units: 8 }, null)).toBe('donut')
  })

  it('con una sola familia válida, la variedad NO la cambia aunque se repita', () => {
    expect(chooseFigureFamily({ question: 'composition', parts: 3, units: 1686 }, 'donut')).toBe('donut')
    expect(chooseFigureFamily({ question: 'compare', elements: 5 }, 'bar')).toBe('bar')
  })

  it('sin familia válida no inventa una', () => {
    expect(chooseFigureFamily({ question: 'evolution', points: 1 })).toBeNull()
  })
})

describe('orderByQuestion — orden del capítulo', () => {
  it('cifras → metas → evolución → explicación → composición → comparación', () => {
    const ordered = orderByQuestion([
      { id: 'barras', question: 'compare' as const },
      { id: 'cascada', question: 'explain_change' as const },
      { id: 'cifras', question: 'value_change' as const },
      { id: 'dona', question: 'composition' as const },
      { id: 'linea', question: 'evolution' as const },
      { id: 'metas', question: 'target' as const }
    ])

    expect(ordered.map(item => item.id)).toEqual(['cifras', 'metas', 'linea', 'cascada', 'dona', 'barras'])
  })
})

describe('metricDirectionOf', () => {
  it('la dirección del propio hecho gana; si no, la declarada por métrica; la posición es menor-es-mejor', () => {
    expect(metricDirectionOf({ metricId: 'rpa', unit: 'ratio', dimension: { direction: 'lower_is_better' } })).toBe('lower_is_better')
    expect(metricDirectionOf({ metricId: 'clicks', unit: 'count' })).toBe('higher_is_better')
    expect(metricDirectionOf({ metricId: 'mention_rate.gemini', unit: 'percent' })).toBe('higher_is_better')
    expect(metricDirectionOf({ metricId: 'position', unit: 'position' })).toBe('lower_is_better')
    expect(metricDirectionOf({ metricId: 'delivered.completed', unit: 'count' })).toBeNull()
  })
})

const spec = (overrides: Partial<ChartSpecV1>): ChartSpecV1 => ({
  specVersion: 'chart_spec_v1',
  chartId: 'chart',
  family: 'bar',
  relation: 'comparison',
  title: 't',
  series: [],
  dimensionLabels: [],
  unit: 'count',
  scale: { kind: 'linear', baseline: 0 },
  references: [],
  tabularEquivalent: { columns: [], rows: [] },
  ...overrides
})

describe('duplicatedFigureFacts — un dato, una figura', () => {
  const current = (id: string) => !id.endsWith('.prev')

  it('Sky: el mismo OTD en barras contra el mes anterior y en bullet es un duplicado', () => {
    const bars = spec({ chartId: 'chart.ico.percent', family: 'bar_grouped', series: [{ seriesId: 'p', label: 'p', factIds: ['otd.prev'], unit: 'percent' }, { seriesId: 'c', label: 'c', factIds: ['otd'], unit: 'percent' }] })
    const bullet = spec({ chartId: 'chart.ico.bullet.otd', family: 'bullet', relation: 'target', data: { kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i', label: 'Sky', valueFactId: 'otd', targetFactId: 'target.otd' }] } })

    expect([...duplicatedFigureFacts([chartFactUse(bars, current), chartFactUse(bullet, current)]).keys()]).toEqual(['otd'])
  })

  it('los totales de una cascada son anclas: conviven con la tarjeta de clics', () => {
    const waterfall = spec({
      chartId: 'chart.seo.drivers.query',
      family: 'waterfall',
      relation: 'decomposition',
      data: { kind: 'waterfall', steps: [{ stepId: 'a', label: 'ago', factId: 'clicks.prev', isTotal: true }, { stepId: 'b', label: 'berel', factId: 'delta.berel', isTotal: false }, { stepId: 'c', label: 'sep', factId: 'clicks', isTotal: true }] }
    })

    const stats = { figureId: 'stats.seo', family: 'stat' as const, factIds: ['clicks', 'impressions'] }

    expect(duplicatedFigureFacts([stats, chartFactUse(waterfall, current)]).size).toBe(0)
  })
})

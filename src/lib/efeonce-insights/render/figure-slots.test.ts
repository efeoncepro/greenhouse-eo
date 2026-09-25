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

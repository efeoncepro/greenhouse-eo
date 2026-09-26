import { describe, expect, it } from 'vitest'

import { MAX_SLICES } from '@/lib/artifact-composer/pure'

import { validateChartSpecValues } from '../editorial/chart-values'
import { CHART_FAMILIES, DATA_CHART_FAMILIES, MAX_COMPOSITION_PARTS, type ChartFamilyDataV1, type ChartSpecV1, validateChartSpec } from './chart-spec'

/**
 * TASK-1888 — ChartSpec de 15 familias: cada invariante de `chart-geometry.ts` tiene su test de rechazo, y un spec v1
 * sellado (sin `data` ni `channelId`) sigue validando igual.
 */

const values = new Map<string, number | null>([
  ['a', 10],
  ['b', 20],
  ['c', 30],
  ['d', 40],
  ['zero', 0],
  ['neg', -5],
  ['null', null],
  ['t90', 90],
  ['v81', 81.9],
  ['v80', 80.1],
  ['s120', 120]
])

const known = new Set(values.keys())

const seriesSpec = (overrides: Partial<ChartSpecV1> = {}): ChartSpecV1 => ({
  specVersion: 'chart_spec_v1',
  chartId: 'chart.test',
  family: 'bar',
  relation: 'comparison',
  title: 't',
  series: [{ seriesId: 's', label: 'Período', factIds: ['a', 'b'], unit: 'count' }],
  dimensionLabels: ['A', 'B'],
  unit: 'count',
  scale: { kind: 'linear', baseline: 0 },
  references: [],
  tabularEquivalent: { columns: ['Métrica', 'Período'], rows: [[null, 'a'], [null, 'b']] },
  ...overrides
})

const dataSpec = (data: ChartFamilyDataV1, relation: ChartSpecV1['relation']): ChartSpecV1 =>
  seriesSpec({ family: data.kind, relation, series: [], dimensionLabels: [], data, scale: { kind: 'linear', baseline: null } })

/** Como `validateEditorialPlan`: estructura primero, valores sólo sobre un spec bien formado. */
const rules = (spec: ChartSpecV1, withValues = true) => {
  const structural = validateChartSpec(spec, known)

  return (structural.length > 0 || !withValues ? structural : validateChartSpecValues(spec, values)).map(violation => violation.rule)
}

describe('TASK-1888 — ChartSpec: 15 familias', () => {
  it('el contrato lista las 15 familias (7 de series + 8 de datos propios)', () => {
    expect(CHART_FAMILIES).toHaveLength(15)
    expect(DATA_CHART_FAMILIES).toEqual(['bullet', 'waterfall', 'funnel', 'gauge', 'heatmap', 'waffle', 'venn_two', 'upset'])
  })

  it('el techo de partes del contrato es el mismo de la geometría', () => {
    expect(MAX_COMPOSITION_PARTS).toBe(MAX_SLICES)
  })

  it('un spec v1 sellado (bar_grouped sin data ni channelId) valida igual, con y sin valores', () => {
    const v1 = seriesSpec({
      family: 'bar_grouped',
      series: [
        { seriesId: 'p', label: 'Período anterior', factIds: ['a', 'b'], unit: 'count' },
        { seriesId: 'c', label: 'Período', factIds: ['c', 'd'], unit: 'count' }
      ]
    })

    expect(rules(v1, false)).toEqual([])
    expect(rules(v1)).toEqual([])
  })

  it('barras nacen en cero', () => {
    expect(rules(seriesSpec({ scale: { kind: 'linear', baseline: null } }))).toContain('bar_zero_baseline')
  })

  it('pie/donut: una serie, ≤ 3 partes, sin negativos', () => {
    const pie = (factIds: string[]) => seriesSpec({ family: 'donut', relation: 'composition', series: [{ seriesId: 's', label: 'x', factIds, unit: 'count' }], dimensionLabels: factIds })

    expect(rules(pie(['a', 'b', 'c']))).toEqual([])
    expect(rules(pie(['a', 'b', 'c', 'd']))).toContain('composition_max_slices')
    expect(rules(pie(['a', 'neg']))).toEqual(['geometry_negative_share'])
  })

  it('dispersión: dos series con pares completos', () => {
    const scatter = (x: string[], y: string[]) =>
      seriesSpec({ family: 'scatter', relation: 'correlation', series: [{ seriesId: 'x', label: 'x', factIds: x, unit: 'count' }, { seriesId: 'y', label: 'y', factIds: y, unit: 'count' }], dimensionLabels: x })

    expect(rules(scatter(['a', 'b'], ['c', 'd']))).toEqual([])
    expect(rules(scatter(['a', 'b'], ['c']))).toContain('scatter_paired_observations')
    expect(rules(scatter(['a', 'null'], ['c', 'd']))).toContain('scatter_complete_pairs')
  })

  it('bullet: la meta es un hecho positivo; valor y meta medidos', () => {
    const bullet = (valueFactId: string, targetFactId: string) =>
      dataSpec({ kind: 'bullet', direction: 'higher_is_better', items: [{ itemId: 'i', label: 'OTD', valueFactId, targetFactId }] }, 'target')

    expect(rules(bullet('v81', 't90'))).toEqual([])
    expect(rules(bullet('v81', 'zero'))).toEqual(['geometry_invalid_target'])
    expect(rules(bullet('null', 't90'))).toEqual(['bullet_measured'])
    expect(rules(dataSpec({ kind: 'bullet', direction: 'higher_is_better', items: [] }, 'target'))).toContain('bullet_items_required')
  })

  it('bullet: la banda «cerca de la meta» es un hecho positivo del lado donde aún no se alcanza', () => {
    const bullet = (direction: 'higher_is_better' | 'lower_is_better', targetFactId: string, bandFactId: string) =>
      dataSpec({ kind: 'bullet', direction, items: [{ itemId: 'i', label: 'OTD', valueFactId: 'v81', targetFactId, bandFactId }] }, 'target')

    expect(rules(bullet('higher_is_better', 't90', 'v80'))).toEqual([])
    expect(rules(bullet('higher_is_better', 't90', 's120'))).toEqual(['bullet_band_side'])
    expect(rules(bullet('lower_is_better', 'v80', 't90'))).toEqual([])
    expect(rules(bullet('lower_is_better', 't90', 'v80'))).toEqual(['bullet_band_side'])
    expect(rules(bullet('higher_is_better', 't90', 'null'))).toEqual(['bullet_band_side'])
    expect(rules(bullet('higher_is_better', 't90', 'nope'))).toContain('unknown_fact')
  })

  it('medidor: valor anterior obligatorio y todo dentro de la escala', () => {
    const gauge = (valueFactId: string, previousFactId: string) => dataSpec({ kind: 'gauge', valueFactId, previousFactId, targetFactId: null, min: 0, max: 100 }, 'target')

    expect(rules(gauge('v81', 'v80'))).toEqual([])
    expect(rules(gauge('v81', 'null'))).toEqual(['gauge_previous_required'])
    expect(rules(gauge('s120', 'v80'))).toEqual(['geometry_value_out_of_range'])
  })

  it('embudo: cada etapa es subconjunto de la anterior', () => {
    const funnel = (ids: string[]) => dataSpec({ kind: 'funnel', stages: ids.map(id => ({ stageId: id, label: id, factId: id })) }, 'conversion')

    expect(rules(funnel(['d', 'c', 'a']))).toEqual([])
    expect(rules(funnel(['a', 'b']))).toEqual(['geometry_stage_grows'])
    expect(rules(funnel(['a']))).toContain('funnel_stages')
  })

  it('cascada: ≥ 2 pasos, totales sólo en los extremos', () => {
    const waterfall = (steps: Array<[string, boolean]>) => dataSpec({ kind: 'waterfall', steps: steps.map(([id, isTotal]) => ({ stepId: id, label: id, factId: id, isTotal })) }, 'decomposition')

    expect(rules(waterfall([['a', true], ['b', false], ['c', true]]))).toEqual([])
    expect(rules(waterfall([['a', false], ['b', true], ['c', false]]))).toContain('waterfall_total_position')
  })

  it('heatmap: grilla completa y al menos una celda medida', () => {
    const heatmap = (cells: Array<Array<string | null>>) => dataSpec({ kind: 'heatmap', rowLabels: ['r1', 'r2'], columnLabels: ['c1', 'c2'], cells }, 'trend')

    expect(rules(heatmap([['a', 'b'], ['c', null]]))).toEqual([])
    expect(rules(heatmap([['a', 'b'], ['c']]))).toContain('heatmap_grid')
    expect(rules(heatmap([['null', null], [null, 'null']]))).toEqual(['geometry_no_measurable_values'])
  })

  it('waffle: partes medidas que suman el total declarado', () => {
    const waffle = (totalFactId: string | null) => dataSpec({ kind: 'waffle', parts: [{ partId: 'a', label: 'a', factId: 'a' }, { partId: 'c', label: 'c', factId: 'c' }], totalFactId }, 'composition')

    expect(rules(waffle('d'))).toEqual([])
    expect(rules(waffle(null))).toEqual([])
    expect(rules(waffle('b'))).toEqual(['waffle_parts_sum_total'])
  })

  it('Venn: sólo dos conjuntos, ninguno vacío', () => {
    const venn = (onlyA: string, onlyB: string, both: string) => dataSpec({ kind: 'venn_two', setA: { label: 'ChatGPT', channelId: 'chatgpt' }, setB: { label: 'Gemini', channelId: 'gemini' }, onlyAFactId: onlyA, onlyBFactId: onlyB, bothFactId: both }, 'overlap')

    expect(rules(venn('a', 'b', 'c'))).toEqual([])
    expect(rules(venn('zero', 'b', 'zero'))).toEqual(['geometry_empty_set'])
    expect(rules(venn('neg', 'b', 'c'))).toEqual(['geometry_negative_set'])
  })

  it('UpSet: ≥ 2 conjuntos, intersecciones de mayor a menor y sin conjuntos no declarados', () => {
    const upset = (order: string[], setIds: string[][] = [['x'], ['y'], ['x', 'y']]) =>
      dataSpec({ kind: 'upset', sets: [{ setId: 'x', label: 'x' }, { setId: 'y', label: 'y' }], intersections: order.map((factId, index) => ({ intersectionId: `i${index}`, setIds: setIds[index]!, factId })) }, 'overlap')

    expect(rules(upset(['c', 'b', 'a']))).toEqual([])
    expect(rules(upset(['a', 'b', 'c']))).toEqual(['upset_sorted_desc'])
    expect(rules(upset(['c', 'b', 'a'], [['x'], ['z'], ['x', 'y']]))).toContain('upset_unknown_set')
  })

  it('una familia de datos propios exige `data` con su kind y no usa `series`', () => {
    expect(rules(seriesSpec({ family: 'funnel', relation: 'conversion' }))).toEqual(expect.arrayContaining(['family_data_required', 'family_data_series']))
    expect(rules(dataSpec({ kind: 'funnel', stages: [] }, 'conversion'), false)).toContain('funnel_stages')
    expect(rules({ ...dataSpec({ kind: 'gauge', valueFactId: 'a', previousFactId: 'b', targetFactId: null, min: 0, max: 100 }, 'target'), family: 'bullet' })).toContain('family_data_kind')
    expect(rules(seriesSpec({ data: { kind: 'waffle', parts: [], totalFactId: null } }))).toContain('family_data_unexpected')
  })

  it('rechaza hechos desconocidos en cualquier lugar del spec y canales desalineados', () => {
    expect(rules(dataSpec({ kind: 'gauge', valueFactId: 'nope', previousFactId: 'a', targetFactId: null, min: 0, max: 100 }, 'target'))).toContain('unknown_fact')
    expect(rules(seriesSpec({ dimensionChannelIds: ['google'] }))).toContain('dimension_channels_aligned')
    expect(rules(seriesSpec({ dimensionChannelIds: ['chatgpt', null] }))).toEqual([])
  })
})

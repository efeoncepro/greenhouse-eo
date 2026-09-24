/**
 * Resolvers del catálogo `insights-deck`.
 *
 * La geometría y la guarda de coherencia barra↔etiqueta salen del motor (`bar-figure` sobre
 * `chart-geometry`), domain-free y compartidas con el informe A4: la misma cifra no puede pasar en
 * una lámina y fallar en una hoja.
 */

import type { ResolverRegistry } from '../../resolver-contract'
import { familyAwareBarEffects, figureFamilyEffects, figurePathEffects } from '../../chart-figure'

export { parsePrintedNumber } from '../../bar-figure'

export const insightsDeckResolvers: ResolverRegistry = {
  /** El largo de cada barra sale del dato, recalculado. Una barra escrita a mano es fabricación. */
  'insights-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => familyAwareBarEffects('insights-bar-geometry', ctx.slots.figureSeries, ctx.item)
  },
  'insights-chart-family': {
    known: ['bar', 'bar_grouped', 'bar_stacked', 'line', 'pie', 'donut', 'scatter'],
    build: value => figureFamilyEffects(value)
  },
  'insights-chart-path-1': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 1)
  },
  'insights-chart-path-2': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 2)
  },
  'insights-chart-path-3': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 3)
  }
}

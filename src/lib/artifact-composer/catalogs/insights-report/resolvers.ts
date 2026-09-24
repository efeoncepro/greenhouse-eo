/**
 * Resolvers del catálogo `insights-report` — semántica → presentación.
 *
 * La GEOMETRÍA y la guarda de coherencia barra↔etiqueta no se calculan acá: salen del motor
 * (`bar-figure` sobre `chart-geometry`), domain-free y compartidos con el deck. Este módulo sólo
 * declara qué resolver usa cada slot del catálogo.
 */

import type { ResolverRegistry } from '../../resolver-contract'
import { familyAwareBarEffects, figureFamilyEffects, figurePathEffects } from '../../chart-figure'

export { parsePrintedNumber, roundingToleranceOf } from '../../bar-figure'

export const insightsReportResolvers: ResolverRegistry = {
  /**
   * `report-bar-geometry` — el largo de cada barra sale de su valor, recalculado desde el dato. Si la
   * etiqueta impresa no representa el valor que dibuja la barra, el render falla: una barra cuyo
   * ancho no sale del dato es fabricación gráfica.
   */
  'report-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => familyAwareBarEffects('report-bar-geometry', ctx.slots.figureSeries, ctx.item)
  },
  'report-chart-family': {
    known: ['bar', 'bar_grouped', 'bar_stacked', 'line', 'pie', 'donut', 'scatter'],
    build: value => figureFamilyEffects(value)
  },
  'report-chart-path-1': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 1)
  },
  'report-chart-path-2': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 2)
  },
  'report-chart-path-3': {
    known: ['<path SVG generado desde ChartSpec>'],
    build: (value, ctx) => figurePathEffects(value, ctx.item.chartFamily, 3)
  }
}

/**
 * Resolvers del catálogo `insights-deck`.
 *
 * La geometría y la guarda de coherencia barra↔etiqueta salen del motor (`bar-figure` sobre
 * `chart-geometry`), domain-free y compartidas con el informe A4: la misma cifra no puede pasar en
 * una lámina y fallar en una hoja.
 */

import type { ResolverRegistry } from '../../resolver-contract'
import { familyAwareBarEffects, figureFamilyEffects, figurePathEffects } from '../../chart-figure'
import { insightsEditorialResolvers } from '../insights-shared/editorial-resolvers'

export { parsePrintedNumber } from '../../bar-figure'

export const insightsDeckResolvers: ResolverRegistry = {
  /** Resolvers editoriales compartidos (TASK-1889): canal, ordinal, número, puntos, semanas, cierre. */
  ...insightsEditorialResolvers('deck'),
  /** Tono de un bloque de la lectura: `focus` lleva el filete teal (el bloque que carga el argumento). */
  'deck-block-tone': {
    known: ['default', 'focus'],
    build: value =>
      value === 'focus' || value === 'default'
        ? [{ selector: ':self', toneClass: `block--${value}`, toneGroup: ['block--default', 'block--focus'] }]
        : null
  },

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

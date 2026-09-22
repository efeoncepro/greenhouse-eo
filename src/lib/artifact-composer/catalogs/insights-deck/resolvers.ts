/**
 * Resolvers del catálogo `insights-deck`.
 *
 * La geometría y la guarda de coherencia barra↔etiqueta salen del motor (`bar-figure` sobre
 * `chart-geometry`), domain-free y compartidas con el informe A4: la misma cifra no puede pasar en
 * una lámina y fallar en una hoja.
 */

import type { ResolverRegistry } from '../../resolver-contract'
import { buildBarFigureEffects } from '../../bar-figure'

export { parsePrintedNumber } from '../../bar-figure'

export const insightsDeckResolvers: ResolverRegistry = {
  /** El largo de cada barra sale del dato, recalculado. Una barra escrita a mano es fabricación. */
  'insights-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => buildBarFigureEffects('insights-bar-geometry', ctx.slots.figureSeries, ctx.item)
  }
}

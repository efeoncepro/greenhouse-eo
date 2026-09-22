/**
 * Resolvers del catálogo `insights-report` — semántica → presentación.
 *
 * La GEOMETRÍA y la guarda de coherencia barra↔etiqueta no se calculan acá: salen del motor
 * (`bar-figure` sobre `chart-geometry`), domain-free y compartidos con el deck. Este módulo sólo
 * declara qué resolver usa cada slot del catálogo.
 */

import type { ResolverRegistry } from '../../resolver-contract'
import { buildBarFigureEffects } from '../../bar-figure'

export { parsePrintedNumber, roundingToleranceOf } from '../../bar-figure'

export const insightsReportResolvers: ResolverRegistry = {
  /**
   * `report-bar-geometry` — el largo de cada barra sale de su valor, recalculado desde el dato. Si la
   * etiqueta impresa no representa el valor que dibuja la barra, el render falla: una barra cuyo
   * ancho no sale del dato es fabricación gráfica.
   */
  'report-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => buildBarFigureEffects('report-bar-geometry', ctx.slots.figureSeries, ctx.item)
  }
}

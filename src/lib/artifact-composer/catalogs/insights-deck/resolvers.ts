/**
 * Resolvers del catálogo `insights-deck`.
 *
 * La geometría y la guarda de coherencia barra↔etiqueta salen del motor (`bar-figure` sobre
 * `chart-geometry`), domain-free y compartidas con el informe A4: la misma cifra no puede pasar en
 * una lámina y fallar en una hoja.
 */

import type { ResolverRegistry } from '../../resolver-contract'
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
}

/**
 * Resolvers del catálogo `insights-report` — semántica → presentación.
 *
 * La GEOMETRÍA y la guarda de coherencia barra↔etiqueta no se calculan acá: salen del motor
 * (`bar-figure` sobre `chart-geometry`), domain-free y compartidos con el deck. Este módulo sólo
 * declara qué resolver usa cada slot del catálogo.
 */

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import { parsePrintedNumber } from '../../bar-figure'
import { insightsEditorialResolvers } from '../insights-shared/editorial-resolvers'

export { parsePrintedNumber, roundingToleranceOf } from '../../bar-figure'

/**
 * Barra de cada fila de la tabla de respaldo (TASK-1889). SALE DEL DATO: lee el número impreso de
 * `valueA` y lo escala contra `barScaleMax` —el máximo de la tabla COMPLETA, que pasa el mapper— o,
 * sin él, contra el máximo de la página. La fila que alcanza el máximo es la líder (banda navy): se
 * decide por el dato, no por la posición. Una fila sin número legible o negativa queda sin barra;
 * nunca se dibuja una barra que el dato no sostiene.
 */
export const tableBarEffects = (item: Record<string, unknown>, slots: Record<string, unknown>): FieldEffect[] => {
  const value = parsePrintedNumber(item.valueA)
  const rows = Array.isArray(slots.tableRows) ? (slots.tableRows as Record<string, unknown>[]) : []

  // Filas en unidades distintas (clics, CTR, posición): una escala común las mentiría; no hay barra.
  if (slots.barMode === 'none') return [{ selector: ':field', remove: true }]

  const declared = parsePrintedNumber(slots.barScaleMax)
  const pageMax = Math.max(0, ...rows.map(row => parsePrintedNumber(row.valueA) ?? 0))
  const max = declared !== null && declared > 0 ? declared : pageMax

  if (value === null || value < 0 || max <= 0) return [{ selector: ':field', remove: true }]

  const pct = Math.min(100, (value / max) * 100)

  // El valor impreso va al FINAL de la barra (gramática de la evidencia aprobada): la barra ocupa su
  // fracción de la celda descontando el lugar de la cifra (64 px + 10 px de aire).
  const effects: FieldEffect[] = [
    { selector: '.row-bar', styleProp: 'width', styleValue: `calc((100% - 74px) * ${(pct / 100).toFixed(4)})` }
  ]

  if (value === max) effects.push({ selector: ':self', toneClass: 'row--lead', toneGroup: ['row--lead'] })

  return effects
}

/**
 * Ranking de la fila en la tabla COMPLETA: `rankOffset` (lo pasa el mapper) + posición en la página.
 * Sin él, una tabla que continúa volvería a empezar en 01.
 */
export const tableRankEffects = (index: number, slots: Record<string, unknown>): FieldEffect[] => {
  const offset = Number(slots.rankOffset ?? 0)
  const rank = (Number.isFinite(offset) ? offset : 0) + index + 1
  const effects: FieldEffect[] = [{ selector: ':field', asText: true, value: String(rank).padStart(2, '0') }]

  return effects
}

export const insightsReportResolvers: ResolverRegistry = {
  /** Resolvers editoriales compartidos (TASK-1889): canal, ordinal, número, puntos, semanas, cierre. */
  ...insightsEditorialResolvers('report'),
  'report-table-rank': {
    known: ['<derivado de rankOffset y la posición>'],
    build: (_value, ctx) => tableRankEffects(ctx.index, ctx.slots)
  },
  /** Dirección de la variación de una fila (sin dato ⇒ neutra, sin triángulo). */
  'report-row-trend': {
    known: ['up', 'down', 'flat'],
    build: (value): FieldEffect[] => {
      const direction = value === 'up' || value === 'down' ? value : 'flat'

      return [
        { selector: ':field', toneClass: `delta--${direction}`, toneGroup: ['delta--up', 'delta--down', 'delta--flat'] },
        ...(direction === 'up' ? [] : [{ selector: '.delta-mark-up', remove: true as const }]),
        ...(direction === 'down' ? [] : [{ selector: '.delta-mark-down', remove: true as const }])
      ]
    }
  },
  'report-table-bar': {
    known: ['<derivado de valueA y barScaleMax>'],
    build: (_value, ctx) => tableBarEffects(ctx.item, ctx.slots)
  },

}

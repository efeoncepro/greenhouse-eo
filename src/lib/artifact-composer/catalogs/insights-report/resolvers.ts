/**
 * Resolvers del catálogo `insights-report` — semántica → presentación.
 *
 * La GEOMETRÍA no se calcula acá: sale de `chart-geometry` en el motor, que es domain-free y la
 * comparte con cualquier otro catálogo. Este módulo sólo decide PRESENTACIÓN (tono, énfasis,
 * dónde va cada efecto). Esa es la frontera: el cálculo es único, la puesta en página es del
 * catálogo.
 */

import type { FieldEffect, ResolverRegistry } from '../../resolver-contract'
import { barGeometry, type GeometrySeries } from '../../chart-geometry'

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  return null
}

/**
 * Lee el número que hay DETRÁS de una etiqueta formateada: `"+61,4%"` → `61.4`.
 *
 * Existe porque la guarda de coherencia no puede depender de que la etiqueta sea un número pelado.
 * Un informe escribe "+61,4%", no "61.4" — y si el parser no entendiera ese formato, la guarda se
 * apagaría sola y el gráfico podría contradecir a su etiqueta sin que nada fallara.
 *
 * Formato es-CL estricto: la coma es el decimal y el punto separa miles. El signo y el sufijo de
 * unidad se descartan. Lo que no se puede leer devuelve `null`, y el resolver lo trata como error.
 */
export const parsePrintedNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const cleaned = value
    .trim()
    .replace(/[+\s]/g, '')
    .replace(/[^\d.,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  if (cleaned === '' || cleaned === '-') return null

  const parsed = Number(cleaned)

  return Number.isFinite(parsed) ? parsed : null
}

export const insightsReportResolvers: ResolverRegistry = {
  /**
   * `report-bar-geometry` — el largo de cada barra sale de su valor, recalculado desde el dato.
   *
   * La guarda que importa es la de coherencia: si la etiqueta impresa no representa el valor que
   * dibuja la barra, el gráfico miente y el render falla. Una barra cuyo ancho no sale del dato no
   * es un defecto de layout: es fabricación gráfica.
   */
  'report-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => {
      const rows = Array.isArray(ctx.slots.figureSeries)
        ? (ctx.slots.figureSeries as Record<string, unknown>[])
        : []

      if (rows.length === 0) return null

      const series: GeometrySeries[] = [
        {
          seriesId: 'figure',
          label: 'figure',
          values: rows.map(row => toNumber(row.valuePct))
        }
      ]

      const own = toNumber(ctx.item.valuePct)
      const printed = parsePrintedNumber(ctx.item.printedValue)

      if (own === null) {
        throw new Error(
          'report-bar-geometry requiere valuePct numérico en cada fila: no se dibuja una barra sin dato.'
        )
      }

      // Una etiqueta ilegible NO desactiva la guarda: la convierte en error. Si el parser no
      // entiende lo impreso, nadie puede afirmar que la barra y el texto dicen lo mismo.
      if (printed === null) {
        throw new Error(
          `report-bar-geometry no pudo leer el número de la etiqueta "${String(ctx.item.printedValue)}". ` +
            'Sin poder leerla, la coherencia entre la barra y su texto no se puede verificar — y una barra ' +
            'cuyo ancho no se puede contrastar con su etiqueta es fabricación gráfica.'
        )
      }

      if (Math.abs(printed - own) > 0.001) {
        throw new Error(
          `report-bar-geometry detectó una etiqueta inconsistente: "${String(ctx.item.printedValue)}" ` +
            `no representa valuePct=${own}. La etiqueta y la barra deben afirmar el mismo dato.`
        )
      }

      // El cálculo vive en el motor: mismo reparto de largo para todo catálogo que dibuje barras.
      const bars = barGeometry(series, rows.length)
      const index = rows.findIndex(row => row === ctx.item)
      const bar = bars.find(b => b.dimensionIndex === index)

      if (!bar) return [{ selector: '.fill', remove: true }]

      const emphasis = ctx.item.emphasis === 'lead' ? 'lead' : 'rest'

      const effects: FieldEffect[] = [
        { selector: '.fill', toneClass: emphasis, toneGroup: ['lead', 'rest'] },
        { selector: '.fill', styleProp: 'width', styleValue: `${bar.lengthPct}%` }
      ]

      return effects
    }
  }
}

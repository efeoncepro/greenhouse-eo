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

/**
 * `valuePct` se declara `number` en el contrato, pero puede llegar como TEXTO: el payload sintético
 * del gate visual entrega los campos de geometría como string. Aceptar un número expresado como
 * texto no relaja la guarda —sigue rechazando cualquier cosa que no sea un número— y evita que el
 * catálogo dependa de que el probe adivine su forma.
 */
const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'))

    return Number.isFinite(parsed) ? parsed : null
  }

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

/**
 * Cuánto puede separarse una etiqueta del valor exacto por puro redondeo: media unidad del último
 * decimal impreso. `"1,9 %"` representa honestamente 1,88 (tolera 0,05); `"2"` representa 1,88 (tolera
 * 0,5); `"3"` no. La guarda compara con esta tolerancia, no con igualdad exacta: exigir igualdad
 * rechazaba toda etiqueta redondeada, que es TODA etiqueta bien formateada (lo encontró el canary con
 * el CTR real de un cliente). No es una relajación: una etiqueta que dice otra cifra sigue fallando.
 */
export const roundingToleranceOf = (printed: unknown): number => {
  if (typeof printed !== 'string') return 1e-9

  const decimals = printed.match(/,(\d+)/)?.[1]?.length ?? 0

  return 0.5 * 10 ** -decimals + 1e-9
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
      const allRows = Array.isArray(ctx.slots.figureSeries)
        ? (ctx.slots.figureSeries as Record<string, unknown>[])
        : []

      if (allRows.length === 0) return null

      // `scaleGroup` (opcional) acota la escala: cada grupo mide sus barras contra su propio máximo. Sirve
      // a la comparación de períodos, donde cada par (período vs anterior) se compara consigo mismo — en
      // una escala compartida, 9 mil clics junto a 488 mil impresiones quedan como una raya. Sin grupo, la
      // escala es la de toda la figura.
      const group = ctx.item.scaleGroup ?? null
      const rows = allRows.filter(row => (row.scaleGroup ?? null) === group)

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

      if (Math.abs(printed - own) > roundingToleranceOf(ctx.item.printedValue)) {
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
        // Tono con espacio de nombres propio: `lead`/`rest` a secas chocaban con clases tipográficas del
        // molde (`.lead` del párrafo introductorio le ponía margen a la barra y la sacaba de su riel).
        { selector: '.fill', toneClass: `tone-${emphasis}`, toneGroup: ['tone-lead', 'tone-rest'] },
        { selector: '.fill', styleProp: 'width', styleValue: `${bar.lengthPct}%` }
      ]

      return effects
    }
  }
}

/**
 * Resolvers del catálogo `insights-deck`.
 *
 * La geometría sale del motor (`chart-geometry`), domain-free y compartida con el informe A4. Acá
 * sólo se decide presentación: tono, énfasis y dónde aplica cada efecto.
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

/** Igual criterio que el informe: es-CL, coma decimal, signo y sufijo descartados. */
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

export const insightsDeckResolvers: ResolverRegistry = {
  /** El largo de cada barra sale del dato, recalculado. Una barra escrita a mano es fabricación. */
  'insights-bar-geometry': {
    known: ['<derivado de value/valuePct>'],
    build: (_value, ctx) => {
      const rows = Array.isArray(ctx.slots.figureSeries)
        ? (ctx.slots.figureSeries as Record<string, unknown>[])
        : []

      if (rows.length === 0) return null

      const own = toNumber(ctx.item.valuePct)
      const printed = parsePrintedNumber(ctx.item.printedValue)

      if (own === null) {
        throw new Error('insights-bar-geometry requiere valuePct numérico: no se dibuja una barra sin dato.')
      }

      if (printed === null) {
        throw new Error(
          `insights-bar-geometry no pudo leer el número de la etiqueta "${String(ctx.item.printedValue)}". ` +
            'Sin poder leerla, la coherencia entre la barra y su texto no se puede verificar.'
        )
      }

      if (Math.abs(printed - own) > 0.001) {
        throw new Error(
          `insights-bar-geometry detectó una etiqueta inconsistente: "${String(ctx.item.printedValue)}" ` +
            `no representa valuePct=${own}.`
        )
      }

      const series: GeometrySeries[] = [
        { seriesId: 'figure', label: 'figure', values: rows.map(row => toNumber(row.valuePct)) }
      ]

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

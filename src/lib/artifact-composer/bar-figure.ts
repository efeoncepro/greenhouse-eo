/**
 * Figura de barras — resolución domain-free compartida por todo catálogo que dibuje barras desde datos
 * (hoy `insights-report` e `insights-deck`).
 *
 * Existe para que la guarda de coherencia barra↔etiqueta sea UNA sola. Vivía copiada en cada catálogo
 * y las copias ya habían divergido (sólo una aceptaba etiquetas redondeadas): un deck y un informe de
 * la misma edición podían aceptar y rechazar la misma cifra.
 *
 * Contrato de la fila (`figureSeries[]`): `printedValue` (lo que se lee), `valuePct` (el dato, no
 * negativo), `emphasis` (`lead`|`rest`) y, opcional, `scaleGroup`: las filas de un mismo grupo se miden
 * contra su propio máximo.
 */

import { barGeometry, type GeometrySeries } from './chart-geometry'
import type { FieldEffect } from './resolver-contract'

/**
 * `valuePct` se declara `number`, pero puede llegar como TEXTO: el payload sintético del gate visual
 * entrega los campos de geometría como string. Aceptarlo no relaja la guarda — sigue rechazando todo lo
 * que no sea un número.
 */
export const toFigureNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(',', '.'))

    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

/**
 * Lee el número que hay DETRÁS de una etiqueta formateada: `"+61,4%"` → `61.4`. Formato es-CL estricto:
 * la coma es el decimal y el punto separa miles; signo y sufijo se descartan. Lo ilegible devuelve
 * `null`, y la resolución lo trata como error: una guarda que no puede leer no puede verificar.
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
 * decimal impreso. `"1,9 %"` representa 1,88 (tolera 0,05); `"2"` representa 1,88 (tolera 0,5); `"3"`
 * no. Exigir igualdad exacta rechazaba toda etiqueta bien redondeada (canary con el CTR real de un
 * cliente, 2026-09-22). No es una relajación: una etiqueta que dice otra cifra sigue fallando.
 */
export const roundingToleranceOf = (printed: unknown): number => {
  if (typeof printed !== 'string') return 1e-9

  const decimals = printed.match(/,(\d+)/)?.[1]?.length ?? 0

  return 0.5 * 10 ** -decimals + 1e-9
}

/**
 * Efectos de una fila de figura: verifica que la etiqueta represente el dato, calcula el largo de la
 * barra con la geometría del motor (dentro de su `scaleGroup`) y aplica el tono. `resolverName`
 * encabeza los errores para que la causa diga qué catálogo la detectó.
 */
export const buildBarFigureEffects = (
  resolverName: string,
  figureRows: unknown,
  item: Record<string, unknown>
): FieldEffect[] | null => {
  const allRows = Array.isArray(figureRows) ? (figureRows as Record<string, unknown>[]) : []

  if (allRows.length === 0) return null

  // Sin grupo, la escala es la de toda la figura. Con grupo, cada uno mide contra su propio máximo: en
  // una comparación de períodos, 9 mil clics junto a 488 mil impresiones quedarían como una raya.
  const group = item.scaleGroup ?? null
  const rows = allRows.filter(row => (row.scaleGroup ?? null) === group)
  const own = toFigureNumber(item.valuePct)
  const printed = parsePrintedNumber(item.printedValue)

  if (own === null) {
    throw new Error(`${resolverName} requiere valuePct numérico en cada fila: no se dibuja una barra sin dato.`)
  }

  if (printed === null) {
    throw new Error(
      `${resolverName} no pudo leer el número de la etiqueta "${String(item.printedValue)}". ` +
        'Sin poder leerla, la coherencia entre la barra y su texto no se puede verificar — y una barra ' +
        'cuyo ancho no se puede contrastar con su etiqueta es fabricación gráfica.'
    )
  }

  if (Math.abs(printed - own) > roundingToleranceOf(item.printedValue)) {
    throw new Error(
      `${resolverName} detectó una etiqueta inconsistente: "${String(item.printedValue)}" ` +
        `no representa valuePct=${own}. La etiqueta y la barra deben afirmar el mismo dato.`
    )
  }

  const series: GeometrySeries[] = [{ seriesId: 'figure', label: 'figure', values: rows.map(row => toFigureNumber(row.valuePct)) }]
  const bar = barGeometry(series, rows.length).find(b => b.dimensionIndex === rows.indexOf(item))

  if (!bar) return [{ selector: '.fill', remove: true }]

  const emphasis = item.emphasis === 'lead' ? 'lead' : 'rest'

  return [
    // Tono con espacio de nombres propio: `lead`/`rest` a secas chocaban con clases tipográficas del
    // molde (`.lead` del párrafo introductorio le ponía margen a la barra y la sacaba de su riel).
    { selector: '.fill', toneClass: `tone-${emphasis}`, toneGroup: ['tone-lead', 'tone-rest'] },
    { selector: '.fill', styleProp: 'width', styleValue: `${bar.lengthPct}%` }
  ]
}

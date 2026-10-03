/**
 * TASK-1975 — figura «waffle» de los catálogos premium de Insights (A4 `Premium-Waffle` y deck `Deck-Waffle`).
 *
 * Un cuadro es UNA unidad (criterio de selección §5): la retícula sale de `waffleUnitGeometry` del motor con las
 * cuentas IMPRESAS en la leyenda (`parsePrintedNumber`), así figura y cifra no pueden decir cosas distintas. Hasta 30
 * unidades, 5 columnas; de 31 a 100, 10; llenado fila por fila en el orden de las partes. Una cuenta ilegible, no
 * entera, un total vacío o de más de cien unidades fallan cerrado: un cuadro inventado es fabricación gráfica.
 *
 * El color no vive acá: cada cuadro lleva una clase de tono (`waffle-tone--*`) y la plantilla la pinta con los roles
 * del brand pack. El tono sale del ROL declarado de la parte (oportunidad, ausencia) y, sin rol, del orden:
 * actual → oportunidad → anterior → paso. La ausencia va rayada y siempre al final; nunca se usa para otra parte.
 *
 * La leyenda (nombre, marca y cuenta) la pinta el motor desde el slot `waffleParts`; el hook sólo le pone a cada fila
 * su tono, dibuja la retícula en `.fig-waffle-host` y elige el cuerpo de la cifra principal por su largo.
 */

import { parsePrintedNumber } from '../../bar-figure'
import type { CatalogLayoutHook } from '../../catalog'
import { ChartGeometryError, waffleUnitGeometry } from '../../chart-geometry'

import { FigureDataError } from './figure-svg'

export type WaffleRole = 'opportunity' | 'absence'

export type WaffleTone = 'current' | 'opportunity' | 'prior' | 'step' | 'absence'

export interface WafflePartInput {
  label: string
  /** La cuenta impresa en la leyenda («26»): es el hecho y de ella sale la cantidad de cuadros. */
  count: string
  role?: WaffleRole
  /** Marca de la fila («Oportunidad»); la pinta el motor, no participa de la geometría. */
  tag?: string
}

export interface WaffleBox {
  /** Lado de la retícula en px: 10 columnas de 22 + 9 separaciones de 4 = 256 en A4 (canvas). */
  width: number
  height: number
  /** Separación entre cuadros y radio de sus esquinas (canvas: 4 y 3). */
  gap: number
  radius: number
  /** Techo del cuadro cuando hay pocas unidades: 8 cuadros no se inflan hasta llenar la retícula. */
  maxCell: number
  /** La cifra principal más larga que este cuerpo admite; desde el siguiente carácter, la clase del cuerpo largo. */
  keyFigure: { selector: string; longClass: string; maxChars: number }
}

/** A4: retícula de 256 px (10 × 22 + 9 × 4); «74 de 100» baja de 76 a 64 px como en el canvas. */
export const REPORT_WAFFLE_BOX: WaffleBox = {
  width: 256,
  height: 256,
  gap: 4,
  radius: 3,
  maxCell: 40,
  keyFigure: { selector: '.figure-number', longClass: 'figure-number--long', maxChars: 7 }
}

/** Deck: retícula de 246 px (10 × 21 + 9 × 4); «74 de 100» va a 78 px como en el canvas. */
export const DECK_WAFFLE_BOX: WaffleBox = {
  width: 246,
  height: 246,
  gap: 4,
  radius: 3,
  maxCell: 40,
  keyFigure: { selector: '.fig-number', longClass: 'fig-number--long', maxChars: 7 }
}

const WAFFLE_MIN_PARTS = 2
const WAFFLE_MAX_PARTS = 4

/** Orden de los tonos sin rol (canvas): actual, oportunidad, anterior y, si hay cuarta parte, paso. */
const ORDER_TONES: readonly WaffleTone[] = ['current', 'opportunity', 'prior', 'step']

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Tono de cada parte. Con una parte de oportunidad declarada, el coral es sólo suyo y las demás siguen actual →
 * anterior → paso. A lo más una oportunidad y una ausencia, y la ausencia es la última: si no, falla cerrado.
 */
export const waffleTones = (parts: readonly WafflePartInput[]): WaffleTone[] => {
  if (parts.length < WAFFLE_MIN_PARTS || parts.length > WAFFLE_MAX_PARTS) {
    throw new FigureDataError(`Un waffle lleva de ${WAFFLE_MIN_PARTS} a ${WAFFLE_MAX_PARTS} partes; llegaron ${parts.length}.`)
  }

  const opportunities = parts.filter(part => part.role === 'opportunity').length
  const absences = parts.filter(part => part.role === 'absence').length

  if (opportunities > 1) throw new FigureDataError('Un waffle marca a lo más una parte como oportunidad.')
  if (absences > 1) throw new FigureDataError('Un waffle tiene a lo más una parte de ausencia.')

  if (absences === 1 && parts.at(-1)?.role !== 'absence') {
    throw new FigureDataError('La parte de ausencia va siempre al final del waffle: se lee como lo que falta.')
  }

  const sequence = opportunities === 1 ? ORDER_TONES.filter(tone => tone !== 'opportunity') : ORDER_TONES
  let next = 0

  return parts.map(part => {
    if (part.role === 'absence') return 'absence'
    if (part.role === 'opportunity') return 'opportunity'

    return sequence[next++]!
  })
}

/** La cuenta impresa como entero; si no se lee o no es una unidad entera, falla cerrado. */
const countOf = (part: WafflePartInput): number => {
  const value = parsePrintedNumber(part.count)

  if (value === null || !Number.isInteger(value) || value < 0) {
    throw new FigureDataError(`La parte «${part.label}» imprime «${part.count}», que no es una cuenta de unidades.`)
  }

  return value
}

export interface WaffleFigure {
  svg: string
  tones: WaffleTone[]
  columns: number
  rows: number
  cell: number
}

/**
 * Marcado SVG de la retícula. El cuadro es el mayor que deja entrar todas las filas y columnas en el lado de la
 * caja, con techo `maxCell`, redondeado hacia abajo a píxel entero (100 unidades en A4 = 22 px, como el canvas).
 */
export const waffleSvg = (parts: readonly WafflePartInput[], box: WaffleBox, options: { ariaLabel: string }): WaffleFigure => {
  const tones = waffleTones(parts)
  const counts = parts.map(countOf)

  let geometry

  try {
    geometry = waffleUnitGeometry(counts.map((value, index) => ({ seriesId: String(index), value })))
  } catch (error) {
    if (error instanceof ChartGeometryError) throw new FigureDataError(`El waffle no se puede dibujar: ${error.message}.`)

    throw error
  }

  const { columns, rows, cells } = geometry

  const cell = Math.floor(
    Math.min((box.width - (columns - 1) * box.gap) / columns, (box.height - (rows - 1) * box.gap) / rows, box.maxCell)
  )

  const width = columns * cell + (columns - 1) * box.gap
  const height = rows * cell + (rows - 1) * box.gap
  const step = cell + box.gap
  const hasAbsence = tones.includes('absence')

  const out: string[] = [
    `<svg class="fig-waffle" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(options.ariaLabel)}">`
  ]

  // La ausencia se dice con rayado, no con un tono más: el patrón se pinta con los roles de ausencia.
  if (hasAbsence) {
    out.push(
      '<defs><pattern id="waffleAbsence" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
        '<rect class="waffle-absence-ground" width="7" height="7"></rect>' +
        '<line class="waffle-absence-line" x1="0" y1="0" x2="0" y2="7" stroke-width="2"></line>' +
        '</pattern></defs>'
    )
  }

  for (const unit of cells) {
    const tone = tones[Number(unit.seriesId)]!
    const x = (unit.index % columns) * step
    const y = Math.floor(unit.index / columns) * step
    const fill = tone === 'absence' ? ' fill="url(#waffleAbsence)"' : ''

    out.push(`<rect class="waffle-cell waffle-tone--${tone}" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${box.radius}"${fill}></rect>`)
  }

  out.push('</svg>')

  return { svg: out.join(''), tones, columns, rows, cell }
}

/** Resumen accesible: título y cada parte con su cuenta (el SVG no se lee como texto). */
export const waffleAria = (title: string, parts: readonly WafflePartInput[]): string =>
  `${title}. ${parts.map(part => `${part.label}: ${part.count}.`).join(' ')}`

/** ¿La cifra principal pide el cuerpo largo? Por largo en caracteres, nunca por elección del autor. */
export const waffleKeyFigureIsLong = (text: string, box: WaffleBox): boolean => [...text.trim()].length > box.keyFigure.maxChars

export const makeWaffleHook =
  (box: WaffleBox): CatalogLayoutHook =>
  async (page, slide) => {
    const parts = (slide.slots.waffleParts ?? []) as unknown as WafflePartInput[]
    const title = String(slide.slots.figureTitle ?? '')
    const figure = waffleSvg(parts, box, { ariaLabel: waffleAria(title, parts) })
    const longFigure = waffleKeyFigureIsLong(String(slide.slots.keyFigure ?? ''), box)

    await page.evaluate(
      ({ svg, tones, keyFigure, long }) => {
        const host = document.querySelector('.fig-waffle-host')

        if (!host) throw new Error('Waffle: falta el nodo .fig-waffle-host en la plantilla.')

        host.innerHTML = svg

        const rows = Array.from(document.querySelectorAll('.waffle-legend > .waffle-row'))

        if (rows.length !== tones.length) {
          throw new Error(`Waffle: la leyenda tiene ${rows.length} filas y la figura ${tones.length} partes.`)
        }

        rows.forEach((row, index) => row.classList.add(`waffle-tone--${tones[index]}`))

        if (long) document.querySelector(keyFigure.selector)?.classList.add(keyFigure.longClass)
      },
      { svg: figure.svg, tones: figure.tones, keyFigure: box.keyFigure, long: longFigure }
    )
  }

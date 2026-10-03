/**
 * TASK-1975 — figura «dona» de los catálogos premium de Insights (A4 y deck), canvas `Premium-Donut` y `Deck-Donut`.
 *
 * Composición de 2 o 3 partes de un mismo total: anillo a la izquierda (lo dibuja el hook) y una fila por parte a la
 * derecha (la llena el motor desde el slot `donutParts`). La porción sale de la CUENTA impresa en su fila
 * (`parsePrintedNumber`) con la geometría del motor (`sliceGeometry`, `MAX_SLICES = 3`), así anillo y fila no pueden
 * decir cosas distintas; la participación impresa se verifica contra la cuenta. Nunca una sola porción ni más de tres:
 * con una no hay composición que leer y con más el ángulo se estima mal. Todo lo ilegible falla cerrado.
 *
 * El color no vive acá: el SVG sólo lleva clases (`fig-donut-*`) y cada plantilla las pinta con sus roles. El tono de
 * cada parte sale de su rol declarado (`opportunity`, `absence`) o, sin rol, del orden actual → oportunidad → anterior.
 */

import type { CatalogLayoutHook } from '../../catalog'
import { parsePrintedNumber } from '../../bar-figure'
import { ChartGeometryError, MAX_SLICES, sliceGeometry } from '../../chart-geometry'
import { FigureDataError, wrapLabel } from './figure-svg'

/** Íconos de trazo de las filas de la dona (los del canvas): enlace, cita y «no aparece». */
export const DONUT_PART_ICONS = ['link', 'quote', 'eye-off'] as const

export type DonutPartIcon = (typeof DONUT_PART_ICONS)[number]

export type DonutRole = 'opportunity' | 'absence'

export type DonutTone = 'current' | 'opportunity' | 'prior' | 'absence'

export interface DonutPartInput {
  label: string
  /** Cuenta impresa de la parte (la misma que se lee en su fila). */
  count: string
  /** Participación impresa («38 %»): restos mayores, suma 100. */
  share: string
  /** Marca de la fila («Oportunidad»); la pinta el motor, independiente del rol. */
  tag?: string
  role?: DonutRole
  icon?: DonutPartIcon
}

export interface DonutCenterInput {
  value: string
  label: string
}

export interface DonutBox {
  /** Tamaño en que se muestra el anillo (px); el dibujo vive en un viewBox cuadrado de `view`. */
  width: number
  height: number
  view: number
  /** Radios exterior e interior del anillo y separación entre porciones (px del viewBox, medida en el borde interior). */
  outer: number
  inner: number
  gap: number
  /** Filete tenue dentro del hueco (A4); `null` = sin filete (deck). */
  hole: number | null
  fonts: { value: number; label: number }
  /** Línea base de la cifra y del rótulo del centro, e interlínea del rótulo si parte en dos. */
  valueY: number
  labelY: number
  labelLine: number
}

/** Caja del informe A4 (canvas `Premium-Donut`): anillo de 276 px. */
export const REPORT_DONUT_BOX: DonutBox = {
  width: 276,
  height: 276,
  view: 300,
  outer: 140,
  inner: 94,
  gap: 2,
  hole: 84,
  fonts: { value: 44, label: 12 },
  valueY: 154,
  labelY: 178,
  labelLine: 14
}

/** Caja de la lámina 16:9 (canvas `Deck-Donut`): anillo de 252 px, cuerpos del centro mayores. */
export const DECK_DONUT_BOX: DonutBox = {
  width: 252,
  height: 252,
  view: 300,
  outer: 140,
  inner: 94,
  gap: 2,
  hole: null,
  fonts: { value: 46, label: 14 },
  valueY: 156,
  labelY: 182,
  labelLine: 16
}

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Coordenada con un decimal, como el SVG del canvas (`151.5 10.0`). */
const c1 = (value: number): string => value.toFixed(1)

/**
 * Tono de cada parte. Un rol declarado manda; las partes sin rol toman, en orden, los tonos que ningún rol ocupó
 * (actual → oportunidad → anterior). Dos oportunidades o dos ausencias no se distinguen: falla cerrado. Una dona sólo
 * de ausencia no dice nada.
 */
export const donutTones = (parts: readonly Pick<DonutPartInput, 'role' | 'label'>[]): DonutTone[] => {
  for (const role of ['opportunity', 'absence'] as const) {
    if (parts.filter(part => part.role === role).length > 1) {
      throw new FigureDataError(`La dona trae más de una parte con rol «${role}»: no se distinguirían.`)
    }
  }

  if (parts.some(part => part.role !== undefined && part.role !== 'opportunity' && part.role !== 'absence')) {
    throw new FigureDataError('Una parte de la dona trae un rol desconocido.')
  }

  if (parts.every(part => part.role === 'absence')) throw new FigureDataError('Una dona sólo de ausencia no tiene composición que leer.')

  const taken = new Set(parts.map(part => part.role).filter(Boolean))
  const free = (['current', 'opportunity', 'prior'] as const).filter(tone => !taken.has(tone as DonutRole))
  let next = 0

  return parts.map(part => part.role ?? free[next++]!)
}

interface DonutSlice {
  tone: DonutTone
  path: string | null
}

/**
 * Porciones del anillo desde las cuentas impresas. Cada porción se recorta a cada lado por media separación (angular,
 * medida en el borde interior: `gap` px entre porciones). Una parte en cero no se dibuja (su fila sí queda).
 */
export const donutSlices = (parts: readonly DonutPartInput[], box: DonutBox): DonutSlice[] => {
  if (parts.length < 2 || parts.length > MAX_SLICES) {
    throw new FigureDataError(`Una dona lleva de 2 a ${MAX_SLICES} partes; llegaron ${parts.length}.`)
  }

  const counts = parts.map(part => parsePrintedNumber(part.count))

  counts.forEach((count, index) => {
    if (count === null || count < 0) throw new FigureDataError(`La cuenta «${parts[index]!.count}» de «${parts[index]!.label}» no se puede dibujar.`)
  })

  let geometry

  try {
    geometry = sliceGeometry(parts.map((part, index) => ({ seriesId: String(index), label: part.label, value: counts[index]! })))
  } catch (error) {
    if (error instanceof ChartGeometryError) throw new FigureDataError(`La dona no se puede dibujar: ${error.message}.`)
    throw error
  }

  const total = counts.reduce<number>((sum, count) => sum + count!, 0)

  // La participación impresa es derivada (restos mayores): nunca se aleja un punto entero de la cuenta. Una parte que
  // redondea a 0 se imprime «<1 %» (TASK-1975): vale 0 en la suma y exige una cuenta mayor que 0 y menor que el 1 %.
  const printedShareOf = (share: string): number | null => (/^<\s*1(\s|%|$)/.test(share.trim()) ? 0 : parsePrintedNumber(share))

  parts.forEach((part, index) => {
    const printed = printedShareOf(part.share)
    const exact = (counts[index]! / total) * 100
    const underOne = /^</.test(part.share.trim())

    if (printed === null || Math.abs(printed - exact) >= 1 || (underOne && !(exact > 0 && exact < 1))) {
      throw new FigureDataError(`La participación «${part.share}» de «${part.label}» no corresponde a su cuenta (${part.count} de ${total}).`)
    }
  })

  const printedSum = parts.reduce((sum, part) => sum + printedShareOf(part.share)!, 0)

  if (Math.round(printedSum) !== 100) throw new FigureDataError(`Las participaciones de la dona suman ${printedSum}, no 100.`)

  const tones = donutTones(parts)
  const center = box.view / 2
  const halfGap = (box.gap / 2 / box.inner) * (180 / Math.PI)

  const at = (radius: number, deg: number): string => {
    const rad = (deg * Math.PI) / 180

    return `${c1(center + radius * Math.sin(rad))} ${c1(center - radius * Math.cos(rad))}`
  }

  // `sliceGeometry` valida (máximo, negativos, total) y ordena; el ángulo se toma exacto de la cuenta, sin el
  // redondeo a 0,1° del motor, para que el borde caiga donde lo dibuja el canvas aprobado.
  let cursor = 0

  return geometry.map((_slice, index) => {
    const sweep = (counts[index]! / total) * 360
    const from = cursor + halfGap
    const to = cursor + sweep - halfGap

    cursor += sweep

    if (counts[index] === 0 || to <= from) return { tone: tones[index]!, path: null }

    const large = to - from > 180 ? 1 : 0
    const { outer, inner } = box

    return {
      tone: tones[index]!,
      path: `M ${at(outer, from)} A ${outer} ${outer} 0 ${large} 1 ${at(outer, to)} L ${at(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${at(inner, from)} Z`
    }
  })
}

/** Resumen accesible: título y, por parte, su cuenta y participación (el SVG no se lee como texto). */
export const donutAria = (title: string, parts: readonly DonutPartInput[]): string =>
  `${title}. ${parts.map(part => `${part.label}: ${part.count} (${part.share}).`).join(' ')}`

/** Marcado del anillo con su centro (cifra + rótulo, que parte en a lo más dos líneas). */
export const donutSvg = (parts: readonly DonutPartInput[], center: DonutCenterInput, box: DonutBox, options: { ariaLabel: string }): string => {
  const slices = donutSlices(parts, box)
  const value = String(center?.value ?? '').trim()
  const label = String(center?.label ?? '').trim()

  if (!value || !label) throw new FigureDataError('El centro de la dona necesita cifra y rótulo.')

  // El rótulo cabe en el hueco (80 % del diámetro interior) en a lo más dos líneas; si no, falla cerrado.
  const lines = wrapLabel(label, box.inner * 2 * 0.8, box.fonts.label)

  if (lines.length > 2) throw new FigureDataError(`El rótulo del centro «${label}» no cabe en dos líneas.`)

  const lift = (lines.length - 1) * (box.labelLine / 2)
  const mid = box.view / 2
  const hasAbsence = slices.some(slice => slice.tone === 'absence')

  const pattern = hasAbsence
    ? `<defs><pattern id="donutAbsence" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect class="fig-donut-hatch-fill" width="7" height="7"></rect><line class="fig-donut-hatch-line" x1="0" y1="0" x2="0" y2="7" stroke-width="2"></line></pattern></defs>`
    : ''

  const paths = slices
    .filter(slice => slice.path !== null)
    .map(slice => `<path class="fig-donut-slice fig-donut--${slice.tone}" d="${slice.path}"${slice.tone === 'absence' ? ' fill="url(#donutAbsence)"' : ''}></path>`)
    .join('')

  const hole = box.hole !== null ? `<circle class="fig-donut-hole" cx="${mid}" cy="${mid}" r="${box.hole}" fill="none"></circle>` : ''

  const labelText = lines
    .map((line, index) => `<text class="fig-donut-label" x="${mid}" y="${box.labelY - lift + index * box.labelLine}" text-anchor="middle" font-size="${box.fonts.label}">${esc(line)}</text>`)
    .join('')

  return (
    `<svg class="fig-donut" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.view} ${box.view}" role="img" aria-label="${esc(options.ariaLabel)}">` +
    pattern +
    paths +
    hole +
    `<text class="fig-donut-value" x="${mid}" y="${box.valueY - lift}" text-anchor="middle" font-size="${box.fonts.value}">${esc(value)}</text>` +
    labelText +
    `</svg>`
  )
}

/**
 * Hook de la página de dona: inserta el anillo en `.fig-donut-host` y viste cada fila que llenó el motor con su tono
 * y su ícono (o ninguno); la marca de la fila (`tag`) la pinta el motor. Fila y parte se emparejan por orden; si no
 * son las mismas, falla cerrado.
 */
export const makeDonutHook =
  (box: DonutBox): CatalogLayoutHook =>
  async (page, slide) => {
    const parts = (slide.slots.donutParts ?? []) as unknown as DonutPartInput[]
    const center = (slide.slots.donutCenter ?? null) as unknown as DonutCenterInput
    const title = String(slide.slots.figureTitle ?? '')

    for (const part of parts) {
      if (part.icon !== undefined && !(DONUT_PART_ICONS as readonly string[]).includes(part.icon)) {
        throw new FigureDataError(`La parte «${part.label}» pide un ícono desconocido («${part.icon}»).`)
      }
    }

    const svg = donutSvg(parts, center, box, { ariaLabel: donutAria(title, parts) })
    const tones = donutTones(parts)

    await page.evaluate(
      ({ markup, rows, icons }) => {
        const host = document.querySelector('.fig-donut-host')

        if (!host) throw new Error('Dona: falta el nodo .fig-donut-host en la plantilla.')

        host.innerHTML = markup

        const nodes = Array.from(document.querySelectorAll('.donut-row'))

        if (nodes.length !== rows.length) throw new Error(`Dona: hay ${nodes.length} filas para ${rows.length} partes.`)

        nodes.forEach((node, index) => {
          const row = rows[index]!

          node.classList.add(`donut-row--${row.tone}`)

          const set = node.querySelector('.donut-icon')

          if (!row.icon) set?.remove()
          else icons.filter(key => key !== row.icon).forEach(key => set?.querySelector(`.pi-${key}`)?.remove())
        })
      },
      {
        markup: svg,
        rows: parts.map((part, index) => ({ tone: tones[index]!, icon: part.icon ?? null })),
        icons: [...DONUT_PART_ICONS]
      }
    )
  }

/**
 * TASK-1975 — figura «barras apiladas» de los catálogos premium de Insights (A4 y deck), canvas `Premium-Apiladas` y
 * `Deck-Apiladas`: geometría SVG pura y el hook que la inserta.
 *
 * Una columna por período, desde cero sobre un eje redondo (`niceAxis`, hasta siete marcas); el segmento base (`series[0]` del plan, el de
 * la leyenda que va primero) abajo y el resto encima, en el orden de la leyenda. Toda medida sale de la cifra impresa
 * (`parsePrintedNumber`): el alto de cada segmento es la cifra que se lee dentro de él, y el total impreso sobre la
 * columna tiene que ser la suma de sus segmentos o la figura no se dibuja. La participación base que se imprime bajo el
 * período también se verifica contra los segmentos. Lo que no cabe (un rótulo de período, la anotación, una cifra
 * fuera de su segmento) falla cerrado con `FigureDataError`: nunca se recorta ni se monta sobre otra cosa.
 *
 * El color no vive acá: el SVG sólo lleva clases (`fig-stk-*`, más `fig-grid`/`fig-tick`/`fig-baseline` del catálogo) y
 * cada plantilla las pinta con sus roles del brand pack. Una sola geometría para el informe A4 y la lámina 16:9.
 */

import type { CatalogLayoutHook } from '../../catalog'
import { parsePrintedNumber, roundingToleranceOf } from '../../bar-figure'

import { FigureDataError, niceAxis, wrapLabel } from './figure-svg'

// ─── Contrato del slot (lo que emite `figure-slots.ts`, rama `stacked`) ────────────────────────────────────────────

export interface StackedLegendInput {
  label: string
}

export interface StackedPeriodInput {
  label: string
  /** Cifra impresa de cada segmento, en el orden de la leyenda (base = índice 0). */
  segments: string[]
  /** Total impreso sobre la columna: la suma de los segmentos. */
  total: string
  /** Participación del segmento base («52 % sin marca»). */
  baseShare: string
}

export interface StackedAnnotationInput {
  /** Variación del segmento base entre los dos últimos períodos, sin signo («28 %», «1,8 pp»). */
  delta: string
  direction: 'up' | 'down' | 'flat'
  tone?: 'better' | 'worse' | 'neutral'
  /** Nombre del segmento base («sin marca»). */
  label: string
}

// ─── Caja ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface StackedBox {
  width: number
  height: number
  plotLeft: number
  plotRight: number
  plotTop: number
  plotBottom: number
  /** Franja donde se reparten las columnas (deja aire a la derecha para la anotación). */
  colLeft: number
  colRight: number
  /** Ancho máximo de una columna y su proporción del espacio de cada período. */
  barMax: number
  barRatio: number
  /** Ancho mínimo: con menos, la columna ya no lleva su cifra y la figura no se emite. */
  barMin: number
  tickX: number
  /** Distancia desde la base del eje al rótulo del período y a la participación base. */
  periodDy: number
  shareDy: number
  /** Separación entre segmentos apilados. */
  segmentGap: number
  /** Alto mínimo de un segmento para llevar su cifra dentro. */
  minInside: number
  fonts: { tick: number; base: number; segment: number; total: number; period: number; share: number; delta: number; deltaLabel: number }
  optics: {
    display?: { width: number; height: number }
    tickDy: number
    totalGap: number
    /** Ajuste vertical de la cifra dentro del segmento base y de los demás. */
    valueDy: { base: number; rest: number }
    outsideDx: number
    annotation: { dx: number; dy: number; labelDy: number; labelLine: number; maxWidth: number }
  }
}

/** Caja del informe A4 (canvas `Premium-Apiladas`). */
export const REPORT_STACKED_BOX: StackedBox = {
  width: 658,
  height: 290,
  plotLeft: 44,
  plotRight: 620,
  plotTop: 14,
  plotBottom: 250,
  colLeft: 75,
  colRight: 615,
  barMax: 110,
  barRatio: 0.62,
  barMin: 40,
  tickX: 34,
  periodDy: 20,
  shareDy: 37,
  segmentGap: 1.5,
  minInside: 22,
  fonts: { tick: 10, base: 14, segment: 12, total: 13, period: 12, share: 10.5, delta: 11, deltaLabel: 10 },
  optics: {
    tickDy: 3.5,
    totalGap: 9,
    valueDy: { base: 4.95, rest: 4.75 },
    outsideDx: 6,
    annotation: { dx: 16, dy: 20, labelDy: 15, labelLine: 13, maxWidth: 96 }
  }
}

/** Caja de la lámina 16:9 (canvas `Deck-Apiladas`): misma geometría, cuerpos mayores para proyectar. */
export const DECK_STACKED_BOX: StackedBox = {
  ...REPORT_STACKED_BOX,
  fonts: { tick: 11.8, base: 16.5, segment: 14.2, total: 15.3, period: 14.2, share: 12.4, delta: 13, deltaLabel: 11.8 },
  optics: { ...REPORT_STACKED_BOX.optics, annotation: { dx: 16, dy: 20, labelDy: 15, labelLine: 14, maxWidth: 96 } }
}

// ─── Geometría ─────────────────────────────────────────────────────────────────────────────────────────────────────

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Coordenada con un decimal, sin ceros de relleno (como el SVG del canvas). */
const n = (value: number): string => String(Math.round(value * 10) / 10)

/**
 * Ancho estimado de un texto: 0,58 em por carácter en Geist y 0,62 em en Poppins (más ancha). Es un presupuesto para
 * fallar cerrado, no una medición: por eso redondea hacia arriba.
 */
const textWidth = (text: string, fontSize: number, display = false): number => [...text].length * fontSize * (display ? 0.62 : 0.58)

/** Marca del eje en la notación de la cifra impresa: «1.050», «2,5». */
const tickLabel = (value: number): string => {
  const [int, dec] = String(value).split('.')

  return `${int!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${dec ? `,${dec}` : ''}`
}

const printed = (value: string | undefined, where: string): number => {
  const parsed = parsePrintedNumber(value)

  if (parsed === null) throw new FigureDataError(`Apiladas: ${where} «${value ?? ''}» no es una cifra legible; el segmento no se dibuja inventado.`)

  if (parsed < 0) throw new FigureDataError(`Apiladas: ${where} «${value}» es negativo y una columna apilada nace en cero.`)

  return parsed
}

const leadingNumber = (text: string): number | null => parsePrintedNumber(/^[\s+\-−]*[\d.,]+/.exec(text)?.[0])

interface Label {
  x: number
  y: number
  w: number
  h: number
}

const overlaps = (a: Label, b: Label): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y - a.h < b.y && b.y - b.h < a.y

export const stackedColumnsSvg = (
  legend: readonly StackedLegendInput[],
  periods: readonly StackedPeriodInput[],
  box: StackedBox,
  options: { annotation?: StackedAnnotationInput | null; ariaLabel: string }
): string => {
  const segmentCount = legend.length

  if (segmentCount < 2 || segmentCount > 4) throw new FigureDataError('Apiladas: una columna apilada lleva de dos a cuatro segmentos.')

  if (periods.length < 2) throw new FigureDataError('Apiladas: la figura necesita al menos dos períodos.')

  // ── Cifras: cada segmento, su total y su participación base salen de lo impreso y se verifican entre sí.
  const values = periods.map(period => {
    if (period.segments.length !== segmentCount) {
      throw new FigureDataError(`Apiladas: «${period.label}» trae ${period.segments.length} segmentos y la leyenda declara ${segmentCount}.`)
    }

    const segments = period.segments.map((value, k) => printed(value, `«${period.label}», ${legend[k]!.label}:`))
    const sum = segments.reduce((total, value) => total + value, 0)
    const total = printed(period.total, `el total de «${period.label}»`)
    const tolerance = period.segments.reduce((acc, value) => acc + roundingToleranceOf(value), roundingToleranceOf(period.total))

    if (Math.abs(sum - total) > tolerance) {
      throw new FigureDataError(`Apiladas: el total impreso de «${period.label}» (${period.total}) no es la suma de sus segmentos (${tickLabel(sum)}).`)
    }

    const share = leadingNumber(period.baseShare)

    if (share === null) throw new FigureDataError(`Apiladas: la participación base de «${period.label}» («${period.baseShare}») no trae su cifra.`)

    if (sum > 0 && Math.abs(share - (segments[0]! / sum) * 100) > 1) {
      throw new FigureDataError(`Apiladas: la participación base de «${period.label}» («${period.baseShare}») no corresponde a sus segmentos.`)
    }

    return { segments, sum }
  })

  // ── Anotación: la variación impresa tiene que decir la dirección (y, si es relativa, la magnitud) del segmento base.
  const annotation = options.annotation ?? null
  const last = values.at(-1)!
  const prev = values.at(-2)!

  if (annotation) {
    const change = last.segments[0]! - prev.segments[0]!
    const expected = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

    if (annotation.direction !== expected) {
      throw new FigureDataError(`Apiladas: la anotación dice «${annotation.direction}» y el segmento base de los dos últimos períodos va «${expected}».`)
    }

    const magnitude = leadingNumber(annotation.delta)

    if (magnitude === null) throw new FigureDataError(`Apiladas: la variación «${annotation.delta}» no es una cifra legible.`)

    if (/%\s*$/.test(annotation.delta) && prev.segments[0]! > 0) {
      const relative = Math.abs(change / prev.segments[0]!) * 100

      if (Math.abs(relative - magnitude) > roundingToleranceOf(annotation.delta) + 0.05) {
        throw new FigureDataError(`Apiladas: la variación «${annotation.delta}» no corresponde al segmento base (${relative.toFixed(1)} %).`)
      }
    }
  }

  // ── Rótulos del eje X: período y participación base, hasta dos líneas cada uno. Lo que no cabe falla.
  const fonts = box.fonts
  const periodLine = Math.round(fonts.period * 1.25)
  const shareLine = Math.round(fonts.share * 1.25)

  const layoutColumns = (colRight: number) => {
    const slot = (colRight - box.colLeft) / periods.length
    const bar = Math.min(box.barMax, slot * box.barRatio)

    return { slot, bar, center: (index: number) => box.colLeft + slot * (index + 0.5) }
  }

  // Anotación a la derecha de la última columna: si no cabe en la figura, las columnas se corren a la izquierda.
  const sign = annotation ? (annotation.direction === 'up' ? '+' : annotation.direction === 'down' ? '−' : '') : ''
  const deltaText = annotation ? `${sign}${annotation.delta}` : ''
  const deltaLines = annotation ? wrapLabel(annotation.label, box.optics.annotation.maxWidth, fonts.deltaLabel) : []

  if (deltaLines.length > 2) throw new FigureDataError(`Apiladas: el rótulo de la anotación «${annotation!.label}» no cabe en dos líneas.`)

  const annotationWidth = annotation
    ? Math.max(textWidth(deltaText, fonts.delta, true), ...deltaLines.map(line => textWidth(line, fonts.deltaLabel)))
    : 0

  let colRight = box.colRight
  let layout = layoutColumns(colRight)

  while (annotation && layout.center(periods.length - 1) + layout.bar / 2 + box.optics.annotation.dx + annotationWidth > box.width) {
    colRight -= 1
    layout = layoutColumns(colRight)

    if (layout.bar < box.barMin) throw new FigureDataError(`Apiladas: la anotación «${deltaText} ${annotation.label}» no cabe junto a ${periods.length} columnas.`)
  }

  const { slot, bar, center } = layout

  if (bar < box.barMin) throw new FigureDataError(`Apiladas: ${periods.length} períodos no caben en el ancho de la figura.`)

  const labelWidth = slot - 8

  const periodLines = periods.map(period => {
    const lines = wrapLabel(period.label, labelWidth, fonts.period)

    if (lines.length > 2) throw new FigureDataError(`Apiladas: el período «${period.label}» no cabe en dos líneas de su columna.`)

    return lines
  })

  const shareLines = periods.map(period => {
    // Poppins es más ancha que Geist: el presupuesto del corte usa su cuerpo agrandado.
    // La cifra y su signo de porcentaje no se separan al cortar («52 %» es una sola pieza).
    const lines = wrapLabel(period.baseShare.replace(/(\d) %/g, '$1\u0001%'), labelWidth, fonts.share * (0.62 / 0.56)).map(line => line.replace(/\u0001/g, ' '))

    if (lines.length > 2) throw new FigureDataError(`Apiladas: la participación «${period.baseShare}» no cabe en dos líneas de su columna.`)

    return lines
  })

  // Las líneas extra no agrandan la figura: el área del gráfico cede ese alto (la página no se mueve).
  const extraPeriod = (Math.max(...periodLines.map(lines => lines.length)) - 1) * periodLine
  const extraShare = (Math.max(...shareLines.map(lines => lines.length)) - 1) * shareLine
  const plotBottom = box.plotBottom - extraPeriod - extraShare
  const plotHeight = plotBottom - box.plotTop
  // Eje redondo con hasta siete marcas: el tope queda pegado al total mayor (1.284 → 1.400 de a 200, el alto del canvas),
  // así la columna más alta usa casi toda el área. Con cuatro, el tope saltaba a 1.500 y todas las columnas se achicaban.
  const { top, step } = niceAxis(Math.max(...values.map(entry => entry.sum)), 7)
  const y = (value: number) => plotBottom - (value / top) * plotHeight

  const display = box.optics.display ?? { width: box.width, height: box.height }
  const out: string[] = []

  out.push(`<svg class="fig-stacked" width="${display.width}" height="${display.height}" viewBox="0 0 ${box.width} ${box.height}" role="img" aria-label="${esc(options.ariaLabel)}">`)

  const ticks: string[] = []

  for (let i = Math.round(top / step); i >= 0; i -= 1) {
    const value = Math.round(step * i * 1e6) / 1e6
    const ty = y(value)
    const text = tickLabel(value)

    if (textWidth(text, fonts.tick) > box.tickX + 16) throw new FigureDataError(`Apiladas: la marca del eje «${text}» no cabe a la izquierda del gráfico.`)

    ticks.push(`<line class="fig-grid" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${n(ty)}" y2="${n(ty)}"></line>`)
    ticks.push(`<text class="fig-tick" x="${box.tickX}" y="${n(ty + box.optics.tickDy)}" font-size="${fonts.tick}">${tickLabel(value)}</text>`)
  }

  out.push(`<g text-anchor="end">${ticks.join('')}</g>`)

  const labels: string[] = []
  const outside: Label[] = []
  const baseTops: number[] = []

  periods.forEach((period, index) => {
    const c = center(index)
    const x = c - bar / 2
    const nextLeft = index + 1 < periods.length ? center(index + 1) - bar / 2 : box.width
    const { segments, sum } = values[index]!
    const topmost = segments.reduce((found, value, k) => (value > 0 ? k : found), -1)
    let cumulative = 0

    segments.forEach((value, k) => {
      const lower = y(cumulative)

      cumulative += value

      const upper = y(cumulative)
      const segTop = upper
      const segBottom = k === 0 ? plotBottom : lower - box.segmentGap
      const height = segBottom - segTop

      if (k === 0) baseTops.push(segTop)

      if (value > 0 && height > 0) {
        out.push(`<rect class="fig-stk-seg fig-stk-seg--${k}" x="${n(x)}" y="${n(segTop)}" width="${n(bar)}" height="${n(height)}"${k === topmost && k > 0 ? ' rx="3"' : ''}></rect>`)
      }

      const font = k === 0 ? fonts.base : fonts.segment
      const text = period.segments[k]!
      const width = textWidth(text, font, k === 0)
      const mid = segTop + Math.max(height, 0) / 2 + (k === 0 ? box.optics.valueDy.base : box.optics.valueDy.rest)

      if (height >= box.minInside && width <= bar - 8) {
        labels.push(`<text class="fig-stk-value fig-stk-value--${k}" x="${n(c)}" y="${n(mid)}" text-anchor="middle" font-size="${font}">${esc(text)}</text>`)

        return
      }

      // Segmento bajo: la cifra va fuera, a la derecha de la columna, sin tocar la columna siguiente ni otra cifra.
      const label: Label = { x: x + bar + box.optics.outsideDx, y: mid, w: width, h: font }

      if (label.x + label.w > nextLeft - 4) {
        throw new FigureDataError(`Apiladas: la cifra «${text}» de «${period.label}» no cabe ni dentro de su segmento ni junto a la columna.`)
      }

      if (outside.some(other => overlaps(other, label))) {
        throw new FigureDataError(`Apiladas: dos cifras fuera de la columna «${period.label}» se montan; la figura no se emite.`)
      }

      outside.push(label)
      labels.push(`<text class="fig-stk-value fig-stk-value--${k} fig-stk-value--out" x="${n(label.x)}" y="${n(mid)}" font-size="${font}">${esc(text)}</text>`)
    })

    const totalText = period.total

    if (textWidth(totalText, fonts.total, true) > slot - 4) throw new FigureDataError(`Apiladas: el total «${totalText}» no cabe sobre su columna.`)

    labels.push(`<text class="fig-stk-total" x="${n(c)}" y="${n(y(sum) - box.optics.totalGap)}" text-anchor="middle" font-size="${fonts.total}">${esc(totalText)}</text>`)

    const lines = periodLines[index]!
    const periodY = plotBottom + box.periodDy

    labels.push(
      `<text class="fig-stk-period" x="${n(c)}" y="${n(periodY)}" text-anchor="middle" font-size="${fonts.period}">` +
        lines.map((line, k) => (k === 0 ? esc(line) : `<tspan x="${n(c)}" dy="${periodLine}">${esc(line)}</tspan>`)).join('') +
        '</text>'
    )

    const shares = shareLines[index]!
    const shareY = plotBottom + box.shareDy + extraPeriod

    labels.push(
      `<text class="fig-stk-share" x="${n(c)}" y="${n(shareY)}" text-anchor="middle" font-size="${fonts.share}">` +
        shares.map((line, k) => (k === 0 ? esc(line) : `<tspan x="${n(c)}" dy="${shareLine}">${esc(line)}</tspan>`)).join('') +
        '</text>'
    )
  })

  if (annotation) {
    const a = box.optics.annotation
    const lastIndex = periods.length - 1
    const prevRight = center(lastIndex - 1) + bar / 2
    const lastLeft = center(lastIndex) - bar / 2
    const lastRight = lastLeft + bar
    const fromY = baseTops[lastIndex - 1]!
    const toY = baseTops[lastIndex]!
    const textX = lastRight + a.dx
    const deltaY = toY + a.dy
    const tone = annotation.tone ?? 'neutral'
    const block: Label = { x: textX, y: deltaY + a.labelDy + a.labelLine * (deltaLines.length - 1), w: annotationWidth, h: a.labelDy + a.labelLine * (deltaLines.length - 1) + fonts.delta }

    if (outside.some(other => overlaps(other, block))) {
      throw new FigureDataError('Apiladas: la anotación de la variación se monta sobre una cifra fuera de la columna.')
    }

    out.push(`<path class="fig-stk-connector" d="M ${n(prevRight)} ${n(fromY)} L ${n(lastLeft)} ${n(toY)}"></path>`)
    labels.push(`<text class="fig-stk-delta fig-stk-delta--${tone}" x="${n(textX)}" y="${n(deltaY)}" font-size="${fonts.delta}">${esc(deltaText)}</text>`)
    labels.push(
      `<text class="fig-stk-delta-label" x="${n(textX)}" y="${n(deltaY + a.labelDy)}" font-size="${fonts.deltaLabel}">` +
        deltaLines.map((line, k) => (k === 0 ? esc(line) : `<tspan x="${n(textX)}" dy="${a.labelLine}">${esc(line)}</tspan>`)).join('') +
        '</text>'
    )
  }

  out.push(`<line class="fig-baseline" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${n(plotBottom)}" y2="${n(plotBottom)}"></line>`)
  out.push(`<g class="fig-stk-labels">${labels.join('')}</g>`)
  out.push('</svg>')

  return out.join('')
}

// ─── Hook ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Resumen accesible: título y, por período, cada segmento con su nombre y el total (el SVG no se lee como texto). */
export const stackedAria = (
  title: string,
  legend: readonly StackedLegendInput[],
  periods: readonly StackedPeriodInput[],
  annotation: StackedAnnotationInput | null
): string => {
  const rows = periods.map(
    period => `${period.label}: ${period.segments.map((value, k) => `${legend[k]?.label ?? ''} ${value}`).join(', ')}; total ${period.total}.`
  )

  const delta = annotation
    ? ` Variación de ${annotation.label} en el último período: ${annotation.direction === 'up' ? 'subió' : annotation.direction === 'down' ? 'bajó' : 'sin cambio'} ${annotation.delta}.`
    : ''

  return `${title}. ${rows.join(' ')}${delta}`
}

export const makeStackedHook =
  (box: StackedBox): CatalogLayoutHook =>
  async (page, slide) => {
    const legend = (slide.slots.stackedLegend ?? []) as unknown as StackedLegendInput[]
    const periods = (slide.slots.stackedPeriods ?? []) as unknown as StackedPeriodInput[]
    const annotation = (slide.slots.stackedAnnotation ?? null) as unknown as StackedAnnotationInput | null
    const title = String(slide.slots.figureTitle ?? '')
    const svg = stackedColumnsSvg(legend, periods, box, { annotation, ariaLabel: stackedAria(title, legend, periods, annotation) })

    await page.evaluate(
      ({ selector, markup }) => {
        const node = document.querySelector(selector)

        if (!node) throw new Error(`Apiladas: falta el nodo ${selector} en la plantilla.`)

        node.innerHTML = markup
      },
      { selector: '.fig-stacked-host', markup: svg }
    )
  }

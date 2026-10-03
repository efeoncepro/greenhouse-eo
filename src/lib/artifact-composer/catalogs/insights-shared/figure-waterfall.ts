/**
 * TASK-1975 — figura «cascada» de los catálogos premium de Insights (A4 y deck): geometría SVG pura y hook.
 *
 * Responde POR QUÉ cambió un total: del total anterior al actual por aportes con signo. Barras horizontales
 * desde cero (canvas `Premium-Cascada` / `Deck-Cascada`): rótulos a la izquierda alineados a la derecha, totales
 * anclados en cero, pasos flotando sobre el acumulado, conectores punteados entre una barra y la siguiente y la
 * cifra a la derecha de cada barra.
 *
 * Toda medida sale de la cifra IMPRESA (`parsePrintedNumber`) y el acumulado del motor (`waterfallGeometry`):
 * figura y etiqueta no pueden decir cosas distintas. El signo del paso se lee de su `kind` (el «−» U+2212 no lo
 * conserva `parsePrintedNumber`), pero el texto DEBE llevarlo impreso: el color nunca es la única codificación.
 * Si el total inicial más la suma de los pasos no da el total final, la figura no se dibuja (FigureDataError):
 * una cascada que no cuadra miente sobre el cambio.
 *
 * El color no vive acá: el SVG sólo lleva clases y cada plantilla las pinta con sus roles del brand pack.
 */

import { parsePrintedNumber, roundingToleranceOf } from '../../bar-figure'
import type { CatalogLayoutHook } from '../../catalog'
import { waterfallGeometry } from '../../chart-geometry'
import { FigureDataError, niceAxis } from './figure-svg'

export type WaterfallStepKind = 'start' | 'add' | 'remove' | 'end'

export interface WaterfallStepInput {
  label: string
  /** Cifra impresa: los totales sin signo («1.102»), los pasos con signo («+96», «−23»). */
  value: string
  kind: WaterfallStepKind
}

export interface WaterfallBox {
  /** Ancho del lienzo y alto con seis filas (el del canvas). Más filas comprimen el paso vertical, nunca lo estiran. */
  width: number
  height: number
  /** Borde derecho de la columna de rótulos (alineados a la derecha). */
  labelX: number
  plotLeft: number
  plotRight: number
  plotTop: number
  /** Distancia entre filas y alto de barra a seis filas o menos. */
  rowPitch: number
  barHeight: number
  /**
   * Alto máximo de la banda de filas: con más filas, el paso se comprime para no pasar de acá. A4: siete filas a
   * paso pleno (la figura crece 42 px, lo que la página aguanta con conclusión, bajada y cierre largos); deck: seis
   * (el panel tiene alto fijo).
   */
  maxBand: number
  /** Pasos intermedios que admite el lienzo (sin contar los dos totales). */
  maxSteps: number
  fonts: { label: number; total: number; step: number; tick: number }
  optics: { firstBarDy: number; valueGap: number; tickDy: number; bottomPad: number; gridOverhang: number }
}

/** Caja del informe A4 (canvas `Premium-Cascada`): rótulos hasta x = 176, eje de 190 a 610. */
export const REPORT_WATERFALL_BOX: WaterfallBox = {
  width: 658,
  height: 296,
  labelX: 176,
  plotLeft: 190,
  plotRight: 610,
  plotTop: 14,
  rowPitch: 42,
  barHeight: 26,
  maxBand: 294,
  maxSteps: 8,
  fonts: { label: 12, total: 14, step: 13, tick: 10 },
  optics: { firstBarDy: 12, valueGap: 8, tickDy: 18, bottomPad: 12, gridOverhang: 4 }
}

/** Caja de la lámina 16:9 (canvas `Deck-Cascada`): mismo eje, cuerpos mayores; el panel tiene alto fijo. */
export const DECK_WATERFALL_BOX: WaterfallBox = {
  ...REPORT_WATERFALL_BOX,
  maxBand: 252,
  maxSteps: 6,
  fonts: { label: 14.2, total: 16.5, step: 15.3, tick: 11.8 }
}

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const n = (value: number): string => String(Math.round(value * 10) / 10)

/** Marca del eje con separador de miles es-CL («1.050», «2,5»): la misma convención que las cifras impresas. */
export const waterfallTickLabel = (value: number): string => {
  const [whole, decimals] = String(Math.round(value * 100) / 100).split('.')
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  return decimals ? `${grouped},${decimals}` : grouped
}

/**
 * Ancho estimado de un rótulo en Geist, por clase de carácter (angostas 0,3 em; anchas 0,82; mayúsculas 0,66;
 * dígitos 0,58; resto 0,54). Más fino que el 0,56 plano de `wrapLabel` porque la columna de rótulos es angosta y el
 * canvas la llena casi al ras. Es sólo el corte de línea: el hook mide el rótulo real y falla cerrado si se sale.
 */
const charEm = (ch: string): number =>
  ch === ' ' ? 0.27 : /[mwMW]/.test(ch) ? 0.82 : /[iljtfrI.,:;'!|]/.test(ch) ? 0.3 : /[A-ZÁÉÍÓÚÑ]/.test(ch) ? 0.66 : /\d/.test(ch) ? 0.58 : 0.54

const estimateWidth = (text: string, fontSize: number): number => [...text].reduce((total, ch) => total + charEm(ch), 0) * fontSize

/** Corta un rótulo por palabra en a lo más dos líneas del ancho de la columna; si no cabe, falla cerrado. */
export const wrapWaterfallLabel = (text: string, width: number, fontSize: number): string[] => {
  const lines: string[] = []
  let line = ''

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (estimateWidth(word, fontSize) > width) throw new FigureDataError(`Cascada: el rótulo «${text}» tiene una palabra que no cabe en su columna.`)

    const next = line ? `${line} ${word}` : word

    if (estimateWidth(next, fontSize) <= width) line = next
    else {
      lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)

  if (lines.length === 0) throw new FigureDataError('Cascada: un paso sin rótulo no se dibuja.')

  if (lines.length > 2) throw new FigureDataError(`Cascada: el rótulo «${text}» no cabe en dos líneas de su columna.`)

  return lines
}

interface ParsedStep {
  input: WaterfallStepInput
  /** Magnitud con signo: los totales positivos, «Restó» negativo. */
  delta: number
}

const parseSteps = (steps: readonly WaterfallStepInput[], box: WaterfallBox): ParsedStep[] => {
  if (steps.length < 3) throw new FigureDataError('Cascada: va de un total a otro con al menos un paso entre ambos.')

  const middle = steps.slice(1, -1)

  if (steps[0]!.kind !== 'start' || steps.at(-1)!.kind !== 'end' || middle.some(step => step.kind !== 'add' && step.kind !== 'remove')) {
    throw new FigureDataError('Cascada: el primer paso es el total anterior, el último el actual y los del medio, aportes que suman o restan.')
  }

  if (middle.length > box.maxSteps) {
    throw new FigureDataError(`Cascada: ${middle.length} pasos no caben en el lienzo (hasta ${box.maxSteps}); una cascada no se pagina.`)
  }

  return steps.map((step, index) => {
    const magnitude = parsePrintedNumber(step.value)

    if (magnitude === null) throw new FigureDataError(`Cascada: «${step.value}» (${step.label}) no es una cifra legible; la barra no se dibuja inventada.`)

    const text = step.value.trim()

    if (step.kind === 'add' && !text.startsWith('+')) throw new FigureDataError(`Cascada: el paso «${step.label}» suma y su cifra debe llevar el signo «+» impreso.`)

    if (step.kind === 'remove' && !/^[−-]/.test(text)) throw new FigureDataError(`Cascada: el paso «${step.label}» resta y su cifra debe llevar el signo «−» impreso.`)

    if ((step.kind === 'start' || step.kind === 'end') && (/^[−-]/.test(text) || magnitude < 0)) {
      throw new FigureDataError(`Cascada: el total «${step.label}» nace en cero y no admite «${step.value}».`)
    }

    // `parsePrintedNumber` pierde el «−» tipográfico: el signo lo pone el tipo del paso, no el texto.
    const absolute = Math.abs(magnitude)

    return { input: steps[index]!, delta: step.kind === 'remove' ? -absolute : absolute }
  })
}

export const waterfallSvg = (steps: readonly WaterfallStepInput[], box: WaterfallBox, options: { ariaLabel: string }): string => {
  const parsed = parseSteps(steps, box)
  const start = parsed[0]!
  const end = parsed.at(-1)!
  const middle = parsed.slice(1, -1)
  const reached = start.delta + middle.reduce((total, step) => total + step.delta, 0)
  const tolerance = parsed.reduce((total, step) => total + roundingToleranceOf(step.input.value), 0)

  if (Math.abs(reached - end.delta) > tolerance) {
    throw new FigureDataError(
      `Cascada: no cuadra; ${start.input.value} ${middle.map(step => step.input.value).join(' ')} da ${waterfallTickLabel(reached)}, no ${end.input.value}.`
    )
  }

  // Acumulado y dirección del motor: los totales se anclan en cero y los pasos flotan sobre el acumulado.
  const bars = waterfallGeometry(
    parsed.map((step, index) => ({
      stepId: `s${index}`,
      label: step.input.label,
      delta: step.delta,
      isTotal: step.input.kind === 'start' || step.input.kind === 'end'
    }))
  )

  const spans = bars.map((bar, index) => {
    const from = bar.direction === 'total' ? 0 : bars[index - 1]!.runningTotal

    return { from, to: bar.runningTotal }
  })

  if (spans.some(span => span.from < 0 || span.to < 0)) throw new FigureDataError('Cascada: el acumulado no puede bajar de cero; el eje nace en cero.')

  const { top, step: tickStep } = niceAxis(Math.max(...spans.map(span => span.to), ...spans.map(span => span.from)))
  const x = (value: number) => box.plotLeft + (value / top) * (box.plotRight - box.plotLeft)
  const rows = parsed.length
  // Del borde superior de la primera barra al inferior de la última caben `maxBand − (paso − barra)` px; con más filas
  // de las que caben a paso pleno, paso y barra se comprimen en la misma proporción y el lienzo no crece.
  const span = box.maxBand - (box.rowPitch - box.barHeight)
  const ratio = box.barHeight / box.rowPitch
  const pitch = Math.min(box.rowPitch, span / (rows - 1 + ratio))
  const barHeight = Math.round(pitch * ratio * 10) / 10
  const firstBarY = box.plotTop + box.optics.firstBarDy
  const barY = (index: number) => firstBarY + index * pitch
  const plotBottom = barY(rows - 1) + barHeight + box.optics.gridOverhang
  const tickY = plotBottom + box.optics.tickDy
  // El lienzo mide lo que sus filas: con menos de seis no deja un hueco bajo el eje.
  const height = Math.round(tickY + box.optics.bottomPad)
  const lineHeight = Math.round(box.fonts.label * 1.1 * 10) / 10
  const labelLines = parsed.map(step => wrapWaterfallLabel(step.input.label, box.labelX, box.fonts.label))

  // Un rótulo de dos líneas ocupa a lo más el paso de su fila: nunca se monta sobre el rótulo vecino.
  if (labelLines.some(lines => lines.length > 1) && lineHeight * 2 > pitch + 1) {
    throw new FigureDataError('Cascada: con tantas filas, un rótulo de dos líneas se montaría sobre la fila vecina.')
  }

  const out: string[] = []

  out.push(`<svg class="fig-waterfall" width="${box.width}" height="${height}" viewBox="0 0 ${box.width} ${height}" role="img" aria-label="${esc(options.ariaLabel)}">`)

  const grid: string[] = []

  for (let value = 0; value <= top + 1e-9; value += tickStep) {
    const tx = x(value)

    if (value > 0) grid.push(`<line class="fig-grid" x1="${n(tx)}" x2="${n(tx)}" y1="${box.plotTop}" y2="${n(plotBottom)}"></line>`)
    grid.push(`<text class="fig-tick" x="${n(tx)}" y="${n(tickY)}" text-anchor="middle" font-size="${box.fonts.tick}">${waterfallTickLabel(value)}</text>`)
  }

  out.push(`<g>${grid.join('')}</g>`)

  parsed.forEach((step, index) => {
    const bar = bars[index]!
    const span = spans[index]!
    const y = barY(index)
    const low = Math.min(span.from, span.to)
    const high = Math.max(span.from, span.to)
    const total = bar.direction === 'total'
    const lines = labelLines[index]!
    const firstBaseline = y + barHeight / 2 + 4 - ((lines.length - 1) * lineHeight) / 2

    out.push(
      `<text class="fig-wf-label${total ? ' fig-wf-label--total' : ''}" x="${box.labelX}" y="${n(firstBaseline)}" text-anchor="end" font-size="${box.fonts.label}">` +
        lines.map((line, k) => (k === 0 ? esc(line) : `<tspan x="${box.labelX}" dy="${lineHeight}">${esc(line)}</tspan>`)).join('') +
        '</text>'
    )

    const barClass = step.input.kind === 'start' ? 'fig-prior' : step.input.kind === 'end' ? 'fig-current' : step.input.kind === 'add' ? 'fig-step--add' : 'fig-step--remove'

    // Un paso de cero sigue siendo un dato: se ve como un filo, nunca desaparece.
    const width = Math.max(x(high) - x(low), 1)

    out.push(`<rect class="${barClass}" x="${n(x(low))}" y="${n(y)}" width="${n(width)}" height="${n(barHeight)}" rx="3"></rect>`)

    if (index > 0) {
      // Conector: del fin de la barra anterior (el acumulado) al inicio de ésta.
      const cx = x(bars[index - 1]!.runningTotal)

      out.push(`<line class="fig-wf-connector" x1="${n(cx)}" x2="${n(cx)}" y1="${n(barY(index - 1) + barHeight)}" y2="${n(y)}"></line>`)
    }

    const valueClass = total ? 'fig-wf-value fig-wf-value--total' : step.input.kind === 'remove' ? 'fig-wf-value fig-wf-value--remove' : 'fig-wf-value'

    out.push(
      `<text class="${valueClass}" x="${n(x(low) + width + box.optics.valueGap)}" y="${n(y + barHeight / 2 + 5)}" font-size="${total ? box.fonts.total : box.fonts.step}">${esc(step.input.value.trim())}</text>`
    )
  })

  out.push(`<line class="fig-baseline" x1="${box.plotLeft}" x2="${box.plotLeft}" y1="${box.plotTop}" y2="${n(plotBottom)}"></line>`)
  out.push('</svg>')

  return out.join('')
}

/** Resumen accesible: título y cada fila con su cifra (el SVG no se lee como texto). */
export const waterfallAria = (title: string, steps: readonly WaterfallStepInput[]): string =>
  `${title}. ${steps.map(step => `${step.label}: ${step.value.trim()}.`).join(' ')}`

export const makeWaterfallHook =
  (box: WaterfallBox): CatalogLayoutHook =>
  async (page, slide) => {
    const steps = (slide.slots.waterfallSteps ?? []) as unknown as WaterfallStepInput[]
    const title = String(slide.slots.figureTitle ?? '')
    const svg = waterfallSvg(steps, box, { ariaLabel: waterfallAria(title, steps) })

    // El corte de línea es una estimación; el juez es el texto real: un rótulo que se sale por la izquierda o una
    // cifra que pasa el borde derecho del lienzo no se recorta ni se tolera, falla cerrado.
    const overflow = await page.evaluate(
      ({ selector, markup, width }) => {
        const node = document.querySelector(selector)

        if (!node) throw new Error(`Cascada: falta el nodo ${selector} en la plantilla.`)

        node.innerHTML = markup

        const out: string[] = []

        node.querySelectorAll<SVGTextElement>('.fig-wf-label').forEach(label => {
          if (label.getBBox().x < -0.5) out.push(`el rótulo «${label.textContent ?? ''}» no cabe en su columna`)
        })

        node.querySelectorAll<SVGTextElement>('.fig-wf-value').forEach(value => {
          const box = value.getBBox()

          if (box.x + box.width > width + 0.5) out.push(`la cifra «${value.textContent ?? ''}» pasa el borde de la figura`)
        })

        // La figura crece con las filas (A4) o se comprime (panel de alto fijo del deck): si con ella la página ya no
        // cabe, el cierre se montaría sobre el pie o la nota saldría del panel. Ninguno de los dos se recorta.
        const foot = document.querySelector('.paper-foot')
        const closing = document.querySelector('.closing')

        if (foot && closing && closing.getBoundingClientRect().height > 0 && closing.getBoundingClientRect().bottom > foot.getBoundingClientRect().top - 12) {
          out.push('con la figura, el cierre se monta sobre el pie de la página')
        }

        const panel = document.querySelector('.fig-panel')

        if (panel && panel.scrollHeight > panel.clientHeight + 1) out.push('la figura no cabe en el panel de la lámina')

        return out
      },
      { selector: '.fig-waterfall-host', markup: svg, width: box.width }
    )

    if (overflow.length > 0) throw new FigureDataError(`Cascada: ${overflow.join('; ')}.`)
  }

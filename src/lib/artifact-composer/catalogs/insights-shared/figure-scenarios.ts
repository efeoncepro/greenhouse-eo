/**
 * Figura «escenarios» del informe A4 premium: geometría SVG pura y hook.
 *
 * Responde CUÁNTO y CUÁNDO: por cada período proyectado, una columna por escenario (sin intervenir, base,
 * estructural) y una marca discontinua con la referencia del mismo período del año anterior, que es contra lo
 * que se mide una recuperación estacional. Las columnas nacen en cero y su alto sale de la cifra IMPRESA
 * (`parsePrintedNumber`): figura y etiqueta no pueden decir cosas distintas, y una cifra ilegible falla cerrado.
 *
 * Los escenarios son ESTIMACIONES del plan, no datos observados: la plantilla los rotula como tales y la
 * referencia (dato real) es la única marca con trazo continuo de valor. El color sale del rol: base = dato
 * actual del catálogo, estructural = oportunidad, sin intervenir = neutro; la referencia = anterior.
 */

import { parsePrintedNumber } from '../../bar-figure'
import type { CatalogLayoutHook } from '../../catalog'
import { FigureDataError, niceAxis } from './figure-svg'

export type ScenarioRole = 'low' | 'base' | 'high'

export const SCENARIO_ROLES: readonly ScenarioRole[] = ['low', 'base', 'high']

export interface ScenarioChartInput {
  /** Rótulos de los períodos proyectados («Nov 2026»): de dos a cuatro. */
  periods: string[]
  /** Dato observado del mismo período anterior (la vara de medida). */
  reference: { label: string; values: string[] }
  /** Una serie por escenario, en el orden de las tarjetas: cada una con una cifra impresa por período. */
  series: Array<{ role: ScenarioRole; values: string[] }>
}

export interface ScenariosBox {
  width: number
  height: number
  plotLeft: number
  plotRight: number
  plotTop: number
  plotBottom: number
  tickX: number
  xLabelY: number
  barWidth: number
  barGap: number
  fonts: { tick: number; value: number; period: number; reference: number }
}

/** Caja del informe A4: el mismo ancho de figura que líneas y columnas (658 px). */
export const REPORT_SCENARIOS_BOX: ScenariosBox = {
  width: 658,
  height: 232,
  plotLeft: 44,
  // Margen derecho para la cifra de la referencia del último período, que va a la derecha de su grupo.
  plotRight: 612,
  plotTop: 18,
  plotBottom: 204,
  tickX: 36,
  xLabelY: 224,
  barWidth: 38,
  barGap: 8,
  fonts: { tick: 10, value: 11, period: 11, reference: 9.5 }
}

const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const n = (value: number): string => String(Math.round(value * 10) / 10)

/** Tick compacto: 80000 → «80k»; bajo mil, el número tal cual. Las cifras de las barras se imprimen del plan. */
const compactTick = (value: number): string => (value >= 1000 ? `${String(value / 1000).replace('.', ',')}k` : String(value))

const parseAll = (values: string[], what: string): number[] =>
  values.map((raw, index) => {
    const value = parsePrintedNumber(raw)

    if (value === null || value < 0) throw new FigureDataError(`Escenarios: «${raw}» (${what}, período ${index + 1}) no es una cifra legible.`)

    return value
  })

export const scenariosSvg = (input: ScenarioChartInput, box: ScenariosBox, ariaLabel: string): string => {
  const periods = input.periods ?? []
  const count = periods.length

  if (count < 2 || count > 4) throw new FigureDataError('Escenarios: la figura proyecta de dos a cuatro períodos.')

  const series = input.series ?? []

  if (series.length < 1 || series.length > 3) throw new FigureDataError('Escenarios: la figura lleva de uno a tres escenarios.')

  const roles = series.map(s => s.role)

  if (roles.some(role => !SCENARIO_ROLES.includes(role)) || new Set(roles).size !== roles.length) {
    throw new FigureDataError('Escenarios: cada escenario lleva un rol distinto (low, base, high).')
  }

  if (series.some(s => s.values.length !== count) || input.reference.values.length !== count) {
    throw new FigureDataError('Escenarios: cada serie y la referencia traen una cifra por período.')
  }

  const reference = parseAll(input.reference.values, input.reference.label)
  const parsed = series.map(s => parseAll(s.values, s.role))
  const { top, step } = niceAxis(Math.max(...reference, ...parsed.flat()), 4)
  const plotHeight = box.plotBottom - box.plotTop
  const y = (value: number) => box.plotBottom - (value / top) * plotHeight
  const groupWidth = (box.plotRight - box.plotLeft) / count
  const clusterWidth = series.length * box.barWidth + (series.length - 1) * box.barGap
  const out: string[] = []

  out.push(`<svg class="fig-scenarios" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}" role="img" aria-label="${esc(ariaLabel)}">`)

  const ticks: string[] = []

  for (let value = top; value >= 0; value -= step) {
    const ty = y(value)

    if (value > 0) ticks.push(`<line class="fig-grid" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${n(ty)}" y2="${n(ty)}"></line>`)
    ticks.push(`<text class="fig-tick" x="${box.tickX}" y="${n(ty + 3)}" font-size="${box.fonts.tick}">${compactTick(value)}</text>`)
  }

  out.push(`<g text-anchor="end">${ticks.join('')}</g>`)

  periods.forEach((period, p) => {
    const center = box.plotLeft + groupWidth * (p + 0.5)
    const start = center - clusterWidth / 2
    const bars = series.map((s, k) => ({ role: s.role, printed: s.values[p]!, x: start + k * (box.barWidth + box.barGap), top: y(parsed[k]![p]!) }))

    for (const bar of bars) {
      out.push(`<rect class="fig-sc-bar fig-sc-bar--${bar.role}" x="${n(bar.x)}" y="${n(bar.top)}" width="${box.barWidth}" height="${n(box.plotBottom - bar.top)}" rx="3"></rect>`)
    }

    // La referencia cruza el grupo completo con un margen (no es una columna más) y va SOBRE las columnas pero DEBAJO
    // de sus cifras, que llevan halo: la vara se ve entera y ninguna cifra queda tachada.
    const ry = y(reference[p]!)
    const x2 = start + clusterWidth + 10

    out.push(`<line class="fig-sc-reference" x1="${n(start - 10)}" x2="${n(x2)}" y1="${n(ry)}" y2="${n(ry)}"></line>`)
    out.push(`<text class="fig-sc-reference-label" x="${n(x2 + 4)}" y="${n(ry + 3.5)}" font-size="${box.fonts.reference}">${esc(input.reference.values[p]!)}</text>`)

    for (const bar of bars) {
      out.push(`<text class="fig-sc-value fig-sc-value--${bar.role}" x="${n(bar.x + box.barWidth / 2)}" y="${n(bar.top - 6)}" text-anchor="middle" font-size="${box.fonts.value}">${esc(bar.printed)}</text>`)
    }

    out.push(`<text class="fig-sc-period" x="${n(center)}" y="${box.xLabelY}" text-anchor="middle" font-size="${box.fonts.period}">${esc(period)}</text>`)
  })

  out.push(`<line class="fig-baseline" x1="${box.plotLeft}" x2="${box.plotRight}" y1="${box.plotBottom}" y2="${box.plotBottom}"></line>`)
  out.push('</svg>')

  return out.join('')
}

const scenariosAria = (title: string, input: ScenarioChartInput): string =>
  `${title}. ${input.periods
    .map((period, p) => `${period}: ${input.series.map(s => `${s.role} ${s.values[p]}`).join(', ')}; ${input.reference.label} ${input.reference.values[p]}.`)
    .join(' ')}`

export const makeScenariosHook =
  (box: ScenariosBox): CatalogLayoutHook =>
  async (page, slide) => {
    const input = (slide.slots.scenarioChart ?? null) as unknown as ScenarioChartInput | null

    if (!input) throw new FigureDataError('Escenarios: falta `scenarioChart`.')

    // Las tarjetas y la figura nombran los mismos escenarios en el mismo orden: un rol distinto es un plan incoherente.
    const cards = (slide.slots.scenarios ?? []) as unknown as Array<{ role?: string }>

    if (cards.map(card => card.role).join(',') !== input.series.map(s => s.role).join(',')) {
      throw new FigureDataError('Escenarios: las tarjetas y la figura no declaran los mismos roles en el mismo orden.')
    }

    const svg = scenariosSvg(input, box, scenariosAria(String(slide.slots.figureTitle ?? ''), input))

    const overflow = await page.evaluate(
      ({ markup, width }) => {
        const node = document.querySelector('.fig-scenarios-host')

        if (!node) throw new Error('Escenarios: falta el nodo .fig-scenarios-host en la plantilla.')

        node.innerHTML = markup

        const out: string[] = []

        node.querySelectorAll<SVGTextElement>('text').forEach(text => {
          const bbox = text.getBBox()

          if (bbox.x < -0.5 || bbox.x + bbox.width > width + 0.5) out.push(`«${text.textContent ?? ''}» sale del lienzo`)
        })

        return out
      },
      { markup: svg, width: box.width }
    )

    if (overflow.length > 0) throw new FigureDataError(`Escenarios: ${overflow.join('; ')}.`)
  }

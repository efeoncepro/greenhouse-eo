/**
 * TASK-1975 — figura «cascada»: toda barra sale de la cifra impresa a su derecha, el signo se lee del tipo del paso
 * (el «−» tipográfico no sobrevive a `parsePrintedNumber`) y una cascada que no cuadra, una cifra ilegible, un paso
 * sin signo o más filas que el lienzo fallan cerrado: nunca una barra inventada ni un rótulo recortado.
 */

import { describe, expect, it } from 'vitest'

import { FigureDataError } from '../catalogs/insights-shared/figure-svg'
import {
  DECK_WATERFALL_BOX,
  REPORT_WATERFALL_BOX,
  waterfallAria,
  waterfallSvg,
  waterfallTickLabel,
  wrapWaterfallLabel,
  type WaterfallStepInput
} from '../catalogs/insights-shared/figure-waterfall'

/** Datos del canvas `Premium-Cascada`: 1.102 + 96 + 71 + 38 − 23 = 1.284. */
const CANVAS: WaterfallStepInput[] = [
  { label: 'Julio', value: '1.102', kind: 'start' },
  { label: 'Páginas de servicio', value: '+96', kind: 'add' },
  { label: 'Blog', value: '+71', kind: 'add' },
  { label: 'Keywords nuevas en top 3', value: '+38', kind: 'add' },
  { label: 'Home', value: '−23', kind: 'remove' },
  { label: 'Agosto', value: '1.284', kind: 'end' }
]

const svgOf = (steps: WaterfallStepInput[], box = REPORT_WATERFALL_BOX) => waterfallSvg(steps, box, { ariaLabel: 'x' })

const rects = (svg: string) => [...svg.matchAll(/<rect class="([^"]+)" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => ({ cls: m[1], x: Number(m[2]), y: Number(m[3]), width: Number(m[4]), height: Number(m[5]) }))

describe('cascada: geometría desde la cifra impresa', () => {
  it('los totales nacen en cero y su largo sale de la cifra (eje redondo 0–1.500 sobre 420 px)', () => {
    const bars = rects(svgOf(CANVAS))

    expect(bars).toHaveLength(6)
    expect(bars[0]).toMatchObject({ cls: 'fig-prior', x: 190, width: 308.6 })
    expect(bars[5]).toMatchObject({ cls: 'fig-current', x: 190, width: 359.5 })
  })

  it('los pasos flotan sobre el acumulado y «−23» resta aunque el «−» sea U+2212', () => {
    const bars = rects(svgOf(CANVAS))

    // Servicios arranca donde termina julio (1.102) y mide 96 · 0,28 = 26,9 px.
    expect(bars[1]).toMatchObject({ cls: 'fig-step--add', x: 498.6, width: 26.9 })
    // La home va de 1.307 a 1.284: su borde izquierdo es el acumulado final, no 23 px a la derecha del anterior.
    expect(bars[4]).toMatchObject({ cls: 'fig-step--remove', x: 549.5, width: 6.4 })
  })

  it('la cifra va a la derecha de su barra, con el signo impreso y el tono de oportunidad sólo en lo que resta', () => {
    const svg = svgOf(CANVAS)

    expect(svg).toContain('class="fig-wf-value fig-wf-value--remove" x="564"')
    expect(svg).toContain('>−23</text>')
    expect(svg).toContain('class="fig-wf-value fig-wf-value--total" x="557.5"')
  })

  it('cada barra se une a la anterior con un conector en el acumulado', () => {
    const connectors = [...svgOf(CANVAS).matchAll(/class="fig-wf-connector" x1="([\d.]+)"/g)].map(m => Number(m[1]))

    expect(connectors).toEqual([498.6, 525.4, 545.3, 556, 549.5])
  })

  it('el eje se redondea desde el mayor acumulado y marca con separador de miles', () => {
    const svg = svgOf(CANVAS)

    expect(waterfallTickLabel(1000)).toBe('1.000')
    expect(waterfallTickLabel(2.5)).toBe('2,5')
    expect(svg).toContain('>1.500</text>')
    expect(svg).not.toContain('>1.400</text>')
  })

  it('el resumen accesible lleva cada fila con su cifra', () => {
    expect(waterfallAria('De 1.102 a 1.284 clics', CANVAS)).toBe(
      'De 1.102 a 1.284 clics. Julio: 1.102. Páginas de servicio: +96. Blog: +71. Keywords nuevas en top 3: +38. Home: −23. Agosto: 1.284.'
    )
  })
})

describe('cascada: falla cerrado', () => {
  it('si el inicial más los pasos no da el final, no se dibuja', () => {
    const wrong = CANVAS.map(step => (step.kind === 'end' ? { ...step, value: '1.290' } : step))

    expect(() => svgOf(wrong)).toThrow(FigureDataError)
    expect(() => svgOf(wrong)).toThrow(/no cuadra/)
  })

  it('una cifra ilegible o un paso sin su signo impreso no se dibuja', () => {
    expect(() => svgOf(CANVAS.map((step, i) => (i === 2 ? { ...step, value: 'n/d' } : step)))).toThrow(FigureDataError)
    expect(() => svgOf(CANVAS.map((step, i) => (i === 2 ? { ...step, value: '71' } : step)))).toThrow(/signo/)
    expect(() => svgOf(CANVAS.map((step, i) => (i === 4 ? { ...step, value: '23' } : step)))).toThrow(/signo/)
  })

  it('va de un total a otro: sin pasos o con los totales fuera de lugar, no se dibuja', () => {
    expect(() => svgOf([CANVAS[0]!, CANVAS[5]!])).toThrow(FigureDataError)
    expect(() => svgOf([CANVAS[1]!, ...CANVAS.slice(1)])).toThrow(FigureDataError)
    expect(() => svgOf([...CANVAS.slice(0, 5), { label: 'Agosto', value: '1.284', kind: 'add' }])).toThrow(FigureDataError)
  })

  it('el acumulado no baja de cero: el eje nace en cero', () => {
    const below: WaterfallStepInput[] = [
      { label: 'Julio', value: '10', kind: 'start' },
      { label: 'Caída', value: '−30', kind: 'remove' },
      { label: 'Rebote', value: '+25', kind: 'add' },
      { label: 'Agosto', value: '5', kind: 'end' }
    ]

    expect(() => svgOf(below)).toThrow(/cero/)
  })

  it('una cascada no se pagina: más pasos que el lienzo (A4 8, deck 6) fallan', () => {
    const many = (count: number): WaterfallStepInput[] => [
      { label: 'Julio', value: '100', kind: 'start' },
      ...Array.from({ length: count }, (_, i) => ({ label: `Paso ${i + 1}`, value: '+1', kind: 'add' as const })),
      { label: 'Agosto', value: String(100 + count), kind: 'end' }
    ]

    expect(() => svgOf(many(8))).not.toThrow()
    expect(() => svgOf(many(9))).toThrow(/no caben/)
    expect(() => svgOf(many(6), DECK_WATERFALL_BOX)).not.toThrow()
    expect(() => svgOf(many(7), DECK_WATERFALL_BOX)).toThrow(/no caben/)
  })

  it('un rótulo parte en hasta dos líneas; más, falla cerrado', () => {
    expect(wrapWaterfallLabel('Keywords nuevas en top 3', 176, 12)).toEqual(['Keywords nuevas en top 3'])
    expect(wrapWaterfallLabel('Sección número 1 del sitio con nombre largo', 176, 12)).toHaveLength(2)
    expect(() => wrapWaterfallLabel('Sección número uno del sitio con un nombre larguísimo que no termina nunca', 176, 12)).toThrow(FigureDataError)
  })
})

describe('cascada: el lienzo', () => {
  it('con seis filas mide lo que el canvas (658 × 296) y la primera barra va en y = 26', () => {
    const svg = svgOf(CANVAS)

    expect(svg).toContain('width="658" height="296" viewBox="0 0 658 296"')
    expect(rects(svg)[0]).toMatchObject({ y: 26, height: 26 })
  })

  it('en la lámina, más filas comprimen el paso: el panel de alto fijo no crece', () => {
    const eight: WaterfallStepInput[] = [
      { label: 'Julio', value: '100', kind: 'start' },
      ...Array.from({ length: 6 }, (_, i) => ({ label: `Paso ${i + 1}`, value: '+1', kind: 'add' as const })),
      { label: 'Agosto', value: '106', kind: 'end' }
    ]

    const svg = svgOf(eight, DECK_WATERFALL_BOX)

    expect(svg).toContain('height="296"')
    expect(rects(svg)[1]!.y - rects(svg)[0]!.y).toBeCloseTo(31, 0)
    expect(rects(svg)[1]!.height).toBeLessThan(26)
  })
})

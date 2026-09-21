import { describe, expect, it } from 'vitest'

import { insightsReportResolvers, parsePrintedNumber } from '../resolvers'

const build = insightsReportResolvers['report-bar-geometry']!.build

const ctxFor = (rows: Record<string, unknown>[], index: number) =>
  ({ slots: { figureSeries: rows }, item: rows[index] }) as never

const row = (printedValue: unknown, valuePct: unknown, emphasis = 'rest') => ({
  name: 'categoría',
  printedValue,
  valuePct,
  emphasis,
  evidenceRef: 'seo.x.2026-08'
})

describe('parsePrintedNumber', () => {
  it('lee el formato de informe es-CL: signo, coma decimal y sufijo', () => {
    expect(parsePrintedNumber('+61,4%')).toBe(61.4)
    expect(parsePrintedNumber('3,1')).toBe(3.1)
    expect(parsePrintedNumber('-12,5 pts')).toBe(-12.5)
  })

  it('trata el punto como separador de miles, no como decimal', () => {
    expect(parsePrintedNumber('1.234,5')).toBe(1234.5)
  })

  it('devuelve null ante algo que no contiene número', () => {
    expect(parsePrintedNumber('sin dato')).toBeNull()
    expect(parsePrintedNumber('—')).toBeNull()
    expect(parsePrintedNumber(null)).toBeNull()
  })
})

describe('report-bar-geometry', () => {
  it('deriva el ancho del dato, no de lo escrito en el prototipo', () => {
    const rows = [row('+100,0%', 100, 'lead'), row('+25,0%', 25)]
    const effects = build('', ctxFor(rows, 1)) as { styleValue?: string }[]

    expect(effects.some(e => e.styleValue === '25%')).toBe(true)
  })

  it('RECHAZA una etiqueta que no representa el valor que dibuja la barra', () => {
    // El caso que la guarda existe para atrapar: la barra diría 25, el texto dice 90.
    const rows = [row('+100,0%', 100, 'lead'), row('+90,0%', 25)]

    expect(() => build('', ctxFor(rows, 1))).toThrow(/etiqueta inconsistente/)
  })

  it('RECHAZA una etiqueta ilegible en vez de saltarse la verificación', () => {
    // Antes este caso apagaba la guarda en silencio: sin número parseable, no se comparaba nada.
    const rows = [row('+100,0%', 100, 'lead'), row('sin dato', 25)]

    expect(() => build('', ctxFor(rows, 1))).toThrow(/no pudo leer el número/)
  })

  it('rechaza una fila sin valuePct numérico', () => {
    const rows = [row('+100,0%', 100, 'lead'), row('+25,0%', null)]

    expect(() => build('', ctxFor(rows, 1))).toThrow(/valuePct numérico/)
  })

  it('aplica el tono como clase, sin que el prototipo lo decida', () => {
    const rows = [row('+100,0%', 100, 'lead'), row('+25,0%', 25)]
    const effects = build('', ctxFor(rows, 0)) as { toneClass?: string }[]

    expect(effects.some(e => e.toneClass === 'lead')).toBe(true)
  })
})

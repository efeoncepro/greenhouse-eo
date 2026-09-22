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

  it('acepta la etiqueta redondeada del valor exacto y sigue rechazando una cifra distinta', () => {
    // El caso real del canary: CTR 1,88 impreso por el formateador canónico como «1,9 %».
    expect(() => build('', ctxFor([row('2,5 %', 2.5, 'lead'), row('1,9 %', 1.88)], 1))).not.toThrow()
    expect(() => build('', ctxFor([row('9.068', 9068, 'lead'), row('2', 1.88)], 1))).not.toThrow()
    expect(() => build('', ctxFor([row('2,5 %', 2.5, 'lead'), row('2,0 %', 1.88)], 1))).toThrow(/etiqueta inconsistente/)
    expect(() => build('', ctxFor([row('9.068', 9068, 'lead'), row('3', 1.88)], 1))).toThrow(/etiqueta inconsistente/)
  })

  it('mide cada scaleGroup contra su propio máximo', () => {
    const rows = [
      { ...row('9.068', 9068, 'lead'), scaleGroup: 'clicks' },
      { ...row('10.662', 10662), scaleGroup: 'clicks' },
      { ...row('488.150', 488150, 'lead'), scaleGroup: 'impressions' },
      { ...row('566.297', 566297), scaleGroup: 'impressions' }
    ]

    const width = (index: number) => (build('', ctxFor(rows, index)) as { styleValue?: string }[]).find(e => e.styleValue)?.styleValue

    // Sin grupos, 9.068 contra 566.297 sería ~1,6 %: una raya. Con su grupo, se compara con 10.662.
    expect(width(1)).toBe('100%')
    expect(Number.parseFloat(width(0)!)).toBeCloseTo(85.05, 1)
    expect(width(3)).toBe('100%')
  })

  it('rechaza una fila sin valuePct numérico', () => {
    const rows = [row('+100,0%', 100, 'lead'), row('+25,0%', null)]

    expect(() => build('', ctxFor(rows, 1))).toThrow(/valuePct numérico/)
  })

  it('aplica el tono como clase, sin que el prototipo lo decida', () => {
    const rows = [row('+100,0%', 100, 'lead'), row('+25,0%', 25)]
    const effects = build('', ctxFor(rows, 0)) as { toneClass?: string }[]

    expect(effects.some(e => e.toneClass === 'tone-lead')).toBe(true)
  })
})

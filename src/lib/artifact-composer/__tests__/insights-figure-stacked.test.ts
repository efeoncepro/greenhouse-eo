/**
 * TASK-1975 — geometría de las barras apiladas: cada segmento mide la cifra impresa dentro de él, el total impreso es la
 * suma de los segmentos y la participación base corresponde a ellos; lo que no cuadra o no cabe falla cerrado.
 */

import { describe, expect, it } from 'vitest'

import {
  DECK_STACKED_BOX,
  REPORT_STACKED_BOX,
  stackedAria,
  stackedColumnsSvg,
  type StackedPeriodInput
} from '../catalogs/insights-shared/figure-stacked'
import { FigureDataError } from '../catalogs/insights-shared/figure-svg'

const legend = [{ label: 'Sin marca' }, { label: 'Con la marca' }]

// Los datos de la hoja `Premium-Apiladas`.
const periods: StackedPeriodInput[] = [
  { label: 'Junio', segments: ['530', '490'], total: '1.020', baseShare: '52 % sin marca' },
  { label: 'Julio', segments: ['604', '498'], total: '1.102', baseShare: '55 % sin marca' },
  { label: 'Agosto', segments: ['772', '512'], total: '1.284', baseShare: '60 % sin marca' }
]

const annotation = { delta: '28 %', direction: 'up' as const, tone: 'better' as const, label: 'sin marca' }

const rect = (svg: string, segment: number, index: number) => {
  const all = [...svg.matchAll(new RegExp(`fig-stk-seg--${segment}" x="[^"]+" y="([^"]+)" width="[^"]+" height="([^"]+)"`, 'g'))]

  return { y: Number(all[index]![1]), height: Number(all[index]![2]) }
}

describe('barras apiladas', () => {
  it('el alto de cada segmento sale de la cifra impresa (eje 0–1.400 como el canvas)', () => {
    const svg = stackedColumnsSvg(legend, periods, REPORT_STACKED_BOX, { annotation, ariaLabel: 'x' })

    // 530 de 1.400 sobre 236 px = 89,3 px; la cima del segmento superior es el total 1.020 (y = 78,1).
    expect(rect(svg, 0, 0)).toEqual({ y: 160.7, height: 89.3 })
    expect(rect(svg, 1, 0).y).toBe(78.1)
    expect(svg).toContain('>1.400</text>')
    expect(svg).toContain('>1.284</text>')
    expect(svg).toContain('>+28 %</text>')
    expect(svg).toContain('fig-stk-delta--better')
  })

  it('el total impreso que no es la suma de sus segmentos no se dibuja', () => {
    const wrong = [periods[0]!, { ...periods[1]!, total: '1.200' }]

    expect(() => stackedColumnsSvg(legend, wrong, REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })

  it('una participación base que no corresponde a los segmentos falla', () => {
    const wrong = [periods[0]!, { ...periods[1]!, baseShare: '70 % sin marca' }]

    expect(() => stackedColumnsSvg(legend, wrong, REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })

  it('una cifra ilegible o negativa no se inventa', () => {
    expect(() =>
      stackedColumnsSvg(legend, [periods[0]!, { ...periods[1]!, segments: ['n/d', '498'] }], REPORT_STACKED_BOX, { ariaLabel: 'x' })
    ).toThrow(FigureDataError)
    expect(() =>
      stackedColumnsSvg(legend, [periods[0]!, { ...periods[1]!, segments: ['-4', '498'] }], REPORT_STACKED_BOX, { ariaLabel: 'x' })
    ).toThrow(FigureDataError)
  })

  it('la anotación tiene que decir la dirección y la magnitud del segmento base', () => {
    expect(() => stackedColumnsSvg(legend, periods, REPORT_STACKED_BOX, { annotation: { ...annotation, direction: 'down' }, ariaLabel: 'x' })).toThrow(
      FigureDataError
    )
    expect(() => stackedColumnsSvg(legend, periods, REPORT_STACKED_BOX, { annotation: { ...annotation, delta: '40 %' }, ariaLabel: 'x' })).toThrow(
      FigureDataError
    )
    // La que emite el mapper (un decimal) también cuadra.
    expect(() => stackedColumnsSvg(legend, periods, REPORT_STACKED_BOX, { annotation: { ...annotation, delta: '27,8 %' }, ariaLabel: 'x' })).not.toThrow()
  })

  it('un segmento bajo lleva su cifra fuera, a la derecha de la columna', () => {
    const thin = [
      { label: 'Junio', segments: ['900', '20'], total: '920', baseShare: '98 % sin marca' },
      { label: 'Julio', segments: ['950', '30'], total: '980', baseShare: '97 % sin marca' }
    ]

    const svg = stackedColumnsSvg(legend, thin, REPORT_STACKED_BOX, { ariaLabel: 'x' })

    expect(svg).toContain('fig-stk-value--1 fig-stk-value--out')
  })

  it('el período real largo cabe en dos líneas; si no cabe, falla cerrado', () => {
    const long = (label: string, base: number) => ({ label, segments: [String(base), '100'], total: String(base + 100), baseShare: `${Math.round((base / (base + 100)) * 100)} % con interacción` })

    const six = ['abril de 2026', 'mayo de 2026', 'junio de 2026', 'julio de 2026', 'agosto de 2026', 'septiembre de 2026'].map((label, i) => long(label, 300 + i * 10))
    const svg = stackedColumnsSvg([{ label: 'Con interacción' }, { label: 'Sin interacción' }], six, REPORT_STACKED_BOX, { ariaLabel: 'x' })

    // A seis columnas el período parte en dos líneas y el área del gráfico cede ese alto: la figura no crece.
    expect(svg).toContain('<tspan')
    expect(svg).toContain(`height="${REPORT_STACKED_BOX.height}"`)

    // A seis columnas (≈ 90 px) un rótulo de tres líneas no cabe: la figura no se emite.
    const tooLong = [{ ...six[0]!, label: 'primera quincena de septiembre de 2026' }, ...six.slice(1)]

    expect(() => stackedColumnsSvg([{ label: 'Con interacción' }, { label: 'Sin interacción' }], tooLong, REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })

  it('la lámina 16:9 dibuja con la misma geometría y cuerpos mayores; la anotación larga corre las columnas', () => {
    const svg = stackedColumnsSvg(legend, periods, DECK_STACKED_BOX, { annotation, ariaLabel: 'x' })

    expect(rect(svg, 0, 0)).toEqual({ y: 160.7, height: 89.3 })
    expect(svg).toContain('font-size="16.5"')

    const wide = stackedColumnsSvg(legend, periods, DECK_STACKED_BOX, { annotation: { ...annotation, label: 'con interacción' }, ariaLabel: 'x' })

    expect(Number(/fig-stk-seg--0" x="([^"]+)"/.exec(wide)![1])).toBeLessThan(110)
  })

  it('segmentos de más o de menos y un solo período fallan', () => {
    expect(() => stackedColumnsSvg([{ label: 'a' }], periods, REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
    expect(() => stackedColumnsSvg(legend, [periods[0]!], REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
    expect(() => stackedColumnsSvg([...legend, { label: 'c' }], periods, REPORT_STACKED_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })

  it('el resumen accesible dice cada segmento y el total', () => {
    expect(stackedAria('Clics', legend, periods.slice(0, 1), annotation)).toBe('Clics. Junio: Sin marca 530, Con la marca 490; total 1.020. Variación de sin marca en el último período: subió 28 %.')
  })
})

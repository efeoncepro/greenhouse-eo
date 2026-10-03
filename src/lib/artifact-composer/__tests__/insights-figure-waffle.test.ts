/**
 * TASK-1975 — waffle por unidad de los catálogos premium de Insights: un cuadro es una unidad, la cantidad de
 * cuadros sale de la cuenta IMPRESA en la leyenda y todo lo que no es un conteo legible falla cerrado.
 */

import { describe, expect, it } from 'vitest'

import { FigureDataError } from '../catalogs/insights-shared/figure-svg'
import {
  DECK_WAFFLE_BOX,
  REPORT_WAFFLE_BOX,
  waffleAria,
  waffleKeyFigureIsLong,
  waffleSvg,
  waffleTones,
  type WafflePartInput
} from '../catalogs/insights-shared/figure-waffle'

const cellsOf = (svg: string): string[] => svg.match(/<rect class="waffle-cell [^"]*"[^>]*>/g) ?? []

const canvasParts: WafflePartInput[] = [
  { label: 'Primera página (1 a 10)', count: '26' },
  { label: 'A un paso (11 a 20)', count: '21', role: 'opportunity', tag: 'Oportunidad' },
  { label: 'Posiciones 21 a 50', count: '27' },
  { label: 'Sin posición', count: '26', role: 'absence' }
]

describe('waffle por unidad', () => {
  it('8 unidades son 8 cuadros, no 100 repartidos por participación', () => {
    const figure = waffleSvg(
      [
        { label: 'Con enlace', count: '5' },
        { label: 'Sin enlace', count: '3' }
      ],
      REPORT_WAFFLE_BOX,
      { ariaLabel: 'x' }
    )

    expect(cellsOf(figure.svg)).toHaveLength(8)
    expect(cellsOf(figure.svg).filter(cell => cell.includes('waffle-tone--current'))).toHaveLength(5)
    expect(cellsOf(figure.svg).filter(cell => cell.includes('waffle-tone--opportunity'))).toHaveLength(3)

    // Hasta 30 unidades, 5 columnas; el cuadro no se infla más allá del techo de la caja.
    expect(figure.columns).toBe(5)
    expect(figure.rows).toBe(2)
    expect(figure.cell).toBe(REPORT_WAFFLE_BOX.maxCell)
  })

  it('cien unidades llenan la retícula del canvas: 10 columnas de 22 px en A4 y de 21 en el deck', () => {
    const report = waffleSvg(canvasParts, REPORT_WAFFLE_BOX, { ariaLabel: 'x' })
    const deck = waffleSvg(canvasParts, DECK_WAFFLE_BOX, { ariaLabel: 'x' })

    expect(cellsOf(report.svg)).toHaveLength(100)
    expect(report.columns).toBe(10)
    expect(report.cell).toBe(22)
    expect(report.svg).toContain('width="256" height="256"')
    expect(deck.cell).toBe(21)
    expect(deck.svg).toContain('width="246" height="246"')

    // Llenado fila por fila en el orden de las partes: el cuadro 27 (índice 26) ya es de la oportunidad.
    expect(cellsOf(report.svg)[25]).toContain('waffle-tone--current')
    expect(cellsOf(report.svg)[26]).toContain('waffle-tone--opportunity')
    expect(cellsOf(report.svg)[26]).toContain('x="156" y="52"')

    // La ausencia va rayada, con el patrón declarado una sola vez.
    expect(cellsOf(report.svg).filter(cell => cell.includes('fill="url(#waffleAbsence)"'))).toHaveLength(26)
    expect(report.svg.match(/<pattern /g)).toHaveLength(1)
  })

  it('una cuenta que no es una unidad entera, o un total vacío o de más de cien, falla cerrado', () => {
    const draw = (parts: WafflePartInput[]) => () => waffleSvg(parts, REPORT_WAFFLE_BOX, { ariaLabel: 'x' })

    expect(draw([{ label: 'A', count: '2,5' }, { label: 'B', count: '3' }])).toThrow(FigureDataError)
    expect(draw([{ label: 'A', count: '—' }, { label: 'B', count: '3' }])).toThrow(FigureDataError)
    expect(draw([{ label: 'A', count: '0' }, { label: 'B', count: '0' }])).toThrow(FigureDataError)
    expect(draw([{ label: 'A', count: '60' }, { label: 'B', count: '41' }])).toThrow(FigureDataError)
    expect(draw([{ label: 'A', count: '1' }])).toThrow(FigureDataError)
  })

  it('sin rol, el tono sale del orden; con oportunidad declarada, el coral es sólo suyo', () => {
    const plain = ['A', 'B', 'C', 'D'].map(label => ({ label, count: '1' }))

    expect(waffleTones(plain)).toEqual(['current', 'opportunity', 'prior', 'step'])
    expect(waffleTones(canvasParts)).toEqual(['current', 'opportunity', 'prior', 'absence'])
    expect(
      waffleTones([
        { label: 'A', count: '1', role: 'opportunity' },
        { label: 'B', count: '1' },
        { label: 'C', count: '1' }
      ])
    ).toEqual(['opportunity', 'current', 'prior'])
  })

  it('la ausencia es única y va al final; la oportunidad, a lo más una', () => {
    expect(() => waffleTones([{ label: 'A', count: '1', role: 'absence' }, { label: 'B', count: '1' }])).toThrow(FigureDataError)
    expect(() =>
      waffleTones([
        { label: 'A', count: '1', role: 'opportunity' },
        { label: 'B', count: '1', role: 'opportunity' }
      ])
    ).toThrow(FigureDataError)
  })

  it('el resumen accesible lleva cada cuenta, y la cifra principal larga baja de cuerpo', () => {
    expect(waffleAria('100 keywords', canvasParts)).toBe(
      '100 keywords. Primera página (1 a 10): 26. A un paso (11 a 20): 21. Posiciones 21 a 50: 27. Sin posición: 26.'
    )
    expect(waffleKeyFigureIsLong('74 de 100', REPORT_WAFFLE_BOX)).toBe(true)
    expect(waffleKeyFigureIsLong('62 %', REPORT_WAFFLE_BOX)).toBe(false)
  })
})

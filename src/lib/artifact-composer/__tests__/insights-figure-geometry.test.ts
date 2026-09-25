/**
 * TASK-1889 Slice 4 — geometría de las figuras premium: toda medida sale de la cifra impresa y una cifra
 * que no se puede leer falla cerrado (nunca una columna, un punto o una barra inventados).
 */

import { describe, expect, it } from 'vitest'

import { bulletRowEffects, deltaToneEffects, iconEffects, pairBarsEffects } from '../catalogs/insights-shared/editorial-resolvers'
import { deckFigureSizeClass } from '../catalogs/insights-shared/figure-hooks'
import {
  FigureDataError,
  groupedColumnsSvg,
  lineChartSvg,
  niceAxis,
  REPORT_COLUMNS_BOX,
  REPORT_LINES_BOX
} from '../catalogs/insights-shared/figure-svg'

describe('eje redondo', () => {
  it('contiene el máximo con a lo más N intervalos (29 → 30 de a 10, como el canvas)', () => {
    expect(niceAxis(29)).toEqual({ top: 30, step: 10 })
    expect(niceAxis(56, 3)).toEqual({ top: 60, step: 20 })
    expect(niceAxis(1412)).toEqual({ top: 1500, step: 500 })
  })
})

describe('columnas agrupadas', () => {
  const groups = [
    { label: '1–3', current: '9', prior: '6', delta: '+3', direction: 'up' as const },
    { label: '4–10', current: '17', prior: '15' }
  ]

  it('el alto de la columna sale de la cifra impresa sobre ella', () => {
    const svg = groupedColumnsSvg(groups, REPORT_COLUMNS_BOX, { ariaLabel: 'x' })

    // 9 de un eje de 20 (tope redondo de 17) sobre 234 px de alto = 105,3 px.
    expect(svg).toContain('height="105.3"')
    expect(svg).toContain('>9</text>')
  })

  it('una cifra ilegible o negativa no se dibuja', () => {
    expect(() => groupedColumnsSvg([{ label: 'a', current: 'n/d' }, { label: 'b', current: '3' }], REPORT_COLUMNS_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
    expect(() => groupedColumnsSvg([{ label: 'a', current: '-2' }, { label: 'b', current: '3' }], REPORT_COLUMNS_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })

  it('o todos los grupos traen el anterior o ninguno', () => {
    expect(() => groupedColumnsSvg([{ label: 'a', current: '1', prior: '2' }, { label: 'b', current: '3' }], REPORT_COLUMNS_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })
})

describe('líneas', () => {
  it('un hueco corta la línea: nunca se interpola', () => {
    const svg = lineChartSvg(
      [{ label: 'Clics', role: 'primary', values: ['10', null, '12', '14'] }],
      [{ index: 0, label: 'jul' }],
      REPORT_LINES_BOX,
      { ariaLabel: 'x' }
    )

    const d = /fig-line--primary" d="([^"]+)"/.exec(svg)![1]!

    expect(d.match(/M/g)).toHaveLength(2)
  })

  it('dos series con el mismo rol no se distinguen en gris: falla', () => {
    expect(() =>
      lineChartSvg(
        [
          { label: 'A', role: 'primary', values: ['1', '2'] },
          { label: 'B', role: 'primary', values: ['1', '2'] }
        ],
        [],
        REPORT_LINES_BOX,
        { ariaLabel: 'x' }
      )
    ).toThrow(FigureDataError)
  })
})

describe('resolvers de figura', () => {
  it('las barras del par se escalan contra el mayor de los dos', () => {
    expect(pairBarsEffects({ current: '1.284', prior: '1.102' })).toEqual([
      { selector: '.bar-current', styleProp: '--fill', styleValue: '1.0000' },
      { selector: '.bar-prior', styleProp: '--fill', styleValue: '0.8583' }
    ])
    expect(pairBarsEffects({ current: '12' })).toContainEqual({ selector: '.pair-prior', remove: true })
  })

  it('la dirección es forma: una clave desconocida falla cerrado', () => {
    expect(deltaToneEffects('down')).toContainEqual({ selector: '.delta-mark-up', remove: true })
    expect(deltaToneEffects('bien')).toBeNull()
    expect(iconEffects('undefined')).toEqual([{ selector: ':field', remove: true }])
    expect(iconEffects('cohete')).toBeNull()
  })

  it('la mayor brecha se decide con todas las filas y la dirección', () => {
    const rows = [
      { value: '1.284', target: '1.200' },
      { value: '26', target: '30' },
      { value: '19', target: '25' }
    ]

    const slots = { bulletRows: rows, bulletDirection: 'higher_is_better' }

    expect(bulletRowEffects(rows[2]!, slots)).toContainEqual({ selector: ':self', toneClass: 'bullet--gap', toneGroup: ['bullet--gap'] })
    expect(bulletRowEffects(rows[1]!, slots)?.some(e => e.toneClass === 'bullet--gap')).toBe(false)
    expect(bulletRowEffects(rows[0]!, slots)).toContainEqual({ selector: ':self', styleProp: '--achieved', styleValue: '90.9%' })

    // Con «menos es mejor», quedar sobre la meta es la brecha.
    const lower = { bulletRows: [{ value: '3', target: '2' }, { value: '1', target: '2' }], bulletDirection: 'lower_is_better' }

    expect(bulletRowEffects({ value: '3', target: '2' }, lower)).toContainEqual({ selector: ':self', toneClass: 'bullet--gap', toneGroup: ['bullet--gap'] })
  })

  it('el cuerpo de la cifra del deck sale de su largo', () => {
    expect(deckFigureSizeClass('+3')).toBe('fig-number--lg')
    expect(deckFigureSizeClass('107 %')).toBe('fig-number--md')
    expect(deckFigureSizeClass('+16,5 %')).toBeNull()
  })
})

/**
 * TASK-1975 — geometría de la dona: cada porción sale de la cuenta impresa en su fila, la participación se verifica
 * contra la cuenta y todo lo que no se puede dibujar con honestidad falla cerrado (una sola parte, más de tres,
 * cuentas ilegibles o negativas, roles repetidos, rótulo del centro que no cabe).
 */

import { describe, expect, it } from 'vitest'

import {
  DECK_DONUT_BOX,
  donutAria,
  donutSlices,
  donutSvg,
  donutTones,
  REPORT_DONUT_BOX,
  type DonutPartInput
} from '../catalogs/insights-shared/figure-donut'
import { FigureDataError } from '../catalogs/insights-shared/figure-svg'

// Datos de la hoja `Premium-Donut` del canvas aprobado.
const canvas: DonutPartInput[] = [
  { label: 'Cita con enlace', count: '19', share: '38 %', icon: 'link' },
  { label: 'Menciona sin enlace', count: '12', share: '24 %', role: 'opportunity', icon: 'quote' },
  { label: 'No la menciona', count: '19', share: '38 %', role: 'absence', icon: 'eye-off' }
]

const center = { value: '62 %', label: 'nombra la marca' }

describe('porciones de la dona', () => {
  it('salen de la cuenta impresa con la geometría del canvas (radios 140/94, 2 px entre porciones)', () => {
    const slices = donutSlices(canvas, REPORT_DONUT_BOX)

    // Las coordenadas del SVG aprobado de `Premium-Donut`, a una décima de píxel (el canvas redondeó a mano).
    const numbers = (path: string | null) => (path ?? '').match(/-?\d+(?:\.\d+)?/g)!.map(Number)

    const approved = [
      'M 151.5 10.0 A 140 140 0 0 1 246.9 251.0 L 215.1 217.8 A 94 94 0 0 0 151.0 56.0 Z',
      'M 244.8 253.1 A 140 140 0 0 1 55.2 253.1 L 86.4 219.2 A 94 94 0 0 0 213.6 219.2 Z',
      'M 53.1 251.0 A 140 140 0 0 1 148.5 10.0 L 149.0 56.0 A 94 94 0 0 0 84.9 217.8 Z'
    ]

    approved.forEach((path, index) => {
      const got = numbers(slices[index]!.path)

      numbers(path).forEach((value, at) => expect(Math.abs(got[at]! - value)).toBeLessThanOrEqual(0.11))
    })
    expect(slices.map(slice => slice.tone)).toEqual(['current', 'opportunity', 'absence'])
  })

  it('cambiar la cuenta mueve la porción (nunca un ángulo a mano)', () => {
    const more = donutSlices(
      [
        { label: 'A', count: '30', share: '75 %' },
        { label: 'B', count: '10', share: '25 %' }
      ],
      DECK_DONUT_BOX
    )

    // 75 % > 180°: arco largo.
    expect(more[0]!.path).toContain('A 140 140 0 1 1')
    expect(more[1]!.path).toContain('A 140 140 0 0 1')
  })

  it('una parte en cero no dibuja porción (su fila sí queda)', () => {
    const slices = donutSlices(
      [
        { label: 'A', count: '5', share: '100 %' },
        { label: 'B', count: '0', share: '0 %' }
      ],
      REPORT_DONUT_BOX
    )

    expect(slices[1]!.path).toBeNull()
  })

  it('falla cerrado con una sola parte o con más de tres', () => {
    expect(() => donutSlices([canvas[0]!], REPORT_DONUT_BOX)).toThrow(FigureDataError)
    expect(() => donutSlices([...canvas, { label: 'D', count: '1', share: '2 %' }], REPORT_DONUT_BOX)).toThrow(FigureDataError)
  })

  it('falla cerrado con cuentas ilegibles, negativas o un total vacío', () => {
    expect(() => donutSlices([{ label: 'A', count: 'n/d', share: '50 %' }, canvas[1]!], REPORT_DONUT_BOX)).toThrow(FigureDataError)
    expect(() => donutSlices([{ label: 'A', count: '-3', share: '50 %' }, canvas[1]!], REPORT_DONUT_BOX)).toThrow(FigureDataError)
    expect(() =>
      donutSlices(
        [
          { label: 'A', count: '0', share: '0 %' },
          { label: 'B', count: '0', share: '0 %' }
        ],
        REPORT_DONUT_BOX
      )
    ).toThrow(FigureDataError)
  })

  it('una participación que no corresponde a su cuenta no se dibuja', () => {
    expect(() =>
      donutSlices(
        [
          { label: 'A', count: '19', share: '50 %' },
          { label: 'B', count: '31', share: '50 %' }
        ],
        REPORT_DONUT_BOX
      )
    ).toThrow(FigureDataError)
  })

  it('«<1 %» vale 0 en la suma y sólo se acepta para una parte con cuenta y menos del 1 % (caso real Berel 2026-09)', () => {
    const real = [
      { label: 'ChatGPT', count: '1.648', share: '98 %' },
      { label: 'Gemini', count: '30', share: '2 %' },
      { label: 'Otros asistentes', count: '8', share: '<1 %' }
    ]

    expect(donutSlices(real, REPORT_DONUT_BOX)).toHaveLength(3)
    expect(() => donutSlices([...real.slice(0, 2), { label: 'Otros asistentes', count: '0', share: '<1 %' }], REPORT_DONUT_BOX)).toThrow(FigureDataError)
    expect(() =>
      donutSlices(
        [
          { label: 'A', count: '90', share: '90 %' },
          { label: 'B', count: '10', share: '<1 %' }
        ],
        REPORT_DONUT_BOX
      )
    ).toThrow(FigureDataError)
  })
})

describe('tonos de las partes', () => {
  it('sin rol, por orden: actual → anterior → paso (el coral sólo con rol de oportunidad)', () => {
    expect(donutTones([{ label: 'a' }, { label: 'b' }, { label: 'c' }])).toEqual(['current', 'prior', 'step'])
  })

  it('un rol declarado manda y las demás toman los tonos libres', () => {
    expect(donutTones([{ label: 'a', role: 'opportunity' }, { label: 'b' }, { label: 'c' }])).toEqual(['opportunity', 'current', 'prior'])
    expect(donutTones([{ label: 'a' }, { label: 'b', role: 'absence' }])).toEqual(['current', 'absence'])
  })

  it('dos partes con el mismo rol o una dona sólo de ausencia fallan cerrado', () => {
    expect(() => donutTones([{ label: 'a', role: 'absence' }, { label: 'b', role: 'absence' }])).toThrow(FigureDataError)
    expect(() => donutTones([{ label: 'a', role: 'opportunity' }, { label: 'b', role: 'opportunity' }])).toThrow(FigureDataError)
  })
})

describe('marcado de la dona', () => {
  it('lleva centro, rayado de ausencia sólo si hay ausencia y un resumen accesible con las cuentas', () => {
    const aria = donutAria('Cómo aparece la marca', canvas)
    const svg = donutSvg(canvas, center, REPORT_DONUT_BOX, { ariaLabel: aria })

    expect(aria).toBe('Cómo aparece la marca. Cita con enlace: 19 (38 %). Menciona sin enlace: 12 (24 %). No la menciona: 19 (38 %).')
    expect(svg).toContain(`aria-label="${aria}"`)
    expect(svg).toContain('role="img"')
    expect(svg).toContain('>62 %</text>')
    expect(svg).toContain('>nombra la marca</text>')
    expect(svg).toContain('fill="url(#donutAbsence)"')
    expect(svg).toContain('class="fig-donut-hole"')
    // Sin HEX: el color lo pone la plantilla con sus roles.
    expect(svg).not.toMatch(/#[0-9a-f]{3,6}\b/i)

    const plain = donutSvg(canvas.slice(0, 2).map(part => ({ ...part, share: part.count === '19' ? '61 %' : '39 %' })), center, DECK_DONUT_BOX, { ariaLabel: 'x' })

    expect(plain).not.toContain('donutAbsence')
    expect(plain).not.toContain('fig-donut-hole')
  })

  it('el rótulo del centro parte en dos líneas como mucho; sin cifra o rótulo, falla cerrado', () => {
    const two = donutSvg(canvas, { value: '50', label: 'respuestas medidas en los cuatro motores' }, REPORT_DONUT_BOX, { ariaLabel: 'x' })

    expect(two.match(/class="fig-donut-label"/g)).toHaveLength(2)
    expect(() => donutSvg(canvas, { value: '50', label: 'una etiqueta tan larga que de ninguna manera cabe en dos líneas del hueco de la dona' }, REPORT_DONUT_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
    expect(() => donutSvg(canvas, { value: '', label: 'en total' }, REPORT_DONUT_BOX, { ariaLabel: 'x' })).toThrow(FigureDataError)
  })
})

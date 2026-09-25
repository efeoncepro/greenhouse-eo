import { describe, expect, it } from 'vitest'

import { parsePrintedNumber } from '../resolvers'

// La geometría de figura v1 (`report-bar-geometry`) se retiró con la página analítica (TASK-1889 Slice 4);
// las figuras premium la prueban en `__tests__/insights-figure-geometry.test.ts`.

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

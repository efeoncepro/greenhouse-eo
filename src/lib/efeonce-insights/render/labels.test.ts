import { describe, expect, it } from 'vitest'

import { periodLabelOf } from './labels'

const at = (start: string, endExclusive: string) => ({ request: { period: { start, endExclusive, timeZone: 'America/Santiago' } } }) as never

describe('periodLabelOf', () => {
  it('rotula la ventana que la edición midió, no el mes de su inicio', () => {
    // Caso real del canary: una edición del 1 al 20 de septiembre decía «Septiembre de 2026».
    expect(periodLabelOf(at('2026-09-01', '2026-09-21'))).toBe('1–20 de septiembre de 2026')
    expect(periodLabelOf(at('2026-08-01', '2026-09-01'))).toBe('Agosto de 2026')
    expect(periodLabelOf(at('2026-07-01', '2026-10-01'))).toBe('Julio a septiembre de 2026')
    expect(periodLabelOf(at('2026-08-12', '2026-09-21'))).toBe('12 ago–20 sept 2026')
    expect(periodLabelOf(at('2025-12-15', '2026-01-16'))).toBe('15 dic 2025–15 ene 2026')
  })

  it('ningún rótulo excede el presupuesto más estrecho que lo imprime (28)', () => {
    const worst = [
      at('2026-09-12', '2026-10-01'),
      at('2026-09-30', '2026-12-31'),
      at('2025-11-01', '2026-02-01'),
      at('2025-09-30', '2026-12-31')
    ]

    for (const edition of worst) expect(periodLabelOf(edition).length, periodLabelOf(edition)).toBeLessThanOrEqual(28)
  })
})

import { describe, expect, it } from 'vitest'

import { HIRING_AVAILABILITY_CATALOG, resolveHiringAvailability } from './availability'

// TASK-1736 Slice 1 — availability server-side contra el catálogo estable (parity con el select
// del Growth Form). Fallback tolerante: fuera de catálogo se CONSERVA, jamás rechaza.

describe('resolveHiringAvailability', () => {
  it('el catálogo une las opciones de ambos locales del SSOT de copy', () => {
    expect(HIRING_AVAILABILITY_CATALOG).toContain('Inmediata')
    expect(HIRING_AVAILABILITY_CATALOG).toContain('Immediate')
    expect(HIRING_AVAILABILITY_CATALOG.length).toBeGreaterThanOrEqual(8)
  })

  it('match exacto devuelve el valor canónico y lo marca in-catalog', () => {
    expect(resolveHiringAvailability('Inmediata')).toEqual({ value: 'Inmediata', inCatalog: true })
    expect(resolveHiringAvailability('2 to 4 weeks')).toEqual({ value: '2 to 4 weeks', inCatalog: true })
  })

  it('match mecánico-seguro (case-insensitive + whitespace) canonicaliza al valor del catálogo', () => {
    expect(resolveHiringAvailability('inmediata')).toEqual({ value: 'Inmediata', inCatalog: true })
    expect(resolveHiringAvailability('  2 a 4   semanas ')).toEqual({ value: '2 a 4 semanas', inCatalog: true })
    expect(resolveHiringAvailability('ESTOY EXPLORANDO')).toEqual({ value: 'Estoy explorando', inCatalog: true })
  })

  it('fuera de catálogo se conserva como texto acotado, NUNCA rechaza (fallback tolerante)', () => {
    expect(resolveHiringAvailability('Depende del proyecto')).toEqual({
      value: 'Depende del proyecto',
      inCatalog: false
    })
  })

  it('vacío/null → null sin catálogo', () => {
    expect(resolveHiringAvailability(null)).toEqual({ value: null, inCatalog: false })
    expect(resolveHiringAvailability('   ')).toEqual({ value: null, inCatalog: false })
    expect(resolveHiringAvailability(undefined)).toEqual({ value: null, inCatalog: false })
  })
})

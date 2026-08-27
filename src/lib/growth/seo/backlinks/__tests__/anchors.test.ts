import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { classifyAnchor, deriveAnchorProfile, deriveBrandTokens } from '../anchors'

describe('deriveBrandTokens', () => {
  it('label principal + dominio entero; www fuera; tokens cortos descartados', () => {
    expect(deriveBrandTokens('berel.com.mx')).toEqual(['berel', 'berel.com.mx'])
    expect(deriveBrandTokens('www.Efeonce.cl')).toEqual(['efeonce', 'efeonce.cl'])
  })
})

describe('classifyAnchor', () => {
  const brand = deriveBrandTokens('berel.com.mx')

  it('clasifica marca / genérico / url / exacto', () => {
    expect(classifyAnchor('Pinturas Berel', brand)).toBe('brand')
    expect(classifyAnchor('click aquí', brand)).toBe('generic')
    expect(classifyAnchor('https://berel.com.mx/productos', brand)).toBe('url')
    expect(classifyAnchor('www.otrositio.cl', brand)).toBe('url')
    expect(classifyAnchor('mejor pintura para exteriores', brand)).toBe('other')
    expect(classifyAnchor('', brand)).toBe('generic')
  })
})

describe('deriveAnchorProfile', () => {
  const brand = deriveBrandTokens('berel.com.mx')

  it('concentración del dominante + mezcla ponderada por backlinks', () => {
    const profile = deriveAnchorProfile(
      [
        { anchor: 'berel', backlinks: 50 },
        { anchor: 'mejor pintura', backlinks: 30 },
        { anchor: 'click aquí', backlinks: 20 }
      ],
      brand
    )

    expect(profile.totalBacklinks).toBe(100)
    expect(profile.dominantAnchor).toBe('berel')
    expect(profile.dominantShare).toBeCloseTo(0.5)
    expect(profile.brandShare).toBeCloseTo(0.5)
    expect(profile.otherShare).toBeCloseTo(0.3)
    expect(profile.genericShare).toBeCloseTo(0.2)
  })

  it('sin pesos → shares null, jamás ceros fantasma', () => {
    const profile = deriveAnchorProfile([{ anchor: 'algo', backlinks: null }], brand)

    expect(profile.totalBacklinks).toBe(0)
    expect(profile.dominantShare).toBeNull()
    expect(profile.brandShare).toBeNull()
  })
})

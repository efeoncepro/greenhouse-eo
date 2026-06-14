import { describe, expect, it } from 'vitest'

import {
  CARD_DENSITY_BREAKPOINTS,
  compareCardDensity,
  isCardDensity,
  isCardDensityAtLeast,
  resolveCardDensity,
  resolveCardDensityRequest
} from './card-density'

describe('resolveCardDensity (ancho del card → fit mode)', () => {
  it('sin ancho medido (SSR / primer paint) → full (never-hidden)', () => {
    expect(resolveCardDensity()).toBe('full')
    expect(resolveCardDensity(null)).toBe('full')
    expect(resolveCardDensity(0)).toBe('full')
    expect(resolveCardDensity(-10)).toBe('full')
  })

  it('mapea ancho → fit mode por breakpoints', () => {
    expect(resolveCardDensity(480)).toBe('full')
    expect(resolveCardDensity(CARD_DENSITY_BREAKPOINTS.condensed)).toBe('full') // límite inferior de full
    expect(resolveCardDensity(CARD_DENSITY_BREAKPOINTS.condensed - 1)).toBe('condensed')
    expect(resolveCardDensity(280)).toBe('condensed')
    expect(resolveCardDensity(CARD_DENSITY_BREAKPOINTS.peek)).toBe('condensed') // límite inferior de condensed
    expect(resolveCardDensity(CARD_DENSITY_BREAKPOINTS.peek - 1)).toBe('peek')
    expect(resolveCardDensity(120)).toBe('peek')
  })
})

describe('resolveCardDensityRequest (request del consumer + ancho)', () => {
  it('undefined → full (default: card no adopta densidad, legacy intacto)', () => {
    expect(resolveCardDensityRequest(undefined)).toBe('full')
    expect(resolveCardDensityRequest(undefined, 100)).toBe('full') // ignora el ancho
  })

  it('request fijo → se respeta (override, ignora el ancho)', () => {
    expect(resolveCardDensityRequest('condensed', 1000)).toBe('condensed')
    expect(resolveCardDensityRequest('peek', 1000)).toBe('peek')
    expect(resolveCardDensityRequest('full', 100)).toBe('full')
  })

  it("'auto' → resuelve por el ancho medido", () => {
    expect(resolveCardDensityRequest('auto', 500)).toBe('full')
    expect(resolveCardDensityRequest('auto', 280)).toBe('condensed')
    expect(resolveCardDensityRequest('auto', 120)).toBe('peek')
    expect(resolveCardDensityRequest('auto', null)).toBe('full') // sin medir aún
  })
})

describe('predicates + comparadores', () => {
  it('isCardDensity', () => {
    expect(isCardDensity('full')).toBe(true)
    expect(isCardDensity('condensed')).toBe(true)
    expect(isCardDensity('peek')).toBe(true)
    expect(isCardDensity('compact')).toBe(false)
    expect(isCardDensity(undefined)).toBe(false)
  })

  it('compareCardDensity: full es más rico que condensed que peek', () => {
    expect(compareCardDensity('full', 'condensed')).toBeLessThan(0)
    expect(compareCardDensity('condensed', 'peek')).toBeLessThan(0)
    expect(compareCardDensity('peek', 'full')).toBeGreaterThan(0)
    expect(compareCardDensity('full', 'full')).toBe(0)
  })

  it('isCardDensityAtLeast: ¿el modo es al menos tan condensado como el floor?', () => {
    // "¿oculto el subtitle (a partir de condensed)?"
    expect(isCardDensityAtLeast('condensed', 'condensed')).toBe(true)
    expect(isCardDensityAtLeast('peek', 'condensed')).toBe(true)
    expect(isCardDensityAtLeast('full', 'condensed')).toBe(false)
    // "¿muestro solo el value (a partir de peek)?"
    expect(isCardDensityAtLeast('peek', 'peek')).toBe(true)
    expect(isCardDensityAtLeast('condensed', 'peek')).toBe(false)
  })
})

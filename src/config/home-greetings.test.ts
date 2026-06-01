import { describe, expect, it } from 'vitest'

import { HOME_GREETING_CATALOG, pickHomeGreeting } from './home-greetings'

const at = (year: number, month0: number, day: number, hour: number) => new Date(year, month0, day, hour, 0, 0)

describe('pickHomeGreeting', () => {
  it('uses the time-of-day pool as the first weighted candidate (deterministic rng)', () => {
    // base pool is pushed first → index 0 is always its first entry.
    expect(pickHomeGreeting(at(2026, 5, 10, 3), () => 0)).toBe(HOME_GREETING_CATALOG.madrugada[0])
    expect(pickHomeGreeting(at(2026, 5, 10, 9), () => 0)).toBe(HOME_GREETING_CATALOG.manana[0])
    expect(pickHomeGreeting(at(2026, 5, 10, 15), () => 0)).toBe(HOME_GREETING_CATALOG.tarde[0])
    expect(pickHomeGreeting(at(2026, 5, 10, 21), () => 0)).toBe(HOME_GREETING_CATALOG.noche[0])
  })

  it('always returns a real catalog template for any hour/rng', () => {
    const all = new Set(Object.values(HOME_GREETING_CATALOG).flat())

    for (let h = 0; h < 24; h++) {
      for (let r = 0; r < 20; r++) {
        const greeting = pickHomeGreeting(at(2026, 8, 18, h), () => r / 20)

        expect(greeting.length).toBeGreaterThan(0)
        expect(all.has(greeting)).toBe(true)
      }
    }
  })

  it('can surface Chilean special-date greetings on their day', () => {
    const navidadDraws = Array.from({ length: 200 }, (_, i) => pickHomeGreeting(at(2026, 11, 25, 10), () => i / 200))
    const dieciochoDraws = Array.from({ length: 200 }, (_, i) => pickHomeGreeting(at(2026, 8, 18, 10), () => i / 200))

    expect(navidadDraws.some(g => HOME_GREETING_CATALOG.navidad.includes(g))).toBe(true)
    expect(dieciochoDraws.some(g => HOME_GREETING_CATALOG.fiestasPatrias.includes(g))).toBe(true)
  })

  it('offers a large, duplicate-free catalog (~100 distinct greetings)', () => {
    const all = Object.values(HOME_GREETING_CATALOG).flat()

    expect(new Set(all).size).toBe(all.length)
    expect(all.length).toBeGreaterThanOrEqual(90)
  })
})

import { describe, expect, it } from 'vitest'

import { isSafeHttpUrl, normalizeEmail, parsePublicHiringApplication } from './schema'

// TASK-1367 — validador PURO del apply público. CI-safe (sin PG, sin red).

const valid = {
  openingPublicId: 'EO-OPN-0001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'Ada@Example.com',
  consent: true,
}

describe('parsePublicHiringApplication', () => {
  it('acepta un payload válido y normaliza (email lowercase, fullName)', () => {
    const out = parsePublicHiringApplication(valid)

    expect(out).not.toBeNull()
    expect(out?.email).toBe('ada@example.com')
    expect(out?.fullName).toBe('Ada Lovelace')
  })

  it('rechaza sin consentimiento (consent !== true) → null', () => {
    expect(parsePublicHiringApplication({ ...valid, consent: false })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, consent: 'true' })).toBeNull()
  })

  it('rechaza email inválido, campos requeridos faltantes, opening faltante → null', () => {
    expect(parsePublicHiringApplication({ ...valid, email: 'no-es-email' })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, firstName: '   ' })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, openingPublicId: '' })).toBeNull()
    expect(parsePublicHiringApplication(null)).toBeNull()
  })

  it('rechaza URLs de portafolio/LinkedIn no-https o peligrosas → null', () => {
    expect(parsePublicHiringApplication({ ...valid, portfolioUrl: 'javascript:alert(1)' })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, portfolioUrl: 'http://inseguro.com' })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, linkedinUrl: 'data:text/html,x' })).toBeNull()
  })

  it('acepta URLs https válidas y las conserva', () => {
    const out = parsePublicHiringApplication({ ...valid, portfolioUrl: 'https://ada.dev', linkedinUrl: 'https://linkedin.com/in/ada' })

    expect(out?.portfolioUrl).toBe('https://ada.dev')
    expect(out?.linkedinUrl).toBe('https://linkedin.com/in/ada')
  })

  it('normaliza teléfono opcional a E.164 y rechaza teléfonos inválidos', () => {
    const out = parsePublicHiringApplication({ ...valid, phone: '9 1234 5678' })

    expect(out?.phone).toBe('+56912345678')
    expect(parsePublicHiringApplication({ ...valid, phone: '123' })).toBeNull()
  })
})

describe('isSafeHttpUrl', () => {
  it('solo https válido', () => {
    expect(isSafeHttpUrl('https://ada.dev')).toBe(true)
    expect(isSafeHttpUrl('http://ada.dev')).toBe(false)
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeHttpUrl('no-url')).toBe(false)
    expect(isSafeHttpUrl('')).toBe(false)
  })
})

describe('normalizeEmail', () => {
  it('trim + lowercase', () => {
    expect(normalizeEmail('  Ada@Example.COM ')).toBe('ada@example.com')
  })
})

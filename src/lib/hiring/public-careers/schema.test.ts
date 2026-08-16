import { describe, expect, it } from 'vitest'

import { isSafeHttpUrl, normalizeEmail, parsePublicHiringApplication } from './schema'

// TASK-1367 — validador PURO del apply público. CI-safe (sin PG, sin red).

const valid = {
  openingPublicId: 'EO-OPN-0001',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'Ada@Example.com',
  // TASK-1688 flip 2026-08-12: el país es requerido; el fixture válido lo incluye.
  residenceCountryCode: 'CL',
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

  // TASK-1688 — país de residencia autodeclarado (expand/contract: opcional-pero-validado)
  it('acepta residenceCountryCode ISO válido (case-insensitive) y lo normaliza a mayúsculas', () => {
    expect(parsePublicHiringApplication({ ...valid, residenceCountryCode: 'cl' })?.residenceCountryCode).toBe('CL')
    expect(parsePublicHiringApplication({ ...valid, residenceCountryCode: 'VE' })?.residenceCountryCode).toBe('VE')
  })

  it('rechaza residenceCountryCode inválido (nunca persistir un país inventado)', () => {
    expect(parsePublicHiringApplication({ ...valid, residenceCountryCode: 'ZZ' })).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, residenceCountryCode: 'Chile' })).toBeNull()
  })

  it('residenceCountryCode ausente = payload inválido (flip contract 2026-08-12, país requerido)', () => {
    const sinPais: Record<string, unknown> = { ...valid }

    delete sinPais.residenceCountryCode

    expect(parsePublicHiringApplication(sinPais)).toBeNull()
    expect(parsePublicHiringApplication({ ...valid, residenceCountryCode: '' })).toBeNull()
  })

  it('el país de residencia sirve como hint de formato del teléfono, nunca al revés', () => {
    // Número local chileno con residencia declarada CL → normaliza con +56.
    const out = parsePublicHiringApplication({ ...valid, phone: '9 1234 5678', residenceCountryCode: 'CL' })

    expect(out?.phone).toBe('+56912345678')

    // Teléfono internacional completo NO altera el país declarado.
    const intl = parsePublicHiringApplication({ ...valid, phone: '+34 600 000 000', residenceCountryCode: 'VE' })

    expect(intl?.phone).toBe('+34600000000')
    expect(intl?.residenceCountryCode).toBe('VE')
  })

  // TASK-1736 — el parser conserva el nombre RAW como evidencia (sólo trim exterior + cap).
  it('conserva el nombre RAW exacto: sin NFC, sin colapso interno, sin tocar casing', () => {
    const out = parsePublicHiringApplication({ ...valid, firstName: ' vAlEnTiNa ', lastName: 'villa  soto' })

    expect(out?.firstName).toBe('vAlEnTiNa')
    expect(out?.lastName).toBe('villa  soto')
    expect(out?.fullName).toBe('vAlEnTiNa villa  soto')
  })

  // TASK-1736 — availability contra el catálogo estable del Growth Form (fallback tolerante).
  it('canonicaliza availability en catálogo (match mecánico-seguro) y conserva el resto', () => {
    expect(parsePublicHiringApplication({ ...valid, availability: 'Inmediata' })?.availability).toBe('Inmediata')
    expect(parsePublicHiringApplication({ ...valid, availability: 'inmediata' })?.availability).toBe('Inmediata')
    expect(parsePublicHiringApplication({ ...valid, availability: '2 to 4 weeks' })?.availability).toBe('2 to 4 weeks')

    // Fuera de catálogo: se conserva como texto acotado, JAMÁS invalida la postulación.
    const out = parsePublicHiringApplication({ ...valid, availability: 'Depende del proyecto' })

    expect(out).not.toBeNull()
    expect(out?.availability).toBe('Depende del proyecto')
    expect(parsePublicHiringApplication({ ...valid, availability: '  ' })?.availability).toBeNull()
  })

  it('conserva el mensaje application-scoped hasta 4000 caracteres', () => {
    const out = parsePublicHiringApplication({ ...valid, message: 'Hola equipo, me interesa la vacante.' })

    expect(out?.message).toBe('Hola equipo, me interesa la vacante.')
    expect(parsePublicHiringApplication({ ...valid, message: 'x'.repeat(5000) })?.message).toHaveLength(4000)
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

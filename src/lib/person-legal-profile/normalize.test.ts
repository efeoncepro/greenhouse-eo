import { describe, it, expect } from 'vitest'

import { PersonLegalProfileValidationError } from './errors'
import { normalizeCountryCode, normalizeDocument } from './normalize'

describe('TASK-784 normalize CL_RUT', () => {
  it('normaliza con puntos + guion', () => {
    const r = normalizeDocument('CL_RUT', '12.345.678-5')

    expect(r.normalized).toBe('123456785')
    expect(r.formatted).toBe('12.345.678-5')
  })

  it('normaliza con K mayuscula', () => {
    const r = normalizeDocument('CL_RUT', '8.765.432-K')

    expect(r.normalized).toBe('8765432K')
    expect(r.formatted).toBe('8.765.432-K')
  })

  it('normaliza con k minuscula a uppercase', () => {
    const r = normalizeDocument('CL_RUT', '8.765.432-k')

    expect(r.normalized).toBe('8765432K')
  })

  it('rechaza digito verificador incorrecto', () => {
    expect(() => normalizeDocument('CL_RUT', '12.345.678-9')).toThrow(
      PersonLegalProfileValidationError
    )
  })

  it('rechaza formato malformado', () => {
    expect(() => normalizeDocument('CL_RUT', 'abc-123')).toThrow(PersonLegalProfileValidationError)
  })

  it('rechaza string vacio', () => {
    expect(() => normalizeDocument('CL_RUT', '')).toThrow(PersonLegalProfileValidationError)
    expect(() => normalizeDocument('CL_RUT', '   ')).toThrow(PersonLegalProfileValidationError)
  })

  it('formato presentacion para 7 digitos', () => {
    // 5555555 → DV=9 (modulo 11)
    const r = normalizeDocument('CL_RUT', '5.555.555-9')

    expect(r.formatted).toBe('5.555.555-9')
  })
})

describe('TASK-784 normalize generic documents', () => {
  it('AR_DNI longitud 8', () => {
    const r = normalizeDocument('AR_DNI', '12345678')

    expect(r.normalized).toBe('12345678')
  })

  it('AR_DNI rechaza longitud invalida', () => {
    expect(() => normalizeDocument('AR_DNI', '123')).toThrow(PersonLegalProfileValidationError)
  })

  it('US_SSN exactamente 9 digitos', () => {
    expect(() => normalizeDocument('US_SSN', '12345')).toThrow(PersonLegalProfileValidationError)
    expect(() => normalizeDocument('US_SSN', '123456789')).not.toThrow()
  })
})

describe('TASK-784 normalizeCountryCode', () => {
  it('uppercase + valida ISO alpha-2', () => {
    expect(normalizeCountryCode('cl')).toBe('CL')
    expect(normalizeCountryCode('ar')).toBe('AR')
    expect(normalizeCountryCode(' US ')).toBe('US')
  })

  it('rechaza no-alpha-2', () => {
    expect(() => normalizeCountryCode('CHL')).toThrow(PersonLegalProfileValidationError)
    expect(() => normalizeCountryCode('1')).toThrow(PersonLegalProfileValidationError)
    expect(() => normalizeCountryCode('')).toThrow(PersonLegalProfileValidationError)
  })
})

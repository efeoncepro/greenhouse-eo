import { describe, expect, it } from 'vitest'

import {
  computeClRutCheckDigit,
  validateClRut,
  validateGenericNationalId,
  validateNationalIdByCountry,
} from '../national-id'

describe('computeClRutCheckDigit (módulo-11)', () => {
  it('computa dígitos numéricos', () => {
    expect(computeClRutCheckDigit('11111111')).toBe('1')
    expect(computeClRutCheckDigit('12345678')).toBe('5')
  })

  it('computa el dígito verificador K', () => {
    // numericPart='6' → sum=12 → remainder 10 → 'K'
    expect(computeClRutCheckDigit('6')).toBe('K')
  })
})

describe('validateClRut', () => {
  it('acepta un RUT válido y lo normaliza + formatea', () => {
    const r = validateClRut('11.111.111-1')

    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('111111111')
    expect(r.formatted).toBe('11.111.111-1')
    expect(r.reasonCode).toBeNull()
  })

  it('acepta dígito verificador K (case-insensitive)', () => {
    const r = validateClRut('6-k')

    expect(r.valid).toBe(true)
    expect(r.normalized).toBe('6K')
    expect(r.formatted).toBe('6-K')
  })

  it('acepta cualquier formato de entrada (forgiving paste)', () => {
    expect(validateClRut('123456785').valid).toBe(true)
    expect(validateClRut('12345678-5').valid).toBe(true)
    expect(validateClRut('12.345.678-5').valid).toBe(true)
  })

  it('rechaza dígito verificador incorrecto con reasonCode estable', () => {
    const r = validateClRut('11.111.111-2')

    expect(r.valid).toBe(false)
    expect(r.reasonCode).toBe('national_id_check_digit')
  })

  it('rechaza formato inválido', () => {
    expect(validateClRut('abc').reasonCode).toBe('national_id_format')
  })

  it('rechaza vacío con reasonCode required', () => {
    expect(validateClRut('   ').reasonCode).toBe('national_id_required')
  })
})

describe('validateGenericNationalId', () => {
  it('valida por longitud + charset', () => {
    expect(validateGenericNationalId('12345678', { minLen: 7, maxLen: 11 }).valid).toBe(true)
    expect(validateGenericNationalId('123', { minLen: 7, maxLen: 11 }).reasonCode).toBe('national_id_format')
  })
})

describe('validateNationalIdByCountry', () => {
  it('CL usa el RUT real con dígito verificador', () => {
    expect(validateNationalIdByCountry('CL', '12.345.678-5').valid).toBe(true)
    expect(validateNationalIdByCountry('CL', '12.345.678-9').reasonCode).toBe('national_id_check_digit')
  })

  it('country es case-insensitive', () => {
    expect(validateNationalIdByCountry('cl', '6-k').valid).toBe(true)
  })

  it('AR/BR/etc. caen a estructural con bounds por país (ranura)', () => {
    expect(validateNationalIdByCountry('AR', '12345678').valid).toBe(true)
    expect(validateNationalIdByCountry('AR', '123').reasonCode).toBe('national_id_format')
  })

  it('país desconocido cae a bounds default', () => {
    expect(validateNationalIdByCountry('ZZ', '1234').valid).toBe(true)
    expect(validateNationalIdByCountry('ZZ', '1').reasonCode).toBe('national_id_format')
  })
})

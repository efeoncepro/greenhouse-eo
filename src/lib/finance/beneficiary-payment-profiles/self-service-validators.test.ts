import { describe, it, expect } from 'vitest'

import {
  formatChileanRut,
  isValidChileanRut,
  isValidSwiftBic,
  validateSelfServiceSubmission
} from './self-service-validators'

describe('TASK-753 isValidChileanRut (módulo-11)', () => {
  it('accepts known-valid RUTs (with and without format)', () => {
    expect(isValidChileanRut('12.345.678-5')).toBe(true)
    expect(isValidChileanRut('123456785')).toBe(true)
    expect(isValidChileanRut('11.111.111-1')).toBe(true)
    // RUT with DV=K (computed: body 12345670 → sum 122 % 11 = 1 → DV=K)
    expect(isValidChileanRut('12.345.670-K')).toBe(true)
    expect(isValidChileanRut('12345670k')).toBe(true)
  })

  it('rejects invalid digit verifier', () => {
    expect(isValidChileanRut('12.345.678-9')).toBe(false)
    expect(isValidChileanRut('11.111.111-2')).toBe(false)
  })

  it('rejects malformed inputs', () => {
    expect(isValidChileanRut('')).toBe(false)
    expect(isValidChileanRut('abc')).toBe(false)
    expect(isValidChileanRut('1')).toBe(false)
    expect(isValidChileanRut('not-a-rut')).toBe(false)
  })
})

describe('TASK-753 isValidSwiftBic', () => {
  it('accepts 8-char and 11-char SWIFT codes', () => {
    expect(isValidSwiftBic('BCHICLRM')).toBe(true)
    expect(isValidSwiftBic('COLOCOBM')).toBe(true)
    expect(isValidSwiftBic('BOFAUS3NXXX')).toBe(true)
  })

  it('rejects malformed SWIFT codes', () => {
    expect(isValidSwiftBic('')).toBe(false)
    expect(isValidSwiftBic('SHORT')).toBe(false) // 5 chars, must be 8 or 11
    expect(isValidSwiftBic('1234CLRM')).toBe(false) // bank code must be letters
    expect(isValidSwiftBic('BCHIC1RM')).toBe(false) // country code must be letters
    expect(isValidSwiftBic('TOOLONGSWIFT99')).toBe(false) // 14 chars
  })

  it('is case-insensitive', () => {
    expect(isValidSwiftBic('bchiclrm')).toBe(true)
  })
})

describe('TASK-753 formatChileanRut', () => {
  it('groups thousands and adds dash before DV', () => {
    expect(formatChileanRut('123456785')).toBe('12.345.678-5')
    expect(formatChileanRut('20518345K')).toBe('20.518.345-K')
  })

  it('handles partial input gracefully', () => {
    expect(formatChileanRut('123')).toBe('123')
    expect(formatChileanRut('1234')).toBe('123-4')
  })

  it('returns input untouched when invalid', () => {
    expect(formatChileanRut('abc')).toBe('abc')
  })
})

describe('TASK-753 validateSelfServiceSubmission — chile_dependent', () => {
  it('rejects when required fields missing', () => {
    const result = validateSelfServiceSubmission('chile_dependent', {})

    expect(result.ok).toBe(false)
    expect(result.errors.map(e => e.field).sort()).toEqual([
      'accountHolderName',
      'accountNumberFull',
      'accountTypeCl',
      'bankName',
      'rut'
    ])
  })

  it('accepts valid CL submission', () => {
    const result = validateSelfServiceSubmission('chile_dependent', {
      bankName: 'Banco de Chile',
      accountTypeCl: 'cuenta_corriente',
      accountNumberFull: '123456789012',
      rut: '12.345.678-5',
      accountHolderName: 'María González'
    })

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects invalid RUT specifically', () => {
    const result = validateSelfServiceSubmission('chile_dependent', {
      bankName: 'BCI',
      accountTypeCl: 'cuenta_vista',
      accountNumberFull: '123456789',
      rut: '12.345.678-9', // wrong DV
      accountHolderName: 'Test'
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0].field).toBe('rut')
    expect(result.errors[0].code).toBe('invalid_rut')
  })

  it('rejects account_number with non-digits', () => {
    const result = validateSelfServiceSubmission('chile_dependent', {
      bankName: 'Santander',
      accountTypeCl: 'cuenta_corriente',
      accountNumberFull: 'ABC12345',
      rut: '12.345.678-5',
      accountHolderName: 'Test User'
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.field === 'accountNumberFull')).toBe(true)
  })
})

describe('TASK-753 validateSelfServiceSubmission — international', () => {
  it('rejects when required intl fields missing', () => {
    const result = validateSelfServiceSubmission('international', {})

    expect(result.ok).toBe(false)
    expect(result.errors.map(e => e.field).sort()).toEqual([
      'accountHolderName',
      'bankName',
      'countryCode',
      'ibanOrAccount',
      'swiftBic'
    ])
  })

  it('accepts valid international submission', () => {
    const result = validateSelfServiceSubmission('international', {
      countryCode: 'CO',
      bankName: 'Bancolombia',
      swiftBic: 'COLOCOBM',
      ibanOrAccount: '00770005120004567',
      accountHolderName: 'Daniela Ramírez'
    })

    expect(result.ok).toBe(true)
  })

  it('rejects invalid SWIFT', () => {
    const result = validateSelfServiceSubmission('international', {
      countryCode: 'CO',
      bankName: 'Bancolombia',
      swiftBic: '1234CLRM', // bank code must be letters
      ibanOrAccount: '12345',
      accountHolderName: 'Test'
    })

    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.code === 'invalid_swift')).toBe(true)
  })
})

describe('TASK-753 validateSelfServiceSubmission — unset', () => {
  it('always rejects when regime is unset', () => {
    const result = validateSelfServiceSubmission('unset', {
      bankName: 'Whatever'
    })

    expect(result.ok).toBe(false)
    expect(result.errors[0].code).toBe('regime_unset')
  })
})

describe('TASK-753 validateSelfServiceSubmission — honorarios_chile', () => {
  it('shares CL validator (RUT obligatorio + dependent rules)', () => {
    const result = validateSelfServiceSubmission('honorarios_chile', {
      bankName: 'Banco Estado',
      accountTypeCl: 'cuenta_rut',
      accountNumberFull: '987654321',
      rut: '11.111.111-1',
      accountHolderName: 'Test'
    })

    expect(result.ok).toBe(true)
  })
})

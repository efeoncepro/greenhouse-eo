import { describe, expect, it } from 'vitest'

import {
  formatAccountNumber,
  parseAccountNumber,
  validateAccountNumber
} from '@/lib/finance/internal-account-number/format'

describe('formatAccountNumber', () => {
  it('produces the canonical first CCA number', () => {
    const number = formatAccountNumber({
      tenantCode: '01',
      typeCode: '90',
      sequential: 1
    })

    expect(number).toBe('01-90-7-0001')
  })

  it('zero-pads the sequential to 4 digits', () => {
    const number = formatAccountNumber({
      tenantCode: '01',
      typeCode: '90',
      sequential: 17
    })

    expect(number).toMatch(/^01-90-[0-9]-0017$/)
  })

  it('rejects malformed inputs', () => {
    expect(() =>
      formatAccountNumber({ tenantCode: '1', typeCode: '90', sequential: 1 })
    ).toThrow(/2 digits/)

    expect(() =>
      formatAccountNumber({ tenantCode: '01', typeCode: '9A', sequential: 1 })
    ).toThrow(/2 digits/)

    expect(() =>
      formatAccountNumber({ tenantCode: '01', typeCode: '90', sequential: 0 })
    ).toThrow(/1\.\.9999/)

    expect(() =>
      formatAccountNumber({ tenantCode: '01', typeCode: '90', sequential: 10000 })
    ).toThrow(/1\.\.9999/)
  })
})

describe('parseAccountNumber', () => {
  it('parses a canonical number', () => {
    expect(parseAccountNumber('01-90-7-0001')).toEqual({
      tenantCode: '01',
      typeCode: '90',
      dv: '7',
      sequential: 1,
      formatVersion: 1
    })
  })

  it('returns null for malformed input', () => {
    expect(parseAccountNumber('GH-CCA-EFE-2026-0001-7')).toBeNull()
    expect(parseAccountNumber('•••• 0001')).toBeNull()
    expect(parseAccountNumber('')).toBeNull()
    expect(parseAccountNumber('01-90-0001')).toBeNull()
    expect(parseAccountNumber('01-90-A-0001')).toBeNull()
  })

  it('round-trips with formatAccountNumber', () => {
    const original = formatAccountNumber({
      tenantCode: '02',
      typeCode: '90',
      sequential: 17
    })

    const parsed = parseAccountNumber(original)

    expect(parsed?.tenantCode).toBe('02')
    expect(parsed?.typeCode).toBe('90')
    expect(parsed?.sequential).toBe(17)
  })
})

describe('validateAccountNumber', () => {
  it('accepts a correctly formatted + DV-valid number', () => {
    expect(validateAccountNumber('01-90-7-0001')).toBe(true)
  })

  it('rejects a number with bad DV', () => {
    expect(validateAccountNumber('01-90-0-0001')).toBe(false)
  })

  it('rejects malformed structure', () => {
    expect(validateAccountNumber('GH-CCA-0001')).toBe(false)
    expect(validateAccountNumber('•••• 0001')).toBe(false)
  })
})

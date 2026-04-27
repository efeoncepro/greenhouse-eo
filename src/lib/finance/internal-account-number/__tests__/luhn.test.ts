import { describe, expect, it } from 'vitest'

import { luhnCheckDigit, luhnIsValid } from '@/lib/finance/internal-account-number/luhn'

describe('luhnCheckDigit', () => {
  it('matches the SQL backfill for the first emitted CCA', () => {
    // Julio Reyes CCA: tenant 01, type 90, sequential 0001 → DV must be 7.
    // This expectation is locked against the migration backfill that already
    // produced `01-90-7-0001` in Cloud SQL. If this fails, TS and SQL drifted.
    expect(luhnCheckDigit('01900001')).toBe('7')
  })

  it('produces a single digit 0-9 for any all-digit payload', () => {
    for (let i = 0; i < 100; i += 1) {
      const payload = String(i).padStart(8, '0')
      const dv = luhnCheckDigit(payload)

      expect(dv).toMatch(/^[0-9]$/)
    }
  })

  it('round-trips: a number with a generated DV always validates', () => {
    const samples = ['01900001', '01900002', '02900001', '01100007', '99999999']

    for (const payload of samples) {
      const dv = luhnCheckDigit(payload)

      expect(luhnIsValid(payload, dv)).toBe(true)
    }
  })

  it('detects a wrong DV', () => {
    const correct = luhnCheckDigit('01900001')
    const wrong = correct === '0' ? '1' : '0'

    expect(luhnIsValid('01900001', wrong)).toBe(false)
  })

  it('rejects non-digit payloads', () => {
    expect(() => luhnCheckDigit('01-90-0001')).toThrow(/all digits/)
    expect(() => luhnCheckDigit('')).toThrow(/all digits/)
    expect(() => luhnCheckDigit('abc')).toThrow(/all digits/)
  })
})

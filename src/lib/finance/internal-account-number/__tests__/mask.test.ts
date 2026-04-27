import { describe, expect, it } from 'vitest'

import { maskAccountNumber } from '@/lib/finance/internal-account-number/mask'

describe('maskAccountNumber', () => {
  it('masks a canonical internal number to last-4 digits of the sequential', () => {
    expect(maskAccountNumber('01-90-7-0001')).toBe('•••• 0001')
    expect(maskAccountNumber('01-90-3-0017')).toBe('•••• 0017')
    expect(maskAccountNumber('02-90-1-9999')).toBe('•••• 9999')
  })

  it('masks legacy bank-style numbers consistently', () => {
    // Pure-numeric tail → regex matches trailing 4 digits.
    expect(maskAccountNumber('00012345678')).toBe('•••• 5678')

    // Non-digit tail → falls back to last 4 chars verbatim, matching the
    // existing `maskIdentifier` behavior in the admin route.
    expect(maskAccountNumber('001-23456-78')).toBe('•••• 6-78')
  })

  it('returns full bullets when value is empty or null', () => {
    expect(maskAccountNumber(null)).toBe('••••')
    expect(maskAccountNumber(undefined)).toBe('••••')
    expect(maskAccountNumber('')).toBe('••••')
    expect(maskAccountNumber('   ')).toBe('••••')
  })
})

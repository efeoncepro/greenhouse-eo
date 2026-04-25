import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { formatCurrency, formatDateDMY, formatQuantity, formatRate } from '../formatters'

describe('formatDateDMY', () => {
  it('renders ISO date as DD/MM/YYYY', () => {
    expect(formatDateDMY('2026-04-24')).toBe('24/04/2026')
  })

  it('returns dash when input is null', () => {
    expect(formatDateDMY(null)).toBe('—')
  })

  it('handles ISO datetime by slicing to date', () => {
    expect(formatDateDMY('2026-12-31T15:30:00.000Z')).toBe('31/12/2026')
  })
})

describe('formatCurrency', () => {
  it('formats CLP without decimals using es-CL grouping', () => {
    expect(formatCurrency(1234567, 'CLP')).toBe('$1.234.567')
  })

  it('formats USD with US$ prefix and 2 decimals', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('US$1.234,50')
  })

  it('rounds CLP to integer', () => {
    expect(formatCurrency(1234.7, 'CLP')).toBe('$1.235')
  })

  it('falls back to currency code prefix for unknown codes', () => {
    expect(formatCurrency(100, 'COP')).toContain('COP')
  })
})

describe('formatQuantity', () => {
  it('renders integers without decimals', () => {
    expect(formatQuantity(160)).toBe('160')
  })

  it('renders fractional values with up to 2 decimals', () => {
    expect(formatQuantity(1.5)).toBe('1,5')
  })

  it('returns zero for non-finite input', () => {
    expect(formatQuantity(Number.NaN)).toBe('0')
  })
})

describe('formatRate', () => {
  it('formats with 2-6 decimals and es-CL grouping', () => {
    expect(formatRate(950.4)).toBe('950,40')
    expect(formatRate(0.001234)).toMatch(/^0,001234$/)
  })
})

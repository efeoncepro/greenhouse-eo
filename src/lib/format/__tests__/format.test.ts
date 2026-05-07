import { describe, expect, it } from 'vitest'

import {
  formatAccountingCurrency,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatInteger,
  formatNumber,
  formatPercent,
  formatRelative,
  selectPlural
} from '..'

describe('locale-aware format utilities', () => {
  it('formats supported display currencies by locale without expanding finance core', () => {
    expect(formatCurrency(121963, 'CLP')).toBe('$121.963')
    expect(formatCurrency(1234.5, 'USD', {}, 'en-US')).toBe('$1,234.50')
    expect(formatCurrency(1500, 'BRL', {}, 'pt-BR')).toBe('R$ 1.500,00')
    expect(formatCurrency(1500, 'MXN', {}, 'es-MX')).toBe('$1,500.00')
  })

  it('supports accounting display separately from general currency display', () => {
    expect(formatAccountingCurrency(-1500, 'USD', {}, 'en-US')).toBe('($1,500.00)')
    expect(formatCurrency(800.21, 'USD', { currencySymbol: 'US$' }, 'en-US')).toBe('US$800.21')
  })

  it('formats date-only strings without timezone drift across locales', () => {
    expect(formatDate('2026-04-30', {}, 'es-CL')).toBe('30-04-2026')
    expect(formatDate('2026-04-30', {}, 'en-US')).toBe('04/30/2026')
    expect(formatDate('2026-04-30', {}, 'pt-BR')).toBe('30/04/2026')
  })

  it('formats datetimes in the operational timezone by default', () => {
    expect(formatDateTime('2026-05-05T22:18:00.000Z', { dateStyle: 'short', timeStyle: 'short' }, 'es-CL')).toContain('05-05-26')
  })

  it('formats time-only values without adding a date', () => {
    expect(formatTime('2026-05-05T22:18:00.000Z', {}, 'es-CL')).toMatch(/18:18|6:18/)
  })

  it('formats numbers and percentages with locale separators', () => {
    expect(formatInteger(1234567, {}, 'es-CL')).toBe('1.234.567')
    expect(formatNumber(1234567.89, { maximumFractionDigits: 2 }, 'en-US')).toBe('1,234,567.89')
    expect(formatPercent(0.257, { maximumFractionDigits: 1 }, 'es-CL')).toBe('25,7%')
    expect(formatPercent(25.7, { input: 'percentage', maximumFractionDigits: 1 }, 'en-US')).toBe('25.7%')
  })

  it('formats relative time and plural categories', () => {
    expect(formatRelative('2026-05-05T12:00:00.000Z', { now: new Date('2026-05-05T12:05:00.000Z') }, 'en-US')).toBe('5 minutes ago')
    expect(selectPlural(1, { one: 'día', other: 'días' }, 'es-CL')).toBe('día')
    expect(selectPlural(2, { one: 'día', other: 'días' }, 'es-CL')).toBe('días')
  })
})

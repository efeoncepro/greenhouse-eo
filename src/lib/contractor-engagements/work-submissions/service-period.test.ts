import { describe, expect, it } from 'vitest'

import { assertContractorServicePeriod } from './service-period'

describe('contractor service period', () => {
  it.each(['20 ago - 31 ago 2026', 'Septiembre 2026', '2026-02-29', '2026-04-31', '2026-9-01', '0000-01-01', ''])(
    'rejects %s with a domain 422',
    value => {
      expect(() => assertContractorServicePeriod(value, null)).toThrowError(
        expect.objectContaining({ code: 'invalid_service_period_date', statusCode: 422 })
      )
    }
  )

  it('validates the end date independently', () => {
    expect(() => assertContractorServicePeriod('2026-09-01', '30 sep 2026')).toThrowError(
      expect.objectContaining({ code: 'invalid_service_period_date' })
    )
  })

  it('rejects reversed service dates', () => {
    expect(() => assertContractorServicePeriod('2026-09-30', '2026-09-01')).toThrowError(
      expect.objectContaining({ code: 'invalid_service_period_range', statusCode: 422 })
    )
  })

  it.each([
    ['2026-09-01', '2026-09-30'],
    ['2024-02-29', '2024-02-29'],
    ['2026-12-20', '2027-01-10'],
    ['2026-09-01', null],
    [null, null],
    [undefined, undefined]
  ])('preserves valid and optional dates %s / %s', (start, end) => {
    expect(() => assertContractorServicePeriod(start, end)).not.toThrow()
  })
})

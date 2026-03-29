import { describe, expect, it } from 'vitest'

import { getBigQueryMaximumBytesBilled, getBigQueryQueryOptions } from './bigquery'

describe('cloud bigquery helpers', () => {
  it('uses the default maximum bytes billed when env is absent', () => {
    expect(getBigQueryMaximumBytesBilled({} as unknown as NodeJS.ProcessEnv)).toBe(1_000_000_000)
  })

  it('uses the env override when valid', () => {
    expect(getBigQueryMaximumBytesBilled({ BIGQUERY_MAX_BYTES_BILLED: '2500000000' } as unknown as NodeJS.ProcessEnv)).toBe(
      2_500_000_000
    )
  })

  it('falls back to the default when env is invalid', () => {
    expect(getBigQueryMaximumBytesBilled({ BIGQUERY_MAX_BYTES_BILLED: 'not-a-number' } as unknown as NodeJS.ProcessEnv)).toBe(
      1_000_000_000
    )
  })

  it('builds query options with stringified maximumBytesBilled', () => {
    expect(getBigQueryQueryOptions({ maximumBytesBilled: 123456, location: 'EU' })).toEqual({
      location: 'EU',
      maximumBytesBilled: '123456'
    })
  })
})

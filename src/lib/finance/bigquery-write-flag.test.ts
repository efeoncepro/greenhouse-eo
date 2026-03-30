import { afterEach, describe, expect, it, vi } from 'vitest'

import { isFinanceBigQueryWriteEnabled } from './bigquery-write-flag'

describe('isFinanceBigQueryWriteEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to enabled when the env is missing', () => {
    vi.stubEnv('FINANCE_BIGQUERY_WRITE_ENABLED', '')

    expect(isFinanceBigQueryWriteEnabled()).toBe(true)
  })

  it('returns false when the env is explicitly false', () => {
    vi.stubEnv('FINANCE_BIGQUERY_WRITE_ENABLED', 'false')

    expect(isFinanceBigQueryWriteEnabled()).toBe(false)
  })

  it('accepts truthy variants', () => {
    vi.stubEnv('FINANCE_BIGQUERY_WRITE_ENABLED', 'yes')

    expect(isFinanceBigQueryWriteEnabled()).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'

import { getCronSecretState, hasCronSecretConfigured } from './cron'

describe('cloud cron helpers', () => {
  it('reports missing when CRON_SECRET is absent', () => {
    expect(getCronSecretState({} as unknown as NodeJS.ProcessEnv)).toEqual({
      configured: false,
      source: 'missing'
    })
  })

  it('reports configured when CRON_SECRET has a value', () => {
    expect(getCronSecretState({ CRON_SECRET: 'secret-value' } as unknown as NodeJS.ProcessEnv)).toEqual({
      configured: true,
      source: 'env'
    })
  })

  it('treats blank values as missing', () => {
    expect(hasCronSecretConfigured({ CRON_SECRET: '   ' } as unknown as NodeJS.ProcessEnv)).toBe(false)
  })
})

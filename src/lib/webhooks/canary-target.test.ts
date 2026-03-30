import { describe, expect, it } from 'vitest'

import { buildCanaryTargetUrl } from './canary-target'

const makeEnv = (overrides: Record<string, string> = {}) =>
  ({
    NODE_ENV: 'test',
    ...overrides
  }) as NodeJS.ProcessEnv

describe('buildCanaryTargetUrl', () => {
  it('builds the bare canary target when no bypass secret is configured', () => {
    expect(
      buildCanaryTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv()
      })
    ).toBe('https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary')
  })

  it('uses the dedicated canary bypass secret when configured', () => {
    expect(
      buildCanaryTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv({
          WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET: 'canary-only-bypass',
          VERCEL_AUTOMATION_BYPASS_SECRET: 'generic-bypass'
        })
      })
    ).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary?x-vercel-protection-bypass=canary-only-bypass'
    )
  })

  it('falls back to Vercel automation bypass when the dedicated one is absent', () => {
    expect(
      buildCanaryTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET: 'generic-bypass'
        })
      })
    ).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary?x-vercel-protection-bypass=generic-bypass'
    )
  })

  it('strips escaped newlines from the bypass secret before building the target', () => {
    expect(
      buildCanaryTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv({
          WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET: 'canary-only-bypass\\n'
        })
      })
    ).toBe('https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary?x-vercel-protection-bypass=canary-only-bypass')
  })
})

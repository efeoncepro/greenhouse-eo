import { describe, expect, it } from 'vitest'

import { buildNotificationDispatchTargetUrl } from './notification-target'

const makeEnv = (overrides: Record<string, string> = {}) =>
  ({
    NODE_ENV: 'test',
    ...overrides
  }) as NodeJS.ProcessEnv

describe('buildNotificationDispatchTargetUrl', () => {
  it('builds the bare notification target when no bypass secret is configured', () => {
    expect(
      buildNotificationDispatchTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv()
      })
    ).toBe('https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch')
  })

  it('uses the dedicated notification bypass secret when configured', () => {
    expect(
      buildNotificationDispatchTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv({
          WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET: 'notifications-only-bypass',
          VERCEL_AUTOMATION_BYPASS_SECRET: 'generic-bypass'
        })
      })
    ).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch?x-vercel-protection-bypass=notifications-only-bypass'
    )
  })

  it('falls back to Vercel automation bypass when the dedicated one is absent', () => {
    expect(
      buildNotificationDispatchTargetUrl({
        baseUrl: 'https://dev-greenhouse.efeoncepro.com',
        env: makeEnv({
          VERCEL_AUTOMATION_BYPASS_SECRET: 'generic-bypass'
        })
      })
    ).toBe(
      'https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch?x-vercel-protection-bypass=generic-bypass'
    )
  })
})

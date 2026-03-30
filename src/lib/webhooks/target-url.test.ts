import { describe, expect, it } from 'vitest'

import { resolveWebhookBaseUrl, resolveWebhookProtectionBypassSecret } from './target-url'

describe('resolveWebhookBaseUrl', () => {
  it('prefers the forwarded host from the incoming request so seeds stay on the stable alias', () => {
    const request = new Request('https://greenhouse-lw2s5z5j5-efeonce-7670142f.vercel.app/api/admin/ops/webhooks/seed-notifications', {
      headers: {
        'x-forwarded-host': 'dev-greenhouse.efeoncepro.com',
        'x-forwarded-proto': 'https'
      }
    })

    expect(
      resolveWebhookBaseUrl({
        request,
        env: {
          VERCEL_URL: 'greenhouse-lw2s5z5j5-efeonce-7670142f.vercel.app',
          NODE_ENV: 'test'
        } as NodeJS.ProcessEnv
      })
    ).toBe('https://dev-greenhouse.efeoncepro.com')
  })
})

describe('resolveWebhookProtectionBypassSecret', () => {
  it('removes escaped newlines from stored env values', () => {
    expect(
      resolveWebhookProtectionBypassSecret({
        dedicatedSecret: 'bypass-secret\\n'
      })
    ).toBe('bypass-secret')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

import { alertCronFailure, sendSlackAlert } from '@/lib/alerts/slack-notify'

describe('slack alerts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    resolveSecret.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('skips when webhook is missing', async () => {
    resolveSecret.mockResolvedValue({
      source: 'unconfigured',
      value: null,
      envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
      secretRefEnvVarName: 'SLACK_ALERTS_WEBHOOK_URL_SECRET_REF',
      secretRef: null
    })

    await expect(sendSlackAlert('hello')).resolves.toBe(false)
  })

  it('posts alerts to the resolved webhook', async () => {
    resolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'https://hooks.slack.test/123',
      envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
      secretRefEnvVarName: 'SLACK_ALERTS_WEBHOOK_URL_SECRET_REF',
      secretRef: 'projects/efeonce-group/secrets/slack-alerts/versions/latest'
    })
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

    await expect(alertCronFailure('outbox-publish', new Error('boom'))).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { alertCronFailure, sendSlackAlert } from '@/lib/alerts/slack-notify'

describe('slack alerts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('skips when webhook is missing', async () => {
    vi.stubEnv('SLACK_ALERTS_WEBHOOK_URL', '')

    await expect(sendSlackAlert('hello')).resolves.toBe(false)
  })

  it('posts alerts to the configured webhook', async () => {
    vi.stubEnv('SLACK_ALERTS_WEBHOOK_URL', 'https://hooks.slack.test/123')
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }))

    await expect(alertCronFailure('outbox-publish', new Error('boom'))).resolves.toBe(true)
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

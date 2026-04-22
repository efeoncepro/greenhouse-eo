import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/node'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

import { alertCronFailure, sendSlackAlert } from '@/lib/alerts/slack-notify'

const WEBHOOK_URL = 'https://hooks.slack.test/123'

describe('slack alerts', () => {
  beforeEach(() => {
    resolveSecret.mockReset()
  })

  afterEach(() => {
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
      value: WEBHOOK_URL,
      envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
      secretRefEnvVarName: 'SLACK_ALERTS_WEBHOOK_URL_SECRET_REF',
      secretRef: 'projects/efeonce-group/secrets/slack-alerts/versions/latest'
    })

    const capturedBodies: unknown[] = []

    server.use(
      http.post(WEBHOOK_URL, async ({ request }) => {
        capturedBodies.push(await request.json())

        return new HttpResponse(null, { status: 200 })
      })
    )

    await expect(alertCronFailure('outbox-publish', new Error('boom'))).resolves.toBe(true)
    expect(capturedBodies).toHaveLength(1)
  })
})

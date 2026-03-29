import { describe, expect, it } from 'vitest'

import { getCloudObservabilityPosture } from '@/lib/cloud/observability'

describe('getCloudObservabilityPosture', () => {
  it('reports observability as unconfigured when no env vars are present', () => {
    const posture = getCloudObservabilityPosture({})

    expect(posture.summary).toBe('Observabilidad externa no configurada')
    expect(posture.sentry.enabled).toBe(false)
    expect(posture.sentry.authTokenConfigured).toBe(false)
    expect(posture.slack.enabled).toBe(false)
  })

  it('distinguishes sentry runtime from source maps and slack alerts', () => {
    const posture = getCloudObservabilityPosture({
      SENTRY_DSN: 'https://example@sentry.io/1',
      SLACK_ALERTS_WEBHOOK_URL: 'https://hooks.slack.com/services/a/b/c'
    })

    expect(posture.summary).toContain('Sentry runtime configurado sin auth token de source maps')
    expect(posture.summary).toContain('Slack alerts configuradas')
    expect(posture.sentry.enabled).toBe(true)
    expect(posture.sentry.authTokenConfigured).toBe(false)
    expect(posture.slack.enabled).toBe(true)
  })
})

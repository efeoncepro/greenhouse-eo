import { describe, expect, it, vi } from 'vitest'

const { getSecretSource } = vi.hoisted(() => ({
  getSecretSource: vi.fn(async ({ envVarName, env }: { envVarName: string, env: Record<string, string | undefined> }) => {
    const secretRef = env[`${envVarName}_SECRET_REF`]?.trim()
    const envValue = env[envVarName]?.trim()

    return {
      envVarName,
      secretRefEnvVarName: `${envVarName}_SECRET_REF`,
      secretRef: secretRef || null,
      source: secretRef ? 'secret_manager' : envValue ? 'env' : 'unconfigured'
    }
  })
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  getSecretSource
}))

import { getCloudObservabilityPosture } from '@/lib/cloud/observability'

describe('getCloudObservabilityPosture', () => {
  it('reports observability as unconfigured when no env vars are present', async () => {
    const posture = await getCloudObservabilityPosture({})

    expect(posture.summary).toBe('Observabilidad externa no configurada')
    expect(posture.sentry.enabled).toBe(false)
    expect(posture.sentry.clientDsnConfigured).toBe(false)
    expect(posture.sentry.authTokenConfigured).toBe(false)
    expect(posture.sentry.sourceMapsReady).toBe(false)
    expect(posture.slack.enabled).toBe(false)
  })

  it('distinguishes sentry runtime from source maps and slack alerts', async () => {
    const posture = await getCloudObservabilityPosture({
      SENTRY_DSN: 'https://example@sentry.io/1',
      NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1',
      SLACK_ALERTS_WEBHOOK_URL: 'https://hooks.slack.com/services/a/b/c'
    })

    expect(posture.summary).toContain('Sentry runtime configurado con source maps pendientes')
    expect(posture.summary).toContain('Slack alerts configuradas')
    expect(posture.sentry.enabled).toBe(true)
    expect(posture.sentry.clientDsnConfigured).toBe(true)
    expect(posture.sentry.authTokenConfigured).toBe(false)
    expect(posture.sentry.sourceMapsReady).toBe(false)
    expect(posture.slack.enabled).toBe(true)
  })

  it('reports source maps as ready only when auth token, org and project exist', async () => {
    const posture = await getCloudObservabilityPosture({
      NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1',
      SENTRY_AUTH_TOKEN: 'token',
      SENTRY_ORG: 'efeonce',
      SENTRY_PROJECT: 'greenhouse'
    })

    expect(posture.summary).toContain('Sentry runtime + source maps listos')
    expect(posture.sentry.sourceMapsReady).toBe(true)
  })

  it('treats slack alerts as configured when only the secret ref exists', async () => {
    const posture = await getCloudObservabilityPosture({
      SLACK_ALERTS_WEBHOOK_URL_SECRET_REF: 'slack-alerts-webhook'
    })

    expect(posture.slack.enabled).toBe(true)
    expect(posture.summary).toContain('Slack alerts configuradas')
  })
})

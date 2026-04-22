import { afterEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

import { server } from '@/mocks/node'

const { getSecretSource, resolveSecret } = vi.hoisted(() => ({
  getSecretSource: vi.fn(async ({ envVarName, env }: { envVarName: string, env: Record<string, string | undefined> }) => {
    const secretRef = env[`${envVarName}_SECRET_REF`]?.trim()
    const envValue = env[envVarName]?.trim()

    return {
      envVarName,
      secretRefEnvVarName: `${envVarName}_SECRET_REF`,
      secretRef: secretRef || null,
      source: secretRef ? 'secret_manager' : envValue ? 'env' : 'unconfigured'
    }
  }),
  resolveSecret: vi.fn(async ({ envVarName, env }: { envVarName: string, env: Record<string, string | undefined> }) => ({
    value: env[envVarName]?.trim() || null,
    source: env[envVarName]?.trim() ? 'env' : 'unconfigured'
  }))
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  getSecretSource,
  resolveSecret
}))

import { getCloudObservabilityPosture, getCloudSentryIncidents } from '@/lib/cloud/observability'

const SENTRY_ISSUES_ENDPOINT = '*/api/0/projects/:org/:project/issues/'

afterEach(() => {
  vi.unstubAllGlobals()
})

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
  })

  it('reports source maps as ready only when auth token, org and project exist', async () => {
    const posture = await getCloudObservabilityPosture({
      NEXT_PUBLIC_SENTRY_DSN: 'https://example@sentry.io/1',
      SENTRY_AUTH_TOKEN: 'token',
      SENTRY_ORG: 'efeonce',
      SENTRY_PROJECT: 'greenhouse'
    })

    expect(posture.summary).toContain('Sentry runtime + source maps listos')
    expect(posture.summary).toContain('reader de incidentes Sentry configurado')
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

describe('getCloudSentryIncidents', () => {
  it('returns unconfigured when sentry api env vars are missing', async () => {
    const snapshot = await getCloudSentryIncidents({})

    expect(snapshot.status).toBe('unconfigured')
    expect(snapshot.enabled).toBe(false)
    expect(snapshot.available).toBe(false)
    expect(snapshot.incidents).toEqual([])
  })

  it('normalizes open sentry issues with environment context', async () => {
    const capturedRequests: string[] = []

    server.use(
      http.get(SENTRY_ISSUES_ENDPOINT, ({ request, params }) => {
        capturedRequests.push(request.url)
        expect(params.org).toBe('efeonce-group-spa')
        expect(params.project).toBe('javascript-nextjs')

        return HttpResponse.json([
          {
            id: '7373141985',
            shortId: 'JAVASCRIPT-NEXTJS-5',
            title: 'Value of type FLOAT64 cannot be assigned to value, which has type NUMERIC at [20:21]',
            culprit: 'GET /api/finance/economic-indicators/sync',
            level: 'error',
            status: 'unresolved',
            count: '1',
            userCount: 0,
            firstSeen: '2026-03-29T23:00:00.000Z',
            lastSeen: '2026-03-29T23:32:00.000Z',
            permalink: 'https://sentry.io/issues/7373141985/',
            project: { slug: 'javascript-nextjs' },
            tags: [
              { key: 'environment', value: 'production' },
              { key: 'release', value: 'fbe21a331415' },
              { key: 'transaction', value: 'GET /api/finance/economic-indicators/sync' }
            ]
          }
        ])
      })
    )

    const snapshot = await getCloudSentryIncidents({
      SENTRY_AUTH_TOKEN: 'token',
      SENTRY_ORG: 'efeonce-group-spa',
      SENTRY_PROJECT: 'javascript-nextjs'
    })

    expect(capturedRequests).toHaveLength(1)
    expect(capturedRequests[0]).toContain('/api/0/projects/efeonce-group-spa/javascript-nextjs/issues/')
    expect(snapshot.status).toBe('warning')
    expect(snapshot.summary).toContain('1 incidente')
    expect(snapshot.incidents[0]).toMatchObject({
      id: '7373141985',
      shortId: 'JAVASCRIPT-NEXTJS-5',
      title: 'Value of type FLOAT64 cannot be assigned to value, which has type NUMERIC at [20:21]',
      location: 'GET /api/finance/economic-indicators/sync',
      level: 'error',
      environment: 'production',
      release: 'fbe21a331415'
    })
  })

  it('returns ok when sentry has no open incidents', async () => {
    server.use(
      http.get(SENTRY_ISSUES_ENDPOINT, () => HttpResponse.json([]))
    )

    const snapshot = await getCloudSentryIncidents({
      SENTRY_AUTH_TOKEN: 'token',
      SENTRY_ORG: 'efeonce-group-spa',
      SENTRY_PROJECT: 'javascript-nextjs'
    })

    expect(snapshot.status).toBe('ok')
    expect(snapshot.summary).toContain('Sin incidentes Sentry abiertos')
  })

  it('fails soft when sentry request errors', async () => {
    server.use(
      http.get(SENTRY_ISSUES_ENDPOINT, () => HttpResponse.error())
    )

    const snapshot = await getCloudSentryIncidents({
      SENTRY_AUTH_TOKEN: 'token',
      SENTRY_ORG: 'efeonce-group-spa',
      SENTRY_PROJECT: 'javascript-nextjs'
    })

    expect(snapshot.status).toBe('warning')
    expect(snapshot.enabled).toBe(true)
    expect(snapshot.available).toBe(false)
    expect(snapshot.incidents).toEqual([])
  })

  it('returns an actionable warning when the token lacks issues permission', async () => {
    server.use(
      http.get(SENTRY_ISSUES_ENDPOINT, () =>
        HttpResponse.json(
          { detail: 'You do not have permission to perform this action.' },
          { status: 403 }
        )
      )
    )

    const snapshot = await getCloudSentryIncidents({
      SENTRY_INCIDENTS_AUTH_TOKEN: 'reader-token',
      SENTRY_ORG: 'efeonce-group-spa',
      SENTRY_PROJECT: 'javascript-nextjs'
    })

    expect(snapshot.status).toBe('warning')
    expect(snapshot.available).toBe(false)
    expect(snapshot.summary).toContain('no tiene permisos para leer incidentes')
    expect(snapshot.error).toContain('HTTP 403')
    expect(snapshot.error).toContain('event:read')
  })
})

import { describe, expect, it } from 'vitest'

import { buildCloudHealthSnapshot, getCloudPostureChecks } from '@/lib/cloud/health'

describe('buildCloudHealthSnapshot', () => {
  it('reports degraded when runtime is healthy but posture has warnings', () => {
    const snapshot = buildCloudHealthSnapshot({
      runtimeChecks: [
        { name: 'postgres', ok: true, status: 'ok', summary: 'Cloud SQL reachable' },
        { name: 'bigquery', ok: true, status: 'ok', summary: 'BigQuery reachable' }
      ],
      postureChecks: [{ name: 'observability', status: 'warning', summary: 'Sentry runtime configurado sin auth token de source maps' }],
      timestamp: '2026-03-29T00:00:00.000Z'
    })

    expect(snapshot.ok).toBe(true)
    expect(snapshot.overallStatus).toBe('degraded')
    expect(snapshot.summary).toBe('2 runtime ok · 1 posture warning')
    expect(snapshot.runtimeChecks).toHaveLength(2)
    expect(snapshot.postureChecks).toHaveLength(1)
  })

  it('reports error when a runtime dependency is down', () => {
    const snapshot = buildCloudHealthSnapshot({
      runtimeChecks: [
        { name: 'postgres', ok: false, status: 'error', summary: 'connection refused' },
        { name: 'bigquery', ok: true, status: 'ok', summary: 'BigQuery reachable' }
      ],
      postureChecks: [],
      timestamp: '2026-03-29T00:00:00.000Z'
    })

    expect(snapshot.ok).toBe(false)
    expect(snapshot.overallStatus).toBe('error')
    expect(snapshot.summary).toBe('1 runtime failing · 0 posture warnings')
  })
})

describe('getCloudPostureChecks', () => {
  it('classifies posture warnings without treating them as runtime outages', () => {
    const checks = getCloudPostureChecks({
      auth: {
        mode: 'mixed',
        summary: 'WIF + key coexistiendo',
        oidcAvailable: true,
        selectedSource: 'wif',
        workloadIdentityConfigured: true,
        serviceAccountKeyConfigured: true,
        serviceAccountEmailConfigured: true,
        providerConfigured: true
      },
      postgres: {
        configured: true,
        usesConnector: true,
        sslEnabled: true,
        maxConnections: 15,
        meetsRecommendedPool: true,
        summary: 'Cloud SQL Connector activo',
        risks: []
      },
      secrets: {
        summary: '1 via Secret Manager · 1 via env var',
        entries: [
          {
            key: 'nextauth_secret',
            envVarName: 'NEXTAUTH_SECRET',
            secretRefEnvVarName: 'NEXTAUTH_SECRET_SECRET_REF',
            secretRefConfigured: false,
            source: 'env'
          }
        ]
      },
      observability: {
        summary: 'Observabilidad externa no configurada',
        sentry: {
          dsnConfigured: false,
          clientDsnConfigured: false,
          authTokenConfigured: false,
          orgConfigured: false,
          projectConfigured: false,
          enabled: false,
          sourceMapsReady: false
        },
        slack: {
          alertsWebhookConfigured: false,
          enabled: false
        }
      }
    })

    expect(checks.find(check => check.name === 'gcp_auth')?.status).toBe('warning')
    expect(checks.find(check => check.name === 'postgres_posture')?.status).toBe('ok')
    expect(checks.find(check => check.name === 'secrets')?.status).toBe('warning')
    expect(checks.find(check => check.name === 'observability')?.status).toBe('unconfigured')
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCloudPostgresPosture } from '@/lib/cloud/postgres'

describe('getCloudPostgresPosture', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('flags unconfigured postgres runtime', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_HOST', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD', '')

    const posture = getCloudPostgresPosture()

    expect(posture.configured).toBe(false)
    expect(posture.risks).toContain('Postgres runtime no configurado')
  })

  it('treats connector-based runtime as ssl-safe', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', 'efeonce-group:us-east4:greenhouse-pg-dev')
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD', 'secret')
    vi.stubEnv('GREENHOUSE_POSTGRES_MAX_CONNECTIONS', '15')
    vi.stubEnv('GREENHOUSE_POSTGRES_SSL', 'false')

    const posture = getCloudPostgresPosture()

    expect(posture.configured).toBe(true)
    expect(posture.usesConnector).toBe(true)
    expect(posture.sslEnabled).toBe(true)
    expect(posture.meetsRecommendedPool).toBe(true)
  })

  it('flags direct non-ssl low-pool posture as risky', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_HOST', '127.0.0.1')
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD', 'secret')
    vi.stubEnv('GREENHOUSE_POSTGRES_MAX_CONNECTIONS', '5')
    vi.stubEnv('GREENHOUSE_POSTGRES_SSL', 'false')

    const posture = getCloudPostgresPosture()

    expect(posture.risks).toContain('Cloud SQL Connector no activo')
    expect(posture.risks).toContain('SSL no activo para conexión directa')
    expect(posture.risks).toContain('Pool bajo el baseline serverless (5/15)')
  })
})

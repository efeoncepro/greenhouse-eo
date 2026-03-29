import { afterEach, describe, expect, it, vi } from 'vitest'

import { getCloudPostgresAccessProfilesPosture, getCloudPostgresPosture } from '@/lib/cloud/postgres'

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

describe('getCloudPostgresAccessProfilesPosture', () => {
  it('keeps runtime, migrator and admin as separate posture entries', () => {
    const posture = getCloudPostgresAccessProfilesPosture({
      summary: '2 via Secret Manager · 1 via env var',
      runtimeSummary: '1 via Secret Manager',
      toolingSummary: '1 via Secret Manager · 1 via env var',
      entries: [
        {
          key: 'postgres_runtime_password',
          envVarName: 'GREENHOUSE_POSTGRES_PASSWORD',
          secretRefEnvVarName: 'GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF',
          secretRefConfigured: true,
          source: 'secret_manager',
          classification: 'runtime'
        },
        {
          key: 'postgres_migrator_password',
          envVarName: 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD',
          secretRefEnvVarName: 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF',
          secretRefConfigured: true,
          source: 'secret_manager',
          classification: 'tooling'
        },
        {
          key: 'postgres_admin_password',
          envVarName: 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD',
          secretRefEnvVarName: 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD_SECRET_REF',
          secretRefConfigured: false,
          source: 'env',
          classification: 'tooling'
        }
      ]
    })

    expect(posture.summary).toBe('3/3 perfiles configurados')
    expect(posture.profiles.find(profile => profile.profile === 'runtime')?.source).toBe('secret_manager')
    expect(posture.profiles.find(profile => profile.profile === 'migrator')?.secretRefConfigured).toBe(true)
    expect(posture.profiles.find(profile => profile.profile === 'admin')?.summary).toBe('Perfil admin resuelto via env var')
  })

  it('reports missing tooling profiles without downgrading runtime semantics', () => {
    const posture = getCloudPostgresAccessProfilesPosture({
      summary: '1 via Secret Manager · 2 sin configurar',
      runtimeSummary: '1 via Secret Manager',
      toolingSummary: '2 sin configurar',
      entries: [
        {
          key: 'postgres_runtime_password',
          envVarName: 'GREENHOUSE_POSTGRES_PASSWORD',
          secretRefEnvVarName: 'GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF',
          secretRefConfigured: true,
          source: 'secret_manager',
          classification: 'runtime'
        }
      ]
    })

    expect(posture.summary).toBe('1/3 perfiles configurados · 2 sin configurar')
    expect(posture.profiles.find(profile => profile.profile === 'migrator')?.configured).toBe(false)
    expect(posture.profiles.find(profile => profile.profile === 'admin')?.source).toBe('unconfigured')
  })
})

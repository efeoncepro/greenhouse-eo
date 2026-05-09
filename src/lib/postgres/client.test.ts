import { afterEach, describe, expect, it, vi } from 'vitest'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

import {
  getGreenhousePostgresConfig,
  getGreenhousePostgresMissingConfig,
  isGreenhousePostgresRetryableConnectionError,
  isGreenhousePostgresConfigured,
  onGreenhousePostgresReset,
  resolveGreenhousePostgresConfig
} from '@/lib/postgres/client'

describe('postgres secret-manager config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resolveSecret.mockReset()
    globalThis.__greenhousePostgresResetListeners?.clear()
  })

  it('treats password secret ref as enough for configured runtime posture', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', 'efeonce-group:us-east4:greenhouse-pg-dev')
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', 'greenhouse_runtime')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF', 'pg-runtime-password')

    expect(isGreenhousePostgresConfigured()).toBe(true)
    expect(getGreenhousePostgresMissingConfig()).toEqual([])
  })

  it('resolves password from the canonical helper', async () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', 'efeonce-group:us-east4:greenhouse-pg-dev')
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', 'greenhouse_runtime')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF', 'pg-runtime-password')
    resolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'super-secret',
      envVarName: 'GREENHOUSE_POSTGRES_PASSWORD',
      secretRefEnvVarName: 'GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF',
      secretRef: 'projects/efeonce-group/secrets/pg-runtime-password/versions/latest'
    })

    const config = await resolveGreenhousePostgresConfig()

    expect(config.password).toBe('super-secret')
    expect(config.passwordSource).toBe('secret_manager')
    expect(config.passwordSecretRef).toBe('projects/efeonce-group/secrets/pg-runtime-password/versions/latest')
    expect(resolveSecret).toHaveBeenCalledWith({
      envVarName: 'GREENHOUSE_POSTGRES_PASSWORD'
    })
  })

  it('classifies transient Postgres connection failures as retryable', () => {
    expect(isGreenhousePostgresRetryableConnectionError(new Error('ssl/tls alert bad certificate'))).toBe(true)
    expect(
      isGreenhousePostgresRetryableConnectionError(
        Object.assign(
          new Error('remaining connection slots are reserved for roles with privileges of the "pg_use_reserved_connections" role'),
          { code: '53300' }
        )
      )
    ).toBe(true)
    expect(isGreenhousePostgresRetryableConnectionError(new Error('syntax error at or near "FROM"'))).toBe(false)
  })

  describe('runtime-aware pool sizing (TASK-845 Slice 3)', () => {
    it('defaults to Cloud Run sizing (max=15, idleTimeoutMillis=30s) when VERCEL is unset', () => {
      vi.unstubAllEnvs()
      vi.stubEnv('VERCEL', '')

      const config = getGreenhousePostgresConfig()

      expect(config.maxConnections).toBe(15)
      expect(config.idleTimeoutMillis).toBe(30_000)
    })

    it('switches to Vercel sizing (max=3, idleTimeoutMillis=10s) when VERCEL=1', () => {
      vi.stubEnv('VERCEL', '1')

      const config = getGreenhousePostgresConfig()

      expect(config.maxConnections).toBe(3)
      expect(config.idleTimeoutMillis).toBe(10_000)
    })

    it('honors GREENHOUSE_POSTGRES_MAX_CONNECTIONS override regardless of runtime', () => {
      vi.stubEnv('VERCEL', '1')
      vi.stubEnv('GREENHOUSE_POSTGRES_MAX_CONNECTIONS', '7')

      const config = getGreenhousePostgresConfig()

      expect(config.maxConnections).toBe(7)
    })

    it('honors GREENHOUSE_POSTGRES_IDLE_TIMEOUT_MS override regardless of runtime', () => {
      vi.stubEnv('VERCEL', '')
      vi.stubEnv('GREENHOUSE_POSTGRES_IDLE_TIMEOUT_MS', '5000')

      const config = getGreenhousePostgresConfig()

      expect(config.idleTimeoutMillis).toBe(5_000)
    })

    it('treats VERCEL=true as non-Vercel (only literal "1" matches per Vercel docs)', () => {
      vi.stubEnv('VERCEL', 'true')

      const config = getGreenhousePostgresConfig()

      expect(config.maxConnections).toBe(15)
    })
  })

  it('lets consumers subscribe and unsubscribe from Postgres reset events', () => {
    const listener = vi.fn()
    const unsubscribe = onGreenhousePostgresReset(listener)

    for (const registeredListener of globalThis.__greenhousePostgresResetListeners ?? []) {
      registeredListener({ source: 'retryable_error' })
    }

    expect(listener).toHaveBeenCalledWith({ source: 'retryable_error' })

    unsubscribe()
    listener.mockClear()

    for (const registeredListener of globalThis.__greenhousePostgresResetListeners ?? []) {
      registeredListener({ source: 'close' })
    }

    expect(listener).not.toHaveBeenCalled()
  })
})

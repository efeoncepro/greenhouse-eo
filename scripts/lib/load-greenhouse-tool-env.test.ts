import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyGreenhousePostgresProfile,
  getPostgresProfileMissingConfig
} from './load-greenhouse-tool-env'

describe('load-greenhouse-tool-env postgres profiles', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.GREENHOUSE_POSTGRES_USER
    delete process.env.GREENHOUSE_POSTGRES_PASSWORD
    delete process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF
  })

  it('accepts a secret ref as valid profile password config', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', 'efeonce-group:us-east4:greenhouse-pg-dev')
    vi.stubEnv('GREENHOUSE_POSTGRES_USER', 'greenhouse_runtime')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF', 'pg-runtime-password')

    expect(getPostgresProfileMissingConfig('runtime')).toEqual([])
  })

  it('maps the selected profile secret ref to the canonical runtime env var', () => {
    vi.stubEnv('GREENHOUSE_POSTGRES_DATABASE', 'greenhouse_app')
    vi.stubEnv('GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME', 'efeonce-group:us-east4:greenhouse-pg-dev')
    vi.stubEnv('GREENHOUSE_POSTGRES_MIGRATOR_USER', 'greenhouse_migrator')
    vi.stubEnv('GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD', '')
    vi.stubEnv('GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF', 'pg-migrator-password')

    const applied = applyGreenhousePostgresProfile('migrator')

    expect(applied.profile).toBe('migrator')
    expect(process.env.GREENHOUSE_POSTGRES_USER).toBe('greenhouse_migrator')
    expect(process.env.GREENHOUSE_POSTGRES_PASSWORD).toBeUndefined()
    expect(process.env.GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF).toBe('pg-migrator-password')
  })
})

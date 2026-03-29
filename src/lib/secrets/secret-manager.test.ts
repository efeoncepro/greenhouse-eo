import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { accessSecretVersion } = vi.hoisted(() => ({
  accessSecretVersion: vi.fn()
}))

vi.mock('@google-cloud/secret-manager', () => ({
  SecretManagerServiceClient: class {
    accessSecretVersion = accessSecretVersion
  }
}))

vi.mock('@/lib/google-credentials', () => ({
  createGoogleAuth: vi.fn(() => ({ mocked: true })),
  getGoogleProjectId: vi.fn((env?: NodeJS.ProcessEnv) => env?.GCP_PROJECT || 'efeonce-group')
}))

describe('resolveSecret', () => {
  beforeEach(() => {
    vi.resetModules()
    accessSecretVersion.mockReset()
  })

  afterEach(async () => {
    vi.unstubAllEnvs()

    const { clearSecretManagerResolutionCache } = await import('@/lib/secrets/secret-manager')

    clearSecretManagerResolutionCache()
    globalThis.__greenhouseSecretManagerClient = undefined
  })

  it('uses Secret Manager when a secret ref resolves successfully', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.value).toBe('secret-from-manager')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/nubox-bearer-token/versions/latest'
    })
  })

  it('falls back to env vars when Secret Manager lookup fails', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    vi.stubEnv('NUBOX_BEARER_TOKEN', 'env-fallback-token')
    accessSecretVersion.mockRejectedValue(new Error('permission denied'))

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('env')
    expect(resolution.value).toBe('env-fallback-token')
  })

  it('reports unconfigured when neither Secret Manager nor env vars are available', async () => {
    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('unconfigured')
    expect(resolution.value).toBeNull()
  })

  it('caches repeated reads for the same secret ref', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'nubox-bearer-token')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })
    await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(accessSecretVersion).toHaveBeenCalledTimes(1)
  })
})

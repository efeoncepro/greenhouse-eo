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

  it('sanitizes quoted secret payloads returned by Secret Manager', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NEXTAUTH_SECRET_SECRET_REF', 'greenhouse-nextauth-secret-staging')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('"quoted-secret-value"')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NEXTAUTH_SECRET'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.value).toBe('quoted-secret-value')
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

  it('sanitizes quoted env fallback values with trailing literal newline markers', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('NUBOX_BEARER_TOKEN_SECRET_REF', 'greenhouse-nubox-bearer-token-staging')
    vi.stubEnv('NUBOX_BEARER_TOKEN', '"env-fallback-token\\n"')
    accessSecretVersion.mockRejectedValue(new Error('permission denied'))

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'NUBOX_BEARER_TOKEN'
    })

    expect(resolution.source).toBe('env')
    expect(resolution.value).toBe('env-fallback-token')
  })

  it('sanitizes literal newline escapes in secret refs before resolving Secret Manager', async () => {
    vi.stubEnv('GCP_PROJECT', 'efeonce-group')
    vi.stubEnv('WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF', 'webhook-notifications-secret\\n')
    accessSecretVersion.mockResolvedValue([
      {
        payload: {
          data: Buffer.from('secret-from-manager')
        }
      }
    ])

    const { resolveSecret } = await import('@/lib/secrets/secret-manager')

    const resolution = await resolveSecret({
      envVarName: 'WEBHOOK_NOTIFICATIONS_SECRET'
    })

    expect(resolution.source).toBe('secret_manager')
    expect(resolution.secretRef).toBe('projects/efeonce-group/secrets/webhook-notifications-secret/versions/latest')
    expect(accessSecretVersion).toHaveBeenCalledWith({
      name: 'projects/efeonce-group/secrets/webhook-notifications-secret/versions/latest'
    })
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

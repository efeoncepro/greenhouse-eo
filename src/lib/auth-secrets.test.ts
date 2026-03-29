import { afterEach, describe, expect, it, vi } from 'vitest'

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

describe('auth-secrets', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    resolveSecret.mockReset()
  })

  it('enables Microsoft SSO when client id and secret resolve successfully', async () => {
    vi.stubEnv('AZURE_AD_CLIENT_ID', 'azure-client-id')
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id')
    resolveSecret
      .mockResolvedValueOnce({
        source: 'secret_manager',
        value: 'nextauth-secret',
        envVarName: 'NEXTAUTH_SECRET',
        secretRefEnvVarName: 'NEXTAUTH_SECRET_SECRET_REF',
        secretRef: 'projects/efeonce-group/secrets/nextauth-secret/versions/latest'
      })
      .mockResolvedValueOnce({
        source: 'secret_manager',
        value: 'azure-client-secret',
        envVarName: 'AZURE_AD_CLIENT_SECRET',
        secretRefEnvVarName: 'AZURE_AD_CLIENT_SECRET_SECRET_REF',
        secretRef: 'projects/efeonce-group/secrets/azure-client-secret/versions/latest'
      })
      .mockResolvedValueOnce({
        source: 'secret_manager',
        value: 'google-client-secret',
        envVarName: 'GOOGLE_CLIENT_SECRET',
        secretRefEnvVarName: 'GOOGLE_CLIENT_SECRET_SECRET_REF',
        secretRef: 'projects/efeonce-group/secrets/google-client-secret/versions/latest'
      })

    const authSecretsModule = await import('@/lib/auth-secrets')

    expect(authSecretsModule.getNextAuthSecret()).toBe('nextauth-secret')
    expect(authSecretsModule.getAzureAdClientSecret()).toBe('azure-client-secret')
    expect(authSecretsModule.getGoogleClientSecret()).toBe('google-client-secret')
    expect(authSecretsModule.hasMicrosoftAuthProvider()).toBe(true)
    expect(authSecretsModule.hasGoogleAuthProvider()).toBe(true)
  })

  it('disables Microsoft SSO when the secret is unconfigured', async () => {
    vi.stubEnv('AZURE_AD_CLIENT_ID', 'azure-client-id')
    resolveSecret
      .mockResolvedValueOnce({
        source: 'env',
        value: 'nextauth-secret',
        envVarName: 'NEXTAUTH_SECRET',
        secretRefEnvVarName: 'NEXTAUTH_SECRET_SECRET_REF',
        secretRef: null
      })
      .mockResolvedValueOnce({
        source: 'unconfigured',
        value: null,
        envVarName: 'AZURE_AD_CLIENT_SECRET',
        secretRefEnvVarName: 'AZURE_AD_CLIENT_SECRET_SECRET_REF',
        secretRef: null
      })
      .mockResolvedValueOnce({
        source: 'env',
        value: 'google-client-secret',
        envVarName: 'GOOGLE_CLIENT_SECRET',
        secretRefEnvVarName: 'GOOGLE_CLIENT_SECRET_SECRET_REF',
        secretRef: null
      })

    const authSecretsModule = await import('@/lib/auth-secrets')

    expect(authSecretsModule.hasMicrosoftAuthProvider()).toBe(false)
  })
})

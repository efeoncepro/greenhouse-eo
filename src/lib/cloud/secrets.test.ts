import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager', () => ({
  getSecretSource: vi.fn(async ({ envVarName }: { envVarName: string }) => ({
    envVarName,
    secretRefEnvVarName: `${envVarName}_SECRET_REF`,
    secretRef: envVarName === 'NUBOX_BEARER_TOKEN' ? 'projects/efeonce-group/secrets/nubox/versions/latest' : null,
    source:
      envVarName === 'NUBOX_BEARER_TOKEN'
        ? 'secret_manager'
        : envVarName === 'NEXTAUTH_SECRET'
          ? 'env'
          : 'unconfigured'
  }))
}))

import { getCloudSecretsPosture } from '@/lib/cloud/secrets'

describe('getCloudSecretsPosture', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('summarizes sources without exposing values', async () => {
    const posture = await getCloudSecretsPosture()
    const nubox = posture.entries.find(entry => entry.key === 'nubox_bearer_token')
    const nextAuth = posture.entries.find(entry => entry.key === 'nextauth_secret')

    expect(posture.summary).toContain('via Secret Manager')
    expect(posture.summary).toContain('via env var')
    expect(posture.summary).toContain('sin configurar')
    expect(nubox?.source).toBe('secret_manager')
    expect(nubox?.secretRefConfigured).toBe(true)
    expect(nextAuth?.source).toBe('env')
  })
})

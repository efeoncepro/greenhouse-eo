import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret: vi.fn()
}))

describe('webhooks signing secret resolution', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('resolves webhook secrets through the canonical secret-manager helper', async () => {
    const { resolveSecret: resolveManagedSecret } = await import('@/lib/secrets/secret-manager')

    vi.mocked(resolveManagedSecret).mockResolvedValue({
      source: 'secret_manager',
      value: 'canary-secret',
      envVarName: 'WEBHOOK_CANARY_SECRET',
      secretRefEnvVarName: 'WEBHOOK_CANARY_SECRET_SECRET_REF',
      secretRef: 'projects/test/secrets/webhook-canary-secret/versions/latest'
    })

    const { resolveSecret } = await import('@/lib/webhooks/signing')
    const resolved = await resolveSecret('WEBHOOK_CANARY_SECRET')

    expect(resolveManagedSecret).toHaveBeenCalledWith({
      envVarName: 'WEBHOOK_CANARY_SECRET'
    })
    expect(resolved).toBe('canary-secret')
  })

  it('returns null when the canonical helper cannot resolve the secret', async () => {
    const { resolveSecret: resolveManagedSecret } = await import('@/lib/secrets/secret-manager')

    vi.mocked(resolveManagedSecret).mockResolvedValue({
      source: 'unconfigured',
      value: null,
      envVarName: 'WEBHOOK_CANARY_SECRET',
      secretRefEnvVarName: 'WEBHOOK_CANARY_SECRET_SECRET_REF',
      secretRef: null
    })

    const { resolveSecret } = await import('@/lib/webhooks/signing')
    const resolved = await resolveSecret('WEBHOOK_CANARY_SECRET')

    expect(resolved).toBeNull()
  })
})

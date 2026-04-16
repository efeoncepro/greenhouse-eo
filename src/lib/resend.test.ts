import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { resolveSecret } = vi.hoisted(() => ({
  resolveSecret: vi.fn()
}))

vi.mock('@/lib/secrets/secret-manager', () => ({
  resolveSecret
}))

describe('resend config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    resolveSecret.mockReset()
  })

  it('resolves the Resend API key via the canonical secret helper and caches the client', async () => {
    vi.stubEnv('EMAIL_FROM', 'Ops <ops@efeoncepro.com>')
    resolveSecret.mockResolvedValue({
      source: 'secret_manager',
      value: 'resend-secret-key',
      envVarName: 'RESEND_API_KEY',
      secretRefEnvVarName: 'RESEND_API_KEY_SECRET_REF',
      secretRef: 'projects/efeonce-group/secrets/greenhouse-resend-api-key/versions/latest'
    })

    const resendModule = await import('@/lib/resend')

    expect(resolveSecret).toHaveBeenCalledWith({
      envVarName: 'RESEND_API_KEY'
    })
    expect(resendModule.getResendApiKey()).toBe('resend-secret-key')
    expect(resendModule.isResendConfigured()).toBe(true)
    expect(resendModule.getEmailFromAddress()).toBe('Ops <ops@efeoncepro.com>')

    const clientA = resendModule.getResendClient()
    const clientB = resendModule.getResendClient()

    expect(clientA).toBe(clientB)
  })

  it('falls back to default sender and stays unconfigured when the API key is unavailable', async () => {
    resolveSecret.mockResolvedValue({
      source: 'unconfigured',
      value: null,
      envVarName: 'RESEND_API_KEY',
      secretRefEnvVarName: 'RESEND_API_KEY_SECRET_REF',
      secretRef: null
    })

    const resendModule = await import('@/lib/resend')

    expect(resendModule.getEmailFromAddress()).toBe('Efeonce Greenhouse <greenhouse@efeoncepro.com>')
    expect(resendModule.getResendApiKey()).toBeNull()
    expect(resendModule.isResendConfigured()).toBe(false)
    expect(() => resendModule.getResendClient()).toThrow('Missing RESEND_API_KEY environment variable.')
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockCookieGet = vi.fn()
const mockCaptureMessageWithDomain = vi.fn()

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => mockCookieGet(name) })
}))

vi.mock('@/lib/observability/capture', () => ({
  captureMessageWithDomain: (...args: unknown[]) => mockCaptureMessageWithDomain(...args)
}))

const { resolveClientPortalOrganizationId, AGENT_ORG_OVERRIDE_COOKIE } = await import(
  './resolve-client-portal-organization-id'
)

const AGENT = { userId: 'user-agent-client-001', organizationId: 'org-demo' }
const REAL_CLIENT = { userId: 'user-real-client-001', organizationId: 'org-berel' }

/**
 * TASK-1679 Slice 2 — El override de organización tiene que ser fail-closed en cuatro
 * condiciones independientes. Cada test apaga UNA y verifica que eso solo alcanza para
 * cerrarlo: si mañana alguien relaja una, el resto sigue en pie y este archivo lo dice.
 */
describe('resolveClientPortalOrganizationId (TASK-1679)', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCookieGet.mockReturnValue(undefined)
    delete process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE
    process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE_ENABLED = 'true'
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.unstubAllEnvs()
  })

  it('returns the session organization when no override is present', async () => {
    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-demo')
  })

  it('returns null when the session has no organization (never a fallback)', async () => {
    await expect(resolveClientPortalOrganizationId({ userId: 'u', organizationId: null })).resolves.toBeNull()
  })

  it('applies the override for an allowlisted agent persona, and audits it', async () => {
    mockCookieGet.mockReturnValue({ value: 'org-sky' })

    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-sky')

    expect(mockCookieGet).toHaveBeenCalledWith(AGENT_ORG_OVERRIDE_COOKIE)
    expect(mockCaptureMessageWithDomain).toHaveBeenCalledWith(
      'client_portal_agent_org_override_applied',
      'identity',
      expect.objectContaining({ level: 'warning' })
    )
  })

  it('accepts the override from an env var too (for CLI and CI, where there are no cookies)', async () => {
    process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE = 'org-anam'

    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-anam')
  })

  // ── Las cuatro condiciones, apagadas de a una ──

  it('condition 1 — ignores the override when the flag is not exactly "true"', async () => {
    process.env.CLIENT_PORTAL_AGENT_ORG_OVERRIDE_ENABLED = 'false'
    mockCookieGet.mockReturnValue({ value: 'org-sky' })

    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-demo')
    expect(mockCaptureMessageWithDomain).not.toHaveBeenCalled()
  })

  it('condition 2 — ignores the override in production even with the flag ON', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    mockCookieGet.mockReturnValue({ value: 'org-sky' })

    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-demo')
    expect(mockCaptureMessageWithDomain).not.toHaveBeenCalled()
  })

  it('condition 3 — ignores the override for a real client user, not just any client tenant', async () => {
    mockCookieGet.mockReturnValue({ value: 'org-sky' })

    await expect(resolveClientPortalOrganizationId(REAL_CLIENT)).resolves.toBe('org-berel')
    expect(mockCaptureMessageWithDomain).not.toHaveBeenCalled()
  })

  it('condition 4 — does not audit when there is no override value to apply', async () => {
    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-demo')
    expect(mockCaptureMessageWithDomain).not.toHaveBeenCalled()
  })

  it('does not audit when the override equals the session organization (nothing changed)', async () => {
    mockCookieGet.mockReturnValue({ value: 'org-demo' })

    await expect(resolveClientPortalOrganizationId(AGENT)).resolves.toBe('org-demo')
    expect(mockCaptureMessageWithDomain).not.toHaveBeenCalled()
  })
})

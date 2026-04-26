import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/tenant/access', () => ({
  getTenantAccessRecordForAgent: vi.fn()
}))

vi.mock('@/lib/auth-secrets', () => ({
  getNextAuthSecret: vi.fn(() => 'test-nextauth-secret-fixture-1234567890')
}))

vi.mock('@/lib/tenant/resolve-portal-home-path', () => ({
  resolvePortalHomePath: vi.fn(() => '/admin')
}))

vi.mock('next-auth/jwt', () => ({
  encode: vi.fn(async ({ token }) => `jwt:${(token as { userId: string }).userId}`)
}))

import { encode } from 'next-auth/jwt'

import { getTenantAccessRecordForAgent } from '@/lib/tenant/access'

import { signAgentSessionInProcess } from './sign-agent-session-in-process'

const fixtureTenant = {
  userId: 'user-agent-e2e-001',
  email: 'agent@greenhouse.efeonce.org',
  fullName: 'Agent E2E',
  avatarUrl: null,
  clientId: null,
  clientName: null,
  tenantType: 'efeonce_internal',
  roleCodes: ['efeonce_admin', 'collaborator'],
  primaryRoleCode: 'efeonce_admin',
  routeGroups: ['admin', 'agency'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  projectIds: [],
  role: 'admin',
  featureFlags: {},
  timezone: 'America/Santiago',
  portalHomePath: null,
  authMode: 'agent',
  microsoftEmail: null,
  googleEmail: null,
  spaceId: null,
  organizationId: null,
  organizationName: null,
  memberId: null,
  identityProfileId: null
}

describe('signAgentSessionInProcess', () => {
  const originalNextAuthUrl = process.env.NEXTAUTH_URL

  beforeEach(() => {
    vi.mocked(getTenantAccessRecordForAgent).mockReset()
    vi.mocked(encode).mockClear()
  })

  afterEach(() => {
    process.env.NEXTAUTH_URL = originalNextAuthUrl
  })

  it('returns null when the agent user is missing', async () => {
    vi.mocked(getTenantAccessRecordForAgent).mockResolvedValue(null)

    const result = await signAgentSessionInProcess('agent@greenhouse.efeonce.org')

    expect(result).toBeNull()
    expect(encode).not.toHaveBeenCalled()
  })

  it('returns null and logs when the tenant lookup throws', async () => {
    vi.mocked(getTenantAccessRecordForAgent).mockRejectedValue(new Error('PG down'))

    const result = await signAgentSessionInProcess('agent@greenhouse.efeonce.org')

    expect(result).toBeNull()
    expect(encode).not.toHaveBeenCalled()
  })

  it('signs a JWT and returns the secure cookie name when NEXTAUTH_URL is https', async () => {
    process.env.NEXTAUTH_URL = 'https://dev-greenhouse.efeoncepro.com'
    vi.mocked(getTenantAccessRecordForAgent).mockResolvedValue(fixtureTenant as never)

    const result = await signAgentSessionInProcess('agent@greenhouse.efeonce.org')

    expect(result).not.toBeNull()
    expect(result?.cookieName).toBe('__Secure-next-auth.session-token')
    expect(result?.cookieValue).toBe('jwt:user-agent-e2e-001')
    expect(result?.email).toBe('agent@greenhouse.efeonce.org')
    expect(result?.userId).toBe('user-agent-e2e-001')
    expect(result?.portalHomePath).toBe('/admin')
    expect(encode).toHaveBeenCalledOnce()
  })

  it('uses the insecure cookie name when NEXTAUTH_URL is http', async () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
    vi.mocked(getTenantAccessRecordForAgent).mockResolvedValue(fixtureTenant as never)

    const result = await signAgentSessionInProcess('agent@greenhouse.efeonce.org')

    expect(result?.cookieName).toBe('next-auth.session-token')
  })

  it('lowercases and trims the email before lookup', async () => {
    vi.mocked(getTenantAccessRecordForAgent).mockResolvedValue(fixtureTenant as never)

    await signAgentSessionInProcess('  AGENT@GREENHOUSE.EFEONCE.ORG  ')

    expect(getTenantAccessRecordForAgent).toHaveBeenCalledWith('agent@greenhouse.efeonce.org')
  })
})

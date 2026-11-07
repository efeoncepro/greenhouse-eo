import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { JWT } from 'next-auth/jwt'

const mocks = vi.hoisted(() => ({ tenant: vi.fn(), attempt: vi.fn() }))

vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordByUserId: mocks.tenant }))
vi.mock('@/lib/auth/attempt-tracker', () => ({ recordAuthAttempt: mocks.attempt }))
vi.mock('@/lib/auth-secrets', () => ({ getNextAuthSecret: () => 'synthetic-auth-secret', getAzureAdClientSecret: () => null,
  getGoogleClientSecret: () => null, hasGoogleAuthProvider: () => false, hasMicrosoftAuthProvider: () => false }))
vi.mock('@/lib/i18n/locale-preferences', () => ({ getUserLocalePreferenceSnapshot: async () => ({ effectiveLocale: 'es' }) }))

import { getAuthOptions } from '@/lib/auth'
import { resolveSessionPrincipalRevocation, SessionAccessRevokedError } from '@/lib/auth/session-access-revoked'

const staleToken = (): JWT => ({
  userId: 'client-user', provider: 'credentials', authMode: 'credentials', tenantType: 'client',
  roleCodes: ['client_manager'], routeGroups: ['client'], spaceId: 'space-design', accessClaimsRefreshedAt: 0,
  supervisorAccess: null, hasActiveContractorEngagement: false, hasWorkforceContractingDocument: false
})

const runJwt = (token: JWT) => {
  const jwt = getAuthOptions().callbacks!.jwt!

  return jwt({ token } as Parameters<typeof jwt>[0])
}

beforeEach(() => {
  mocks.tenant.mockReset()
  mocks.attempt.mockReset()
})

describe('TASK-2096 H2 — access-claims refresh revokes a principal that is no longer active', () => {
  it.each([
    ['disabled user', { userId: 'client-user', active: false, status: 'disabled' }, 'account_disabled'],
    ['inactive status', { userId: 'client-user', active: true, status: 'invited' }, 'account_status_invalid'],
    ['deleted user', null, 'tenant_not_found']
  ])('%s: throws so NextAuth drops the cookie, and audits the rejection', async (_label, tenant, reason) => {
    mocks.tenant.mockResolvedValue(tenant)

    const outcome = runJwt(staleToken())

    await expect(outcome).rejects.toBeInstanceOf(SessionAccessRevokedError)
    await expect(runJwt(staleToken())).rejects.toMatchObject({ reason })
    expect(mocks.attempt).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'jwt_callback', outcome: 'rejected', reasonCode: reason, userIdResolved: 'client-user'
    }))
  })

  it('a lookup failure stays fail-closed (the callback throws, claims are never kept)', async () => {
    mocks.tenant.mockRejectedValue(new Error('synthetic lookup failure'))

    await expect(runJwt(staleToken())).rejects.toThrow('synthetic lookup failure')
  })

  it('an active principal gets fresh claims, not the stale ones', async () => {
    mocks.tenant.mockResolvedValue({ userId: 'client-user', active: true, status: 'active', tenantType: 'client',
      authMode: 'credentials', roleCodes: ['client_specialist'], routeGroups: ['client'], spaceId: 'space-seo', effectiveLocale: 'es' })

    const refreshed = await runJwt(staleToken())

    expect(refreshed.roleCodes).toEqual(['client_specialist'])
    expect(refreshed.spaceId).toBe('space-seo')
    expect(mocks.attempt).not.toHaveBeenCalled()
  })

  it('does not look the principal up again inside the refresh interval', async () => {
    const token = { ...staleToken(), accessClaimsRefreshedAt: Date.now() }

    const refreshed = await runJwt(token)

    expect(mocks.tenant).not.toHaveBeenCalled()
    expect(refreshed.roleCodes).toEqual(['client_manager'])
  })
})

describe('resolveSessionPrincipalRevocation', () => {
  it('only an active principal with active status keeps an authorizing session', () => {
    expect(resolveSessionPrincipalRevocation({ active: true, status: 'active' })).toBeNull()
    expect(resolveSessionPrincipalRevocation({ active: true, status: 'invited' })).toBe('account_status_invalid')
    expect(resolveSessionPrincipalRevocation({ active: false, status: 'active' })).toBe('account_disabled')
    expect(resolveSessionPrincipalRevocation({ active: null, status: 'active' })).toBe('account_disabled')
    expect(resolveSessionPrincipalRevocation(null)).toBe('tenant_not_found')
  })
})

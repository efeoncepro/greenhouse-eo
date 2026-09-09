import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { JWT } from 'next-auth/jwt'

const mocks = vi.hoisted(() => ({ tenant: vi.fn() }))

vi.mock('@/lib/tenant/access', () => ({ getTenantAccessRecordByUserId: mocks.tenant }))
vi.mock('@/lib/auth-secrets', () => ({ getNextAuthSecret: () => 'synthetic-auth-secret', getAzureAdClientSecret: () => null,
  getGoogleClientSecret: () => null, hasGoogleAuthProvider: () => false, hasMicrosoftAuthProvider: () => false }))
vi.mock('@/lib/i18n/locale-preferences', () => ({ getUserLocalePreferenceSnapshot: async () => ({ effectiveLocale: 'es' }) }))

import { getAuthOptions } from '@/lib/auth'

beforeEach(() => {
  mocks.tenant.mockResolvedValue({ userId: 'operator', active: true, status: 'active', tenantType: 'efeonce_internal',
    authMode: 'credentials', roleCodes: ['collaborator'], routeGroups: ['internal'], effectiveLocale: 'es' })
})

describe('signed agent provenance during the real JWT refresh callback', () => {
  it.each(['agent', 'credentials', 'microsoft_sso'])('refreshes current authority without changing %s provenance', async provider => {
    const token: JWT = { userId: 'operator', provider, authMode: provider === 'agent' ? 'agent' : 'credentials',
      roleCodes: ['efeonce_admin'], routeGroups: ['admin'], accessClaimsRefreshedAt: 0,
      supervisorAccess: null, hasActiveContractorEngagement: false, hasWorkforceContractingDocument: false }

    const jwt = getAuthOptions().callbacks!.jwt!
    const refreshed = await jwt({ token } as Parameters<typeof jwt>[0])

    expect(refreshed.provider).toBe(provider)
    expect(refreshed.authMode).toBe(provider === 'agent' ? 'agent' : 'credentials')
    expect(refreshed.roleCodes).toEqual(['collaborator'])
    expect(refreshed.routeGroups).toEqual(['internal'])
    expect(refreshed.accessClaimsRefreshedAt).toBeGreaterThan(0)
  })
})

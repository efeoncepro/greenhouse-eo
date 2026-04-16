import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'
import { buildHomeEntitlementsContext } from '@/lib/home/build-home-entitlements-context'

describe('buildHomeEntitlementsContext', () => {
  it('returns finance shortcuts and finance visibility for finance users', () => {
    const result = buildHomeEntitlementsContext({
      userId: 'user-finance',
      tenantType: 'efeonce_internal',
      roleCodes: [ROLE_CODES.FINANCE_ADMIN],
      primaryRoleCode: ROLE_CODES.FINANCE_ADMIN,
      routeGroups: ['finance'],
      authorizedViews: [],
      businessLines: [],
      serviceModules: [],
      portalHomePath: '/finance'
    })

    expect(result.accessContext.audienceKey).toBe('finance')
    expect(result.canSeeFinanceStatus).toBe(true)
    expect(result.recommendedShortcuts.map(shortcut => shortcut.module)).toContain('finance')
    expect(result.recommendedShortcuts[0]?.module).toBe('finance')
  })

  it('preserves capability modules for client tenants while surfacing client shortcuts', () => {
    const result = buildHomeEntitlementsContext({
      userId: 'user-client',
      tenantType: 'client',
      roleCodes: [ROLE_CODES.CLIENT_EXECUTIVE],
      primaryRoleCode: ROLE_CODES.CLIENT_EXECUTIVE,
      routeGroups: ['client'],
      authorizedViews: [],
      businessLines: ['globe'],
      serviceModules: ['agencia_creativa'],
      portalHomePath: '/home'
    })

    expect(result.accessContext.audienceKey).toBe('client')
    expect(result.recommendedShortcuts.map(shortcut => shortcut.id)).toEqual(['client-portal'])
    expect(result.visibleCapabilityModules.map(module => module.id)).toContain('creative-hub')
  })
})

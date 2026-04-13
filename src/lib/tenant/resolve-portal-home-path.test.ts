import { describe, expect, it } from 'vitest'

import { resolvePortalHomeDefaultPath, resolvePortalHomePath, resolvePortalHomePolicy } from './resolve-portal-home-path'

describe('resolvePortalHomePath', () => {
  it('routes internal legacy dashboard home to /home', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_operations']
      })
    ).toBe('/home')
  })

  it('routes internal users without explicit path to /home', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: null,
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_operations']
      })
    ).toBe('/home')
  })

  it('preserves explicit internal overrides other than legacy dashboard', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/agency',
        tenantType: 'efeonce_internal',
        roleCodes: ['efeonce_admin']
      })
    ).toBe('/agency')
  })

  it('keeps hr payroll as specialized landing', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['hr_payroll']
      })
    ).toBe('/hr/payroll')
  })

  it('keeps finance as specialized landing', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/internal/dashboard',
        tenantType: 'efeonce_internal',
        roleCodes: ['finance_admin']
      })
    ).toBe('/finance')
  })

  it('uses separate policy keys for client and internal defaults', () => {
    expect(resolvePortalHomePolicy({ tenantType: 'client' }).key).toBe('client_default')
    expect(resolvePortalHomePolicy({ tenantType: 'efeonce_internal' }).key).toBe('internal_default')
  })

  it('exposes the default home path through a centralized policy resolver', () => {
    expect(resolvePortalHomeDefaultPath({ tenantType: 'client' })).toBe('/home')
    expect(resolvePortalHomeDefaultPath({ tenantType: 'efeonce_internal' })).toBe('/home')
  })

  it('maps legacy client dashboard home to /home', () => {
    expect(
      resolvePortalHomePath({
        portalHomePath: '/dashboard',
        tenantType: 'client',
        roleCodes: ['client_executive']
      })
    ).toBe('/home')
  })
})
